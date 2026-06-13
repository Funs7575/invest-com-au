-- Indexed metric columns (marketplace deep-dive idea #2).
--
-- JSONB filtering doesn't scale to range queries; the hot per-vertical
-- range metrics from lib/listings/vertical-metrics.ts get STORED generated
-- columns + partial indexes. The cast is guarded by an immutable numeric
-- regex so legacy rows with drifted string values generate NULL instead of
-- failing writes. Additive only — nothing reads these until the listings
-- query layer moves server-side; the browse UI filters in-memory today.
--
-- Rollback strategy: drop the indexes then the columns —
--   DROP INDEX IF EXISTS idx_listings_metric_<key>;
--   ALTER TABLE public.investment_listings DROP COLUMN IF EXISTS metric_<key>;

DO $$
DECLARE
  metric record;
BEGIN
  FOR metric IN
    SELECT * FROM (VALUES
      ('yield_percent'),
      ('wale_years'),
      ('sqm'),
      ('hectares'),
      ('water_entitlements_ml'),
      ('rainfall_mm'),
      ('capacity_mw'),
      ('royalty_percent'),
      ('min_investment_cents'),
      ('annual_ebitda')
    ) AS t(key)
  LOOP
    EXECUTE format(
      $sql$
        ALTER TABLE public.investment_listings
          ADD COLUMN IF NOT EXISTS %I numeric
          GENERATED ALWAYS AS (
            CASE
              WHEN (key_metrics->>%L) ~ '^[0-9]+(\.[0-9]+)?$'
              THEN (key_metrics->>%L)::numeric
            END
          ) STORED
      $sql$,
      'metric_' || metric.key,
      metric.key,
      metric.key
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.investment_listings (%I) WHERE (%I IS NOT NULL AND status = ''active'')',
      'idx_listings_metric_' || metric.key,
      'metric_' || metric.key,
      'metric_' || metric.key
    );
  END LOOP;
END $$;
