-- Migration: Add missing columns referenced by application code
-- These columns were defined in TypeScript types but never created in the database

-- Brokers: revenue optimization columns
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cpa_value NUMERIC;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS promoted_placement BOOLEAN DEFAULT FALSE;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS affiliate_priority TEXT CHECK (affiliate_priority IN ('high', 'medium', 'low'));

-- Professionals: advisor tier and lead tracking
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_tier TEXT DEFAULT 'bronze' CHECK (advisor_tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_lead_date TIMESTAMPTZ;
