-- ============================================================================
-- Migration: 20260801002000_firm_subscriptions.sql
-- Purpose: Idea #13 — firm-wide seat-based subscription billing. Sits on
--          the firm_pricing_tiers (Phase 4.1) + advisor_firms membership
--          pattern. One subscription row per firm tracks seat count, tier,
--          and Stripe lifecycle, so a multi-advisor practice pays one
--          predictable bill instead of per-advisor invoices.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 4, #13)
-- Risk: low — additive table; billing lifecycle driven by Stripe webhooks
--             (handlers added when the firm-billing SKU goes live).
-- Rollback: BEGIN; DROP TABLE IF EXISTS public.firm_subscriptions; COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.firm_subscriptions (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  firm_id                 integer NOT NULL UNIQUE REFERENCES public.advisor_firms(id) ON DELETE CASCADE,
  pricing_tier_id         bigint REFERENCES public.firm_pricing_tiers(id) ON DELETE SET NULL,
  seats                   integer NOT NULL DEFAULT 1 CHECK (seats >= 1),
  status                  text NOT NULL DEFAULT 'trialing'
                          CHECK (status IN ('trialing','active','past_due','canceled','incomplete')),
  stripe_subscription_id  text UNIQUE,
  stripe_customer_id      text,
  current_period_end      timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_subscriptions_status
  ON public.firm_subscriptions (status) WHERE status IN ('active','trialing');
CREATE INDEX IF NOT EXISTS idx_firm_subscriptions_stripe
  ON public.firm_subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

ALTER TABLE public.firm_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_subscriptions FORCE ROW LEVEL SECURITY;

-- Firm admins read their own firm's subscription; service_role manages.
DROP POLICY IF EXISTS "firm admin reads own subscription" ON public.firm_subscriptions;
CREATE POLICY "firm admin reads own subscription"
  ON public.firm_subscriptions FOR SELECT
  TO authenticated
  USING (
    firm_id IN (
      SELECT firm_id FROM public.professionals
      WHERE auth_user_id = auth.uid() AND is_firm_admin = true
    )
  );

DROP POLICY IF EXISTS "service_role full access firm_subscriptions" ON public.firm_subscriptions;
CREATE POLICY "service_role full access firm_subscriptions"
  ON public.firm_subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER firm_subscriptions_updated_at
  BEFORE UPDATE ON public.firm_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
