-- Restores broker foreign-investment flag columns that drifted out of the
-- production database. They are defined in 20260322_foreign_investment_flags.sql,
-- but that migration never applied to prod — its version is absent from
-- schema_migrations (the applied history jumps 20260318 -> 20260324). With the
-- columns missing, the PostgREST column list on /compare and
-- /foreign-investment/{crypto,shares,savings} was rejected wholesale, collapsing
-- every one of those pages to zero rows ("0+ Australian platforms",
-- "No platforms match this filter").
--
-- Forward-only and idempotent: re-adds only the two missing columns. Additive +
-- nullable, so there is no data loss and it is a no-op on any environment where
-- 20260322 did apply.
--
-- Rollback (only if nothing references them — both are read by
-- lib/compare-engine.ts and the foreign-investment pages, so prefer keeping them):
--   ALTER TABLE public.brokers
--     DROP COLUMN IF EXISTS requires_australian_address,
--     DROP COLUMN IF EXISTS accepts_temporary_residents;

ALTER TABLE public.brokers
  ADD COLUMN IF NOT EXISTS requires_australian_address boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepts_temporary_residents boolean DEFAULT NULL;

COMMENT ON COLUMN public.brokers.requires_australian_address IS
  'True if the platform requires an Australian residential address to open an account (gates non-resident eligibility).';
COMMENT ON COLUMN public.brokers.accepts_temporary_residents IS
  'True if the platform accepts temporary residents (visa holders) as customers.';
