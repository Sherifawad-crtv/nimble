-- Row-level security: a coach sees only their workspace; a client sees only their own rows.

create function public.my_workspace() returns uuid
language sql stable security definer set search_path = ''
as $$ select workspace_id from public.profiles where id = auth.uid() $$;

create function public.is_coach() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'coach' from public.profiles where id = auth.uid()), false) $$;

create function public.is_workspace_client(p_client uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_client and role = 'client' and workspace_id = (select workspace_id from public.profiles where id = auth.uid())
  )
$$;

-- Can the signed-in user see this assignment? Coach: same workspace. Client: their own.
create function public.can_see_assignment(p_assignment uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    join public.profiles me on me.id = auth.uid()
    where a.id = p_assignment
      and a.workspace_id = me.workspace_id
      and (me.role = 'coach' or a.client_id = me.id)
  )
$$;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.programs enable row level security;
alter table public.assignments enable row level security;
alter table public.workout_logs enable row level security;
alter table public.comments enable row level security;
alter table public.packages enable row level security;
alter table public.wearable_connections enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.wearable_workouts enable row level security;

-- workspaces
create policy "members read their workspace" on public.workspaces for select to authenticated
  using (id = (select public.my_workspace()));
create policy "coach renames workspace" on public.workspaces for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- profiles
create policy "coach reads workspace, client reads self" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (workspace_id = (select public.my_workspace()) and (select public.is_coach())));
create policy "update own name" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- invites
create policy "coach manages invites" on public.workspace_invites for all to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()) and created_by = (select auth.uid()));

-- library: everyone in the workspace reads, only the coach writes
create policy "workspace reads exercises" on public.exercises for select to authenticated
  using (workspace_id = (select public.my_workspace()));
create policy "coach writes exercises" on public.exercises for insert to authenticated
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()));
create policy "coach updates exercises" on public.exercises for update to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()));
create policy "coach deletes exercises" on public.exercises for delete to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()));

-- templates and programs: coach only
create policy "coach owns templates" on public.workouts for all to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()));
create policy "coach owns programs" on public.programs for all to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()));

-- assignments
create policy "coach reads workspace, client reads own assignments" on public.assignments for select to authenticated
  using (workspace_id = (select public.my_workspace()) and ((select public.is_coach()) or client_id = (select auth.uid())));
create policy "coach assigns" on public.assignments for insert to authenticated
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()) and public.is_workspace_client(client_id));
create policy "coach moves assignments" on public.assignments for update to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()) and public.is_workspace_client(client_id));
create policy "coach deletes unstarted assignments" on public.assignments for delete to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()) and status = 'not_started');

-- logs: read here, written through the logging functions below
create policy "coach reads workspace, client reads own logs" on public.workout_logs for select to authenticated
  using (workspace_id = (select public.my_workspace()) and ((select public.is_coach()) or client_id = (select auth.uid())));

-- comments
create policy "read comments on visible workouts" on public.comments for select to authenticated
  using (public.can_see_assignment(assignment_id));
create policy "post comments on visible workouts" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_see_assignment(assignment_id));

-- packages
create policy "coach reads workspace, client reads own packages" on public.packages for select to authenticated
  using (workspace_id = (select public.my_workspace()) and ((select public.is_coach()) or client_id = (select auth.uid())));
create policy "coach writes packages" on public.packages for insert to authenticated
  with check (workspace_id = (select public.my_workspace()) and (select public.is_coach()) and public.is_workspace_client(client_id));
create policy "coach updates packages" on public.packages for update to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()))
  with check (workspace_id = (select public.my_workspace()) and public.is_workspace_client(client_id));
create policy "coach deletes packages" on public.packages for delete to authenticated
  using (workspace_id = (select public.my_workspace()) and (select public.is_coach()));

-- wearables: read-only to users; the client sees their own, the coach only while connected
create policy "client reads own connection, coach reads live ones" on public.wearable_connections for select to authenticated
  using (
    client_id = (select auth.uid())
    or (workspace_id = (select public.my_workspace()) and (select public.is_coach()) and status <> 'disconnected')
  );
create policy "client reads own metrics, coach reads connected clients" on public.daily_metrics for select to authenticated
  using (
    client_id = (select auth.uid())
    or (
      workspace_id = (select public.my_workspace()) and (select public.is_coach())
      and exists (select 1 from public.wearable_connections c where c.client_id = daily_metrics.client_id and c.status = 'connected')
    )
  );
create policy "client reads own device workouts, coach reads connected clients" on public.wearable_workouts for select to authenticated
  using (
    client_id = (select auth.uid())
    or (
      workspace_id = (select public.my_workspace()) and (select public.is_coach())
      and exists (select 1 from public.wearable_connections c where c.client_id = wearable_workouts.client_id and c.status = 'connected')
    )
  );

-- ---------- integrity triggers ----------

-- Started workouts cannot be moved.
create function public.guard_assignment_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.date is distinct from old.date and old.status <> 'not_started' then
    raise exception 'Only workouts that have not started can be moved.' using errcode = 'check_violation';
  end if;
  if new.workout is distinct from old.workout or new.client_id is distinct from old.client_id or new.workspace_id is distinct from old.workspace_id then
    raise exception 'An assigned workout cannot be changed.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger guard_assignment_update before update on public.assignments
  for each row execute function public.guard_assignment_update();

-- Comment author details always come from the author's profile.
create function public.stamp_comment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = new.author_id;
  new.author_name := p.name;
  new.author_role := p.role;
  new.workspace_id := p.workspace_id;
  new.created_at := now();
  return new;
end $$;
create trigger stamp_comment before insert on public.comments
  for each row execute function public.stamp_comment();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
create trigger touch_workouts before update on public.workouts for each row execute function public.touch_updated_at();
