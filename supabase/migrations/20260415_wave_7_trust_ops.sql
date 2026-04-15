-- Wave 7 schema — trust + ops maturity foundations.
--
-- Tables introduced:
--   1. feature_flags           — percentage + segment rollout beyond
--                                on/off kill switches
--   2. slo_definitions         — per-service SLO targets + thresholds
--   3. slo_incidents           — automatic incident creation when a
--                                threshold is breached
--   4. retention_rules         — GDPR / Privacy Act data retention
--                                policy per table/column
--
-- Every table RLS-enabled and service-role only.

-- ── 1. feature_flags ───────────────────────────────────────────────
-- Richer than automation_kill_switches: supports a percentage
-- rollout, a list of user segments (e.g. "advisor", "broker",
-- "admin"), and a list of explicit allowlist/denylist keys (email,
-- id, etc). Evaluated in order:
--
--   1. denylist — if the caller's key is in denylist → false
--   2. allowlist — if the caller's key is in allowlist → true
--   3. segment match → enabled for that segment
--   4. percentage rollout via stable hash(key) mod 100 < rollout_pct
--
-- A row with rollout_pct = 0 and empty lists is "off". Rolling to
-- 100 is the same as the existing kill-switch "enabled" state —
-- so feature_flags is a strict superset.
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id              bigserial PRIMARY KEY,
  flag_key        text NOT NULL UNIQUE,
  description     text,
  enabled         boolean NOT NULL DEFAULT false,
  rollout_pct     integer NOT NULL DEFAULT 0,
  allowlist       text[] NOT NULL DEFAULT '{}',
  denylist        text[] NOT NULL DEFAULT '{}',
  segments        text[] NOT NULL DEFAULT '{}',   -- 'advisor' | 'broker' | 'admin' | 'user'
  updated_by      text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key
  ON public.feature_flags (flag_key);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feature_flags
  DROP CONSTRAINT IF EXISTS feature_flags_rollout_pct_check;
ALTER TABLE public.feature_flags
  ADD CONSTRAINT feature_flags_rollout_pct_check CHECK (
    rollout_pct >= 0 AND rollout_pct <= 100
  );

COMMENT ON TABLE public.feature_flags IS
  'Percentage + segment feature flags. Supersedes automation_kill_switches for new features; existing kill switches remain for legacy compat.';

-- ── 2. slo_definitions ─────────────────────────────────────────────
-- One row per SLO we track. The monitoring cron reads this table,
-- queries the relevant metric (cron_run_log duration, HTTP error
-- rate, queue age etc), and writes a row to slo_incidents if the
-- target is breached.
CREATE TABLE IF NOT EXISTS public.slo_definitions (
  id                bigserial PRIMARY KEY,
  name              text NOT NULL UNIQUE,
  service           text NOT NULL,       -- 'cron' | 'api' | 'webhook' | 'ingest'
  metric            text NOT NULL,       -- 'success_rate' | 'p95_latency_ms' | 'queue_age_minutes' | 'error_rate'
  target            numeric NOT NULL,    -- e.g. 0.99 for 99% success
  comparator        text NOT NULL,       -- '>=' | '<=' | '<' | '>'
  window_minutes    integer NOT NULL DEFAULT 60,
  evaluation_source jsonb,               -- freeform hint for the evaluator cron (e.g. {cron: "auto-resolve-disputes"})
  enabled           boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slo_definitions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.slo_definitions
  DROP CONSTRAINT IF EXISTS slo_definitions_comparator_check;
ALTER TABLE public.slo_definitions
  ADD CONSTRAINT slo_definitions_comparator_check CHECK (
    comparator = ANY (ARRAY['>='::text, '<='::text, '<'::text, '>'::text])
  );

-- ── 3. slo_incidents ───────────────────────────────────────────────
-- Every SLO breach produces one row. Status machine:
--   open → acknowledged → resolved
--
-- Includes the raw measurement so on-call can see what tripped
-- without re-running the query.
CREATE TABLE IF NOT EXISTS public.slo_incidents (
  id               bigserial PRIMARY KEY,
  slo_name         text NOT NULL,
  service          text NOT NULL,
  severity         text NOT NULL,       -- 'warn' | 'page'
  measured_value   numeric,
  target_value     numeric,
  comparator       text,
  started_at       timestamptz NOT NULL DEFAULT now(),
  acknowledged_at  timestamptz,
  acknowledged_by  text,
  resolved_at      timestamptz,
  status           text NOT NULL DEFAULT 'open',
  notes            text,
  context          jsonb
);

CREATE INDEX IF NOT EXISTS idx_slo_incidents_open
  ON public.slo_incidents (status, started_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_slo_incidents_slo
  ON public.slo_incidents (slo_name, started_at DESC);

ALTER TABLE public.slo_incidents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.slo_incidents
  DROP CONSTRAINT IF EXISTS slo_incidents_severity_check;
ALTER TABLE public.slo_incidents
  ADD CONSTRAINT slo_incidents_severity_check CHECK (
    severity = ANY (ARRAY['warn'::text, 'page'::text])
  );

ALTER TABLE public.slo_incidents
  DROP CONSTRAINT IF EXISTS slo_incidents_status_check;
ALTER TABLE public.slo_incidents
  ADD CONSTRAINT slo_incidents_status_check CHECK (
    status = ANY (ARRAY['open'::text, 'acknowledged'::text, 'resolved'::text])
  );

-- ── 4. retention_rules ─────────────────────────────────────────────
-- Privacy Act 1988 (Cth) + GDPR require that personal data is kept
-- no longer than necessary. This table lists the retention policy
-- per data surface. The `gdpr-retention-purge` cron reads this
-- table and runs the appropriate DELETE / ANONYMISE per rule.
CREATE TABLE IF NOT EXISTS public.retention_rules (
  id              bigserial PRIMARY KEY,
  table_name      text NOT NULL,
  keep_days       integer NOT NULL,     -- data older than this may be purged
  strategy        text NOT NULL,        -- 'delete' | 'anonymise'
  email_column    text,                 -- null = not keyed by email
  timestamp_column text NOT NULL,       -- e.g. 'created_at' | 'captured_at'
  description     text,
  last_run_at     timestamptz,
  last_rows_affected integer,
  enabled         boolean NOT NULL DEFAULT true,
  UNIQUE (table_name, timestamp_column)
);

ALTER TABLE public.retention_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.retention_rules
  DROP CONSTRAINT IF EXISTS retention_rules_strategy_check;
ALTER TABLE public.retention_rules
  ADD CONSTRAINT retention_rules_strategy_check CHECK (
    strategy = ANY (ARRAY['delete'::text, 'anonymise'::text])
  );

-- Seed a conservative default policy
INSERT INTO public.retention_rules (table_name, keep_days, strategy, email_column, timestamp_column, description)
VALUES
  ('form_events', 180, 'delete', NULL, 'created_at', 'Form funnel events — 6 month retention'),
  ('attribution_touches', 180, 'delete', NULL, 'created_at', 'Attribution beacons — 6 month retention'),
  ('analytics_events', 365, 'delete', NULL, 'created_at', 'Generic analytics — 12 month retention'),
  ('affiliate_clicks', 730, 'delete', NULL, 'clicked_at', 'Affiliate clicks — 24 month retention for conversion attribution'),
  ('email_captures', 730, 'anonymise', 'email', 'captured_at', 'Email captures — 24 months then anonymise')
ON CONFLICT (table_name, timestamp_column) DO NOTHING;
