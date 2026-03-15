-- ═══════════════════════════════════════════════
-- Add tiered lead pricing (standard / qualified / exclusive)
-- and qualification data storage on professional_leads
-- ═══════════════════════════════════════════════

-- Add qualified and exclusive pricing tiers to lead_pricing
ALTER TABLE lead_pricing
  ADD COLUMN IF NOT EXISTS qualified_price_cents INTEGER,
  ADD COLUMN IF NOT EXISTS exclusive_price_cents INTEGER;

-- Set defaults: qualified = 2x standard, exclusive = 3x standard
UPDATE lead_pricing SET
  qualified_price_cents = price_cents * 2,
  exclusive_price_cents = price_cents * 3
WHERE qualified_price_cents IS NULL;

-- Add qualification data and lead tier to professional_leads
ALTER TABLE professional_leads
  ADD COLUMN IF NOT EXISTS qualification_data JSONB,
  ADD COLUMN IF NOT EXISTS lead_tier TEXT DEFAULT 'standard';

-- Add quality_score and quality_signals if they don't exist yet
-- (these are used in code but may not have a migration)
ALTER TABLE professional_leads
  ADD COLUMN IF NOT EXISTS quality_score INTEGER,
  ADD COLUMN IF NOT EXISTS quality_signals JSONB,
  ADD COLUMN IF NOT EXISTS bill_amount_cents INTEGER;

-- Index for filtering leads by tier (useful for reporting)
CREATE INDEX IF NOT EXISTS idx_leads_tier ON professional_leads(lead_tier);
CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON professional_leads(quality_score DESC);
