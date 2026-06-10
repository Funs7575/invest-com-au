-- Date: 2026-07-31
-- Audit ref: docs/plans/PLATFORM_EXPANSION_BRIEF.md
-- Queue item: PX-01 (Slack lead alerts)
-- Why: Advisors need real-time Slack notifications when a lead is matched to them.
--   Adding a nullable slack_webhook_url column lets each professional store their
--   Slack Incoming Webhook URL — no separate integration table needed.
-- Idempotency: IF NOT EXISTS guard on the ALTER; safe to re-apply.
-- Rollback: ALTER TABLE professionals DROP COLUMN IF EXISTS slack_webhook_url;

BEGIN;

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT;

COMMENT ON COLUMN professionals.slack_webhook_url IS
  'Slack Incoming Webhook URL for real-time lead notifications. '
  'Stored encrypted-at-rest by Supabase; never returned in public selects.';

COMMIT;
