-- Add offer/deal fields to professionals table
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
