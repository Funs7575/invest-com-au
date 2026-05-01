-- ============================================================================
-- Migration: A-02 batch 4 — backfill advisor_auth_tokens
-- Date: 2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §5.1 (schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Why:
--   advisor_auth_tokens stores one-time login links emailed to advisors.
--   The table exists in lib/database.types.ts but has no backing schema migration
--   (drift). Without a migration, the table was created ad-hoc and has
--   no RLS — any caller with the anon key can enumerate all auth tokens via
--   PostgREST, defeating the security model of the OTP flow.
--
-- Verified callers:
--   app/api/admin/advisor-applications/route.ts  INSERT via createAdminClient()
--   app/api/cron/cleanup/route.ts                SELECT+DELETE via createAdminClient()
--   app/api/advisor-auth/verify/route.ts         SELECT+UPDATE via createClient()
--     → This route uses the anon role (no Supabase Auth JWT in the advisor portal).
--       Anon SELECT + column-scoped UPDATE (used_at) are required for it to work.
--       The token is 64 hex chars (randomBytes(32)) — brute-force is infeasible
--       (2^128 entropy). Single-use + expires_at bounds exposure window.
--
-- TODO: human review of policy semantics — the verify route uses createClient()
--   (anon key). If it is ever refactored to use createAdminClient(), the anon
--   SELECT + UPDATE policies below can be removed, tightening security further.
--
-- IMPORTANT — prior policy state on advisor_auth_tokens:
--   Table not present in any prior migration; no prior RLS. This is the
--   first time RLS is enabled on this table.
--
-- Idempotent:
--   IF NOT EXISTS on table + indexes; ENABLE/FORCE RLS are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Anon mark token used" ON advisor_auth_tokens;
--   DROP POLICY IF EXISTS "Anon read auth token by value" ON advisor_auth_tokens;
--   DROP POLICY IF EXISTS "service_role full access auth_tokens" ON advisor_auth_tokens;
--   GRANT UPDATE ON public.advisor_auth_tokens TO anon;
--   ALTER TABLE advisor_auth_tokens NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_auth_tokens DISABLE ROW LEVEL SECURITY;
--   DROP TABLE IF EXISTS public.advisor_auth_tokens;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_auth_tokens (
  id             serial          PRIMARY KEY,
  professional_id integer        NOT NULL
                                 REFERENCES public.professionals(id) ON DELETE CASCADE,
  token          text            NOT NULL UNIQUE,
  expires_at     timestamptz     NOT NULL,
  used_at        timestamptz,
  created_at     timestamptz     DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_token
  ON public.advisor_auth_tokens (token);
CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_professional_id
  ON public.advisor_auth_tokens (professional_id);

ALTER TABLE public.advisor_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_auth_tokens FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow (auditability — intent visible in pg_policies).
DROP POLICY IF EXISTS "service_role full access auth_tokens" ON advisor_auth_tokens;
CREATE POLICY "service_role full access auth_tokens"
  ON advisor_auth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon can read tokens by value (for the verify route's token lookup).
-- Token is 64 hex chars — brute-force infeasible at 2^128 entropy.
DROP POLICY IF EXISTS "Anon read auth token by value" ON advisor_auth_tokens;
CREATE POLICY "Anon read auth token by value"
  ON advisor_auth_tokens
  FOR SELECT
  TO anon
  USING (true);

-- Anon can mark a token as used (column-scoped to used_at only via GRANT below).
DROP POLICY IF EXISTS "Anon mark token used" ON advisor_auth_tokens;
CREATE POLICY "Anon mark token used"
  ON advisor_auth_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Restrict anon UPDATE to the used_at column only (prevents anon from
-- modifying token value, expires_at, or professional linkage).
REVOKE UPDATE ON public.advisor_auth_tokens FROM anon;
GRANT UPDATE (used_at) ON public.advisor_auth_tokens TO anon;

COMMIT;
