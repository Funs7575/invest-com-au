-- rollback: DROP TABLE IF EXISTS user_daily_checkins;
CREATE TABLE IF NOT EXISTS user_daily_checkins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  check_in_date  date NOT NULL,
  source         text NOT NULL DEFAULT 'unknown',
  points         integer NOT NULL DEFAULT 1,
  streak_count   integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS user_daily_checkins_user_idx ON user_daily_checkins (user_id);
CREATE INDEX IF NOT EXISTS user_daily_checkins_date_idx ON user_daily_checkins (check_in_date DESC);

ALTER TABLE user_daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_daily_checkins_own_read"
  ON user_daily_checkins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_daily_checkins_own_insert"
  ON user_daily_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_daily_checkins_own_update"
  ON user_daily_checkins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_daily_checkins_service_read"
  ON user_daily_checkins FOR SELECT
  TO service_role
  USING (true);
