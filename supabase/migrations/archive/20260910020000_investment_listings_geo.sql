-- Add lat/lng to investment_listings for map view.
-- Rollback: DROP INDEX investment_listings_geo_idx; ALTER TABLE investment_listings DROP COLUMN latitude, DROP COLUMN longitude;
-- RLS: inherits existing "active listings readable by public" SELECT policy.

ALTER TABLE investment_listings
  ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN investment_listings.latitude  IS 'WGS-84 latitude. Populated by the geocode-listings cron from location_city + location_state.';
COMMENT ON COLUMN investment_listings.longitude IS 'WGS-84 longitude. Populated by the geocode-listings cron from location_city + location_state.';

CREATE INDEX IF NOT EXISTS investment_listings_geo_idx
  ON investment_listings USING gist (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  )
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'active';
