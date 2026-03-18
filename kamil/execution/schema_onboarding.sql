-- ============================================================
-- FitCore - Client Onboarding Flag
-- Tracks whether a client has completed the first-login onboarding flow.
-- Run this in Supabase SQL Editor.
-- ============================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false;
