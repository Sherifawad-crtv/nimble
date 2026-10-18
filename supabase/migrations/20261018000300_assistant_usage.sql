-- Daily request counter for the coach assistant, so a runaway client cannot run up the model bill.
create table private.assistant_usage (
  user_id uuid not null,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table private.assistant_usage enable row level security;

-- Counts one request and returns today's total. Only the service role can call it.
create function public.assistant_take(p_user uuid, p_day date) returns int
language sql security definer set search_path = ''
as $$
  insert into private.assistant_usage (user_id, day, n) values (p_user, p_day, 1)
  on conflict (user_id, day) do update set n = private.assistant_usage.n + 1
  returning n
$$;
revoke all on function public.assistant_take(uuid, date) from public, anon, authenticated;
grant execute on function public.assistant_take(uuid, date) to service_role;
