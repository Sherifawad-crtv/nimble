-- Push notifications: device subscriptions, and database triggers that ask the send-push edge
-- function to notify the right person when something happens.
--
-- After applying, store the function URL and shared secret (the same value as the PUSH_WEBHOOK_SECRET
-- edge function secret) once:
--   insert into private.push_config (id, url, secret) values (1, 'https://<ref>.supabase.co/functions/v1/send-push', '<secret>');

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------- device subscriptions ----------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- No policies: devices are added and removed only through the two functions below.

create function public.register_push(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  -- A device belongs to whoever is signed in on it now.
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

create function public.unregister_push(p_endpoint text) returns void
language sql security definer set search_path = ''
as $$ delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid() $$;

revoke all on function public.register_push(text, text, text, text), public.unregister_push(text) from public, anon;
grant execute on function public.register_push(text, text, text, text), public.unregister_push(text) to authenticated;

-- ---------- sending ----------

create table private.push_config (
  id int primary key check (id = 1),
  url text not null,
  secret text not null
);
alter table private.push_config enable row level security;

create function private.notify(p_users uuid[], p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = ''
as $$
declare cfg private.push_config;
begin
  select * into cfg from private.push_config where id = 1;
  if not found or p_users is null or cardinality(p_users) = 0 then return; end if;
  if not exists (select 1 from public.push_subscriptions where user_id = any (p_users)) then return; end if;
  perform net.http_post(
    url := cfg.url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.secret),
    body := jsonb_build_object('users', to_jsonb(p_users), 'title', p_title, 'body', p_body, 'url', p_url)
  );
exception when others then
  -- A failed notification must never block the change that caused it.
  raise warning 'push notify failed: %', sqlerrm;
end $$;

-- ---------- triggers ----------

-- A workout is assigned or moved: tell the client.
create function private.push_assignment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare title text := coalesce(new.workout ->> 'name', 'Workout'); day text := to_char(new.date, 'FMDy, Mon FMDD');
begin
  if tg_op = 'INSERT' then
    perform private.notify(array[new.client_id], 'New workout', title || ' · ' || day, '/app/workout/' || new.id);
  elsif new.date is distinct from old.date and new.status = 'not_started' then
    perform private.notify(array[new.client_id], 'Workout moved', title || ' is now ' || day, '/app/workout/' || new.id);
  elsif new.status = 'completed' and old.status is distinct from 'completed' then
    perform private.notify(
      array[(select owner_id from public.workspaces where id = new.workspace_id)],
      (select name from public.profiles where id = new.client_id) || ' finished a workout',
      title || ' is ready to review', '/coach/review/' || new.id);
  end if;
  return new;
end $$;

create trigger push_assignment_insert after insert on public.assignments
  for each row execute function private.push_assignment();
create trigger push_assignment_update after update of date, status on public.assignments
  for each row execute function private.push_assignment();

-- A comment is posted: tell the other side.
create function private.push_comment() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare a public.assignments; snippet text := left(new.body, 120);
begin
  select * into a from public.assignments where id = new.assignment_id;
  if not found then return new; end if;
  if new.author_role = 'coach' then
    perform private.notify(array[a.client_id], new.author_name || ' commented', snippet, '/app/workout/' || a.id);
  else
    perform private.notify(array[(select owner_id from public.workspaces where id = a.workspace_id)], new.author_name || ' commented', snippet, '/coach/review/' || a.id);
  end if;
  return new;
end $$;

create trigger push_comment after insert on public.comments
  for each row execute function private.push_comment();

-- Sessions running out: tell the client when one or none is left.
create function private.push_package() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare was int := old.sessions_included - old.sessions_used; now_left int := new.sessions_included - new.sessions_used;
begin
  if now_left <= 1 and was > 1 then
    perform private.notify(array[new.client_id],
      case when now_left = 0 then 'No sessions left' else 'One session left' end,
      new.name || ' · talk to your coach about renewing', '/app/today');
  end if;
  return new;
end $$;

create trigger push_package after update of sessions_used on public.packages
  for each row execute function private.push_package();

-- A package about to expire: one reminder a week ahead.
alter table public.packages add column expiry_notified_on date;

create function private.push_expiring_packages() returns void
language plpgsql security definer set search_path = ''
as $$
declare p record;
begin
  for p in
    select id, client_id, name, expires_on from public.packages
    where expires_on between current_date and current_date + 7 and expiry_notified_on is null and sessions_used < sessions_included
  loop
    perform private.notify(array[p.client_id], 'Package expiring soon', p.name || ' ends ' || to_char(p.expires_on, 'FMDy, Mon FMDD'), '/app/today');
    update public.packages set expiry_notified_on = current_date where id = p.id;
  end loop;
end $$;

select cron.schedule('nimble-package-expiry', '0 8 * * *', 'select private.push_expiring_packages()');
