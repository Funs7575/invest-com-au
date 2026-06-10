-- ============================================================================
-- Migration: C-DISC-20260430-02 — advisor_sessions CREATE TABLE backfill
-- Date: 2026-04-30
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md C-DISC-20260430-02
--
-- Why:
--   The `advisor_sessions` table was created directly in the database
--   (outside migrations history). Only an index migration exists for this
--   table (20260309_security_and_performance_fixes.sql). Without a CREATE
--   TABLE migration, schema drift detection tools (Supabase MCP
--   `generate_typescript_types`, future CI schema-diff jobs) cannot verify
--   the live schema matches what code expects.
--
-- Verified callers (grep app/ lib/ for advisor_sessions):
--   All callers are in app/api/advisor-auth/** and use createAdminClient()
--   for session SELECT/INSERT/UPDATE/DELETE. No anon-key reads.
--   See 20260603_c02_advisor_auth_rls_hardening.sql for the RLS migration
--   that locks this table to service_role-only access.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS are
--   no-ops when the table/index already exist. Safe to re-apply.
--
-- Rollback (only needed if table was NOT pre-existing — otherwise no-op):
--   DROP TABLE IF EXISTS public.advisor_sessions;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_sessions (
  id             SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL
    REFERENCES public.professionals(id) ON DELETE CASCADE,
  session_token  TEXT NOT NULL UNIQUE,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup by session_token (used on every authenticated advisor request)
CREATE INDEX IF NOT EXISTS idx_advisor_sessions_token
  ON public.advisor_sessions (session_token);

-- Fast lookup by professional_id (used on cleanup/expiry jobs)
CREATE INDEX IF NOT EXISTS idx_advisor_sessions_professional
  ON public.advisor_sessions (professional_id);

-- NOTE: ENABLE ROW LEVEL SECURITY is handled by the companion migration
-- 20260603_c02_advisor_auth_rls_hardening.sql which also adds the
-- service_role-only access policy. Both migrations are idempotent.

COMMIT;
