-- ============================================================================
-- Migration: 20260501_add_property_advisor_types.sql
-- Date:      2026-05-01
-- Purpose:   Add 'conveyancer' and 'property_lawyer' to the
--            professionals.type CHECK constraint and seed corresponding
--            lead_pricing rows. Completes the property-purchase advisor
--            thread (mortgage_broker → buyers_agent → conveyancer →
--            property_lawyer) so /property can recommend a complete team
--            and /advisors/conveyancers + /advisors/property-lawyers
--            become real listing pages.
-- ----------------------------------------------------------------------------
-- Storage model:
--   `professionals.type` is a TEXT column with a CHECK constraint named
--   `professionals_type_check` (NOT a Postgres ENUM — see
--   20260305_create_advisor_directory.sql line 96 and the historical
--   widenings in 20260309_add_new_advisor_types.sql,
--   20260315_add_real_estate_agent.sql, 20260413_stockbroker_firms.sql,
--   20260428_advisor_directory_extensions.sql,
--   20260429_oil_gas_expansion.sql, 20260501_uranium_expansion.sql, and
--   20260506_revenue_expansion.sql).
--
--   The CHECK is widened forward-only by DROP CONSTRAINT IF EXISTS +
--   ADD CONSTRAINT — the same drop+add pattern used by every previous
--   widening since the table was created. A widening never invalidates
--   existing rows, so this is safe to apply with traffic.
-- ----------------------------------------------------------------------------
-- Idempotency:
--   * DROP CONSTRAINT IF EXISTS — safe to re-run.
--   * ADD CONSTRAINT — recreates the same constraint name with the
--     superset of values; deterministic on every run.
--   * lead_pricing INSERT … ON CONFLICT (advisor_type) DO NOTHING.
-- ----------------------------------------------------------------------------
-- Rollback (operator-driven, not automatic):
--   Forward-only in production. To rollback you must:
--     1. UPDATE public.professionals
--          SET type = 'property_advisor'
--          WHERE type IN ('conveyancer','property_lawyer');
--        -- or DELETE the rows; the CHECK won't recreate while any
--        -- row uses the values you're trying to drop.
--     2. DELETE FROM public.lead_pricing
--          WHERE advisor_type IN ('conveyancer','property_lawyer');
--     3. ALTER TABLE public.professionals
--          DROP CONSTRAINT IF EXISTS professionals_type_check;
--     4. Recreate the prior constraint by copying the ARRAY[...] from
--        20260506_revenue_expansion.sql lines 26-59 (that is the most
--        recent constraint that did NOT include conveyancer or
--        property_lawyer).
--
--   N.B. The advisor opt-in / opt-in fan-out tables (listing_advisor_opt_ins,
--   public_job_advisor_types) use TEXT advisor_type columns with NO CHECK
--   constraint, so this migration is the only DB-level place the new
--   values need to be allowed. The application-level allowlist in
--   lib/advisor-opt-ins.ts (VALID_ADVISOR_TYPES) is updated alongside
--   this migration.
-- ----------------------------------------------------------------------------
-- Risk: low — additive widening only; reverse path is operator-driven.
-- ============================================================================

BEGIN;

-- 1. Widen the CHECK constraint with the two new types.
ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_type_check;

ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_type_check CHECK (
    type = ANY (ARRAY[
      'smsf_accountant',
      'financial_planner',
      'property_advisor',
      'tax_agent',
      'mortgage_broker',
      'estate_planner',
      'insurance_broker',
      'buyers_agent',
      'wealth_manager',
      'aged_care_advisor',
      'crypto_advisor',
      'debt_counsellor',
      'real_estate_agent',
      'mining_lawyer',
      'mining_tax_advisor',
      'migration_agent',
      'business_broker',
      'commercial_lawyer',
      'rural_property_agent',
      'commercial_property_agent',
      'energy_consultant',
      'stockbroker_firm',
      'private_wealth_manager',
      'energy_financial_planner',
      'resources_fund_manager',
      'foreign_investment_lawyer',
      'petroleum_royalties_advisor',
      'smsf_auditor',
      'smsf_specialist',
      'immigration_investment_lawyer',
      'fund_manager',
      -- New in 20260501 — property-thread completion:
      'conveyancer',
      'property_lawyer'
    ]::text[])
  );

-- 2. Seed lead_pricing rows so the lead-pricing helper has a row when
--    the first advisor of these types onboards. Mirrors the seed pattern
--    used by 20260315_add_real_estate_agent.sql and the wave-N expansions.
--
--    Pricing rationale:
--      * conveyancer — high lead volume, moderate transaction value.
--        Comparable to mortgage_broker / buyers_agent intent. $39 lead
--        (with $29 floor / $69 ceiling), $179/month feature.
--      * property_lawyer — lower volume but higher value (disputes,
--        SMSF property, off-the-plan). Closer to commercial_lawyer
--        pricing. $59 lead ($39/$99), $199/month feature.
INSERT INTO public.lead_pricing (
  advisor_type,
  price_cents,
  description,
  min_price_cents,
  max_price_cents,
  free_trial_leads,
  featured_monthly_cents
) VALUES
  (
    'conveyancer',
    3900,
    'Conveyancers — settlement, contract review, PEXA e-settlement, and stamp duty for residential and off-the-plan property purchases.',
    2900,
    6900,
    2,
    17900
  ),
  (
    'property_lawyer',
    5900,
    'Property lawyers — off-the-plan disputes, strata, SMSF property structuring, commercial conveyancing, and property litigation.',
    3900,
    9900,
    2,
    19900
  )
ON CONFLICT (advisor_type) DO NOTHING;

COMMIT;
