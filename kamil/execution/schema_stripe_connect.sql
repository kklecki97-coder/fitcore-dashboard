-- ══════════════════════════════════════════════════════════════
-- Stripe Connect + Invoice Tracking - Run in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Coach Stripe Connect fields
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS stripe_connect_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded boolean DEFAULT false;

-- 2. Invoice tracking fields
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES coaches(id),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_url text;

-- 3. Backfill coach_id from clients table
UPDATE invoices
SET coach_id = c.coach_id
FROM clients c
WHERE invoices.client_id = c.id
  AND invoices.coach_id IS NULL;

-- 4. Client RLS: allow clients to read their own invoices
CREATE POLICY "clients_read_own_invoices" ON invoices FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()));
