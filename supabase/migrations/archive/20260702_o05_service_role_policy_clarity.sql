-- ============================================================================
-- O-05: Service-role policy clarity on 5 internal tables
-- Date: 2026-07-02
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §4 (DB hardening)
-- Queue item: O-05
--
-- WHY:
--   Migration 20260321_pre_launch_rls_fixes.sql enabled RLS on
--   broker_creatives, ab_tests, broker_notifications, support_tickets, and
--   support_messages — all internal tables never accessed by anon or
--   authenticated users directly. The policies created used USING (false),
--   which is a valid but confusing pattern: it says "deny all rows" yet the
--   practical effect is service_role-only access because service_role bypasses
--   RLS. A reader cannot tell from `pg_policies` that service_role was the
--   intended role.
--
--   This migration replaces the five USING (false) policies with explicit
--   TO service_role USING (true) WITH CHECK (true) policies, making the
--   intent clear in pg_policies without changing runtime behaviour. It also
--   adds FORCE ROW LEVEL SECURITY so that even the Postgres table owner
--   (supabase_admin) is subject to the policy — consistent with all other
--   user-data tables in the schema.
--
-- IMPORTANT — prior policy state (discovered per iter-7 B-05 lesson):
--   broker_creatives  : "Service role full access broker_creatives" USING(false) (20260321)
--   ab_tests          : "Service role full access ab_tests"          USING(false) (20260321)
--   broker_notifications: "Service role full access broker_notifications" USING(false) (20260321)
--   support_tickets   : "Service role full access support_tickets"   USING(false) (20260321)
--   support_messages  : "Service role full access support_messages"  USING(false) (20260321)
--   All five policies are replaced below. No other policies on these tables.
--
-- IDEMPOTENCY CLAIM:
--   DROP POLICY IF EXISTS is a no-op if already dropped.
--   CREATE POLICY uses IF NOT EXISTS (via DO block check on pg_policies).
--   ALTER TABLE … FORCE ROW LEVEL SECURITY is idempotent.
--   Safe to run multiple times.
--
-- ROLLBACK:
--   For each table, reverse by:
--     DROP POLICY IF EXISTS "Service role only — <table>" ON <table>;
--     ALTER TABLE <table> NO FORCE ROW LEVEL SECURITY;
--     CREATE POLICY "Service role full access <table>"
--       ON <table> FOR ALL USING (false);
--   (RLS remains enabled from 20260321; do not DISABLE RLS on rollback.)
-- ============================================================================

BEGIN;

-- ── broker_creatives ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access broker_creatives" ON broker_creatives;
ALTER TABLE IF EXISTS broker_creatives FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'broker_creatives'
      AND policyname = 'Service role only — broker_creatives'
  ) THEN
    CREATE POLICY "Service role only — broker_creatives"
      ON broker_creatives FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── ab_tests ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access ab_tests" ON ab_tests;
ALTER TABLE IF EXISTS ab_tests FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ab_tests'
      AND policyname = 'Service role only — ab_tests'
  ) THEN
    CREATE POLICY "Service role only — ab_tests"
      ON ab_tests FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── broker_notifications ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access broker_notifications" ON broker_notifications;
ALTER TABLE IF EXISTS broker_notifications FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'broker_notifications'
      AND policyname = 'Service role only — broker_notifications'
  ) THEN
    CREATE POLICY "Service role only — broker_notifications"
      ON broker_notifications FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── support_tickets ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access support_tickets" ON support_tickets;
ALTER TABLE IF EXISTS support_tickets FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_tickets'
      AND policyname = 'Service role only — support_tickets'
  ) THEN
    CREATE POLICY "Service role only — support_tickets"
      ON support_tickets FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── support_messages ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Service role full access support_messages" ON support_messages;
ALTER TABLE IF EXISTS support_messages FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'support_messages'
      AND policyname = 'Service role only — support_messages'
  ) THEN
    CREATE POLICY "Service role only — support_messages"
      ON support_messages FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;
