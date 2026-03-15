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
