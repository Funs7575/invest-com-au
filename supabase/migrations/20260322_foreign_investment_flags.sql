-- ─────────────────────────────────────────────────────────────────────────────
-- Foreign Investment Hub: broker + platform eligibility flags
-- Created: 2026-03-22
-- Adds fields to brokers table to indicate whether each platform accepts
-- non-residents, temporary visa holders, and whether an Australian address
-- is required. NULL = unknown (show "verify directly" in UI).
-- ─────────────────────────────────────────────────────────────────────────────

-- Add foreign investor eligibility columns to brokers table
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS accepts_non_residents boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accepts_temporary_residents boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS requires_australian_address boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS foreign_investor_notes text DEFAULT NULL;

COMMENT ON COLUMN brokers.accepts_non_residents IS
  'Whether this platform accepts account applications from foreign non-residents (no Australian visa). NULL = unknown, not confirmed ineligible.';

COMMENT ON COLUMN brokers.accepts_temporary_residents IS
  'Whether this platform accepts account applications from temporary visa holders (457, 482, student, WHV, etc). NULL = unknown.';

COMMENT ON COLUMN brokers.requires_australian_address IS
  'Whether the platform requires an Australian residential address to sign up. true = required, false = international address accepted, NULL = unknown.';

COMMENT ON COLUMN brokers.foreign_investor_notes IS
  'Free-text notes on any specific requirements, restrictions, or conditions for foreign investors.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed known eligibility data for major platforms
-- Based on publicly available product disclosure statements and T&Cs.
-- Last verified: March 2026. NULL = not yet verified.
-- ─────────────────────────────────────────────────────────────────────────────

-- Share Brokers
UPDATE brokers SET
  accepts_non_residents = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes = 'Requires Australian residential address and bank account. Temporary residents with Australian address can apply. Non-residents must contact support — not available via standard sign-up.'
WHERE slug = 'commsec' AND platform_type = 'share_broker';

UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'Accepts international clients including non-residents. Available in 200+ countries. Enhanced KYC for non-residents. One of the most accessible for non-residents.'
WHERE slug = 'interactive-brokers' AND platform_type = 'share_broker';

UPDATE brokers SET
  accepts_non_residents = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes = 'Requires Australian residential address. Temporary residents in Australia can apply normally. Non-residents not supported.'
WHERE slug = 'stake' AND platform_type = 'share_broker';

UPDATE brokers SET
  accepts_non_residents = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes = 'Australian residents and temporary visa holders accepted. Non-residents should contact support. Australian bank account required for deposits.'
WHERE slug = 'moomoo' AND platform_type = 'share_broker';

UPDATE brokers SET
  accepts_non_residents = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes = 'CHESS-sponsored. Requires Australian address and TFN or non-resident declaration. Temporary residents in Australia can apply.'
WHERE slug = 'nabtrade' AND platform_type = 'share_broker';

-- Crypto Exchanges
UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'AUSTRAC-registered. Accepts international users from most countries. Enhanced KYC for high-volume accounts. Non-residents can sign up with overseas passport and address.'
WHERE slug = 'coinspot' AND platform_type = 'crypto_exchange';

UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'Global exchange with AUSTRAC registration for Australian operations. Non-residents accepted. Standard KYC: passport + selfie. Australian bank account not required — can fund via international wire.'
WHERE slug = 'swyftx' AND platform_type = 'crypto_exchange';

UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'AUSTRAC-registered. Global platform accepting users from most countries. Strict KYC compliance including source of funds for large deposits. No Australian address required.'
WHERE slug = 'binance-au' AND platform_type = 'crypto_exchange';

-- CFD Brokers
UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'ASIC-regulated. Accepts non-residents from most countries. Australian address not required. Enhanced KYC for international clients. ASIC leverage limits apply to all retail clients.'
WHERE slug = 'ig-markets' AND platform_type = 'cfd_forex';

UPDATE brokers SET
  accepts_non_residents = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes = 'ASIC-regulated. Global broker accepting clients from most jurisdictions. Standard KYC requirements. No Australian address required.'
WHERE slug = 'pepperstone' AND platform_type = 'cfd_forex';

-- ─────────────────────────────────────────────────────────────────────────────
-- Add foreign investment specialists flags to professionals table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS international_tax_specialist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS firb_specialist boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_agent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_agent_marn text DEFAULT NULL;

COMMENT ON COLUMN professionals.international_tax_specialist IS
  'Whether this professional specialises in international tax (non-residents, expats, DTAs, DASP).';

COMMENT ON COLUMN professionals.firb_specialist IS
  'Whether this professional specialises in FIRB applications and foreign property investment advice.';

COMMENT ON COLUMN professionals.migration_agent IS
  'Whether this professional is a registered migration agent (MARA-registered).';

COMMENT ON COLUMN professionals.migration_agent_marn IS
  'Migration Agent Registration Number (MARN) for registered migration agents.';

-- Update tax agents with international tax specialty to set flag
UPDATE professionals
SET international_tax_specialist = true
WHERE 'International Tax' = ANY(specialties)
  AND status = 'active';

-- Update property advisors / buyers agents with FIRB specialty
UPDATE professionals
SET firb_specialist = true
WHERE (
  'FIRB & Foreign Investment' = ANY(specialties)
  OR 'Foreign Buyer Assistance' = ANY(specialties)
)
AND status = 'active';

-- ─────────────────────────────────────────────────────────────────────────────
-- Create foreign_investment_dta table for country-specific DTA data
-- This supports the DTA quick-reference table on the tax guide page.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS foreign_investment_dta (
  id serial PRIMARY KEY,
  country_name text NOT NULL,
  country_code char(2) NOT NULL,
  has_dta boolean NOT NULL DEFAULT false,
  dividend_wht_rate numeric(5,2) NOT NULL DEFAULT 30.00,
  interest_wht_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  royalties_wht_rate numeric(5,2) NOT NULL DEFAULT 30.00,
  dta_effective_year integer,
  notes text,
  ato_reference_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(country_code)
);

COMMENT ON TABLE foreign_investment_dta IS
  'Double Tax Agreement withholding rates for foreign investors. Source: ATO Tax Treaties register. Updated annually.';

-- Enable RLS
ALTER TABLE foreign_investment_dta ENABLE ROW LEVEL SECURITY;

-- Public read access (DTA rates are public information)
CREATE POLICY "public_read_dta" ON foreign_investment_dta
  FOR SELECT TO anon, authenticated USING (true);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_dta_country_code ON foreign_investment_dta(country_code);
