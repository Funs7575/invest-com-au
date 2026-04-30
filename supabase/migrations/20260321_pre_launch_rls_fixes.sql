-- ============================================================================
-- Migration: 20260321_pre_launch_rls_fixes.sql
-- Purpose: Backfill ENABLE RLS + a service-role-only DENY-ALL policy on
--          six tables from 003_broker_portal_features.sql that were
--          shipped without RLS (broker_creatives, ab_tests,
--          broker_notifications, support_tickets, support_messages,
--          sponsor_invoices). Each table gets a single
--          "Service role full access <table>" policy with
--          USING (false), which the service-role client bypasses but
--          all other roles are blocked from.
-- Rollback: DROP each policy, then DISABLE ROW LEVEL SECURITY on each
--           table.
-- Risk: low — purely security-posture changes. Rolling back leaves
--       these tables permission-checked at the role layer (service-role
--       client still works) but exposes them through pg_graphql /
--       authenticated role if those routes exist. The original state
--       (RLS off) is what shipped through 003_broker_portal_features
--       so reverse restores the same exposure pattern that existed
--       before this migration. Idempotent forward pattern means
--       re-running is also safe.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE IF EXISTS broker_creatives
--        ENABLE ROW LEVEL SECURITY.
--   2. CREATE POLICY "Service role full access broker_creatives" ...
--        USING (false), guarded by a NOT EXISTS check in DO $$ ... $$.
--   3. ALTER TABLE IF EXISTS ab_tests ENABLE ROW LEVEL SECURITY.
--   4. CREATE POLICY "Service role full access ab_tests" USING (false).
--   5. ALTER TABLE IF EXISTS broker_notifications
--        ENABLE ROW LEVEL SECURITY.
--   6. CREATE POLICY "Service role full access broker_notifications"
--        USING (false).
--   7. ALTER TABLE IF EXISTS support_tickets
--        ENABLE ROW LEVEL SECURITY.
--   8. CREATE POLICY "Service role full access support_tickets"
--        USING (false).
--   9. ALTER TABLE IF EXISTS support_messages
--        ENABLE ROW LEVEL SECURITY.
--  10. CREATE POLICY "Service role full access support_messages"
--        USING (false).
--  11. ALTER TABLE IF EXISTS sponsor_invoices
--        ENABLE ROW LEVEL SECURITY.
--  12. CREATE POLICY "Service role full access sponsor_invoices"
--        USING (false).
--
-- Rollback (in reverse order):
--  12. DROP POLICY IF EXISTS "Service role full access sponsor_invoices"
--        ON sponsor_invoices;
--  11. ALTER TABLE IF EXISTS sponsor_invoices
--        DISABLE ROW LEVEL SECURITY;
--  10. DROP POLICY IF EXISTS "Service role full access support_messages"
--        ON support_messages;
--   9. ALTER TABLE IF EXISTS support_messages
--        DISABLE ROW LEVEL SECURITY;
--   8. DROP POLICY IF EXISTS "Service role full access support_tickets"
--        ON support_tickets;
--   7. ALTER TABLE IF EXISTS support_tickets
--        DISABLE ROW LEVEL SECURITY;
--   6. DROP POLICY IF EXISTS "Service role full access broker_notifications"
--        ON broker_notifications;
--   5. ALTER TABLE IF EXISTS broker_notifications
--        DISABLE ROW LEVEL SECURITY;
--   4. DROP POLICY IF EXISTS "Service role full access ab_tests"
--        ON ab_tests;
--   3. ALTER TABLE IF EXISTS ab_tests DISABLE ROW LEVEL SECURITY;
--   2. DROP POLICY IF EXISTS "Service role full access broker_creatives"
--        ON broker_creatives;
--   1. ALTER TABLE IF EXISTS broker_creatives
--        DISABLE ROW LEVEL SECURITY;
-- ============================================================================

-- Pre-launch: Enable RLS on tables missing it + add policies
-- Tables from 003_broker_portal_features.sql that were missed

-- ── broker_creatives ────────────────────────────────────────
ALTER TABLE IF EXISTS broker_creatives ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_creatives' AND policyname = 'Service role full access broker_creatives') THEN
    CREATE POLICY "Service role full access broker_creatives" ON broker_creatives FOR ALL USING (false);
  END IF;
END $$;

-- ── ab_tests ────────────────────────────────────────────────
ALTER TABLE IF EXISTS ab_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ab_tests' AND policyname = 'Service role full access ab_tests') THEN
    CREATE POLICY "Service role full access ab_tests" ON ab_tests FOR ALL USING (false);
  END IF;
END $$;

-- ── broker_notifications ────────────────────────────────────
ALTER TABLE IF EXISTS broker_notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'broker_notifications' AND policyname = 'Service role full access broker_notifications') THEN
    CREATE POLICY "Service role full access broker_notifications" ON broker_notifications FOR ALL USING (false);
  END IF;
END $$;

-- ── support_tickets ─────────────────────────────────────────
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'Service role full access support_tickets') THEN
    CREATE POLICY "Service role full access support_tickets" ON support_tickets FOR ALL USING (false);
  END IF;
END $$;

-- ── support_messages ────────────────────────────────────────
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'support_messages' AND policyname = 'Service role full access support_messages') THEN
    CREATE POLICY "Service role full access support_messages" ON support_messages FOR ALL USING (false);
  END IF;
END $$;

-- ── sponsor_invoices ────────────────────────────────────────
ALTER TABLE IF EXISTS sponsor_invoices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sponsor_invoices' AND policyname = 'Service role full access sponsor_invoices') THEN
    CREATE POLICY "Service role full access sponsor_invoices" ON sponsor_invoices FOR ALL USING (false);
  END IF;
END $$;
