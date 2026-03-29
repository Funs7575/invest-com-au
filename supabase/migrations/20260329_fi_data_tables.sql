-- ─────────────────────────────────────────────────────────────────────────────
-- Foreign Investment Hub: fi_* data tables
-- Created: 2026-03-29
--
-- Creates all fi_* tables referenced by lib/fi-data-server.ts and
-- app/api/admin/foreign-investment/seed/route.ts.
--
-- These tables are the DB-backed source of truth for all foreign investment
-- data (tax rates, DTA countries, DASP rates, withholding rates, property
-- rules, data categories, change log).
--
-- Static TypeScript files (lib/foreign-investment-data.ts, lib/firb-data.ts)
-- remain as compile-time fallbacks if the DB is unreachable or tables are
-- empty — so the site never shows blank data.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tax brackets ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_tax_brackets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year   text NOT NULL,
  taxpayer_type text NOT NULL CHECK (taxpayer_type IN ('non_resident', 'resident')),
  income_from numeric(15,2) NOT NULL,
  income_to   numeric(15,2),       -- NULL = no upper limit
  rate        numeric(5,2) NOT NULL,
  description text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tax_year, taxpayer_type, income_from)
);

COMMENT ON TABLE fi_tax_brackets IS
  'Australian individual income tax brackets for residents and non-residents. Editable via admin UI. Static fallback in lib/foreign-investment-data.ts.';

ALTER TABLE fi_tax_brackets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_tax_brackets" ON fi_tax_brackets FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE INDEX IF NOT EXISTS idx_fi_tax_brackets_type ON fi_tax_brackets(taxpayer_type, is_active);


-- ── 2. DTA countries ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_dta_countries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country             text NOT NULL,
  country_code        char(2) NOT NULL,
  has_dta             boolean NOT NULL DEFAULT false,
  dividend_wht        numeric(5,2) NOT NULL DEFAULT 30.00,
  interest_wht        numeric(5,2) NOT NULL DEFAULT 10.00,
  royalties_wht       numeric(5,2) NOT NULL DEFAULT 30.00,
  dta_effective_year  int,
  notes               text,
  ato_reference_url   text,
  sort_order          int NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code)
);

COMMENT ON TABLE fi_dta_countries IS
  'Double Tax Agreement withholding rates for foreign investors. Source: ATO Tax Treaties register. Editable via admin. Static fallback in lib/foreign-investment-data.ts.';

ALTER TABLE fi_dta_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_dta_countries" ON fi_dta_countries FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE INDEX IF NOT EXISTS idx_fi_dta_country_code ON fi_dta_countries(country_code);


-- ── 3. DASP withholding rates ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_dasp_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_type   text NOT NULL,
  visa_category    text NOT NULL CHECK (visa_category IN ('standard', 'whm')),
  withholding_rate numeric(5,2) NOT NULL,
  notes            text,
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_type, visa_category)
);

COMMENT ON TABLE fi_dasp_rates IS
  'DASP (Departing Australia Superannuation Payment) withholding tax rates by visa category. Editable via admin. Static fallback in lib/foreign-investment-data.ts.';

ALTER TABLE fi_dasp_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_dasp_rates" ON fi_dasp_rates FOR SELECT TO anon, authenticated USING (is_active = true);


