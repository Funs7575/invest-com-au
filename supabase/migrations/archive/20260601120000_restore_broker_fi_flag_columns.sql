-- Restores broker foreign-investment flag columns that drifted out of the
-- production database. They are defined in 20260322_foreign_investment_flags.sql,
-- but that migration never applied to prod — its version is absent from
-- schema_migrations (the applied history jumps 20260318 -> 20260324). With the
-- columns missing, the PostgREST column list on /compare and
-- /foreign-investment/{crypto,shares,savings} was rejected wholesale, collapsing
-- every one of those pages to zero rows ("0+ Australian platforms",
-- "No platforms match this filter").
--
-- Uses a unique full 14-digit timestamp: the date-only `20260601` prefix is
-- already taken by six `20260601_rls_*` migrations, and `supabase db push`
-- de-duplicates by timestamp — a colliding prefix could be treated as already
-- applied and silently skipped, leaving the columns missing.
--
-- Forward-only and idempotent: ADD COLUMN IF NOT EXISTS is additive + nullable
-- (no data loss; a no-op where 20260322 did apply). The re-seed replays the
-- deterministic slug-keyed values for the two restored columns from 20260322
-- (accepts_non_residents + foreign_investor_notes already exist and are left
-- untouched), so eligibility data is correct rather than all-NULL.
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

-- Re-seed the two restored columns with the canonical March-2026 values from the
-- skipped 20260322 migration. Slug + platform_type keyed → deterministic and
-- idempotent.
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = true  WHERE slug = 'commsec'             AND platform_type = 'share_broker';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'interactive-brokers' AND platform_type = 'share_broker';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = true  WHERE slug = 'stake'               AND platform_type = 'share_broker';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = true  WHERE slug = 'moomoo'              AND platform_type = 'share_broker';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = true  WHERE slug = 'nabtrade'            AND platform_type = 'share_broker';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'coinspot'            AND platform_type = 'crypto_exchange';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'swyftx'              AND platform_type = 'crypto_exchange';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'binance-au'          AND platform_type = 'crypto_exchange';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'ig-markets'          AND platform_type = 'cfd_forex';
UPDATE public.brokers SET accepts_temporary_residents = true, requires_australian_address = false WHERE slug = 'pepperstone'         AND platform_type = 'cfd_forex';
