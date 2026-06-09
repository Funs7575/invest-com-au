-- ============================================================================
-- Migration: Drop "anon select enquiries" policy from listing_enquiries
-- Date: 2026-05-01
-- Audit ref: docs/audits/REMEDIATION_QUEUE.md B-09b
-- Companion: app/api/listings/my-listings/route.ts (B-09a — refactored to
--            use createAdminClient() behind an OTP-gated signed cookie)
--
-- History (B-04 → B-06 → B-09):
--   - 20260601_rls_investment_listings.sql (B-04, option 2): preserved anon
--     SELECT/INSERT to keep the public marketplace working while RLS was
--     enabled. Tightened later by B-08 (20260602_investment_listings_tighten_rls.sql).
--   - 20260601_rls_listing_enquiries.sql (B-06, first table): enabled RLS on
--     listing_enquiries with an explicit `anon select enquiries` policy
--     (USING true) to preserve the /api/listings/my-listings flow that, at
--     the time, used the anon-key client to read enquiries by listing_id.
--     That migration's own header comment flagged the policy as a known PII
--     enumeration vector and pointed at B-09 as the cleanup item.
--   - This migration (B-09b) drops the policy now that B-09a has refactored
--     the route to use createAdminClient() behind an OTP-gated signed cookie.
--     After this migration, the anon DB role cannot SELECT any row from
--     listing_enquiries — the only path to enquiry PII is through the
--     route, which requires a verified `listing_owner_verified` cookie.
--
-- Why: closes the PII enumeration vector that B-06 explicitly preserved.
-- Anon callers (browser, public REST clients) can no longer read
-- `listing_enquiries.user_name / user_email / user_phone / message` by
-- guessing or scraping listing IDs. Service-role retains full access via
-- the existing "service_role full access" policy, so admin diagnostics
-- (app/api/listings/[id]/route.ts) and the refactored my-listings route
-- continue to work.
--
-- Other callers verified non-affected (grep on 2026-05-01):
--   - app/api/listings/enquire/route.ts — anon INSERT only (covered by the
--     untouched "anon insert enquiry" policy).
--   - app/api/listings/[id]/route.ts — service-role SELECT count.
--   - app/api/listings/my-listings/route.ts — service-role after B-09a.
--   - No anon UPDATE or DELETE caller exists.
--
-- Idempotent: DROP POLICY IF EXISTS is a no-op if the policy is already
-- gone. Safe to re-run.
--
-- Rollback (DO NOT run unless B-09a is also reverted — re-creating the
-- policy without the OTP gate would re-open the PII enumeration vector):
--   CREATE POLICY "anon select enquiries"
--     ON public.listing_enquiries
--     FOR SELECT
--     TO anon
--     USING (true);
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "anon select enquiries" ON public.listing_enquiries;

COMMIT;
