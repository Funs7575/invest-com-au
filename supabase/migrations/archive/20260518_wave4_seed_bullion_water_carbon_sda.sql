-- ============================================================================
-- Migration: 20260518_wave4_seed_bullion_water_carbon_sda.sql
-- Purpose: Wave 4 expansion of /invest — seed listings for four AU-specific
--          investment categories the marketplace was conspicuously missing:
--            1. Wholesale precious metals (Perth Mint allocated, ABC Bullion,
--               PMGOLD ETF, silver, platinum)
--            2. Water entitlements (Murray-Darling Basin tradeable water
--               licenses — NSW Murray, Goulburn, Lachlan, Murrumbidgee)
--            3. ACCU / Carbon credits (Australian Carbon Credit Units +
--               internationally-certified offsets; the `carbon-environmental-
--               markets` vertical existed in the schema with zero listings)
--            4. SDA housing (Specialist Disability Accommodation — 10-13%
--               gross yields, government-backed, sub-category of
--               commercial_property to leverage existing card variant)
--          Plus 3 ESVCLP-registered fund listings to surface the 10-year
--          CGT exemption hook for HNW investors.
--
--          New verticals: `bullion`, `water-rights`. The `carbon-
--          environmental-markets` vertical and `commercial_property`
--          vertical are pre-existing; we use sub_category='sda_housing'
--          to distinguish SDA properties on the commercial-property page.
--
-- Why: identified in the post-Wave-3 status audit. The /invest rebuild lit
--      up 8 listing kinds across 32 categories, but seed data covered only
--      8 of those verticals — leaving most of the IA empty cliffs.
--
-- Idempotency: ON CONFLICT (slug) DO NOTHING on every INSERT. Re-running
--              the migration is a no-op.
--
-- Rollback (destructive):
--   DELETE FROM investment_listings WHERE slug LIKE 'perth-mint-%'
--                                       OR slug LIKE 'abc-bullion-%'
--                                       OR slug LIKE 'pmgold-%'
--                                       OR slug LIKE 'water-%'
--                                       OR slug LIKE 'accu-%'
--                                       OR slug LIKE 'carbon-%'
--                                       OR slug LIKE 'sda-%'
--                                       OR slug LIKE 'esvclp-%';
--
-- Risk: low — purely additive seed content. No schema changes.
-- ============================================================================

BEGIN;

-- ── 1. Wholesale precious metals (bullion) ────────────────────────────────
-- listing_kind='physical_asset' for vaulted allocated bullion (you own
-- specific bars with a serial number). listing_kind='fund' for ETF
-- structures (PMGOLD on ASX is a beneficial-interest unit in a trust).

