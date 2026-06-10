-- ============================================================================
-- Migration: Backfill public.credit_packs (A-03 batch 2 of ~8)
-- Date:      2026-05-01 (queued under 20260606 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `credit_packs` exists in `lib/database.types.ts` and is referenced by the
--   advisor payment route (`app/api/advisor-auth/payment/route.ts`) as a pricing
--   catalog. App code currently uses hardcoded CREDIT_PACKS constants in sync
--   with this table; the table is the authoritative catalog in production. No
--   CREATE TABLE migration exists. This migration brings the schema in-tree.
--
-- Callers (client type):
--   - app/api/advisor-auth/topup/route.ts: comment reference only — prices are
--     hardcoded as constants that must match credit_packs table rows.
--   - app/api/advisor-auth/payment/route.ts: same pattern — CREDIT_PACKS constant.
--   - No direct `from("credit_packs")` query found at migration time. Table is
--     a future-facing catalog used for price reference.
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*credit_packs|credit_packs.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — admin management of pack catalog.
--   - anon SELECT: WHERE active = true — public pricing display. Credit packs
--     are a pricing catalog, akin to `content_products`. Advisor signup flow
--     may render pack options without authentication.
--   - TODO: human review — admin INSERT/UPDATE via admin client (no anon write
--     path needed). If a self-service pack editor is added in admin UI, an
--     admin FOR ALL policy should be added alongside.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.credit_packs;
--     DROP POLICY IF EXISTS "anon can view active packs" ON public.credit_packs;
--     ALTER TABLE public.credit_packs DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.credit_packs; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.credit_packs (
  id                    SERIAL PRIMARY KEY,
  slug                  TEXT        NOT NULL UNIQUE,
  name                  TEXT        NOT NULL,
  lead_count            INTEGER     NOT NULL,
  price_cents           INTEGER     NOT NULL,
  price_per_lead_cents  INTEGER     NOT NULL,
  savings_percent       NUMERIC,
  badge                 TEXT,
  description           TEXT,
  stripe_price_id       TEXT,
  active                BOOLEAN     DEFAULT true,
  sort_order            INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_packs_slug
  ON public.credit_packs (slug);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.credit_packs;
CREATE POLICY "service_role full access"
  ON public.credit_packs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can view active packs" ON public.credit_packs;
CREATE POLICY "anon can view active packs"
  ON public.credit_packs
  FOR SELECT TO anon
  USING (active = true);

COMMIT;
