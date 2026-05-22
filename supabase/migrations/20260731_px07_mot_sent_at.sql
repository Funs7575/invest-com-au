-- Date: 2026-07-31
-- Audit ref: docs/plans/PLATFORM_EXPANSION_BRIEF.md
-- Queue item: PX-07 (Annual Financial MOT email)
-- Why: Tracks the last time a user received their Annual MOT email so we
--   don't send more than once per year per user.
-- Idempotency: IF NOT EXISTS guard; safe to re-apply.
-- Rollback: ALTER TABLE investor_profiles DROP COLUMN IF EXISTS mot_sent_at;

BEGIN;

ALTER TABLE investor_profiles
  ADD COLUMN IF NOT EXISTS mot_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN investor_profiles.mot_sent_at IS
  'Timestamp of the last Annual Financial MOT email sent to this user. '
  'Used to enforce a one-email-per-year cap in the annual-mot cron.';

COMMIT;
