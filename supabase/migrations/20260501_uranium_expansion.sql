-- ============================================================
-- Uranium vertical expansion — new vertical row + 12 listings.
--
-- Unlike the oil-gas expansion this migration does NOT change the
-- professionals.type CHECK constraint: uranium investment is well
-- served by existing types (resources_fund_manager, mining_lawyer,
-- mining_tax_advisor, foreign_investment_lawyer).
--
-- Idempotent: vertical and listings use ON CONFLICT (slug) upsert.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Uranium vertical row
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_verticals (
  slug, name, description, icon,
  hero_title, hero_subtitle,
  domestic, international, fdi_share_percent,
  sort_order, active
) VALUES (
  'uranium',
  'Uranium',
  'Australia holds 28% of the world''s known uranium reserves and is the world''s third-largest producer. ASX-listed producers (Paladin, Boss Energy, Deep Yellow) plus a deep bench of developers and explorers offer leveraged exposure to the structural uranium-price upcycle driven by Western utility restocking, SMR demand, and Russian supply risk. State-level mining bans in Queensland, NSW and Victoria constrain Australian domestic supply despite the resource endowment.',
  'atom',
  'Invest in Australian Uranium — ASX Producers, Developers & Strategic Reserve Exposure',
  'Australia is the third-largest uranium producer and holds the world''s largest reserves. Access ASX-listed producers, developers, explorers, and the Global X Uranium ETF (ATOM).',
  true, true, 11.5,
  26, true
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
-- 2. 12 uranium investment listings
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, sub_category, key_metrics,
  listing_type, firb_eligible, siv_complying,
  contact_email, status
) VALUES