-- ── 4. Withholding rates by income type ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_withholding_rates (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_type      text NOT NULL UNIQUE,
  standard_rate    text NOT NULL,  -- e.g. "30%"
  with_dta_typical text NOT NULL,  -- e.g. "Typically 15% (varies by country)"
  notes            text,
  color            text NOT NULL DEFAULT 'slate', -- tailwind color name for UI
  sort_order       int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fi_withholding_rates IS
  'Summary withholding rates by income type for the tax guide page callout table. Editable via admin. Static fallback in lib/fi-data-server.ts.';

ALTER TABLE fi_withholding_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_withholding_rates" ON fi_withholding_rates FOR SELECT TO anon, authenticated USING (is_active = true);


-- ── 5. Property rules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_property_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key       text NOT NULL UNIQUE,
  rule_type      text NOT NULL CHECK (rule_type IN ('rate', 'threshold', 'ban', 'fee', 'info')),
  title          text NOT NULL,
  value          text NOT NULL,
  effective_from text,            -- ISO date string e.g. "2025-01-01"
  effective_to   text,            -- ISO date string; NULL = ongoing
  notes          text,
  source_url     text,
  sort_order     int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fi_property_rules IS
  'Key-value store for FIRB/property rules that change frequently (CGT withholding rate, ban dates, stamp duty surcharges). Editable via admin. Fallback: static firb-data.ts.';

ALTER TABLE fi_property_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_property_rules" ON fi_property_rules FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE INDEX IF NOT EXISTS idx_fi_property_rules_key ON fi_property_rules(rule_key);


-- ── 6. Data categories (admin staleness tracking) ─────────────────────────────

CREATE TABLE IF NOT EXISTS fi_data_categories (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key              text NOT NULL UNIQUE,
  display_name              text NOT NULL,
  description               text NOT NULL DEFAULT '',
  review_frequency_days     int NOT NULL DEFAULT 365,
  warning_threshold_days    int NOT NULL DEFAULT 300,
  urgent_threshold_days     int NOT NULL DEFAULT 365,
  last_verified_at          timestamptz,
  verified_by               text,
  source_url                text NOT NULL DEFAULT '',
  source_name               text NOT NULL DEFAULT '',
  effective_date            text,
  notes                     text,
  status                    text NOT NULL DEFAULT 'current'
                              CHECK (status IN ('current', 'needs_review', 'stale', 'urgent')),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fi_data_categories IS
  'Admin data freshness tracking for foreign investment data categories. Used by admin dashboard to flag stale data.';

ALTER TABLE fi_data_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_fi_data_categories" ON fi_data_categories FOR SELECT TO anon, authenticated USING (true);


-- ── 7. Change log ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fi_change_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key   text NOT NULL,
  action         text NOT NULL,  -- 'seed', 'update', 'delete', 'verify'
  changed_by     text NOT NULL,  -- admin email
  record_id      text,
  previous_value jsonb,
  new_value      jsonb,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fi_change_log IS
  'Audit log for all changes to fi_* data tables. Written by admin update/seed API routes.';

-- Change log: admin-only write, no public read needed (admin queries use service role)
ALTER TABLE fi_change_log ENABLE ROW LEVEL SECURITY;
-- No public read policy — admin UI uses service role client which bypasses RLS

CREATE INDEX IF NOT EXISTS idx_fi_change_log_category ON fi_change_log(category_key, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: initial data for all fi_* tables
-- Matches the static TypeScript fallback values so DB and code are always
-- consistent from day one.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Seed: Non-resident tax brackets (2025-26) ─────────────────────────────────

INSERT INTO fi_tax_brackets (tax_year, taxpayer_type, income_from, income_to, rate, description, sort_order)
VALUES
  ('2025-26', 'non_resident',       0,  135000, 30, '$0 – $135,000',       1),
  ('2025-26', 'non_resident',  135001,  190000, 37, '$135,001 – $190,000', 2),
  ('2025-26', 'non_resident',  190001,    NULL, 45, 'Over $190,000',       3),
-- Resident brackets (Stage 3 cuts effective 1 July 2024)
  ('2025-26', 'resident',          0,   18200,  0, 'Tax-free threshold',   1),
  ('2025-26', 'resident',      18201,   45000, 16, '$18,201 – $45,000',    2),
  ('2025-26', 'resident',      45001,  135000, 30, '$45,001 – $135,000',   3),
  ('2025-26', 'resident',     135001,  190000, 37, '$135,001 – $190,000',  4),
  ('2025-26', 'resident',     190001,    NULL, 45, 'Over $190,000',        5)
ON CONFLICT (tax_year, taxpayer_type, income_from) DO NOTHING;


-- ── Seed: DTA countries ────────────────────────────────────────────────────────

INSERT INTO fi_dta_countries (country, country_code, has_dta, dividend_wht, interest_wht, royalties_wht, dta_effective_year, notes, sort_order)
VALUES
  ('United States',     'US', true,  15, 10,  5, 1983, '5% for companies with ≥10% interest; 15% otherwise',                               1),
  ('United Kingdom',    'GB', true,  15, 10,  5, 2003, NULL,                                                                                2),
  ('New Zealand',       'NZ', true,  15, 10,  5, 2010, NULL,                                                                                3),
  ('Japan',             'JP', true,  10, 10,  5, 2008, NULL,                                                                                4),
  ('China',             'CN', true,  15, 10, 10, 1990, NULL,                                                                                5),
  ('Singapore',         'SG', true,  15, 10, 10, 2010, NULL,                                                                                6),
  ('Germany',           'DE', true,  15, 10,  5, 1975, NULL,                                                                                7),
  ('France',            'FR', true,  15, 10,  5, 2006, NULL,                                                                                8),
  ('Canada',            'CA', true,  15, 10, 10, 1981, NULL,                                                                                9),
  ('South Korea',       'KR', true,  15, 15, 15, 1984, NULL,                                                                               10),
  ('India',             'IN', true,  15, 15, 10, 1991, NULL,                                                                               11),
  ('Indonesia',         'ID', true,  15, 10, 10, 1993, NULL,                                                                               12),
  ('Malaysia',          'MY', true,  15, 15, 10, 1982, NULL,                                                                               13),
  ('Thailand',          'TH', true,  15, 25, 15, 1989, 'Royalties 5% for cultural, literary or artistic work',                            14),
  ('Vietnam',           'VN', true,  15, 10, 10, 1996, NULL,                                                                               15),
  ('Philippines',       'PH', true,  25, 15, 25, 1979, 'Reduced rates apply to certain types of income',                                  16),
  ('Hong Kong',         'HK', true,  15, 10,  5, 2011, NULL,                                                                               17),
  ('Switzerland',       'CH', true,  15, 10, 10, 1981, NULL,                                                                               18),
  ('Netherlands',       'NL', true,  15, 10, 10, 1976, NULL,                                                                               19),
  ('Italy',             'IT', true,  15, 10, 10, 1985, NULL,                                                                               20),
  ('Spain',             'ES', true,  15, 10, 10, 1992, NULL,                                                                               21),
  ('Ireland',           'IE', true,  15, 10, 10, 1983, NULL,                                                                               22),
  ('South Africa',      'ZA', true,  15, 10, 10, 1999, NULL,                                                                               23),
  ('United Arab Emirates','AE', false, 30, 10, 30, NULL,'No DTA — Australian standard rates apply',                                        24),
  ('Saudi Arabia',      'SA', false, 30, 10, 30, NULL, 'No DTA — Australian standard rates apply',                                        25),
  ('Brazil',            'BR', false, 30, 10, 30, NULL, 'No DTA with Australia. Full withholding rates apply.',                            26),
  ('Mexico',            'MX', true,  15, 10, 10, 2004, NULL,                                                                               27),
  ('Taiwan',            'TW', false, 30, 10, 30, NULL, 'No formal DTA. Full withholding rates apply.',                                    28),
  ('Russia',            'RU', true,  15, 10, 10, 2000, NULL,                                                                               29),
  ('Chile',             'CL', true,  15, 15, 10, 2013, NULL,                                                                               30),
  ('Norway',            'NO', true,  15, 10,  5, 2006, NULL,                                                                               31),
  ('Denmark',           'DK', true,  15, 10, 10, 1981, NULL,                                                                               32),
  ('Sweden',            'SE', true,  15, 10, 10, 1981, NULL,                                                                               33),
  ('Finland',           'FI', true,  15, 10,  5, 2007, NULL,                                                                               34),
  ('Austria',           'AT', true,  15, 10, 10, 1988, NULL,                                                                               35),
  ('Belgium',           'BE', true,  15, 10, 10, 1986, NULL,                                                                               36),
  ('Czech Republic',    'CZ', true,  15, 10, 10, 1995, NULL,                                                                               37),
  ('Hungary',           'HU', true,  15, 10, 10, 1992, NULL,                                                                               38),
  ('Poland',            'PL', true,  15, 10, 10, 1992, NULL,                                                                               39),
  ('Romania',           'RO', true,  15, 10, 10, 2001, NULL,                                                                               40),
  ('Turkey',            'TR', true,  15, 10, 10, 2011, NULL,                                                                               41),
  ('Papua New Guinea',  'PG', true,  15, 10, 10, 1990, NULL,                                                                               42)
ON CONFLICT (country_code) DO NOTHING;


-- ── Seed: DASP withholding rates ───────────────────────────────────────────────

INSERT INTO fi_dasp_rates (component_type, visa_category, withholding_rate, notes, sort_order)
VALUES
  (
    'Taxed element (most common)',
    'standard',
    35,
    'Most super contributions and earnings fall into this category. Employer SG contributions and salary sacrifice are in this element.',
    1
  ),
  (
    'Untaxed element',
    'standard',
    45,
    'Applies to some public sector / defined benefit funds where contributions weren''t taxed on the way in.',
    2
  ),
  (
    'Tax-free component',
    'standard',
    0,
    'Non-concessional (after-tax) contributions that have already had tax paid.',
    3
  ),
  (
    'All components — Working Holiday Maker',
    'whm',
    65,
    'WHM visa holders (subclass 417 and 462) pay 65% across ALL super components regardless of element type.',
    4
  )
ON CONFLICT (component_type, visa_category) DO NOTHING;


-- ── Seed: Withholding rates by income type ─────────────────────────────────────

INSERT INTO fi_withholding_rates (income_type, standard_rate, with_dta_typical, notes, color, sort_order)
VALUES
  (
    'Dividends (unfranked)',
    '30%',
    'Typically 15% (varies by country)',
    'Applied to the unfranked portion of dividends paid to non-residents',
    'red', 1
  ),
  (
    'Dividends (fully franked)',
    '0%',
    '0%',
    'Tax already paid via imputation system. Non-residents receive the dividend gross but cannot claim the franking credit refund.',
    'green', 2
  ),
  (
    'Dividends (partially franked)',
    '30% on unfranked portion',
    'Typically 15% on unfranked portion',
    'WHT applies only to the unfranked component.',
    'amber', 3
  ),
  (
    'Interest (bank deposits, bonds)',
    '10%',
    'Typically 10% (rarely reduced below 10%)',
    'Final withholding tax. No Australian return required for passive interest income only.',
    'amber', 4
  ),
  (
    'Royalties',
    '30%',
    'Typically 5–15% (varies significantly)',
    'Covers intellectual property, patents, copyright, software licences.',
    'red', 5
  ),
  (
    'Rental income',
    'Non-resident rates (30%+ no TFT)',
    'DTAs rarely reduce rental income WHT',
    'Australian rental income is taxed at non-resident rates. Australian tax return required.',
    'orange', 6
  ),
  (
    'CGT — Australian real property',
    'Non-resident rates + 15% buyer WHT on sale >$750k',
    'No CGT exemption for real property',
    'No 50% CGT discount for non-residents. 15% WHT deducted from sale price by buyer''s conveyancer (rate increased from 12.5% effective 1 Jan 2025).',
    'red', 7
  ),
  (
    'CGT — Listed Australian shares (<10% holding)',
    '0% (exempt)',
    '0%',
    'Section 855-10 exemption: non-residents generally exempt from CGT on portfolio share investments in listed Australian companies.',
    'green', 8
  )
ON CONFLICT (income_type) DO NOTHING;


-- ── Seed: Property rules ───────────────────────────────────────────────────────

INSERT INTO fi_property_rules (rule_key, rule_type, title, value, effective_from, effective_to, notes, source_url, sort_order)
VALUES
  (
    'cgt_withholding_rate',
    'rate',
    'Foreign resident CGT withholding rate',
    '15%',
    '2025-01-01',
    NULL,
    'Rate increased from 12.5% to 15% effective 1 January 2025. Applies to sale proceeds on properties over $750,000.',
    'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-cgt/foreign-resident-capital-gains-withholding',
    1
  ),
  (
    'established_home_ban_start',
    'ban',
    'Temporary resident established home purchase ban — start date',
    '2025-04-01',
    '2025-04-01',
    '2027-03-31',
    'Australian Government ban on foreign persons (including temporary residents) purchasing established dwellings. Temporary measure.',
    'https://firb.gov.au/guidance-resources/guidance-notes/gn8',
    2
  ),
  (
    'established_home_ban_end',
    'ban',
    'Temporary resident established home purchase ban — end date',
    '2027-03-31',
    '2025-04-01',
    '2027-03-31',
    'The ban is currently scheduled to expire 31 March 2027 unless extended by the government.',
    'https://firb.gov.au/guidance-resources/guidance-notes/gn8',
    3
  ),
  (
    'firb_fee_base',
    'fee',
    'FIRB application fee — properties up to $1M',
    '$14,100',
    '2026-01-01',
    NULL,
    'Non-refundable. Indexed annually on 1 January.',
    'https://firb.gov.au/applications/fees',
    4
  ),
  (
    'stamp_duty_surcharge_nsw',
    'rate',
    'NSW foreign purchaser stamp duty surcharge',
    '8%',
    NULL,
    NULL,
    'Applied on top of standard stamp duty on the dutiable value. Plus 4% annual land tax surcharge.',
    'https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/foreign-buyer',
    5
  ),
  (
    'stamp_duty_surcharge_vic',
    'rate',
    'VIC foreign purchaser additional duty (FPAD)',
    '8%',
    NULL,
    NULL,
    'Plus 2% annual land tax surcharge for foreign-owned properties.',
    'https://www.sro.vic.gov.au/foreignpurchasers',
    6
  ),
  (
    'stamp_duty_surcharge_qld',
    'rate',
    'QLD additional foreign acquirer duty (AFAD)',
    '7%',
    NULL,
    NULL,
    'Plus 2% land tax surcharge for foreign owners.',
    'https://www.qro.qld.gov.au/duties/transfer-duty/additional-foreign-acquirer-duty/',
    7
  ),
  (
    'cgt_withholding_threshold',
    'threshold',
    'Foreign resident CGT withholding threshold',
    '$750,000',
    '2017-07-01',
    NULL,
    'Properties with a market value of $750,000 or more require the buyer to withhold 15% of the purchase price and remit to the ATO unless the vendor provides a clearance certificate.',
    'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax/foreign-residents-and-cgt/foreign-resident-capital-gains-withholding',
    8
  ),
  (
    'firb_residential_threshold',
    'threshold',
    'FIRB residential property notification threshold (2026)',
    '$1,195,000',
    '2026-01-01',
    NULL,
    'Indexed annually on 1 January. Applies to most foreign persons. Foreign companies and trusts have a $0 threshold.',
    'https://firb.gov.au/applications/fees',
    9
  )
ON CONFLICT (rule_key) DO NOTHING;


-- ── Seed: Data categories ──────────────────────────────────────────────────────

INSERT INTO fi_data_categories (
  category_key, display_name, description,
  review_frequency_days, warning_threshold_days, urgent_threshold_days,
  source_url, source_name, effective_date,
  last_verified_at, verified_by, status
)
VALUES
  (
    'tax_brackets',
    'Income Tax Brackets',
    'Non-resident and resident tax brackets and rates. Updated by the ATO each income year (1 July).',
    365, 300, 365,
    'https://www.ato.gov.au/rates/individual-income-tax-rates/', 'ATO',
    '2025-07-01',
    now(), 'system', 'current'
  ),
  (
    'dta_countries',
    'DTA Withholding Rates',
    'Double Tax Agreement withholding rates for dividends, interest, and royalties. DTAs change infrequently.',
    730, 600, 730,
    'https://www.ato.gov.au/General/International-tax-agreements/', 'ATO',
    NULL,
    now(), 'system', 'current'
  ),
  (
    'dasp_rates',
    'DASP Withholding Rates',
    'Departing Australia Superannuation Payment withholding rates. Standard rates rarely change; WHM rate set by legislation.',
    365, 300, 365,
    'https://www.ato.gov.au/individuals/super/in-detail/leaving-australia/', 'ATO',
    NULL,
    now(), 'system', 'current'
  ),
  (
    'withholding_rates',
    'Withholding Rate Summary',
    'Summary table of WHT rates by income type shown on the tax guide page.',
    365, 300, 365,
    'https://www.ato.gov.au/individuals/international-tax-for-individuals/', 'ATO',
    NULL,
    now(), 'system', 'current'
  ),
  (
    'property_rules',
    'Property & FIRB Rules',
    'FIRB thresholds, fees, stamp duty surcharges, CGT withholding rate, and temporary ban dates.',
    90, 60, 90,
    'https://firb.gov.au', 'FIRB',
    '2026-01-01',
    now(), 'system', 'current'
  )
ON CONFLICT (category_key) DO NOTHING;
