-- ============================================================
-- 20260316: Lead outcome + success-fee tracking
-- ============================================================
--
-- Adds outcome, outcome_at, sale_price_cents, success_fee_cents,
-- outcome_notes to professional_leads so advisors can close the
-- loop on each lead and the platform can reconcile success-fee
-- billing against converted leads.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   ALTER TABLE professional_leads
--     DROP COLUMN IF EXISTS outcome_notes,
--     DROP COLUMN IF EXISTS success_fee_cents,
--     DROP COLUMN IF EXISTS sale_price_cents,
--     DROP COLUMN IF EXISTS outcome_at,
--     DROP COLUMN IF EXISTS outcome;
--
-- Risk: low — additive nullable columns; the outcome CHECK
-- constraint allows the four documented states.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('contacted', 'converted', 'lost', 'no_response'));
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMPTZ;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS sale_price_cents INTEGER;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS success_fee_cents INTEGER;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
