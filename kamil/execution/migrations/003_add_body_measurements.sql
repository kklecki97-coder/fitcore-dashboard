-- ============================================================
-- Migration 003: Add body circumference measurements
-- Adds 5 measurement columns to both client_metrics and check_ins
-- ============================================================

-- ── client_metrics: add circumference columns ──
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS waist numeric;
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS hips numeric;
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS chest numeric;
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS bicep numeric;
ALTER TABLE client_metrics ADD COLUMN IF NOT EXISTS thigh numeric;

-- ── check_ins: add circumference columns ──
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS waist numeric;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS hips numeric;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS chest numeric;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS bicep numeric;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS thigh numeric;
