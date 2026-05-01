-- ============================================================================
-- Migration: C-02 step 1 — advisor auth RLS hardening
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (RLS gaps)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md C-02
--
-- Why:
--   1. `advisor_sessions` has no RLS — session tokens were accessible via
--      PostgREST to any anon caller. This migration locks the table to
--      service_role-only access (no auth.uid() linkage exists on the table,
--      so granular policies are not possible without schema changes).
--
--   2. `professionals` lacks a self-scoped UPDATE policy. The C-01 callgraph
--      audit found that /api/advisor-auth/profile/route.ts calls
--      supabase.from("professionals").update(...) using the anon/auth server
--      client (createClient()) without a matching RLS UPDATE policy — the
--      update silently fails with a PostgREST permission error and the route
--      returns HTTP 500 for all profile-update attempts. This migration adds
--      the missing policy so Supabase Auth users can update their own profile.
--
--   3. `professionals` also gets a self-scoped SELECT policy so Supabase Auth
--      advisors can read their own profile regardless of status (the existing
--      "Public can view active professionals" policy only covers status='active',
--      blocking pending advisors from viewing their own pending profile).
--
-- Verified callers of advisor_sessions (grep app/ lib/):
--   - app/api/advisor-auth/profile/route.ts    SELECT via createAdminClient()
--   - app/api/advisor-auth/notifications/route.ts  SELECT via createAdminClient()
--   - app/api/advisor-auth/disputes/route.ts   SELECT via createAdminClient()
--   - app/api/advisor-auth/topup/route.ts      SELECT via createAdminClient()
--   - app/api/advisor-auth/data/route.ts       SELECT via createAdminClient()
--   - app/api/advisor-auth/session/route.ts    INSERT/UPDATE/DELETE via createAdminClient()
--   - app/api/advisor-auth/request-review/route.ts  SELECT via createAdminClient()
--   All callers use admin client — RLS does not affect them. The risk was
--   direct PostgREST access with the anon key (now blocked by this migration).
--
-- Verified callers of professionals UPDATE (grep app/ lib/):
--   - app/api/advisor-auth/profile/route.ts    → fixed in companion code change
--   - app/api/advisor-auth/firm/*.ts            → use admin client (unchanged)
--   - app/api/admin/**                           → use admin client (unchanged)
--   - app/api/stripe/webhook/**                 → use admin client (unchanged)
--
-- Prior policy state on professionals (from 20260305_create_advisor_directory.sql):
--   "Public can view active professionals"  — SELECT, USING (status = 'active')
--   "Admins full access professionals"      — ALL, service_role
-- Both are kept; we add two new non-conflicting policies below.
--
-- Idempotent: ENABLE/FORCE RLS are no-ops if already set; DROP IF EXISTS +
-- CREATE is idempotent; existing index on advisor_sessions is unaffected.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Advisor can view own profile" ON professionals;
--   DROP POLICY IF EXISTS "Advisor can update own profile" ON professionals;
--   DROP POLICY IF EXISTS "service_role full access" ON advisor_sessions;
--   ALTER TABLE advisor_sessions NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_sessions DISABLE ROW LEVEL SECURITY;
-- ============================================================================

BEGIN;

-- ─── advisor_sessions: enable RLS (deny-all anon, service_role bypass) ──────

ALTER TABLE advisor_sessions ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table-owner connections.
ALTER TABLE advisor_sessions FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing stale policies before creating ours.
DROP POLICY IF EXISTS "service_role full access" ON advisor_sessions;

-- Service-role explicit allow. The admin client (service-role key) bypasses
-- RLS regardless, but an explicit policy makes intent visible in pg_policies.
-- No anon/authenticated policy → PostgREST denies all direct access.
CREATE POLICY "service_role full access"
  ON advisor_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── professionals: add self-scoped policies for Supabase Auth advisors ──────

-- Self SELECT: advisors can read their own row regardless of status (pending
-- advisors need to see their own profile; the existing "Public can view active"
-- policy only covers status='active'). Requires auth_user_id linkage (added
-- in migration 20260429_professionals_auth_user_id.sql).
DROP POLICY IF EXISTS "Advisor can view own profile" ON professionals;
CREATE POLICY "Advisor can view own profile"
  ON professionals
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Self UPDATE: advisors can update their own profile row. Combined with the
-- application-layer allowlist of fields in profile/route.ts, this prevents
-- advisors from elevating status, adjusting verified, or touching other
-- advisors' rows. RLS implicitly adds `WHERE auth_user_id = auth.uid()` to
-- every UPDATE — even if the caller passes a different .eq("id", ...) filter.
DROP POLICY IF EXISTS "Advisor can update own profile" ON professionals;
CREATE POLICY "Advisor can update own profile"
  ON professionals
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- TODO: human review — cookie-session advisors (advisor_session cookie, no
-- Supabase Auth) remain dependent on admin client for all DML on professionals
-- because auth.uid() is NULL for their requests. The long-term fix is to
-- migrate all advisors to Supabase Auth and deprecate advisor_sessions.

COMMIT;
