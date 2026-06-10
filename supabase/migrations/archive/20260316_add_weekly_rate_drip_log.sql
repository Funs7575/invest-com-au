-- ============================================================
-- 20260316: Weekly rate drip log
-- ============================================================
--
-- Tracks which email_captures have already received the weekly
-- savings/term-deposit rate digest, so the cron does not double-send.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   ALTER TABLE weekly_rate_drip_log DISABLE ROW LEVEL SECURITY;
--   DROP INDEX IF EXISTS idx_weekly_rate_drip_email;
--   DROP TABLE IF EXISTS weekly_rate_drip_log;
--
-- Risk: low — new isolated table, RLS enabled (no policies — only
-- service_role writes from the cron).
-- All operations use IF NOT EXISTS to be idempotent on re-run.

CREATE TABLE IF NOT EXISTS weekly_rate_drip_log (
  id BIGSERIAL PRIMARY KEY,
  email_capture_id BIGINT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weekly_rate_drip_email ON weekly_rate_drip_log(email_capture_id);
ALTER TABLE weekly_rate_drip_log ENABLE ROW LEVEL SECURITY;
