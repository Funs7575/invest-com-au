-- ============================================================
-- Foreign Investment Data Tables
-- Created: 2026-03-27
--
-- Purpose: Move all hardcoded foreign-investment rate data
-- from TypeScript files into Supabase so non-technical admins
-- can update rates without a code deploy, and so staleness
-- can be tracked and alerted on automatically.
--
-- Run in Supabase SQL editor (Settings > SQL Editor).
-- Tables use service_role for writes (admin client only).
-- Public read is enabled so cached server queries can use
-- the anon key.
-- ============================================================

-- ─── 1. Category metadata & staleness tracking ──────────────

CREATE TABLE IF NOT EXISTS fi_data_categories (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key           text UNIQUE NOT NULL,
  display_name           text NOT NULL,
  description            text NOT NULL DEFAULT '',
  -- How often this data should be reviewed (days)
  review_frequency_days  integer NOT NULL DEFAULT 365,
  -- Warning threshold: amber status after this many days
  warning_threshold_days integer NOT NULL DEFAULT 270,
  -- Urgent threshold: red status after this many days
  urgent_threshold_days  integer NOT NULL DEFAULT 365,
  -- Verification tracking
  last_verified_at       timestamptz,
  verified_by            text,
  -- Source information
  source_url             text NOT NULL DEFAULT '',
  source_name            text NOT NULL DEFAULT '',
  -- When the underlying rules/rates became effective
  effective_date         date,
  -- Internal admin notes
  notes                  text,
  -- Computed status: 'current' | 'needs_review' | 'stale' | 'urgent'
  status                 text NOT NULL DEFAULT 'current'
                           CHECK (status IN ('current', 'needs_review', 'stale', 'urgent')),
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

-- ─── 2. Tax brackets (non-resident & resident) ──────────────

CREATE TABLE IF NOT EXISTS fi_tax_brackets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year       text NOT NULL,        -- e.g. '2025-26'
  taxpayer_type  text NOT NULL         -- 'non_resident' | 'resident'
                   CHECK (taxpayer_type IN ('non_resident', 'resident')),
  income_from    bigint NOT NULL,
  income_to      bigint,               -- NULL means unlimited
  rate           numeric(5,2) NOT NULL,
  description    text NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ─── 3. DTA (Double Tax Agreement) countries ────────────────

CREATE TABLE IF NOT EXISTS fi_dta_countries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country             text NOT NULL,
  country_code        text NOT NULL,   -- ISO 3166-1 alpha-2
  has_dta             boolean NOT NULL DEFAULT true,
  dividend_wht        numeric(5,2) NOT NULL,
  interest_wht        numeric(5,2) NOT NULL,
  royalties_wht       numeric(5,2) NOT NULL,
  dta_effective_year  integer,
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ─── 4. DASP withholding rates ──────────────────────────────

CREATE TABLE IF NOT EXISTS fi_dasp_rates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type    text NOT NULL,
  -- 'standard' = most temp visa holders; 'whm' = Working Holiday Makers
  visa_category     text NOT NULL
                      CHECK (visa_category IN ('standard', 'whm')),
  withholding_rate  numeric(5,2) NOT NULL,
  notes             text,
  sort_order        integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- ─── 5. Withholding tax rates by income type ────────────────

CREATE TABLE IF NOT EXISTS fi_withholding_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_type      text NOT NULL,
  standard_rate    text NOT NULL,       -- e.g. '30%', 'Non-resident rates'
  with_dta_typical text NOT NULL,
  notes            text,
  color            text NOT NULL DEFAULT 'amber',  -- 'red' | 'amber' | 'green' | 'orange'
  sort_order       integer NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ─── 6. Property rules (key/value for flexible rule types) ──

CREATE TABLE IF NOT EXISTS fi_property_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key      text UNIQUE NOT NULL,   -- machine-readable identifier
  rule_type     text NOT NULL           -- 'rate' | 'threshold' | 'ban' | 'fee' | 'info'
                  CHECK (rule_type IN ('rate', 'threshold', 'ban', 'fee', 'info')),
  title         text NOT NULL,
  value         text NOT NULL,
  effective_from date,
  effective_to   date,
  notes         text,
  source_url    text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ─── 7. Change / audit log ──────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_change_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key    text NOT NULL,
  action          text NOT NULL   -- 'update' | 'verify' | 'add' | 'remove' | 'seed'
                    CHECK (action IN ('update', 'verify', 'add', 'remove', 'seed')),
  changed_by      text NOT NULL,  -- admin email
  record_id       text,           -- uuid of the changed row (if applicable)
  previous_value  jsonb,
  new_value       jsonb,
  note            text,
  created_at      timestamptz DEFAULT now()
);

