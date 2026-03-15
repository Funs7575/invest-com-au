ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('contacted', 'converted', 'lost', 'no_response'));
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMPTZ;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS sale_price_cents INTEGER;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS success_fee_cents INTEGER;
ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
