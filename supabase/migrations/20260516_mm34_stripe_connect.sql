-- ============================================================================
-- Migration: 20260516_mm34_stripe_connect.sql
-- Purpose: Stripe Connect Express marketplace payouts. Pros onboard via
--          Connect to receive payouts from consumer payments routed through
--          the platform. Platform takes a configurable application fee
--          (default 10% = 1000 bps). Each consumer→pro payment is recorded
--          in marketplace_payments with status synced from Stripe webhooks.
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + CREATE TABLE IF NOT EXISTS.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.marketplace_payments;
--   ALTER TABLE public.professionals
--     DROP CONSTRAINT IF EXISTS professionals_stripe_connect_status_check,
--     DROP COLUMN IF EXISTS stripe_connect_account_id,
--     DROP COLUMN IF EXISTS stripe_connect_status,
--     DROP COLUMN IF EXISTS stripe_connect_payouts_enabled,
--     DROP COLUMN IF EXISTS stripe_connect_charges_enabled;
--
-- Risk: low — additive columns + new table. Existing pros default to
-- 'not_connected'; no impact on subscription billing (separate column set).
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id       text,
  ADD COLUMN IF NOT EXISTS stripe_connect_status           text NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled  boolean NOT NULL DEFAULT false;

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_stripe_connect_status_check;
ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_stripe_connect_status_check
  CHECK (stripe_connect_status IN ('not_connected','onboarding','active','restricted','rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_professionals_connect_account_id
  ON public.professionals (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketplace_payments (
  id                          bigserial PRIMARY KEY,
  brief_id                    integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  consumer_email              text NOT NULL,
  consumer_user_id            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  professional_id             integer NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  amount_cents                integer NOT NULL CHECK (amount_cents > 0),
  platform_fee_cents          integer NOT NULL CHECK (platform_fee_cents >= 0),
  currency                    text NOT NULL DEFAULT 'aud',
  stripe_payment_intent_id    text UNIQUE,
  status                      text NOT NULL DEFAULT 'pending',
  description                 text,
  metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_payments
  DROP CONSTRAINT IF EXISTS marketplace_payments_status_check;
ALTER TABLE public.marketplace_payments
  ADD CONSTRAINT marketplace_payments_status_check
  CHECK (status IN ('pending','succeeded','refunded','failed','canceled'));

CREATE INDEX IF NOT EXISTS idx_marketplace_payments_pro_status
  ON public.marketplace_payments (professional_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_payments_brief_status
  ON public.marketplace_payments (brief_id, status);

ALTER TABLE public.marketplace_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro sees own payments" ON public.marketplace_payments;
CREATE POLICY "pro sees own payments"
  ON public.marketplace_payments
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "consumer sees own payments" ON public.marketplace_payments;
CREATE POLICY "consumer sees own payments"
  ON public.marketplace_payments
  FOR SELECT
  TO authenticated
  USING (
    consumer_user_id = auth.uid()
    OR consumer_email = auth.email()
  );

COMMIT;
