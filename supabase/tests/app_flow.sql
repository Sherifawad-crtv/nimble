-- App flow check: the writes SupabaseDataService makes, run as the real roles under RLS.
-- Everything is rolled back. Fails with an exception naming the first step that breaks.
-- Writes use `with ... returning` so the counts can be checked (and SQL runners that hold
-- bare UPDATE/DELETE for confirmation do not stall).

begin;
set local statement_timeout = '30s';

create temp table ctx (k text primary key, v text) on commit drop;
grant all on ctx to authenticated, anon;

-- A coach signs up: the trigger creates the workspace and profile.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('c0000000-0000-0000-0000-0000000000c0', 'flow.coach@test.local', 'authenticated', 'authenticated',
   '{"role":"coach","name":"Flow Coach","workspace_name":"Flow Gym"}');

-- ---------- coach: invite code ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
with i as (
  insert into public.workspace_invites (workspace_id, created_by)
  values ((select workspace_id from public.profiles where id = auth.uid()), auth.uid())
  returning code
) insert into ctx select 'code', code from i;

-- ---------- anon: the sign-up form checks the code ----------
reset role;
set local role anon;
do $$ begin
  if public.check_invite((select lower(v) from ctx where k = 'code')) is distinct from 'Flow Gym' then raise exception 'check_invite did not return the workspace'; end if;
  if public.check_invite('NOPE0000') is not null then raise exception 'check_invite accepted a bad code'; end if;
end $$;

-- ---------- the client signs up with the code; a bad code is refused ----------
reset role;
insert into auth.users (id, email, aud, role, raw_user_meta_data)
select 'c1000000-0000-0000-0000-0000000000c1', 'flow.client@test.local', 'authenticated', 'authenticated',
       jsonb_build_object('role', 'client', 'name', 'Flow Client', 'invite_code', v)
from ctx where k = 'code';
do $$ begin
  begin
    insert into auth.users (id, email, aud, role, raw_user_meta_data) values
      ('c2000000-0000-0000-0000-0000000000c2', 'flow.bad@test.local', 'authenticated', 'authenticated', '{"role":"client","name":"Bad","invite_code":"NOPE0000"}');
    raise exception 'sign-up with a bad invite code was accepted';
  exception when check_violation then null;
  end;
end $$;

-- ---------- coach: library, template, program, assign, package ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
with e as (
  insert into public.exercises (workspace_id, name, measured_as, equipment, tags, link_status)
  values ((select workspace_id from public.profiles where id = auth.uid()), 'Back squat', 'weight_reps', '{barbell}', '{legs}', 'ok')
  returning id
) insert into ctx select 'ex', id::text from e;
with w as (
  insert into public.workouts (workspace_id, title, blocks)
  values ((select workspace_id from public.profiles where id = auth.uid()), 'Legs A',
          jsonb_build_array(jsonb_build_object('id', 'b1', 'title', 'Main', 'settings', '{"type":"standard"}'::jsonb,
            'items', jsonb_build_array(jsonb_build_object('id', 'i1', 'exerciseId', (select v from ctx where k = 'ex'), 'exerciseName', 'Back squat', 'target', '{"sets":3,"reps":5}'::jsonb)))))
  returning id
) insert into ctx select 'tpl', id::text from w;
insert into public.programs (workspace_id, title, days)
values ((select workspace_id from public.profiles where id = auth.uid()), 'Block 1',
        jsonb_build_array(jsonb_build_object('dayOffset', 0, 'workoutId', (select v from ctx where k = 'tpl'))));
with a as (
  insert into public.assignments (workspace_id, client_id, date, workout, status)
  select p.workspace_id, 'c1000000-0000-0000-0000-0000000000c1', d,
         jsonb_build_object('id', gen_random_uuid(), 'title', w.title, 'isTemplate', false, 'blocks', w.blocks), 'not_started'
  from public.profiles p, public.workouts w, (values (current_date), (current_date + 1)) as dates(d)
  where p.id = auth.uid() and w.id = (select v::uuid from ctx where k = 'tpl')
  returning id, date
) insert into ctx select case when date = current_date then 'as1' else 'as2' end, id::text from a;
insert into public.packages (workspace_id, client_id, name, sessions_included, sessions_used, expires_on, payment_received)
values ((select workspace_id from public.profiles where id = auth.uid()), 'c1000000-0000-0000-0000-0000000000c1', '10 sessions', 10, 2, current_date + 30, true);
do $$ begin
  if (select count(*) from public.profiles where role = 'client') <> 1 then raise exception 'coach does not see the new client'; end if;
  if (select count(*) from public.workspace_invites where revoked_at is null) <> 1 then raise exception 'coach does not see the invite'; end if;
