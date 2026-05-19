-- ============================================================================
-- Migration: 20260801000700_investor_household_type.sql
-- Purpose: Promote investor household type from stringly-typed JSON
--          (investor_profiles.meta.account_type) to a typed enum column
--          investor_profiles.household_type. The JSON path was shipped in
--          PR #917 (AT-02..04 stream) for couple/family/business dashboard
--          variants but a typo in the JSON key silently downgrades to the
--          default 'individual' branch — typed column eliminates that
--          failure mode.
--
-- Backfill reads existing meta.account_type values. The JSON key stays
-- populated for one release as a fallback for any in-flight code that
-- still reads it; remove in a follow-up after readers are migrated.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 2 — Session 2.2.
-- Risk: low — additive column + backfill from existing data; no
--             behaviour change for unmigrated readers.
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.investor_profiles DROP COLUMN IF EXISTS household_type;
--   COMMIT;
-- ============================================================================

BEGIN;

ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS household_type text
    CHECK (household_type IN ('individual', 'couple', 'family', 'business'))
    DEFAULT 'individual';

-- Backfill from existing meta JSON. Treat unknown / missing values as
-- 'individual' (the default).
UPDATE public.investor_profiles
SET household_type = CASE
  WHEN meta->>'account_type' = 'couple' THEN 'couple'
  WHEN meta->>'account_type' = 'family' THEN 'family'
  WHEN meta->>'account_type' = 'business' THEN 'business'
  ELSE 'individual'
END
WHERE household_type IS NULL OR household_type = 'individual';

-- Make NOT NULL after backfill (every row now has a value).
ALTER TABLE public.investor_profiles
  ALTER COLUMN household_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_household_type
  ON public.investor_profiles (household_type)
  WHERE household_type <> 'individual';

COMMIT;
