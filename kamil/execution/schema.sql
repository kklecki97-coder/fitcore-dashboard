-- ============================================================
-- FitCore App — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── coaches ──────────────────────────────────────────────────
-- One row per coach account. Links to Supabase Auth via id.
create table if not exists coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  brand_color text default '#00e5c8',
  logo_url text,
  created_at timestamptz default now()
);

-- ── clients ──────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  name text not null,
  email text,
  plan text check (plan in ('Basic', 'Premium', 'Elite')) default 'Basic',
  status text check (status in ('active', 'paused', 'pending')) default 'pending',
  start_date date,
  next_check_in date,
  monthly_rate numeric default 0,
  progress integer default 0 check (progress >= 0 and progress <= 100),
  height numeric,
  streak integer default 0,
  goals text[] default '{}',
  notes text default '',
  last_active timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── client_metrics ───────────────────────────────────────────
-- Time-series body & strength metrics, one row per data point
create table if not exists client_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  recorded_at date not null default current_date,
  weight numeric,
  body_fat numeric,
  bench_press numeric,
  squat numeric,
  deadlift numeric,
  created_at timestamptz default now()
);

-- ── client_notes ─────────────────────────────────────────────
create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  text text not null,
  is_key boolean default false,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ── activity_log ─────────────────────────────────────────────
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,        -- 'check-in' | 'message' | 'notes' | 'program' | 'plan'
  description text not null,
  date timestamptz not null default now()
);

-- ── workout_programs ─────────────────────────────────────────
create table if not exists workout_programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  name text not null,
  status text check (status in ('draft', 'active', 'completed')) default 'draft',
  duration_weeks integer default 4,
  is_template boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── program_clients ──────────────────────────────────────────
-- Junction: which clients are assigned to which programs
create table if not exists program_clients (
  program_id uuid not null references workout_programs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  assigned_at timestamptz default now(),
  primary key (program_id, client_id)
);

-- ── workout_days ─────────────────────────────────────────────
create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references workout_programs(id) on delete cascade,
  name text not null,
  day_order integer not null default 0
);

-- ── exercises ────────────────────────────────────────────────
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references workout_days(id) on delete cascade,
  name text not null,
  sets integer,
  reps text,
  weight text,
  rpe numeric,
  tempo text,
  rest_seconds integer,
  notes text default '',
  exercise_order integer not null default 0
);

-- ── workout_logs ─────────────────────────────────────────────
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  duration integer,          -- minutes
  date date not null default current_date,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ── check_ins ────────────────────────────────────────────────
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  date date not null,
  status text check (status in ('completed', 'scheduled', 'missed')) default 'scheduled',
  -- body metrics
  weight numeric,
  body_fat numeric,
  -- wellness (1-5 mood, 1-10 others)
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 10),
  stress integer check (stress between 1 and 10),
  sleep_hours numeric,
  -- compliance
  steps integer,
  nutrition_score integer check (nutrition_score between 1 and 10),
  -- qualitative
  notes text default '',
  wins text default '',
  challenges text default '',
  coach_feedback text default '',
  -- review workflow
  review_status text check (review_status in ('pending', 'reviewed', 'flagged')) default 'pending',
  flag_reason text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── check_in_photos ──────────────────────────────────────────
create table if not exists check_in_photos (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins(id) on delete cascade,
  url text not null,
  label text default '',
  created_at timestamptz default now()
);

-- ── check_in_followups ───────────────────────────────────────
create table if not exists check_in_followups (
  id uuid primary key default gen_random_uuid(),
  check_in_id uuid not null references check_ins(id) on delete cascade,
  text text not null,
  date date not null default current_date,
  created_at timestamptz default now()
);

-- ── messages ─────────────────────────────────────────────────
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  text text not null,
  timestamp timestamptz not null default now(),
  is_read boolean default false,
  is_from_coach boolean not null,
  channel text check (channel in ('telegram', 'whatsapp', 'email', 'instagram')),
  delivery_status text check (delivery_status in ('sending', 'sent', 'delivered', 'read')),
  created_at timestamptz default now()
);

