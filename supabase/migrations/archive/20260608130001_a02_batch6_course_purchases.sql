-- =============================================================================
-- Date:          2026-05-01
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-02 batch 6 (course_purchases)
-- Why:           course_purchases records which users have paid for which
--                courses (Stripe checkout → upsert on checkout.session.completed).
--                The table had no RLS — any authenticated user could potentially
--                read or modify other users' purchase records.
-- Idempotency:   IF NOT EXISTS guards on ENABLE/FORCE; DROP POLICY IF EXISTS
--                before each CREATE POLICY; safe to re-apply.
-- Rollback:      ALTER TABLE course_purchases DISABLE ROW LEVEL SECURITY;
--                DROP POLICY IF EXISTS "service_role full access" ON course_purchases;
--                DROP POLICY IF EXISTS "User reads own purchases" ON course_purchases;
-- Prior policy state: no prior CREATE POLICY found in any migration for this
--                table; no prior ENABLE ROW LEVEL SECURITY found.
-- Note:          Current app routes (course/progress, course/purchase) use
--                createAdminClient() for all course_purchases operations.
--                The "User reads own purchases" policy is additive: it makes
--                the table safe if/when a user-facing "my courses" view is
--                added using createClient() (server auth). It does not affect
--                existing service-role callers.
-- =============================================================================

BEGIN;

-- Enable RLS
ALTER TABLE course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_purchases FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (stripe webhook + cron + admin writes)
DROP POLICY IF EXISTS "service_role full access" ON course_purchases;
CREATE POLICY "service_role full access"
  ON course_purchases
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read their own purchases
-- INSERT/UPDATE/DELETE intentionally excluded: writes go through stripe webhook
-- (service-role) — users cannot self-grant course access.
-- TODO: human review of policy semantics — confirm no user-facing write path
--       exists or is planned before removing service-role-only write restriction.
DROP POLICY IF EXISTS "User reads own purchases" ON course_purchases;
CREATE POLICY "User reads own purchases"
  ON course_purchases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
