-- =============================================================================
-- Date:          2026-05-01
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-02 batch 6 (investor_drip_log)
-- Why:           investor_drip_log is the idempotency log for the investor
--                drip email sequence — it stores (email, drip_number, sent_at)
--                so cron jobs can skip already-sent emails. The table is
--                email-keyed with no auth.uid() linkage. All callers use
--                createAdminClient() (cron routes, drip-click tracker,
--                admin email-performance page). Anon write access must be
--                denied to prevent spoofed "already sent" entries that would
--                suppress legitimate drip emails.
-- Idempotency:   IF NOT EXISTS guards on ENABLE/FORCE; DROP POLICY IF EXISTS
--                before each CREATE POLICY; safe to re-apply.
-- Rollback:      ALTER TABLE investor_drip_log DISABLE ROW LEVEL SECURITY;
--                DROP POLICY IF EXISTS "service_role full access" ON investor_drip_log;
-- IMPORTANT — prior policy state:
--   Migration 20260309_security_and_performance_fixes.sql (lines 422-424)
--   already executed EXECUTE 'DROP POLICY IF EXISTS "Insert investor drip log"
--   ON investor_drip_log', 'DROP POLICY IF EXISTS "Anyone can insert drip log"
--   ON investor_drip_log', and 'DROP POLICY IF EXISTS "Public insert drip log"
--   ON investor_drip_log'. Those three open-insert policies were created in
--   an earlier (pre-migration-tracking) setup and are already gone. The drops
--   below are included as idempotency guards in case of schema re-seed.
--   No CREATE POLICY found for this table in any tracked migration.
-- =============================================================================

BEGIN;

-- Enable RLS
ALTER TABLE investor_drip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_drip_log FORCE ROW LEVEL SECURITY;

-- Idempotency: drop previously-removed open-insert policies (see header)
-- Sourced from: 20260309_security_and_performance_fixes.sql lines 422-424
DROP POLICY IF EXISTS "Insert investor drip log" ON investor_drip_log;
DROP POLICY IF EXISTS "Anyone can insert drip log" ON investor_drip_log;
DROP POLICY IF EXISTS "Public insert drip log" ON investor_drip_log;

-- Service-role explicit allow (all callers use admin client; deny all other roles)
DROP POLICY IF EXISTS "service_role full access" ON investor_drip_log;
CREATE POLICY "service_role full access"
  ON investor_drip_log
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO: human review of policy semantics — table is email-keyed (no auth.uid()
--       linkage), so no per-user authenticated policy is possible without
--       joining to auth.users by email. Current deny-all-anon/authenticated
--       intent is correct given all callers are service-role. Confirm no
--       user-facing read path (e.g., "view your drip history") is planned.

COMMIT;
