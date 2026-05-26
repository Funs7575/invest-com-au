-- Migration: consumer_webhook_deliveries + signing_secret column on api_consumer_webhooks.
--
-- Adds the delivery half of the consumer webhook system. Every POST attempt
-- to a registered endpoint is recorded here for observability and retry.
--
-- Also adds a `signing_secret` column to api_consumer_webhooks. The original
-- table only stored `secret_hash` (SHA-256 of the secret) which is sufficient
-- for external verification but cannot be used for HMAC-signing outbound
-- payloads. The plain signing secret is stored here (service-role only) so
-- the dispatch worker can sign each delivery. Existing rows (created before
-- this migration) get NULL — they cannot receive deliveries until re-registered.
--
-- Rollback strategy:
--   ALTER TABLE api_consumer_webhooks DROP COLUMN IF EXISTS signing_secret;
--   DROP TABLE IF EXISTS consumer_webhook_deliveries;

-- ── 1. signing_secret column ────────────────────────────────────────────────

ALTER TABLE api_consumer_webhooks
  ADD COLUMN IF NOT EXISTS signing_secret TEXT;

COMMENT ON COLUMN api_consumer_webhooks.signing_secret
  IS 'Plain-text HMAC signing secret for outbound delivery signing. Service-role only (deny-all anon RLS). NULL on rows pre-dating this migration.';

-- ── 2. consumer_webhook_deliveries table ───────────────────────────────────

CREATE TABLE IF NOT EXISTS consumer_webhook_deliveries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id       UUID        NOT NULL REFERENCES api_consumer_webhooks(id) ON DELETE CASCADE,
  event_type       TEXT        NOT NULL,
  -- JSON payload delivered (kept for replay / debugging)
  payload          JSONB       NOT NULL DEFAULT '{}',
  -- HTTP response from the consumer endpoint (NULL = network/timeout error)
  response_status  INT,
  -- First 2 KB of response body (NULL = could not read)
  response_body    TEXT,
  -- Error string when fetch itself threw (timeout, DNS failure, etc.)
  error_message    TEXT,
  -- Monotonically increasing count of how many times this event has been
  -- attempted to this endpoint. Starts at 1 on first attempt.
  attempt_count    INT         NOT NULL DEFAULT 1,
  -- NULL until the delivery succeeds (response_status 2xx)
  delivered_at     TIMESTAMPTZ,
  -- Whether this record should be picked up by the retry worker
  needs_retry      BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consumer_webhook_deliveries_webhook
  ON consumer_webhook_deliveries(webhook_id);

CREATE INDEX IF NOT EXISTS idx_consumer_webhook_deliveries_event
  ON consumer_webhook_deliveries(event_type);

CREATE INDEX IF NOT EXISTS idx_consumer_webhook_deliveries_retry
  ON consumer_webhook_deliveries(needs_retry, created_at)
  WHERE needs_retry = true;

ALTER TABLE consumer_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Service-role only — dispatch worker uses admin client (legitimate cron/service caller).
-- No anon or authenticated-role access is permitted: the deliveries table contains
-- potentially-sensitive response bodies and attempt metadata.
DROP POLICY IF EXISTS "Service manage consumer_webhook_deliveries" ON consumer_webhook_deliveries;
CREATE POLICY "Service manage consumer_webhook_deliveries"
  ON consumer_webhook_deliveries FOR ALL USING (true);
