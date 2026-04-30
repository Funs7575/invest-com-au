-- ============================================================================
-- Migration: Tighten investment_listings anon policy to SELECT-only
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-08 (option 4 follow-up to B-04)
--
-- Why: The B-04 migration (20260601_rls_investment_listings.sql) preserved
-- the existing public-write behaviour as option 2 (short-term fix), encoding
-- the app-layer constraints as RLS policy: anon could INSERT with status='pending'
-- and UPDATE the views/enquiries counters only. This is the option 4 tightening:
-- /api/listings/submit now uses the admin client for the INSERT, and
-- /api/listings/enquire uses the admin client for the enquiries counter UPDATE.
-- With both routes refactored, the anon INSERT and UPDATE policies are no longer
-- needed and represent unnecessary write surface on the marketplace catalogue.
--
-- What changes:
--   - DROP "anon insert pending"   — submit route now uses service-role.
--   - DROP "anon update counters"  — enquire counter now uses service-role.
--   - REVOKE column-level UPDATE (views, enquiries) grant from anon — the grant
--     was added by B-04 to allow the narrow counter UPDATE; no longer needed.
--   - "anon select catalogue" and "service_role full access" are unchanged.
--
-- Verified callers that wrote via anon (now use service-role via admin client):
--   - app/api/listings/submit/route.ts   INSERT  → createAdminClient() (this PR)
--   - app/api/listings/enquire/route.ts  RPC/UPDATE counter → createAdminClient() (this PR)
--
-- Read-only anon callers that remain unaffected:
--   - app/api/listings/route.ts                   SELECT (catalogue list)
--   - app/api/listings/my-listings/route.ts       SELECT (by contact_email) — B-09 will
--                                                  refactor this separately.
--   - app/page.tsx, app/sitemap.ts, catalogue pages SELECT
--   - lib/investment-listings-query.ts            SELECT
--
-- IMPORTANT — prior policy state:
--   20260601_rls_investment_listings.sql created both policies being dropped here.
--   No other migration creates policies on investment_listings. The "anon select
--   catalogue" and "service_role full access" policies from that migration are
--   preserved as-is by this migration.
--
-- Idempotent: DROP POLICY IF EXISTS is no-op when policy does not exist;
-- REVOKE is no-op when privilege is already absent.
--
-- Rollback:
--   GRANT UPDATE (views, enquiries) ON investment_listings TO anon;
--   CREATE POLICY "anon update counters"
--     ON investment_listings FOR UPDATE TO anon USING (true) WITH CHECK (true);
--   CREATE POLICY "anon insert pending"
--     ON investment_listings FOR INSERT TO anon
--     WITH CHECK (
--       status = 'pending'
--       AND COALESCE(views, 0) = 0
--       AND COALESCE(enquiries, 0) = 0
--       AND listed_by_professional_id IS NULL
--     );
--   -- (and revert app/api/listings/submit/route.ts + enquire/route.ts to createClient)
-- ============================================================================

BEGIN;

-- Drop the anon write policies added by B-04 — no longer needed since both
-- write paths now use the admin client.
DROP POLICY IF EXISTS "anon insert pending"   ON investment_listings;
DROP POLICY IF EXISTS "anon update counters"  ON investment_listings;

-- Revoke the column-level UPDATE grant that B-04 issued to support the counter
-- fallback. Without the UPDATE policy above, this grant is inert, but removing
-- it keeps pg_catalog and the anon privilege set clean.
REVOKE UPDATE ON investment_listings FROM anon;

-- TODO: human review of policy semantics — anon SELECT remains unrestricted
-- (the catalogue is intentionally public). B-09 will address the my-listings
-- SELECT path which currently trusts a user-supplied email param.

COMMIT;
