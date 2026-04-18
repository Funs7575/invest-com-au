-- ============================================================
-- Hydrogen vertical expansion — commodity_sectors row, investment_verticals
-- row, and 10 ASX hydrogen listings.
--
-- No new advisor types — hydrogen is covered by existing
-- resources_fund_manager, energy_financial_planner, and
-- foreign_investment_lawyer types.
--
-- Idempotent: ON CONFLICT (slug) upsert everywhere.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. commodity_sectors row (powers /invest/hydrogen via getSector)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.commodity_sectors (
  slug, display_name, hero_description, hero_stats,
  esg_risk_rating, regulator_notes, status, display_order
) VALUES (
  'hydrogen',
  'Hydrogen & Fuel Cells',
  'Australia aims to be a top-three global hydrogen exporter by 2030 under the National Hydrogen Strategy. The Hydrogen Headstart $2B production credit scheme, plus complementary state programs in WA, Queensland and SA, underwrite multi-gigawatt green hydrogen projects. Investable exposure spans ASX-listed pure-plays, indirect majors (Fortescue, Woodside) and the Global X Hydrogen ETF (HGEN). Policy support is real; project FIDs lag the ambition.',
  '{"ambition":"Top-3 exporter 2030","headstart_budget":"$2B","active_projects":"30+","first_exports":"~2028"}'::jsonb,
  'medium',
  'Hydrogen is a rapidly-evolving policy area. The Hydrogen Headstart Production Credit is awarded competitively — successful projects receive dollar-per-kg support for 10 years. Project FIDs have lagged early announcements; investor scrutiny of off-take, financing, and cost certainty is essential. FIRB considers hydrogen and ammonia infrastructure sensitive sector.',
  'active',
  27
)
ON CONFLICT (slug) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  hero_description  = EXCLUDED.hero_description,
  hero_stats        = EXCLUDED.hero_stats,
  esg_risk_rating   = EXCLUDED.esg_risk_rating,
  regulator_notes   = EXCLUDED.regulator_notes,
  status            = EXCLUDED.status,
  display_order     = EXCLUDED.display_order,
  updated_at        = NOW();

-- ────────────────────────────────────────────────────────────
-- 2. investment_verticals row
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_verticals (
  slug, name, description, icon,
  hero_title, hero_subtitle,
  domestic, international, fdi_share_percent,
  sort_order, active
) VALUES (
  'hydrogen',
  'Hydrogen',
  'Hydrogen is the fastest-growing energy sub-sector under the Australian National Hydrogen Strategy. Government-backed via the $2B Hydrogen Headstart production credit and aligned state programs. ASX exposure via pure-play developers (Province Resources, Frontier Energy, Hazer), indirect majors (Fortescue, Woodside, Origin), and the Global X Hydrogen ETF (HGEN). Sector is policy-rich and FID-light — patient capital required.',
  'droplets',
  'Invest in Australian Hydrogen — Green Hydrogen Projects, Fuel Cells & ASX Pure-Plays',
  'Australia targets top-3 global hydrogen exporter by 2030. Access ASX pure-plays, indirect majors, and the Global X Hydrogen ETF. Policy support is unprecedented; FID progress is the variable.',
  true, true, 4.8,
  28, true
)
ON CONFLICT (slug) DO UPDATE SET
  name              = EXCLUDED.name,
  description       = EXCLUDED.description,
  icon              = EXCLUDED.icon,
  hero_title        = EXCLUDED.hero_title,
  hero_subtitle     = EXCLUDED.hero_subtitle,
  domestic          = EXCLUDED.domestic,
  international     = EXCLUDED.international,
  fdi_share_percent = EXCLUDED.fdi_share_percent,
  active            = true;

-- ────────────────────────────────────────────────────────────
-- 3. 10 investment listings
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, sub_category, key_metrics,
  listing_type, firb_eligible, siv_complying,
  contact_email, status
) VALUES

