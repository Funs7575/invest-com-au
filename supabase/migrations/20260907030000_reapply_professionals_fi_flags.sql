-- ============================================================================
-- Migration: 20260907030000_reapply_professionals_fi_flags.sql
-- Purpose: Re-apply the `professionals` foreign-investment flag columns from
--          20260322_foreign_investment_flags.sql, which only PARTIALLY applied
--          to the live database. DB introspection (2026-06-07) confirmed the
--          brokers columns and the foreign_investment_dta table are present, but
--          professionals.{international_tax_specialist, firb_specialist,
--          migration_agent, migration_agent_marn} were MISSING.
--
--          Their absence makes any advisor read that projects them fail at the
--          query layer. On /advisor/[slug] the page's primary
--          `.select(ADVISOR_PUBLIC_COLUMNS).single()` therefore returns null ->
--          notFound(), which surfaced as React #419 + "Advisor Not Found" on
--          EVERY advisor profile. The same missing columns also break
--          /advisors/firb-specialists, /advisors/international-tax-specialists
--          and /advisors/migration-agents (which filter `.eq(<col>, true)`),
--          the quiz advisor-results query, and the v1 advisor APIs.
--
--          A fresh migration version is used (rather than editing 20260322)
--          because that version is already recorded as applied, so the migrate
--          workflow will not re-run it; a new version will apply.
--
-- jsonb correction (2026-06-07): the LIVE `professionals.specialties` column is
--   `jsonb` (schema drift vs the migrations-defined `text[]`). The original
--   backfill predicate `'International Tax' = ANY(specialties)` therefore errors
--   on prod with `42809: op ANY/ALL (array) requires array on right side`, and
--   because the migration is wrapped in BEGIN/COMMIT that error rolled the whole
--   thing back -- so the four ADD COLUMNs never persisted either. The backfill
--   below is now type-aware: it uses jsonb containment (@>) when `specialties`
--   is jsonb and the array predicate (= ANY) otherwise, so it is safe on both
--   the live (jsonb) database and a migrations-only rebuild (text[]). PL/pgSQL
--   only plans the branch it actually takes, so the unused predicate never
--   parses against the wrong column type.
--
--   The columns + backfill were applied to prod on 2026-06-07 via an idempotent
--   direct apply, recorded under this same version (20260907030000), so this
--   file will not re-run there; it is corrected here so a future replay (e.g. a
--   fresh environment built from migrations) cannot fail.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + idempotent, type-aware backfill.
-- RLS: unchanged -- adds columns to the existing RLS-enabled professionals table.
-- Rollback (non-destructive -- columns carry safe defaults):
--   ALTER TABLE public.professionals
--     DROP COLUMN IF EXISTS international_tax_specialist,
--     DROP COLUMN IF EXISTS firb_specialist,
--     DROP COLUMN IF EXISTS migration_agent,
--     DROP COLUMN IF EXISTS migration_agent_marn;
-- Risk: low -- additive boolean/text columns with safe defaults + idempotent backfill.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS international_tax_specialist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS firb_specialist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_agent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_agent_marn text DEFAULT NULL;

COMMENT ON COLUMN public.professionals.international_tax_specialist IS
  'Whether this professional specialises in international tax (non-residents, expats, DTAs, DASP).';
COMMENT ON COLUMN public.professionals.firb_specialist IS
  'Whether this professional specialises in FIRB applications and foreign property investment advice.';
COMMENT ON COLUMN public.professionals.migration_agent IS
  'Whether this professional is a registered migration agent (MARA-registered).';
COMMENT ON COLUMN public.professionals.migration_agent_marn IS
  'Migration Agent Registration Number (MARN) for registered migration agents.';

-- Type-aware backfill (mirrors 20260322; idempotent -- re-running sets the same
-- rows). The live `specialties` column is jsonb; a migrations-only rebuild may
-- have it as text[]. Pick the predicate that matches the actual column type so
-- the migration is safe in both worlds.
DO $$
DECLARE
  v_specialties_type text;
BEGIN
  SELECT data_type INTO v_specialties_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'professionals'
    AND column_name = 'specialties';

  IF v_specialties_type = 'jsonb' THEN
    -- Tax agents flagged with the International Tax specialty:
    UPDATE public.professionals
      SET international_tax_specialist = true
      WHERE specialties @> '["International Tax"]'::jsonb
        AND status = 'active';
    -- Property advisors / buyer's agents flagged with a FIRB / foreign-buyer specialty:
    UPDATE public.professionals
      SET firb_specialist = true
      WHERE (specialties @> '["FIRB & Foreign Investment"]'::jsonb
          OR specialties @> '["Foreign Buyer Assistance"]'::jsonb)
        AND status = 'active';
  ELSIF v_specialties_type = 'ARRAY' THEN
    -- Tax agents flagged with the International Tax specialty:
    UPDATE public.professionals
      SET international_tax_specialist = true
      WHERE 'International Tax' = ANY(specialties)
        AND status = 'active';
    -- Property advisors / buyer's agents flagged with a FIRB / foreign-buyer specialty:
    UPDATE public.professionals
      SET firb_specialist = true
      WHERE ('FIRB & Foreign Investment' = ANY(specialties)
          OR 'Foreign Buyer Assistance' = ANY(specialties))
        AND status = 'active';
  END IF;
END $$;

COMMIT;
