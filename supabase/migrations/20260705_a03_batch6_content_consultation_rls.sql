-- =============================================================================
-- Date:          2026-05-02
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-03 batch 6 supplement (foreign-investment reference data)
-- Why:           Two public reference-data tables exist in lib/database.types.ts
--                and the live DB but have zero migration history. Without CREATE
--                TABLE migrations a clean rebuild cannot reconstruct the schema.
--                Without RLS enabled, PostgREST serves every row to any role —
--                no per-row access control whatsoever.
--
--                NOTE: consultations / consultation_bookings / course_lessons /
--                courses / au_postcodes are covered by a parallel migration
--                20260707_a03_batch6_consultations_courses_rls.sql (PR #461).
--                This file covers the two remaining tables:
--
--                • foreign_investment_rates — public reference data (FIRB rates,
--                  withholding tax rates by country). Read by server RSC anon
--                  client on /foreign-investment/[country] and the rates API.
--                  Admin manages via service_role. Policy: anon SELECT (active
--                  rows only) + service_role full access.
--                • country_investment_profiles — public country pages content.
--                  Read by server RSC anon client on /foreign-investment/[country].
--                  Admin manages via admin migrations / service_role.
--                  Policy: anon SELECT (active rows only) + service_role full access.
--
-- Idempotency:   CREATE TABLE IF NOT EXISTS throughout. DROP POLICY IF EXISTS
--                before each CREATE POLICY. ENABLE/FORCE RLS are no-ops when
--                already enabled. Safe to re-apply.
--
-- Prior policy   grep across all migrations confirms: 0 existing CREATE POLICY
-- state:         or ENABLE RLS statements on either table. No DROP POLICY lines
--                needed for prior policies.
--
-- Rollback:      For each table:
--                  ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
--                  ALTER TABLE public.<table> NO FORCE ROW LEVEL SECURITY;
--                  DROP POLICY IF EXISTS "<policy_name>" ON public.<table>;
--                  -- (do NOT drop tables — they have production data)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. foreign_investment_rates
--    Public reference data: FIRB stamp duty, withholding tax rates by country.
--    Read by RSC server client (anon JWT) on /foreign-investment/[country].
--    Admin updates via rates API (service_role). Public sees active rates only.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.foreign_investment_rates (
  id              serial PRIMARY KEY,
  country_code    text,
  country_name    text,
  rate_type       text NOT NULL,
  rate_percent    numeric,
  fee_cents       integer,
  threshold_cents integer,
  category        text,
  state           text,
  effective_from  date,
  effective_to    date,
  active          boolean DEFAULT true,
  notes           text,
  updated_at      timestamptz DEFAULT now(),
  updated_by      text
);

ALTER TABLE public.foreign_investment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_investment_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active foreign investment rates" ON public.foreign_investment_rates;
CREATE POLICY "Public can read active foreign investment rates"
  ON public.foreign_investment_rates FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to foreign investment rates" ON public.foreign_investment_rates;
CREATE POLICY "Service role full access to foreign investment rates"
  ON public.foreign_investment_rates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. country_investment_profiles
--    Public country page content (hero_title, key_facts, FDI data).
--    Read by RSC server client (anon JWT) on /foreign-investment/[country].
--    Admin updates via service_role (seed migrations / admin API).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.country_investment_profiles (
  id                              serial PRIMARY KEY,
  country_code                    text UNIQUE NOT NULL,
  country_name                    text NOT NULL,
  flag_emoji                      text,
  hero_title                      text,
  hero_subtitle                   text,
  meta_title                      text,
  meta_description                text,
  has_dta                         boolean,
  dta_year                        integer,
  fta_partner                     boolean,
  estimated_annual_fdi_aud_millions numeric,
  key_facts                       jsonb,
  active                          boolean DEFAULT true,
  created_at                      timestamptz DEFAULT now()
);

ALTER TABLE public.country_investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_investment_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active country investment profiles" ON public.country_investment_profiles;
CREATE POLICY "Public can read active country investment profiles"
  ON public.country_investment_profiles FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to country investment profiles" ON public.country_investment_profiles;
CREATE POLICY "Service role full access to country investment profiles"
  ON public.country_investment_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
