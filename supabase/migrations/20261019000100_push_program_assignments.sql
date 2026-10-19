-- Assigning a program inserts one assignment per day, and each one used to send its own push
-- ("New workout" x 30). Notify once per assignment batch instead, and say what was assigned.
-- Also reads the workout title from the right field ('title'): it always showed "Workout".

-- Moved or finished workouts: still one notification per change.
create or replace function private.push_assignment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare title text := coalesce(new.workout ->> 'title', 'Workout'); day text := to_char(new.date, 'FMDy, Mon FMDD');
begin
  -- New assignments are announced by private.push_assignments_inserted (one message per batch).
  -- The older row-level insert trigger stays attached but does nothing here.
  if tg_op = 'INSERT' then return new; end if;
  if new.date is distinct from old.date and new.status = 'not_started' then
    perform private.notify(array[new.client_id], 'Workout moved', title || ' is now ' || day, '/app/workout/' || new.id);
  elsif new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.notify(
      array[(select owner_id from public.workspaces where id = new.workspace_id)],
      (select name from public.profiles where id = new.client_id) || ' finished a workout',
      title || ' is ready to review', '/coach/review/' || new.id);
  end if;
  return new;
end $$;

-- New assignments: one notification per client and program (or per client for loose workouts).
create or replace function private.push_assignments_inserted() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare g record;
begin
  for g in
    select n.client_id, n.program_id, count(*)::int as total, min(n.date) as first_date,
           (array_agg(n.id order by n.date))[1] as first_id,
           (array_agg(coalesce(n.workout ->> 'title', 'Workout') order by n.date))[1] as first_title,
           max(p.title) as program_title
    from new_rows n left join public.programs p on p.id = n.program_id
    group by n.client_id, n.program_id
  loop
    if g.program_id is not null then
      perform private.notify(array[g.client_id], 'New program',
        coalesce(g.program_title, 'A new program') || ' · ' || g.total || ' workouts from ' || to_char(g.first_date, 'FMDy, Mon FMDD'), '/app/calendar');
    elsif g.total > 1 then
      perform private.notify(array[g.client_id], 'New workouts', g.total || ' workouts assigned · from ' || to_char(g.first_date, 'FMDy, Mon FMDD'), '/app/calendar');
    else
      perform private.notify(array[g.client_id], 'New workout', g.first_title || ' · ' || to_char(g.first_date, 'FMDy, Mon FMDD'), '/app/workout/' || g.first_id);
    end if;
  end loop;
  return null;
end $$;

create trigger push_assignments_inserted after insert on public.assignments
  referencing new table as new_rows
  for each statement execute function private.push_assignments_inserted();
