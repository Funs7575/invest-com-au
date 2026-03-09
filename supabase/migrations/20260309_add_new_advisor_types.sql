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
