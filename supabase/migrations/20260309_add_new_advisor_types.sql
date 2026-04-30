-- ============================================================================
-- Migration: 20260309_add_new_advisor_types.sql
-- Purpose: Expand the professionals.type CHECK constraint from the original
--          6 types to 12 (adds insurance_broker, buyers_agent, wealth_manager,
--          aged_care_advisor, crypto_advisor, debt_counsellor).
-- Rollback: Drop the 12-value constraint and recreate the 6-value constraint —
--          BUT only if no rows reference the new values (otherwise the
--          recreated constraint will fail validation).
-- Risk: medium — reverse fails if any professionals row uses one of the 6
--       new type values; admin must DELETE / UPDATE those rows before
--       reverting the constraint.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check.
--   2. ALTER TABLE professionals ADD CONSTRAINT professionals_type_check
--      CHECK (type IN (... 12 values ...)).
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): clear or remap the 6 new types if any rows use
--   -- them, e.g.:
--   --   UPDATE professionals SET type = 'financial_planner'
--   --   WHERE type IN ('insurance_broker','buyers_agent','wealth_manager',
--   --                  'aged_care_advisor','crypto_advisor','debt_counsellor');
--   2. ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;
--   1. ALTER TABLE professionals ADD CONSTRAINT professionals_type_check
--        CHECK (type IN (
--          'smsf_accountant',
--          'financial_planner',
--          'property_advisor',
--          'tax_agent',
--          'mortgage_broker',
--          'estate_planner'
--        ));
--      -- The reverse ADD CONSTRAINT validates existing rows; will FAIL
--      -- with check_constraint_violation if any row still uses one of
--      -- the 6 new values.
-- ============================================================================

-- Migration: Add 6 new professional types to the CHECK constraint
-- Run in Supabase Dashboard > SQL Editor

-- Drop existing CHECK constraint and recreate with all 12 types
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;

ALTER TABLE professionals ADD CONSTRAINT professionals_type_check
  CHECK (type IN (
    'smsf_accountant',
    'financial_planner',
    'property_advisor',
    'tax_agent',
    'mortgage_broker',
    'estate_planner',
    'insurance_broker',
    'buyers_agent',
    'wealth_manager',
    'aged_care_advisor',
    'crypto_advisor',
    'debt_counsellor'
  ));
