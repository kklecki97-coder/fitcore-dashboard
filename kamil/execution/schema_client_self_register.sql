-- ============================================================
-- FitCore - Allow clients to insert their own row during registration
-- The signUp flow creates the auth user first, then inserts a clients row.
-- Without this policy, RLS blocks the insert because the new user is not a coach.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Allow a client to insert their own row (auth_user_id must match their auth.uid())
create policy "clients: self register" on clients
  for insert with check (auth_user_id = auth.uid());

-- Also allow clients to update their own row (for profile edits later)
create policy "clients: client updates own" on clients
  for update using (auth_user_id = auth.uid());
