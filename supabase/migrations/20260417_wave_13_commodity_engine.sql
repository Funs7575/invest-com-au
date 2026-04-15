-- Wave 13 schema — commodity rush engine.
--
-- Tables introduced:
--   1. commodity_sectors       — canonical sector list (oil-gas, lithium, uranium, etc.)
--   2. commodity_stocks        — ASX-listed tickers with sector tagging + metadata
--   3. commodity_etfs          — commodity-focused ETFs (OOO, FUEL, URNM, etc.)
--   4. commodity_news_briefs   — rapid-publish news items per sector with audit trail
--
-- Design notes:
--   - `commodity_stocks` and `commodity_etfs` are reference data, not
--     live price data. We deliberately don't cache prices in the DB
--     — every price render on a page goes through a client-side
--     fetch with a short TTL so we can't accidentally display
--     stale prices as "current" (ASIC compliance risk).
--   - Sector is canonical (enum-ish) so /invest/<sector> pages
--     all query the same structure and the admin vertical-launcher
--     scaffolds a new page from one sector row.
--   - `commodity_news_briefs` stores the editorial news-follow-up
--     articles we publish within 24h of a major story. Each row
--     references an `articles` row so the normal content pipeline
--     owns rendering + RSS + related-article surfacing.

-- ── 1. commodity_sectors ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commodity_sectors (
  id                   bigserial PRIMARY KEY,
  slug                 text NOT NULL UNIQUE,           -- 'oil-gas', 'lithium', 'uranium'
  display_name         text NOT NULL,
  hero_description     text NOT NULL,
  hero_stats           jsonb,                           -- { "exports": "$92B", "jobs": "255k" }
  esg_risk_rating      text NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  regulator_notes      text,                           -- e.g. 'FIRB required for > X%'
  status               text NOT NULL DEFAULT 'active', -- 'active' | 'draft' | 'retired'
  launched_at          timestamptz,
  display_order        integer NOT NULL DEFAULT 100,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commodity_sectors_active
  ON public.commodity_sectors (display_order, slug)
  WHERE status = 'active';

ALTER TABLE public.commodity_sectors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commodity_sectors
  DROP CONSTRAINT IF EXISTS commodity_sectors_esg_check;
ALTER TABLE public.commodity_sectors
  ADD CONSTRAINT commodity_sectors_esg_check CHECK (
    esg_risk_rating = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])
  );

ALTER TABLE public.commodity_sectors
  DROP CONSTRAINT IF EXISTS commodity_sectors_status_check;
ALTER TABLE public.commodity_sectors
  ADD CONSTRAINT commodity_sectors_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'draft'::text, 'retired'::text])
  );

COMMENT ON TABLE public.commodity_sectors IS
  'Canonical sector list for /invest/<sector> commodity hubs. One row per vertical.';

-- ── 2. commodity_stocks ─────────────────────────────────────────
-- One row per ASX-listed resource company we want to surface on
-- a sector hub page. Tickers are never duplicated across sectors
-- — if Woodside is on oil-gas AND hydrogen, pick the primary.
CREATE TABLE IF NOT EXISTS public.commodity_stocks (
  id                   bigserial PRIMARY KEY,
  sector_slug          text NOT NULL,
  ticker               text NOT NULL,                  -- 'WDS', 'STO', 'BPT'
  company_name         text NOT NULL,                  -- 'Woodside Energy'
  market_cap_bucket    text,                           -- 'mega' | 'large' | 'mid' | 'small' | 'spec'
  dividend_yield_pct   numeric,                        -- point-in-time, updated by cron
  pe_ratio             numeric,                        -- point-in-time, updated by cron
  blurb                text,                           -- editorial one-liner
  primary_exposure     text,                           -- 'producer' | 'explorer' | 'service' | 'royalty'
  included_in_indices  text[],                         -- ['asx200', 'asx300']
  foreign_ownership_risk text,                         -- 'low' | 'medium' | 'high'
  last_reviewed_at     timestamptz,
  display_order        integer NOT NULL DEFAULT 100,
  status               text NOT NULL DEFAULT 'active', -- 'active' | 'watch' | 'removed'
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector_slug, ticker)
);

CREATE INDEX IF NOT EXISTS idx_commodity_stocks_sector
  ON public.commodity_stocks (sector_slug, display_order)
  WHERE status = 'active';

