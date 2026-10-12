-- Origin schema: one workspace per coach; every row carries workspace_id.

create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);
create index on public.profiles (workspace_id);

-- A coach shares a code; a client signs up with it to join that workspace.
create table public.workspace_invites (
  code text primary key default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on public.workspace_invites (workspace_id);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  video_url text,
  video_provider text check (video_provider in ('youtube', 'vimeo')),
  video_id text,
  thumbnail_url text,
  equipment text[] not null default '{}',
  tags text[] not null default '{}',
  measured_as text not null check (measured_as in ('reps', 'weight_reps', 'time', 'distance', 'rounds')),
  cues text,
  link_status text not null default 'unchecked' check (link_status in ('ok', 'unavailable', 'unchecked')),
  created_at timestamptz not null default now()
);
create index on public.exercises (workspace_id);

-- Templates. Assigned copies live inside assignments.workout.
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  blocks jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.workouts (workspace_id);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  days jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index on public.programs (workspace_id);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  workout jsonb not null,
  program_id uuid references public.programs (id) on delete set null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  created_at timestamptz not null default now()
);
create index on public.assignments (workspace_id, date);
create index on public.assignments (client_id, date);

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.assignments (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  item_results jsonb not null default '[]',
  timer_results jsonb not null default '[]',
  client_note text,
  wearable jsonb
);
create index on public.workout_logs (client_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_role text not null check (author_role in ('coach', 'client')),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index on public.comments (assignment_id, created_at);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  sessions_included int not null check (sessions_included >= 1),
  sessions_used int not null default 0 check (sessions_used >= 0),
  expires_on date not null,
  payment_received boolean not null default false,
  created_at timestamptz not null default now(),
  check (sessions_used <= sessions_included)
);
create index on public.packages (client_id);

-- Wearables. Written only by edge functions (service role) from Open Wearables.
create table public.wearable_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null check (provider in ('garmin', 'whoop', 'oura', 'fitbit', 'polar', 'strava')),
  status text not null check (status in ('connected', 'disconnected', 'error')),
  capabilities text[] not null default '{}',
  ow_user_id uuid,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on public.wearable_connections (workspace_id);
create index on public.wearable_connections (ow_user_id);

create table public.daily_metrics (
  client_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  date date not null,
  provider text not null,
  sleep_minutes int,
  resting_hr int,
  hrv numeric,
  strain numeric,
  calories_burned int,
  primary key (client_id, date, provider)
);

-- Workouts recorded by the device; matched to a logged workout when it is completed.
create table public.wearable_workouts (
  id text primary key,
  client_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  avg_hr int,
  max_hr int,
  calories_burned int,
  strain numeric
);
create index on public.wearable_workouts (client_id, start_time);