-- 1. Fortescue (FMG)
('hydrogen',
 'Fortescue (FMG) — Iron Ore Major with Hydrogen Optionality',
 'fortescue-fmg-hydrogen-exposure',
 'ASX iron ore supermajor with a green-hydrogen strategy operated through Fortescue Future Industries (FFI). Scaled back hydrogen ambitions in 2024 following cost-reality reviews, but retains the largest listed ASX exposure to green-H2 development. Investment case is dominated by iron ore earnings today; hydrogen is optionality.',
 'WA', 'Perth',
 NULL, 'ASX: FMG',
 'Energy', 'Diversified Iron Ore & H2',
 '{"asx_ticker":"FMG","commodity":"hydrogen_indirect","stage":"producer","market_cap_bn_aud":55.0,"hydrogen_exposure":"optional","dividend_yield":"fully_franked"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 2. Hazer Group (HZR)
('hydrogen',
 'Hazer Group (HZR) — Methane-Pyrolysis Pioneer',
 'hazer-group-hzr',
 'ASX-listed developer of a proprietary methane-pyrolysis process producing hydrogen and high-value graphite/carbon black as by-products. Commercial demonstration plant (CDP) in Kwinana, WA, operational. Technology route differs fundamentally from electrolysis — lower energy intensity, natural-gas feedstock. Small-cap, pre-scale.',
 'WA', 'Kwinana',
 NULL, 'ASX: HZR',
 'Energy', 'Hydrogen Technology',
 '{"asx_ticker":"HZR","commodity":"hydrogen","stage":"demonstration","market_cap_bn_aud":0.15,"technology":"methane_pyrolysis","byproduct":"graphite"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 3. Province Resources (PRL)
('hydrogen',
 'Province Resources (PRL) — HyEnergy Green Hydrogen Project',
 'province-resources-prl-hyenergy',
 'ASX-listed developer advancing the HyEnergy green hydrogen project near Carnarvon, Western Australia. PFS published showing economics at scale. Project requires significant transmission and water infrastructure. Targeting FID late-2020s. High-beta exposure to Australian green hydrogen delivery.',
 'WA', 'Perth',
 NULL, 'ASX: PRL',
 'Energy', 'Green Hydrogen Developer',
 '{"asx_ticker":"PRL","commodity":"hydrogen","stage":"developer","market_cap_bn_aud":0.08,"project":"HyEnergy","location":"Carnarvon_WA"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 4. Frontier Energy (FHE)
('hydrogen',
 'Frontier Energy (FHE) — Waroona Hydrogen Project',
 'frontier-energy-fhe-waroona',
 'ASX-listed developer of the Waroona integrated solar and green hydrogen project in Western Australia. DFS published. Co-located solar generation and electrolysis. Seeking strategic partner and project financing. Targeting first hydrogen production mid-to-late 2020s.',
 'WA', 'Perth',
 NULL, 'ASX: FHE',
 'Energy', 'Green Hydrogen Developer',
 '{"asx_ticker":"FHE","commodity":"hydrogen","stage":"developer","market_cap_bn_aud":0.12,"project":"Waroona","location":"WA"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 5. Pure Hydrogen (PH2)
('hydrogen',
 'Pure Hydrogen (PH2) — SMR & Turquoise Hydrogen Developer',
 'pure-hydrogen-ph2',
 'ASX-listed developer focused on steam methane reforming with carbon capture (blue hydrogen) and methane pyrolysis (turquoise hydrogen). Diversified portfolio across Australia and the US. Smaller than Hazer or Province but multi-project exposure across production pathways.',
 'QLD', 'Brisbane',
 NULL, 'ASX: PH2',
 'Energy', 'Hydrogen Producer',
 '{"asx_ticker":"PH2","commodity":"hydrogen","stage":"developer","market_cap_bn_aud":0.05,"technology":"SMR_plus_pyrolysis"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 6. Sparc Technologies (SPN)
('hydrogen',
 'Sparc Technologies (SPN) — Photocatalytic Hydrogen Tech',
 'sparc-technologies-spn',
 'ASX-listed technology developer of graphene additives and photocatalytic hydrogen research (with Flinders University and Fortescue). Early-stage; technology commercialisation is the investment case. Not yet generating hydrogen at scale.',
 'SA', 'Adelaide',
 NULL, 'ASX: SPN',
 'Energy', 'Hydrogen R&D',
 '{"asx_ticker":"SPN","commodity":"hydrogen","stage":"research","market_cap_bn_aud":0.04,"technology":"photocatalytic"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 7. Origin Energy (ORG)
('hydrogen',
 'Origin Energy (ORG) — Integrated Utility with Hydrogen Partnerships',
 'origin-energy-org-hydrogen',
 'ASX top-50 integrated energy utility. Holds partnerships and MoUs for hydrogen export projects (Hunter Valley hydrogen hub, Mitsubishi partnership) alongside its core electricity generation and retail business. Hydrogen is small-percentage of earnings; the investment case is dominated by APLNG gas JV and the retail book.',
 'NSW', 'Sydney',
 NULL, 'ASX: ORG',
 'Energy', 'Integrated Utility & H2',
 '{"asx_ticker":"ORG","commodity":"hydrogen_indirect","stage":"producer","market_cap_bn_aud":18.5,"hydrogen_exposure":"partnerships","dividend_yield":"franked"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 8. Global X Hydrogen ETF (HGEN)
('hydrogen',
 'Global X Hydrogen ETF (HGEN) — Sector Diversified Exposure',
 'global-x-hydrogen-etf-hgen',
 'ASX-listed ETF providing diversified exposure to the global hydrogen supply chain — electrolyser manufacturers, fuel cell producers, hydrogen project developers, and related infrastructure. Holdings include Plug Power, Bloom Energy, Linde, Air Liquide. MER ~0.69%. Simplest single-ticket way to own global hydrogen exposure.',
 NULL, NULL,
 NULL, 'ASX: HGEN',
 'Energy', 'Hydrogen Sector ETF',
 '{"asx_ticker":"HGEN","commodity":"hydrogen","stage":"etf","mer_bps":69,"issuer":"Global X"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 9. ReNu Energy (RNE)
('hydrogen',
 'ReNu Energy (RNE) — Fuel Cell & Behind-the-Meter Hydrogen',
 'renu-energy-rne',
 'ASX-listed small-cap focused on hydrogen generation and fuel cell applications for behind-the-meter power and transport. Partners with Countrywide Hydrogen and Lavo for integrated solutions. Very small scale; speculative-end allocation.',
 'QLD', 'Brisbane',
 NULL, 'ASX: RNE',
 'Energy', 'Fuel Cell Applications',
 '{"asx_ticker":"RNE","commodity":"hydrogen","stage":"early_commercial","market_cap_bn_aud":0.03,"focus":"behind_the_meter"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 10. Desert Bloom Hydrogen project equity (unlisted)
('hydrogen',
 'NT Green Hydrogen Hub — Strategic Equity Participation',
 'nt-green-hydrogen-hub-equity',
 'Unlisted participation in a multi-project Northern Territory green hydrogen hub targeting ammonia export to Japan and Korea. 2GW+ planned scale. Currently in bankable feasibility, FID target 2027. Seeking strategic Tier 1 equity partners with $50M+ commitments. FIRB sensitive-sector — allied-nation investors only.',
 'NT', 'Darwin',
 5000000000, '$50M min',
 'Energy', 'Green Hydrogen Hub',
 '{"commodity":"hydrogen","stage":"pre-FID","capacity_GW":2.0,"offtake_target":"Japan_Korea","firb_sensitive":true,"allied_nation_only":true}',
 'premium', true, false,
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
-- 4. Seed the 10 commodity_stocks rows so /invest/hydrogen hero
--    and stocks grid populate via listSectorStocks().
-- ────────────────────────────────────────────────────────────
INSERT INTO public.commodity_stocks (
  sector_slug, ticker, company_name,
  market_cap_bucket, dividend_yield_pct, pe_ratio,
  blurb, primary_exposure, included_in_indices,
  foreign_ownership_risk, display_order, status
) VALUES
('hydrogen','FMG','Fortescue','mega',5.5,8.5,'Iron ore major with scaled-back hydrogen ambitions; hydrogen is optionality on top of an iron-ore dividend engine.','producer','{ASX50,ASX200}'::text[],'Portfolio exemption <10% ASX',10,'active'),
('hydrogen','ORG','Origin Energy','large',3.0,22.0,'Integrated utility with hydrogen partnerships and MoUs; hydrogen is <5% of earnings today.','producer','{ASX100}'::text[],'Portfolio exemption <10% ASX',20,'active'),
('hydrogen','HZR','Hazer Group','small',NULL,NULL,'Methane-pyrolysis developer; graphite by-product differentiates the unit economics.','producer','{ASX_All_Ordinaries}'::text[],'Sensitive sector FIRB review',30,'active'),
('hydrogen','PRL','Province Resources','spec',NULL,NULL,'HyEnergy green hydrogen developer near Carnarvon WA — pre-FID.','producer','{ASX_All_Ordinaries}'::text[],'Sensitive sector FIRB review',40,'active'),
('hydrogen','FHE','Frontier Energy','spec',NULL,NULL,'Waroona integrated solar + green hydrogen developer — DFS complete.','producer','{ASX_All_Ordinaries}'::text[],'Sensitive sector FIRB review',50,'active'),
('hydrogen','PH2','Pure Hydrogen','spec',NULL,NULL,'Diversified SMR and turquoise hydrogen projects across Australia and US.','producer','{ASX_All_Ordinaries}'::text[],'Sensitive sector FIRB review',60,'active'),
('hydrogen','SPN','Sparc Technologies','spec',NULL,NULL,'Photocatalytic hydrogen research with Flinders University and Fortescue.','service','{ASX_All_Ordinaries}'::text[],'Standard',70,'active'),
('hydrogen','RNE','ReNu Energy','spec',NULL,NULL,'Fuel cells and behind-the-meter hydrogen applications. Speculative-end allocation.','service','{ASX_All_Ordinaries}'::text[],'Standard',80,'active')
ON CONFLICT (sector_slug, ticker) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  market_cap_bucket = EXCLUDED.market_cap_bucket,
  dividend_yield_pct = EXCLUDED.dividend_yield_pct,
  pe_ratio = EXCLUDED.pe_ratio,
  blurb = EXCLUDED.blurb,
  primary_exposure = EXCLUDED.primary_exposure,
  included_in_indices = EXCLUDED.included_in_indices,
  foreign_ownership_risk = EXCLUDED.foreign_ownership_risk,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status;

-- Seed the HGEN ETF into commodity_etfs
INSERT INTO public.commodity_etfs (
  sector_slug, ticker, name, issuer, mer_pct,
  underlying_exposure, domicile, distribution_frequency,
  blurb, display_order, status
) VALUES
('hydrogen','HGEN','Global X Hydrogen ETF','Global X',0.69,
 'Global hydrogen supply-chain equities','Australia','Annual',
 'Diversified global exposure — electrolyser manufacturers, fuel cell producers, hydrogen infrastructure. MER ~0.69%.',
 10,'active')
ON CONFLICT (sector_slug, ticker) DO UPDATE SET
  name = EXCLUDED.name,
  issuer = EXCLUDED.issuer,
  mer_pct = EXCLUDED.mer_pct,
  underlying_exposure = EXCLUDED.underlying_exposure,
  domicile = EXCLUDED.domicile,
  distribution_frequency = EXCLUDED.distribution_frequency,
  blurb = EXCLUDED.blurb,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status;
