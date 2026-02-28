-- ============================================================
-- FitCore — Client Auth Migration
-- Adds auth_user_id to clients + RLS policies for client access
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Add auth_user_id column to clients ──
-- Links a client row to a Supabase Auth user so clients can log in
alter table clients add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

-- ── Client-side RLS policies ──
-- Clients can read their own client row
create policy "clients: client reads own" on clients
  for select using (auth_user_id = auth.uid());

-- Clients can read their own metrics
create policy "client_metrics: client reads own" on client_metrics
  for select using (
    exists (select 1 from clients where clients.id = client_metrics.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can read messages for their conversation
create policy "messages: client reads own" on messages
  for select using (
    exists (select 1 from clients where clients.id = messages.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can INSERT messages (send to coach)
create policy "messages: client sends" on messages
  for insert with check (
    exists (select 1 from clients where clients.id = messages.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can read their own check-ins
create policy "check_ins: client reads own" on check_ins
  for select using (
    exists (select 1 from clients where clients.id = check_ins.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can INSERT check-ins (submit new ones)
create policy "check_ins: client submits" on check_ins
  for insert with check (
    exists (select 1 from clients where clients.id = check_ins.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can read check-in photos
create policy "check_in_photos: client reads own" on check_in_photos
  for select using (
    exists (
      select 1 from check_ins
      join clients on clients.id = check_ins.client_id
      where check_ins.id = check_in_photos.check_in_id and clients.auth_user_id = auth.uid()
    )
  );

-- Clients can INSERT check-in photos
create policy "check_in_photos: client uploads" on check_in_photos
  for insert with check (
    exists (
      select 1 from check_ins
      join clients on clients.id = check_ins.client_id
      where check_ins.id = check_in_photos.check_in_id and clients.auth_user_id = auth.uid()
    )
  );

-- Clients can read their assigned programs (via program_clients junction)
create policy "workout_programs: client reads assigned" on workout_programs
  for select using (
    exists (
      select 1 from program_clients
      join clients on clients.id = program_clients.client_id
      where program_clients.program_id = workout_programs.id and clients.auth_user_id = auth.uid()
    )
  );

-- Clients can read program_clients rows for their assignments
create policy "program_clients: client reads own" on program_clients
  for select using (
    exists (select 1 from clients where clients.id = program_clients.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can read workout days of their assigned programs
create policy "workout_days: client reads assigned" on workout_days
  for select using (
    exists (
      select 1 from program_clients
      join clients on clients.id = program_clients.client_id
      where program_clients.program_id = workout_days.program_id and clients.auth_user_id = auth.uid()
    )
  );

-- Clients can read exercises of their assigned programs
create policy "exercises: client reads assigned" on exercises
  for select using (
    exists (
      select 1 from workout_days
      join program_clients on program_clients.program_id = workout_days.program_id
      join clients on clients.id = program_clients.client_id
      where workout_days.id = exercises.day_id and clients.auth_user_id = auth.uid()
    )
  );

-- Clients can read their own workout logs
create policy "workout_logs: client reads own" on workout_logs
  for select using (
    exists (select 1 from clients where clients.id = workout_logs.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can INSERT workout logs (log sets)
create policy "workout_logs: client logs" on workout_logs
  for insert with check (
    exists (select 1 from clients where clients.id = workout_logs.client_id and clients.auth_user_id = auth.uid())
  );

-- Clients can read the coach row for their coach's name/info
create policy "coaches: client reads own coach" on coaches
  for select using (
    exists (select 1 from clients where clients.coach_id = coaches.id and clients.auth_user_id = auth.uid())
  );
