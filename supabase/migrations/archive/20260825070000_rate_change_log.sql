-- rollback: DROP TABLE IF EXISTS rate_change_log;
CREATE TABLE IF NOT EXISTS rate_change_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id     integer NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  broker_slug   text NOT NULL,
  broker_name   text NOT NULL,
  product_kind  text NOT NULL,
  old_rate_bps  integer,
  new_rate_bps  integer NOT NULL,
  delta_bps     integer NOT NULL,
  direction     text NOT NULL CHECK (direction IN ('up', 'down', 'new')),
  snapshot_captured_at timestamptz NOT NULL,
  logged_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_change_log_unique_per_snapshot
  ON rate_change_log (broker_id, product_kind, snapshot_captured_at);

CREATE INDEX IF NOT EXISTS rate_change_log_logged_at_idx ON rate_change_log (logged_at DESC);
CREATE INDEX IF NOT EXISTS rate_change_log_direction_idx ON rate_change_log (direction);

ALTER TABLE rate_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_change_log_public_read"
  ON rate_change_log FOR SELECT
  USING (true);
