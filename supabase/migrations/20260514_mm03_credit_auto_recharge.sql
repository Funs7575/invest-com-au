-- ============================================================================
-- Migration: 20260514_mm03_credit_auto_recharge.sql
-- Purpose: Auto-recharge for the brief-marketplace credit balance.
--          Adds saved-payment-method + threshold-trigger columns to
--          `professionals` so providers can opt into automatic top-ups
--          when their balance drops below a chosen threshold.
--
-- Columns:
--   stripe_customer_id          — Stripe Customer ID (cus_…) for saved cards
--   stripe_default_payment_method — Stripe Payment Method ID (pm_…) attached
--                                   to the customer; charged for auto-recharge
--   auto_recharge_enabled       — opt-in flag
--   auto_recharge_threshold_credits — recharge when balance < N credits
--   auto_recharge_pack_slug     — which marketplace pack to buy each time
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
--
-- Risk: low — additive on existing professionals table.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_default_payment_method text,
  ADD COLUMN IF NOT EXISTS auto_recharge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_recharge_threshold_credits int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_recharge_pack_slug text,
  ADD COLUMN IF NOT EXISTS auto_recharge_last_attempted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_professionals_auto_recharge
  ON public.professionals (auto_recharge_enabled)
  WHERE auto_recharge_enabled = true;

COMMIT;
