-- ============================================================
-- 20260316: Lead confirmation flow
-- ============================================================
--
-- Adds advisor_notified_at to leads to track when the advisor was
-- emailed. NULL = not yet notified; timestamp = notification sent.
-- Enables a 15-minute confirmation hold so users can revoke intent
-- before the advisor is contacted, plus a partial index used by
-- the cron that drains unnotified leads.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   DROP INDEX IF EXISTS idx_leads_unnotified;
--   ALTER TABLE leads DROP COLUMN IF EXISTS advisor_notified_at;
--
-- Risk: low — additive nullable column + partial index.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS advisor_notified_at TIMESTAMPTZ NULL;

-- Index for the cron that processes unnotified leads
CREATE INDEX IF NOT EXISTS idx_leads_unnotified
  ON leads (created_at)
  WHERE advisor_notified_at IS NULL AND lead_type = 'advisor' AND professional_id IS NOT NULL;
