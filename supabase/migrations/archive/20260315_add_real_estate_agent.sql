-- ============================================================================
-- Migration: 20260315_add_real_estate_agent.sql
-- Purpose: Add 'real_estate_agent' to the professionals type CHECK constraint
--          and seed a corresponding lead_pricing row.
-- Rollback: drop+recreate the CHECK without real_estate_agent (must first
--           ensure no professionals rows have type='real_estate_agent') and
--           DELETE the lead_pricing row by advisor_type.
-- Risk: medium — reverse CHECK will fail if any production rows have
--       type='real_estate_agent'; operator must clean those rows first.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;
--   2. ALTER TABLE professionals ADD  CONSTRAINT professionals_type_check
--        CHECK (type = ANY (ARRAY[<12 prior types> + 'real_estate_agent']));
--   3. INSERT INTO lead_pricing (advisor_type='real_estate_agent', ...)
--      ON CONFLICT (advisor_type) DO NOTHING;
--
-- Rollback (in reverse order):
--   1. DELETE FROM lead_pricing WHERE advisor_type = 'real_estate_agent';
--   2. ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;
--   3. -- Recreate the prior 12-type CHECK (matches 20260309_add_new_advisor_types.sql):
--      ALTER TABLE professionals ADD CONSTRAINT professionals_type_check
--        CHECK (type IN (
--          'smsf_accountant','financial_planner','property_advisor','tax_agent',
--          'mortgage_broker','estate_planner','insurance_broker','buyers_agent',
--          'wealth_manager','aged_care_advisor','crypto_advisor','debt_counsellor'
--        ));
--      -- Note: this will fail if any professionals row currently has
--      -- type='real_estate_agent'. Clean (re-classify or delete) those rows
--      -- before recreating the constraint.
--

-- Add real_estate_agent to the professionals type check constraint
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;
ALTER TABLE professionals ADD CONSTRAINT professionals_type_check CHECK (type = ANY (ARRAY[
  'smsf_accountant', 'financial_planner', 'property_advisor', 'tax_agent',
  'mortgage_broker', 'estate_planner', 'insurance_broker', 'buyers_agent',
  'wealth_manager', 'aged_care_advisor', 'crypto_advisor', 'debt_counsellor',
  'real_estate_agent'
]));

-- Add lead pricing for real estate agents
INSERT INTO lead_pricing (advisor_type, price_cents, description, min_price_cents, max_price_cents, free_trial_leads, featured_monthly_cents)
VALUES ('real_estate_agent', 5900, 'Real Estate Agents — property sales, leasing, and management leads', 3900, 9900, 2, 14900)
ON CONFLICT (advisor_type) DO NOTHING;
