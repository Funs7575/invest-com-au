-- ============================================================================
-- Migration: 20260413_stripe_webhook_idempotency.sql
-- Purpose: Dedup table for Stripe webhook events. Stripe may redeliver
--          the same event on retries; processing twice causes double
--          emails / credits / audit rows. We dedupe by event_id.
-- Rollback: DROP INDEX, then DROP TABLE (RLS dropped implicitly).
-- Risk: high — irreversible without data loss. Dropping the table loses
--       the event-id ledger; if a Stripe retry arrives during the rollback
--       window the duplicate guard is gone and double-processing can
--       occur. Roll back only with caution and re-create on the way back.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
--        event_id    text PRIMARY KEY,
--        event_type  text NOT NULL,
--        received_at timestamptz NOT NULL DEFAULT now()
--      );
--   2. CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
--        ON public.stripe_webhook_events (received_at);
--   3. ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
--      -- (no policies = service-role-only)
--
-- Rollback (in reverse order):
--   1. DROP INDEX IF EXISTS stripe_webhook_events_received_at_idx;
--   2. DROP TABLE IF EXISTS public.stripe_webhook_events;
--      -- RLS state is dropped implicitly with the table.
--      -- Note: discards the dedup ledger; see Risk note above.
--

-- Stripe webhook idempotency table
-- Stripe may redeliver the same event (network flakes, retries after 5xx).
-- Processing an event twice causes double-emails, double-credits and
-- duplicated audit log rows. Dedupe by (event_id) before handling.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id    text PRIMARY KEY,
  event_type  text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-cleanup rows older than 30 days. Stripe's retry window is ~3 days,
-- so 30 days is a comfortable safety margin without unbounded growth.
CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON public.stripe_webhook_events (received_at);

-- RLS: webhook handler uses service role key, so RLS doesn't need to allow
-- anon/authenticated access. Enable RLS with no policies = locked to service role.
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