-- ─── Row-Level Security ──────────────────────────────────────
-- Public can read all FI data tables (needed for anon-key cached reads).
-- Writes require the service_role key (admin client).

ALTER TABLE fi_data_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_tax_brackets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_dta_countries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_dasp_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_withholding_rates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_property_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fi_change_log         ENABLE ROW LEVEL SECURITY;

-- Public SELECT
CREATE POLICY "fi_data_categories_public_read"  ON fi_data_categories  FOR SELECT USING (true);
CREATE POLICY "fi_tax_brackets_public_read"      ON fi_tax_brackets      FOR SELECT USING (true);
CREATE POLICY "fi_dta_countries_public_read"     ON fi_dta_countries     FOR SELECT USING (true);
CREATE POLICY "fi_dasp_rates_public_read"        ON fi_dasp_rates        FOR SELECT USING (true);
CREATE POLICY "fi_withholding_rates_public_read" ON fi_withholding_rates FOR SELECT USING (true);
CREATE POLICY "fi_property_rules_public_read"    ON fi_property_rules    FOR SELECT USING (true);
CREATE POLICY "fi_change_log_public_read"        ON fi_change_log        FOR SELECT USING (true);

-- ─── Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fi_tax_brackets_type_year
  ON fi_tax_brackets (taxpayer_type, tax_year, sort_order);

