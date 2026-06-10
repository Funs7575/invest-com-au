-- rollback: DROP TABLE IF EXISTS user_rate_memory;
CREATE TABLE IF NOT EXISTS user_rate_memory (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  broker_id         integer NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  product_kind      text NOT NULL,
  last_seen_rate_bps  integer NOT NULL,
  last_seen_at      timestamptz NOT NULL DEFAULT now(),
  notified_rate_bps integer,
  notified_at       timestamptz,
  UNIQUE (user_id, broker_id, product_kind)
);

CREATE INDEX IF NOT EXISTS user_rate_memory_user_idx ON user_rate_memory (user_id);
CREATE INDEX IF NOT EXISTS user_rate_memory_broker_idx ON user_rate_memory (broker_id);

ALTER TABLE user_rate_memory ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own rate memory
CREATE POLICY "user_rate_memory_own"
  ON user_rate_memory
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all rows (for cron)
CREATE POLICY "user_rate_memory_service_read"
  ON user_rate_memory FOR SELECT
  TO service_role
  USING (true);
