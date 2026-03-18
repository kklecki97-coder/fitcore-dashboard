-- Coaching Plans table — coaches define custom plans with pricing
CREATE TABLE coaching_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'weekly', 'one-time')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE coaching_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can CRUD own plans"
  ON coaching_plans FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
