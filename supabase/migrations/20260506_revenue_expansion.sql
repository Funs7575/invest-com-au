-- ============================================================
-- Revenue expansion — phase 1 DB migration
--
-- 1A. Add 4 new advisor types to professionals.type CHECK.
-- 1B. fund_listings table (structured fund directory).
-- 1C. developer_leads table (fund / listing / report lead capture).
-- 1D. newsletter_sponsors table (sponsored newsletter placements).
-- 1E. sector_reports table (gated + ungated research reports).
-- 1F. Seed 8 fund_listings rows.
-- 1G. Seed 3 sector_reports rows.
--
-- Idempotent: every CREATE uses IF NOT EXISTS, every seed uses
-- ON CONFLICT (slug) DO NOTHING, and the CHECK-constraint swap
-- is DROP IF EXISTS + ADD.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1A. Add 4 new professional types
--   Existing types are preserved; new entries appended.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_type_check;

ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_type_check CHECK (
    type = ANY (ARRAY[
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
      'mining_lawyer',
      'mining_tax_advisor',
      'migration_agent',
      'business_broker',
      'commercial_lawyer',
      'rural_property_agent',
      'commercial_property_agent',
      'energy_consultant',
      'stockbroker_firm',
      'private_wealth_manager',
      'energy_financial_planner',
      'resources_fund_manager',
      'foreign_investment_lawyer',
      'petroleum_royalties_advisor',
      -- New in revenue expansion (20260506):
      'smsf_auditor',
      'smsf_specialist',
      'immigration_investment_lawyer',
      'fund_manager'
    ]::text[])
  );

