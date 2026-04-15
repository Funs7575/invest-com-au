-- Wave 18 schema — observability + search analytics.
--
-- Tables introduced:
--   1. search_queries              — anonymous query log for the site search
--                                     surfaces (articles, advisors, compare)
--   2. web_vitals_samples          — raw web vitals beacons from the client,
--                                     aggregated by a rollup cron
--   3. web_vitals_daily_rollup     — pre-aggregated per-page-per-day p50/p75/p95
--                                     of LCP/INP/CLS
--   4. revenue_attribution_daily   — daily summary row per (channel, vertical)
--                                     rolled up from attribution_touches for the
--                                     exec dashboard
--
-- Design notes:
--   - search_queries strips PII aggressively — we only store the
--     lowercased query text, the surface, and a hashed session id.
--     An anonymous user's email or name typed into a search box
--     would be an accidental leak — the capture API runs a
--     minimal redaction pass before write.
--   - web_vitals_samples is the raw event log (append-only, 7 day
--     retention). web_vitals_daily_rollup is the long-retention
--     summary. The client always posts to the raw table and the
--     rollup cron aggregates nightly.
--   - revenue_attribution_daily is a READ model built from the
--     existing attribution_touches table (Wave 6) rather than a
--     separate event store. The rollup cron writes one row per
--     (run_date, channel, vertical) so the exec dashboard renders
--     in <50ms.

-- ── 1. search_queries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_queries (
  id                   bigserial PRIMARY KEY,
  query_text           text NOT NULL,
  query_length         integer NOT NULL,
  surface              text NOT NULL,          -- 'articles' | 'advisors' | 'compare' | 'best_for' | 'topic' | 'tag'
  result_count         integer,                -- nullable: some surfaces don't report it
  result_clicked       boolean NOT NULL DEFAULT false,
  clicked_rank         integer,
  session_hash         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_surface_time
  ON public.search_queries (surface, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_queries_text
  ON public.search_queries (query_text);
CREATE INDEX IF NOT EXISTS idx_search_queries_created
  ON public.search_queries (created_at DESC);

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.search_queries
  DROP CONSTRAINT IF EXISTS search_queries_surface_check;
ALTER TABLE public.search_queries
  ADD CONSTRAINT search_queries_surface_check CHECK (
    surface = ANY (ARRAY['articles'::text, 'advisors'::text, 'compare'::text, 'best_for'::text, 'topic'::text, 'tag'::text, 'quiz'::text, 'global'::text])
  );

-- ── 2. web_vitals_samples ─────────────────────────────────────
-- Raw event log. Every measurement the client emits lands here;
-- the nightly rollup aggregates and then cleanup deletes rows
-- older than 7 days.
CREATE TABLE IF NOT EXISTS public.web_vitals_samples (
  id                   bigserial PRIMARY KEY,
  metric               text NOT NULL,          -- 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB'
  value                numeric NOT NULL,
  rating               text,                   -- 'good' | 'needs-improvement' | 'poor'
  page_path            text NOT NULL,
  device_kind          text,                   -- 'desktop' | 'mobile' | 'tablet'
  session_hash         text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_samples_metric_time
  ON public.web_vitals_samples (metric, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_samples_page
  ON public.web_vitals_samples (page_path, created_at DESC);

ALTER TABLE public.web_vitals_samples ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.web_vitals_samples
  DROP CONSTRAINT IF EXISTS web_vitals_samples_metric_check;
ALTER TABLE public.web_vitals_samples
  ADD CONSTRAINT web_vitals_samples_metric_check CHECK (
    metric = ANY (ARRAY['LCP'::text, 'INP'::text, 'CLS'::text, 'FCP'::text, 'TTFB'::text])
  );

-- ── 3. web_vitals_daily_rollup ────────────────────────────────
-- One row per (run_date, metric, page_path, device_kind).
CREATE TABLE IF NOT EXISTS public.web_vitals_daily_rollup (
  id                   bigserial PRIMARY KEY,
  run_date             date NOT NULL,
  metric               text NOT NULL,
  page_path            text NOT NULL,
  device_kind          text NOT NULL,
  sample_count         integer NOT NULL,
  p50                  numeric NOT NULL,
  p75                  numeric NOT NULL,
  p95                  numeric NOT NULL,
  good_pct             numeric,                -- % of samples rated 'good'
  poor_pct             numeric,                -- % rated 'poor'
  UNIQUE (run_date, metric, page_path, device_kind)
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_daily_rollup_recent
  ON public.web_vitals_daily_rollup (page_path, metric, run_date DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_daily_rollup_date
  ON public.web_vitals_daily_rollup (run_date DESC);

ALTER TABLE public.web_vitals_daily_rollup ENABLE ROW LEVEL SECURITY;

-- ── 4. revenue_attribution_daily ──────────────────────────────
-- Rolled up from attribution_touches by the daily cron.
-- One row per (run_date, channel, vertical).
CREATE TABLE IF NOT EXISTS public.revenue_attribution_daily (
  id                   bigserial PRIMARY KEY,
  run_date             date NOT NULL,
  channel              text NOT NULL,
  vertical             text,
  touches              integer NOT NULL DEFAULT 0,
  first_touch_conversions integer NOT NULL DEFAULT 0,
  last_touch_conversions integer NOT NULL DEFAULT 0,
  linear_conversions      numeric NOT NULL DEFAULT 0,
  revenue_cents        bigint NOT NULL DEFAULT 0,
  computed_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_date, channel, vertical)
);

CREATE INDEX IF NOT EXISTS idx_revenue_attribution_daily_recent
  ON public.revenue_attribution_daily (run_date DESC, channel);

ALTER TABLE public.revenue_attribution_daily ENABLE ROW LEVEL SECURITY;
