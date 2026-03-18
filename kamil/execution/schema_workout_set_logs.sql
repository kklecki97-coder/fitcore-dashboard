-- ============================================================
-- FitCore - Workout Set Logs Table
-- Stores per-set tracking data from client portal workouts
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── workout_set_logs ───────────────────────────────────────
create table if not exists workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  exercise_id uuid not null,
  exercise_name text not null,
  set_number integer not null,
  reps integer not null,
  weight text,
  completed boolean default false,
  rpe numeric,
  date date not null default current_date,
  created_at timestamptz default now()
);

alter table workout_set_logs enable row level security;

-- Coach can see/manage all set logs for their clients
create policy "workout_set_logs: coach owns" on workout_set_logs
  for all using (
    exists (select 1 from clients where clients.id = workout_set_logs.client_id and clients.coach_id = auth.uid())
  );

-- Client can read their own set logs
create policy "workout_set_logs: client reads own" on workout_set_logs
  for select using (
    exists (select 1 from clients where clients.id = workout_set_logs.client_id and clients.auth_user_id = auth.uid())
  );

-- Client can insert their own set logs
create policy "workout_set_logs: client inserts" on workout_set_logs
  for insert with check (
    exists (select 1 from clients where clients.id = workout_set_logs.client_id and clients.auth_user_id = auth.uid())
  );

-- Client can update their own set logs
create policy "workout_set_logs: client updates" on workout_set_logs
  for update using (
    exists (select 1 from clients where clients.id = workout_set_logs.client_id and clients.auth_user_id = auth.uid())
  );

-- Client can delete their own set logs
create policy "workout_set_logs: client deletes" on workout_set_logs
  for delete using (
    exists (select 1 from clients where clients.id = workout_set_logs.client_id and clients.auth_user_id = auth.uid())
  );
