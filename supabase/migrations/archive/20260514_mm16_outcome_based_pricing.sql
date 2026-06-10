-- ============================================================================
-- Migration: 20260514_mm16_outcome_based_pricing.sql
-- Purpose: Outcome-based pricing tier for pros. Pros opt into "success_only"
--          and pay nothing at brief-accept time; instead they pay a higher
--          multiple of the standard cost AT outcome-submit time, but only if
--          the consumer marks the outcome 'completed'. Aligns marketplace
--          incentives with consumer outcomes and creates a premium tier that
--          punishes lead farmers.
--
-- Schema changes:
--   - professionals.pricing_tier text (default 'standard', CHECK)
--   - advisor_auctions.pricing_tier_at_accept text (snapshot at accept time
--     so a later tier change on the pro doesn't retroactively rewrite history)
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + DROP/ADD CHECK.
--
-- Rollback:
--   ALTER TABLE professionals
--     DROP CONSTRAINT IF EXISTS professionals_pricing_tier_check,
--     DROP COLUMN IF EXISTS pricing_tier;
--   ALTER TABLE advisor_auctions
--     DROP COLUMN IF EXISTS pricing_tier_at_accept;
--
-- Risk: low — additive columns, defaults preserve the existing 'standard'
-- behaviour for every existing pro.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'standard';

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_pricing_tier_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_pricing_tier_check
  CHECK (pricing_tier IN ('standard', 'success_only'));

ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS pricing_tier_at_accept text;

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_pricing_tier_at_accept_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_pricing_tier_at_accept_check
  CHECK (
    pricing_tier_at_accept IS NULL
    OR pricing_tier_at_accept IN ('standard', 'success_only')
  );

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_pricing_tier_pending
  ON public.advisor_auctions (pricing_tier_at_accept, accepted_at)
  WHERE pricing_tier_at_accept = 'success_only';

COMMIT;
