-- ============================================================
-- FitCore — Invite Codes table
-- Allows coaches to generate invite links for clients
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  coach_id uuid not null references coaches(id) on delete cascade,
  client_name text,
  client_email text,
  plan text check (plan in ('Basic', 'Premium', 'Elite')) default 'Basic',
  used_by uuid references clients(id),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table invite_codes enable row level security;

-- Coaches can manage their own invite codes
create policy "invite_codes: coach owns" on invite_codes
  for all using (coach_id = auth.uid());

-- Anyone can read an invite code by its code value (needed for client registration)
create policy "invite_codes: public read by code" on invite_codes
  for select using (true);