INSERT INTO investment_listings (
  slug, vertical, listing_kind, title, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, sub_category, key_metrics, images,
  firb_eligible, siv_complying, status, listing_type
) VALUES
('perth-mint-allocated-gold-1kg',
 'bullion', 'physical_asset',
 'Perth Mint Allocated Gold — 1kg Bar (LBMA Good Delivery)',
 'Allocated 1kg gold bar vaulted at the Perth Mint. You own a specific serially-numbered bar; the Mint stores it under your name with annual storage fee. LBMA Good Delivery accreditation means resale at spot is straightforward — Perth Mint repurchases at the published bid. SMSF-eligible under sole-purpose test when stored at an APRA-approved depository.',
 'WA', 'Perth',
 NULL, 'Spot + 1.2% premium',
 'precious_metals', 'allocated_gold',
 jsonb_build_object(
   'metal', 'gold',
   'purity', '99.99',
   'weight_grams', 1000,
   'form', 'cast_bar',
   'vault', 'Perth Mint depository',
   'storage_fee_pct_pa', 0.18,
   'lbma_good_delivery', true,
   'smsf_eligible', true,
   'min_investment_aud', 95000,
   'wholesale_only', false
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('perth-mint-unallocated-gold-pool',
 'bullion', 'fund',
 'Perth Mint Unallocated Gold — Pool Account',
 'Unallocated gold pool account — you hold a beneficial interest in the Mint''s gold stockpile rather than specific bars. Zero storage fee but ranks as an unsecured Perth Mint creditor (govt-guaranteed since 2021). Lowest-friction way to gain gold exposure. ASX-listed alternative: PMGOLD.',
 'WA', 'Perth',
 NULL, 'Spot + 0.5% premium · no storage fee',
 'precious_metals', 'unallocated_gold',
 jsonb_build_object(
   'metal', 'gold',
   'form', 'pool_account',
   'storage_fee_pct_pa', 0.0,
   'min_investment_aud', 50,
   'redemption', 'physical_or_cash',
   'lbma_good_delivery', true,
   'smsf_eligible', true,
   'govt_guarantee', 'WA State Treasury'
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('pmgold-asx-perth-mint-gold-etf',
 'bullion', 'fund',
 'PMGOLD (ASX) — Perth Mint Gold ETF',
 'ASX-listed beneficial interest in Perth Mint allocated gold, backed 1:1 by physical bullion vaulted in Western Australia. Lower MER than ETFS-listed gold ETFs. Trades during ASX hours; redeemable for physical metal at 1000g threshold. SMSF + retail-friendly.',
 'WA', 'Perth',
 NULL, 'ASX: PMGOLD',
 'precious_metals', 'gold_etf',
 jsonb_build_object(
   'asx_ticker', 'PMGOLD',
   'metal', 'gold',
   'mer_bps', 15,
   'aum_billions', 0.85,
   'distribution_frequency', 'annual',
   'min_investment', 'one_unit',
   'smsf_eligible', true,
   'open_to_retail', true,
   'physical_redemption_threshold_oz', 32
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('abc-bullion-vaulted-silver-1000oz',
 'bullion', 'physical_asset',
 'ABC Bullion — 1000oz Silver Bars (Sydney Vault)',
 'Wholesale 1000oz LBMA-certified silver bars stored at ABC Bullion''s Sydney vault. Higher gold:silver ratio (currently ~85:1) creates value opportunity for ratio-traders. Bars are individually serialised and insured. Resale via ABC at published bid.',
 'NSW', 'Sydney',
 NULL, 'Spot + 2.5% premium',
 'precious_metals', 'allocated_silver',
 jsonb_build_object(
   'metal', 'silver',
   'purity', '99.9',
   'weight_oz', 1000,
   'form', 'cast_bar',
   'vault', 'ABC Bullion Sydney',
   'storage_fee_pct_pa', 0.55,
   'lbma_good_delivery', true,
   'smsf_eligible', true,
   'min_investment_aud', 45000
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('perth-mint-platinum-1oz',
 'bullion', 'physical_asset',
 'Perth Mint — 1oz Platinum Bar',
 'Industrial-grade platinum has tighter supply than gold/silver, dominated by South African and Russian mining. Perth Mint 1oz cast bars in tamper-proof assay packs. Less liquid resale market than gold; smaller bid-ask spread when held > 12 months.',
 'WA', 'Perth',
 NULL, 'Spot + 4.5% premium',
 'precious_metals', 'platinum',
 jsonb_build_object(
   'metal', 'platinum',
   'purity', '99.95',
   'weight_oz', 1,
   'form', 'assay_pack',
   'vault', 'Perth Mint depository',
   'storage_fee_pct_pa', 0.18,
   'smsf_eligible', true,
   'min_investment_aud', 1800
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('etfs-physical-gold-gold',
 'bullion', 'fund',
 'GOLD (ASX) — Global X Physical Gold ETF',
 'JP Morgan-vaulted London gold backing this ASX-listed ETF. Slightly higher MER than PMGOLD but deeper liquidity. Distributions retained (price reflects). No franking credits.',
 'NSW', 'Sydney',
 NULL, 'ASX: GOLD',
 'precious_metals', 'gold_etf',
 jsonb_build_object(
   'asx_ticker', 'GOLD',
   'metal', 'gold',
   'mer_bps', 40,
   'aum_billions', 4.20,
   'distribution_frequency', 'none',
   'vault', 'JP Morgan London',
   'smsf_eligible', true,
   'open_to_retail', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('perth-mint-gold-100g-bar',
 'bullion', 'physical_asset',
 'Perth Mint — 100g Gold Bar (Take-Home)',
 'Smaller 100g cast gold bar in tamper-evident assay pack. Take-home rather than vaulted — owner stores in a bank safe-deposit box or home safe. Higher premium than 1kg bars but easier to liquidate in smaller increments. CGT treatment as personal-use asset varies by ATO scrutiny.',
 'WA', 'Perth',
 NULL, 'Spot + 2.8% premium',
 'precious_metals', 'gold_bar',
 jsonb_build_object(
   'metal', 'gold',
   'purity', '99.99',
   'weight_grams', 100,
   'form', 'assay_pack',
   'delivery', 'physical_take_home',
   'min_investment_aud', 9500,
   'smsf_eligible', false
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('palladium-1oz-bar',
 'bullion', 'physical_asset',
 'Palladium 1oz — Sydney Vault',
 'Palladium is the rarest PGM (platinum-group metal) on the list. Heavy industrial demand from auto-catalyst manufacturing creates supply tension. Higher bid-ask spreads than gold/silver. Vaulted at ABC Bullion.',
 'NSW', 'Sydney',
 NULL, 'Spot + 5.5% premium',
 'precious_metals', 'palladium',
 jsonb_build_object(
   'metal', 'palladium',
   'purity', '99.95',
   'weight_oz', 1,
   'form', 'cast_bar',
   'vault', 'ABC Bullion Sydney',
   'storage_fee_pct_pa', 0.65,
   'smsf_eligible', true,
   'min_investment_aud', 1500
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

-- ── 2. Water entitlements (Murray-Darling Basin) ────────────────────────
-- These are tradeable water licenses — you buy the right to extract a
-- certain volume of water annually. High-security entitlements in NSW
-- Murray + Goulburn trade like commercial property: held for income
-- (lease to growers) or capital growth as scarcity tightens.

('water-nsw-murray-high-security-100ml',
 'water-rights', 'for_sale_asset',
 'NSW Murray High-Security Water — 100ML',
 '100 megalitre high-security water entitlement on the NSW Murray. High-security means allocation gets priority over general-security in dry years (typical 95-100% allocation). Lease to viticulture / horticulture growers at $200-400/ML/yr. Secondary market via Waterfind / H2OX.',
 'NSW', 'Mildura',
 800000000, 'AUD $8,000,000 (≈ $80k/ML)',
 'water', 'high_security',
 jsonb_build_object(
   'megalitres', 100,
   'security_class', 'high_security',
   'region', 'NSW Murray',
   'avg_allocation_5yr_pct', 97,
   'lease_yield_pct_pa', 3.5,
   'transfer_eligible_states', ARRAY['NSW','VIC','SA'],
   'trading_zone', 'Zone 11',
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('water-vic-goulburn-high-security-50ml',
 'water-rights', 'for_sale_asset',
 'VIC Goulburn High-Security Water — 50ML',
 '50ML Goulburn high-security entitlement. Tightly-held; rarely trades. Underpins permanent plantings (almonds, citrus, stone fruit). Goulburn-Murray Water manages register; transfer takes 4-8 weeks. Lease yield typically lower than capital growth — this is a buy-and-hold asset.',
 'VIC', 'Shepparton',
 400000000, 'AUD $4,000,000 (≈ $80k/ML)',
 'water', 'high_security',
 jsonb_build_object(
   'megalitres', 50,
   'security_class', 'high_security',
   'region', 'VIC Goulburn',
   'avg_allocation_5yr_pct', 96,
   'lease_yield_pct_pa', 2.8,
   'manager', 'Goulburn-Murray Water',
   'smsf_eligible', true,
   'transfer_window_weeks', 6
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('water-nsw-murrumbidgee-general-security-200ml',
 'water-rights', 'for_sale_asset',
 'NSW Murrumbidgee General-Security Water — 200ML',
 'General-security entitlement on the Murrumbidgee — cheaper per ML than high-security but allocation varies wildly (15-85% over the last decade). Suits annual croppers (rice, cotton) who can pivot crop choice with conditions. Active spot leasing market.',
 'NSW', 'Griffith',
 240000000, 'AUD $2,400,000 (≈ $12k/ML)',
 'water', 'general_security',
 jsonb_build_object(
   'megalitres', 200,
   'security_class', 'general_security',
   'region', 'NSW Murrumbidgee',
   'avg_allocation_5yr_pct', 52,
   'lease_yield_pct_pa', 4.5,
   'transfer_eligible_states', ARRAY['NSW'],
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('water-sa-murray-high-security-30ml',
 'water-rights', 'for_sale_asset',
 'SA Murray High-Security Water — 30ML',
 'South Australian Murray high-security with 100% allocation entitlement. Trades at the high end of the basin pricing thanks to legislated reliability. Active growers and almond corporates compete for small parcels.',
 'SA', 'Renmark',
 270000000, 'AUD $2,700,000 (≈ $90k/ML)',
 'water', 'high_security',
 jsonb_build_object(
   'megalitres', 30,
   'security_class', 'high_security',
   'region', 'SA Murray',
   'avg_allocation_5yr_pct', 100,
   'lease_yield_pct_pa', 3.2,
   'transfer_eligible_states', ARRAY['SA','VIC','NSW'],
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('water-qld-condamine-bore-licence',
 'water-rights', 'for_sale_asset',
 'QLD Condamine Bore Water Licence — 250ML',
 'Underground bore extraction licence on the Condamine alluvium. Lower per-ML pricing than river systems but volume is constrained by groundwater reserves. Suits cotton or feedlot operators. Limited transfer market.',
 'QLD', 'Toowoomba',
 75000000, 'AUD $750,000 (≈ $3k/ML)',
 'water', 'bore_licence',
 jsonb_build_object(
   'megalitres', 250,
   'security_class', 'groundwater',
   'region', 'QLD Condamine',
   'extraction_type', 'bore',
   'smsf_eligible', true,
   'transfer_window_weeks', 12
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

-- ── 3. ACCU / Carbon credits ────────────────────────────────────────────
-- The `carbon-environmental-markets` vertical existed in the schema with
-- zero listings — addressed here. ACCUs = Australian Carbon Credit Units,
-- issued by the Clean Energy Regulator under the Emissions Reduction Fund.
-- Safeguard Mechanism reform (Jul 2024) creates mandatory buyers; spot
-- prices spiked from $35→$70 then settled around $35-40.

('accu-generic-spot-100-units',
 'carbon-environmental-markets', 'for_sale_asset',
 'ACCU Spot — Generic Method, 100 Units',
 '100 Australian Carbon Credit Units, generic-method (avoidance + sequestration mixed). Tradeable into Safeguard Mechanism compliance or voluntary retirement. Settlement via Australian National Registry of Emissions Units (ANREU). Spot price discovery via Xpansiv / CORE Markets.',
 'NSW', 'Sydney',
 350000, 'AUD $35/unit · 100 units = $3,500',
 'carbon', 'accu_generic',
 jsonb_build_object(
   'units', 100,
   'verification_method', 'generic',
   'unit_type', 'ACCU',
   'registry', 'ANREU',
   'safeguard_eligible', true,
   'voluntary_retirement_eligible', true,
   'spot_price_aud', 35,
   'smsf_eligible', false
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('accu-hir-vegetation-1000-units',
 'carbon-environmental-markets', 'for_sale_asset',
 'ACCU HIR (Human-Induced Regeneration) — 1000 Units',
 '1000 ACCUs sourced from Human-Induced Regeneration projects in WA / QLD rangelands. HIR-method credits have stronger biodiversity co-benefits than savanna burning. Carries minor methodological-integrity discount in voluntary markets ($28-32 vs $35-40 spot for generic).',
 'WA', 'Perth',
 3000000, 'AUD $30/unit · 1000 units = $30,000',
 'carbon', 'accu_hir',
 jsonb_build_object(
   'units', 1000,
   'verification_method', 'HIR',
   'project_type', 'human_induced_regeneration',
   'unit_type', 'ACCU',
   'co_benefits', ARRAY['biodiversity','indigenous_employment'],
   'safeguard_eligible', true,
   'spot_price_aud', 30
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('vcu-verra-redd-1000-units',
 'carbon-environmental-markets', 'for_sale_asset',
 'Verra VCU (REDD+) — 1000 Voluntary Carbon Units',
 'Voluntary Carbon Units from Indonesian REDD+ (Reducing Emissions from Deforestation and Forest Degradation) project. Verra-verified. NOT Safeguard Mechanism-eligible (Australian-only). Suits corporate voluntary-retirement programs targeting Asia-Pacific co-benefits.',
 'NSW', 'Sydney',
 1200000, 'AUD $12/unit · 1000 units = $12,000',
 'carbon', 'voluntary_offset',
 jsonb_build_object(
   'units', 1000,
   'verification_method', 'Verra',
   'project_type', 'REDD+',
   'unit_type', 'VCU',
   'jurisdiction', 'Indonesia',
   'safeguard_eligible', false,
   'voluntary_retirement_eligible', true,
   'spot_price_aud', 12
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('accu-savanna-burning-500-units',
 'carbon-environmental-markets', 'for_sale_asset',
 'ACCU Savanna Burning — 500 Units',
 '500 ACCUs from Indigenous-led savanna burning projects in Northern Territory. Strong cultural + biodiversity co-benefits attract corporate buyers paying premium ($45-55 vs spot). Limited supply.',
 'NT', 'Darwin',
 2500000, 'AUD $50/unit · 500 units = $25,000',
 'carbon', 'savanna_burning',
 jsonb_build_object(
   'units', 500,
   'verification_method', 'savanna_burning',
   'project_type', 'indigenous_led_burning',
   'unit_type', 'ACCU',
   'co_benefits', ARRAY['indigenous_employment','biodiversity','cultural'],
   'safeguard_eligible', true,
   'spot_price_aud', 50
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('biodiversity-credits-nsw-50-units',
 'carbon-environmental-markets', 'for_sale_asset',
 'NSW Biodiversity Credits — 50 Units',
 'Biodiversity offset credits issued under the NSW Biodiversity Conservation Act. Required by developers as offset obligations under SEPP planning rules. Tightly held; secondary market is thin. Suits ecosystem services investors.',
 'NSW', 'Sydney',
 2500000, 'AUD $50,000 (≈ $1k/credit)',
 'biodiversity', 'nsw_bcs',
 jsonb_build_object(
   'credits', 50,
   'unit_type', 'biodiversity_credit',
   'jurisdiction', 'NSW',
   'scheme', 'NSW BCS',
   'required_for', 'sepp_development_offset',
   'smsf_eligible', false
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

-- ── 4. SDA housing (NDIS) ───────────────────────────────────────────────
-- Specialist Disability Accommodation — purpose-built homes for NDIS
-- participants with extreme functional impairment. NDIA pays rent
-- directly (Reasonable Rent Contribution) — yields 10-13% net.
-- Sub-category under commercial_property so it inherits the for_sale_asset
-- card layout.

('sda-melbourne-fully-accessible-3br',
 'commercial_property', 'for_sale_asset',
 'SDA Melbourne — Fully-Accessible 3BR Newly Built',
 'Brand-new SDA Fully-Accessible category dwelling in Melbourne''s western suburbs. NDIA-registered with 2 active tenants (10-year supported-independent-living agreements). NDIS rent ~$92,000/yr per tenant on top of CRA component. Net yield 11.2% on $850k contract. Single Resident Onsite Overnight Assistance (SROOA) not required.',
 'VIC', 'Melton',
 85000000, 'AUD $850,000 — Net yield 11.2%',
 'property', 'sda_housing',
 jsonb_build_object(
   'sda_design_category', 'fully_accessible',
   'bedrooms', 3,
   'sda_dwelling_capacity', 2,
   'sroa_required', false,
   'gross_yield_pct', 13.0,
   'net_yield_pct', 11.2,
   'ndia_registered', true,
   'sil_provider', 'Confidential',
   'build_year', 2025,
   'lrba_compatible', true,
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('sda-brisbane-hpa-4br',
 'commercial_property', 'for_sale_asset',
 'SDA Brisbane — High Physical Assistance 4BR',
 'Newly-completed High-Physical-Assistance (HPA) SDA in Brisbane. HPA category attracts the highest NDIS funding tier. 4 bedrooms + 2 SDA-qualifying rooms enable up to 2 participants. Operator provides 24/7 onsite SIL support. Net yield 12.5%.',
 'QLD', 'Logan',
 110000000, 'AUD $1,100,000 — Net yield 12.5%',
 'property', 'sda_housing',
 jsonb_build_object(
   'sda_design_category', 'high_physical_support',
   'bedrooms', 4,
   'sda_dwelling_capacity', 2,
   'sroa_required', true,
   'gross_yield_pct', 14.5,
   'net_yield_pct', 12.5,
   'ndia_registered', true,
   'build_year', 2026,
   'lrba_compatible', true,
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('sda-perth-improved-livability',
 'commercial_property', 'for_sale_asset',
 'SDA Perth — Improved Livability 3BR',
 'Improved-Livability category SDA in Perth''s southern suburbs. Lower NDIS funding tier than Fully-Accessible but cheaper to build. Suits participants with cognitive or psychosocial disabilities. Net yield 10.1%.',
 'WA', 'Rockingham',
 65000000, 'AUD $650,000 — Net yield 10.1%',
 'property', 'sda_housing',
 jsonb_build_object(
   'sda_design_category', 'improved_livability',
   'bedrooms', 3,
   'sda_dwelling_capacity', 1,
   'sroa_required', false,
   'gross_yield_pct', 11.8,
   'net_yield_pct', 10.1,
   'ndia_registered', true,
   'build_year', 2025,
   'lrba_compatible', true,
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('sda-syd-robust-2br',
 'commercial_property', 'for_sale_asset',
 'SDA Sydney West — Robust 2BR',
 'Robust-category SDA designed for participants with behavioural support needs. Reinforced fittings, lockable medication storage, security glazing. Sydney West location with proximity to disability-services hubs. Net yield 11.0%.',
 'NSW', 'Penrith',
 95000000, 'AUD $950,000 — Net yield 11.0%',
 'property', 'sda_housing',
 jsonb_build_object(
   'sda_design_category', 'robust',
   'bedrooms', 2,
   'sda_dwelling_capacity', 1,
   'sroa_required', true,
   'gross_yield_pct', 12.6,
   'net_yield_pct', 11.0,
   'ndia_registered', true,
   'build_year', 2026,
   'lrba_compatible', true,
   'smsf_eligible', true
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

-- ── 5. ESVCLP-registered funds ──────────────────────────────────────────
-- Early-Stage Venture Capital Limited Partnerships — investors get a
-- flat 10% non-refundable carry-forward tax offset on contributions PLUS
-- 100% CGT exemption on disposals after the holding period. Huge HNW hook.

('esvclp-australia-tech-fund-iv',
 'funds', 'fund',
 'Australia Tech ESVCLP Fund IV',
 'AUD $80M ESVCLP-registered fund investing in seed-to-Series-B Australian tech startups. 10-year fund life. Investors receive 10% non-refundable carry-forward tax offset on contributions + 100% CGT exemption on gains at fund maturity. Min investment $250k (wholesale-only). Forecast IRR 18-25% net.',
 'NSW', 'Sydney',
 NULL, 'Min $250,000 · 10% upfront tax offset + 100% CGT exempt',
 'venture_capital', 'esvclp',
 jsonb_build_object(
   'esvclp_registered', true,
   'esic_eligible', true,
   'fund_size_aud', 80000000,
   'min_investment_aud', 250000,
   'mer_bps', 250,
   'target_irr_pct', 22,
   'fund_term_years', 10,
   'wholesale_only', true,
   's708_required', true,
   'cgt_exemption', '100_pct_at_maturity',
   'tax_offset_pct', 10,
   'siv_complying', true
 ),
 ARRAY[]::text[],
 false, true, 'active', 'featured'),

('esvclp-aussie-climate-fund-ii',
 'funds', 'fund',
 'Aussie Climate ESVCLP Fund II',
 'AUD $50M climate-tech focused ESVCLP. Targets Series A energy storage, hydrogen, carbon-removal, and grid-software startups. 10-year life. ESVCLP tax benefits + ESIC eligibility on portfolio companies. Min $100k.',
 'VIC', 'Melbourne',
 NULL, 'Min $100,000 · ESVCLP + ESIC stacked benefits',
 'venture_capital', 'esvclp',
 jsonb_build_object(
   'esvclp_registered', true,
   'esic_eligible', true,
   'fund_size_aud', 50000000,
   'min_investment_aud', 100000,
   'mer_bps', 200,
   'target_irr_pct', 20,
   'fund_term_years', 10,
   'wholesale_only', true,
   'sector_focus', 'climate_tech',
   'cgt_exemption', '100_pct_at_maturity',
   'tax_offset_pct', 10
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard'),

('esvclp-medtech-impact-iii',
 'funds', 'fund',
 'MedTech Impact ESVCLP III',
 'AUD $35M ESVCLP backing early-stage Australian medtech with global commercialisation potential. Pre-seed to Series A. Strong portfolio: 3 prior funds returned 2.4× DPI. Wholesale only.',
 'NSW', 'Sydney',
 NULL, 'Min $50,000 · ESVCLP-registered',
 'venture_capital', 'esvclp',
 jsonb_build_object(
   'esvclp_registered', true,
   'esic_eligible', true,
   'fund_size_aud', 35000000,
   'min_investment_aud', 50000,
   'mer_bps', 220,
   'target_irr_pct', 19,
   'fund_term_years', 10,
   'wholesale_only', true,
   'sector_focus', 'medtech',
   'cgt_exemption', '100_pct_at_maturity',
   'tax_offset_pct', 10,
   'prior_fund_dpi', 2.4
 ),
 ARRAY[]::text[],
 false, false, 'active', 'standard')

ON CONFLICT (slug) DO NOTHING;

COMMIT;
