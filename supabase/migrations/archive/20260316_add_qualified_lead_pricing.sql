-- ============================================================================
-- Migration: 20260316_add_qualified_lead_pricing.sql
-- Purpose: Introduce tiered lead pricing (standard / qualified / exclusive)
--          on lead_pricing, plus 5 qualification-related columns on
--          professional_leads, and 2 supporting indexes.
-- Rollback: Drop indexes, then drop added columns. The qualified/exclusive
--          price values backfilled by the UPDATE step cannot be
--          reconstructed automatically.
-- Risk: medium — reverse DROP COLUMN on populated tables loses tier
--       pricing, qualification data, quality scores, and bill amounts.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE lead_pricing ADD COLUMN IF NOT EXISTS
--      qualified_price_cents, exclusive_price_cents.
--   2. UPDATE lead_pricing SET qualified_price_cents = price_cents * 2,
--      exclusive_price_cents = price_cents * 3
--      WHERE qualified_price_cents IS NULL.
--   3. ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS
--      qualification_data, lead_tier (default 'standard').
--   4. ALTER TABLE professional_leads ADD COLUMN IF NOT EXISTS
--      quality_score, quality_signals, bill_amount_cents.
--   5. CREATE INDEX idx_leads_tier, idx_leads_quality_score.
--
-- Rollback (in reverse order):
--   5. DROP INDEX IF EXISTS public.idx_leads_quality_score;
--      DROP INDEX IF EXISTS public.idx_leads_tier;
--   4. ALTER TABLE professional_leads DROP COLUMN IF EXISTS bill_amount_cents;
--      ALTER TABLE professional_leads DROP COLUMN IF EXISTS quality_signals;
--      ALTER TABLE professional_leads DROP COLUMN IF EXISTS quality_score;
--   3. ALTER TABLE professional_leads DROP COLUMN IF EXISTS lead_tier;
--      ALTER TABLE professional_leads DROP COLUMN IF EXISTS qualification_data;
--   2. (No reverse — backfilled values are derived from price_cents and
--      can be recomputed by re-running the forward UPDATE; original NULLs
--      were the pre-state.)
--   1. ALTER TABLE lead_pricing DROP COLUMN IF EXISTS exclusive_price_cents;
--      ALTER TABLE lead_pricing DROP COLUMN IF EXISTS qualified_price_cents;
--      -- DESTRUCTIVE on populated rows: any operator-edited tier prices
--      -- diverging from the 2x/3x default are lost.
-- ============================================================================

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
