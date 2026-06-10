-- investor_cohort_snapshots: weekly aggregated investor-intent cohort data.
--
-- Stores non-PII aggregate counts grouped by intent dimensions derived from
-- quiz completions and lead captures. Used by the cohort-report API endpoint
-- and internal analytics. No individual-level data is stored.
--
-- The pipeline that populates this table is /api/cron/intent-cohort-rollup
-- (weekly, Sunday 00:00 UTC).
--
-- Rollback: DROP TABLE IF EXISTS investor_cohort_snapshots;

CREATE TABLE IF NOT EXISTS investor_cohort_snapshots (
  id               bigserial   PRIMARY KEY,

  -- Week of the snapshot (ISO week start, Monday at midnight UTC)
  week_start       date        NOT NULL,

  -- Cohort dimensions (null = "all" / unspecified)
  inferred_vertical  text,        -- broker-seeker, etf-investor, crypto-curious, etc.
  experience_level   text,        -- beginner, intermediate, experienced
  investment_range   text,        -- 0-10k, 10k-50k, 50k-250k, 250k+

  -- Aggregate metrics
  quiz_completions   integer     NOT NULL DEFAULT 0,
  leads_captured     integer     NOT NULL DEFAULT 0,
  -- Percentage of quiz completions that converted to email capture (0-100)
  conversion_rate    numeric(5,2),

  -- Top UTM source for leads in this cohort/week (informational)
  top_utm_source     text,

  computed_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (week_start, inferred_vertical, experience_level, investment_range)
);

CREATE INDEX IF NOT EXISTS idx_cohort_snapshots_week
  ON investor_cohort_snapshots(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_cohort_snapshots_vertical
  ON investor_cohort_snapshots(inferred_vertical, week_start DESC)
  WHERE inferred_vertical IS NOT NULL;

ALTER TABLE investor_cohort_snapshots ENABLE ROW LEVEL SECURITY;

-- Service-role only — no direct client access; data surfaces via /api/v1/cohort-report
CREATE POLICY "cohort_snapshots_service_only"
  ON investor_cohort_snapshots
  USING (false);
