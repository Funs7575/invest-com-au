-- Migration: consumer webhook registrations for the public API.
--
-- API key holders on basic+ tiers can register HTTPS endpoints to receive
-- event payloads (e.g. broker data changes, health score updates).
-- Payloads are signed with a per-registration secret (HMAC-SHA256).
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS api_consumer_webhooks;

CREATE TABLE IF NOT EXISTS api_consumer_webhooks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id   UUID        NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  events       TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. '{"broker.updated","health_score.updated"}'
  secret_hash  TEXT        NOT NULL,               -- SHA-256 of the signing secret (secret shown once)
  secret_prefix TEXT       NOT NULL,               -- first 8 chars for identification
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce max 5 webhook endpoints per key (prevents abuse)
  CONSTRAINT api_consumer_webhooks_url_len CHECK (char_length(url) <= 2048)
);

CREATE INDEX IF NOT EXISTS idx_api_consumer_webhooks_key
  ON api_consumer_webhooks(api_key_id);

ALTER TABLE api_consumer_webhooks ENABLE ROW LEVEL SECURITY;
-- Service-role only (admin/cron use the service key)
CREATE POLICY "Service manage api_consumer_webhooks"
  ON api_consumer_webhooks FOR ALL USING (true);
