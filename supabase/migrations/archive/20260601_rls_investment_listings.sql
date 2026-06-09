-- ============================================================================
-- Migration: Enable RLS on investment_listings
-- Date: 2026-04-26 (queued under 20260601_ to sort after existing RLS work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-04 (option 2 — preserve
--             current public-write behaviour, encode it in the policy)
--
-- Why: investment_listings is the marketplace catalogue. The base migration
-- (20260402_investment_listings.sql) created the table without enabling RLS,
-- so by default Postgres permits anon access via the Supabase REST endpoint.
-- That is fine for SELECT (the catalogue is intentionally public) but means
-- anon also has implicit unconstrained INSERT/UPDATE/DELETE access — anyone
-- could mass-insert spam listings, edit competitor listings, or delete
-- arbitrary rows directly via the REST endpoint, bypassing the application
-- layer entirely.
--
-- Verified callers (grep -rln "investment_listings" app/ lib/ on 2026-04-26):
--
--   anon-key (lib/supabase/server.ts) callers:
--     - app/api/listings/submit/route.ts            INSERT (status='pending', counters=0)
--     - app/api/listings/route.ts                   SELECT (catalogue list)
--     - app/api/listings/enquire/route.ts           SELECT (verify listing) + UPDATE (enquiries fallback)
--     - app/api/listings/my-listings/route.ts       SELECT (by contact_email)
--     - app/page.tsx                                SELECT (homepage feature)
--     - app/sitemap.ts                              SELECT (sitemap.xml)
--     - app/invest/page.tsx, /listings/page.tsx,
--       /[slug]/listings/[subcategory]/page.tsx     SELECT (catalogue pages)
--     - lib/investment-listings-query.ts            SELECT (shared query helper)
--
--   service-role (lib/supabase/admin.ts) callers — bypass RLS automatically:
--     - app/api/listings/[id]/route.ts              SELECT/UPDATE/DELETE (admin edit)
--     - app/api/listings/checkout/route.ts          UPDATE (post-checkout)
--     - app/api/listings/renew/route.ts             UPDATE (renew expiry)
--     - app/api/admin/automation/{bulk,override}    UPDATE (admin automation)
--     - app/api/cron/automation-verdict-rollup      UPDATE (verdict rollup)
--     - app/api/stripe/webhook/route.ts             UPDATE (payment succeed)
--     - app/admin/pre-launch/page.tsx,
--       app/admin/automation/listings/page.tsx,
--       lib/admin/automation-metrics.ts             SELECT (admin diagnostics)
--
-- Policy chosen (queue item B-04 option 2 — short-term, preserves behaviour):
--
--   1. SELECT for anon:    allowed on all rows. The catalogue is public, and
--                          /api/listings/my-listings reads pending rows by
--                          contact_email server-side, so a status='active'
--                          filter would regress that page.
--   2. INSERT for anon:    allowed only when status='pending', counters are
--                          zero, and listed_by_professional_id IS NULL.
--                          Defence-in-depth: enforces what the submit route
--                          already does at the app layer, blocking direct
--                          REST callers from bypassing admin review by
--                          inserting status='active' rows or fraudulently
--                          claiming a professional linkage.
--   3. UPDATE for anon:    allowed at row level (USING/CHECK true), but
--                          column-scoped via GRANT to (views, enquiries)
--                          only. Only counter increments are permitted; no
--                          editing of titles, prices, status, contact info
--                          etc. Today the only counter increment is
--                          /api/listings/enquire's fallback path; future
--                          view-counter logic also fits.
--   4. DELETE for anon:    no policy → denied by default.
--   5. service_role:       explicit "ALL" policy for auditability in
--                          pg_policies (service-role bypasses RLS regardless).
--
-- This is a short-term preserve-current-behaviour fix. The long-term
-- direction (queue item B-04 option 4) is to refactor /api/listings/submit
-- and the enquire counter path to the admin client and tighten the policy
-- to SELECT-only for anon.
--
-- Idempotent: ENABLE/FORCE RLS are no-ops if already enabled; policies use
-- DROP IF EXISTS + CREATE so reruns succeed; REVOKE/GRANT statements are
-- no-ops when the privilege state already matches.
--
-- Rollback:
--   GRANT UPDATE ON investment_listings TO anon;
--   DROP POLICY IF EXISTS "anon update counters"     ON investment_listings;
--   DROP POLICY IF EXISTS "anon insert pending"      ON investment_listings;
--   DROP POLICY IF EXISTS "anon select catalogue"    ON investment_listings;
--   DROP POLICY IF EXISTS "service_role full access" ON investment_listings;
--   ALTER TABLE investment_listings NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE investment_listings DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE investment_listings ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner connections, so admin-style misconfig
-- doesn't accidentally re-open the table.
ALTER TABLE investment_listings FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
DROP POLICY IF EXISTS "service_role full access" ON investment_listings;
DROP POLICY IF EXISTS "anon select catalogue"    ON investment_listings;
DROP POLICY IF EXISTS "anon insert pending"      ON investment_listings;
DROP POLICY IF EXISTS "anon update counters"     ON investment_listings;

-- Service-role explicit allow. Service-role bypasses RLS regardless, but an
-- explicit policy makes intent visible in pg_policies for auditing.
CREATE POLICY "service_role full access"
  ON investment_listings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public catalogue read. SELECT is intentionally unconstrained — the
-- marketplace listings are public, and /api/listings/my-listings filters
-- by contact_email at the application layer so it must see pending rows.
CREATE POLICY "anon select catalogue"
  ON investment_listings
  FOR SELECT
  TO anon
  USING (true);

-- Public submit (pending only). Mirrors the validation in
-- /api/listings/submit/route.ts so a direct REST caller cannot bypass
-- admin review by inserting status='active', cannot seed counters, and
-- cannot fraudulently associate the row with an existing professional.
CREATE POLICY "anon insert pending"
  ON investment_listings
  FOR INSERT
  TO anon
  WITH CHECK (
    status = 'pending'
    AND COALESCE(views, 0) = 0
    AND COALESCE(enquiries, 0) = 0
    AND listed_by_professional_id IS NULL
  );

-- Counter-only UPDATE. Row scope is unconstrained because counter increments
-- are not user-owned (any visitor's enquiry increments the listing's count).
-- Column scope is enforced below by GRANT (views, enquiries) only.
CREATE POLICY "anon update counters"
  ON investment_listings
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Column-level GRANT scoping: anon may UPDATE only the counter columns.
-- Without this REVOKE, the policy above would let anon edit any column
-- (price, status, contact_email, etc.). Supabase's default GRANTs to anon
-- include table-wide UPDATE; we narrow that here.
REVOKE UPDATE ON investment_listings FROM anon;
GRANT UPDATE (views, enquiries) ON investment_listings TO anon;

-- TODO: human review of policy semantics — this is option 2 from queue
-- item B-04 (preserve current public-write behaviour). The cleaner
-- long-term path (option 4) is to refactor /api/listings/submit and the
-- enquire counter fallback to the admin client and drop the anon
-- INSERT + UPDATE policies, leaving only SELECT for anon.

COMMIT;
