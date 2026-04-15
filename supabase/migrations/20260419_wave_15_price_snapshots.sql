-- Wave 15 schema — broker + commodity price snapshots.
--
-- Tables introduced:
--   1. broker_price_snapshots    — hourly snapshot of key broker fee
--                                   + deal fields, for historical charts
--   2. commodity_price_snapshots — hourly snapshot of commodity_stocks +
--                                   commodity_etfs metric points
--
-- Design notes:
--   - These are SNAPSHOTS, not live prices. We deliberately do not
--     render "current" numbers without a visible timestamp so the
--     user can see exactly how fresh the data is (ASIC disclosure
--     risk of showing stale numbers as current).
--   - Snapshots are append-only and never updated in place. One row
--     per (entity_id, captured_at) — a small fraction of a second's
--     worth of clock skew at the cron level is fine.
--   - Data retention: we keep 90 days of broker snapshots and 365
--     days of commodity snapshots (commodity charts need more
--     history for "past year" views). Older rows get deleted by the
--     cleanup cron.

-- ── 1. broker_price_snapshots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_price_snapshots (
  id                   bigserial PRIMARY KEY,
  broker_id            integer NOT NULL,
  broker_slug          text NOT NULL,
  captured_at          timestamptz NOT NULL DEFAULT now(),
  -- Fee fields snapshot
  asx_fee              text,
  asx_fee_value        numeric,
  us_fee               text,
  us_fee_value         numeric,
  fx_rate              numeric,
  inactivity_fee       text,
  inactivity_fee_value numeric,
  min_deposit          text,
  min_deposit_value    numeric,
  -- Deal / offer snapshot (so we can correlate fee changes with promos)
  deal                 text,
  deal_text            text,
  deal_expiry          date,
  -- Status so an inactive broker's snapshot history stays queryable
  status               text NOT NULL DEFAULT 'active',
  -- Source: 'cron' | 'manual' | 'backfill'
  source               text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_broker_price_snapshots_slug_time
  ON public.broker_price_snapshots (broker_slug, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_price_snapshots_broker_time
  ON public.broker_price_snapshots (broker_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_broker_price_snapshots_time
  ON public.broker_price_snapshots (captured_at DESC);

ALTER TABLE public.broker_price_snapshots ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.broker_price_snapshots IS
  'Hourly snapshot of broker fee + deal fields for historical charting. Append-only.';

-- ── 2. commodity_price_snapshots ───────────────────────────────
-- One snapshot row per (entity_kind, entity_ref, captured_at).
-- entity_kind = 'stock' | 'etf' | 'spot'. entity_ref is the
-- commodity_stocks.ticker or commodity_etfs.ticker (or a spot
-- index name like 'brent_usd_bbl').
CREATE TABLE IF NOT EXISTS public.commodity_price_snapshots (
  id                   bigserial PRIMARY KEY,
  entity_kind          text NOT NULL,
  entity_ref           text NOT NULL,
  sector_slug          text,
  captured_at          timestamptz NOT NULL DEFAULT now(),
  price_minor_units    bigint,                         -- cents for AUD, 1/100 USD etc
  currency             text NOT NULL DEFAULT 'AUD',
  dividend_yield_pct   numeric,
  pe_ratio             numeric,
  mer_pct              numeric,
  source               text NOT NULL DEFAULT 'cron'
);

CREATE INDEX IF NOT EXISTS idx_commodity_price_snapshots_ref_time
  ON public.commodity_price_snapshots (entity_kind, entity_ref, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_commodity_price_snapshots_sector
  ON public.commodity_price_snapshots (sector_slug, captured_at DESC)
  WHERE sector_slug IS NOT NULL;

ALTER TABLE public.commodity_price_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commodity_price_snapshots
  DROP CONSTRAINT IF EXISTS commodity_price_snapshots_kind_check;
ALTER TABLE public.commodity_price_snapshots
  ADD CONSTRAINT commodity_price_snapshots_kind_check CHECK (
    entity_kind = ANY (ARRAY['stock'::text, 'etf'::text, 'spot'::text])
  );