-- ── invoices ─────────────────────────────────────────────────
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  amount numeric not null,
  status text check (status in ('paid', 'pending', 'overdue')) default 'pending',
  due_date date,
  paid_date date,
  period text,               -- e.g. 'Feb 2026'
  plan text check (plan in ('Basic', 'Premium', 'Elite')),
  created_at timestamptz default now()
);

-- ── notifications ────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  type text check (type in ('message', 'checkin', 'payment', 'program', 'client')) not null,
  title text not null,
  description text default '',
  timestamp timestamptz default now(),
  is_read boolean default false,
  client_id uuid references clients(id) on delete set null,
  target_page text
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table coaches enable row level security;
alter table clients enable row level security;
alter table client_metrics enable row level security;
alter table client_notes enable row level security;
alter table activity_log enable row level security;
alter table workout_programs enable row level security;
alter table program_clients enable row level security;
alter table workout_days enable row level security;
alter table exercises enable row level security;
alter table workout_logs enable row level security;
alter table check_ins enable row level security;
alter table check_in_photos enable row level security;
alter table check_in_followups enable row level security;
alter table messages enable row level security;
alter table invoices enable row level security;
alter table notifications enable row level security;

-- Coaches can only see/edit their own row
create policy "coaches: own row" on coaches
  for all using (auth.uid() = id);

-- Coaches can only access their own clients
create policy "clients: coach owns" on clients
  for all using (coach_id = auth.uid());

-- All child tables: coach must own the parent client
create policy "client_metrics: coach owns" on client_metrics
  for all using (
    exists (select 1 from clients where clients.id = client_metrics.client_id and clients.coach_id = auth.uid())
  );

create policy "client_notes: coach owns" on client_notes
  for all using (
    exists (select 1 from clients where clients.id = client_notes.client_id and clients.coach_id = auth.uid())
  );

create policy "activity_log: coach owns" on activity_log
  for all using (
    exists (select 1 from clients where clients.id = activity_log.client_id and clients.coach_id = auth.uid())
  );

create policy "workout_programs: coach owns" on workout_programs
  for all using (coach_id = auth.uid());

create policy "program_clients: coach owns" on program_clients
  for all using (
    exists (select 1 from workout_programs where workout_programs.id = program_clients.program_id and workout_programs.coach_id = auth.uid())
  );

create policy "workout_days: coach owns" on workout_days
  for all using (
    exists (select 1 from workout_programs where workout_programs.id = workout_days.program_id and workout_programs.coach_id = auth.uid())
  );

create policy "exercises: coach owns" on exercises
  for all using (
    exists (
      select 1 from workout_days
      join workout_programs on workout_programs.id = workout_days.program_id
      where workout_days.id = exercises.day_id and workout_programs.coach_id = auth.uid()
    )
  );

create policy "workout_logs: coach owns" on workout_logs
  for all using (
    exists (select 1 from clients where clients.id = workout_logs.client_id and clients.coach_id = auth.uid())
  );

create policy "check_ins: coach owns" on check_ins
  for all using (
    exists (select 1 from clients where clients.id = check_ins.client_id and clients.coach_id = auth.uid())
  );

create policy "check_in_photos: coach owns" on check_in_photos
  for all using (
    exists (
      select 1 from check_ins
      join clients on clients.id = check_ins.client_id
      where check_ins.id = check_in_photos.check_in_id and clients.coach_id = auth.uid()
    )
  );

create policy "check_in_followups: coach owns" on check_in_followups
  for all using (
    exists (
      select 1 from check_ins
      join clients on clients.id = check_ins.client_id
      where check_ins.id = check_in_followups.check_in_id and clients.coach_id = auth.uid()
    )
  );

create policy "messages: coach owns" on messages
  for all using (
    exists (select 1 from clients where clients.id = messages.client_id and clients.coach_id = auth.uid())
  );

create policy "invoices: coach owns" on invoices
  for all using (
    exists (select 1 from clients where clients.id = invoices.client_id and clients.coach_id = auth.uid())
  );

create policy "notifications: coach owns" on notifications
  for all using (coach_id = auth.uid());

-- ============================================================
-- Auto-create coach profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.coaches (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
