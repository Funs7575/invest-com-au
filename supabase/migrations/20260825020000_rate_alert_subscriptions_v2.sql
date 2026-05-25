-- Migration: rate_alert_subscriptions v2
--
-- Extends the existing rate_alert_subscriptions table to support:
--   - user_id (uuid, nullable): links the subscription to an auth.users row
--     when created by a signed-in user. Null = legacy email-only subscription.
--   - metric_kind: broadens the product scope beyond savings/term-deposit to
--     include 'loan_rate' (investment_loan_rates) and 'broker_fee' (brokers).
--   - direction: 'above' (rate/fee rose past threshold) or 'below' (fell below).
--   - broker_slug (nullable): for broker_fee subscriptions; identifies which broker.
--   - lender_slug (nullable): for loan_rate subscriptions; identifies which lender.
--   - last_fired_value_bps (nullable): hysteresis state — the bps value at which
--     the last notification fired; used by lib/alert-thresholds.ts to suppress
--     re-fire spam when the metric hovers near the boundary.
--
-- The product_kind constraint is widened (metric_kind subsumes it);
-- product_kind is kept for backward compatibility with the existing cron
-- but metric_kind takes precedence when non-null.
--
-- Rollback strategy:
--   ALTER TABLE public.rate_alert_subscriptions
--     DROP COLUMN IF EXISTS user_id,
--     DROP COLUMN IF EXISTS metric_kind,
--     DROP COLUMN IF EXISTS direction,
--     DROP COLUMN IF EXISTS broker_slug,
--     DROP COLUMN IF EXISTS lender_slug,
--     DROP COLUMN IF EXISTS last_fired_value_bps;
--   DROP INDEX IF EXISTS idx_rate_alert_user_id;
--   DROP INDEX IF EXISTS idx_rate_alert_user_metric;

BEGIN;

-- ── New columns ────────────────────────────────────────────────────────────────

ALTER TABLE public.rate_alert_subscriptions
  ADD COLUMN IF NOT EXISTS user_id           uuid         REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metric_kind       text,
  ADD COLUMN IF NOT EXISTS direction         text         NOT NULL DEFAULT 'above',
  ADD COLUMN IF NOT EXISTS broker_slug       text,
  ADD COLUMN IF NOT EXISTS lender_slug       text,
  ADD COLUMN IF NOT EXISTS last_fired_value_bps integer;

-- ── Constraints ────────────────────────────────────────────────────────────────

-- metric_kind may be null (legacy rows) or one of the four supported kinds.
ALTER TABLE public.rate_alert_subscriptions
  DROP CONSTRAINT IF EXISTS rate_alert_metric_kind_check;
ALTER TABLE public.rate_alert_subscriptions
  ADD CONSTRAINT rate_alert_metric_kind_check CHECK (
    metric_kind IS NULL OR
    metric_kind IN ('savings_rate', 'term_deposit', 'loan_rate', 'broker_fee')
  );

ALTER TABLE public.rate_alert_subscriptions
  DROP CONSTRAINT IF EXISTS rate_alert_direction_check;
ALTER TABLE public.rate_alert_subscriptions
  ADD CONSTRAINT rate_alert_direction_check CHECK (
    direction IN ('above', 'below')
  );

-- Widen threshold_bps to accommodate broker fees (may be very small bps)
-- and loan rates (up to ~2500 bps = 25%). Drop and recreate.
ALTER TABLE public.rate_alert_subscriptions
  DROP CONSTRAINT IF EXISTS rate_alert_threshold_bps_range;
ALTER TABLE public.rate_alert_subscriptions
  ADD CONSTRAINT rate_alert_threshold_bps_range CHECK (
    threshold_bps BETWEEN 0 AND 10000
  );

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rate_alert_user_id
  ON public.rate_alert_subscriptions (user_id)
  WHERE user_id IS NOT NULL;

-- Supports fast lookup of all subscriptions for a user × metric kind
CREATE INDEX IF NOT EXISTS idx_rate_alert_user_metric
  ON public.rate_alert_subscriptions (user_id, metric_kind)
  WHERE user_id IS NOT NULL AND metric_kind IS NOT NULL;

-- ── RLS: add authenticated-user policy ────────────────────────────────────────

-- Signed-in users can select, insert, update, delete their own rows.
DROP POLICY IF EXISTS "Users own their rate_alert_subscriptions"
  ON public.rate_alert_subscriptions;
CREATE POLICY "Users own their rate_alert_subscriptions"
  ON public.rate_alert_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON COLUMN public.rate_alert_subscriptions.user_id IS
  'auth.users FK — present when the subscription was created by a signed-in user. '
  'Null for legacy email-only (pre-v2) subscriptions.';

COMMENT ON COLUMN public.rate_alert_subscriptions.metric_kind IS
  'Discriminates the metric source: savings_rate | term_deposit | loan_rate | broker_fee. '
  'Null on legacy rows — product_kind is used instead.';

COMMENT ON COLUMN public.rate_alert_subscriptions.last_fired_value_bps IS
  'Hysteresis state: the metric value (bps) at which the last notification fired. '
  'Used by lib/alert-thresholds.ts evaluateThreshold() to prevent re-fire spam.';

COMMIT;
