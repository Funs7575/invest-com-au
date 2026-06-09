-- Expression indexes on key_metrics JSONB for stage/commodity/sector/market-cap filters.
-- These are purely additive — no data changes, no RLS impact.
-- Rollback: DROP INDEX investment_listings_km_stage_idx, _commodity_idx, _sector_idx, _mcap_idx;

CREATE INDEX IF NOT EXISTS investment_listings_km_stage_idx
  ON investment_listings ((key_metrics->>'stage'))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS investment_listings_km_commodity_idx
  ON investment_listings ((key_metrics->>'commodity'))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS investment_listings_km_sector_idx
  ON investment_listings ((key_metrics->>'sector'))
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS investment_listings_km_mcap_idx
  ON investment_listings ((key_metrics->>'market_cap_band'))
  WHERE status = 'active';