-- 1. Paladin Energy (PDN)
('uranium',
 'Paladin Energy (PDN) — Langer Heinrich Restart',
 'paladin-energy-pdn',
 'ASX-listed uranium producer. Langer Heinrich Mine in Namibia restarted commercial production in 2024 after a decade on care and maintenance. Long-term contracts signed with US and European utilities. Exploration upside at Michelin (Canada) and several Australian permits. Leading ASX uranium exposure by market cap.',
 'WA', 'Perth',
 NULL, 'ASX: PDN',
 'Mining & Resources', 'Uranium Producer',
 '{"asx_ticker":"PDN","commodity":"uranium","stage":"producer","market_cap_bn_aud":3.8,"asset_focus":"Namibia_Canada_Australia","firb_note":"ASX shareholding >20% triggers FIRB; uranium is sensitive sector"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 2. Boss Energy (BOE)
('uranium',
 'Boss Energy (BOE) — Honeymoon Restart Success',
 'boss-energy-boe',
 'Operator of the Honeymoon in-situ recovery uranium mine in South Australia. Restarted production in 2024 after ~ten years on care and maintenance. 30% partner in Alta Mesa ISR operation in Texas. Fully funded through existing cash reserves and offtake contracts with US utilities. One of only two producing ASX uranium companies.',
 'SA', 'Adelaide',
 NULL, 'ASX: BOE',
 'Mining & Resources', 'Uranium Producer',
 '{"asx_ticker":"BOE","commodity":"uranium","stage":"producer","market_cap_bn_aud":1.6,"asset_focus":"Australia_US","mine_type":"in_situ_recovery"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 3. Deep Yellow (DYL)
('uranium',
 'Deep Yellow (DYL) — Tumas Development',
 'deep-yellow-dyl',
 'Uranium developer advancing the Tumas project in Namibia towards production (first uranium targeted late 2027). DFS completed demonstrating robust economics. Also holds the Mulga Rock project in Western Australia. Managed by experienced former Paladin and Heathgate personnel. Highest-quality developer in the ASX uranium pipeline.',
 'WA', 'Perth',
 NULL, 'ASX: DYL',
 'Mining & Resources', 'Uranium Developer',
 '{"asx_ticker":"DYL","commodity":"uranium","stage":"developer","market_cap_bn_aud":1.2,"asset_focus":"Namibia_Australia","first_production_target":"2027"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 4. Bannerman Energy (BMN)
('uranium',
 'Bannerman Energy (BMN) — Etango Development',
 'bannerman-energy-bmn',
 'Uranium developer advancing the Etango project in Namibia — one of the largest undeveloped uranium deposits globally (205 Mlb U3O8 resource). Final Investment Decision approved; project financing being finalised. Significant leverage to rising uranium prices given large resource base and contained costs.',
 'WA', 'Perth',
 NULL, 'ASX: BMN',
 'Mining & Resources', 'Uranium Developer',
 '{"asx_ticker":"BMN","commodity":"uranium","stage":"developer","market_cap_bn_aud":0.65,"asset_focus":"Namibia","resource_mlb_u3o8":205}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 5. Lotus Resources (LOT)
('uranium',
 'Lotus Resources (LOT) — Kayelekera Restart',
 'lotus-resources-lot',
 'Owner of the Kayelekera uranium mine in Malawi — previously produced under Paladin ownership 2009-2014. Restart study supports production restart within 12-15 months of FID. Strong exploration upside in adjacent tenements. Smaller scale but faster path to production than most developers.',
 'WA', 'Perth',
 NULL, 'ASX: LOT',
 'Mining & Resources', 'Uranium Developer',
 '{"asx_ticker":"LOT","commodity":"uranium","stage":"developer","market_cap_bn_aud":0.55,"asset_focus":"Malawi","restart_timeline_months":15}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 6. Alligator Energy (AGE)
('uranium',
 'Alligator Energy (AGE) — South Australian Explorer',
 'alligator-energy-age',
 'South Australian uranium explorer-developer with the Samphire project at scoping study stage. ISR-amenable ore body adjacent to existing permitted ISR infrastructure. Smaller-cap exposure; higher beta to uranium price and project milestones than established producers.',
 'SA', 'Adelaide',
 NULL, 'ASX: AGE',
 'Mining & Resources', 'Uranium Explorer',
 '{"asx_ticker":"AGE","commodity":"uranium","stage":"explorer","market_cap_bn_aud":0.18,"asset_focus":"Australia","mine_type":"in_situ_recovery_potential"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 7. Aura Energy (AEE)
('uranium',
 'Aura Energy (AEE) — Tiris Development',
 'aura-energy-aee',
 'Uranium-vanadium developer advancing the Tiris project in Mauritania. DFS published showing robust economics at US$80/lb uranium. Offtake discussions with European and Asian utilities progressing. Polymetallic exposure distinguishes Aura from pure-play uranium developers.',
 'VIC', 'Melbourne',
 NULL, 'ASX: AEE',
 'Mining & Resources', 'Uranium Developer',
 '{"asx_ticker":"AEE","commodity":"uranium","stage":"developer","market_cap_bn_aud":0.3,"asset_focus":"Mauritania","polymetallic":true}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 8. Elevate Uranium (EL8)
('uranium',
 'Elevate Uranium (EL8) — Namibia Explorer',
 'elevate-uranium-el8',
 'Uranium explorer with a portfolio of Namibian projects, headlined by the Koppies deposit. Proprietary U-pgrade metallurgical process reduces capital intensity by an estimated 50% compared to conventional flowsheets. Earlier-stage but novel technology differentiator.',
 'WA', 'Perth',
 NULL, 'ASX: EL8',
 'Mining & Resources', 'Uranium Explorer',
 '{"asx_ticker":"EL8","commodity":"uranium","stage":"explorer","market_cap_bn_aud":0.15,"asset_focus":"Namibia","technology":"U-pgrade_beneficiation"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 9. 92 Energy (92E)
('uranium',
 '92 Energy (92E) — Athabasca Basin Explorer',
 '92-energy-92e',
 'ASX-listed uranium explorer focused on the Athabasca Basin in Saskatchewan, Canada — the highest-grade uranium district on Earth. Gemini project advancing through drilling. High-grade discovery potential but early stage; binary exploration outcomes common in the basin.',
 'WA', 'Perth',
 NULL, 'ASX: 92E',
 'Mining & Resources', 'Uranium Explorer',
 '{"asx_ticker":"92E","commodity":"uranium","stage":"explorer","market_cap_bn_aud":0.08,"asset_focus":"Canada_Athabasca"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 10. Toro Energy (TOE)
('uranium',
 'Toro Energy (TOE) — Wiluna Project',
 'toro-energy-toe',
 'Owner of the Wiluna uranium project in Western Australia — one of the largest advanced-stage uranium projects in Australia. Pre-feasibility economics positive at current uranium prices. Requires federal and state approvals; significant regulatory risk given WA''s shifting uranium-mining policy stance.',
 'WA', 'Perth',
 NULL, 'ASX: TOE',
 'Mining & Resources', 'Uranium Developer',
 '{"asx_ticker":"TOE","commodity":"uranium","stage":"developer","market_cap_bn_aud":0.12,"asset_focus":"Australia","regulatory_risk":"high"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 11. Global X Uranium ETF (ATOM)
('uranium',
 'Global X Uranium ETF (ATOM) — Diversified Sector Exposure',
 'global-x-uranium-etf-atom',
 'ASX-listed ETF providing diversified exposure to the global uranium supply chain — miners, developers, and fuel-cycle services. Holds ~40 positions including Cameco, Kazatomprom, Paladin, Boss Energy, Denison, and NexGen. MER approximately 0.69%. Simplest single-ticket way to own the sector without picking individual names.',
 NULL, NULL,
 NULL, 'ASX: ATOM',
 'Energy', 'Uranium Sector ETF',
 '{"asx_ticker":"ATOM","commodity":"uranium","stage":"etf","mer_bps":69,"holdings_approx":40,"issuer":"Global X"}',
 'standard', true, false,
 'listings@invest.com.au', 'active'),

-- 12. Northern Territory uranium project equity
('uranium',
 'Alligator River Uranium Project — Strategic Equity Raise',
 'alligator-river-uranium-project-equity',
 'Unlisted pre-development uranium project in the Alligator Rivers region, Northern Territory. Historical JORC resource of 28 Mlb U3O8 grading 1,850 ppm — above Paladin and Boss current operations. Seeking $18M Series A to fund PFS and tenement conversion. Traditional Owner consultation complete, ERISS environmental baseline complete. FIRB sensitive-sector — allied-nation investors only.',
 'NT', 'Darwin',
 1800000000, '$18M',
 'Mining & Resources', 'Uranium Pre-Development',
 '{"commodity":"uranium","stage":"pre-feasibility","resource_mlb_u3o8":28,"grade_ppm":1850,"firb_sensitive":true,"allied_nation_only":true,"traditional_owner_consultation":"complete"}',
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
