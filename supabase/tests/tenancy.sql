-- Tenancy check: run against the database (it rolls everything back).
-- Two coaches in separate workspaces; coach A has two clients, coach B has one.
-- Fails with an exception naming the first leak it finds.

begin;

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-00000000000a', 'coach.a@test.local', 'authenticated', 'authenticated', '{"role":"coach","name":"Coach A"}'),
  ('b0000000-0000-0000-0000-00000000000b', 'coach.b@test.local', 'authenticated', 'authenticated', '{"role":"coach","name":"Coach B"}');

insert into public.workspace_invites (code, workspace_id, created_by)
select 'TESTA001', workspace_id, id from public.profiles where id = 'a0000000-0000-0000-0000-00000000000a'
union all
select 'TESTB001', workspace_id, id from public.profiles where id = 'b0000000-0000-0000-0000-00000000000b';

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-0000000000a1', 'client.a1@test.local', 'authenticated', 'authenticated', '{"role":"client","name":"Client A1","invite_code":"testa001"}'),
  ('a2000000-0000-0000-0000-0000000000a2', 'client.a2@test.local', 'authenticated', 'authenticated', '{"role":"client","name":"Client A2","invite_code":"TESTA001"}'),
  ('b1000000-0000-0000-0000-0000000000b1', 'client.b1@test.local', 'authenticated', 'authenticated', '{"role":"client","name":"Client B1","invite_code":"TESTB001"}');

-- Data in both workspaces, written as the service would (RLS bypassed).
insert into public.exercises (workspace_id, name, measured_as)
select workspace_id, 'Squat ' || role, 'reps' from public.profiles where id in ('a0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000b');

insert into public.assignments (id, workspace_id, client_id, date, workout)
select gen_random_uuid(), workspace_id, id, current_date, '{"title":"t","blocks":[]}'::jsonb
from public.profiles where role = 'client' and email like '%@test.local';

insert into public.workout_logs (assignment_id, workspace_id, client_id)
select id, workspace_id, client_id from public.assignments where client_id in (select id from public.profiles where email like '%@test.local');

insert into public.packages (workspace_id, client_id, name, sessions_included, expires_on)
select workspace_id, id, 'Pack', 10, current_date + 30 from public.profiles where role = 'client' and email like '%@test.local';

create temp table expect (who text, what text, got bigint, want bigint) on commit drop;
grant all on expect to authenticated, anon;

-- ---------- as coach A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into expect values
  ('coach A', 'profiles', (select count(*) from public.profiles), 3),
  ('coach A', 'exercises', (select count(*) from public.exercises), 1),
  ('coach A', 'assignments', (select count(*) from public.assignments), 2),
  ('coach A', 'logs', (select count(*) from public.workout_logs), 2),
  ('coach A', 'packages', (select count(*) from public.packages), 2),
  ('coach A', 'workspaces', (select count(*) from public.workspaces), 1),
  ('coach A', 'B data visible', (select count(*) from public.profiles where email like '%.b%@test.local' or email like 'coach.b%'), 0);

-- Coach A cannot write into workspace B.
do $$
begin
  begin
    insert into public.assignments (workspace_id, client_id, date, workout)
    values ((select workspace_id from public.workspaces limit 1), 'b1000000-0000-0000-0000-0000000000b1', current_date, '{}');
    raise exception 'LEAK: coach A assigned to a client in workspace B';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

-- ---------- as client A1 ----------
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
insert into expect values
  ('client A1', 'profiles', (select count(*) from public.profiles), 1),
  ('client A1', 'exercises (own workspace library)', (select count(*) from public.exercises), 1),
  ('client A1', 'assignments', (select count(*) from public.assignments), 1),
  ('client A1', 'logs', (select count(*) from public.workout_logs), 1),
  ('client A1', 'packages', (select count(*) from public.packages), 1),
  ('client A1', 'templates', (select count(*) from public.workouts), 0);

-- A client cannot write to the library.
do $$
begin
  begin
    insert into public.exercises (workspace_id, name, measured_as) values (private.my_workspace(), 'x', 'reps');
    raise exception 'LEAK: a client wrote to the library';
  exception when insufficient_privilege then null;
  end;
end $$;

-- A client cannot start another client's workout.
do $$
begin
  begin
    perform public.start_workout((select id from public.assignments where client_id = 'a2000000-0000-0000-0000-0000000000a2'));
    raise exception 'LEAK: client A1 started client A2''s workout';
  exception when no_data_found then null;
  end;
end $$;

-- ---------- signed out ----------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into expect values ('anon', 'profiles', (select count(*) from public.profiles), 0);

reset role;
do $$
declare r record; bad text := '';
begin
  for r in select * from expect where got <> want loop
    bad := bad || format(E'\n  %s sees %s %s (expected %s)', r.who, r.got, r.what, r.want);
  end loop;
  if bad <> '' then raise exception 'Tenancy check failed:%', bad; end if;
end $$;

select count(*) as checks_passed from expect;
rollback;
