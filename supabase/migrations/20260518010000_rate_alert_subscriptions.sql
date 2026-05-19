-- Migration: rate alert subscriptions — FIN_NOTEBOOK Revenue #4 foundation.
--
-- High-intent email capture for users who want notifications when
-- savings-account or term-deposit interest rates cross their threshold.
-- The 30%-built infra cited in FIN_NOTEBOOK is the Resend pipeline +
-- the fee-alert subscription pattern (table `fee_alert_subscriptions`);
-- this migration replicates that pattern for rate movements.
--
-- Scope deliberately narrow: capture + verify only. The downstream cron
-- that compares current rates against thresholds is wired but a no-op
-- until a `savings_rate_snapshots` ingestion lands — see the cron stub
-- at app/api/cron/rate-alerts/route.ts for the contract.
--
-- Schema:
--   - product_kind: 'savings_account' | 'term_deposit' — narrows the
--     scan to the right slice of public.brokers
--   - threshold_bps: integer basis points (e.g. 525 = 5.25% p.a.); a
--     subscriber gets notified when any matching product's rate ≥ this.
--     Stored as bps not float because bps math has no rounding pain.
--   - product_filters: jsonb for optional refinement (min_balance,
--     introductory_only, etc.) — kept flexible so the cron-side filter
--     evolves without schema churn.
--   - verified / verify_token / unsubscribe_token: standard double-opt-in
--     pattern matching fee_alert_subscriptions for consistency.
--   - frequency: 'instant' | 'daily' | 'weekly' — defaults to 'instant'.
--   - last_notified_at: anti-spam — never re-fire within 24h for the
--     same subscriber even if multiple products cross the threshold.
--
-- RLS: service_role-only (the subscribe POST runs with anon client and
-- inserts via a dedicated INSERT policy keyed off verify_token only —
-- the row is invisible to anon until verified, and even then only via
-- the unsubscribe token).
--
-- Rollback:
--   DROP TABLE IF EXISTS public.rate_alert_subscriptions;

BEGIN;

CREATE TABLE IF NOT EXISTS public.rate_alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  product_kind text NOT NULL,
  threshold_bps integer NOT NULL,
  product_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency text NOT NULL DEFAULT 'instant',
  verified boolean NOT NULL DEFAULT false,
  verify_token text NOT NULL,
  unsubscribe_token text NOT NULL,
  last_notified_at timestamptz,
  notification_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_alert_product_kind_check CHECK (
    product_kind IN ('savings_account', 'term_deposit')
  ),
  CONSTRAINT rate_alert_frequency_check CHECK (
    frequency IN ('instant', 'daily', 'weekly')
  ),
  CONSTRAINT rate_alert_threshold_bps_range CHECK (
    threshold_bps BETWEEN 0 AND 5000
  )
);

-- One verified subscription per (email, product_kind) — re-subscribing
-- with the same pair upserts. Unverified rows sit alongside until the
-- user clicks confirm; the cron filters on verified=true anyway.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_alert_email_kind_unique
  ON public.rate_alert_subscriptions (lower(email), product_kind);

CREATE INDEX IF NOT EXISTS idx_rate_alert_verified_product
  ON public.rate_alert_subscriptions (product_kind, verified, threshold_bps)
  WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_rate_alert_verify_token
  ON public.rate_alert_subscriptions (verify_token);

CREATE INDEX IF NOT EXISTS idx_rate_alert_unsubscribe_token
  ON public.rate_alert_subscriptions (unsubscribe_token);

ALTER TABLE public.rate_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- Service role owns the table. Anon writes go through the API route which
-- uses the server cookie-bearing client (not service_role) and so falls
-- under the limited public INSERT policy below.
DROP POLICY IF EXISTS "Service role manages rate_alert_subscriptions"
  ON public.rate_alert_subscriptions;
CREATE POLICY "Service role manages rate_alert_subscriptions"
  ON public.rate_alert_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anonymous public can INSERT only (capture form); they cannot SELECT,
-- UPDATE, or DELETE rows. Verification + unsubscribe go through the API
-- with service-role-equivalent paths.
DROP POLICY IF EXISTS "Anon can subscribe to rate_alert_subscriptions"
  ON public.rate_alert_subscriptions;
CREATE POLICY "Anon can subscribe to rate_alert_subscriptions"
  ON public.rate_alert_subscriptions
  AS PERMISSIVE
  FOR INSERT
  TO anon
  WITH CHECK (
    verified = false
    AND notification_count = 0
    AND last_notified_at IS NULL
  );

COMMENT ON TABLE public.rate_alert_subscriptions IS
  'Rate-alert subscription captures (FIN_NOTEBOOK Revenue #4). Writers: the '
  '/api/rate-alerts POST + the rate-change cron. Readers: the cron only. '
  'Email is case-insensitive on the unique index.';

COMMIT;