end $$;

-- ---------- client: log the workout, comment ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
insert into ctx select 'log', (public.start_workout((select v::uuid from ctx where k = 'as1'))).id::text;
select public.save_log((select v::uuid from ctx where k = 'log'),
  '[{"itemId":"i1","sets":[{"reps":5,"load":"80 kg"},{"reps":5,"load":"85 kg"}]}]'::jsonb, '[]'::jsonb, '  felt strong  ');
select public.complete_workout((select v::uuid from ctx where k = 'as1'));
-- Author fields are spoofed here on purpose; the database must overwrite them.
insert into public.comments (assignment_id, author_id, author_name, author_role, workspace_id, body)
values ((select v::uuid from ctx where k = 'as1'), auth.uid(), 'spoofed', 'coach', gen_random_uuid(), 'Done!');
with u as (update public.assignments set date = current_date + 5 returning id) insert into ctx select 'client_moved', count(*)::text from u;
do $$
declare l public.workout_logs;
begin
  select * into l from public.workout_logs where id = (select v::uuid from ctx where k = 'log');
  if l.completed_at is null then raise exception 'log not completed'; end if;
  if l.client_note <> 'felt strong' then raise exception 'note not trimmed: %', l.client_note; end if;
  if jsonb_array_length(l.item_results -> 0 -> 'sets') <> 2 then raise exception 'sets not saved'; end if;
  if (select status from public.assignments where id = (select v::uuid from ctx where k = 'as1')) <> 'completed' then raise exception 'status not completed'; end if;
  if (select author_role || '/' || author_name from public.comments limit 1) <> 'client/Flow Client' then raise exception 'comment author not stamped'; end if;
  if (select count(*) from public.packages) <> 1 then raise exception 'client cannot see own package'; end if;
  if (select v from ctx where k = 'client_moved') <> '0' then raise exception 'client moved an assignment'; end if;
  begin
    perform public.start_workout(gen_random_uuid());
    raise exception 'started a workout that does not exist';
  exception when no_data_found then null;
  end;
end $$;

-- ---------- coach: review, move, delete, revoke ----------
select set_config('request.jwt.claims', '{"sub":"c0000000-0000-0000-0000-0000000000c0","role":"authenticated"}', true);
insert into public.comments (assignment_id, author_id, author_name, author_role, workspace_id, body)
values ((select v::uuid from ctx where k = 'as1'), auth.uid(), 'Flow Coach', 'coach', (select workspace_id from public.profiles where id = auth.uid()), 'Great work');
do $$ begin
  if (select count(*) from public.comments) <> 2 then raise exception 'coach does not see the thread'; end if;
  if (select completed_at from public.workout_logs where id = (select v::uuid from ctx where k = 'log')) is null then raise exception 'coach does not see the completed log'; end if;
  begin
    update public.assignments set date = current_date + 3 where id = (select v::uuid from ctx where k = 'as1');
    raise exception 'moved a started workout';
  exception when check_violation then null;
  end;
end $$;
with u as (update public.assignments set date = current_date + 2 where id = (select v::uuid from ctx where k = 'as2') returning id) insert into ctx select 'moved_new', count(*)::text from u;
with d as (delete from public.assignments where id = (select v::uuid from ctx where k = 'as1') returning id) insert into ctx select 'deleted_started', count(*)::text from d;
with d as (delete from public.assignments where id = (select v::uuid from ctx where k = 'as2') returning id) insert into ctx select 'deleted_new', count(*)::text from d;
with u as (update public.workspace_invites set revoked_at = now() where code = (select v from ctx where k = 'code') returning code) insert into ctx select 'revoked', count(*)::text from u;

reset role;
do $$ begin
  if (select string_agg(k || '=' || v, ',' order by k) from ctx where k in ('moved_new', 'deleted_started', 'deleted_new', 'revoked'))
     <> 'deleted_new=1,deleted_started=0,moved_new=1,revoked=1' then
    raise exception 'coach writes wrong: %', (select string_agg(k || '=' || v, ',' order by k) from ctx);
  end if;
  if public.check_invite((select v from ctx where k = 'code')) is not null then raise exception 'revoked code still valid'; end if;
end $$;

select 'app flow ok' as result;

rollback;
