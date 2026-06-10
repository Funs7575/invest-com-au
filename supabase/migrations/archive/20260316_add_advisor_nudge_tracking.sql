-- ============================================================
-- 20260316: Advisor nudge tracking on professional_leads
-- ============================================================
--
-- Adds advisor_nudge_sent_at so the nudge cron can record when an
-- advisor was prompted to follow up on a stalled lead and avoid
-- repeated nudges.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   ALTER TABLE professional_leads DROP COLUMN IF EXISTS advisor_nudge_sent_at;
--
-- Risk: low — single additive nullable timestamp.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS advisor_nudge_sent_at TIMESTAMPTZ;
