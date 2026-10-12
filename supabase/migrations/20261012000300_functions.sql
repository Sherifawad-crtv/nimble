-- Sign-up and logging. Functions that write run as definer and check ownership themselves.

-- New auth user -> profile. Coaches get a workspace; clients join with an invite code.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta ->> 'role';
  v_name text := coalesce(nullif(trim(meta ->> 'name'), ''), split_part(new.email, '@', 1));
  v_workspace uuid;
begin
  if v_role = 'coach' then
    insert into public.workspaces (name, owner_id)
    values (coalesce(nullif(trim(meta ->> 'workspace_name'), ''), v_name || '''s workspace'), new.id)
    returning id into v_workspace;
  elsif v_role = 'client' then
    select workspace_id into v_workspace from public.workspace_invites
    where code = upper(trim(meta ->> 'invite_code')) and revoked_at is null;
    if v_workspace is null then
      raise exception 'That invite code is not valid. Ask your coach for a new one.' using errcode = 'check_violation';
    end if;
  else
    raise exception 'Sign-up needs a role.' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, workspace_id, role, name, email)
  values (new.id, v_workspace, v_role, v_name, new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form confirm a code before creating the account.
create function public.check_invite(p_code text) returns text
language sql stable security definer set search_path = ''
as $$
  select w.name from public.workspace_invites i join public.workspaces w on w.id = i.workspace_id
  where i.code = upper(trim(p_code)) and i.revoked_at is null
$$;
grant execute on function public.check_invite(text) to anon, authenticated;

-- ---------- logging (client only) ----------

create function public.start_workout(p_assignment uuid) returns public.workout_logs
language plpgsql security definer set search_path = ''
as $$
declare a public.assignments; l public.workout_logs;
begin
  select * into a from public.assignments where id = p_assignment and client_id = auth.uid();
  if not found then raise exception 'Workout not found.' using errcode = 'no_data_found'; end if;
  select * into l from public.workout_logs where assignment_id = a.id;
  if not found then
    insert into public.workout_logs (assignment_id, workspace_id, client_id)
    values (a.id, a.workspace_id, a.client_id) returning * into l;
  end if;
  if a.status in ('not_started', 'skipped') then
    update public.assignments set status = 'in_progress' where id = a.id;
  end if;
  return l;
end $$;

create function public.save_log(p_log uuid, p_item_results jsonb, p_timer_results jsonb, p_client_note text)
returns public.workout_logs
language plpgsql security definer set search_path = ''
as $$
declare l public.workout_logs;
begin
  update public.workout_logs
     set item_results = coalesce(p_item_results, '[]'::jsonb),
         timer_results = coalesce(p_timer_results, '[]'::jsonb),
         client_note = nullif(trim(p_client_note), '')
   where id = p_log and client_id = auth.uid()
   returning * into l;
  if not found then raise exception 'Log not found.' using errcode = 'no_data_found'; end if;
  return l;
end $$;

-- Completes the workout and attaches what the device recorded around it, if anything.
create function public.complete_workout(p_assignment uuid) returns public.workout_logs
language plpgsql security definer set search_path = ''
as $$
declare l public.workout_logs; w public.wearable_workouts; c public.wearable_connections; j jsonb;
begin
  select * into l from public.workout_logs where assignment_id = p_assignment and client_id = auth.uid();
  if not found then raise exception 'Start the workout before finishing it.' using errcode = 'check_violation'; end if;

  update public.workout_logs set completed_at = coalesce(completed_at, now()) where id = l.id returning * into l;
  update public.assignments set status = 'completed' where id = p_assignment;

  select * into c from public.wearable_connections where client_id = l.client_id and status = 'connected';
  if found and l.wearable is null then
    select * into w from public.wearable_workouts
     where client_id = l.client_id
       and start_time < l.completed_at + interval '30 minutes'
       and end_time > l.started_at - interval '30 minutes'
     order by abs(extract(epoch from (start_time - l.started_at))) limit 1;
    if found then
      j := jsonb_strip_nulls(jsonb_build_object(
        'provider', w.provider, 'avgHr', w.avg_hr, 'maxHr', w.max_hr,
        'caloriesBurned', w.calories_burned, 'strain', w.strain));
      if j <> jsonb_build_object('provider', w.provider) then
        update public.workout_logs set wearable = j where id = l.id returning * into l;
      end if;
    end if;
  end if;
  return l;
end $$;

revoke execute on function public.start_workout(uuid), public.save_log(uuid, jsonb, jsonb, text), public.complete_workout(uuid) from public, anon;
grant execute on function public.start_workout(uuid), public.save_log(uuid, jsonb, jsonb, text), public.complete_workout(uuid) to authenticated;

-- Helpers used by policies are internal.
revoke execute on function public.my_workspace(), public.is_coach(), public.is_workspace_client(uuid), public.can_see_assignment(uuid) from public, anon;
grant execute on function public.my_workspace(), public.is_coach(), public.is_workspace_client(uuid), public.can_see_assignment(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
