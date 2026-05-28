-- rollback: DROP TABLE IF EXISTS user_health_score_log;
CREATE TABLE IF NOT EXISTS user_health_score_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  overall          integer NOT NULL,
  diversification  integer NOT NULL,
  cost             integer NOT NULL,
  risk_alignment   integer NOT NULL,
  engagement       integer NOT NULL,
  scored_month     date NOT NULL,
  scored_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scored_month)
);

CREATE INDEX IF NOT EXISTS user_health_score_log_user_idx ON user_health_score_log (user_id, scored_month DESC);

ALTER TABLE user_health_score_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_health_score_log_own_read"
  ON user_health_score_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_health_score_log_service_all"
  ON user_health_score_log
  TO service_role
  USING (true)
  WITH CHECK (true);
