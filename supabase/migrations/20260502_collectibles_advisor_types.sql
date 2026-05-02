-- ============================================================================
-- Migration: 20260502_collectibles_advisor_types.sql
-- Date:      2026-05-02
-- Purpose:   Add five collectibles-and-alternatives advisor types to the
--            professionals.type CHECK constraint and seed corresponding
--            lead_pricing rows. Completes the advisor surface for the
--            /invest/alternatives sub-categories (cars, watches, wine,
--            whisky, art, coins, sports memorabilia, royalties) so the
--            sub-category landing pages can route enquiries to a relevant
--            specialist.
--
--            New types:
--              * classic_car_specialist
--              * luxury_asset_broker
--              * wine_advisor
--              * art_advisor
--              * royalty_broker
-- ----------------------------------------------------------------------------
-- Storage model:
--   `professionals.type` is a TEXT column with a CHECK constraint named
--   `professionals_type_check` (NOT a Postgres ENUM — see
--   20260305_create_advisor_directory.sql line 96 and the historical
--   widenings, most recently 20260501_add_property_advisor_types.sql).
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
--          SET type = 'wealth_manager'
--          WHERE type IN ('classic_car_specialist','luxury_asset_broker',
--                         'wine_advisor','art_advisor','royalty_broker');
--        -- or DELETE the rows; the CHECK won't recreate while any
--        -- row uses the values you're trying to drop.
--     2. DELETE FROM public.lead_pricing
--          WHERE advisor_type IN ('classic_car_specialist','luxury_asset_broker',
--                                 'wine_advisor','art_advisor','royalty_broker');
--     3. ALTER TABLE public.professionals
--          DROP CONSTRAINT IF EXISTS professionals_type_check;
--     4. Recreate the prior constraint by copying the ARRAY[...] from
--        20260501_add_property_advisor_types.sql lines 67-102 (that is
--        the most recent constraint that did NOT include the five
--        collectibles types).
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

-- 1. Widen the CHECK constraint with the five new types.
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
      'conveyancer',
      'property_lawyer',
      -- New in 20260502 — collectibles & alternatives advisor surface:
      'classic_car_specialist',
      'luxury_asset_broker',
      'wine_advisor',
      'art_advisor',
      'royalty_broker'
    ]::text[])
  );

-- 2. Seed lead_pricing rows so the lead-pricing helper has a row when
--    the first advisor of these types onboards. Mirrors the seed pattern
--    used by 20260501_add_property_advisor_types.sql.
--
--    Pricing rationale:
--      * classic_car_specialist — niche, low lead volume but high asset
--        value (transactions $50K-$1M+). Comparable to private_wealth_manager
--        intent at the higher end. $79 lead ($39 floor / $129 ceiling),
--        $199/month feature.
--      * luxury_asset_broker — covers watches, jewellery, handbags, and
--        general luxury-asset advisory. Similar volume/value profile to
--        classic_car_specialist. $79 lead ($39/$129), $199/month feature.
--      * wine_advisor — established but small market (Vinovest, Cult Wines
--        adjacent). Slightly lower transaction values than cars/watches.
--        $59 lead ($29/$99), $179/month feature.
--      * art_advisor — higher per-transaction values (gallery/auction-grade
--        works), lower frequency. Comparable to estate_planner pricing.
--        $89 lead ($49/$149), $229/month feature.
--      * royalty_broker — very niche, very high transaction values (music
--        catalogues, IP royalties, mining royalty streams). Closest analog
--        is petroleum_royalties_advisor. $99 lead ($49/$199), $249/month
--        feature.
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
    'classic_car_specialist',
    7900,
    'Classic car specialists — Australian muscle, European classics, restoration economics, motorsport provenance, and SMSF collectibles-rule navigation.',
    3900,
    12900,
    2,
    19900
  ),
  (
    'luxury_asset_broker',
    7900,
    'Luxury asset brokers — investment-grade watches (Rolex, Patek Philippe, Audemars Piguet), jewellery, handbags, and general luxury-asset advisory and consignment.',
    3900,
    12900,
    2,
    19900
  ),
  (
    'wine_advisor',
    5900,
    'Wine advisors — fine wine portfolio construction, cellar management, Penfolds Grange and Barossa Shiraz vintages, fractional wine platforms (Vinovest, Cult Wines), and wine fund selection.',
    2900,
    9900,
    2,
    17900
  ),
  (
    'art_advisor',
    8900,
    'Art advisors — Australian and contemporary art acquisition, gallery and auction-house intermediation, fractional art platforms (Masterworks, Maverix), authentication, and SMSF art compliance.',
    4900,
    14900,
    2,
    22900
  ),
  (
    'royalty_broker',
    9900,
    'Royalty brokers — music catalogue royalties, IP royalty streams, mining and petroleum royalty deals, and structured royalty fund placements for wholesale and sophisticated investors.',
    4900,
    19900,
    1,
    24900
  )
ON CONFLICT (advisor_type) DO NOTHING;

COMMIT;
