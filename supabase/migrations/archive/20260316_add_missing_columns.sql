-- ============================================================================
-- Migration: 20260316_add_missing_columns.sql
-- Purpose: Add columns referenced by application code that were defined in
--          TypeScript types but never created in the database (brokers
--          revenue-optimization columns + professionals tier/last-lead).
-- Rollback: see reverse-order DROP COLUMN block below.
-- Risk: low — all columns are additive and nullable (or have safe defaults).
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE brokers       ADD COLUMN IF NOT EXISTS cpa_value NUMERIC;
--   2. ALTER TABLE brokers       ADD COLUMN IF NOT EXISTS promoted_placement BOOLEAN DEFAULT FALSE;
--   3. ALTER TABLE brokers       ADD COLUMN IF NOT EXISTS affiliate_priority TEXT
--        CHECK (affiliate_priority IN ('high', 'medium', 'low'));
--   4. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_tier TEXT DEFAULT 'bronze'
--        CHECK (advisor_tier IN ('bronze', 'silver', 'gold'));
--   5. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_lead_date TIMESTAMPTZ;
--
-- Rollback (in reverse order):
--   1. ALTER TABLE professionals DROP COLUMN IF EXISTS last_lead_date;
--   2. ALTER TABLE professionals DROP COLUMN IF EXISTS advisor_tier;
--      -- (CHECK constraint is dropped implicitly with the column.)
--   3. ALTER TABLE brokers       DROP COLUMN IF EXISTS affiliate_priority;
--      -- (CHECK constraint is dropped implicitly with the column.)
--   4. ALTER TABLE brokers       DROP COLUMN IF EXISTS promoted_placement;
--   5. ALTER TABLE brokers       DROP COLUMN IF EXISTS cpa_value;
--

-- Brokers: revenue optimization columns
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cpa_value NUMERIC;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS promoted_placement BOOLEAN DEFAULT FALSE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS affiliate_priority TEXT CHECK (affiliate_priority IN ('high', 'medium', 'low'));

-- Professionals: advisor tier and lead tracking
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_tier TEXT DEFAULT 'bronze' CHECK (advisor_tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_lead_date TIMESTAMPTZ;
