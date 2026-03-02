-- ============================================================
-- FitCore — Fix Infinite RLS Recursion
-- The program_clients coach policy references workout_programs,
-- and the workout_programs client policy references program_clients,
-- creating an infinite loop. Fix by breaking the cycle.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── Step 1: Drop the recursive policies ──

-- program_clients: coach policy references workout_programs (causes recursion)
drop policy if exists "program_clients: coach owns" on program_clients;

-- program_clients: client policy is fine (references clients only)
-- Keep: "program_clients: client reads own"

-- ── Step 2: Recreate program_clients coach policy ──
-- Instead of joining workout_programs, check via clients table
-- A coach can manage program_clients if the client belongs to them
create policy "program_clients: coach owns" on program_clients
  for all using (
    exists (select 1 from clients where clients.id = program_clients.client_id and clients.coach_id = auth.uid())
  );

-- ── Verify: no other recursive chains ──
-- workout_programs coach policy: coach_id = auth.uid() → NO recursion (direct check)
-- workout_programs client policy: joins program_clients → clients → auth.uid() → OK (no back-reference to workout_programs)
-- workout_days coach policy: joins workout_programs → coach_id = auth.uid() → OK
-- workout_days client policy: joins program_clients → clients → auth.uid() → OK
-- exercises coach policy: joins workout_days → workout_programs → coach_id = auth.uid() → OK
-- exercises client policy: joins workout_days → program_clients → clients → auth.uid() → OK
