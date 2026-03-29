-- ─────────────────────────────────────────────────────────────────────────────
-- Add platform_type column to brokers table
-- Created: 2026-03-29
--
-- Fixes a bug introduced by 20260322_foreign_investment_flags.sql which
-- references platform_type in WHERE clauses but the column was never created.
--
-- Values:
--   share_broker     — ASX / US share trading platform (CommSec, Stake, IBKR…)
--   crypto_exchange  — AUSTRAC-registered digital currency exchange (Swyftx, CoinSpot…)
--   cfd_forex        — ASIC-regulated CFD / Forex broker (Pepperstone, IG, IC Markets…)
--   multi_asset      — Covers shares + CFDs / other asset classes (Saxo, IG…)
--   robo_advisor     — Automated investment service (Raiz, Stockspot…)
--   savings          — High-interest savings accounts / term deposits
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS platform_type text DEFAULT 'share_broker'
    CHECK (platform_type IN ('share_broker','crypto_exchange','cfd_forex','multi_asset','robo_advisor','savings'));

COMMENT ON COLUMN brokers.platform_type IS
  'Category of trading platform. Used to filter brokers on vertical pages (e.g. foreign investment, CFD, crypto). Values: share_broker, crypto_exchange, cfd_forex, multi_asset, robo_advisor, savings.';

CREATE INDEX IF NOT EXISTS idx_brokers_platform_type ON brokers(platform_type, status);


-- ─────────────────────────────────────────────────────────────────────────────
-- Set platform_type on all existing brokers
-- ─────────────────────────────────────────────────────────────────────────────

-- Share brokers
UPDATE brokers SET platform_type = 'share_broker'
WHERE slug IN (
  'commsec', 'stake', 'selfwealth', 'cmc-markets', 'moomoo', 'webull',
  'interactive-brokers', 'tiger-brokers', 'nabtrade', 'pearler',
  'superhero', 'openmarkets'
);

-- Saxo and IG cover both share trading and CFDs — classify as multi_asset
UPDATE brokers SET platform_type = 'multi_asset'
WHERE slug IN ('saxo', 'ig');

-- Crypto exchanges
UPDATE brokers SET platform_type = 'crypto_exchange'
WHERE slug IN (
  'swyftx', 'coinspot', 'binance-au', 'independent-reserve', 'btc-markets',
  'kraken-au', 'coinjar', 'digital-surge', 'coinstash'
);

-- CFD / Forex brokers
UPDATE brokers SET platform_type = 'cfd_forex'
WHERE slug IN (
  'pepperstone', 'ic-markets', 'ig-markets', 'axi', 'plus500',
  'forex-com', 'activtrades', 'vantage', 'blueberry-markets'
);

-- Robo advisors
UPDATE brokers SET platform_type = 'robo_advisor'
WHERE slug IN ('raiz', 'stockspot', 'spaceship', 'vanguard-personal-investor');


-- ─────────────────────────────────────────────────────────────────────────────
-- Re-apply foreign investment flag updates now that platform_type exists
-- (The original 20260322 migration's UPDATE WHERE platform_type = ... clauses
--  were no-ops since the column didn't exist.)
-- ─────────────────────────────────────────────────────────────────────────────

-- Share brokers
UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Requires Australian residential address and bank account. Temporary residents with Australian address can apply. Non-residents must contact support — not available via standard sign-up.'
WHERE slug = 'commsec';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'Accepts international clients including non-residents. Available in 200+ countries. Enhanced KYC for non-residents. One of the most accessible platforms for non-residents globally.'
WHERE slug = 'interactive-brokers';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Requires Australian residential address. Temporary residents in Australia can apply normally. Non-residents not supported via standard sign-up.'
WHERE slug = 'stake';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Australian residents and temporary visa holders accepted. Non-residents should contact support. Australian bank account required for deposits.'
WHERE slug = 'moomoo';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'CHESS-sponsored. Requires Australian address and TFN or non-resident declaration. Temporary residents in Australia can apply.'
WHERE slug = 'nabtrade';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Flat $9.50 per trade. Requires Australian address. Temporary residents in Australia can apply normally.'
WHERE slug = 'selfwealth';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'First trade free per day. Requires Australian address. Temporary visa holders in Australia can open an account normally.'
WHERE slug = 'cmc-markets';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'Premium multi-asset platform. Accepts non-residents. Comprehensive KYC required. Inactivity fee may apply to dormant accounts.'
WHERE slug = 'saxo';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'Global broker accepting international clients. Both share trading and CFD accounts available. Enhanced KYC for non-residents.'
WHERE slug = 'ig';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Requires Australian residential address. Commission-free US trading. Temporary residents in Australia can open account normally.'
WHERE slug = 'webull';

UPDATE brokers SET
  accepts_non_residents      = false,
  accepts_temporary_residents = true,
  requires_australian_address = true,
  foreign_investor_notes     = 'Requires Australian residential address. US and ASX trading. Temporary residents in Australia can apply.'
WHERE slug = 'tiger-brokers';

-- Crypto exchanges
UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'AUSTRAC-registered. Accepts international users from most countries. Enhanced KYC for high-volume accounts. Non-residents can sign up with overseas passport and address.'
WHERE slug = 'coinspot';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'AUSTRAC-registered. Global exchange accepting users from most countries. Non-residents accepted. Standard KYC: passport + selfie. Australian bank account not required — can fund via international wire.'
WHERE slug = 'swyftx';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'AUSTRAC-registered. Global platform accepting users from most countries. Strict KYC compliance including source of funds for large deposits. No Australian address required.'
WHERE slug = 'binance-au';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'AUSTRAC-registered. Independent Reserve is one of Australia''s most regulated crypto exchanges — bank-grade AML/KYC. Accepts non-residents. Institutional and professional accounts available.'
WHERE slug = 'independent-reserve';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'AUSTRAC-registered. Australia''s longest-running crypto exchange. Accepts non-residents. Standard KYC: passport + overseas address.'
WHERE slug = 'btc-markets';

-- CFD / Forex brokers
UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'ASIC-regulated. Accepts non-residents from most countries. Australian address not required. Enhanced KYC for international clients. ASIC leverage limits apply to all retail clients.'
WHERE slug IN ('ig-markets', 'ig');

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'ASIC-regulated. Global broker accepting clients from most jurisdictions. Standard KYC requirements. No Australian address required. Low spreads, award-winning execution.'
WHERE slug = 'pepperstone';

UPDATE brokers SET
  accepts_non_residents      = true,
  accepts_temporary_residents = true,
  requires_australian_address = false,
  foreign_investor_notes     = 'ASIC-regulated. Accepts non-residents globally. Raw spreads available on ECN accounts. No Australian address required. Standard passport + address KYC.'
WHERE slug = 'ic-markets';