ALTER TABLE public.commodity_stocks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commodity_stocks
  DROP CONSTRAINT IF EXISTS commodity_stocks_bucket_check;
ALTER TABLE public.commodity_stocks
  ADD CONSTRAINT commodity_stocks_bucket_check CHECK (
    market_cap_bucket IS NULL OR market_cap_bucket = ANY (
      ARRAY['mega'::text, 'large'::text, 'mid'::text, 'small'::text, 'spec'::text]
    )
  );

ALTER TABLE public.commodity_stocks
  DROP CONSTRAINT IF EXISTS commodity_stocks_exposure_check;
ALTER TABLE public.commodity_stocks
  ADD CONSTRAINT commodity_stocks_exposure_check CHECK (
    primary_exposure IS NULL OR primary_exposure = ANY (
      ARRAY['producer'::text, 'explorer'::text, 'service'::text, 'royalty'::text]
    )
  );

ALTER TABLE public.commodity_stocks
  DROP CONSTRAINT IF EXISTS commodity_stocks_status_check;
ALTER TABLE public.commodity_stocks
  ADD CONSTRAINT commodity_stocks_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'watch'::text, 'removed'::text])
  );

COMMENT ON TABLE public.commodity_stocks IS
  'ASX-listed resource companies tagged by sector for the /invest/<sector> hub pages.';

-- ── 3. commodity_etfs ────────────────────────────────────────────
-- ETFs that give exposure to a sector. Separate from commodity_stocks
-- because ETFs have different attributes (MER, underlying, domicile).
CREATE TABLE IF NOT EXISTS public.commodity_etfs (
  id                   bigserial PRIMARY KEY,
  sector_slug          text NOT NULL,
  ticker               text NOT NULL,                  -- 'OOO', 'FUEL', 'URNM'
  name                 text NOT NULL,                  -- 'BetaShares Crude Oil Index ETF'
  issuer               text,                           -- 'BetaShares'
  mer_pct              numeric,                        -- management expense ratio %
  underlying_exposure  text,                           -- editorial blurb
  domicile             text,                           -- 'AU' | 'US' | 'IE'
  distribution_frequency text,                         -- 'annual' | 'semi' | 'quarterly' | 'monthly'
  blurb                text,
  display_order        integer NOT NULL DEFAULT 100,
  status               text NOT NULL DEFAULT 'active',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector_slug, ticker)
);

CREATE INDEX IF NOT EXISTS idx_commodity_etfs_sector
  ON public.commodity_etfs (sector_slug, display_order)
  WHERE status = 'active';

ALTER TABLE public.commodity_etfs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commodity_etfs
  DROP CONSTRAINT IF EXISTS commodity_etfs_status_check;
ALTER TABLE public.commodity_etfs
  ADD CONSTRAINT commodity_etfs_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'watch'::text, 'removed'::text])
  );

-- ── 4. commodity_news_briefs ────────────────────────────────────
-- Rapid-publish news follow-ups. One row per editorial piece
-- published in response to a commodity-sector news event. Links
-- back to the articles row via `article_slug` so renderers pick
-- up the canonical content.
CREATE TABLE IF NOT EXISTS public.commodity_news_briefs (
  id                   bigserial PRIMARY KEY,
  sector_slug          text NOT NULL,
  article_slug         text NOT NULL,
  event_title          text NOT NULL,
  event_date           date NOT NULL,
  source_url           text,                           -- primary source (ASX release, minister statement)
  reviewed_by          text,                           -- compliance reviewer email
  compliance_flags     text[],                         -- e.g. ['general_advice_warning_present', 'no_forward_looking']
  status               text NOT NULL DEFAULT 'draft',  -- 'draft' | 'published' | 'retired'
  published_at         timestamptz,
  retired_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_slug)
);

CREATE INDEX IF NOT EXISTS idx_commodity_news_briefs_sector
  ON public.commodity_news_briefs (sector_slug, event_date DESC)
  WHERE status = 'published';

ALTER TABLE public.commodity_news_briefs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commodity_news_briefs
  DROP CONSTRAINT IF EXISTS commodity_news_briefs_status_check;
ALTER TABLE public.commodity_news_briefs
  ADD CONSTRAINT commodity_news_briefs_status_check CHECK (
    status = ANY (ARRAY['draft'::text, 'published'::text, 'retired'::text])
  );

