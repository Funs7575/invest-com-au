-- ============================================================================
-- Migration: Backfill public.content_products (A-04 batch 4 of 4)
-- Date:      2026-05-01 (queued under 20260604 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-04
--
-- Purpose
--   `content_products` exists in `lib/database.types.ts` but has no CREATE TABLE
--   migration and no current callers in app/ or lib/. Likely a future-use table
--   for premium content products (ebooks, courses, guides sold via the platform).
--   This migration brings the schema declaration in-tree.
--
-- Callers (client type):
--   - None found in app/ or lib/ at time of migration. Table referenced only in
--     lib/database.types.ts.
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*content_products|content_products.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — future admin/cron access.
--   - anon SELECT: WHERE active = true — future public product listing.
--     Zero overhead while no active products exist.
--   - TODO: human review of policy semantics — if content_products becomes a
--     paid-content gate (course purchase, ebook download), user-scoped purchase
--     policies will be needed on a companion `content_purchases` table; this
--     migration does NOT add purchase-access policies.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"  ON public.content_products;
--     DROP POLICY IF EXISTS "anon can view active"      ON public.content_products;
--     ALTER TABLE public.content_products DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.content_products; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.content_products (
  id          SERIAL PRIMARY KEY,
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  price_cents INTEGER     NOT NULL,
  description TEXT,
  active      BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_products_slug
  ON public.content_products (slug);

ALTER TABLE public.content_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_products FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.content_products;
CREATE POLICY "service_role full access"
  ON public.content_products
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- TODO: human review of policy semantics — add purchase-access policies
-- when content_purchases table and product-access logic is implemented.
DROP POLICY IF EXISTS "anon can view active" ON public.content_products;
CREATE POLICY "anon can view active"
  ON public.content_products
  FOR SELECT TO anon
  USING (active = true);

COMMIT;
