-- Saved assistant conversations. Private to the coach who had them: not shared with the workspace.
-- Attached files are never stored here, only their names (the app strips the file data first).

create table public.assistant_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  messages jsonb not null default '[]' check (jsonb_typeof(messages) = 'array' and pg_column_size(messages) < 600000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.assistant_chats (user_id, updated_at desc);
alter table public.assistant_chats enable row level security;

create policy "coach reads own chats" on public.assistant_chats for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_coach()));
create policy "coach saves own chats" on public.assistant_chats for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_coach()));
create policy "coach updates own chats" on public.assistant_chats for update to authenticated
  using (user_id = (select auth.uid()) and (select private.is_coach()))
  with check (user_id = (select auth.uid()) and (select private.is_coach()));
create policy "coach deletes own chats" on public.assistant_chats for delete to authenticated
  using (user_id = (select auth.uid()) and (select private.is_coach()));

-- Keep the newest 40 chats per coach, so the list stays short and the table cannot grow without bound.
create function public.trim_assistant_chats() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.assistant_chats
  where user_id = new.user_id
    and id in (select id from public.assistant_chats where user_id = new.user_id order by updated_at desc offset 40);
  return null;
end $$;
revoke all on function public.trim_assistant_chats() from public, anon, authenticated;

create trigger assistant_chats_trim after insert on public.assistant_chats
  for each row execute function public.trim_assistant_chats();