-- Seed the oil-gas sector + its baseline companies/ETFs so the
-- /invest/oil-gas hub renders meaningful data from day one. This
-- is editorial data — the admin can edit via the vertical-launcher
-- page after migration.
INSERT INTO public.commodity_sectors
  (slug, display_name, hero_description, hero_stats, esg_risk_rating, regulator_notes, status, launched_at, display_order)
VALUES (
  'oil-gas',
  'Oil & Gas',
  'Australia is a top-5 global LNG exporter and home to some of the largest listed energy majors on the ASX. This hub walks Australian investors through direct ASX exposure, ETFs and the compliance considerations that come with resource investing.',
  '{"lng_exports_fy25": "$69B", "jobs": "80k", "asx_weight": "6.2%"}'::jsonb,
  'high',
  'Takeover Panel + FIRB approval required for foreign investors above 10% in designated strategic assets.',
  'active',
  now(),
  20
)
ON CONFLICT (slug) DO UPDATE
SET display_name = EXCLUDED.display_name,
    hero_description = EXCLUDED.hero_description,
    hero_stats = EXCLUDED.hero_stats,
    regulator_notes = EXCLUDED.regulator_notes,
    updated_at = now();

INSERT INTO public.commodity_stocks
  (sector_slug, ticker, company_name, market_cap_bucket, primary_exposure, included_in_indices, foreign_ownership_risk, blurb, display_order)
VALUES
  ('oil-gas', 'WDS', 'Woodside Energy Group', 'mega', 'producer', ARRAY['asx20','asx200','asx300'], 'medium', 'Australia''s largest pure-play oil & gas producer after the BHP Petroleum merger.', 10),
  ('oil-gas', 'STO', 'Santos Limited', 'mega', 'producer', ARRAY['asx20','asx200','asx300'], 'medium', 'Diversified producer with LNG, domestic gas and legacy oil assets across APAC.', 20),
  ('oil-gas', 'BPT', 'Beach Energy', 'mid', 'producer', ARRAY['asx200','asx300'], 'low', 'Mid-cap Australian-focused oil & gas producer with Cooper Basin and Waitsia exposure.', 30),
  ('oil-gas', 'KAR', 'Karoon Energy', 'small', 'producer', ARRAY['asx300'], 'low', 'Brazil-producing Australian-listed operator — cash-flow focus, single-asset concentration risk.', 40),
  ('oil-gas', 'COE', 'Cooper Energy', 'small', 'producer', ARRAY['asx300'], 'low', 'Gippsland + Otway Basin domestic gas producer supplying the east-coast market.', 50)
ON CONFLICT (sector_slug, ticker) DO UPDATE
SET company_name = EXCLUDED.company_name,
    market_cap_bucket = EXCLUDED.market_cap_bucket,
    primary_exposure = EXCLUDED.primary_exposure,
    included_in_indices = EXCLUDED.included_in_indices,
    foreign_ownership_risk = EXCLUDED.foreign_ownership_risk,
    blurb = EXCLUDED.blurb,
    updated_at = now();

INSERT INTO public.commodity_etfs
  (sector_slug, ticker, name, issuer, mer_pct, underlying_exposure, domicile, distribution_frequency, blurb, display_order)
VALUES
  ('oil-gas', 'OOO', 'BetaShares Crude Oil Index ETF-Currency Hedged (Synthetic)', 'BetaShares', 0.69, 'Brent crude oil futures, AUD-hedged', 'AU', 'annual', 'Pure crude price exposure via front-month futures. Roll yield + contango risk.', 10),
  ('oil-gas', 'FUEL', 'BetaShares Global Energy Companies ETF', 'BetaShares', 0.57, 'Global large-cap integrated oil & gas equities (ex-AU)', 'AU', 'semi', 'Global majors (XOM, CVX, Shell, BP) — AUD-unhedged equity exposure.', 20)
ON CONFLICT (sector_slug, ticker) DO UPDATE
SET name = EXCLUDED.name,
    issuer = EXCLUDED.issuer,
    mer_pct = EXCLUDED.mer_pct,
    underlying_exposure = EXCLUDED.underlying_exposure,
    distribution_frequency = EXCLUDED.distribution_frequency,
    blurb = EXCLUDED.blurb,
    updated_at = now();
