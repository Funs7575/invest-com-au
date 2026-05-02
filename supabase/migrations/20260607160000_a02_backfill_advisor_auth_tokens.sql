-- ============================================================================
-- Migration: Backfill public.advisor_auth_tokens (A-02 batch 4 of ~8)
-- Date:      2026-05-01 (queued under 20260607 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_auth_tokens` exists in `lib/database.types.ts` and is used by the
--   advisor magic-link verification flow and cleanup cron. No prior schema
--   declaration found in tree. This migration brings it in-tree.
--
-- Callers (client type):
--   - app/api/admin/advisor-applications/route.ts: createAdminClient() (service-role)
--     — INSERTs new tokens on advisor application approval.
--   - app/api/cron/cleanup/route.ts: createAdminClient() (service-role)
--     — DELETEs expired tokens.
--   - app/api/advisor-auth/verify/route.ts: createClient() (server, anon key)
--     — SELECT by token value + UPDATE to mark used_at (magic-link endpoint;
--       no auth cookie available pre-verification).
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*advisor_auth_tokens|advisor_auth_tokens.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — admin approval + cleanup cron.
--   - anon SELECT: USING (used_at IS NULL AND expires_at > NOW()) — magic-link
--     verify endpoint reads by token value to authenticate the advisor. Only
--     expose unused, unexpired tokens; the app's WHERE clause further filters
--     to the specific token. Token entropy (randomBytes) is the primary auth.
--   - anon UPDATE: USING (used_at IS NULL) WITH CHECK (used_at IS NOT NULL) —
--     only allows marking an unused token as used. Prevents wider row mutation.
--   - TODO: human review — verify route refactor. Ideally the verify route
--     should use createAdminClient() for the UPDATE call (marking token used),
--     keeping the anon UPDATE policy narrower. Deferred to Stream C or E.
--
-- Idempotency
--   - IF NOT EXISTS guard on table + index creates — no-op if already applied.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"     ON public.advisor_auth_tokens;
--     DROP POLICY IF EXISTS "anon can read valid tokens"   ON public.advisor_auth_tokens;
--     DROP POLICY IF EXISTS "anon can mark token used"     ON public.advisor_auth_tokens;
--     ALTER TABLE public.advisor_auth_tokens DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_auth_tokens; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_auth_tokens (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER     NOT NULL,
  token           TEXT        NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT advisor_auth_tokens_professional_id_fkey
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_token
  ON public.advisor_auth_tokens (token);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_professional_id
  ON public.advisor_auth_tokens (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_expires_at
  ON public.advisor_auth_tokens (expires_at);

ALTER TABLE public.advisor_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_auth_tokens FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_auth_tokens;
CREATE POLICY "service_role full access"
  ON public.advisor_auth_tokens
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Magic-link verify endpoint (anon key, pre-auth): read valid unused tokens.
DROP POLICY IF EXISTS "anon can read valid tokens" ON public.advisor_auth_tokens;
CREATE POLICY "anon can read valid tokens"
  ON public.advisor_auth_tokens
  FOR SELECT TO anon
  USING (used_at IS NULL AND expires_at > NOW());

-- Magic-link verify endpoint: mark token as used (one-way transition only).
DROP POLICY IF EXISTS "anon can mark token used" ON public.advisor_auth_tokens;
CREATE POLICY "anon can mark token used"
  ON public.advisor_auth_tokens
  FOR UPDATE TO anon
  USING     (used_at IS NULL)
  WITH CHECK (used_at IS NOT NULL);

COMMIT;
