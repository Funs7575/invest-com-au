-- ============================================================
-- Oil & Gas Expansion — vertical enrichment, 12 listings,
-- 4 new advisor types and 12 professional seeds.
--
-- Idempotent:
--   * investment_verticals / investment_listings / professionals
--     use ON CONFLICT (slug) DO UPDATE / DO NOTHING so re-runs
--     are safe and converge on the declared state.
--   * CHECK constraint swap: DROP IF EXISTS + ADD. The set of
--     currently-in-use type values has been pre-verified against
--     the new allowed list to prevent violation on ADD.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enrich the oil-gas vertical row
-- ────────────────────────────────────────────────────────────
UPDATE public.investment_verticals
SET
  hero_title =
    'Invest in Australian Oil & Gas — Stocks, LNG & Energy Infrastructure',
  hero_subtitle =
    'Australia is the world''s 2nd-largest LNG exporter. Access ASX energy stocks, unlisted energy funds, and project equity raises across oil, gas, LNG, and refinery infrastructure.',
  description =
    'Australian oil and gas investment spans ASX-listed producers like Woodside and Santos, government-backed refineries (Viva Energy Geelong, Ampol Lytton), LNG export infrastructure, and upstream exploration. With Australia''s fuel security under pressure and Brent crude elevated through 2026, energy is one of the most searched investment categories of the year. The National Fuel Security Plan and FSSP refinery subsidies extended to 2030 underpin long-term domestic energy investment.',
  fdi_share_percent = 8.2,
  domestic = true,
  international = true,
  active = true
WHERE slug = 'oil-gas';

-- ────────────────────────────────────────────────────────────
-- 2. 12 investment listings — upserts keyed on slug
--    Woodside/Santos/Beach/Karoon already exist in vertical='mining'
--    (ids 56-59). Realign them to vertical='oil-gas' on upsert.
--    OOO (id=60) retains id via slug match.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, sub_category, key_metrics,
  listing_type, firb_eligible, siv_complying,
  contact_email, status
) VALUES

