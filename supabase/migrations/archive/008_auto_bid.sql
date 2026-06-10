-- ============================================================================
-- Migration: 008_auto_bid.sql
-- Purpose: Add auto-bid (target CPA) bid strategy support to campaigns —
--          new bid_strategy column + supporting target_cpa / auto_bid range
--          columns + 5 CHECK constraints + a partial index for the cron.
-- Rollback: drop the constraints, the partial index, then the 6 columns
--           in reverse order. See block below.
-- Risk: medium — campaigns is a populated table; reverse drops 6 columns
--       and any auto-bid configuration is lost. Reversal is structurally
--       safe (no FK), but restores the system to manual-only bidding.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bid_strategy             TEXT NOT NULL DEFAULT 'manual';
--   2. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_cpa_cents         INTEGER;
--   3. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_min_cents       INTEGER DEFAULT 5;
--   4. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_max_cents       INTEGER;
--   5. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_current_cents   INTEGER;
--   6. ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_last_adjusted_at TIMESTAMPTZ;
--   7. ALTER TABLE campaigns ADD CONSTRAINT chk_target_cpa_required ...;
--   8. ALTER TABLE campaigns ADD CONSTRAINT chk_bid_strategy_valid ...;
--   9. ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_min_positive ...;
--  10. ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_max_positive ...;
--  11. ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_max_gte_min ...;
--  12. CREATE INDEX IF NOT EXISTS idx_campaigns_auto_bid
--        ON campaigns (status, bid_strategy) WHERE bid_strategy = 'target_cpa';
--
-- Rollback (in reverse order):
--   1. DROP INDEX IF EXISTS idx_campaigns_auto_bid;
--   2. ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_auto_bid_max_gte_min;
--   3. ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_auto_bid_max_positive;
--   4. ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_auto_bid_min_positive;
--   5. ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_bid_strategy_valid;
--   6. ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS chk_target_cpa_required;
--   7. ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_bid_last_adjusted_at;
--   8. ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_bid_current_cents;
--   9. ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_bid_max_cents;
--  10. ALTER TABLE campaigns DROP COLUMN IF EXISTS auto_bid_min_cents;
--  11. ALTER TABLE campaigns DROP COLUMN IF EXISTS target_cpa_cents;
--  12. ALTER TABLE campaigns DROP COLUMN IF EXISTS bid_strategy;
--  -- COMMENTs on dropped columns are removed implicitly with the columns.
--

-- 008_auto_bid.sql
-- Add auto-bid (target CPA) bid strategy support to campaigns.
-- Brokers can set a target cost-per-acquisition and the system
-- automatically optimizes their CPC bid based on historical
-- conversion data.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS bid_strategy TEXT NOT NULL DEFAULT 'manual';
-- 'manual' = fixed rate_cents, 'target_cpa' = auto-optimize bid

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_cpa_cents INTEGER;
-- Target cost per conversion in cents

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_min_cents INTEGER DEFAULT 5;
-- Floor for auto-bid (don't go below this CPC)

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_max_cents INTEGER;
-- Ceiling for auto-bid (don't go above this CPC)

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_current_cents INTEGER;
-- Current calculated optimal bid (updated by cron)

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS auto_bid_last_adjusted_at TIMESTAMPTZ;
-- Timestamp of the last auto-bid adjustment

COMMENT ON COLUMN campaigns.bid_strategy IS 'manual = fixed rate_cents bid, target_cpa = auto-optimized';
COMMENT ON COLUMN campaigns.target_cpa_cents IS 'Target cost per acquisition in cents (only used when bid_strategy = target_cpa)';
COMMENT ON COLUMN campaigns.auto_bid_min_cents IS 'Minimum CPC floor for auto-bid in cents';
COMMENT ON COLUMN campaigns.auto_bid_max_cents IS 'Maximum CPC ceiling for auto-bid in cents';
COMMENT ON COLUMN campaigns.auto_bid_current_cents IS 'Current auto-calculated optimal CPC bid in cents';
COMMENT ON COLUMN campaigns.auto_bid_last_adjusted_at IS 'When the auto-bid optimizer last adjusted this campaign';

-- Constraint: target_cpa_cents must be set when bid_strategy is target_cpa
ALTER TABLE campaigns ADD CONSTRAINT chk_target_cpa_required
  CHECK (bid_strategy = 'manual' OR target_cpa_cents IS NOT NULL);

-- Constraint: bid_strategy must be one of the known values
ALTER TABLE campaigns ADD CONSTRAINT chk_bid_strategy_valid
  CHECK (bid_strategy IN ('manual', 'target_cpa'));

-- Constraint: auto_bid bounds must be positive when set
ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_min_positive
  CHECK (auto_bid_min_cents IS NULL OR auto_bid_min_cents > 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_max_positive
  CHECK (auto_bid_max_cents IS NULL OR auto_bid_max_cents > 0);
ALTER TABLE campaigns ADD CONSTRAINT chk_auto_bid_max_gte_min
  CHECK (auto_bid_max_cents IS NULL OR auto_bid_min_cents IS NULL OR auto_bid_max_cents >= auto_bid_min_cents);

-- Index for the cron job to quickly find auto-bid campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_auto_bid
  ON campaigns (status, bid_strategy)
  WHERE bid_strategy = 'target_cpa';
