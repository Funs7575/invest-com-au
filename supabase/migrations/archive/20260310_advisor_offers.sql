-- ============================================================
-- 20260310: Advisor offers / deals on professionals
-- ============================================================
--
-- Adds offer_text, offer_terms, offer_expiry, offer_active columns
-- to professionals so each advisor can publish a current promotion
-- on their listing. Seeds a few sample offers for verified advisors
-- across financial planner / SMSF / property / crypto types.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   DROP INDEX IF EXISTS idx_professionals_offer_active;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS offer_active;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS offer_expiry;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS offer_terms;
--   ALTER TABLE professionals DROP COLUMN IF EXISTS offer_text;
--
-- Risk: low — additive columns; seed UPDATEs are idempotent
-- (deterministic WHERE clauses, idempotent values).
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS offer_text TEXT,
  ADD COLUMN IF NOT EXISTS offer_terms TEXT,
  ADD COLUMN IF NOT EXISTS offer_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS offer_active BOOLEAN DEFAULT false;

-- Index for active offers
CREATE INDEX IF NOT EXISTS idx_professionals_offer_active ON professionals (offer_active) WHERE offer_active = true;

-- Seed some sample offers for existing advisors
UPDATE professionals SET offer_text = 'Free 30-min initial consultation', offer_active = true WHERE type = 'financial_planner' AND verified = true AND id <= (SELECT id FROM professionals WHERE type = 'financial_planner' AND verified = true ORDER BY id LIMIT 1 OFFSET 2);
UPDATE professionals SET offer_text = 'First SMSF compliance review at 50% off', offer_active = true WHERE type = 'smsf_accountant' AND verified = true AND id <= (SELECT id FROM professionals WHERE type = 'smsf_accountant' AND verified = true ORDER BY id LIMIT 1 OFFSET 2);
UPDATE professionals SET offer_text = '20% off first property strategy session', offer_active = true WHERE type = 'property_advisor' AND verified = true AND id <= (SELECT id FROM professionals WHERE type = 'property_advisor' AND verified = true ORDER BY id LIMIT 1 OFFSET 1);
UPDATE professionals SET offer_text = 'Free crypto tax health check', offer_active = true WHERE type = 'crypto_advisor' AND verified = true AND id <= (SELECT id FROM professionals WHERE type = 'crypto_advisor' AND verified = true ORDER BY id LIMIT 1 OFFSET 1);
