-- =============================================================================
-- Migration: D1 — fee_index_snapshots table (AU Brokerage Fee Index)
-- Date:       2026-05-21
-- Why:        The /api/cron/fee-index job computes a point-in-time "AU
--             Brokerage Fee Index" from the platform's own
--             broker_price_snapshots (average ASX per-trade fee, US-share
--             fee, and FX spread across active brokers) and persists each
--             computed period so the public /brokerage-fee-index page can
--             render the latest figures plus a QoQ/YoY trend without
--             recomputing the aggregate on every request.
--
--             This is a DERIVED telemetry table. The source of truth remains
--             broker_price_snapshots; rows here are regenerable by re-running
--             the cron. We store them (rather than compute-on-read) so the
--             trend line is a stable historical series even though
--             broker_price_snapshots is pruned to 90 days by the cleanup cron.
--
-- Idempotency: every statement is guarded with IF NOT EXISTS / DROP IF
--              EXISTS. ENABLE/FORCE ROW LEVEL SECURITY is idempotent in
--              PostgreSQL. The UNIQUE (period) constraint makes the cron's
--              upsert deterministic — re-running for the same period updates
--              the existing row instead of duplicating it.
--
-- Rollback:    BEGIN;
--                DROP TABLE IF EXISTS public.fee_index_snapshots;
--              COMMIT;
--              (Indexes + policies drop with the table. Index data is
--               regenerable by the cron on its next run.)
--
-- IMPORTANT — prior policy state: no prior CREATE TABLE, ENABLE RLS, or
-- CREATE POLICY found in any migration file for fee_index_snapshots. This
-- migration is the sole definition of this table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.fee_index_snapshots (
  id                  BIGSERIAL   PRIMARY KEY,
  -- Period this index value represents, as a calendar day (UTC) the cron
  -- ran. One published index value per day; the cron upserts on this key.
  period              DATE        NOT NULL,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Number of active brokers that contributed to each average. Stored so
  -- the page can disclose the sample size (and so a day with thin data is
  -- visibly thin rather than silently misleading).
  broker_count        INTEGER     NOT NULL DEFAULT 0,
  asx_fee_sample      INTEGER     NOT NULL DEFAULT 0,
  us_fee_sample       INTEGER     NOT NULL DEFAULT 0,
  fx_spread_sample    INTEGER     NOT NULL DEFAULT 0,
  -- The index values: simple mean across the latest snapshot per active
  -- broker. NULL when no broker in the sample had a parseable value.
  avg_asx_fee         NUMERIC,    -- dollars, e.g. 6.42
  avg_us_fee          NUMERIC,    -- dollars (or % where that's how the
                                  -- broker quotes it — see lib/fee-index.ts)
  avg_fx_spread       NUMERIC,    -- percent, e.g. 0.58
  -- Median as a robustness companion to the mean (outlier-resistant).
  median_asx_fee      NUMERIC,
  median_us_fee       NUMERIC,
  median_fx_spread    NUMERIC,
  -- Source attribution: always 'cron' in prod; 'manual'/'backfill' allowed
  -- for ad-hoc recomputation.
  source              TEXT        NOT NULL DEFAULT 'cron'
);

-- One published index value per calendar day. The cron upserts on this.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_index_snapshots_period
  ON public.fee_index_snapshots (period);

-- Trend query: "ORDER BY period DESC LIMIT N" for the latest + history.
CREATE INDEX IF NOT EXISTS idx_fee_index_snapshots_period
  ON public.fee_index_snapshots (period DESC);

COMMENT ON TABLE public.fee_index_snapshots IS
  'AU Brokerage Fee Index — daily aggregate (avg/median ASX fee, US-share '
  'fee, FX spread) computed from broker_price_snapshots by the '
  '/api/cron/fee-index job. Derived/regenerable. Written + read service-role '
  'only (the public page reads via lib/supabase/admin under ISR). One row '
  'per calendar day (UNIQUE period); cron upserts.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Derived telemetry. Written by the cron and read by the public page's ISR
-- render — both go through the service-role admin client. No anon/auth role
-- policy: the page does not query this table with a user JWT. Matches the
-- synthetic_check_runs / web_vitals_samples / feature_flags pattern in
-- CLAUDE.md (service_role-only tables).

ALTER TABLE public.fee_index_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_index_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access on fee_index_snapshots" ON public.fee_index_snapshots;
CREATE POLICY "service_role full access on fee_index_snapshots"
  ON public.fee_index_snapshots
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
