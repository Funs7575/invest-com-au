-- ============================================================================
-- Migration: Backfill public.advisor_metrics_daily (A-02 batch 4 of ~8)
-- Date:      2026-05-01 (queued under 20260607 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_metrics_daily` exists in `lib/database.types.ts`. No prior schema
--   declaration found in tree. No direct `from("advisor_metrics_daily")` call found in
--   app/ or lib/ at migration time — this is a cron-populated metrics table
--   used for advisor performance analytics. This migration brings the schema
--   declaration in-tree.
--
-- Callers (client type):
--   - None found via `from("advisor_metrics_daily")` in app/ or lib/.
--     Table likely populated by a cron job or aggregation script using
--     service-role client.
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*advisor_metrics_daily|advisor_metrics_daily.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — cron write access and admin reporting.
--   - anon: no policy — internal metrics, deny-all-anon.
--   - TODO: human review — if an advisor self-service dashboard ever reads this
--     table directly, an advisor-scoped authenticated SELECT policy will be needed.
--
-- Idempotency
--   - IF NOT EXISTS guard on table + index creates — no-op if already applied.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.advisor_metrics_daily;
--     ALTER TABLE public.advisor_metrics_daily DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_metrics_daily; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_metrics_daily (
  id                  SERIAL PRIMARY KEY,
  professional_id     INTEGER     NOT NULL,
  date                DATE        NOT NULL,
  profile_views       INTEGER,
  article_views       INTEGER,
  enquiry_count       INTEGER,
  booking_clicks      INTEGER,
  phone_clicks        INTEGER,
  website_clicks      INTEGER,
  search_impressions  INTEGER,
  CONSTRAINT advisor_metrics_daily_professional_id_fkey
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE,
  CONSTRAINT advisor_metrics_daily_unique_day
    UNIQUE (professional_id, date)
);

CREATE INDEX IF NOT EXISTS idx_advisor_metrics_daily_professional_id
  ON public.advisor_metrics_daily (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_metrics_daily_date
  ON public.advisor_metrics_daily (date DESC);

ALTER TABLE public.advisor_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_metrics_daily FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_metrics_daily;
CREATE POLICY "service_role full access"
  ON public.advisor_metrics_daily
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
