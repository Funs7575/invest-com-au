-- Migration: 20260802010000_broker_health_score_history.sql
--
-- Creates broker_health_score_history — an append-only time-series table that
-- snapshots the five health-score dimensions whenever the cron
-- /api/cron/snapshot-health-scores fires. The data powers the trend sparkline
-- on the /health-scores/[slug] detail page.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP/CREATE POLICY pairs; IF NOT EXISTS indexes.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.broker_health_score_history;
--   (RLS policies, indexes, and the initial seed are dropped with the table.)

BEGIN;

CREATE TABLE IF NOT EXISTS public.broker_health_score_history (
  id                          bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_slug                 text         NOT NULL,
  overall_score               numeric      NOT NULL,
  regulatory_score            numeric,
  client_money_score          numeric,
  financial_stability_score   numeric,
  platform_reliability_score  numeric,
  insurance_score             numeric,
  captured_at                 timestamptz  NOT NULL DEFAULT now()
);

-- Public read (same access level as broker_health_scores — factual/informational data
-- displayed on the public detail page).
ALTER TABLE public.broker_health_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_health_score_history FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read health score history" ON public.broker_health_score_history;
CREATE POLICY "anon can read health score history"
  ON public.broker_health_score_history
  FOR SELECT TO anon, authenticated
  USING (true);

-- Writes are service_role only (cron uses admin client).
DROP POLICY IF EXISTS "service_role full access" ON public.broker_health_score_history;
CREATE POLICY "service_role full access"
  ON public.broker_health_score_history
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bhsh_slug_captured
  ON public.broker_health_score_history (broker_slug, captured_at DESC);

-- Seed an initial snapshot from current broker_health_scores so the sparkline
-- has at least one data point before the cron fires for the first time.
-- ON CONFLICT is not needed here because we are inserting into the history table
-- (append-only), not upsert.  The SELECT guard prevents duplicate seeds on
-- re-run (idempotent: only inserts if no rows exist yet for each slug).
INSERT INTO public.broker_health_score_history
  (broker_slug, overall_score, regulatory_score, client_money_score,
   financial_stability_score, platform_reliability_score, insurance_score,
   captured_at)
SELECT
  bhs.broker_slug,
  bhs.overall_score,
  bhs.regulatory_score,
  bhs.client_money_score,
  bhs.financial_stability_score,
  bhs.platform_reliability_score,
  bhs.insurance_score,
  COALESCE(bhs.updated_at, now())
FROM public.broker_health_scores bhs
WHERE NOT EXISTS (
  SELECT 1 FROM public.broker_health_score_history h
  WHERE h.broker_slug = bhs.broker_slug
);

COMMIT;