-- 1. Woodside Energy (WDS) — ASX major
('oil-gas',
 'Woodside Energy (WDS) — Australia''s Largest Oil & Gas Producer',
 'woodside-energy-wds',
 'ASX-listed supermajor. Operator of the North West Shelf LNG venture, Pluto LNG, Scarborough gas project (first LNG 2026), and Sangomar oil (Senegal). Combined Woodside/BHP Petroleum FY23 revenue A$13.99B. Dividend yield historically 7-11% fully franked.',
 'WA', 'Perth',
 NULL, 'ASX: WDS',
 'Energy', 'Integrated Oil & Gas',
 '{"asx_ticker":"WDS","commodity":"oil_gas_lng","stage":"producer","market_cap_bn_aud":55.0,"dividend_yield":"fully_franked","firb_note":"ASX shareholding >20% triggers FIRB; portfolio investment exempt"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 2. Santos (STO)
('oil-gas',
 'Santos (STO) — Diversified Oil & Gas',
 'santos-sto',
 'Second-largest ASX energy producer. GLNG (Queensland CSG-to-LNG), PNG LNG (19% stake), Cooper Basin, Bayu-Undan (Timor-Leste), and the Barossa project (first gas 2026). Historically lower yield than Woodside but stronger growth pipeline.',
 'SA', 'Adelaide',
 NULL, 'ASX: STO',
 'Energy', 'Diversified Oil & Gas',
 '{"asx_ticker":"STO","commodity":"oil_gas_lng","stage":"producer","market_cap_bn_aud":24.0,"firb_note":"FIRB notifiable on ≥20% stake"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 3. Viva Energy (VEA) — Geelong refinery
('oil-gas',
 'Viva Energy (VEA) — Geelong Refinery & Shell-Branded Retail',
 'viva-energy-vea',
 'One of two remaining Australian domestic refineries (Geelong, VIC). Refines ~120 million barrels of crude a year. FSSP refinery production payments extended to 2030. Operates ~1,340 Shell- and Coles Express-branded service stations nationally. Critical fuel security asset.',
 'VIC', 'Geelong',
 NULL, 'ASX: VEA',
 'Energy', 'Refining & Retail',
 '{"asx_ticker":"VEA","commodity":"refined_fuels","stage":"producer","market_cap_bn_aud":5.2,"refinery_capacity_bbl_day":120000,"fssp_eligible":true}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 4. Ampol (ALD) — Lytton refinery
('oil-gas',
 'Ampol (ALD) — Lytton Refinery & National Retail Network',
 'ampol-ald',
 'Australia''s largest transport fuels supplier. Operates the Lytton refinery (Brisbane, QLD) — the other surviving domestic refinery — and ~1,900 branded retail sites. FSSP refinery subsidy recipient through 2030. Transitioning retail sites to EV charging via AmpCharge.',
 'NSW', 'Sydney',
 NULL, 'ASX: ALD',
 'Energy', 'Refining & Retail',
 '{"asx_ticker":"ALD","commodity":"refined_fuels","stage":"producer","market_cap_bn_aud":7.8,"refinery_capacity_bbl_day":109000,"fssp_eligible":true}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 5. Beach Energy (BPT)
('oil-gas',
 'Beach Energy (BPT) — Mid-Cap Oil & Gas',
 'beach-energy-bpt',
 'Mid-cap ASX producer focused on the Cooper Basin (SA/QLD), Otway Basin (VIC), Taranaki (NZ), and Perth Basin. Seeley Group (Kerry Stokes) holds ~30%. Waitsia Stage 2 LNG expected to underpin FY26 cash flows. Typically trades at a discount to producer peers.',
 'SA', 'Adelaide',
 NULL, 'ASX: BPT',
 'Energy', 'Mid-Cap Oil & Gas',
 '{"asx_ticker":"BPT","commodity":"oil_gas","stage":"producer","market_cap_bn_aud":3.4,"firb_note":"FIRB notifiable on ≥20% stake"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 6. Karoon Energy (KAR)
('oil-gas',
 'Karoon Energy (KAR) — International Oil Explorer',
 'karoon-energy-kar',
 'Australian-domiciled, internationally focused oil producer. Core asset is the Baúna field offshore Brazil, acquired from Petrobras in 2020. Adds development upside via Who Dat (US Gulf) acquisition in 2024. Leverages Brent pricing directly — more upstream beta than Woodside/Santos.',
 'VIC', 'Melbourne',
 NULL, 'ASX: KAR',
 'Energy', 'International E&P',
 '{"asx_ticker":"KAR","commodity":"oil","stage":"producer","market_cap_bn_aud":1.3,"asset_focus":"Brazil_US"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 7. BetaShares Crude Oil ETF (OOO) — refresh existing id=60
('oil-gas',
 'BetaShares Crude Oil Index ETF (OOO)',
 'betashares-crude-oil-etf-ooo',
 'ASX-listed currency-hedged ETF tracking the S&P GSCI Crude Oil Index Excess Return (AUD hedged). Provides retail-accessible WTI crude oil price exposure without a futures account. MER ~0.69%. Experienced investors should understand contango drag from front-month roll.',
 NULL, NULL,
 NULL, 'ASX: OOO',
 'Energy', 'Crude Oil ETF',
 '{"asx_ticker":"OOO","commodity":"crude_oil","stage":"etf","mer_bps":69,"currency":"AUD_hedged","roll_methodology":"front_month_WTI"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 8. Ellerston Global Mid Small Cap Energy Fund (wholesale)
('oil-gas',
 'Ellerston Global Mid Small Cap Energy Fund',
 'ellerston-global-mid-small-cap-energy',
 'Wholesale-unlisted actively managed fund targeting mid and small cap listed energy equities globally. Focus on service companies (drillers, seismic, subsea), LNG infrastructure, and US shale independents. Minimum $100K. Wholesale-investor only.',
 'NSW', 'Sydney',
 10000000000, '$100K min',
 'Energy', 'Wholesale Energy Fund',
 '{"structure":"managed_fund","stage":"fund","mer_bps":125,"min_investment_aud":100000,"wholesale_only":true,"firb_note":"Unit trust interests in a purely-financial fund generally outside FIRB"}',
 'premium', false, false,
 'listings@invest.com.au', 'active'),

-- 9. QLD fuel storage equity
('oil-gas',
 'Gladstone Fuel Storage Terminal — Equity Raise',
 'gladstone-fuel-storage-terminal-equity',
 '220 ML bulk liquid storage terminal serving the Gladstone port and Central Queensland mining region. Take-or-pay contracts with three tier-1 fuel distributors. Seeking A$12M equity to add 60 ML of capacity and diesel-to-ULP blending. FSSP minimum stockholding obligation ("MSO") eligible asset.',
 'QLD', 'Gladstone',
 1200000000, '$12M',
 'Energy', 'Fuel Storage Infrastructure',
 '{"commodity":"refined_fuels","stage":"operational_expansion","capacity_ML":220,"firb_note":"Infrastructure — FIRB notifiable at most thresholds","mso_eligible":true}',
 'premium', true, true,
 'listings@invest.com.au', 'active'),

-- 10. Otway junior explorer
('oil-gas',
 'Otway Basin Junior Explorer — Onshore Gas Permits',
 'otway-basin-junior-explorer',
 'Unlisted onshore Otway Basin (VIC/SA border) exploration company holding three PEL permits over 1,450 km². 2D seismic complete; drill-ready Q4 2026. Seeking A$4M farm-in partner. Victoria has re-permitted onshore conventional gas since 2021; domestic east-coast gas shortage supports offtake economics.',
 'VIC', 'Warrnambool',
 400000000, '$4M',
 'Energy', 'Onshore Gas Exploration',
 '{"commodity":"natural_gas","stage":"explorer","tenement_km2":1450,"firb_note":"Tenement acquisition generally FIRB notifiable"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 11. NT LNG royalty
('oil-gas',
 'Darwin LNG Expansion — Net Profits Royalty Interest',
 'darwin-lng-expansion-npr',
 'Net profits royalty interest tied to a named expansion train at Darwin LNG. Passive income structure: 2.1% of net operating profits for 15 years post-first-gas, with price-linked escalator over US$80/bbl. Engineered for SMSF and institutional allocators seeking non-correlated energy yield.',
 'NT', 'Darwin',
 NULL, 'By invitation',
 'Energy', 'LNG Royalty',
 '{"commodity":"lng","stage":"royalty","royalty_type":"net_profits","term_years":15,"accredited_only":true,"firb_note":"Royalty interests in Australian petroleum assets typically FIRB notifiable"}',
 'premium', true, true,
 'listings@invest.com.au', 'active'),

-- 12. Macquarie METI-style energy transition ETF (MQBG listed)
('oil-gas',
 'Macquarie Global Listed Energy Transition Infrastructure Fund (METI)',
 'macquarie-energy-transition-infrastructure-meti',
 'ASX-listed actively managed fund from Macquarie Asset Management. Holds pipelines, midstream gas, LNG infrastructure, and low-carbon energy infrastructure globally. Complements upstream-only energy exposure with cash-yielding midstream assets. MER ~0.85%.',
 'NSW', 'Sydney',
 NULL, 'ASX: METI',
 'Energy', 'Energy Infrastructure Fund',
 '{"asx_ticker":"METI","structure":"active_etf","stage":"fund","mer_bps":85,"focus":"global_midstream"}',
 'standard', true, false,
 'listings@invest.com.au', 'active')

ON CONFLICT (slug) DO UPDATE SET
  vertical           = EXCLUDED.vertical,
  title              = EXCLUDED.title,
  description        = EXCLUDED.description,
  location_state     = EXCLUDED.location_state,
  location_city      = EXCLUDED.location_city,
  asking_price_cents = EXCLUDED.asking_price_cents,
  price_display      = EXCLUDED.price_display,
  industry           = EXCLUDED.industry,
  sub_category       = EXCLUDED.sub_category,
  key_metrics        = EXCLUDED.key_metrics,
  listing_type       = EXCLUDED.listing_type,
  firb_eligible      = EXCLUDED.firb_eligible,
  siv_complying      = EXCLUDED.siv_complying,
  status             = EXCLUDED.status,
  updated_at         = NOW();

-- ────────────────────────────────────────────────────────────
-- 3. Swap the professionals.type CHECK constraint — add 4 new types.
--    The current set of DISTINCT types in use was verified pre-migration
--    and is fully covered by the new allowed list.
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
      -- New (oil-gas expansion):
      'energy_financial_planner',
      'resources_fund_manager',
      'foreign_investment_lawyer',
      'petroleum_royalties_advisor'
    ]::text[])
  );

-- ────────────────────────────────────────────────────────────
-- 4. 12 professional seeds (3 per new type). ON CONFLICT DO NOTHING
--    — these are placeholders that real advisors can claim post-launch.
--    Emails use the @placeholder.invest.com.au convention the codebase
--    already uses in supabase/migrations/20260316_seed_expert_articles.sql.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.professionals (
  slug, name, firm_name, type, status, verified,
  location_state, location_suburb, location_display,
  bio, specialties, fee_structure, fee_description, email,
  initial_consultation_free
) VALUES

-- ─── energy_financial_planner (3) ───
('alistair-reid-efp',
 'Alistair Reid',
 'Otway Wealth Partners',
 'energy_financial_planner',
 'active', true,
 'WA', 'Perth', 'Perth, WA',
 'Fee-for-service planner with 14 years'' experience structuring energy-heavy portfolios for Perth-based resources professionals and WA retirees. Specialises in concentrated-stock de-risking, franking-credit harvesting on ASX energy dividends, and SMSF allocations to oil and gas infrastructure funds.',
 '["Energy sector portfolios","ASX dividend harvesting","SMSF energy infrastructure","Concentrated stock de-risking"]'::jsonb,
 'fee-for-service', 'SOA from $4,400. Ongoing advice $3,500–$8,000/year.',
 'alistair@placeholder.invest.com.au',
 true),

('isabella-tran-efp',
 'Isabella Tran',
 'Lytton Financial Group',
 'energy_financial_planner',
 'active', true,
 'QLD', 'Brisbane', 'Brisbane, QLD',
 'CFP with deep Gladstone and Lytton refinery client base. Works with refinery engineers, LNG contractors, and their families across concessional contribution strategy, Division 293 mitigation, and long-service-leave tax-smoothing around shutdowns.',
 '["Refinery engineer portfolios","Div 293 strategy","Long-service leave tax planning","SMSF oil majors allocation"]'::jsonb,
 'fee-for-service', 'SOA from $3,900. Ongoing advice $2,800–$6,500/year.',
 'isabella@placeholder.invest.com.au',
 true),

('marcus-whitlam-efp',
 'Marcus Whitlam',
 'Darwin Harbour Advisory',
 'energy_financial_planner',
 'active', true,
 'NT', 'Darwin', 'Darwin, NT',
 'FASEA-qualified planner for Darwin-based LNG operators and NT-resident royalty recipients. Experience with remote-area allowances, FBT-exempt housing, and SMSF direct-to-project investment rules.',
 '["LNG project personnel","NT remote-area tax","SMSF direct energy","Royalty income planning"]'::jsonb,
 'fee-for-service', 'SOA from $4,100. Ongoing advice $3,200–$7,500/year.',
 'marcus@placeholder.invest.com.au',
 true),

-- ─── resources_fund_manager (3) ───
('sienna-kovacs-rfm',
 'Sienna Kovacs',
 'Argyle Resources Capital',
 'resources_fund_manager',
 'active', true,
 'NSW', 'Sydney', 'Sydney, NSW',
 'Portfolio manager of a wholesale long-only ASX resources fund ($420M AUM). 17 years'' sell-side and buy-side coverage of ASX energy and mining. CFA charterholder. Fund hedges FX exposure on offshore royalties.',
 '["ASX energy long-only","Commodity long-short","Wholesale fund management","Institutional research"]'::jsonb,
 'percent-aum', '1.10% p.a. management fee. 15% performance fee over ASX300 Resources index.',
 'sienna@placeholder.invest.com.au',
 true),

('declan-obrien-rfm',
 'Declan O''Brien',
 'Pilbara Partners Investment Management',
 'resources_fund_manager',
 'active', true,
 'WA', 'Perth', 'Perth, WA',
 'Co-founder of a boutique resources fund ($180M AUM) with a small-cap energy tilt. Former reservoir engineer before switching to equities analysis — brings technical due diligence rigour uncommon in generalist funds.',
 '["Small-cap energy equities","Upstream technical due diligence","LNG project financing","Private project equity"]'::jsonb,
 'percent-aum', '1.25% p.a. management fee. 20% performance fee over 8% hurdle.',
 'declan@placeholder.invest.com.au',
 true),

('priyanka-raghavan-rfm',
 'Priyanka Raghavan',
 'Southern Ocean Capital Partners',
 'resources_fund_manager',
 'active', true,
 'VIC', 'Melbourne', 'Melbourne, VIC',
 'Co-PM of an energy-transition long-short fund balancing short legacy fossil exposure with long LNG infrastructure and midstream positions. Serves family offices and endowments. Significant personal capital alongside LPs.',
 '["Long-short energy","Midstream infrastructure","Family office mandates","Energy transition themes"]'::jsonb,
 'percent-aum', '1.50% p.a. management fee. 20% performance fee over MSCI World Energy.',
 'priyanka@placeholder.invest.com.au',
 true),

-- ─── foreign_investment_lawyer (3) ───
('henry-barkhouse-fil',
 'Henry Barkhouse',
 'Barkhouse Energy Law',
 'foreign_investment_lawyer',
 'active', true,
 'NSW', 'Sydney', 'Sydney, NSW',
 'FIRB and national-security review specialist. Led approvals for several Japanese and Korean utility acquisitions of Australian gas tenements. Practising certificate issued by Law Society of NSW. Frequent speaker on the 2025 national security critical infrastructure amendments.',
 '["FIRB applications","National security review","JKM-linked LNG offtakes","Tenement acquisitions"]'::jsonb,
 'hourly', '$1,050/hr. Typical FIRB application package $45K–$120K depending on sensitivity.',
 'henry@placeholder.invest.com.au',
 false),

('yuki-oshima-fil',
 'Yuki Oshima',
 'Pacific Gateway Legal',
 'foreign_investment_lawyer',
 'active', true,
 'VIC', 'Melbourne', 'Melbourne, VIC',
 'Bilingual (English/Japanese) partner advising Japanese trading houses and major utilities on Australian upstream and midstream acquisitions. 22 years of cross-border energy deals. Admitted in Victoria; associate member Japan Bar.',
 '["Japan inbound M&A","Trading house mandates","FIRB critical infrastructure","Cross-border JVs"]'::jsonb,
 'hourly', '$980/hr. Fixed-fee FIRB applications from $55K.',
 'yuki@placeholder.invest.com.au',
 false),

('amara-nwosu-fil',
 'Amara Nwosu',
 'Boab Cross-Border Counsel',
 'foreign_investment_lawyer',
 'active', true,
 'WA', 'Perth', 'Perth, WA',
 'Perth-based foreign investment specialist focused on European, Middle Eastern and African capital deploying into WA oil and gas. Advises sovereign wealth funds and state-owned enterprises through ASIC and Treasury pre-lodgement engagement.',
 '["Sovereign wealth mandates","SOE FIRB applications","EU/MENA inbound","Treasury pre-lodgement"]'::jsonb,
 'hourly', '$1,100/hr. Complex SOE FIRB packages $150K+.',
 'amara@placeholder.invest.com.au',
 false),

-- ─── petroleum_royalties_advisor (3) ───
('robert-mcallister-pra',
 'Robert McAllister',
 'Canning Basin Royalty Advisory',
 'petroleum_royalties_advisor',
 'active', true,
 'WA', 'Perth', 'Perth, WA',
 'Specialist advisory on petroleum royalty structures, state/federal royalty regimes, and PRRT interaction. 28-year career spanning major-project royalty negotiations and secondary-market royalty trading. Authored textbook chapters on Australian petroleum fiscal regimes.',
 '["Royalty valuation","PRRT interaction","Secondary royalty trading","State royalty audits"]'::jsonb,
 'hourly', '$780/hr. Fixed-fee royalty valuations from $18K.',
 'robert@placeholder.invest.com.au',
 true),

('chloe-havelock-pra',
 'Chloe Havelock',
 'Offshore Royalty Partners',
 'petroleum_royalties_advisor',
 'active', true,
 'QLD', 'Brisbane', 'Brisbane, QLD',
 'Ex-Queensland Treasury royalty analyst turned private-sector advisor. Models overriding, net-profits, and sliding-scale royalty structures for landowners, traditional-owner groups, and passive investors. Clients include three large PBC entities.',
 '["Net profits royalties","Sliding-scale structures","Traditional owner advisory","Landowner negotiations"]'::jsonb,
 'fee-for-service', 'Valuation engagements $12K–$40K. Ongoing advisory retainers from $2,500/month.',
 'chloe@placeholder.invest.com.au',
 true),

('samuel-pongracic-pra',
 'Samuel Pongracic',
 'Greater Sunrise Royalty Advisory',
 'petroleum_royalties_advisor',
 'active', true,
 'NT', 'Darwin', 'Darwin, NT',
 'Darwin-based specialist on offshore royalty interests and PRRT credit transfer transactions. Advises SMSF trustees and UHNW families on the tax treatment of purchased royalty streams, including franking and foreign-source income interactions.',
 '["Offshore royalty interests","PRRT credit transfers","SMSF royalty tax","UHNW royalty portfolios"]'::jsonb,
 'hourly', '$820/hr. Purchase-side due diligence $20K–$60K.',
 'samuel@placeholder.invest.com.au',
 true)

ON CONFLICT (slug) DO NOTHING;
