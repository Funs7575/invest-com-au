-- ============================================================================
-- Migration: A-02 batch 6 — investor_drip_log backfill + RLS
-- Date:      2026-05-02 (timestamped 20260609120001 to follow notification_prefs)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02 batch 6
--
-- Purpose
--   `investor_drip_log` has no DDL migration (table creation statement) in the
--   migration history. The table exists in production and is referenced by
--   multiple migrations (index in 20260309_security_and_performance_fixes.sql;
--   ALTER TABLE columns in 20260408_tier1_revenue_features.sql) but none
--   creates it. A fresh Supabase environment would fail when 20260309 tries to
--   create the index on a non-existent table.
--
--   This migration backfills the table DDL. RLS is added: the table contains
--   per-email marketing drip state; there is no owner-ID FK, so no per-user
--   policy is appropriate. All access is via service_role (cron jobs) or the
--   admin panel (authenticated admin user).
--
-- Schema source: lib/database.types.ts investor_drip_log.Row
--   id            integer (SERIAL)
--   email         text NOT NULL
--   drip_number   integer NOT NULL
--   sent_at       timestamptz
--   Additional columns added in existing migrations (20260408_tier1_revenue_features.sql):
--     drip_type              TEXT DEFAULT 'investor'
--     broker_recommendations JSONB
--     opened_at              TIMESTAMPTZ
--     clicked_at             TIMESTAMPTZ
--   These ALTER TABLE additions are idempotent (IF NOT EXISTS) and run after
--   this migration on a fresh environment, so no duplication needed here.
--
-- IMPORTANT — prior policy state
--   20260309_security_and_performance_fixes.sql:422-424 drops three policies:
--     DROP POLICY IF EXISTS "Insert investor drip log"   ON investor_drip_log
--     DROP POLICY IF EXISTS "Anyone can insert drip log" ON investor_drip_log
--     DROP POLICY IF EXISTS "Public insert drip log"     ON investor_drip_log
--   These drops were performed before ENABLE ROW LEVEL SECURITY, so they run
--   successfully only if the table exists. On a fresh environment, this
--   this migration's DDL runs first (timestamp 20260609 < 20260309 is FALSE —
--   migration ordering is by filename lexicographic order, so 20260309 runs
--   BEFORE 20260609). On a fresh build,
--   20260309 runs when the table doesn't exist yet → the DO $$ BEGIN IF EXISTS
--   guard prevents errors. Then this migration creates the table. Then
--   20260408 adds columns. Order is safe.
--   All three named policies are included below as DROP IF EXISTS for
--   idempotency when re-run against a DB that was partially migrated.
--
-- Verified callers
--   app/api/drip-click/route.ts                    — createAdminClient() UPDATE clicked_at
--   app/api/cron/investor-drip/route.ts            — createAdminClient() SELECT + INSERT
--   app/api/cron/abandoned-shortlist-drip/route.ts — createAdminClient() SELECT + INSERT
--   app/api/cron/email-bounce-sweep/route.ts       — createAdminClient() SELECT + UPDATE
--   app/admin/email-performance/page.tsx           — createClient() (browser, authenticated)
--     SELECT email, template_id, sent_at (admin-only page; user JWT has role=admin)
--
-- Idempotency
--   Table DDL uses IF NOT EXISTS — no-op when table already exists.
--   ENABLE/FORCE ROW LEVEL SECURITY — no-op when already set.
--   DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"  ON investor_drip_log;
--     DROP POLICY IF EXISTS "Admin can read drip log"   ON investor_drip_log;
--     ALTER TABLE investor_drip_log DISABLE ROW LEVEL SECURITY;
--     -- Only drop on a fresh environment (data loss on prod):
--     -- DROP TABLE IF EXISTS investor_drip_log;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_drip_log (
  id           serial      PRIMARY KEY,
  email        text        NOT NULL,
  drip_number  integer     NOT NULL,
  sent_at      timestamptz DEFAULT now()
  -- Additional columns (drip_type, broker_recommendations, opened_at, clicked_at)
  -- are added via ALTER TABLE IF NOT EXISTS in 20260408_tier1_revenue_features.sql
  -- which runs after this migration. No duplication needed.
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_drip_log_email_drip
  ON public.investor_drip_log (email, drip_number);

-- The index below was originally created conditionally in 20260309. Re-declare
-- here so a fresh environment gets it regardless of the DO $$ guard result.
CREATE INDEX IF NOT EXISTS idx_investor_drip_log_email
  ON public.investor_drip_log (email);

ALTER TABLE public.investor_drip_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_drip_log FORCE  ROW LEVEL SECURITY;

-- Drop prior permissive INSERT policies (originally removed in 20260309;
-- included here for idempotency on partially-migrated DBs).
DROP POLICY IF EXISTS "Insert investor drip log"   ON public.investor_drip_log;
DROP POLICY IF EXISTS "Anyone can insert drip log" ON public.investor_drip_log;
DROP POLICY IF EXISTS "Public insert drip log"     ON public.investor_drip_log;

-- All cron jobs and the drip-click route use service_role (admin client),
-- which bypasses RLS. This explicit policy makes that intent visible in
-- pg_policies rather than relying on implicit bypass.
CREATE POLICY "service_role full access"
  ON public.investor_drip_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- TODO: human review of policy semantics.
-- app/admin/email-performance/page.tsx reads this table via the browser
-- Supabase client (authenticated role). The admin middleware ensures only
-- users with user_metadata.role='admin' can reach /admin/* pages, but RLS
-- cannot verify middleware — this policy trusts the application-layer guard.
-- Long-term, the page should switch to the admin Supabase client (server
-- component) per CLAUDE.md §admin-client-scope. Tracked in stream C.
CREATE POLICY "Admin can read drip log"
  ON public.investor_drip_log
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
