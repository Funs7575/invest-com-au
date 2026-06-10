-- ============================================================================
-- Migration: Enable RLS on listing_enquiries
-- Date: 2026-04-26 (queued under 20260601_ to sort after existing RLS work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-06 (first table — `listing_enquiries`)
--
-- Why: listing_enquiries captures investor enquiries against marketplace
-- listings — every row carries PII (`user_email`, `user_name`, `user_phone`,
-- `message`, plus `investor_country` and `investor_type`). The base
-- migration (20260402_investment_listings.sql) created the table without
-- `ENABLE ROW LEVEL SECURITY`, leaving anon access open via the Supabase
-- REST endpoint — anon could enumerate every enquiry's PII directly,
-- bypassing the application layer entirely.
--
-- Prior policy state (per the iter-8 verification gate):
--   `grep -nE "(POLICY.*listing_enquiries|listing_enquiries.*POLICY|TABLE.*listing_enquiries.*ENABLE)"
--    supabase/migrations/*.sql` returns nothing. No prior RLS, no prior
--   policies. Free to write a fresh policy.
--
-- Verified callers (`grep -rln "listing_enquiries" app/ lib/` on 2026-04-26):
--
--   anon-key (lib/supabase/server.ts) callers:
--     - app/api/listings/enquire/route.ts:111      INSERT (visitor submits enquiry; status='new')
--     - app/api/listings/my-listings/route.ts:47   SELECT (reads enquiries WHERE listing_id IN (...))
--
--   service-role (lib/supabase/admin.ts) — bypasses RLS automatically:
--     - app/api/listings/[id]/route.ts:75          SELECT count (admin diagnostic)
--
-- No anon UPDATE or DELETE caller exists; both are denied by default (no
-- permissive policy granted).
--
-- Policy chosen (queue item B-06 / table `listing_enquiries`, applying the
-- B-04 option-2 pattern — preserve current behaviour, encode it):
--
--   1. SELECT for anon:    allowed on all rows. The /api/listings/my-listings
--                          route currently relies on this — it queries the
--                          enquiries table by `listing_id IN (ids)` where the
--                          listing IDs come from a prior query filtered by
--                          `contact_email` (the requesting visitor's claimed
--                          email, taken at face value). Tightening RLS here
--                          would break that flow without a route-layer
--                          refactor.
--                          **Known PII enumeration vector at the application
--                          layer**: anyone can request my-listings with any
--                          email. RLS at the database level cannot scope this
--                          (no `auth.uid()` linkage on listings or enquiries).
--                          Tracked as queue item B-09 — refactor my-listings
--                          to admin client + email verification, then tighten
--                          this policy to deny anon SELECT.
--   2. INSERT for anon:    allowed only when `status='new'` and the required
--                          PII fields are present. Defence-in-depth mirror of
--                          the `/api/listings/enquire/route.ts` validation,
--                          blocking direct REST callers from skipping the
--                          rate-limit / app-layer checks by inserting
--                          status='converted' or similar.
--   3. UPDATE for anon:    no policy → denied by default. No anon caller does
--                          UPDATE; admin "status" updates go through the
--                          service-role client.
--   4. DELETE for anon:    no policy → denied by default.
--   5. service_role:       explicit ALL policy for auditability in
--                          pg_policies (service-role bypasses RLS regardless).
--
-- This is queue item B-06's first table. Same shape as B-04 (option 2):
-- preserve current public-write behaviour, encode it in the policy with
-- defence-in-depth WITH CHECK guards. The follow-up cleanup is tracked as
-- B-09 (route refactor + tighter policy).
--
-- Idempotent: ENABLE/FORCE RLS are no-ops if already enabled; policies use
-- DROP IF EXISTS + CREATE so reruns succeed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "anon insert enquiry"      ON listing_enquiries;
--   DROP POLICY IF EXISTS "anon select enquiries"    ON listing_enquiries;
--   DROP POLICY IF EXISTS "service_role full access" ON listing_enquiries;
--   ALTER TABLE listing_enquiries NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE listing_enquiries DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE listing_enquiries ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner connections, so admin-style misconfig
-- doesn't accidentally re-open the table.
ALTER TABLE listing_enquiries FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
DROP POLICY IF EXISTS "service_role full access" ON listing_enquiries;
DROP POLICY IF EXISTS "anon select enquiries"    ON listing_enquiries;
DROP POLICY IF EXISTS "anon insert enquiry"      ON listing_enquiries;

-- Service-role explicit allow. Service-role bypasses RLS regardless, but an
-- explicit policy makes intent visible in pg_policies for auditing.
CREATE POLICY "service_role full access"
  ON listing_enquiries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon SELECT: preserves the /api/listings/my-listings flow (which queries
-- by listing_id and trusts the user-supplied contact_email at the app
-- layer). KNOWN PII enumeration vector — see B-09 follow-up. RLS here
-- cannot scope by ownership without an `auth.uid()` linkage that does not
-- exist today.
CREATE POLICY "anon select enquiries"
  ON listing_enquiries
  FOR SELECT
  TO anon
  USING (true);

-- Anon INSERT: allowed only when the row matches what the public enquiry
-- submission flow produces. Mirrors /api/listings/enquire/route.ts so a
-- direct PostgREST caller cannot bypass admin review by inserting
-- status='converted' (or similar) and cannot insert without core PII
-- linkage / contact details.
CREATE POLICY "anon insert enquiry"
  ON listing_enquiries
  FOR INSERT
  TO anon
  WITH CHECK (
    status = 'new'
    AND listing_id IS NOT NULL
    AND user_email IS NOT NULL
    AND user_name IS NOT NULL
  );

-- No UPDATE or DELETE policy granted to anon — both are denied by default.
-- Today's only UPDATE caller is admin (service-role bypasses RLS); there
-- is no DELETE caller anywhere.

-- TODO: human review of policy semantics — option 2 was chosen to preserve
-- the current /api/listings/my-listings behaviour. The known PII enumeration
-- vector (anon can read any listing's enquiries by guessing/scraping
-- listing IDs) is tracked as queue item B-09: refactor my-listings to use
-- the admin client + email-verification challenge, then tighten this
-- policy's SELECT clause to deny anon entirely.

COMMIT;
