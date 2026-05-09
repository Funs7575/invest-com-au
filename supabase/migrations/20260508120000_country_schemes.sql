-- ============================================================================
-- Migration: 20260508120000_country_schemes.sql
-- Purpose: Add the `country_schemes` table that powers the new
--          government-schemes-and-grants section on every
--          /foreign-investment/<country> page. Editorial team can update
--          rows via /admin/country-schemes (service-role) without code
--          deploys; public consumers read via anon JWT under RLS.
-- Rollback: DROP TABLE IF EXISTS public.country_schemes;
--           (DESTRUCTIVE — discards all seeded + admin-edited rows. Re-run
--           this migration's seed block to repopulate the launch-day rows.)
-- Risk: low — additive; no foreign keys; no consumers depend on it before
--       the matching application code lands.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.country_schemes (...).
--   2. CREATE INDEX idx_country_schemes_lookup.
--   3. ALTER TABLE ... ENABLE + FORCE ROW LEVEL SECURITY.
--   4. CREATE POLICY public anon SELECT (active = true).
--   5. CREATE POLICY service_role ALL.
--   6. INSERT initial seed rows (UK x6, US-AU dual x6, India x6).
--
-- Rollback (destructive):
--   - DROP TABLE IF EXISTS public.country_schemes;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.country_schemes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_code    text   NOT NULL,                         -- ISO-2 uppercase, matches country_investment_profiles.country_code
  audience        text   NOT NULL CHECK (audience IN (
                    'inbound_migrant',
                    'us_au_dual',
                    'non_resident_investor',
                    'outbound_australian'
                  )),
  category        text   NOT NULL CHECK (category IN (
                    'visa_pathway',
                    'firb_threshold',
                    'tax_concession',
                    'super_rule',
                    'pension_transfer',
                    'first_home_buyer',
                    'investor_grant',
                    'dual_tax_treaty'
                  )),
  name            text   NOT NULL,
  summary         text   NOT NULL,
  body_md         text   NOT NULL,
  threshold_cents bigint,
  threshold_label text,
  source_name     text   NOT NULL,
  source_url      text   NOT NULL,
  sourced_at      date   NOT NULL,
  stales_at       date   NOT NULL,                         -- V-NEW-01 CI dated-stats gate reads this
  display_order   integer NOT NULL DEFAULT 0,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_country_schemes_lookup
  ON public.country_schemes (country_code, active, audience, display_order);

ALTER TABLE public.country_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_schemes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active country schemes" ON public.country_schemes;
CREATE POLICY "Public can read active country schemes"
  ON public.country_schemes FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Service role full access to country schemes" ON public.country_schemes;
CREATE POLICY "Service role full access to country schemes"
  ON public.country_schemes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- Seed: 18 launch-day rows. Each carries a citation and a stales_at so the
-- V-NEW-01 CI gate alerts when the rule is overdue for review. stales_at
-- values are aligned with each item's known regulatory review cycle.
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO public.country_schemes
  (country_code, audience, category, name, summary, body_md,
   threshold_cents, threshold_label,
   source_name, source_url, sourced_at, stales_at, display_order)
VALUES
-- ── UK (GB) ──────────────────────────────────────────────────────────────
('GB', 'inbound_migrant', 'pension_transfer',
  'UK pension transfer to Australia (QROPS)',
  'UK pensions can move to a Qualifying Recognised Overseas Pension Scheme (QROPS) once you''re 55+ and an Australian tax resident. Transfers before 55 trigger HMRC penalties.',
  E'**Eligibility**\n- Australian tax resident, age 55+\n- Receiving Australian super fund must be on HMRC''s ROPS list\n\n**Why advisors matter**\n- 25% Overseas Transfer Charge applies if conditions break\n- Concessional/non-concessional cap interaction with AU super contribution limits\n- HMRC reporting for 10 years post-transfer (Form ROPS 14)',
  NULL, NULL,
  'HMRC ROPS notification list', 'https://www.gov.uk/guidance/check-the-recognised-overseas-pension-schemes-notification-list',
  '2026-04-15', '2026-10-15', 10),

('GB', 'inbound_migrant', 'firb_threshold',
  'FIRB foreign-buyer rules for UK citizens',
  'UK citizens are foreign persons under FIRB. Established dwellings are blocked from 1 April 2025 to 31 March 2027. New/off-the-plan and vacant land remain available with FIRB approval.',
  E'**What you can buy**\n- New dwellings, off-the-plan apartments, vacant land (with FIRB approval)\n- Commercial property above the $310M general threshold (lower for sensitive land)\n\n**What you can''t buy until April 2027**\n- Established (existing) dwellings — Foreign Acquisitions and Takeovers Amendment 2024',
  NULL, '$310M general business threshold',
  'FIRB Guidance Note 6', 'https://firb.gov.au/guidance-resources/guidance-notes/gn06',
  '2026-04-01', '2027-03-31', 20),

('GB', 'inbound_migrant', 'visa_pathway',
  'Significant Investor Visa (188C) for UK applicants',
  'UK applicants can use the SIV stream of the Business Innovation & Investment programme: AUD $5M into complying Australian investments, minimal physical residency, direct path to PR.',
  E'**Eligibility**\n- AUD $5M into complying investments (≥10% emerging companies, ≥30% balancing investments, balance into managing investments)\n- 4 years on provisional 188; 40 days/year physical presence\n- Convert to 888 permanent visa at end of provisional period',
  500000000, 'AUD $5,000,000 minimum',
  'Department of Home Affairs', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/significant-investor-188-c',
  '2026-03-10', '2026-09-10', 30),

('GB', 'inbound_migrant', 'first_home_buyer',
  'NSW First Home Buyer Choice (UK migrants on PR)',
  'UK migrants who become Australian permanent residents can access state First Home Buyer concessions. NSW FHBC lets eligible buyers swap upfront stamp duty for an annual property tax.',
  E'**Eligibility**\n- Australian PR (or citizen, or NZ citizen)\n- Property value ≤ NSW threshold (currently $1.5M for FHBC choice)\n- Live in the home for 6+ months within the first year\n\nFHBC was paused for new entrants from 1 July 2023; check current eligibility before relying on this.',
  150000000, '$1.5M property cap',
  'Revenue NSW', 'https://www.revenue.nsw.gov.au/grants-schemes/first-home-buyer/first-home-buyer-choice',
  '2026-04-01', '2026-12-31', 40),

('GB', 'inbound_migrant', 'super_rule',
  'Australian super contribution caps for UK migrants',
  'New Australian tax residents can use the bring-forward rule: 3 years of non-concessional contributions in one year (up to $360k) once tax-resident, plus a one-off carry-forward of unused concessional cap.',
  E'**Caps (FY2025-26)**\n- Concessional (pre-tax): $30k/year\n- Non-concessional (after-tax): $120k/year, or $360k under the bring-forward rule\n- Total super balance must be < $1.9M to use bring-forward\n\nQROPS transfers count against non-concessional cap unless made under specific transitional rules.',
  36000000, '$360k bring-forward cap',
  'Australian Taxation Office', 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/contribution-caps',
  '2026-04-01', '2026-09-30', 50),

('GB', 'inbound_migrant', 'dual_tax_treaty',
  'UK–Australia Double Tax Agreement (DTA)',
  'The 2003 UK-AU DTA prevents most income from being taxed twice. Dividends are capped at 15% (5% for substantial holdings), interest at 10%, royalties at 5%.',
  E'**Common UK-AU outcomes**\n- AU resident with UK rental income: tax in UK first, claim foreign-income credit in AU\n- AU resident with UK pension (post-QROPS): typically AU-only\n- AU resident with UK savings interest: 10% UK withholding, credit available\n\nResidency tie-breaker rules (Article 4) determine where you''re treated as resident for the year you move.',
  NULL, NULL,
  'ATO — UK-AU DTA reference', 'https://www.ato.gov.au/individuals-and-families/coming-to-australia-or-going-overseas/in-detail/dual-residents/uk-australia-tax-treaty',
  '2026-04-12', '2027-04-12', 60),

-- ── US-AU dual citizens (US) ──────────────────────────────────────────────
('US', 'us_au_dual', 'tax_concession',
  'US Streamlined Filing Compliance Procedures',
  'US citizens and green-card holders living in Australia who haven''t filed US returns can become compliant via the IRS Streamlined Foreign Offshore Procedures — usually penalty-free if non-wilful.',
  E'**Eligibility**\n- US person living abroad (≥330 days outside US in 1 of last 3 years)\n- Non-wilful non-compliance\n- File 3 years of returns + 6 years of FBARs\n\nThis is a one-shot remedy. Once IRS opens an audit or examination, the streamlined procedures are off the table.',
  NULL, NULL,
  'IRS — Streamlined Filing Compliance', 'https://www.irs.gov/individuals/international-taxpayers/streamlined-filing-compliance-procedures',
  '2026-03-01', '2027-03-01', 10),

('US', 'us_au_dual', 'tax_concession',
  'PFIC trap on Australian managed funds',
  'Most AU managed funds and ETFs are Passive Foreign Investment Companies under US tax law. Without the QEF election, gains are taxed at the highest US rate plus interest charges — often 50%+ effective.',
  E'**Why it matters**\n- AU index ETFs (VAS, VGS, A200, etc.) are PFICs to the IRS\n- Default Section 1291 treatment applies a punitive interest charge\n- QEF election needs annual issuer statements — most AU funds don''t provide them\n\n**Common workaround**: hold individual ASX shares instead of pooled funds, or use a US-domiciled ETF (VTI, VOO) for offshore equity exposure.',
  NULL, NULL,
  'IRS — Form 8621 (PFIC reporting)', 'https://www.irs.gov/forms-pubs/about-form-8621',
  '2026-04-05', '2027-04-05', 20),

('US', 'us_au_dual', 'tax_concession',
  'FATCA and FBAR reporting thresholds',
  'US citizens in Australia must report foreign accounts above two thresholds: FBAR (FinCEN 114) at any account aggregate over $10k, and FATCA Form 8938 starting at $200k (single, abroad).',
  E'**FBAR (annual, FinCEN 114)**\n- Triggered at $10k aggregate across all foreign accounts\n- Must be filed for super, AU bank accounts, AU brokerage, AU life insurance with cash value\n\n**FATCA (Form 8938, attached to 1040)**\n- Single filer abroad: $200k year-end / $300k peak\n- Married filing jointly abroad: $400k year-end / $600k peak',
  20000000, '$200k Form 8938 threshold (single, abroad)',
  'FinCEN — Report of Foreign Bank Accounts', 'https://bsaefiling.fincen.treas.gov/main.html',
  '2026-04-15', '2027-04-15', 30),

('US', 'us_au_dual', 'super_rule',
  'Australian super under the US-AU tax treaty',
  'The US doesn''t recognise Australian super as a qualified retirement plan. Treaty Article 18 covers "pensions paid by reason of past employment" — superannuation contributions and earnings can still create US tax events before retirement.',
  E'**Common positions (talk to a US-AU specialist before relying on any)**\n- Employer SG contributions: arguably treaty-exempt under Article 18(1)\n- Salary-sacrificed contributions: contested; some advisors treat as W-2 wages\n- Earnings inside super: arguably grantor-trust income to the US member\n- Lump-sum withdrawal pre-retirement: PFIC + grantor-trust + treaty interplay\n\nThis area has no IRS rev-rul; positions are advisor-by-advisor.',
  NULL, NULL,
  'US-AU Tax Convention 1982 + 2001 Protocol', 'https://www.irs.gov/businesses/international-businesses/australia-tax-treaty-documents',
  '2026-04-12', '2027-04-12', 40),

('US', 'us_au_dual', 'dual_tax_treaty',
  'US-AU Social Security Totalisation Agreement',
  'The 2002 totalisation agreement lets US-AU duals combine work credits across both countries to qualify for US Social Security or AU Age Pension, and avoid paying both FICA and SG on the same wages.',
  E'**Who benefits**\n- Self-employed US citizens in AU: SG-exempt for first 5 years if covered by US Social Security\n- AU residents close to qualifying for US benefits: combine credits to reach 40 quarters\n- Snowbirds returning to US: AU work years count toward US pension\n\nA Certificate of Coverage from one country exempts you from the other''s contributions.',
  NULL, NULL,
  'US Social Security Administration', 'https://www.ssa.gov/international/Agreement_Pamphlets/australia.html',
  '2026-03-20', '2027-03-20', 50),

('US', 'us_au_dual', 'tax_concession',
  'Roth IRA treatment for Australian residents',
  'Australia treats most Roth IRA distributions as non-assessable under the US-AU DTA and ATO Class Ruling — but the position depends on whether contributions were post-tax US dollars and whether the AU member elected the foreign super fund treatment on entry.',
  E'**Best-case (most US-AU duals)**\n- Roth withdrawals are tax-free in both countries\n- Annual ordinary income inside the Roth may still be reportable in AU\n\n**Watch-outs**\n- Backdoor Roth contributions made while AU-resident are treated as super-style\n- Conversions from Traditional IRA may be assessable income to AU\n\nGet a US-AU specialist to lodge an ATO private ruling for material balances.',
  NULL, NULL,
  'ATO Class Ruling CR 2007/95 (US Roth IRAs)', 'https://www.ato.gov.au/law/view/document?docid=CLR/CR200795/NAT/ATO/00001',
  '2026-02-10', '2027-02-10', 60),

-- ── India (IN) ────────────────────────────────────────────────────────────
('IN', 'inbound_migrant', 'tax_concession',
  'NRI tax residency rules for Australia-bound Indians',
  'Once you become an Australian tax resident, India taxes your Indian-sourced income only (NRI status). Returning Indians may use ROR (Resident & Ordinarily Resident) or RNOR transitional status to shelter foreign income for up to 3 years.',
  E'**Becoming NRI in India (post-AU move)**\n- Stay <182 days in India in the financial year (April-March)\n- Foreign income (incl. AU salary, super) becomes outside India''s scope\n\n**RNOR window on return to India (3 years)**\n- Foreign-sourced income (AU super withdrawals, AU rental) remains India-tax-exempt\n- Plan AU super withdrawals before ROR status kicks in to avoid double-taxation gap',
  NULL, NULL,
  'India Income Tax Department — Residential Status', 'https://incometaxindia.gov.in/Pages/individual-residential-status.aspx',
  '2026-04-01', '2027-03-31', 10),

('IN', 'outbound_australian', 'super_rule',
  'Departing Australia Superannuation Payment (DASP)',
  'Indian visa-holders leaving Australia can claim their super as a DASP. Withholding tax is 35% on tax-free + taxable (taxed) elements, 45% on taxable (untaxed) — well above ordinary super tax rates.',
  E'**Eligibility**\n- Held a temporary visa (not 410, 405, or PR)\n- Permanently departed AU and visa expired/cancelled\n- Submit within 6 months of departure or super may be transferred to ATO unclaimed-super\n\n**Strategy if you might return on PR**: don''t take DASP. AU super stays tax-advantaged and is portable across visa classes if you become PR/citizen later.',
  NULL, '35% / 45% withholding rates',
  'ATO — Departing Australia super payment', 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/departing-australia-superannuation-payment-dasp',
  '2026-04-15', '2027-04-15', 20),

('IN', 'inbound_migrant', 'dual_tax_treaty',
  'India-Australia DTA — dividends, interest, royalties',
  'The 1991 (and 2011 amending protocol) India-AU DTA caps Indian withholding on dividends to AU residents at 15%, interest at 15%, and royalties at 10/15%. Australian-resident Indians use foreign-income credits to avoid double taxation.',
  E'**Common India-AU outcomes**\n- AU resident with Indian rental income: tax in India first (TDS), credit in AU\n- AU resident with Indian mutual fund redemptions: complex — capital gains rules differ; specialist required\n- AU resident with Indian PPF/EPF: treated as pension under Article 18 once retired',
  NULL, '15% dividend WHT cap',
  'ATO — India-Australia DTA reference', 'https://www.ato.gov.au/law/view/document?docid=TXR/TR201131/NAT/ATO/00001',
  '2026-03-15', '2027-03-15', 30),

('IN', 'inbound_migrant', 'investor_grant',
  'FEMA repatriation cap (Liberalised Remittance Scheme)',
  'Indian residents moving to Australia can remit up to USD $250k per financial year per person under the Liberalised Remittance Scheme — covers property purchase, investment, education, gifts.',
  E'**LRS scope (USD $250k/year/person)**\n- Direct/indirect investments overseas\n- Real estate purchase\n- Maintenance of close relatives\n- Education + medical expenses\n\n**Once you''re NRI (>1 year abroad)**, LRS limits don''t apply — a separate NRO/NRE account framework governs cross-border flows.',
  37500000, 'USD $250,000 per FY',
  'Reserve Bank of India — LRS Master Direction', 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11625',
  '2026-04-01', '2027-04-01', 40),

('IN', 'inbound_migrant', 'firb_threshold',
  'FIRB rules for Indian investors',
  'Indian citizens are foreign persons under FIRB and pay the higher Australian fee schedule. Established dwellings are blocked until 31 March 2027; new dwellings need FIRB approval and a per-property fee.',
  E'**Indicative FIRB application fees (residential, FY2025-26)**\n- Property under $1M: ~$15k\n- Property $1M–$2M: ~$30k\n- Property $2M–$3M: ~$60k (rises sharply above this)\n\nFees are non-refundable and vary by year — confirm on FIRB''s fee schedule before lodging.',
  NULL, '$15k+ application fee',
  'FIRB Application Fees', 'https://firb.gov.au/guidance-resources/guidance-notes/gn29',
  '2026-04-01', '2027-03-31', 50),

('IN', 'inbound_migrant', 'visa_pathway',
  'Skilled Independent visa (189) — popular with Indian applicants',
  'The Skilled Independent visa is the most-used PR pathway for Indian applicants: 65+ points, occupation on the MLTSSL, English testing, no employer sponsor needed.',
  E'**Points components**\n- Age (max 30 pts), English (max 20 pts), Skilled employment (max 20 pts)\n- Education (max 20 pts), Australian study, partner skills, regional study\n\n**Tax & investing implications post-PR**\n- Switch to PR triggers full AU tax residency from arrival/PR grant date (whichever later)\n- Time AU super contributions and offshore-asset disposals around the residency date',
  NULL, '65+ points minimum',
  'Department of Home Affairs', 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189',
  '2026-04-01', '2026-12-31', 60);

COMMIT;
