-- Wearable integration removed for now. Drops its tables and the device match on completion.
-- The earlier migrations stay in history; bring the feature back with a new migration.

create or replace function public.complete_workout(p_assignment uuid) returns public.workout_logs
language plpgsql security definer set search_path = ''
as $$
declare l public.workout_logs;
begin
  select * into l from public.workout_logs where assignment_id = p_assignment and client_id = auth.uid();
  if not found then raise exception 'Start the workout before finishing it.' using errcode = 'check_violation'; end if;
  update public.workout_logs set completed_at = coalesce(completed_at, now()) where id = l.id returning * into l;
  update public.assignments set status = 'completed' where id = p_assignment;
  return l;
end $$;

drop table public.wearable_workouts;
drop table public.daily_metrics;
drop table public.wearable_connections;
alter table public.workout_logs drop column wearable;
