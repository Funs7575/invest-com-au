-- =============================================================================
-- Date:          2026-05-01
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-02 batch 6 (notification_preferences)
-- Why:           notification_preferences holds per-user email/push opt-in
--                settings (weekly_digest, deal_alerts, fee_alerts, etc.).
--                The table had no RLS at all — any service-role bypass was
--                already in effect but an authenticated-role leak was possible
--                if any future route used createClient() for cross-user reads.
-- Idempotency:   IF NOT EXISTS guards on ENABLE/FORCE; DROP POLICY IF EXISTS
--                before each CREATE POLICY; safe to re-apply.
-- Rollback:      ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
--                DROP POLICY IF EXISTS "service_role full access" ON notification_preferences;
--                DROP POLICY IF EXISTS "User manages own preferences" ON notification_preferences;
-- Prior policy state: no prior CREATE POLICY found in any migration for this
--                table; no prior ENABLE ROW LEVEL SECURITY found.
-- =============================================================================

BEGIN;

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (auditability — pg_policies shows intent)
DROP POLICY IF EXISTS "service_role full access" ON notification_preferences;
CREATE POLICY "service_role full access"
  ON notification_preferences
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users manage their own preferences only
DROP POLICY IF EXISTS "User manages own preferences" ON notification_preferences;
CREATE POLICY "User manages own preferences"
  ON notification_preferences
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
