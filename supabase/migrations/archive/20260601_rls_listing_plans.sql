-- ============================================================================
-- Migration: Enable RLS on listing_plans
-- Date: 2026-04-27 (queued under 20260601_ to sort after existing RLS work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-06 (table `listing_plans`)
--
-- Why: listing_plans is a pricing reference table seeded in
-- 20260402_investment_listings.sql. Without RLS, any anon REST caller could
-- enumerate plan IDs and price_cents_monthly values — a competitor
-- intelligence / pricing-scrape vector. More critically, this opens a
-- direct POST/PATCH vector against the Supabase REST API: an attacker
-- could modify plan prices or feature flags without going through the
-- application layer (even though none of the app's routes do so today).
-- Enabling RLS and denying anon access closes both vectors and ensures
-- that the table is only reachable via the service-role client, which is
-- the only caller today.
--
-- IMPORTANT — prior policy state:
--   `grep -nE "(POLICY.*listing_plans|listing_plans.*POLICY|TABLE.*listing_plans.*ENABLE)"
--    supabase/migrations/*.sql` returned nothing. No prior RLS, no prior
--   policies. Free to write a fresh policy set.
--
-- Verified callers (`grep -rln "listing_plans" app/ lib/` on 2026-04-27):
--
--   service-role (lib/supabase/admin.ts) — bypasses RLS automatically:
--     - app/api/stripe/webhook/route.ts:711  SELECT plan_name + features (plan lookup on checkout.session.completed)
--     - app/api/listings/renew/route.ts:87   SELECT plan details for listing renewal
--     - app/api/listings/checkout/route.ts:61 SELECT plan details for checkout price validation
--
--   No anon-key or server-session callers exist. The public-facing listing
--   pages never read listing_plans directly; they display plan info only
--   after a user initiates checkout, at which point the checkout route
--   reads the plan via admin client.
--
-- Policy chosen:
--   deny-all for anon (default — no permissive policy granted).
--   service_role explicit allow for auditability (service-role bypasses
--   RLS regardless; the explicit policy makes intent visible in pg_policies).
--   No authenticated user policies needed — no auth.uid() linkage exists
--   and none is planned (listing_plans is a static pricing config table,
--   not a user-owned resource).
--
-- TODO: human review of policy semantics — this is intentionally deny-all
-- anon. If a future feature wants to show plan pricing on a public page,
-- the correct fix is to add a SELECT policy here (e.g., USING (active = true)),
-- NOT to revert to no-RLS.
--
-- Idempotent: ENABLE/FORCE RLS are no-ops if already enabled; policies use
-- DROP IF EXISTS + CREATE so reruns succeed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "service_role full access" ON listing_plans;
--   ALTER TABLE listing_plans NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE listing_plans DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

ALTER TABLE listing_plans ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table-owner connections.
ALTER TABLE listing_plans FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
DROP POLICY IF EXISTS "service_role full access" ON listing_plans;

-- Service-role explicit allow. Bypasses RLS by default; explicit policy
-- makes intent visible in pg_policies so a future audit sees "intentional
-- service-role only" rather than "zero policies = suspicious".
CREATE POLICY "service_role full access"
  ON listing_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anon or authenticated-user policy — deny by default.
-- All current callers use the admin client (service-role); no public read
-- of listing_plans is needed by the current app.

COMMIT;
