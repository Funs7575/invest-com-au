-- ============================================================================
-- Migration: 20260515_mm24_pro_subscription_tier.sql
-- Purpose: Subscription tier on professionals — monthly fee for premium
--          listing placement + priority routing + higher accept caps. Layers
--          recurring SaaS revenue on top of the existing pay-per-accept
--          credit model.
--
-- Tiers:
--   - free       (default): existing behaviour
--   - starter    (A$29/mo):  +20% priority weight in marketplace ranking
--   - growth     (A$99/mo):  +50% priority weight, AI summary unlock, badge
--   - scale      (A$249/mo): +100% priority weight + 2× accept cap +
--                            featured-pro slot on /advisors
--
-- Storage: subscription details on the professionals row. The actual Stripe
-- subscription lifecycle is intentionally a follow-up (this migration just
-- adds the schema so the marketplace can already read & honour the tier;
-- Stripe wiring is gated behind a feature flag in app code).
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + DROP/ADD CHECK.
--
-- Rollback:
--   ALTER TABLE professionals
--     DROP CONSTRAINT IF EXISTS professionals_subscription_tier_check,
--     DROP COLUMN IF EXISTS subscription_tier,
--     DROP COLUMN IF EXISTS subscription_started_at,
--     DROP COLUMN IF EXISTS subscription_current_period_end,
--     DROP COLUMN IF EXISTS subscription_status;
--
-- Risk: low — additive columns with defaults that preserve existing
-- free-tier behaviour for every existing pro.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS subscription_tier            text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status          text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_stripe_id       text;

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_subscription_tier_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_subscription_tier_check
  CHECK (subscription_tier IN ('free','starter','growth','scale'));

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_subscription_status_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_subscription_status_check
  CHECK (subscription_status IN ('inactive','trialing','active','past_due','canceled'));

CREATE INDEX IF NOT EXISTS idx_professionals_subscription_tier
  ON public.professionals (subscription_tier)
  WHERE subscription_tier <> 'free';

COMMIT;
