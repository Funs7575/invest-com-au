-- ============================================================================
-- Migration: A-02 batch 4 — backfill advisor_metrics_daily
-- Date: 2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §5.1 (schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Why:
--   advisor_metrics_daily stores per-day engagement metrics for each advisor
--   (profile views, enquiries, booking clicks, article views, etc.).
--   The table exists in lib/database.types.ts but has no CREATE TABLE migration
--   (schema drift). Without RLS, advisor analytics are visible to any caller
--   with the anon key — competitive intelligence exposure (e.g. an advisor
--   learning their peers' lead volume).
--
-- Verified callers:
--   No app callers today. Metrics are populated by admin/cron paths
--   (service_role) and read back by the advisor portal (future: advisor
--   self-scoped SELECT via Supabase Auth). The advisor-scoped SELECT policy
--   below provides the foundation for that path.
--
-- IMPORTANT — prior policy state on advisor_metrics_daily:
--   No prior CREATE TABLE or ENABLE RLS in any migration. This migration is the
--   first time RLS is enabled on this table.
--
-- TODO: human review of policy semantics — advisor_metrics_daily has no direct
--   auth.uid() column; ownership is inferred via the professionals.auth_user_id
--   join. Confirm no cross-advisor metrics exposure is possible (it cannot: a
--   given auth.uid() maps to exactly one professionals.id via auth_user_id).
--
-- Idempotent:
--   CREATE TABLE IF NOT EXISTS; ENABLE/FORCE RLS are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Advisor can view own metrics" ON advisor_metrics_daily;
--   DROP POLICY IF EXISTS "service_role full access metrics_daily" ON advisor_metrics_daily;
--   ALTER TABLE advisor_metrics_daily NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_metrics_daily DISABLE ROW LEVEL SECURITY;
--   DROP TABLE IF EXISTS public.advisor_metrics_daily;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_metrics_daily (
  id                  serial      PRIMARY KEY,
  professional_id     integer     NOT NULL
                                  REFERENCES public.professionals(id) ON DELETE CASCADE,
  date                date        NOT NULL DEFAULT CURRENT_DATE,
  article_views       integer,
  booking_clicks      integer,
  enquiry_count       integer,
  phone_clicks        integer,
  profile_views       integer,
  search_impressions  integer,
  website_clicks      integer,
  UNIQUE (professional_id, date)
);

CREATE INDEX IF NOT EXISTS idx_advisor_metrics_daily_professional_id
  ON public.advisor_metrics_daily (professional_id);
CREATE INDEX IF NOT EXISTS idx_advisor_metrics_daily_date
  ON public.advisor_metrics_daily (date);

ALTER TABLE public.advisor_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_metrics_daily FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow.
DROP POLICY IF EXISTS "service_role full access metrics_daily" ON advisor_metrics_daily;
CREATE POLICY "service_role full access metrics_daily"
  ON advisor_metrics_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Advisors can view their own metrics via Supabase Auth session.
-- professional_id links to professionals.auth_user_id.
-- No anon SELECT — competitor analytics are confidential.
DROP POLICY IF EXISTS "Advisor can view own metrics" ON advisor_metrics_daily;
CREATE POLICY "Advisor can view own metrics"
  ON advisor_metrics_daily
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;
