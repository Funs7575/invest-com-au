-- Migration: DD-03 — session booking payments (booking + payment rail)
-- Date: 2026-05-20
-- Audit ref: codebase-health-2026-04-24.md §DD
-- Queue item: DD-03
-- Why: Enable paid advisor session bookings via Stripe Connect. Advisors set
--   a session price; consumers pay on booking; platform retains 15% via
--   application_fee_amount. Slots are claimed by the webhook on payment
--   confirmation, preventing double-booking.
-- Idempotency: All DDL uses IF NOT EXISTS / IF EXISTS guards. Safe to replay.
-- Rollback:
--   ALTER TABLE public.professionals DROP COLUMN IF EXISTS session_price_cents;
--   DROP TABLE IF EXISTS public.booking_payments;

BEGIN;

-- ── 1. Add session_price_cents to professionals ────────────────────────────
-- NULL = booking is free (existing behaviour); >0 = consumer must pay before
-- the slot is confirmed. Stored in AUD cents (e.g. 25000 = $250).

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS session_price_cents INTEGER NULL
    CONSTRAINT session_price_cents_positive CHECK (session_price_cents IS NULL OR session_price_cents > 0);

-- ── 2. Create booking_payments table ──────────────────────────────────────
-- Tracks consumer payments for advisor session bookings. Separate from
-- marketplace_payments (which is brief/auction-scoped) to avoid widening
-- the marketplace_payments.brief_id FK.
--
-- Prior policy discovery (grep supabase/migrations for booking_payments):
--   No existing CREATE TABLE or POLICY on booking_payments found.

CREATE TABLE IF NOT EXISTS public.booking_payments (
  id                       BIGSERIAL PRIMARY KEY,
  slot_id                  BIGINT NOT NULL
    REFERENCES public.advisor_booking_appointments (id) ON DELETE RESTRICT,
  professional_id          BIGINT NOT NULL
    REFERENCES public.professionals (id) ON DELETE RESTRICT,
  consumer_email           TEXT NOT NULL,
  consumer_user_id         UUID NULL
    REFERENCES auth.users (id) ON DELETE SET NULL,
  amount_cents             INTEGER NOT NULL,
  platform_fee_cents       INTEGER NOT NULL,
  currency                 TEXT NOT NULL DEFAULT 'aud',
  stripe_checkout_session_id TEXT NULL UNIQUE,
  stripe_payment_intent_id   TEXT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT booking_payments_status_check
      CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  description              TEXT NULL,
  metadata                 JSONB NOT NULL DEFAULT '{}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by slot and professional
CREATE INDEX IF NOT EXISTS idx_booking_payments_slot_id
  ON public.booking_payments (slot_id);

CREATE INDEX IF NOT EXISTS idx_booking_payments_professional_id
  ON public.booking_payments (professional_id);

CREATE INDEX IF NOT EXISTS idx_booking_payments_consumer_user_id
  ON public.booking_payments (consumer_user_id)
  WHERE consumer_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_payments_stripe_pi
  ON public.booking_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ── 3. RLS ─────────────────────────────────────────────────────────────────
-- IMPORTANT — prior policy state: table is new, no prior policies.

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments FORCE ROW LEVEL SECURITY;

-- Consumers can read their own payment rows (by user_id or email).
DROP POLICY IF EXISTS "consumer can view own booking payments" ON public.booking_payments;
CREATE POLICY "consumer can view own booking payments"
  ON public.booking_payments
  FOR SELECT
  TO authenticated
  USING (
    consumer_user_id = auth.uid()
  );

-- Advisors can view payment rows for their own slots.
DROP POLICY IF EXISTS "advisor can view payments for own slots" ON public.booking_payments;
CREATE POLICY "advisor can view payments for own slots"
  ON public.booking_payments
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals
      WHERE auth_user_id = auth.uid()
    )
  );

-- Service role gets full access (webhooks, cron, admin routes).
DROP POLICY IF EXISTS "service_role full access" ON public.booking_payments;
CREATE POLICY "service_role full access"
  ON public.booking_payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- No anonymous access — all writes go through service-role webhook.
-- TODO: human review of policy semantics if public read is ever needed.

COMMIT;
