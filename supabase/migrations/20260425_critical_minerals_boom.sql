-- ============================================================
-- Critical Minerals Boom: 15 new mining listings + boom article
-- Capitalises on US-Australia $8.5B framework, EU-Australia FTA,
-- Critical Minerals Strategic Reserve, China rare earth restrictions
-- ============================================================

-- ============================================================
-- 15 NEW MINING LISTINGS — Critical Minerals Focus
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES

-- 1. Lynas-adjacent rare earths
(
  'mining',
  'Mt Weld South Rare Earths — NdPr Enriched Clay Deposit',
  'mt-weld-south-rare-earths-ndpr',
  'Ionic adsorption clay rare earths project 80km south of Lynas Rare Earths'' Mt Weld mine, WA. Soil geochemistry confirms NdPr enrichment across 22km strike. First-pass drilling returned 12m at 1,850ppm TREO including 28% NdPr. Government Critical Minerals Prospectus listed. Seeking strategic partner or acquisition aligned with US-Australia bilateral framework.',
  'WA', 'Laverton',
  320000000, '$3.2M',
  NULL, NULL,
  'Mining & Resources', 'Rare Earths Exploration',
  '{"commodity": "rare earths", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 14200, "estimated_resource": "No JORC resource — 22km NdPr anomaly, drilling underway", "critical_mineral": true, "government_prospectus": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0020',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 2. WA Gallium-Germanium (Pentagon interest)
(
  'mining',
  'Darling Range Gallium-Germanium Recovery Project',
  'darling-range-gallium-germanium',
  'Novel gallium and germanium extraction project recovering critical minerals from alumina refinery residue (red mud) in the Darling Range, WA. Pilot plant operational, producing 99.99% Ga metal. Aligns with Pentagon-backed gallium refinery initiative. Offtake discussions with US defence contractors underway.',
  'WA', 'Perth',
  850000000, '$8.5M',
  45000000, 18000000,
  'Mining & Resources', 'Gallium Processing',
  '{"commodity": "gallium", "stage": "producer", "asx_ticker": null, "tenement_area_ha": 0, "estimated_resource": "N/A — processing operation", "annual_production": "12t Ga, 800kg Ge", "critical_mineral": true, "us_framework_aligned": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0021',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 3. Lithium hydroxide refinery
(
  'mining',
  'Kwinana Lithium Hydroxide Refinery — Stage 2 Expansion',
  'kwinana-lithium-hydroxide-refinery-expansion',
  'Stage 2 capital raise for lithium hydroxide refinery in Kwinana industrial area, WA. Stage 1 producing 24,000 tpa LiOH. Stage 2 doubles capacity to 48,000 tpa. Binding spodumene supply agreements with two Pilbara miners. EU-Australia FTA creates tariff-free pathway to European EV manufacturers.',
  'WA', 'Kwinana',
  12000000000, '$120M',
  480000000, 96000000,
  'Mining & Resources', 'Lithium Processing',
  '{"commodity": "lithium", "stage": "producer", "asx_ticker": "LHR", "tenement_area_ha": 0, "estimated_resource": "N/A — processing operation", "annual_capacity": "48,000 tpa LiOH (Stage 2)", "critical_mineral": true, "eu_fta_eligible": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0022',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 4. Cobalt-nickel laterite
(
  'mining',
  'Murrin Murrin South Cobalt-Nickel Laterite Project',
  'murrin-murrin-south-cobalt-nickel',
  'Cobalt-nickel laterite project adjacent to the Murrin Murrin processing hub in WA. JORC resource of 42 Mt at 0.08% Co and 0.82% Ni. Scoping study shows positive economics via HPAL processing. Cobalt designated as critical mineral under US-Australia framework. Toll treatment options available at Murrin Murrin.',
  'WA', 'Leonora',
  680000000, '$6.8M',
  NULL, NULL,
  'Mining & Resources', 'Cobalt-Nickel Development',
  '{"commodity": "cobalt", "stage": "developer", "asx_ticker": "CNL", "tenement_area_ha": 7600, "estimated_resource": "42 Mt at 0.08% Co, 0.82% Ni (Indicated + Inferred, JORC 2012)", "critical_mineral": true}',
  'featured', true, false,
  'listings@invest.com.au', '08 9000 0023',
  'active', NOW() + INTERVAL '60 days', 0, 0
),

-- 5. Vanadium redox flow battery project
(
  'mining',
  'Julia Creek Vanadium Project — Battery Storage Focus',
  'julia-creek-vanadium-battery-storage',
  'Large-scale vanadium project near Julia Creek, QLD. JORC resource of 1.1 Bt at 0.31% V₂O₅ — one of the world''s largest undeveloped vanadium deposits. Vanadium redox flow batteries are emerging as grid-scale storage solution. PFS completed showing robust economics. Strategic Reserve eligible.',
  'QLD', 'Julia Creek',
  1500000000, '$15M',
  NULL, NULL,
  'Mining & Resources', 'Vanadium Development',
  '{"commodity": "vanadium", "stage": "developer", "asx_ticker": "VAN", "tenement_area_ha": 22100, "estimated_resource": "1.1 Bt at 0.31% V₂O₅ (Indicated + Inferred, JORC 2012)", "critical_mineral": true}',
  'premium', true, false,
  'listings@invest.com.au', '07 4000 0010',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 6. Pilbara lithium explorer — drill-ready
(
  'mining',
  'Pilbara West Lithium Pegmatites — 6 Targets Identified',
  'pilbara-west-lithium-6-targets',
  'Early-stage lithium exploration project 40km west of Pilgangoora in the Pilbara, WA. Regional mapping and soil sampling have identified 6 spodumene pegmatite targets along a 15km trend. Heritage surveys completed. Drill-ready Q3 2026. Seeking JV partner with $2M exploration commitment.',
  'WA', 'Port Hedland',
  250000000, '$2.5M',
  NULL, NULL,
  'Mining & Resources', 'Lithium Exploration',
  '{"commodity": "lithium", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 28000, "estimated_resource": "No JORC resource — 6 pegmatite targets along 15km trend", "critical_mineral": true}',
  'featured', true, false,
  'listings@invest.com.au', '08 9000 0024',
  'active', NOW() + INTERVAL '60 days', 0, 0
),

-- 7. NT manganese producer
(
  'mining',
  'Groote Eylandt Manganese Royalty — Producing Asset',
  'groote-eylandt-manganese-royalty',
  'Gross revenue royalty over a producing manganese operation on Groote Eylandt, NT. 2% royalty rate generating ~$3.8M annually at current manganese prices. Operator has 25+ year mine life. Manganese is essential for EV batteries (NMC cathodes) and steel. Perpetual, transferable royalty.',
  'NT', 'Groote Eylandt',
  4500000000, '$45M',
  380000000, 380000000,
  'Mining & Resources', 'Royalty / Streaming',
  '{"commodity": "manganese", "stage": "producer", "asx_ticker": null, "tenement_area_ha": 0, "estimated_resource": "Royalty only — 25+ year mine life remaining", "annual_royalty": "$3.8M", "critical_mineral": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 8900 0001',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 8. SA copper-gold explorer
(
  'mining',
  'Gawler Craton Copper-Gold IOCG Targets',
  'gawler-craton-iocg-copper-gold',
  'Iron oxide copper-gold (IOCG) exploration project on the Gawler Craton, SA — the same geological province as Olympic Dam and Prominent Hill. 3 high-priority drill targets identified from gravity and magnetic surveys. Heritage agreements in place. Fully funded for 4-hole RC program.',
  'SA', 'Woomera',
  190000000, '$1.9M',
  NULL, NULL,
  'Mining & Resources', 'Copper-Gold Exploration',
  '{"commodity": "copper", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 16500, "estimated_resource": "No JORC resource — 3 IOCG drill targets on Olympic Dam geological province"}',
  'standard', true, false,
  'listings@invest.com.au', '08 8000 0020',
  'active', NOW() + INTERVAL '30 days', 0, 0
),

-- 9. QLD graphite project
(
  'mining',
  'North Queensland Graphite Project — Battery Anode Material',
  'north-qld-graphite-battery-anode',
  'Flake graphite project in North Queensland with JORC resource of 12.8 Mt at 7.2% TGC. Metallurgical testwork confirms production of 95%+ purity concentrate suitable for battery anode processing. Graphite is a critical mineral for lithium-ion battery anodes. DFS underway.',
  'QLD', 'Cairns',
  520000000, '$5.2M',
  NULL, NULL,
  'Mining & Resources', 'Graphite Development',
  '{"commodity": "graphite", "stage": "developer", "asx_ticker": "GRQ", "tenement_area_ha": 4800, "estimated_resource": "12.8 Mt at 7.2% TGC (Indicated + Inferred, JORC 2012)", "critical_mineral": true}',
  'featured', true, false,
  'listings@invest.com.au', '07 4000 0011',
  'active', NOW() + INTERVAL '60 days', 0, 0
),

-- 10. WA nickel sulphide — advanced
(
  'mining',
  'Kambalda Nickel Sulphide — DFS Complete',
  'kambalda-nickel-sulphide-dfs',
  'Advanced nickel sulphide project in the Kambalda nickel belt, WA. JORC resource of 4.2 Mt at 2.1% Ni. DFS completed showing NPV of $180M at US$22,000/t Ni. All approvals in place. Seeking project finance or strategic partner. Battery-grade nickel production planned.',
  'WA', 'Kambalda',
  2800000000, '$28M',
  NULL, NULL,
  'Mining & Resources', 'Nickel Development',
  '{"commodity": "nickel", "stage": "developer", "asx_ticker": "KNS", "tenement_area_ha": 3200, "estimated_resource": "4.2 Mt at 2.1% Ni (Indicated + Inferred, JORC 2012)", "dfs_npv": "$180M at US$22k/t Ni", "critical_mineral": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0025',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 11. TAS tin-tungsten
(
  'mining',
  'Tasmania Tin-Tungsten Project — High-Grade Veins',
  'tasmania-tin-tungsten-high-grade',
  'Tin-tungsten exploration project in NE Tasmania with historical production of 8,000t Sn. Recent channel sampling returned up to 3.2% Sn and 0.8% WO₃. Both tin and tungsten are designated critical minerals. Proximity to existing processing infrastructure at Renison Bell.',
  'TAS', 'Launceston',
  145000000, '$1.45M',
  NULL, NULL,
  'Mining & Resources', 'Tin-Tungsten Exploration',
  '{"commodity": "tin", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 2400, "estimated_resource": "No JORC resource — historical production 8,000t Sn, high-grade veins confirmed", "critical_mineral": true}',
  'standard', true, false,
  'listings@invest.com.au', '03 6000 0010',
  'active', NOW() + INTERVAL '30 days', 0, 0
),

-- 12. WA rare earths producer (Lynas competitor)
(
  'mining',
  'Gascoyne Rare Earths — Monazite Sands Producer',
  'gascoyne-rare-earths-monazite-producer',
  'Producing rare earths operation recovering monazite concentrate from mineral sands in the Gascoyne region, WA. Annual production of 8,000t monazite concentrate. Long-term offtake with US rare earth processor. Revenue $12M pa. Expansion capital sought to double capacity.',
  'WA', 'Carnarvon',
  3600000000, '$36M',
  1200000000, 360000000,
  'Mining & Resources', 'Rare Earths Production',
  '{"commodity": "rare earths", "stage": "producer", "asx_ticker": "GRE", "tenement_area_ha": 9800, "estimated_resource": "24 Mt at 2.8% HM (Measured + Indicated)", "annual_production": "8,000t monazite concentrate", "critical_mineral": true, "us_offtake": true}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0026',
  'active', NOW() + INTERVAL '90 days', 0, 0
),

-- 13. NSW critical minerals explorer — multi-commodity
(
  'mining',
  'Lachlan Fold Belt Critical Minerals — Cu-Au-Mo-Re Portfolio',
  'lachlan-fold-belt-critical-minerals',
  'Multi-commodity critical minerals exploration portfolio across 5 tenements in the Lachlan Fold Belt, NSW. Targets include copper-gold porphyry, molybdenum, and rhenium. Adjacent to Cadia-Ridgeway (one of world''s largest gold-copper mines). Government Critical Minerals Prospectus listed.',
  'NSW', 'Orange',
  420000000, '$4.2M',
  NULL, NULL,
  'Mining & Resources', 'Multi-Commodity Exploration',
  '{"commodity": "copper", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 21000, "estimated_resource": "No JORC resource — 5 tenements, multi-commodity targets", "critical_mineral": true, "government_prospectus": true}',
  'featured', true, false,
  'listings@invest.com.au', '02 6000 0010',
  'active', NOW() + INTERVAL '60 days', 0, 0
),

-- 14. QLD scandium project
(
  'mining',
  'Central Queensland Scandium-Cobalt Project',
  'central-qld-scandium-cobalt',
  'Scandium-cobalt laterite project in Central Queensland. JORC resource of 52 Mt at 68ppm Sc₂O₃ and 0.06% Co. Scandium is used in solid oxide fuel cells and aluminium-scandium alloys for aerospace. One of only 3 advanced scandium projects globally. PFS underway.',
  'QLD', 'Gladstone',
  380000000, '$3.8M',
  NULL, NULL,
  'Mining & Resources', 'Scandium-Cobalt Development',
  '{"commodity": "scandium", "stage": "developer", "asx_ticker": "SCQ", "tenement_area_ha": 5200, "estimated_resource": "52 Mt at 68ppm Sc₂O₃, 0.06% Co (Indicated + Inferred)", "critical_mineral": true}',
  'featured', true, false,
  'listings@invest.com.au', '07 4000 0012',
  'active', NOW() + INTERVAL '60 days', 0, 0
),

-- 15. SA copper — Olympic Dam province
(
  'mining',
  'Stuart Shelf Copper-Gold JV Opportunity — Olympic Dam Province',
  'stuart-shelf-copper-gold-jv-olympic-dam',
  'Joint venture opportunity in the Stuart Shelf region, SA — directly along strike from BHP''s Olympic Dam expansion corridor. Extensive geophysical dataset (gravity, magnetics, MT) identifies 2 compelling IOCG targets at 400-600m depth. Seeking JV partner to fund $4M diamond drilling program for 51% earn-in.',
  'SA', 'Roxby Downs',
  0, 'JV — $4M Earn-in for 51%',
  NULL, NULL,
  'Mining & Resources', 'Copper-Gold JV',
  '{"commodity": "copper", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 11200, "estimated_resource": "No JORC resource — 2 IOCG targets at 400-600m depth", "jv_terms": "$4M for 51% earn-in"}',
  'premium', true, false,
  'listings@invest.com.au', '08 8000 0021',
  'active', NOW() + INTERVAL '90 days', 0, 0
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- ARTICLE: Australia's Critical Minerals Boom — How to Invest
-- ============================================================
INSERT INTO articles (title, slug, excerpt, category, content_type, content, sections, tags, read_time, evergreen, published_at, related_verticals) VALUES (
  'Australia''s Critical Minerals Boom 2026: How to Invest',
  'australias-critical-minerals-boom-how-to-invest',
  'The US-Australia bilateral framework, EU-Australia FTA, and China''s rare earth restrictions are creating a once-in-a-generation mining investment opportunity. Here''s how to participate.',
  'mining',
  'guide',
  NULL,
  '[
    {
      "heading": "What Is Happening Right Now",
      "body": "Three mega-trends are converging to create what may be Australia''s third mining boom. The US-Australia Critical Minerals Framework has mobilised over $8.5 billion in investment pipeline. The EU-Australia Free Trade Agreement, finalised in March 2026, eliminates more than 99% of tariffs on mineral exports. And China''s rare earth export restrictions are forcing every Western nation to find alternative supply chains — with Australia as the primary beneficiary.\n\nThe Australian government has committed $3.4 billion through the Resourcing Australia''s Prosperity initiative over 35 years, established a $1.2 billion Critical Minerals Strategic Reserve (operational H2 2026), and expanded Export Finance Australia''s mandate to facilitate critical minerals projects.\n\nFor investors, this creates a window of opportunity: government-backed demand, multi-billion-dollar capital flows, and a structural supply shortage across lithium, rare earths, cobalt, nickel, vanadium, gallium, and graphite."
    },
    {
      "heading": "Why Australia for Critical Minerals",
      "body": "Australia is the world''s top destination for rare earth exploration, capturing approximately 45% of worldwide investment. The country hosts 89 active rare earth exploration projects — far outpacing Canada (18), Brazil (13), and the United States (12).\n\nThe government''s Critical Minerals Prospectus packages 78 projects specifically for international investors. Of these, only three are currently under construction, meaning 75 projects are actively seeking capital, partners, and execution support.\n\nKey advantages for investors:\n- Political stability and rule of law (FIRB provides a transparent regulatory framework)\n- World-class geological endowment (largest reserves of lithium, zinc, nickel, and rutile)\n- Established mining infrastructure (ports, rail, power, water)\n- Allied-nation preferential treatment under bilateral frameworks (US, Japan, Korea, EU)\n- Skilled workforce and established mining services sector"
    },
    {
      "heading": "The Key Commodities to Watch",
      "body": "**Lithium** — Australia produces over half the world''s lithium. Demand is projected to increase 500-700% by 2030 driven by EV batteries. The Kwinana lithium hydroxide processing hub in WA is becoming a global centre for downstream value-add.\n\n**Rare Earths** — China controls approximately 70% of mining, 90% of processing, and 93% of magnet manufacturing. Australia''s Lynas Rare Earths is the only significant non-Chinese producer. The 2025 ASX saw more than 100 rare earth deals, compared to zero in the previous year''s top-10 critical minerals.\n\n**Nickel** — Battery-grade nickel demand is projected to rise 300-400% by 2030. WA''s Yilgarn Craton and Kambalda belt host world-class sulphide deposits preferred for battery cathodes.\n\n**Cobalt** — Essential for lithium-ion battery cathodes. Australian laterite deposits offer ethical sourcing advantages over artisanal Congo supply.\n\n**Vanadium** — Emerging as a key material for grid-scale energy storage via vanadium redox flow batteries. Australia hosts some of the world''s largest undeveloped deposits.\n\n**Gallium & Germanium** — China restricted exports in 2023. The Pentagon is directly funding gallium refining capacity in WA. Critical for semiconductors, 5G, and defence applications."
    },
    {
      "heading": "How to Invest: 5 Pathways",
      "body": "**1. ASX-Listed Mining Stocks**\nThe most accessible route. Major ASX-listed critical minerals companies include Pilbara Minerals (PLS), Lynas Rare Earths (LYC), IGO (IGO), Iluka Resources (ILU), and Arafura Rare Earths (ARU). Junior explorers offer higher risk/reward.\n\n**2. Mining ETFs**\nDiversified exposure: VanEck Gold Miners ETF (MNRS), BetaShares Resources Sector ETF (QRE), Global X Battery Tech and Lithium ETF (ETLM). The new Global X Critical Minerals ETF provides targeted exposure.\n\n**3. Direct Project Investment**\nInvest directly in unlisted projects — exploration tenements, joint ventures, or pre-IPO placements. Browse opportunities on our mining listings page. Typically requires $500K+ and FIRB approval for foreign investors.\n\n**4. Royalty Streams**\nPurchase a perpetual royalty on future mine production. Lower risk than equity, provides passive income. Iron ore and gold royalties currently available on our platform.\n\n**5. Government-Backed Vehicles**\nExport Finance Australia, the Northern Australia Infrastructure Facility (NAIF), and the Critical Minerals Development Corporation offer co-investment and loan facilities. Ideal for institutional investors seeking de-risked exposure."
    },
    {
      "heading": "FIRB Rules for Foreign Mining Investors",
      "body": "Mining is classified as a ''sensitive sector'' under Australia''s foreign investment framework. Key rules:\n\n- **Allied-nation investors** (US, UK, Japan, Korea, EU): Streamlined FIRB processing under the 2025-26 bilateral frameworks. The US-Australia agreement specifically aims to ''accelerate, streamline or deregulate permitting for exploration, mining, separation and processing.''\n\n- **Non-allied investors**: Heightened national security review for any transaction involving critical mineral assets. Chinese investment in Australian critical minerals faces particular scrutiny.\n\n- **Thresholds**: Direct tenement acquisitions generally require FIRB approval regardless of value. ASX share acquisitions trigger FIRB at 10% (sensitive country) or 20% (general).\n\n- **Conditions**: FIRB may impose conditions including local processing commitments, employment requirements, and environmental obligations.\n\nAll foreign investors should engage a specialist mining lawyer familiar with FIRB processes. Browse mining lawyers on our advisor directory."
    },
    {
      "heading": "What to Do Next",
      "body": "The confluence of government-backed investment frameworks, structural supply shortages, and the energy transition creates an opportunity that may not repeat for decades. Here''s how to get started:\n\n1. **Browse mining opportunities** — View active listings on our mining investment marketplace, filtered by commodity, stage, and state.\n\n2. **Understand the landscape** — Read our commodity-specific guides for lithium, rare earths, gold, copper, and nickel.\n\n3. **Get professional advice** — Connect with mining lawyers, tax advisors, and financial planners who specialise in resources sector investment.\n\n4. **Compare brokers** — If you prefer ASX-listed exposure, compare share trading platforms on our broker comparison pages.\n\nThe critical minerals boom is in its early stages. Capital is flowing, government support is unprecedented, and Australia holds the geological and geopolitical advantage. The question isn''t whether this opportunity is real — it''s whether you''re positioned to capture it."
    }
  ]'::jsonb,
  '["critical minerals", "mining", "lithium", "rare earths", "nickel", "cobalt", "vanadium", "gallium", "US-Australia framework", "EU-Australia FTA", "FIRB", "ASX mining", "investment guide"]'::jsonb,
  12,
  false,
  NOW(),
  ARRAY['mining']
) ON CONFLICT (slug) DO NOTHING;
