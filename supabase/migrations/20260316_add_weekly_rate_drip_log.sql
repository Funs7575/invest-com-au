CREATE TABLE IF NOT EXISTS weekly_rate_drip_log (
  id BIGSERIAL PRIMARY KEY,
  email_capture_id BIGINT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weekly_rate_drip_email ON weekly_rate_drip_log(email_capture_id);
ALTER TABLE weekly_rate_drip_log ENABLE ROW LEVEL SECURITY;
