-- Migration: life_event_wizard_state
--
-- Persists multi-step checklist progress for each life-event wizard a user starts.
-- References life_event_id strings from lib/life-events.ts (no FK — lib-managed enum).
--
-- Rollback:
--   DROP TABLE IF EXISTS life_event_wizard_state CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS life_event_wizard_state (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  life_event_id   text NOT NULL CHECK (char_length(life_event_id) BETWEEN 1 AND 100),
  -- 0-based index of the furthest step the user has reached
  step            integer NOT NULL DEFAULT 0 CHECK (step >= 0),
  -- jsonb bag: { completed: string[], notes?: Record<string, string> }
  form_data       jsonb NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, life_event_id)
);

CREATE INDEX IF NOT EXISTS idx_wizard_state_user
  ON life_event_wizard_state (user_id, updated_at DESC);

ALTER TABLE life_event_wizard_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_event_wizard_state FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wizard_own_read"    ON life_event_wizard_state;
DROP POLICY IF EXISTS "wizard_own_insert"  ON life_event_wizard_state;
DROP POLICY IF EXISTS "wizard_own_update"  ON life_event_wizard_state;
DROP POLICY IF EXISTS "wizard_own_delete"  ON life_event_wizard_state;
DROP POLICY IF EXISTS "wizard_service_all" ON life_event_wizard_state;

CREATE POLICY "wizard_own_read"
  ON life_event_wizard_state FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wizard_own_insert"
  ON life_event_wizard_state FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wizard_own_update"
  ON life_event_wizard_state FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wizard_own_delete"
  ON life_event_wizard_state FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "wizard_service_all"
  ON life_event_wizard_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
