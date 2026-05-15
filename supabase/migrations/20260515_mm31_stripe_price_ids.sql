-- ============================================================================
-- Migration: 20260515_mm31_stripe_price_ids.sql
-- Purpose: Marker migration for the mm31 Stripe billing wiring. The actual
--          Price IDs live in env vars (STRIPE_PRICE_ID_STARTER / _GROWTH /
--          _SCALE) so they can roll forward independently per environment
--          (test/live mode price IDs differ). The only schema concern is
--          ensuring `professionals.stripe_customer_id` is present — this is
--          already added by 20260514_mm03_credit_auto_recharge.sql, so this
--          migration is a defensive idempotent guard for cleanly-built test
--          databases that may run mm31 without mm03.
--
-- Adds:
--   - professionals.stripe_customer_id  (idempotent, already added in mm03)
--   - idx_professionals_stripe_customer_id partial index — fast O(log n)
--     lookup from webhook handlers ("which pro owns this Stripe customer?")
--
-- Env vars (set in prod before flipping the feature flag):
--   STRIPE_PRICE_ID_STARTER  — Stripe Price ID for the $29/mo Starter tier
--   STRIPE_PRICE_ID_GROWTH   — Stripe Price ID for the $99/mo Growth tier
--   STRIPE_PRICE_ID_SCALE    — Stripe Price ID for the $249/mo Scale tier
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_professionals_stripe_customer_id;
--   -- Leave stripe_customer_id column — it's also used by mm03 auto-recharge.
--
-- Risk: low — single additive index. No data writes, no constraint changes.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_professionals_stripe_customer_id
  ON public.professionals (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMIT;
