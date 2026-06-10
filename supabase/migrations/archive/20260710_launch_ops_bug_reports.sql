-- =============================================================================
-- Migration: launch-ops bug_reports table
-- Date:       2026-07-10
-- Plan ref:   docs/ops/launch-ops-plan.md §5 PR 4 (Phase B)
-- Severity:   docs/ops/severity-matrix.md
-- Why:        The launch-ops plan introduces a sitewide "Report a problem"
--             button (PR 6) that POSTs to /api/bug-report (PR 5). This table
--             is the single sink for those submissions. It is internal-only —
--             the founder triages via /admin/bug-reports (PR 7) and replies
--             using the canned templates in docs/ops/launch-canned-responses.md.
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before every
--              CREATE POLICY; ALTER TABLE ... ENABLE ROW LEVEL SECURITY is
--              idempotent in PostgreSQL; index uses IF NOT EXISTS; CHECK
--              constraint added via DO block to be re-runnable.
-- Rollback:   BEGIN;
--               DROP TABLE IF EXISTS public.bug_reports;
--             COMMIT;
--             (Indexes + policies + the bug_report_status enum are dropped
--             with the table.)
--
-- IMPORTANT — prior policy state: no prior CREATE TABLE, ENABLE RLS, or
-- CREATE POLICY found in any migration file for bug_reports. This migration
-- is the sole definition of this table.

BEGIN;

-- ── enum for status ──────────────────────────────────────────────────────────
-- Wrapped in DO block because CREATE TYPE has no IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bug_report_status') THEN
    CREATE TYPE public.bug_report_status AS ENUM ('new', 'triaged', 'fixed', 'wont_fix');
  END IF;
END
$$;

-- ── table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Where it happened
  page_url        TEXT        NOT NULL,
  route           TEXT,
  -- What the user said + how to reach them (email optional per plan §1 decision #1)
  user_message    TEXT        NOT NULL,
  email           TEXT,
  -- Browser + device telemetry, captured client-side at submit time
  user_agent      TEXT,
  viewport        TEXT,
  -- Optional link to the authenticated user (RLS-bypass insert means we trust
  -- the client value; the API route should pass auth.uid() if it has a session)
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Triage state
  severity_guess  TEXT,
  status          public.bug_report_status NOT NULL DEFAULT 'new',
  triaged_by      TEXT,
  triaged_at      TIMESTAMPTZ
);

-- Defensive caps so a runaway client can't fill the table with megabytes per row.
-- Wrapped in DO so re-applying the migration doesn't fail on duplicate constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_user_message_max_len'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_user_message_max_len
      CHECK (char_length(user_message) <= 4000);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_page_url_max_len'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_page_url_max_len
      CHECK (char_length(page_url) <= 2048);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bug_reports_email_max_len'
  ) THEN
    ALTER TABLE public.bug_reports
      ADD CONSTRAINT bug_reports_email_max_len
      CHECK (email IS NULL OR char_length(email) <= 320);
  END IF;
END
$$;

COMMENT ON TABLE public.bug_reports IS
  'User-submitted bug reports from the sitewide "Report a problem" button. '
  'Written via service-role only (POST /api/bug-report). Read via the admin '
  'triage page at /admin/bug-reports — admin uses the service-role client, '
  'so RLS does not need an authenticated SELECT policy. '
  'Retention: rows older than 180 days can be pruned (gdpr-retention-purge).';

-- ── indexes ──────────────────────────────────────────────────────────────────
-- Triage queue lookup: newest 'new' rows first.
CREATE INDEX IF NOT EXISTS idx_bug_reports_status_created
  ON public.bug_reports (status, created_at DESC);

-- Optional join when looking at a specific user's submissions.
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id
  ON public.bug_reports (user_id)
  WHERE user_id IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- This is internal triage data containing free-text user input that may
-- include PII (the email field, plus anything the user typed). No anon or
-- authenticated user should ever read it. Service-role bypasses RLS, so the
-- API route (lib/supabase/admin.ts) and the admin page work without an
-- explicit authenticated policy.
--
-- Per CLAUDE.md ("tables with service_role-only policies (e.g., feature_flags,
-- web_vitals_samples)"), this is a legitimate use of the service-role pattern.

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on bug_reports" ON public.bug_reports;
CREATE POLICY "service_role full access on bug_reports"
  ON public.bug_reports
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