-- ────────────────────────────────────────────────────────────
-- 1B. fund_listings
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fund_listings (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  fund_type             TEXT CHECK (
                          fund_type IN (
                            'managed_fund','syndicated_property','infrastructure',
                            'unlisted_equity','wholesale','retail'
                          )
                        ),
  manager_name          TEXT,
  description           TEXT,
  min_investment_cents  BIGINT,
  target_return_percent NUMERIC(5,2),
  fund_size_cents       BIGINT,
  open_to_retail        BOOLEAN DEFAULT false,
  siv_complying         BOOLEAN DEFAULT false,
  firb_relevant         BOOLEAN DEFAULT false,
  featured              BOOLEAN DEFAULT false,
  featured_tier         TEXT CHECK (featured_tier IN ('standard','premium','platinum')),
  monthly_fee_cents     INT DEFAULT 0,
  contact_email         TEXT,
  contact_name          TEXT,
  report_url            TEXT,
  status                TEXT DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_listings_status
  ON public.fund_listings (status);
CREATE INDEX IF NOT EXISTS idx_fund_listings_fund_type
  ON public.fund_listings (fund_type);
CREATE INDEX IF NOT EXISTS idx_fund_listings_siv
  ON public.fund_listings (siv_complying) WHERE siv_complying = true;
CREATE INDEX IF NOT EXISTS idx_fund_listings_featured
  ON public.fund_listings (featured, featured_tier) WHERE featured = true;

-- ────────────────────────────────────────────────────────────
-- 1C. developer_leads — lead capture across funds, listings, reports
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.developer_leads (
  id                         SERIAL PRIMARY KEY,
  listing_id                 INT REFERENCES public.investment_listings(id) ON DELETE SET NULL,
  fund_id                    INT REFERENCES public.fund_listings(id) ON DELETE SET NULL,
  report_slug                TEXT,
  full_name                  TEXT NOT NULL,
  email                      TEXT NOT NULL,
  phone                      TEXT,
  investment_amount_range    TEXT,
  investor_type              TEXT CHECK (
                               investor_type IN ('retail','wholesale','smsf','foreign')
                             ),
  message                    TEXT,
  utm_source                 TEXT,
  utm_medium                 TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_developer_leads_fund
  ON public.developer_leads (fund_id) WHERE fund_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_developer_leads_listing
  ON public.developer_leads (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_developer_leads_created
  ON public.developer_leads (created_at DESC);

-- ────────────────────────────────────────────────────────────
-- 1D. newsletter_sponsors
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_sponsors (
  id             SERIAL PRIMARY KEY,
  company_name   TEXT NOT NULL,
  contact_email  TEXT NOT NULL,
  send_date      DATE,
  subject_line   TEXT,
  cta_text       TEXT,
  cta_url        TEXT,
  fee_cents      INT,
  status         TEXT DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sponsors_status
  ON public.newsletter_sponsors (status, send_date);

-- ────────────────────────────────────────────────────────────
-- 1E. sector_reports
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sector_reports (
  id                SERIAL PRIMARY KEY,
  title             TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  sector            TEXT,
  summary           TEXT,
  sponsor_name      TEXT,
  sponsor_logo_url  TEXT,
  report_url        TEXT,
  gated             BOOLEAN DEFAULT true,
  published_at      DATE,
  status            TEXT DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_sector_reports_status
  ON public.sector_reports (status, published_at DESC);

-- ────────────────────────────────────────────────────────────
-- 1F. Seed 8 fund_listings rows (realistic Australian figures)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.fund_listings (
  title, slug, fund_type, manager_name, description,
  min_investment_cents, target_return_percent, fund_size_cents,
  open_to_retail, siv_complying, firb_relevant,
  featured, featured_tier, contact_email, contact_name, status
) VALUES
-- 1. Managed Equity 1
('Argyle Capital Australian Equities Fund',
 'argyle-capital-australian-equities',
 'managed_fund',
 'Argyle Capital Management',
 'Long-only Australian listed equities fund targeting ASX 300 with a quality and growth tilt. Retail-accessible via mFund and major platforms. Benchmarked against ASX 300 Accumulation. Typical annual turnover 30-40%; fully franked dividend focus.',
 2500000,          -- $25,000
 9.00,
 85000000000,      -- $850M AUM
 true, false, false,
 true, 'premium',
 'investor@placeholder.invest.com.au', 'Investor Relations', 'active'),

-- 2. Managed Equity 2
('Pembroke Asia Pacific Equity Fund',
 'pembroke-asia-pacific-equity',
 'managed_fund',
 'Pembroke Asset Management',
 'Long-short Asia-Pacific equity fund covering Australia, Japan, Korea, and selected ASEAN markets. Wholesale-investor only. 13-year track record; outperformed MSCI AC Asia Pacific by 3.1% p.a. net of fees.',
 10000000,         -- $100,000
 11.50,
 140000000000,     -- $1.4B AUM
 false, false, false,
 false, 'standard',
 'invest@placeholder.invest.com.au', 'Capital Introductions', 'active'),

-- 3. Syndicated Property 1
('Meridian Industrial Property Syndicate III',
 'meridian-industrial-property-iii',
 'syndicated_property',
 'Meridian Property Partners',
 'Syndicated investment in three industrial warehouse assets in Sydney''s outer west and Melbourne''s north. 7-year term; 98% occupancy under WALE of 6.4 years to ASX-listed tenants. Quarterly distributions.',
 5000000,          -- $50,000
 8.50,
 4500000000,       -- $45M
 true, true, false,
 true, 'premium',
 'syndicate@placeholder.invest.com.au', 'Syndicate Manager', 'active'),

-- 4. Syndicated Property 2
('Pacific Large Format Retail Fund',
 'pacific-large-format-retail',
 'syndicated_property',
 'Pacific Real Estate Capital',
 'Large-format retail (LFR) property fund holding six bulky-goods centres across metro Sydney, Brisbane and Perth. Target 7.0% distribution yield. Strong covenant tenants (Bunnings, Officeworks, Harvey Norman). Open-ended structure.',
 2500000,          -- $25,000
 7.50,
 12000000000,      -- $120M
 true, false, true,
 false, 'standard',
 'contact@placeholder.invest.com.au', 'Fund Manager', 'active'),

-- 5. Infrastructure 1
('Sunrise Renewable Infrastructure Fund',
 'sunrise-renewable-infrastructure',
 'infrastructure',
 'Sunrise Asset Partners',
 'Core-plus infrastructure fund holding operating solar and battery storage assets across NSW, VIC and QLD. 10-year forecast contracted cashflows under PPAs with investment-grade utilities. Fully committed as of Q2 2026.',
 25000000,         -- $250,000
 9.50,
 68000000000,      -- $680M
 false, true, true,
 false, 'standard',
 'enquiries@placeholder.invest.com.au', 'Distribution', 'active'),

-- 6. Infrastructure 2
('Southern Cross Transport & Toll Roads Fund',
 'southern-cross-transport-toll-roads',
 'infrastructure',
 'Southern Cross Infrastructure',
 'Listed and unlisted toll road, airport and logistics assets across Australia and select OECD markets. Monthly distributions; quarterly liquidity window for wholesale unit-holders. Hedged to AUD.',
 10000000,         -- $100,000
 8.00,
 95000000000,      -- $950M
 false, true, false,
 false, 'standard',
 'wholesale@placeholder.invest.com.au', 'Wholesale Distribution', 'active'),

-- 7. Wholesale unlisted equity 1
('Canopy Private Equity Fund IV',
 'canopy-private-equity-iv',
 'wholesale',
 'Canopy Capital',
 'Mid-market Australian private equity fund IV. Focus on founder-led businesses with $10M-$50M EBITDA in healthcare, technology, and consumer services. 10-year closed-end vehicle with 5-year investment period. Sophisticated-investor eligibility required.',
 100000000,        -- $1,000,000
 15.00,
 30000000000,      -- $300M
 false, false, false,
 false, 'standard',
 'lp@placeholder.invest.com.au', 'Investor Relations', 'active'),

-- 8. Wholesale unlisted equity 2
('Aurora Private Credit Income Fund',
 'aurora-private-credit-income',
 'wholesale',
 'Aurora Credit Partners',
 'Wholesale private credit fund focused on senior secured loans to Australian mid-market corporates. Target 7-8% distribution yield with monthly income. AUD-hedged. Open-ended with quarterly redemptions.',
 25000000,         -- $250,000
 7.50,
 55000000000,      -- $550M
 false, false, false,
 false, 'standard',
 'credit@placeholder.invest.com.au', 'Client Services', 'active')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 1G. Seed 3 sector_reports rows
-- ────────────────────────────────────────────────────────────
INSERT INTO public.sector_reports (
  title, slug, sector, summary,
  sponsor_name, sponsor_logo_url, report_url,
  gated, published_at, status
) VALUES
('Australian Energy Investment Report 2026',
 'australian-energy-investment-report-2026',
 'energy',
 'A 48-page editorial report covering the 2026 Australian energy investment landscape: ASX oil & gas, uranium restart, hydrogen policy, LNG export economics, and the 2025 critical-infrastructure amendments. Includes sector size data, FIRB pathway summary, and suggested portfolio weightings by investor type.',
 'Invest.com.au Research',
 NULL,
 '/reports/australian-energy-investment-report-2026.pdf',
 true,
 '2026-04-01',
 'published'),
('SMSF Property Investment Outlook Q3 2026',
 'smsf-property-investment-outlook-q3-2026',
 'smsf',
 'Quarterly outlook on SMSF property investment covering LRBA borrowing capacity, in-specie transfers, yield benchmarks by asset class, and the ATO''s recent SMSF compliance focus areas. Essential reading for SMSF trustees considering their first property purchase or rebalancing existing holdings.',
 'Invest.com.au Research',
 NULL,
 '/reports/smsf-property-outlook-q3-2026.pdf',
 true,
 '2026-04-01',
 'published'),
('Foreign Investment in Australian Real Estate 2026',
 'foreign-investment-australian-real-estate-2026',
 'foreign_investment',
 'Open-access briefing on FIRB rules for residential, commercial and agricultural real estate as at 2026: thresholds by investor type, state-based stamp duty surcharges, and the 2025 amendments to the foreign-ownership register. Written for non-resident investors and their advisors.',
 'Invest.com.au Research',
 NULL,
 '/reports/foreign-investment-australian-real-estate-2026.pdf',
 false,
 '2026-04-01',
 'published')
ON CONFLICT (slug) DO NOTHING;
