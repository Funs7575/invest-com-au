-- Date: 2026-04-27
-- Audit ref: 2026-04-26 audit §7 SEC-04 (K-04 follow-up)
-- Queue item: K-15
-- Why: K-04 removed 'unsafe-inline' from script-src in proxy.ts. Without a
--      CSP reporting endpoint, any violation in a legacy browser (Safari <15.4,
--      Chrome <52) is invisible until a user files a support ticket. This table
--      stores violation reports so we can confirm the policy works as intended,
--      detect false-positive breakage, and track trends after any future CSP
--      change. The companion endpoint is /api/csp-report.
-- Idempotency: CREATE TABLE IF NOT EXISTS + all index / policy statements use
--              IF NOT EXISTS or DROP IF EXISTS patterns — safe to re-apply.
-- Rollback: DROP TABLE IF EXISTS public.csp_violations;
--           (RLS + policies + indexes are dropped with the table automatically.)
--
-- IMPORTANT — prior policy state: no prior CREATE TABLE, ENABLE ROW LEVEL
-- SECURITY, or CREATE POLICY found in any migration file for csp_violations.
-- This migration is the sole definition of this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.csp_violations (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Fields from the browser-sent csp-report object (both report-uri and
  -- Reporting API v1 formats).
  document_uri        TEXT,
  referrer            TEXT,
  violated_directive  TEXT,
  effective_directive TEXT,
  original_policy     TEXT,
  blocked_uri         TEXT,
  status_code         INTEGER,
  source_file         TEXT,
  line_number         INTEGER,
  column_number       INTEGER,
  disposition         TEXT,   -- 'enforce' | 'report'
  user_agent          TEXT
);

COMMENT ON TABLE public.csp_violations IS
  'Content-Security-Policy violation reports received by /api/csp-report. '
  'Written via service-role only; no user-facing read path. '
  'Rows older than 90 days can be pruned (add to gdpr-retention-purge cron or a separate housekeeping job).';

-- Partial index for the most common analytic query: violations per directive,
-- newest first. Partial on recent rows (last 30 days) to stay small.
CREATE INDEX IF NOT EXISTS idx_csp_violations_directive_recent
  ON public.csp_violations (violated_directive, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- This table is internal security telemetry. No end-user or anon query path
-- should ever read it. Deny all by default; service_role bypasses RLS
-- automatically, but an explicit policy is added for auditability (pg_policies
-- shows intent clearly).
-- TODO: human review of policy semantics — if a future admin dashboard surfaces
-- violation trend data, add an authenticated SELECT policy scoped to admin
-- emails (consistent with the admin_audit_log pattern).

ENABLE ROW LEVEL SECURITY ON public.csp_violations;
ALTER TABLE public.csp_violations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on csp_violations" ON public.csp_violations;
CREATE POLICY "service_role full access on csp_violations"
  ON public.csp_violations
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
