-- ============================================================
-- FitCore Subscription System - Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add subscription fields to coaches table
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'pro', 'cancelled')),
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
