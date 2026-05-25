-- ============================================================================
-- Migration: 20260521000000_firm_branded_profile_subscription.sql
-- Purpose: B2 firm branded-profile subscription tier. Lets a firm pay for an
--          enhanced /firm/[slug] profile (custom hero, featured specialties,
--          booking embed). The subscription state + entitlement flag live on
--          advisor_firms; the Stripe lifecycle webhook flips them.
--
--   1. advisor_firms.branded_profile_active boolean — the entitlement gate.
--      /firm/[slug] renders the enhanced components only when this is true.
--      Defaults false → every existing firm keeps its free profile unchanged.
--   2. advisor_firms.branded_profile_status text — mirror of the Stripe
--      subscription status ('active','trialing','past_due','canceled',
--      'inactive'). Lets the upgrade page show "past due — update card".
--   3. advisor_firms.branded_profile_subscription_id text — Stripe
--      subscription id, for reconciliation + the customer portal.
--   4. advisor_firms.branded_profile_period_end timestamptz — current period
--      end; surfaced on the upgrade page ("renews on …").
--   5. advisor_firms.branded_profile_stripe_customer_id text — the firm's
--      billing customer (distinct from any individual advisor's customer).
--   6. Custom-content columns the enhanced profile renders:
--        - hero_tagline text
--        - hero_image_url text
--        - featured_specialties text[]
--        - booking_embed_url text
--      These are inert for free firms (gated behind branded_profile_active).
--
-- RLS: advisor_firms already has RLS enabled with a "Public can read active
--      firms" SELECT policy + a service-role ALL policy (see
--      20260310_advisor_firms_and_invitations.sql). New columns inherit those
--      policies — the entitlement flag is public-readable (needed for the
--      anon-rendered /firm/[slug] page) and only the service-role webhook /
--      admin writes it. No new policy required.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + DROP CONSTRAINT IF EXISTS / ADD.
-- Rollback (destructive):
--   ALTER TABLE advisor_firms
--     DROP COLUMN IF EXISTS branded_profile_active,
--     DROP COLUMN IF EXISTS branded_profile_status,
--     DROP COLUMN IF EXISTS branded_profile_subscription_id,
--     DROP COLUMN IF EXISTS branded_profile_period_end,
--     DROP COLUMN IF EXISTS branded_profile_stripe_customer_id,
--     DROP COLUMN IF EXISTS hero_tagline,
--     DROP COLUMN IF EXISTS hero_image_url,
--     DROP COLUMN IF EXISTS featured_specialties,
--     DROP COLUMN IF EXISTS booking_embed_url;
-- ============================================================================

BEGIN;

ALTER TABLE public.advisor_firms
  ADD COLUMN IF NOT EXISTS branded_profile_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branded_profile_status text,
  ADD COLUMN IF NOT EXISTS branded_profile_subscription_id text,
  ADD COLUMN IF NOT EXISTS branded_profile_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS branded_profile_stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS hero_tagline text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS featured_specialties text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS booking_embed_url text;

-- Constrain the status mirror to the buckets the app understands.
ALTER TABLE public.advisor_firms
  DROP CONSTRAINT IF EXISTS advisor_firms_branded_profile_status_check;
ALTER TABLE public.advisor_firms
  ADD CONSTRAINT advisor_firms_branded_profile_status_check
  CHECK (
    branded_profile_status IS NULL
    OR branded_profile_status IN (
      'active', 'trialing', 'past_due', 'canceled', 'inactive'
    )
  );

-- Reconciliation lookup: webhook resolves a firm by its Stripe subscription
-- id when the metadata firm_id is absent on a retried event.
CREATE INDEX IF NOT EXISTS idx_advisor_firms_branded_subscription
  ON public.advisor_firms (branded_profile_subscription_id)
  WHERE branded_profile_subscription_id IS NOT NULL;

COMMIT;
