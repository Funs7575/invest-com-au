-- ============================================================
-- Advisor directory extensions
-- ============================================================
--
-- 1. Extend professionals.type CHECK to include 8 new advisor types
--    that the UI already references (mining lawyers, business brokers,
--    etc.) plus the two that slipped through the stockbroker rollout
--    (stockbroker_firm, private_wealth_manager).
-- 2. Add accepts_international_clients boolean column — already in
--    the TypeScript interface (lib/types.ts) but never migrated.
--
-- ROLLBACK STRATEGY:
--   DROP CONSTRAINT professionals_type_check;
--   ALTER TABLE professionals ADD CONSTRAINT professionals_type_check
--     CHECK (type = ANY (ARRAY[ ...original 13 types... ]));
--   ALTER TABLE professionals DROP COLUMN IF EXISTS accepts_international_clients;

-- ─── 1. Extend the type CHECK to cover every UI type ───────────
ALTER TABLE professionals DROP CONSTRAINT IF EXISTS professionals_type_check;
ALTER TABLE professionals ADD CONSTRAINT professionals_type_check CHECK (type = ANY (ARRAY[
  -- Original 13 (migration 20260315)
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
  'debt_counsellor',
  'real_estate_agent',
  -- Stockbroker wave (20260413) — CHECK never updated at the time
  'stockbroker_firm',
  'private_wealth_manager',
  -- New types (this migration)
  'mining_lawyer',
  'mining_tax_advisor',
  'migration_agent',
  'business_broker',
  'commercial_lawyer',
  'rural_property_agent',
  'commercial_property_agent',
  'energy_consultant'
]));

COMMENT ON CONSTRAINT professionals_type_check ON professionals IS
  'Source of truth: lib/types.ts ProfessionalType union. Update both when adding a new type.';

-- ─── 2. Add accepts_international_clients column ─────────────
-- Complements the existing international_tax_specialist / firb_specialist /
-- migration_agent boolean flags. This one is the broad "I work with
-- overseas clients" toggle used by the /advisors/search page filter.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS accepts_international_clients boolean DEFAULT false;

COMMENT ON COLUMN professionals.accepts_international_clients IS
  'Whether the advisor accepts clients located outside Australia. Different from international_tax_specialist (which signals expertise, not willingness).';

-- Index for the /advisors/search "International clients only" filter
CREATE INDEX IF NOT EXISTS idx_professionals_accepts_intl
  ON professionals (accepts_international_clients)
  WHERE accepts_international_clients = true;

-- ─── 3. Lead pricing rows for the new advisor types ────────────
-- Each new type needs a row in lead_pricing so the admin billing
-- pipeline can match incoming leads to a price. Values are
-- conservative estimates that can be tuned post-launch once we
-- see actual lead demand per vertical.

INSERT INTO lead_pricing
  (advisor_type, price_cents, description, min_price_cents, max_price_cents, free_trial_leads, featured_monthly_cents)
VALUES
  ('mining_lawyer', 24900,
   'Mining lawyers — tenement acquisitions, JV structuring, FIRB advisory.',
   14900, 49900, 2, 34900),
  ('mining_tax_advisor', 19900,
   'Mining tax advisors — PRRT, royalties, cross-border transfer pricing.',
   9900, 39900, 2, 24900),
  ('migration_agent', 8900,
   'Migration agents (MARA) — investor visas, skilled migration, business visas.',
   4900, 14900, 3, 14900),
  ('business_broker', 11900,
   'Business brokers — SME sales, valuations, buyer matching.',
   5900, 19900, 3, 17900),
  ('commercial_lawyer', 14900,
   'Commercial lawyers — contracts, M&A, corporate structuring.',
   7900, 24900, 2, 19900),
  ('rural_property_agent', 7900,
   'Rural property agents — farms, stations, agricultural land transactions.',
   4900, 12900, 3, 12900),
  ('commercial_property_agent', 9900,
   'Commercial property agents — office, industrial, retail sales & leasing.',
   5900, 14900, 3, 14900),
  ('energy_consultant', 12900,
   'Energy consultants — renewables, PPA structuring, grid connection.',
   6900, 19900, 2, 17900)
ON CONFLICT (advisor_type) DO NOTHING;
