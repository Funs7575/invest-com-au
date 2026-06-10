-- ============================================================
-- Digital Infrastructure vertical — investment_verticals row +
-- 10 seed listings (data centres, fibre, towers, AI compute).
--
-- Date: 2026-05-09
-- Source: docs/audits/MM-marketplace-expansion-plan.md (Phase 2, MM-V01).
-- Why: AU digital-infrastructure is one of the highest-growth investable
--      categories (NEXTDC ~$3-4B mkt cap, AirTrunk sold to Blackstone for
--      $24B in 2024, accelerating AI-compute demand). Currently zero
--      coverage on invest.com.au. New top-level vertical alongside the
--      existing "infrastructure" (which covers physical / public infra
--      — toll roads, utilities, PPPs).
--
-- Idempotency: ON CONFLICT (slug) upsert pattern matches the rest of
-- the verticals migrations. Safe to re-apply.
--
-- Rollback:
--   DELETE FROM public.investment_listings WHERE source = 'digital-infrastructure-seed';
--   DELETE FROM public.investment_verticals WHERE slug = 'digital-infrastructure';
--   Note: INSERT-only migration; no DDL to reverse.
--
-- Naming convention note: this migration uses the kebab-case slug
-- `digital-infrastructure` for both `investment_verticals.slug` and
-- `investment_listings.vertical`, consistent with `lib/listing-verticals.ts`
-- (the SSOT). Existing snake_case verticals (`commercial_property`,
-- `pre_ipo`) reflect pre-SSOT drift; the audit-remediation MM-AUDIT
-- iteration will reconcile.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. investment_verticals row
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_verticals (
  slug, name, description, icon,
  hero_title, hero_subtitle,
  domestic, international, fdi_share_percent,
  sort_order
) VALUES (
  'digital-infrastructure',
  'Digital Infrastructure',
  'Data centres, fibre and metro networks, subsea cables, 5G/6G tower assets, AI-compute facilities and edge computing infrastructure. Australia is one of the fastest-growing data-centre markets globally — driven by hyperscaler buildout (AWS, Azure, Google), AI training-cluster demand, and sovereign cloud requirements. Investable exposure spans ASX-listed pure-plays (NEXTDC, Macquarie Telecom), unlisted institutional (AirTrunk, Equinix AU, Global Switch), private-credit-funded fibre rollouts, and tower portfolios.',
  'cpu',
  'Invest in Australian Digital Infrastructure (2026)',
  'Data centres, fibre, subsea cables, AI compute, tower assets. ASX-listed and institutional opportunities for retail and wholesale investors.',
  true, true, 18,
  16
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
  sort_order        = EXCLUDED.sort_order,
  updated_at        = NOW();

-- ────────────────────────────────────────────────────────────
-- 2. 10 seed investment_listings
--    Mix of: ASX-listed pure-plays, ASX-listed indirect, institutional
--    private placements (s708 wholesale), and project-financing seeks.
--    Slugs are unique; ON CONFLICT (slug) upsert.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.investment_listings (
  vertical, title, slug, description,
  location_state, location_city,
  asking_price_cents, price_display,
  industry, sub_category, key_metrics,
  listing_type, firb_eligible, siv_complying,
  contact_email, source, status
) VALUES

-- 1. NEXTDC (NXT)
('digital-infrastructure',
 'NEXTDC (NXT) — ASX Data-Centre Pure-Play',
 'nextdc-nxt-asx-data-centre',
 'ASX-listed leading Australian data-centre operator with national footprint across Sydney, Melbourne, Brisbane, Perth, Canberra and Adelaide. Strategic interconnect with all hyperscalers (AWS, Azure, Google Cloud, Oracle). Building substantial new capacity in S5 Sydney, M3 Melbourne and KC Sunshine Coast to meet AI-training demand. Capital-intensive growth story; trades on EV/EBITDA, not earnings.',
 'NSW', 'Sydney',
 NULL, 'ASX: NXT',
 'Digital Infrastructure', 'Data Centre Operator',
 '{"asx_ticker":"NXT","sub_category":"data_centre","stage":"operating","market_cap_bn_aud":11.5,"capacity_mw":300,"hyperscaler_anchored":true,"customer_mix":"hyperscaler_plus_enterprise","dividend_yield":"none_growth_capex"}',
 'standard', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 2. Macquarie Technology Group (MAQ)
('digital-infrastructure',
 'Macquarie Technology Group (MAQ) — Sovereign Cloud + Data Centres',
 'macquarie-technology-maq',
 'ASX-listed integrated digital-infrastructure operator combining wholesale data-centres, federal-government cloud (sovereign cloud certification), telecommunications and cybersecurity. IC3 Super West data-centre campus in Sydney is a flagship AI-compute build. Higher-margin enterprise mix vs NXT, smaller scale.',
 'NSW', 'Sydney',
 NULL, 'ASX: MAQ',
 'Digital Infrastructure', 'Data Centre + Cloud',
 '{"asx_ticker":"MAQ","sub_category":"data_centre","stage":"operating","market_cap_bn_aud":2.0,"sovereign_cloud_certified":true,"campus":"IC3_Super_West","customer_mix":"enterprise_plus_government"}',
 'standard', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 3. Goodman Group (GMG) — indirect data-centre exposure
('digital-infrastructure',
 'Goodman Group (GMG) — Industrial REIT Pivoting to Data Centres',
 'goodman-group-gmg-data-centre',
 'ASX top-20 industrial property REIT with one of the largest global data-centre development pipelines (~5GW including JV stakes). Best-located industrial sites in Sydney, Melbourne, LA, London being repositioned as data-centre campuses. Investment case mixes industrial-rent earnings today with data-centre optionality / development profit on conversion. Significant value-add upside if AI-compute demand sustains.',
 'NSW', 'Sydney',
 NULL, 'ASX: GMG',
 'Digital Infrastructure', 'Data Centre Development',
 '{"asx_ticker":"GMG","sub_category":"data_centre","stage":"operating_plus_development","market_cap_bn_aud":68.0,"data_centre_pipeline_gw":5.0,"primary_business":"industrial_reit","conversion_optionality":"high"}',
 'standard', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 4. AirTrunk — wholesale-only secondary co-investment
('digital-infrastructure',
 'AirTrunk Hyperscale Campus — Wholesale Secondary Co-Investment',
 'airtrunk-hyperscale-secondary',
 'Wholesale-only (s708 sophisticated investor) opportunity to co-invest alongside Blackstone (acquired AirTrunk for AUD$24B in 2024) in a secondary tranche of the SYD1 hyperscale campus expansion. Long-term hyperscaler anchor leases (15+ year terms). Min commit AUD$5M, sophisticated investor certificate required. Indicative IRR 12-15% on 7-10y hold.',
 'NSW', 'Sydney',
 500000000, '$5M min (wholesale only)',
 'Digital Infrastructure', 'Hyperscale Data Centre',
 '{"sub_category":"hyperscale_data_centre","stage":"operating","capacity_mw":320,"min_commit_aud":5000000,"hold_period_years":"7-10","target_irr":"12-15%","wholesale_only":true,"s708_required":true,"anchor_tenant":"hyperscaler_long_lease"}',
 'premium', true, true,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 5. Equinix Australia
('digital-infrastructure',
 'Equinix Australia — Sydney + Melbourne Interconnect Capacity',
 'equinix-australia-interconnect',
 'Global colocation/interconnect leader operating multiple International Business Exchange (IBX) facilities across Sydney (SY1-SY9) and Melbourne (ME1-ME2). ASX investors access via NASDAQ-listed parent (EQIX). Direct project co-investment opportunities in new build-out via Equinix Capital — global wholesale-only programme.',
 'NSW', 'Sydney',
 NULL, 'NASDAQ: EQIX (parent)',
 'Digital Infrastructure', 'Colocation + Interconnect',
 '{"nasdaq_ticker":"EQIX","sub_category":"data_centre_colocation","stage":"operating","au_facilities":11,"primary_market":"interconnect","global_pe_relationship":"GIC_partnership_AU"}',
 'standard', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 6. Vocus Group fibre (private credit)
('digital-infrastructure',
 'Vocus Fibre Co-Investment — Private Credit (Wholesale)',
 'vocus-fibre-private-credit',
 'Wholesale-only opportunity (s708) to participate in private-credit financing for Vocus Group''s ongoing intercity and metro fibre rollout. Vocus owns Australia''s second-largest national fibre backbone and operates the Australia Singapore Cable subsea system. Investment via senior secured debt with quarterly distributions, target yield 7-9% p.a., 4-year duration, AUD$250k minimum.',
 'NSW', 'Sydney',
 25000000, '$250k min (wholesale only)',
 'Digital Infrastructure', 'Fibre Infrastructure Debt',
 '{"sub_category":"fibre_metro_intercity","stage":"operating","instrument":"private_credit_senior_secured","min_commit_aud":250000,"duration_years":4,"target_yield_pct":"7-9","distribution_frequency":"quarterly","wholesale_only":true,"s708_required":true}',
 'premium', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 7. Australia Singapore Cable + Indigo subsea
('digital-infrastructure',
 'Indigo West Subsea Cable — Capacity Tranche (Wholesale)',
 'indigo-west-subsea-cable-capacity',
 'Wholesale subsea-cable capacity tranche on the Indigo West system (Perth-Singapore-Jakarta). Long-term Indefeasible Right of Use (IRU) sale on lit capacity. Strategic asset class — subsea bandwidth scarcity is a binding constraint on AU cloud-region growth. Min ticket USD$2M; 10-15 year IRU. Suit institutional / strategic-corporate buyers.',
 'WA', 'Perth',
 300000000, '$3M min (wholesale only)',
 'Digital Infrastructure', 'Subsea Cable',
 '{"sub_category":"subsea_cable","stage":"operating","instrument":"IRU_capacity_tranche","route":"Perth_Singapore_Jakarta","min_commit_usd":2000000,"duration_years":"10-15","wholesale_only":true,"s708_required":true,"strategic_buyer_focused":true}',
 'premium', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 8. Telstra InfraCo Towers (TLS)
('digital-infrastructure',
 'Telstra (TLS) — Mobile Tower Portfolio Exposure via InfraCo',
 'telstra-tls-tower-infraco',
 'ASX top-50 telco. Telstra InfraCo Towers division spun out and 49% sold to a Future Fund consortium in 2021 at a $5.9B valuation. Direct tower exposure now via InfraCo''s ongoing co-investment programme; equity exposure also via Telstra''s 51% retained stake. Indirect retail exposure trades on TLS dividend yield.',
 'VIC', 'Melbourne',
 NULL, 'ASX: TLS',
 'Digital Infrastructure', 'Mobile Tower Portfolio',
 '{"asx_ticker":"TLS","sub_category":"tower_assets","stage":"operating","market_cap_bn_aud":42.0,"infraco_valuation_bn":5.9,"infraco_retained_pct":51,"dividend_yield":"fully_franked"}',
 'standard', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 9. AI compute cluster (early-stage venture)
('digital-infrastructure',
 'AU AI Compute Cluster — Series-B Co-Investment (Wholesale)',
 'au-ai-compute-cluster-series-b',
 'Wholesale Series-B opportunity in an Australian AI-compute infrastructure operator deploying GPU clusters (H100/H200) for sovereign-AI workloads. Anchor customers include CSIRO, two Tier-1 banks, and state-government AI initiatives. Capacity expansion to 25MW by 2027. Min commit AUD$500k, sophisticated investor only.',
 'NSW', 'Sydney',
 50000000, '$500k min (wholesale only)',
 'Digital Infrastructure', 'AI Compute Cluster',
 '{"sub_category":"ai_compute","stage":"series_b","gpu_type":"H100_H200","capacity_target_mw":25,"target_year":2027,"anchor_customers":"sovereign_ai","min_commit_aud":500000,"wholesale_only":true,"s708_required":true,"esic_eligible":false}',
 'premium', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active'),

-- 10. Edge facility / cell-site backhaul
('digital-infrastructure',
 'Regional Edge Computing Facility — NT Mining-Hub Buildout',
 'nt-edge-facility-mining-hub',
 'New-build edge-computing micro-data-centre serving NT mining and energy operators with low-latency compute, real-time analytics and remote-operations enablement. 1.5MW IT capacity in two halls, anchor-tenant LOI from a Tier-1 mining major. Construction-stage equity raise — AUD$15M total, AUD$2M minimum participation. Wholesale-only (s708).',
 'NT', 'Darwin',
 1500000000, '$2M min (wholesale only)',
 'Digital Infrastructure', 'Edge Data Centre',
 '{"sub_category":"edge_data_centre","stage":"construction","capacity_mw":1.5,"anchor_loi":"tier_1_mining_major","total_raise_aud":15000000,"min_commit_aud":2000000,"wholesale_only":true,"s708_required":true,"siv_complying":false}',
 'premium', true, false,
 'listings@invest.com.au', 'digital-infrastructure-seed', 'active')

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
  source             = EXCLUDED.source,
  status             = EXCLUDED.status,
  updated_at         = NOW();
