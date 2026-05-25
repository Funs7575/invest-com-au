-- Migration: API billing tiers — self-serve Stripe subscriptions for API keys.
--
-- Adds:
--   1. `stripe_subscription_id`  — the Stripe subscription that controls this key's tier.
--   2. `stripe_customer_id`      — Stripe customer (one per owner_email, reused across keys).
--   3. `requests_this_month`     — running monthly counter (reset by cron, analogous to
--                                  requests_today for the daily window).
--   4. `billing_period_start`    — UTC start of the current billing period (for the UI).
--
--   api_key_subscriptions        — join table: one row per (api_key, stripe_subscription);
--                                  lets us look up a key quickly from a subscription event.
--
-- Rollback strategy:
--   ALTER TABLE api_keys DROP COLUMN IF EXISTS stripe_subscription_id;
--   ALTER TABLE api_keys DROP COLUMN IF EXISTS stripe_customer_id;
--   ALTER TABLE api_keys DROP COLUMN IF EXISTS requests_this_month;
--   ALTER TABLE api_keys DROP COLUMN IF EXISTS billing_period_start;
--   DROP TABLE IF EXISTS api_key_subscriptions;

-- ── 1. Extend api_keys ────────────────────────────────────────────────────────

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS requests_this_month    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_period_start   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_sub
  ON api_keys(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_customer
  ON api_keys(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ── 2. Join table: api_key_subscriptions ─────────────────────────────────────
-- Allows the webhook handler to find all api_keys attached to a Stripe
-- subscription without a full-table scan.

CREATE TABLE IF NOT EXISTS api_key_subscriptions (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key_id              UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT        NOT NULL,
  stripe_customer_id      TEXT        NOT NULL,
  tier                    TEXT        NOT NULL CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  status                  TEXT        NOT NULL DEFAULT 'active',   -- active | canceled | past_due
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (api_key_id, stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_api_key_subs_sub_id
  ON api_key_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_api_key_subs_key_id
  ON api_key_subscriptions(api_key_id);

ALTER TABLE api_key_subscriptions ENABLE ROW LEVEL SECURITY;
-- Service-role only — no authenticated-user policy needed (admin/webhook use)
CREATE POLICY "Service manage api_key_subscriptions"
  ON api_key_subscriptions FOR ALL USING (true);
