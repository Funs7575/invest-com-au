-- Date: 2026-04-26
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §7 SEC-07 / 2026-04-26 audit §7
-- Queue item: K-07b
-- Why: The 30-day account-deletion grace period requires a final warning email
--      to reach users before their data is permanently erased. Without a
--      reminder_sent_at sentinel, the daily cron would email the user every
--      single day for the last 5 days of the grace period (days 25–30).
--      This column allows the cron to send exactly one reminder per user.
-- Idempotency: `IF NOT EXISTS` — safe to re-apply; re-running adds no column
--              if already present, no-ops otherwise.
-- Rollback: ALTER TABLE public.account_deletion_requests DROP COLUMN IF EXISTS reminder_sent_at;
--
-- IMPORTANT — prior schema state:
--   The parent table `account_deletion_requests` is defined in
--   `20260427_wave_security_observability.sql:175`. That migration has NOT
--   been applied to the live DB (tracked in Blocked entry
--   A-MISSING-TABLE-1). This migration is therefore also un-applied in live
--   and will become effective the day the founder applies both migrations.
--   The cron it enables (`/api/cron/account-deletion-reminder`) handles the
--   missing-table scenario gracefully by catching the DB error and logging
--   a warning rather than returning HTTP 500.

BEGIN;

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.account_deletion_requests.reminder_sent_at IS
  'Timestamp when the day-25 grace-period reminder email was sent. '
  'NULL = reminder not yet sent. Set by /api/cron/account-deletion-reminder.';

-- Index: only useful rows (scheduled + reminder not yet sent) need fast
-- access. Partial index keeps it tiny.
CREATE INDEX IF NOT EXISTS idx_acct_del_reminder_pending
  ON public.account_deletion_requests (scheduled_purge_at)
  WHERE status = 'scheduled' AND reminder_sent_at IS NULL;

COMMIT;
