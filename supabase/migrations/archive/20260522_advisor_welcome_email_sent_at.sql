-- Add welcome_email_sent_at to professionals table.
-- Tracks when the 24h post-activation welcome email was sent so the
-- advisor-welcome-sequence cron can skip advisors who already received it.
--
-- Rollback: ALTER TABLE professionals DROP COLUMN IF EXISTS welcome_email_sent_at;

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN professionals.welcome_email_sent_at IS
  'Timestamp when the post-activation welcome email (sent ~24h after activation) was delivered. '
  'NULL means the welcome email has not yet been sent.';
