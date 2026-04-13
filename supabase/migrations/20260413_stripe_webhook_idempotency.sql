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
