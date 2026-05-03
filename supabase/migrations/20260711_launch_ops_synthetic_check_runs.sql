-- =============================================================================
-- Migration: launch-ops synthetic_check_runs table
-- Date:       2026-07-11
-- Plan ref:   docs/ops/launch-ops-plan.md §5 PR 14 (Phase D)
-- Why:        The synthetic-checks cron (PR 15) probes critical user flows
--             every 5 minutes (homepage, sitemap, robots, quiz POST, advisor
--             enquiry, listing enquiry, /api/health, Stripe webhook freshness,
--             email send freshness). This table stores each probe result so
--             the launch dashboard (PR 17) can show "open synthetic-check
--             failures" and the cron can detect 2-consecutive failures for
--             alerting.
-- Idempotency: every statement is safe to re-apply — guarded with
--              IF-NOT-EXISTS / DROP-IF-EXISTS, ALTER TABLE ENABLE ROW LEVEL
--              SECURITY is idempotent in PostgreSQL.
-- Rollback:   BEGIN;
--               DROP TABLE IF EXISTS public.synthetic_check_runs;
--             COMMIT;
--             (Indexes + policies are dropped with the table.)
--
-- IMPORTANT — prior policy state: no prior CREATE TABLE, ENABLE RLS, or
-- CREATE POLICY found in any migration file for synthetic_check_runs. This
-- migration is the sole definition of this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.synthetic_check_runs (
  id          BIGSERIAL   PRIMARY KEY,
  flow        TEXT        NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms  INTEGER,
  ok          BOOLEAN     NOT NULL,
  error       TEXT
);

COMMENT ON TABLE public.synthetic_check_runs IS
  'Synthetic-check probe results from the /api/cron/synthetic-checks job. '
  'One row per (flow, run). Written via service-role only; read by the '
  'launch admin dashboard (also service-role). '
  'Retention: rows older than 30 days can be pruned (housekeeping cron).';

-- Latest result per flow (the dashboard query): "WHERE flow = X ORDER BY started_at DESC LIMIT 1"
CREATE INDEX IF NOT EXISTS idx_synthetic_check_runs_flow_started
  ON public.synthetic_check_runs (flow, started_at DESC);

-- Recent failures across all flows (the alerting query): "WHERE ok = false AND started_at > now() - interval '15 min'"
CREATE INDEX IF NOT EXISTS idx_synthetic_check_runs_failures
  ON public.synthetic_check_runs (started_at DESC)
  WHERE ok = false;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Telemetry written by cron, read by the admin dashboard. Service-role on
-- both ends. Matches the feature_flags / web_vitals_samples pattern from
-- CLAUDE.md.

ALTER TABLE public.synthetic_check_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synthetic_check_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on synthetic_check_runs" ON public.synthetic_check_runs;
CREATE POLICY "service_role full access on synthetic_check_runs"
  ON public.synthetic_check_runs
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
