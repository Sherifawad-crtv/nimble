-- The send-push function reads its signing keys from the database instead of function secrets,
-- through a function only the service role can run.
alter table private.push_config
  add column vapid_public text,
  add column vapid_private text,
  add column vapid_subject text;

create function public.push_settings() returns private.push_config
language sql security definer set search_path = ''
as $$ select * from private.push_config where id = 1 $$;

revoke all on function public.push_settings() from public, anon, authenticated;
grant execute on function public.push_settings() to service_role;
