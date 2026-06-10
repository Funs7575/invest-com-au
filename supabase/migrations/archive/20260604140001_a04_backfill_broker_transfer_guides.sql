-- ============================================================================
-- Migration: Backfill public.broker_transfer_guides (A-04 batch 2 of 4)
-- Date:      2026-05-01 (queued under 20260604 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-04
--
-- Purpose
--   `broker_transfer_guides` exists in `lib/database.types.ts` (line 3384) and
--   is read by the /switch hub page and the admin broker-transfer-guides page.
--   No CREATE TABLE migration exists. This migration brings the schema in-tree.
--
-- Callers (client type):
--   - app/switch/page.tsx: createClient (server, anon) — public hub SELECT *
--   - app/sitemap.ts: createClient (server, anon) — sitemap slug enumeration
--   - app/admin/broker-transfer-guides/page.tsx: createClient (browser, authenticated
--     admin) — admin CUD (SELECT/INSERT/UPDATE/DELETE)
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*broker_transfer_guides|broker_transfer_guides.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL.
--   - anon SELECT: all rows — broker transfer guide data is public reference info.
--     The /switch page reads all guides regardless of status.
--   - Admin FOR ALL: authenticated admin users (browser client) — write access.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.broker_transfer_guides;
--     DROP POLICY IF EXISTS "anon can read"            ON public.broker_transfer_guides;
--     DROP POLICY IF EXISTS "admin full access"        ON public.broker_transfer_guides;
--     ALTER TABLE public.broker_transfer_guides DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.broker_transfer_guides; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.broker_transfer_guides (
  id                      SERIAL PRIMARY KEY,
  broker_slug             TEXT          NOT NULL,
  transfer_type           TEXT          NOT NULL,
  chess_transfer_fee      INTEGER       NOT NULL,
  supports_in_specie      BOOLEAN       NOT NULL DEFAULT false,
  in_specie_notes         TEXT,
  estimated_timeline_days INTEGER,
  exit_fees               TEXT,
  special_requirements    TEXT[],
  helpful_links           JSONB,
  steps                   JSONB         NOT NULL DEFAULT '[]'::JSONB,
  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_transfer_guides_slug
  ON public.broker_transfer_guides (broker_slug);

ALTER TABLE public.broker_transfer_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_transfer_guides FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.broker_transfer_guides;
CREATE POLICY "service_role full access"
  ON public.broker_transfer_guides
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can read" ON public.broker_transfer_guides;
CREATE POLICY "anon can read"
  ON public.broker_transfer_guides
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "admin full access" ON public.broker_transfer_guides;
CREATE POLICY "admin full access"
  ON public.broker_transfer_guides
  FOR ALL TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
