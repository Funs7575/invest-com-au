-- ============================================================================
-- Migration: 20260725200000_add_listing_kind.sql
-- Purpose: Introduce a `listing_kind` discriminator on investment_listings.
--          Today the page treats every row identically — same card, same
--          "Asking $X" label — but in reality the table holds 7 different
--          shapes of opportunity (for-sale business vs fund vs equity raise
--          vs listed-security ASX ticker vs physical collectible …).
--          Per-kind card variants + per-kind filter sets need a typed
--          column, not a derived-at-query-time mapping over `vertical`.
--
-- Why now: Wave 1 of the /invest rebuild (see plan in PR description).
--          Without this column the new ListingCard can't pick a layout,
--          the new filter drawer can't expose ticket-size vs market-cap
--          vs min-investment correctly, and the 60 collectibles labelled
--          `vertical='fund'` keep showing up as "Asking $2M min (wholesale
--          only)" on a fund card with a stock-photo of server racks.
--
-- Backfill: deterministic mapping from (vertical, key_metrics, asking_price).
--           See `CASE` block below for the rules. Idempotent —
--           re-running won't change any row whose listing_kind was set
--           explicitly by an admin afterwards because we only update
--           rows WHERE listing_kind IS NULL.
--
-- Rollback (destructive):
--   ALTER TABLE investment_listings DROP COLUMN IF EXISTS listing_kind;
--   DROP INDEX IF EXISTS idx_investment_listings_listing_kind;
--
-- Risk: low — purely additive. The CHECK constraint allows the 7 known
--       kinds plus NULL so rows added by older code paths still insert.
-- ============================================================================

BEGIN;

ALTER TABLE investment_listings
  ADD COLUMN IF NOT EXISTS listing_kind TEXT;

ALTER TABLE investment_listings
  DROP CONSTRAINT IF EXISTS investment_listings_listing_kind_check;
ALTER TABLE investment_listings
  ADD CONSTRAINT investment_listings_listing_kind_check
  CHECK (listing_kind IS NULL OR listing_kind IN (
    'for_sale_business',   -- buy-business, franchise (operating business changing hands)
    'for_sale_asset',      -- commercial property, farmland, livestock (tangible asset)
    'equity_raise',        -- startups, pre-IPO (company raising primary capital)
    'project_equity',      -- mining, renewable energy, infrastructure (project / SPV equity)
    'royalty',             -- mining/IP/music/oil-gas royalty streams
    'fund',                -- managed funds (PDS / IM / wholesale)
    'physical_asset',      -- collectibles: wine, whisky, watches, cars, art, coins, sports
    'listed_security'      -- ASX tickers (use a broker, not enquire)
  ));

CREATE INDEX IF NOT EXISTS idx_investment_listings_listing_kind
  ON investment_listings(listing_kind)
  WHERE status = 'active';

-- ── Backfill ──────────────────────────────────────────────────────────────
-- Order matters: the listed_security branch must fire BEFORE the
-- project_equity branch, since uranium/hydrogen/oil-gas/digital-infra
-- rows that carry an `asx_ticker` AND have no asking price are equities
-- being browsed (need ticker-style cards), not project-equity raises.
UPDATE investment_listings
SET listing_kind = CASE
  -- ASX tickers: have a ticker, no asking price → listed security
  WHEN key_metrics ? 'asx_ticker' AND asking_price_cents IS NULL THEN 'listed_security'

  -- Collectibles misclassified as `vertical='fund'` (singular). The
  -- 60 rows currently tagged `fund` are wine/whisky/watches/cars/art
  -- per key_metrics (varietal, cask_type, calibre, engine, artist, ...).
  -- Reclassify them as physical_asset so the right card + filters apply.
  WHEN vertical = 'fund' AND (
    key_metrics ?| ARRAY['varietal','vintage','cask_type','case_size_mm','calibre',
                         'artist','athlete','engine','model','make','distillery',
                         'producer','sport','grading','expression','transmission',
                         'medium','representation','colour','signed']
  ) THEN 'physical_asset'

  -- Real managed funds — explicit plural vertical OR fund-like keys.
  -- Some sector-vertical rows (oil-gas, energy) are also actually
  -- managed funds (Ellerston, K2 etc.) — detected via structure or
  -- fund-like stage marker.
  WHEN vertical = 'funds' THEN 'fund'
  WHEN vertical = 'fund' AND key_metrics ?| ARRAY['aum_billions','min_investment','mer_bps','distribution_yield']
    THEN 'fund'
  WHEN (key_metrics->>'structure' = 'managed_fund') OR (key_metrics->>'stage' = 'fund')
    THEN 'fund'

  -- Royalty streams — explicit royalties vertical OR detected via
  -- stage/royalty_type inside other verticals (e.g., LNG Net Profits
  -- Royalty Interest sitting under oil-gas).
  WHEN vertical = 'royalties' THEN 'royalty'
  WHEN (key_metrics->>'stage' = 'royalty') OR (key_metrics ? 'royalty_type')
    THEN 'royalty'

  -- For-sale operating businesses
  WHEN vertical IN ('buy-business', 'franchise') THEN 'for_sale_business'

  -- Tangible-asset sales (real property + land + livestock)
  WHEN vertical IN ('commercial_property', 'commercial-property', 'farmland', 'livestock')
    THEN 'for_sale_asset'

  -- Primary-capital raises (companies selling equity)
  WHEN vertical IN ('startups', 'startup', 'pre_ipo', 'pre-ipo') THEN 'equity_raise'

  -- Project / SPV equity (mining tenements, renewables, infra). Sector
  -- verticals without ASX tickers default to project_equity.
  WHEN vertical IN ('mining', 'renewable-energy', 'energy', 'aquaculture',
                    'carbon-environmental-markets', 'public-social-infrastructure',
                    'digital-infrastructure', 'oil-gas', 'uranium', 'hydrogen')
    THEN 'project_equity'

  -- Fallback: leave NULL for human review (admin can set explicitly).
  ELSE NULL
END
WHERE listing_kind IS NULL;

COMMIT;
