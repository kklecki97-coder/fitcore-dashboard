-- Weekly training day schedule per client
-- Clients tap a calendar day and pick which workout to do that day
-- day_assignments is a jsonb map: { "0": "workout-day-uuid", "2": "workout-day-uuid" }
-- Keys are 0=Mon, 1=Tue ... 6=Sun. Missing keys = rest day.

CREATE TABLE IF NOT EXISTS weekly_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start date NOT NULL,                          -- always a Monday
  day_assignments jsonb NOT NULL DEFAULT '{}',        -- { "dayIndex": "workout_day_id" }
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, week_start)
);

ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;

-- Drop old policy if it exists
DROP POLICY IF EXISTS "clients can manage own schedule" ON weekly_schedule;
DROP POLICY IF EXISTS "client_schedule_select" ON weekly_schedule;
DROP POLICY IF EXISTS "client_schedule_insert" ON weekly_schedule;
DROP POLICY IF EXISTS "client_schedule_update" ON weekly_schedule;
DROP POLICY IF EXISTS "client_schedule_delete" ON weekly_schedule;

-- Split policies per operation (matches working pattern from schema_workout_set_logs.sql)
CREATE POLICY "client_schedule_select" ON weekly_schedule FOR SELECT
  USING (exists (select 1 from clients where clients.id = weekly_schedule.client_id and clients.auth_user_id = auth.uid()));

CREATE POLICY "client_schedule_insert" ON weekly_schedule FOR INSERT
  WITH CHECK (exists (select 1 from clients where clients.id = weekly_schedule.client_id and clients.auth_user_id = auth.uid()));

CREATE POLICY "client_schedule_update" ON weekly_schedule FOR UPDATE
  USING (exists (select 1 from clients where clients.id = weekly_schedule.client_id and clients.auth_user_id = auth.uid()));

CREATE POLICY "client_schedule_delete" ON weekly_schedule FOR DELETE
  USING (exists (select 1 from clients where clients.id = weekly_schedule.client_id and clients.auth_user_id = auth.uid()));
