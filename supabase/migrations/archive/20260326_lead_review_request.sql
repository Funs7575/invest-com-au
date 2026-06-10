-- ============================================================
-- 20260326: Track review-request emails sent from advisor portal
-- ============================================================
--
-- Adds review_requested_at to professional_leads so the advisor
-- portal can record when a follow-up review-request email was
-- dispatched and avoid double-sending.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   ALTER TABLE professional_leads DROP COLUMN IF EXISTS review_requested_at;
--
-- Risk: low — single additive nullable timestamp.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE professional_leads
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN professional_leads.review_requested_at IS 'Timestamp when the advisor sent a review request email to the user. NULL = not yet sent.';
