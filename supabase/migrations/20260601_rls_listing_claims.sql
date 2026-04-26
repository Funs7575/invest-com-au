-- ============================================================================
-- Migration: Enable RLS on listing_claims
-- Date: 2026-04-26 (queued under 20260601_ to sort after existing RLS work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (P0 — RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md B-05
--
-- Why: listing_claims captures "I am the owner of this profile" requests
-- from broker/advisor/listing pages. Each row carries PII (full_name,
-- email, phone) plus the claimant's free-text message and the target
-- profile slug. The base migration (20260508_listing_claims.sql) created
-- the table without `ENABLE ROW LEVEL SECURITY`, leaving anon access open
-- via the Supabase REST endpoint — anyone could enumerate every claim
-- request (PII leak), forge an "approved" status to seize a profile, or
-- delete pending claims to suppress them.
--
-- Verified callers (`grep -rln "listing_claims" app/ lib/` on 2026-04-26):
--
--   service-role (lib/supabase/admin.ts) — bypasses RLS:
--     - app/api/claim-listing/route.ts             INSERT (anon-submitted claim)
--
-- The submit endpoint (`/api/claim-listing`) already uses the service-role
-- admin client — `createAdminClient()` at line 118 — so the admin route is
-- the intended path. The route validates input, rate-limits by IP, and
-- emails an admin notify (escapeHtml'd). No anon-key reader exists; the
-- planned admin UI (the route's comment references "/admin/listing-claims")
-- does not yet exist and would itself use the admin client.
--
-- IMPORTANT — prior policy state (discovered iter 8 verification gate):
-- `20260510_rls_hardening.sql` already enabled RLS on this table and
-- defined two policies:
--   - "Anon can submit claims"          (PERMISSIVE, INSERT, anon+authenticated, WITH CHECK email IS NOT NULL AND full_name IS NOT NULL) — i.e. the submit endpoint had a fallback anon-INSERT path through PostgREST as well as the admin client.
--   - "Service role full access listing_claims"  (PERMISSIVE, ALL, service_role)
-- Both are explicitly DROP IF EXISTS'd below before our new policies are
-- created, so the resulting state is unambiguous: deny anon + authenticated,
-- service-role explicit allow only. Removing the anon INSERT path narrows
-- the surface to exactly one caller (`/api/claim-listing`), which is the
-- intended audit posture.
--
-- Policy: deny anon + authenticated; service-role explicit allow for
-- auditability in pg_policies. This matches the B-02 (`leads`) pattern
-- exactly — submit-only-via-admin, no user-facing reads.
--
-- The queue's original note suggested "Owner = claimant" per Defaults §4,
-- but the table has no `auth.uid()` linkage (claimants identify by email
-- alone, no auth account required) so the standard owner policy does not
-- apply. Deny-all-anon + service-role-only is the correct fit.
--
-- Idempotent: ENABLE/FORCE RLS are no-ops if already enabled; policies use
-- DROP IF EXISTS + CREATE so reruns succeed.
--
-- Rollback (note: also restores the legacy 20260510 policies for full
-- pre-migration parity):
--   DROP POLICY IF EXISTS "service_role full access" ON listing_claims;
--   CREATE POLICY "Anon can submit claims" ON listing_claims FOR INSERT
--     TO anon, authenticated
--     WITH CHECK (email IS NOT NULL AND full_name IS NOT NULL);
--   CREATE POLICY "Service role full access listing_claims" ON listing_claims
--     FOR ALL TO service_role USING (true) WITH CHECK (true);
--   ALTER TABLE listing_claims NO FORCE ROW LEVEL SECURITY;
--   -- (do NOT DISABLE ROW LEVEL SECURITY — 20260510 originally enabled it)
-- ============================================================================

BEGIN;

ALTER TABLE listing_claims ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner connections, so admin-style misconfig
-- doesn't accidentally re-open the table.
ALTER TABLE listing_claims FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies (this migration is the source of truth).
-- Includes the legacy policies from 20260510_rls_hardening.sql which used
-- different naming and granted anon INSERT — explicitly dropping by exact
-- name is required because RLS policies stack additively.
DROP POLICY IF EXISTS "service_role full access"             ON listing_claims;
DROP POLICY IF EXISTS "anon insert claim"                    ON listing_claims;
DROP POLICY IF EXISTS "anon read own claim"                  ON listing_claims;
DROP POLICY IF EXISTS "authenticated read claims"            ON listing_claims;
DROP POLICY IF EXISTS "Anon can submit claims"               ON listing_claims;  -- legacy from 20260510_rls_hardening.sql
DROP POLICY IF EXISTS "Service role full access listing_claims" ON listing_claims;  -- legacy from 20260510_rls_hardening.sql

-- Service-role explicit allow. Service-role bypasses RLS regardless, but an
-- explicit policy makes intent visible in pg_policies for auditing.
CREATE POLICY "service_role full access"
  ON listing_claims
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No policy granted to anon or authenticated — RLS denies all access by
-- default when no permissive policy applies. The /api/claim-listing route
-- uses the service-role client, which is the only intended caller. A future
-- admin UI must also use the service-role client (likely server-rendered
-- under app/admin/listing-claims/) — anon-key admin pages are forbidden by
-- this policy.

-- TODO: human review of policy semantics — if a future authenticated user
-- account is given the ability to view their own submitted claims, add a
-- narrowly-scoped SELECT policy keyed on `auth.jwt() ->> 'email' = email`.
-- The table's `email` column is the only identity link today; a stronger
-- option is to add `claimant_user_id REFERENCES auth.users(id)` first.

COMMIT;
