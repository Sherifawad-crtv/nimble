-- Keep policy helpers and trigger functions out of the public API (advisor 0028/0029).
-- Policies reference functions by identity, so moving the schema keeps them working.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.my_workspace() set schema private;
alter function public.is_coach() set schema private;
alter function public.is_workspace_client(uuid) set schema private;
alter function public.can_see_assignment(uuid) set schema private;

revoke execute on function public.stamp_comment(), public.guard_assignment_update(), public.touch_updated_at()
  from public, anon, authenticated;