CREATE INDEX IF NOT EXISTS idx_fi_dta_countries_active
  ON fi_dta_countries (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_fi_dasp_rates_category
  ON fi_dasp_rates (visa_category, sort_order);

CREATE INDEX IF NOT EXISTS idx_fi_withholding_rates_order
  ON fi_withholding_rates (sort_order) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_fi_property_rules_key
  ON fi_property_rules (rule_key) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_fi_change_log_category_created
  ON fi_change_log (category_key, created_at DESC);

-- ─── Updated_at trigger ──────────────────────────────────────

CREATE OR REPLACE FUNCTION update_fi_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fi_data_categories_updated_at   BEFORE UPDATE ON fi_data_categories   FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();
CREATE TRIGGER fi_tax_brackets_updated_at       BEFORE UPDATE ON fi_tax_brackets       FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();
CREATE TRIGGER fi_dta_countries_updated_at      BEFORE UPDATE ON fi_dta_countries      FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();
CREATE TRIGGER fi_dasp_rates_updated_at         BEFORE UPDATE ON fi_dasp_rates         FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();
CREATE TRIGGER fi_withholding_rates_updated_at  BEFORE UPDATE ON fi_withholding_rates  FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();
CREATE TRIGGER fi_property_rules_updated_at     BEFORE UPDATE ON fi_property_rules     FOR EACH ROW EXECUTE FUNCTION update_fi_updated_at();

-- ============================================================
-- SEED DATA (current as at March 2026)
-- Run after table creation to populate all tables.
-- The /api/admin/foreign-investment/seed route also does this
-- programmatically from the TypeScript source files.
-- ============================================================

-- Category metadata
INSERT INTO fi_data_categories
  (category_key, display_name, description, review_frequency_days,
   warning_threshold_days, urgent_threshold_days,
   source_url, source_name, effective_date, status)
VALUES
  ('non_resident_tax',
   'Non-Resident Tax Brackets',
   'Australian income tax rates for non-residents. Changes annually on 1 July each year when new budget rates take effect.',
   365, 300, 400,
   'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
   'ATO — Individual income tax rates',
   '2025-07-01', 'current'),

  ('resident_tax',
   'Resident Tax Brackets',
   'Australian income tax rates for residents including the Stage 3 cuts effective 1 July 2024. Changes annually on 1 July.',
   365, 300, 400,
   'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents',
   'ATO — Individual income tax rates',
   '2025-07-01', 'current'),

  ('dta_countries',
   'Double Tax Agreement Countries',
   'DTA withholding rates for dividends, interest, and royalties by treaty country. New treaties are rare; check ATO treaty register annually.',
   365, 300, 400,
   'https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/in-detail/tax-treaties/status-of-tax-treaties',
   'ATO — Status of tax treaties',
   '2026-01-01', 'current'),

  ('dasp_rates',
   'DASP Withholding Rates',
   'Departing Australia Superannuation Payment withholding rates. Set by legislation; changes are rare but must be verified after any super law changes.',
   730, 600, 730,
   'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/early-access-to-super/leaving-australia-temporarily',
   'ATO — Leaving Australia and your super',
   '2017-07-01', 'current'),

  ('withholding_rates',
   'Income Withholding Tax Rates',
   'Standard Australian withholding rates for dividends, interest, royalties, and CGT for non-residents. CGT withholding rate changed from 12.5% to 15% on 1 January 2025.',
   365, 270, 365,
   'https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/withholding-tax-for-foreign-residents',
   'ATO — Withholding tax for foreign residents',
   '2025-01-01', 'current'),

  ('property_rules',
   'Property Rules & FIRB',
   'FIRB rules, CGT withholding rate, established dwelling purchase ban, and FIRB fee schedule. HIGH RISK if stale — property rules have changed twice in 2 years. Review every 6 months.',
   180, 90, 180,
   'https://firb.gov.au',
   'FIRB — Foreign Investment Review Board',
   '2025-04-01', 'current')
ON CONFLICT (category_key) DO NOTHING;

-- Non-resident tax brackets (2025-26)
INSERT INTO fi_tax_brackets
  (tax_year, taxpayer_type, income_from, income_to, rate, description, sort_order)
VALUES
  ('2025-26', 'non_resident', 0,       135000, 30,   '$0 – $135,000',          1),
  ('2025-26', 'non_resident', 135001,  190000, 37,   '$135,001 – $190,000',    2),
  ('2025-26', 'non_resident', 190001,  NULL,   45,   'Over $190,000',          3)
ON CONFLICT DO NOTHING;

-- Resident tax brackets (2025-26)
INSERT INTO fi_tax_brackets
  (tax_year, taxpayer_type, income_from, income_to, rate, description, sort_order)
VALUES
  ('2025-26', 'resident', 0,       18200,  0,    'Tax-free threshold',         1),
  ('2025-26', 'resident', 18201,   45000,  16,   '$18,201 – $45,000',          2),
  ('2025-26', 'resident', 45001,   135000, 30,   '$45,001 – $135,000',         3),
  ('2025-26', 'resident', 135001,  190000, 37,   '$135,001 – $190,000',        4),
  ('2025-26', 'resident', 190001,  NULL,   45,   'Over $190,000',              5)
ON CONFLICT DO NOTHING;

-- DASP withholding rates
INSERT INTO fi_dasp_rates
  (component_type, visa_category, withholding_rate, notes, sort_order)
VALUES
  ('Taxed element (most common)', 'standard', 35,
   'Most super contributions and earnings fall into this category. Employer SG contributions and salary sacrifice are in this element.',
   1),
  ('Untaxed element', 'standard', 45,
   'Applies to some public sector / defined benefit funds where contributions were not taxed on the way in.',
   2),
  ('Tax-free component', 'standard', 0,
   'Non-concessional (after-tax) contributions that have already had tax paid.',
   3),
  ('All components — Working Holiday Maker', 'whm', 65,
   'WHM visa holders (subclass 417 and 462) pay 65% across ALL super components regardless of element type. Separate regime introduced 2017.',
   4)
ON CONFLICT DO NOTHING;

-- Withholding tax by income type
INSERT INTO fi_withholding_rates
  (income_type, standard_rate, with_dta_typical, notes, color, sort_order)
VALUES
  ('Dividends (unfranked)', '30%', 'Typically 15% (varies by country)',
   'Applied to the unfranked portion of dividends paid to non-residents', 'red', 1),
  ('Dividends (fully franked)', '0%', '0%',
   'Tax already paid via imputation system. Non-residents receive the dividend gross but cannot claim the franking credit refund.',
   'green', 2),
  ('Dividends (partially franked)', '30% on unfranked portion', 'Typically 15% on unfranked portion',
   'WHT applies only to the unfranked component.', 'amber', 3),
  ('Interest (bank deposits, bonds)', '10%', 'Typically 10% (rarely reduced below 10%)',
   'Final withholding tax. No Australian return required for passive interest income only.', 'amber', 4),
  ('Royalties', '30%', 'Typically 5–15% (varies significantly)',
   'Covers intellectual property, patents, copyright, software licences.', 'red', 5),
  ('Rental income', 'Non-resident rates (30%+ no TFT)', 'DTAs rarely reduce rental income WHT',
   'Australian rental income is taxed at non-resident rates. Australian tax return required.', 'orange', 6),
  ('CGT — Australian real property', 'Non-resident rates + 15% buyer WHT on sale >$750k',
   'No CGT exemption for real property',
   'No 50% CGT discount for non-residents. 15% WHT deducted from sale price by buyer''s conveyancer (rate increased from 12.5% effective 1 Jan 2025).',
   'red', 7),
  ('CGT — Listed Australian shares (<10% holding)', '0% (exempt)', '0%',
   'Section 855-10 exemption: non-residents generally exempt from CGT on portfolio share investments in listed Australian companies.',
   'green', 8)
ON CONFLICT DO NOTHING;

-- Property rules
INSERT INTO fi_property_rules
  (rule_key, rule_type, title, value, effective_from, effective_to, notes, source_url, sort_order)
VALUES
  ('cgt_withholding_rate', 'rate',
   'Foreign Resident CGT Withholding Rate',
   '15',
   '2025-01-01', NULL,
   'Rate increased from 12.5% to 15% on 1 January 2025. Applied by the buyer''s conveyancer on all residential property sales by foreign residents over $750,000.',
   'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-capital-gains-tax',
   1),

  ('cgt_withholding_threshold', 'threshold',
   'CGT Withholding Trigger Threshold',
   '750000',
   '2017-07-01', NULL,
   'Buyer must withhold 15% of purchase price if seller is a foreign resident and sale price exceeds $750,000.',
   'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-capital-gains-tax',
   2),

  ('established_home_ban', 'ban',
   'Established Dwelling Purchase Ban (Temporary Residents)',
   'banned',
   '2025-04-01', '2027-03-31',
   'The Australian Government has banned foreign persons (including temporary residents) from purchasing established dwellings from 1 April 2025 to 31 March 2027. Limited exceptions may apply. CRITICAL: verify this date is still in force each 6-month review.',
   'https://www.firb.gov.au/guidance-resources/guidance-notes/established-dwellings',
   3),

  ('firb_fee_tier1', 'fee',
   'FIRB Application Fee — Up to $1,000,000',
   '14100',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January. Verify on firb.gov.au after each January.',
   'https://firb.gov.au/fees',
   4),

  ('firb_fee_tier2', 'fee',
   'FIRB Application Fee — $1,000,001 to $2,000,000',
   '28200',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January.',
   'https://firb.gov.au/fees',
   5),

  ('firb_fee_tier3', 'fee',
   'FIRB Application Fee — $2,000,001 to $3,000,000',
   '56400',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January.',
   'https://firb.gov.au/fees',
   6),

  ('firb_fee_tier4', 'fee',
   'FIRB Application Fee — $3,000,001 to $5,000,000',
   '112800',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January.',
   'https://firb.gov.au/fees',
   7),

  ('firb_fee_tier5', 'fee',
   'FIRB Application Fee — $5,000,001 to $10,000,000',
   '225600',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January.',
   'https://firb.gov.au/fees',
   8),

  ('firb_fee_tier6', 'fee',
   'FIRB Application Fee — Over $10,000,000',
   '451200',
   '2026-01-01', NULL,
   'Non-refundable. Indexed annually on 1 January.',
   'https://firb.gov.au/fees',
   9),

  ('stamp_duty_surcharge_nsw', 'rate',
   'NSW Foreign Purchaser Stamp Duty Surcharge',
   '8',
   '2017-06-21', NULL,
   'Applied on top of standard stamp duty. Also 4% annual land tax surcharge.',
   'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/foreign-buyer',
   10),

  ('stamp_duty_surcharge_vic', 'rate',
   'VIC Foreign Purchaser Additional Duty',
   '8',
   '2015-07-01', NULL,
   'Applied on top of standard stamp duty. Also 2% annual land tax surcharge.',
   'https://www.sro.vic.gov.au/foreignpurchasers',
   11),

  ('stamp_duty_surcharge_qld', 'rate',
   'QLD Additional Foreign Acquirer Duty',
   '7',
   '2016-10-01', NULL,
   'Applied on top of standard transfer duty. Also 2% land tax surcharge.',
   'https://www.qro.qld.gov.au/duties/transfer-duty/additional-foreign-acquirer-duty/',
   12),

  ('stamp_duty_surcharge_wa', 'rate',
   'WA Foreign Buyer Surcharge',
   '7',
   '2019-01-01', NULL,
   'No separate land tax surcharge in WA as at March 2026.',
   'https://www.finance.wa.gov.au',
   13),

  ('stamp_duty_surcharge_sa', 'rate',
   'SA Foreign Buyer Stamp Duty Surcharge',
   '7',
   '2018-01-01', NULL,
   'No separate land tax surcharge in SA as at March 2026.',
   'https://www.revenuesa.sa.gov.au',
   14),

  ('stamp_duty_surcharge_tas', 'rate',
   'TAS Foreign Investor Duty Surcharge',
   '8',
   '2023-07-01', NULL,
   'Tasmania introduced its surcharge in 2023. No separate land tax surcharge.',
   'https://www.sro.tas.gov.au/',
   15)
ON CONFLICT (rule_key) DO NOTHING;

-- DTA countries (40 with DTA + 4 no-DTA reference rows)
INSERT INTO fi_dta_countries
  (country, country_code, has_dta, dividend_wht, interest_wht, royalties_wht, dta_effective_year, notes, sort_order)
VALUES
  ('United States',    'US', true,  15, 10, 5,  1983, '5% for companies with ≥10% interest; 15% otherwise', 1),
  ('United Kingdom',   'GB', true,  15, 10, 5,  2003, NULL, 2),
  ('New Zealand',      'NZ', true,  15, 10, 5,  2010, NULL, 3),
  ('Japan',            'JP', true,  10, 10, 5,  2008, NULL, 4),
  ('China',            'CN', true,  15, 10, 10, 1990, NULL, 5),
  ('Singapore',        'SG', true,  15, 10, 10, 2010, NULL, 6),
  ('Germany',          'DE', true,  15, 10, 5,  1975, NULL, 7),
  ('France',           'FR', true,  15, 10, 5,  2006, NULL, 8),
  ('Canada',           'CA', true,  15, 10, 10, 1981, NULL, 9),
  ('South Korea',      'KR', true,  15, 15, 15, 1984, NULL, 10),
  ('India',            'IN', true,  15, 15, 10, 1991, NULL, 11),
  ('Indonesia',        'ID', true,  15, 10, 10, 1993, NULL, 12),
  ('Malaysia',         'MY', true,  15, 15, 10, 1982, NULL, 13),
  ('Thailand',         'TH', true,  15, 25, 15, 1989, 'Royalties 5% for cultural, literary or artistic work', 14),
  ('Vietnam',          'VN', true,  15, 10, 10, 1996, NULL, 15),
  ('Philippines',      'PH', true,  25, 15, 25, 1979, 'Reduced rates apply to certain types of income', 16),
  ('Hong Kong',        'HK', true,  15, 10, 5,  2011, NULL, 17),
  ('Switzerland',      'CH', true,  15, 10, 10, 1981, NULL, 18),
  ('Netherlands',      'NL', true,  15, 10, 10, 1976, NULL, 19),
  ('Italy',            'IT', true,  15, 10, 10, 1985, NULL, 20),
  ('Spain',            'ES', true,  15, 10, 10, 1992, NULL, 21),
  ('Ireland',          'IE', true,  15, 10, 10, 1983, NULL, 22),
  ('South Africa',     'ZA', true,  15, 10, 10, 1999, NULL, 23),
  ('Mexico',           'MX', true,  15, 10, 10, 2004, NULL, 24),
  ('Russia',           'RU', true,  15, 10, 10, 2000, NULL, 25),
  ('Chile',            'CL', true,  15, 15, 10, 2013, NULL, 26),
  ('Norway',           'NO', true,  15, 10, 5,  2006, NULL, 27),
  ('Denmark',          'DK', true,  15, 10, 10, 1981, NULL, 28),
  ('Sweden',           'SE', true,  15, 10, 10, 1981, NULL, 29),
  ('Finland',          'FI', true,  15, 10, 5,  2007, NULL, 30),
  ('Austria',          'AT', true,  15, 10, 10, 1988, NULL, 31),
  ('Belgium',          'BE', true,  15, 10, 10, 1986, NULL, 32),
  ('Czech Republic',   'CZ', true,  15, 10, 10, 1995, NULL, 33),
  ('Hungary',          'HU', true,  15, 10, 10, 1992, NULL, 34),
  ('Poland',           'PL', true,  15, 10, 10, 1992, NULL, 35),
  ('Romania',          'RO', true,  15, 10, 10, 2001, NULL, 36),
  ('Turkey',           'TR', true,  15, 10, 10, 2011, NULL, 37),
  ('Papua New Guinea', 'PG', true,  15, 10, 10, 1990, NULL, 38),
  ('Portugal',         'PT', true,  15, 10, 10, 2001, NULL, 39),
  ('Argentina',        'AR', false, 30, 10, 30, NULL,  'No DTA — Australian standard rates apply', 40),
  -- No-DTA reference rows (shown for common enquiries)
  ('United Arab Emirates', 'AE', false, 30, 10, 30, NULL, 'No DTA — Australian standard rates apply', 41),
  ('Saudi Arabia',     'SA', false, 30, 10, 30, NULL, 'No DTA — Australian standard rates apply', 42),
  ('Brazil',           'BR', false, 30, 10, 30, NULL, 'No DTA with Australia. Full withholding rates apply.', 43),
  ('Taiwan',           'TW', false, 30, 10, 30, NULL, 'No formal DTA. Full withholding rates apply.', 44)
ON CONFLICT DO NOTHING;

-- ─── Seed log entry ──────────────────────────────────────────
INSERT INTO fi_change_log (category_key, action, changed_by, note)
VALUES
  ('non_resident_tax',  'seed', 'system', 'Initial seed from static TypeScript files — March 2026'),
  ('resident_tax',      'seed', 'system', 'Initial seed from static TypeScript files — March 2026'),
  ('dta_countries',     'seed', 'system', 'Initial seed — 40 DTA countries + 4 no-DTA reference rows'),
  ('dasp_rates',        'seed', 'system', 'Initial seed — 4 component/visa combinations'),
  ('withholding_rates', 'seed', 'system', 'Initial seed — 8 income type rows including 15% CGT WHT'),
  ('property_rules',    'seed', 'system', 'Initial seed — FIRB fees, CGT rate, established home ban, state surcharges');
