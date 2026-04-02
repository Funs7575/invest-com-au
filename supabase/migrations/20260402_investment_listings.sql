-- 20260402_investment_listings.sql
-- Investment listings marketplace schema and seed data
-- ============================================================

-- investment_listings table
CREATE TABLE IF NOT EXISTS investment_listings (
  id SERIAL PRIMARY KEY,
  vertical TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  location_state TEXT,
  location_city TEXT,
  asking_price_cents BIGINT,
  price_display TEXT,
  annual_revenue_cents BIGINT,
  annual_profit_cents BIGINT,
  industry TEXT,
  sub_category TEXT,
  key_metrics JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  listing_type TEXT DEFAULT 'standard',
  firb_eligible BOOLEAN DEFAULT false,
  siv_complying BOOLEAN DEFAULT false,
  listed_by_professional_id INTEGER,
  external_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  enquiries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes
CREATE INDEX IF NOT EXISTS investment_listings_vertical_idx ON investment_listings(vertical);
CREATE INDEX IF NOT EXISTS investment_listings_status_idx ON investment_listings(status);
CREATE INDEX IF NOT EXISTS investment_listings_firb_idx ON investment_listings(firb_eligible);
CREATE INDEX IF NOT EXISTS investment_listings_state_idx ON investment_listings(location_state);
CREATE INDEX IF NOT EXISTS investment_listings_price_idx ON investment_listings(asking_price_cents);
CREATE INDEX IF NOT EXISTS investment_listings_listing_type_idx ON investment_listings(listing_type);

-- listing_enquiries table
CREATE TABLE IF NOT EXISTS listing_enquiries (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER REFERENCES investment_listings(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  message TEXT,
  investor_country TEXT,
  investor_type TEXT,
  source_page TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS listing_enquiries_listing_id_idx ON listing_enquiries(listing_id);
CREATE INDEX IF NOT EXISTS listing_enquiries_status_idx ON listing_enquiries(status);

-- listing_plans table
CREATE TABLE IF NOT EXISTS listing_plans (
  id SERIAL PRIMARY KEY,
  vertical TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  price_cents_monthly INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  stripe_price_id TEXT,
  active BOOLEAN DEFAULT true
);

-- ============================================================
-- SEED DATA: listing_plans (3 tiers per vertical)
-- ============================================================
INSERT INTO listing_plans (vertical, plan_name, price_cents_monthly, features, stripe_price_id, active) VALUES
  ('business',           'Standard',  9900,  '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_business_standard',  true),
  ('business',           'Featured',  24900, '{"listing_duration_days": 60, "photos": 15, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_business_featured',  true),
  ('business',           'Premium',   49900, '{"listing_duration_days": 90, "photos": 30, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_business_premium', true),
  ('mining',             'Standard',  14900, '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_mining_standard',    true),
  ('mining',             'Featured',  34900, '{"listing_duration_days": 60, "photos": 15, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_mining_featured',    true),
  ('mining',             'Premium',   69900, '{"listing_duration_days": 90, "photos": 30, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_mining_premium', true),
  ('farmland',           'Standard',  9900,  '{"listing_duration_days": 30, "photos": 10, "featured_search": false, "highlighted": false, "social_boost": false}', 'price_farmland_standard',  true),
  ('farmland',           'Featured',  24900, '{"listing_duration_days": 60, "photos": 20, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_farmland_featured',  true),
  ('farmland',           'Premium',   49900, '{"listing_duration_days": 90, "photos": 40, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_farmland_premium', true),
  ('commercial_property','Standard',  19900, '{"listing_duration_days": 30, "photos": 10, "featured_search": false, "highlighted": false, "social_boost": false}', 'price_commprop_standard',  true),
  ('commercial_property','Featured',  44900, '{"listing_duration_days": 60, "photos": 20, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_commprop_featured',  true),
  ('commercial_property','Premium',   89900, '{"listing_duration_days": 90, "photos": 40, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_commprop_premium', true),
  ('franchise',          'Standard',  9900,  '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_franchise_standard', true),
  ('franchise',          'Featured',  24900, '{"listing_duration_days": 60, "photos": 15, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_franchise_featured', true),
  ('franchise',          'Premium',   49900, '{"listing_duration_days": 90, "photos": 30, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_franchise_premium', true),
  ('energy',             'Standard',  19900, '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_energy_standard',    true),
  ('energy',             'Featured',  49900, '{"listing_duration_days": 60, "photos": 15, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_energy_featured',    true),
  ('energy',             'Premium',   99900, '{"listing_duration_days": 90, "photos": 30, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_energy_premium', true),
  ('fund',               'Standard',  24900, '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_fund_standard',      true),
  ('fund',               'Featured',  59900, '{"listing_duration_days": 60, "photos": 10, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_fund_featured',      true),
  ('fund',               'Premium',   119900,'{"listing_duration_days": 90, "photos": 20, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_fund_premium', true),
  ('startup',            'Standard',  9900,  '{"listing_duration_days": 30, "photos": 5,  "featured_search": false, "highlighted": false, "social_boost": false}', 'price_startup_standard',   true),
  ('startup',            'Featured',  24900, '{"listing_duration_days": 60, "photos": 15, "featured_search": true,  "highlighted": true,  "social_boost": false}', 'price_startup_featured',   true),
  ('startup',            'Premium',   49900, '{"listing_duration_days": 90, "photos": 30, "featured_search": true,  "highlighted": true,  "social_boost": true,  "account_manager": true}', 'price_startup_premium', true);

-- ============================================================
-- SEED DATA: investment_listings — BUSINESS vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'business',
  'Established Sydney Café & Roastery — 8 Years Trading',
  'sydney-cafe-roastery-8yr',
  'Highly regarded specialty coffee café and roastery in the heart of Surry Hills. Loyal customer base, strong wholesale accounts with 14 local venues, and a growing online subscription service. Fully staffed with an experienced team in place. Owner relocating overseas.',
  'NSW', 'Sydney',
  149500000, '$1.495M',
  320000000, 68000000,
  'Hospitality', 'Café / Coffee Roastery',
  '{"annual_ebitda": "$680,000", "staff_count": 12, "years_established": 8, "reason_for_sale": "Owner relocating overseas", "business_type": "independent"}',
  'premium', false, false,
  'listings@invest.com.au', '02 9000 0001',
  'active', NOW() + INTERVAL '90 days', 412, 18
),
(
  'business',
  'Profitable Digital Marketing Agency — Melbourne CBD',
  'melbourne-digital-agency',
  'Full-service digital marketing agency with 45 retainer clients across e-commerce, professional services and healthcare. Strong recurring revenue, no client concentration risk (largest client <8% of revenue). Fully remote-capable team of 9.',
  'VIC', 'Melbourne',
  185000000, '$1.85M',
  280000000, 82000000,
  'Professional Services', 'Digital Marketing',
  '{"annual_ebitda": "$820,000", "staff_count": 9, "years_established": 6, "reason_for_sale": "Founder pursuing new venture", "business_type": "independent"}',
  'featured', false, false,
  'listings@invest.com.au', '03 9000 0001',
  'active', NOW() + INTERVAL '60 days', 289, 11
),
(
  'business',
  'Industrial Cleaning Services — Brisbane & SE Qld',
  'brisbane-industrial-cleaning',
  'B2B industrial and commercial cleaning contractor servicing mining, construction, and government clients across South-East Queensland. Long-term government contracts in place. Owner-operated for 12 years, now retiring.',
  'QLD', 'Brisbane',
  89000000, '$890K',
  195000000, 41000000,
  'Services', 'Commercial Cleaning',
  '{"annual_ebitda": "$410,000", "staff_count": 22, "years_established": 12, "reason_for_sale": "Retirement", "business_type": "independent"}',
  'standard', false, false,
  'listings@invest.com.au', '07 3000 0001',
  'active', NOW() + INTERVAL '30 days', 156, 7
),
(
  'business',
  'Perth Engineering Consultancy — Specialising in Mining Infrastructure',
  'perth-engineering-consultancy-mining',
  'Boutique structural and civil engineering consultancy with a 15-year track record serving Tier 1 and Tier 2 mining operators in WA. Strong pipeline of contracted work, low capital requirements. Principal ready to transition over 12 months.',
  'WA', 'Perth',
  320000000, '$3.2M',
  510000000, 142000000,
  'Professional Services', 'Engineering Consulting',
  '{"annual_ebitda": "$1,420,000", "staff_count": 14, "years_established": 15, "reason_for_sale": "Principal seeking semi-retirement", "business_type": "independent"}',
  'premium', false, false,
  'listings@invest.com.au', '08 9000 0001',
  'active', NOW() + INTERVAL '90 days', 534, 22
),
(
  'business',
  'Online Pet Supplies Retailer — $4.2M Revenue',
  'online-pet-supplies-retailer',
  'Pure-play e-commerce pet supplies retailer with proprietary brand, 38,000 active customers, and strong repeat purchase rate of 64%. Fully automated warehouse in Adelaide with 3PL overflow. Ready for national TV/digital scale-up.',
  'SA', 'Adelaide',
  245000000, '$2.45M',
  420000000, 78000000,
  'Retail', 'E-Commerce / Pet Supplies',
  '{"annual_ebitda": "$780,000", "staff_count": 7, "years_established": 5, "reason_for_sale": "Seeking equity partner or full exit", "business_type": "online"}',
  'featured', false, false,
  'listings@invest.com.au', '08 8000 0001',
  'active', NOW() + INTERVAL '60 days', 298, 13
),
(
  'business',
  'Aged Care Staffing Agency — NSW & ACT',
  'aged-care-staffing-agency-nsw',
  'NDIS and aged care staffing agency placing qualified nurses, carers and allied health professionals across NSW and ACT. 210 active placement staff, long-standing relationships with 34 healthcare facilities. Strong organic growth of 28% YoY.',
  'NSW', 'Sydney',
  420000000, '$4.2M',
  680000000, 118000000,
  'Healthcare', 'Labour Hire / Staffing',
  '{"annual_ebitda": "$1,180,000", "staff_count": 8, "years_established": 9, "reason_for_sale": "Private equity interest, owner seeking liquidity", "business_type": "independent"}',
  'premium', false, false,
  'listings@invest.com.au', '02 9000 0002',
  'active', NOW() + INTERVAL '90 days', 601, 27
),
(
  'business',
  'Childcare Centre — Inner North Melbourne (BER Rating: 4 Stars)',
  'melbourne-childcare-centre-inner-north',
  '65-place licensed childcare centre in Brunswick, currently at 92% occupancy. Long-term director in place. Property leased on favourable terms (10+10). CCS compliant. Suits operator or investor seeking stable cash flows.',
  'VIC', 'Melbourne',
  128000000, '$1.28M',
  148000000, 52000000,
  'Education & Childcare', 'Early Childhood Education',
  '{"annual_ebitda": "$520,000", "staff_count": 18, "years_established": 7, "reason_for_sale": "Family health reasons", "business_type": "independent"}',
  'standard', false, false,
  'listings@invest.com.au', '03 9000 0002',
  'active', NOW() + INTERVAL '30 days', 187, 9
),
(
  'business',
  'Hydraulic Services Business — Gold Coast',
  'gold-coast-hydraulic-services',
  'Hydraulic hose and fitting repair/supply business serving marine, mining, agricultural and construction sectors on the Gold Coast and Northern NSW. Mobile service fleet of 6 vans. 18-year established brand.',
  'QLD', 'Gold Coast',
  54500000, '$545K',
  92000000, 24000000,
  'Trade Services', 'Hydraulics & Fluid Power',
  '{"annual_ebitda": "$240,000", "staff_count": 8, "years_established": 18, "reason_for_sale": "Retirement", "business_type": "independent"}',
  'standard', false, false,
  'listings@invest.com.au', '07 5000 0001',
  'active', NOW() + INTERVAL '30 days', 94, 4
),
(
  'business',
  'Boutique Accounting Practice — Adelaide CBD',
  'adelaide-boutique-accounting-practice',
  'CPA-registered public accounting practice with 340 SME and HNWI clients. Recurring annual fees of $1.1M with average client tenure of 11 years. Principal retiring, strong succession opportunity for a mid-tier firm or ambitious principal.',
  'SA', 'Adelaide',
  165000000, '$1.65M',
  110000000, 62000000,
  'Professional Services', 'Accounting & Tax',
  '{"annual_ebitda": "$620,000", "staff_count": 6, "years_established": 22, "reason_for_sale": "Principal retirement", "business_type": "independent"}',
  'featured', false, false,
  'listings@invest.com.au', '08 8000 0002',
  'active', NOW() + INTERVAL '60 days', 223, 14
),
(
  'business',
  'Freight & Logistics Business — Western Sydney',
  'western-sydney-freight-logistics',
  'Last-mile delivery and warehousing operation covering Greater Sydney and the Blue Mountains. Fleet of 14 owned vehicles, 2,200 sqm leased warehouse, 62 active B2B contracts. Strong growth in e-commerce fulfilment segment.',
  'NSW', 'Penrith',
  215000000, '$2.15M',
  390000000, 74000000,
  'Transport & Logistics', 'Freight & Warehousing',
  '{"annual_ebitda": "$740,000", "staff_count": 28, "years_established": 11, "reason_for_sale": "Owner seeking to retire at 60", "business_type": "independent"}',
  'standard', false, false,
  'listings@invest.com.au', '02 9000 0003',
  'active', NOW() + INTERVAL '30 days', 172, 8
);

-- ============================================================
-- SEED DATA: investment_listings — MINING vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'mining',
  'Kalgoorlie Gold Project — 2.1 Moz Inferred Resource',
  'kalgoorlie-gold-project-2moz',
  'Exploration-stage gold project located 45km north of Kalgoorlie in the Eastern Goldfields of WA. Recent RC drilling returned assays up to 14.2g/t Au over 6m. Maiden JORC resource of 2.1 Moz at 1.4 g/t Au. All permits in place. Seeking project acquisition or JV partner.',
  'WA', 'Kalgoorlie',
  1200000000, '$12M',
  NULL, NULL,
  'Mining & Resources', 'Gold Exploration',
  '{"commodity": "gold", "stage": "explorer", "asx_ticker": "KGX", "tenement_area_ha": 18400, "estimated_resource": "2.1 Moz Au at 1.4 g/t (Inferred, JORC 2012)"}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0010',
  'active', NOW() + INTERVAL '90 days', 891, 34
),
(
  'mining',
  'Pilbara Lithium Pegmatite Project — Drill-Ready',
  'pilbara-lithium-pegmatite-project',
  'Prospective hard-rock lithium project in the Pilbara, WA, adjoining a major producer. 4 granted exploration licences covering 380 km². Historical rock chip samples up to 4.2% Li₂O. No JORC resource yet — significant blue-sky exploration upside.',
  'WA', 'Port Hedland',
  450000000, '$4.5M',
  NULL, NULL,
  'Mining & Resources', 'Lithium Exploration',
  '{"commodity": "lithium", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 38000, "estimated_resource": "No JORC resource — exploration target 5-20 Mt at 1.0-1.5% Li₂O"}',
  'featured', true, false,
  'listings@invest.com.au', '08 9000 0011',
  'active', NOW() + INTERVAL '60 days', 512, 21
),
(
  'mining',
  'Queensland Copper-Gold Project — PFS Stage',
  'queensland-copper-gold-pfs',
  'Advanced copper-gold development project in North Queensland with a completed Pre-Feasibility Study. Indicated and Inferred resource of 180 Mt at 0.6% Cu and 0.22 g/t Au. EIS underway. Seeking strategic partner or acquisition.',
  'QLD', 'Mount Isa',
  3500000000, '$35M',
  NULL, NULL,
  'Mining & Resources', 'Copper-Gold Development',
  '{"commodity": "copper", "stage": "developer", "asx_ticker": "CQG", "tenement_area_ha": 9200, "estimated_resource": "180 Mt at 0.6% Cu, 0.22 g/t Au (Indicated + Inferred)"}',
  'premium', true, false,
  'listings@invest.com.au', '07 4000 0001',
  'active', NOW() + INTERVAL '90 days', 748, 29
),
(
  'mining',
  'NSW Rare Earths Project — REE Anomaly Confirmed',
  'nsw-rare-earths-project',
  'Early-stage rare earths project in New England, NSW. Soil sampling and ground EM surveys confirm a 14km² REE anomaly enriched in NdPr. Historical ionic adsorption results. Fully permitted for next-stage drilling. Project sale or JV welcomed.',
  'NSW', 'Armidale',
  180000000, '$1.8M',
  NULL, NULL,
  'Mining & Resources', 'Rare Earths Exploration',
  '{"commodity": "rare earths", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 5600, "estimated_resource": "No JORC resource — 14km² NdPr anomaly confirmed by geochemistry"}',
  'standard', true, false,
  'listings@invest.com.au', '02 6000 0001',
  'active', NOW() + INTERVAL '30 days', 198, 9
),
(
  'mining',
  'Iron Ore Royalty Stream — Pilbara Producer',
  'pilbara-iron-ore-royalty-stream',
  'Gross royalty stream over a producing iron ore operation in the Pilbara, WA. Royalty rate of 1.5% of gross revenue. Annual royalty income ~$2.1M at current spot prices. Operator has 18 years mine life remaining. Royalty is perpetual and transferable.',
  'WA', 'Perth',
  2200000000, '$22M',
  210000000, 210000000,
  'Mining & Resources', 'Royalty / Streaming',
  '{"commodity": "iron ore", "stage": "producer", "asx_ticker": "FMG", "tenement_area_ha": 0, "estimated_resource": "Royalty only — 18 year mine life remaining"}',
  'premium', true, false,
  'listings@invest.com.au', '08 9000 0012',
  'active', NOW() + INTERVAL '90 days', 1102, 41
),
(
  'mining',
  'South Australia Uranium Project — ISR Potential',
  'south-australia-uranium-isr-project',
  'In-situ recovery (ISR) uranium project in central South Australia. Exploration target of 10-25 Mlb U₃O₈ based on historical data. Proximity to Olympic Dam hub. Fully permitted for resource drilling.',
  'SA', 'Roxby Downs',
  280000000, '$2.8M',
  NULL, NULL,
  'Mining & Resources', 'Uranium Exploration',
  '{"commodity": "uranium", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 12000, "estimated_resource": "Exploration target 10-25 Mlb U₃O₈ (not JORC compliant)"}',
  'standard', true, false,
  'listings@invest.com.au', '08 8000 0010',
  'active', NOW() + INTERVAL '30 days', 234, 11
),
(
  'mining',
  'Victorian Gold Mine — High-Grade Underground Restart',
  'victoria-gold-mine-underground-restart',
  'Permitted underground gold mine in Central Victoria with historical production of 320,000 oz. Dewatered and accessible. Updated resource estimate of 640,000 oz at 4.8 g/t Au (Indicated). Mining lease current. Capital raise or outright sale considered.',
  'VIC', 'Ballarat',
  580000000, '$5.8M',
  NULL, NULL,
  'Mining & Resources', 'Gold Development',
  '{"commodity": "gold", "stage": "developer", "asx_ticker": "VGM", "tenement_area_ha": 2100, "estimated_resource": "640,000 oz at 4.8 g/t Au (Indicated, JORC 2012)"}',
  'featured', true, false,
  'listings@invest.com.au', '03 5000 0001',
  'active', NOW() + INTERVAL '60 days', 463, 18
),
(
  'mining',
  'WA Nickel Sulphide Project — Battery Metals Focus',
  'wa-nickel-sulphide-battery-metals',
  'Nickel sulphide exploration project in the Yilgarn Craton, WA. Coincident EM and magnetic anomalies across 3 targets. First-pass RC drilling completed; best intersection 12m at 1.2% Ni. Seeking JV partner with exploration funding.',
  'WA', 'Kalgoorlie',
  95000000, '$950K',
  NULL, NULL,
  'Mining & Resources', 'Nickel Exploration',
  '{"commodity": "nickel", "stage": "explorer", "asx_ticker": null, "tenement_area_ha": 8800, "estimated_resource": "No JORC resource — 3 EM targets drill-tested, best 12m @ 1.2% Ni"}',
  'standard', true, false,
  'listings@invest.com.au', '08 9000 0013',
  'active', NOW() + INTERVAL '30 days', 147, 6
),
(
  'mining',
  'North QLD Phosphate Project — Fertiliser Sector',
  'north-qld-phosphate-project',
  'Phosphate rock project near Cloncurry, QLD with a JORC resource of 28 Mt at 12% P₂O₅. Scoping study completed showing attractive economics at current DAP prices. Environmental baseline studies underway. Infrastructure access via Townsville Port.',
  'QLD', 'Cloncurry',
  420000000, '$4.2M',
  NULL, NULL,
  'Mining & Resources', 'Phosphate Development',
  '{"commodity": "phosphate", "stage": "developer", "asx_ticker": "PQR", "tenement_area_ha": 6700, "estimated_resource": "28 Mt at 12% P₂O₅ (Indicated + Inferred, JORC 2012)"}',
  'featured', true, false,
  'listings@invest.com.au', '07 4000 0002',
  'active', NOW() + INTERVAL '60 days', 312, 14
),
(
  'mining',
  'Broken Hill Silver-Lead-Zinc Project — Advanced Exploration',
  'broken-hill-silver-lead-zinc-project',
  'Advanced silver-lead-zinc project near Broken Hill, NSW. Total JORC resource of 8.4 Mt at 245 g/t Ag, 4.1% Pb and 6.8% Zn. Metallurgical testwork confirms 90%+ recoveries via conventional flotation. Suitable for toll treatment at nearby facilities.',
  'NSW', 'Broken Hill',
  750000000, '$7.5M',
  NULL, NULL,
  'Mining & Resources', 'Silver-Lead-Zinc Development',
  '{"commodity": "silver", "stage": "developer", "asx_ticker": "BHS", "tenement_area_ha": 3400, "estimated_resource": "8.4 Mt at 245 g/t Ag, 4.1% Pb, 6.8% Zn (Indicated + Inferred)"}',
  'premium', true, false,
  'listings@invest.com.au', '02 8000 0010',
  'active', NOW() + INTERVAL '90 days', 529, 23
);

-- ============================================================
-- SEED DATA: investment_listings — FARMLAND vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'farmland',
  'Riverina Irrigated Cropping Farm — 1,840 ha',
  'riverina-irrigated-cropping-1840ha',
  'Highly productive irrigated cropping property in the Murrumbidgee Irrigation Area, NSW. 1,840 ha in total, 1,420 ha arable. Water entitlements of 4,800 ML (general security). Laser-levelled paddocks, modern shedding, grain storage 12,000 t. Suitable for rice, wheat, canola and summer crops.',
  'NSW', 'Griffith',
  1850000000, '$18.5M',
  620000000, 210000000,
  'Agriculture', 'Irrigated Cropping',
  '{"hectares": 1840, "water_entitlements": "4,800 ML general security, Murrumbidgee system", "carrying_capacity": "N/A — cropping only", "improvements": "Homestead, 3 worker cottages, 12,000t grain storage, laser levelling complete", "rainfall_mm": 410}',
  'premium', true, false,
  'listings@invest.com.au', '02 6960 0001',
  'active', NOW() + INTERVAL '90 days', 742, 28
),
(
  'farmland',
  'Darling Downs Dryland Cropping — 3,200 ha',
  'darling-downs-dryland-cropping-3200ha',
  'Large-scale dryland cropping property on the Darling Downs, QLD. Deep black cracking soils, highly regarded for winter and summer cropping. All fenced, good road access. Additional 800 ha of remnant grazing country.',
  'QLD', 'Dalby',
  2400000000, '$24M',
  480000000, 165000000,
  'Agriculture', 'Dryland Cropping',
  '{"hectares": 3200, "water_entitlements": "Nil surface water — 2 licensed bores", "carrying_capacity": "800 ha grazing supports 180 head", "improvements": "Homestead, machinery sheds, grain silos 8,000t", "rainfall_mm": 620}',
  'premium', true, false,
  'listings@invest.com.au', '07 4600 0001',
  'active', NOW() + INTERVAL '90 days', 588, 22
),
(
  'farmland',
  'Coonawarra Vineyard Estate — 280 ha Wine Region',
  'coonawarra-vineyard-estate-280ha',
  'Iconic wine region property at the heart of the Coonawarra GI, SA. 280 ha total, 110 ha under vine (Cabernet Sauvignon, Shiraz, Merlot). Long-term grape supply agreement with a premium winery. Cellar door, 4-bedroom residence, guest cottage.',
  'SA', 'Penola',
  580000000, '$5.8M',
  185000000, 72000000,
  'Agriculture', 'Viticulture',
  '{"hectares": 280, "water_entitlements": "180 ML allocation, South Australian allocation", "carrying_capacity": "N/A — viticulture", "improvements": "Cellar door, 4-bed homestead, guest cottage, machinery shed", "rainfall_mm": 580}',
  'featured', true, false,
  'listings@invest.com.au', '08 8700 0001',
  'active', NOW() + INTERVAL '60 days', 344, 15
),
(
  'farmland',
  'Kimberley Pastoral Station — 245,000 ha Beef',
  'kimberley-pastoral-station-beef',
  'Iconic Kimberley pastoral lease covering 245,000 ha of mixed tropical savanna country. Stocked at 12,000 AE Brahman-cross cattle. All-weather airstrip, substantial station infrastructure, 4WD access year-round. Significant upside via live export and backgrounder market.',
  'WA', 'Kununurra',
  4800000000, '$48M',
  920000000, 310000000,
  'Agriculture', 'Pastoral / Beef Cattle',
  '{"hectares": 245000, "water_entitlements": "10 registered bores, 3 dams", "carrying_capacity": "12,000 AE Brahman-cross — approx 1:20 ha", "improvements": "Homestead, staff quarters x8, yards, airstrip, workshop", "rainfall_mm": 820}',
  'premium', true, false,
  'listings@invest.com.au', '08 9168 0001',
  'active', NOW() + INTERVAL '90 days', 1245, 47
),
(
  'farmland',
  'Gippsland Dairy Farm — 480 ha, 900 Cow Platform',
  'gippsland-dairy-farm-480ha',
  'High-rainfall dairy operation in the Macalister Irrigation District, VIC. 480 ha milking platform, 180 ha support country. 900-cow herd included in sale. Rotary dairy 54-bail, Pasture management system, quota entitlements.',
  'VIC', 'Sale',
  620000000, '$6.2M',
  310000000, 88000000,
  'Agriculture', 'Dairy Farming',
  '{"hectares": 480, "water_entitlements": "1,200 ML high-reliability allocation, Macalister system", "carrying_capacity": "900 milking cows — 1.87 cows/ha", "improvements": "Rotary dairy 54-bail, 3 residences, shedding, feed pad", "rainfall_mm": 760}',
  'featured', true, false,
  'listings@invest.com.au', '03 5140 0001',
  'active', NOW() + INTERVAL '60 days', 421, 17
),
(
  'farmland',
  'Wheatbelt Mixed Farm — 4,500 ha Grains & Sheep',
  'wheatbelt-mixed-farm-4500ha',
  'Well-established mixed farming operation in the WA Wheatbelt. 4,500 ha total, 3,800 ha arable running a wheat-barley-canola rotation plus a Merino sheep enterprise of 3,500 head. Good machinery complement included.',
  'WA', 'Merredin',
  980000000, '$9.8M',
  295000000, 96000000,
  'Agriculture', 'Mixed Farming (Grain & Sheep)',
  '{"hectares": 4500, "water_entitlements": "2 licensed bores, 4 large dams", "carrying_capacity": "3,500 Merino ewes", "improvements": "Homestead, 2 worker cottages, grain storage 15,000t, shearing shed", "rainfall_mm": 320}',
  'standard', true, false,
  'listings@invest.com.au', '08 9041 0001',
  'active', NOW() + INTERVAL '30 days', 267, 11
),
(
  'farmland',
  'Northern NSW Beef & Cropping Property — 6,200 ha',
  'northern-nsw-beef-cropping-6200ha',
  'Highly versatile grazing and cropping property west of Moree, NSW. 6,200 ha with 2,200 ha of cultivation country (black basalt soil). Running 1,400 breeders (Angus x Hereford) plus summer cropping on the cultivation blocks.',
  'NSW', 'Moree',
  1480000000, '$14.8M',
  410000000, 142000000,
  'Agriculture', 'Beef & Cropping',
  '{"hectares": 6200, "water_entitlements": "Artesian bore, 6 farm dams", "carrying_capacity": "1,400 breeders plus followers — mixed Angus x Hereford", "improvements": "4-bed homestead, 2 jackaroo quarters, cattle yards, machinery sheds", "rainfall_mm": 520}',
  'featured', true, false,
  'listings@invest.com.au', '02 6750 0001',
  'active', NOW() + INTERVAL '60 days', 388, 16
),
(
  'farmland',
  'Atherton Tablelands Banana & Tropical Fruit Farm',
  'atherton-tablelands-banana-fruit-farm',
  'Productive tropical fruit farm on the Atherton Tablelands, QLD. 95 ha total, 62 ha under production (Cavendish bananas, avocados, macadamias). Excellent water supply, packing shed, cool storage.',
  'QLD', 'Mareeba',
  185000000, '$1.85M',
  148000000, 54000000,
  'Agriculture', 'Horticulture / Tropical Fruit',
  '{"hectares": 95, "water_entitlements": "185 ML irrigation licence, Lake Tinaroo scheme", "carrying_capacity": "N/A — horticulture", "improvements": "Packing shed, cool storage 120t, homestead, irrigation infrastructure", "rainfall_mm": 1420}',
  'standard', false, false,
  'listings@invest.com.au', '07 4092 0001',
  'active', NOW() + INTERVAL '30 days', 198, 8
),
(
  'farmland',
  'Barossa Valley Premium Wine Estate — 160 ha',
  'barossa-valley-premium-wine-estate',
  'Premium boutique wine estate in the heart of the Barossa Valley, SA. 160 ha total; 88 ha of old-vine Shiraz and Grenache (vines up to 120 years). Award-winning cellar door, function/events venue, and 5-star luxury accommodation (12 rooms).',
  'SA', 'Nuriootpa',
  1250000000, '$12.5M',
  420000000, 158000000,
  'Agriculture', 'Premium Viticulture & Tourism',
  '{"hectares": 160, "water_entitlements": "280 ML allocation, Barossa Prescribed Area", "carrying_capacity": "N/A — viticulture", "improvements": "Award-winning cellar door, 12-room luxury accommodation, events venue, homestead", "rainfall_mm": 510}',
  'premium', true, false,
  'listings@invest.com.au', '08 8563 0001',
  'active', NOW() + INTERVAL '90 days', 689, 31
),
(
  'farmland',
  'Hunter Valley Equine & Cropping Property — 340 ha',
  'hunter-valley-equine-cropping-340ha',
  '340 ha lifestyle and agricultural property in the Upper Hunter Valley, NSW. Horse agistment and breeding operation (20 boxes, arena, round yards) plus 140 ha of crop country. Two residences. Strong income from agistment and spelling of racehorses.',
  'NSW', 'Muswellbrook',
  395000000, '$3.95M',
  98000000, 36000000,
  'Agriculture', 'Equine & Mixed Farming',
  '{"hectares": 340, "water_entitlements": "Creek frontage, 4 farm dams, bore", "carrying_capacity": "20 stables, agistment for 60 horses", "improvements": "20-box stable complex, arena, round yard, 2 residences, machinery shed", "rainfall_mm": 680}',
  'standard', false, false,
  'listings@invest.com.au', '02 6540 0001',
  'active', NOW() + INTERVAL '30 days', 214, 9
);

-- ============================================================
-- SEED DATA: investment_listings — COMMERCIAL_PROPERTY vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'commercial_property',
  'Sydney CBD Office Tower — Level 18 Strata Suite',
  'sydney-cbd-office-strata-level18',
  'A-grade strata office suite on level 18 of a prestigious CBD tower on George Street. 412 sqm NLA, fully fitted, currently occupied by a financial services firm on a 3+3 lease. Strong covenant, net passing income $342,000 pa. FIRB approval required for foreign buyers.',
  'NSW', 'Sydney',
  520000000, '$5.2M',
  34200000, 34200000,
  'Commercial Real Estate', 'Office — Strata',
  '{"yield_percent": 6.6, "sqm": 412, "tenancy": "single tenant", "lease_term": "3+3 years — commenced Jan 2025", "wale_years": 4.8}',
  'premium', true, false,
  'listings@invest.com.au', '02 9000 0020',
  'active', NOW() + INTERVAL '90 days', 678, 24
),
(
  'commercial_property',
  'Melbourne Industrial Estate — 4 Units, Dandenong South',
  'melbourne-industrial-estate-dandenong',
  'Modern industrial estate comprising 4 separate strata units totalling 3,200 sqm NLA in Dandenong South. All units fully leased to logistics and light manufacturing tenants. Strong rental income with fixed 3% annual increases.',
  'VIC', 'Melbourne',
  840000000, '$8.4M',
  57600000, 57600000,
  'Commercial Real Estate', 'Industrial — Multi-Unit Estate',
  '{"yield_percent": 6.9, "sqm": 3200, "tenancy": "multi tenant", "lease_term": "Mix: 2, 3, 5-year leases with options", "wale_years": 3.6}',
  'featured', true, false,
  'listings@invest.com.au', '03 9000 0020',
  'active', NOW() + INTERVAL '60 days', 445, 19
),
(
  'commercial_property',
  'Brisbane Neighbourhood Retail Centre — Anchored by IGA',
  'brisbane-neighbourhood-retail-centre-iga',
  'Fully leased 2,400 sqm neighbourhood shopping centre in Nundah, Brisbane. IGA anchored (12-year lease, 7 years remaining), 8 specialty tenants. Land area 4,800 sqm with carparking for 62 vehicles. Attractive yield for set-and-forget investors.',
  'QLD', 'Brisbane',
  1150000000, '$11.5M',
  78200000, 78200000,
  'Commercial Real Estate', 'Retail — Neighbourhood Centre',
  '{"yield_percent": 6.8, "sqm": 2400, "tenancy": "multi tenant", "lease_term": "Anchor: 7 years remaining (12-year lease)", "wale_years": 5.2}',
  'premium', true, false,
  'listings@invest.com.au', '07 3000 0020',
  'active', NOW() + INTERVAL '90 days', 532, 21
),
(
  'commercial_property',
  'Perth Childcare Freehold — Net Lease to National Operator',
  'perth-childcare-freehold-net-lease',
  'Purpose-built 80-place childcare centre in Baldivis, Perth, net leased to a national childcare operator. Brand new 15-year lease with 3% fixed annual rent reviews. Constructed 2023. Passive investment with no landlord outgoings.',
  'WA', 'Perth',
  320000000, '$3.2M',
  20800000, 20800000,
  'Commercial Real Estate', 'Childcare — Freehold Net Lease',
  '{"yield_percent": 6.5, "sqm": 820, "tenancy": "single tenant", "lease_term": "15 years from Nov 2023, 3 x 5yr options", "wale_years": 12.6}',
  'featured', false, false,
  'listings@invest.com.au', '08 9000 0020',
  'active', NOW() + INTERVAL '60 days', 389, 16
),
(
  'commercial_property',
  'Adelaide Service Station — BP Branded, Corner Site',
  'adelaide-service-station-bp-branded',
  'Prime corner service station on a high-traffic arterial road in Modbury, Adelaide. BP branded, 20-year lease (16 years remaining) with CPI rent reviews. 1,850 sqm land. Convenience store and car wash. Passive income with strong covenant.',
  'SA', 'Adelaide',
  285000000, '$2.85M',
  18525000, 18525000,
  'Commercial Real Estate', 'Service Station — Freehold Net Lease',
  '{"yield_percent": 6.5, "sqm": 1850, "tenancy": "single tenant", "lease_term": "20 years (16 remaining), CPI reviews", "wale_years": 16.0}',
  'standard', false, false,
  'listings@invest.com.au', '08 8000 0020',
  'active', NOW() + INTERVAL '30 days', 247, 10
),
(
  'commercial_property',
  'Sydney Fringe Office Building — Surry Hills, Value-Add',
  'sydney-surry-hills-office-value-add',
  'Two-level office building of 980 sqm NLA in Surry Hills, currently 60% occupied. Strong value-add opportunity through lease-up of vacant space or potential conversion to residential (STCA). 8 car spaces. Walking distance to Central Station.',
  'NSW', 'Sydney',
  425000000, '$4.25M',
  16800000, 16800000,
  'Commercial Real Estate', 'Office — Freehold, Value-Add',
  '{"yield_percent": 3.9, "sqm": 980, "tenancy": "multi tenant", "lease_term": "Partial: 2-year leases, 40% vacant", "wale_years": 1.2}',
  'standard', true, false,
  'listings@invest.com.au', '02 9000 0021',
  'active', NOW() + INTERVAL '30 days', 312, 14
),
(
  'commercial_property',
  'Gold Coast Beachfront Retail Strip — 6 Shops',
  'gold-coast-beachfront-retail-strip',
  'Prime beachfront retail strip of 6 shops totalling 640 sqm NLA on the Esplanade, Surfers Paradise. All tenants in place (café, ice cream, surf hire, massage x2, tours). High foot traffic summer and winter. Significant uplift potential on lease renewal.',
  'QLD', 'Gold Coast',
  680000000, '$6.8M',
  40800000, 40800000,
  'Commercial Real Estate', 'Retail — Strip/High Street',
  '{"yield_percent": 6.0, "sqm": 640, "tenancy": "multi tenant", "lease_term": "Mix of 1 and 3-year leases", "wale_years": 1.8}',
  'featured', true, false,
  'listings@invest.com.au', '07 5000 0020',
  'active', NOW() + INTERVAL '60 days', 421, 18
),
(
  'commercial_property',
  'Melbourne Warehouse — Prime Truganina Logistics Precinct',
  'melbourne-truganina-logistics-warehouse',
  'Modern 8,500 sqm distribution warehouse in Truganina's emerging logistics precinct. Purpose-built 2021, 12.5m clearance, 4 recessed docks, 2 on-grade. Leased to an ASX-listed 3PL on a 7-year lease with fixed 3.5% annual increases.',
  'VIC', 'Melbourne',
  1850000000, '$18.5M',
  121000000, 121000000,
  'Commercial Real Estate', 'Industrial — Logistics Warehouse',
  '{"yield_percent": 6.5, "sqm": 8500, "tenancy": "single tenant", "lease_term": "7 years from June 2022 + 2 x 5yr options", "wale_years": 3.2}',
  'premium', true, false,
  'listings@invest.com.au', '03 9000 0021',
  'active', NOW() + INTERVAL '90 days', 864, 32
),
(
  'commercial_property',
  'Darwin Fast Food Site — McDonald''s NNN Lease',
  'darwin-mcdonalds-nnn-lease',
  'Fully passive fast food investment leased to McDonald''s Australia on a 20-year NNN lease. Located on a busy arterial road in Palmerston, Darwin. Constructed 2019. Annual rent $385,000, CPI reviews. All outgoings paid by tenant.',
  'NT', 'Darwin',
  480000000, '$4.8M',
  38500000, 38500000,
  'Commercial Real Estate', 'Fast Food — NNN Freehold',
  '{"yield_percent": 8.0, "sqm": 1200, "tenancy": "single tenant", "lease_term": "20 years from 2019, CPI reviews", "wale_years": 13.0}',
  'standard', true, false,
  'listings@invest.com.au', '08 8900 0001',
  'active', NOW() + INTERVAL '30 days', 298, 12
),
(
  'commercial_property',
  'Perth Office Park — 3-Building Campus, Osborne Park',
  'perth-office-park-3-building-osborne-park',
  'Three-building suburban office campus totalling 4,800 sqm NLA in Osborne Park, Perth. Multiple tenants including government and medical occupants. Average lease term 3.2 years WALE. Land of 6,200 sqm with 98 car bays. Scope for residential conversion (STCA).',
  'WA', 'Perth',
  1020000000, '$10.2M',
  68000000, 68000000,
  'Commercial Real Estate', 'Office — Suburban Campus',
  '{"yield_percent": 6.7, "sqm": 4800, "tenancy": "multi tenant", "lease_term": "Mix of 1-5 year leases", "wale_years": 3.2}',
  'featured', true, false,
  'listings@invest.com.au', '08 9000 0021',
  'active', NOW() + INTERVAL '60 days', 376, 15
);

-- ============================================================
-- SEED DATA: investment_listings — FRANCHISE vertical (9 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'franchise',
  'Boost Juice — Carindale Shopping Centre, QLD',
  'boost-juice-carindale-qld',
  'Established Boost Juice franchise in a high-traffic food court at Carindale shopping centre, Brisbane. Trading for 6 years with consistent sales above national benchmarks. Full training and ongoing support from Boost HQ.',
  'QLD', 'Brisbane',
  32000000, '$320K',
  145000000, 32000000,
  'Food & Beverage', 'Juice Bar / Franchise',
  '{"franchise_brand": "Boost Juice", "franchise_fee": "$50,000", "royalty_percent": 7, "territories_available": 1, "total_investment_from": "$280,000", "support_rating": "High"}',
  'standard', false, false,
  'listings@invest.com.au', '07 3000 0030',
  'active', NOW() + INTERVAL '30 days', 213, 9
),
(
  'franchise',
  'Jim''s Group — Master Franchise Territory, VIC Regional',
  'jims-group-master-franchise-vic-regional',
  'Master franchise rights for Jim''s Group services (mowing, cleaning, dog wash) across a large regional VIC territory. Currently 42 active franchisees under the master. Recurring royalty income of ~$380,000 pa. Genuine work-from-home opportunity.',
  'VIC', 'Bendigo',
  72000000, '$720K',
  38000000, 26000000,
  'Home Services', 'Master Franchise',
  '{"franchise_brand": "Jim''s Group", "franchise_fee": "$50,000 (initial)", "royalty_percent": 0, "territories_available": 1, "total_investment_from": "$720,000 (master rights)", "support_rating": "High"}',
  'featured', false, false,
  'listings@invest.com.au', '03 5400 0001',
  'active', NOW() + INTERVAL '60 days', 187, 8
),
(
  'franchise',
  'Poolwerx — Perth Western Suburbs Territory',
  'poolwerx-perth-western-suburbs',
  'Poolwerx pool and spa service franchise covering the affluent western suburbs of Perth. Territory includes 8,200 residential pools. Van-based model, 3 technicians currently employed. Recurring annual service contracts provide predictable income.',
  'WA', 'Perth',
  28500000, '$285K',
  128000000, 38000000,
  'Home Services', 'Pool & Spa Maintenance',
  '{"franchise_brand": "Poolwerx", "franchise_fee": "$65,000", "royalty_percent": 9, "territories_available": 1, "total_investment_from": "$175,000", "support_rating": "High"}',
  'standard', false, false,
  'listings@invest.com.au', '08 9000 0030',
  'active', NOW() + INTERVAL '30 days', 152, 6
),
(
  'franchise',
  'Snap Fitness 24/7 — Sydney Inner West',
  'snap-fitness-sydney-inner-west',
  'Snap Fitness 24/7 gym franchise in the Sydney Inner West. 620 sqm, 1,480 active members. Strong membership growth post-COVID. Excellent fitout condition (2022 refurb). Owner operated or suitable for investor with manager in place.',
  'NSW', 'Sydney',
  41000000, '$410K',
  68000000, 18000000,
  'Health & Fitness', 'Gym / Fitness Centre',
  '{"franchise_brand": "Snap Fitness", "franchise_fee": "$40,000", "royalty_percent": 5, "territories_available": 1, "total_investment_from": "$350,000", "support_rating": "High"}',
  'featured', false, false,
  'listings@invest.com.au', '02 9000 0030',
  'active', NOW() + INTERVAL '60 days', 265, 11
),
(
  'franchise',
  'Muffin Break — Westfield Miranda, NSW',
  'muffin-break-westfield-miranda-nsw',
  'Successful Muffin Break bakery café in Westfield Miranda, one of Australia''s highest-grossing Westfield centres. 18-year established site, consistent $1.4M+ turnover. New 5-year lease just signed. Suit hands-on operator or lifestyle buyer.',
  'NSW', 'Sydney',
  38000000, '$380K',
  140000000, 28000000,
  'Food & Beverage', 'Bakery Café / Franchise',
  '{"franchise_brand": "Muffin Break", "franchise_fee": "$55,000", "royalty_percent": 6, "territories_available": 1, "total_investment_from": "$380,000", "support_rating": "Medium"}',
  'standard', false, false,
  'listings@invest.com.au', '02 9000 0031',
  'active', NOW() + INTERVAL '30 days', 198, 8
),
(
  'franchise',
  'Fastway / Aramex — Courier Franchise, Adelaide Metro',
  'fastway-aramex-courier-adelaide-metro',
  'Established Aramex (formerly Fastway) courier franchise covering 2,800 residential and business stops in northern Adelaide. 2 vans, 1 employee. Turnover $320,000 pa, owner-operator salary of $95,000 plus profit distributions.',
  'SA', 'Adelaide',
  19500000, '$195K',
  32000000, 14000000,
  'Transport & Logistics', 'Courier / Delivery Franchise',
  '{"franchise_brand": "Aramex (Fastway)", "franchise_fee": "$25,000", "royalty_percent": 10, "territories_available": 1, "total_investment_from": "$195,000", "support_rating": "Medium"}',
  'standard', false, false,
  'listings@invest.com.au', '08 8000 0030',
  'active', NOW() + INTERVAL '30 days', 118, 5
),
(
  'franchise',
  'The Cheesecake Shop — Melbourne SE Suburbs (3 sites available)',
  'cheesecake-shop-melbourne-se-suburbs',
  'Three new The Cheesecake Shop franchise territories available in Melbourne''s booming South-East (Berwick, Pakenham, Officer). Greenfield sites with full franchisor support. Ground-floor opportunity in a well-loved Australian brand.',
  'VIC', 'Melbourne',
  17500000, '$175K each',
  55000000, 16000000,
  'Food & Beverage', 'Cake / Dessert Shop',
  '{"franchise_brand": "The Cheesecake Shop", "franchise_fee": "$40,000", "royalty_percent": 8, "territories_available": 3, "total_investment_from": "$175,000", "support_rating": "High"}',
  'featured', false, false,
  'listings@invest.com.au', '03 9000 0030',
  'active', NOW() + INTERVAL '60 days', 174, 7
),
(
  'franchise',
  'Kwik Kopy — Brisbane Business District Franchise',
  'kwik-kopy-brisbane-cbd',
  'Long-established Kwik Kopy print and document services franchise in the Brisbane CBD. 240 corporate clients, repeat orders. Full digital printing suite, design team of 3. Owner retired after 14 years — motivated to sell.',
  'QLD', 'Brisbane',
  42000000, '$420K',
  98000000, 24000000,
  'Business Services', 'Print & Design',
  '{"franchise_brand": "Kwik Kopy", "franchise_fee": "$45,000", "royalty_percent": 9, "territories_available": 1, "total_investment_from": "$420,000", "support_rating": "High"}',
  'standard', false, false,
  'listings@invest.com.au', '07 3000 0031',
  'active', NOW() + INTERVAL '30 days', 143, 6
),
(
  'franchise',
  'Anytime Fitness — Darwin — 2,400 Members',
  'anytime-fitness-darwin-2400-members',
  'One of Darwin''s highest-performing Anytime Fitness clubs. 2,400 active members, 780 sqm fully equipped gym. Prime location near NT Government offices. Semi-passive with manager in place. Suit SMSF-eligible commercial property purchase option also available.',
  'NT', 'Darwin',
  58000000, '$580K',
  92000000, 28000000,
  'Health & Fitness', 'Gym / Fitness Centre',
  '{"franchise_brand": "Anytime Fitness", "franchise_fee": "$42,000", "royalty_percent": 7, "territories_available": 1, "total_investment_from": "$450,000", "support_rating": "High"}',
  'premium', false, false,
  'listings@invest.com.au', '08 8900 0010',
  'active', NOW() + INTERVAL '90 days', 312, 13
);

-- ============================================================
-- SEED DATA: investment_listings — ENERGY vertical (9 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'energy',
  'NSW Solar Farm — 55 MW, Grid-Connected, Operational',
  'nsw-solar-farm-55mw-operational',
  'Operational 55 MW DC solar farm near Dubbo, NSW, connected to the 132kV TransGrid network. 15-year PPA with an A-rated retailer at $68/MWh. Annual generation 95 GWh. Asset constructed 2022, full warranty on inverters and panels.',
  'NSW', 'Dubbo',
  6200000000, '$62M',
  646000000, 380000000,
  'Renewable Energy', 'Utility-Scale Solar',
  '{"capacity_mw": 55, "stage": "operational", "technology": "solar", "irr_percent": 9.2, "offtake": "15-year PPA, A-rated retailer, $68/MWh"}',
  'premium', true, false,
  'listings@invest.com.au', '02 6800 0001',
  'active', NOW() + INTERVAL '90 days', 1012, 38
),
(
  'energy',
  'Queensland Wind Farm Development — 120 MW Approved',
  'queensland-wind-farm-120mw-approved',
  '120 MW wind farm development project near Oakey, QLD, with full Development Approval and grid connection agreement (Powerlink). Wind resource assessment completed (P50 capacity factor: 38%). Seeking construction finance partner or project acquisition.',
  'QLD', 'Toowoomba',
  3800000000, '$38M',
  NULL, NULL,
  'Renewable Energy', 'Wind Farm Development',
  '{"capacity_mw": 120, "stage": "approved", "technology": "wind", "irr_percent": 12.4, "offtake": "Merchant + seeking PPA — grid connection agreement with Powerlink in place"}',
  'premium', true, false,
  'listings@invest.com.au', '07 4600 0010',
  'active', NOW() + INTERVAL '90 days', 843, 31
),
(
  'energy',
  'SA Battery Storage Project — 50 MW / 200 MWh, Planning Stage',
  'sa-battery-storage-50mw-200mwh-planning',
  'Grid-scale BESS development opportunity adjacent to a high-capacity 275kV substation in the Mid-North SA. 50 MW / 200 MWh configuration. EIS lodged, approval expected Q3 2026. Excellent FCAS and arbitrage revenue potential in SA market.',
  'SA', 'Crystal Brook',
  820000000, '$8.2M',
  NULL, NULL,
  'Renewable Energy', 'Battery Storage Development',
  '{"capacity_mw": 50, "stage": "planning", "technology": "battery", "irr_percent": 14.8, "offtake": "Merchant — FCAS and energy arbitrage, AEMO registration pathway"}',
  'featured', true, false,
  'listings@invest.com.au', '08 8600 0001',
  'active', NOW() + INTERVAL '60 days', 567, 22
),
(
  'energy',
  'WA Rooftop Solar Portfolio — 180 Commercial Sites',
  'wa-rooftop-solar-portfolio-180-sites',
  'Aggregated portfolio of 180 commercial rooftop solar installations across WA under long-term PPA agreements (20 years average remaining). Total installed capacity: 12.4 MW. Contracted annual revenue $2.1M. Fully operational, no maintenance liabilities.',
  'WA', 'Perth',
  2100000000, '$21M',
  210000000, 162000000,
  'Renewable Energy', 'Commercial Solar Portfolio',
  '{"capacity_mw": 12.4, "stage": "operational", "technology": "solar", "irr_percent": 8.6, "offtake": "20-year PPA average remaining — 180 commercial tenants"}',
  'featured', true, false,
  'listings@invest.com.au', '08 9200 0001',
  'active', NOW() + INTERVAL '60 days', 612, 24
),
(
  'energy',
  'Green Hydrogen Feasibility Project — Pilbara Export Hub',
  'green-hydrogen-pilbara-export-feasibility',
  'Advanced feasibility study (FEED) for a green hydrogen production and export facility in the Pilbara, WA. Co-located with proposed 400 MW wind/solar hybrid. MOU signed with Japanese offtake partner. Seeking co-development partner for project finance.',
  'WA', 'Port Hedland',
  5500000000, '$55M',
  NULL, NULL,
  'Renewable Energy', 'Green Hydrogen Development',
  '{"capacity_mw": 400, "stage": "planning", "technology": "hydrogen", "irr_percent": 13.5, "offtake": "MOU with Japanese utility — final offtake agreement in negotiation"}',
  'premium', true, false,
  'listings@invest.com.au', '08 9168 0010',
  'active', NOW() + INTERVAL '90 days', 934, 37
),
(
  'energy',
  'VIC Solar Farm — 28 MW, Under Construction, Q4 2026 COD',
  'vic-solar-farm-28mw-construction',
  '28 MW solar farm in the Victorian Wimmera region, currently under construction (72% complete). EPC contract with a Tier 1 contractor (liquidated damages in place). Grid connection and wholesale market registration confirmed. COD targeted Q4 2026.',
  'VIC', 'Horsham',
  1850000000, '$18.5M',
  NULL, NULL,
  'Renewable Energy', 'Utility-Scale Solar',
  '{"capacity_mw": 28, "stage": "construction", "technology": "solar", "irr_percent": 10.8, "offtake": "5-year CfD with Victoria Energy Upgrades + merchant tail"}',
  'featured', true, false,
  'listings@invest.com.au', '03 5380 0001',
  'active', NOW() + INTERVAL '60 days', 489, 20
),
(
  'energy',
  'NSW Biogas to Energy Facility — Landfill Gas, Operational',
  'nsw-biogas-to-energy-landfill-operational',
  '4.2 MW biogas-to-electricity facility operating on landfill gas at a regional NSW council site. 15-year site access agreement (8 years remaining). Sells electricity to council under a fixed-price agreement. Very stable, uncorrelated renewable income stream.',
  'NSW', 'Orange',
  420000000, '$4.2M',
  38000000, 28000000,
  'Renewable Energy', 'Biogas / Landfill Gas',
  '{"capacity_mw": 4.2, "stage": "operational", "technology": "solar", "irr_percent": 9.8, "offtake": "8 years remaining on fixed-price council agreement"}',
  'standard', false, false,
  'listings@invest.com.au', '02 6360 0001',
  'active', NOW() + INTERVAL '30 days', 218, 9
),
(
  'energy',
  'NT Hybrid Off-Grid Solar + Storage — Remote Communities',
  'nt-hybrid-off-grid-solar-storage-remote',
  'Portfolio of 6 off-grid solar-diesel hybrid and storage systems serving remote NT communities under Territory Government service contracts. 8.6 MW combined capacity, 7-year remaining contract with CPI escalation. Exceptional asset for impact investors.',
  'NT', 'Alice Springs',
  920000000, '$9.2M',
  98000000, 68000000,
  'Renewable Energy', 'Off-Grid Hybrid Systems',
  '{"capacity_mw": 8.6, "stage": "operational", "technology": "solar", "irr_percent": 10.2, "offtake": "7-year NT Government service contracts, CPI escalation"}',
  'standard', false, false,
  'listings@invest.com.au', '08 8950 0001',
  'active', NOW() + INTERVAL '30 days', 301, 12
),
(
  'energy',
  'QLD Pumped Hydro Development — 250 MW, Pre-Feasibility',
  'qld-pumped-hydro-250mw-prefeasibility',
  'Pre-feasibility stage pumped hydro energy storage (PHES) development on a private pastoral property in SE Queensland. 250 MW / 2,000 MWh configuration. Site geology confirmed. Proximity to HV transmission line. Seeking development equity partner.',
  'QLD', 'Brisbane',
  1200000000, '$12M',
  NULL, NULL,
  'Renewable Energy', 'Pumped Hydro Development',
  '{"capacity_mw": 250, "stage": "planning", "technology": "battery", "irr_percent": 11.5, "offtake": "Long-duration storage — QLD spot market and capacity market"}',
  'featured', true, false,
  'listings@invest.com.au', '07 3000 0040',
  'active', NOW() + INTERVAL '60 days', 543, 21
);

-- ============================================================
-- SEED DATA: investment_listings — FUND vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'fund',
  'Argyle Australian Agribusiness Fund — Open for SIV',
  'argyle-agribusiness-fund-siv',
  'Managed investment trust investing in Australian farmland, water entitlements, and agribusiness assets. Target portfolio of 12-15 assets across mixed farming, horticulture and pastoral. Fully FIRB-compliant structure. Open to SIV (Significant Investor Visa) complying investments.',
  'VIC', 'Melbourne',
  50000000000, '$500M target',
  NULL, NULL,
  'Managed Funds', 'Agribusiness Fund',
  '{"asset_class": "Australian farmland and agribusiness", "management_fee_percent": 1.25, "min_investment": "$5M", "return_1yr": "12.4%", "return_3yr": "10.8%", "siv_complying": true}',
  'premium', true, true,
  'listings@invest.com.au', '03 9000 0050',
  'active', NOW() + INTERVAL '90 days', 1456, 52
),
(
  'fund',
  'Pacific Infrastructure Debt Fund IV — Senior Secured',
  'pacific-infrastructure-debt-fund-iv',
  'Senior secured infrastructure debt fund targeting 6-8% net returns. Invests in Australian and NZ infrastructure loans (energy, transport, social infrastructure). BBB+ average credit quality. APRA-regulated, AFSL licensed manager.',
  'NSW', 'Sydney',
  30000000000, '$300M target',
  NULL, NULL,
  'Managed Funds', 'Infrastructure Debt Fund',
  '{"asset_class": "Senior secured infrastructure debt", "management_fee_percent": 0.75, "min_investment": "$10M", "return_1yr": "7.2%", "return_3yr": "6.9%", "siv_complying": true}',
  'premium', true, true,
  'listings@invest.com.au', '02 9000 0050',
  'active', NOW() + INTERVAL '90 days', 987, 36
),
(
  'fund',
  'RedLeaf Australian Private Credit Fund — Wholesale',
  'redleaf-private-credit-fund-wholesale',
  'Wholesale private credit fund providing senior secured loans to Australian SMEs and mid-market companies. Diversified portfolio of 80+ loans, average LVR 58%. Target net return 8-10% pa. Monthly liquidity with 30-day notice. APRA-regulated trustee.',
  'NSW', 'Sydney',
  15000000000, '$150M target',
  NULL, NULL,
  'Managed Funds', 'Private Credit Fund',
  '{"asset_class": "Australian private credit (SME / mid-market)", "management_fee_percent": 1.00, "min_investment": "$500K", "return_1yr": "9.1%", "return_3yr": "8.7%", "siv_complying": false}',
  'featured', false, false,
  'listings@invest.com.au', '02 9000 0051',
  'active', NOW() + INTERVAL '60 days', 612, 22
),
(
  'fund',
  'Emerald Industrial REIT — Unlisted, Open to Foreign Capital',
  'emerald-industrial-reit-foreign-capital',
  'Unlisted REIT owning a diversified portfolio of 18 industrial and logistics assets across QLD, VIC, and WA. Weighted average cap rate 6.2%. 97% occupancy. WALE 5.8 years. Monthly distributions. Open to offshore institutional capital via FIRB-compliant structure.',
  'QLD', 'Brisbane',
  40000000000, '$400M AUM',
  NULL, NULL,
  'Managed Funds', 'Industrial REIT — Unlisted',
  '{"asset_class": "Australian industrial & logistics real estate", "management_fee_percent": 0.85, "min_investment": "$2M", "return_1yr": "11.3%", "return_3yr": "13.1%", "siv_complying": true}',
  'premium', true, true,
  'listings@invest.com.au', '07 3000 0050',
  'active', NOW() + INTERVAL '90 days', 1123, 43
),
(
  'fund',
  'Koala Venture Capital Fund III — Early Stage Tech',
  'koala-vc-fund-iii-early-stage-tech',
  'Early-stage venture capital fund investing in Australian and NZ technology startups (SaaS, fintech, health tech). Fund III targeting $120M; $68M committed to date. ESVCLP registered — significant tax advantages for eligible investors. Target 3x DPI over 10 years.',
  'VIC', 'Melbourne',
  12000000000, '$120M target',
  NULL, NULL,
  'Managed Funds', 'Venture Capital Fund',
  '{"asset_class": "Early-stage Australian technology startups", "management_fee_percent": 2.00, "min_investment": "$250K", "return_1yr": "N/A (early stage)", "return_3yr": "N/A (fund < 3 years)", "siv_complying": false}',
  'featured', false, false,
  'listings@invest.com.au', '03 9000 0051',
  'active', NOW() + INTERVAL '60 days', 478, 19
),
(
  'fund',
  'Horizon Healthcare Property Fund — SIV Complying',
  'horizon-healthcare-property-fund-siv',
  'Managed investment scheme owning a diversified portfolio of Australian healthcare real estate — medical centres, specialist suites, and day hospitals. 22 assets, $1.1B AUM. 100% occupied with average WALE of 9.2 years. Complying investment for SIV applicants.',
  'NSW', 'Sydney',
  110000000000, '$1.1B AUM',
  NULL, NULL,
  'Managed Funds', 'Healthcare Property Fund',
  '{"asset_class": "Australian healthcare real estate", "management_fee_percent": 0.95, "min_investment": "$5M", "return_1yr": "9.8%", "return_3yr": "10.2%", "siv_complying": true}',
  'premium', true, true,
  'listings@invest.com.au', '02 9000 0052',
  'active', NOW() + INTERVAL '90 days', 1345, 49
),
(
  'fund',
  'Southern Cross Agricultural Water Fund',
  'southern-cross-agricultural-water-fund',
  'Specialist fund investing in NSW and VIC water entitlements (general and high-security). Leverages water price cyclicality and permanent water scarcity trends. Target return 9-12% pa. Quarterly distributions. Wholesale investors only. AFSL holder as responsible entity.',
  'NSW', 'Sydney',
  8000000000, '$80M target',
  NULL, NULL,
  'Managed Funds', 'Water Entitlements Fund',
  '{"asset_class": "Murray-Darling water entitlements", "management_fee_percent": 1.50, "min_investment": "$500K", "return_1yr": "14.2%", "return_3yr": "11.6%", "siv_complying": false}',
  'standard', true, false,
  'listings@invest.com.au', '02 9000 0053',
  'active', NOW() + INTERVAL '30 days', 312, 12
),
(
  'fund',
  'Goldfields Special Situations Fund — Event-Driven',
  'goldfields-special-situations-fund',
  'Event-driven absolute return fund targeting 15-20% gross returns through activist positions, merger arbitrage, and special situations in ASX-listed companies. Actively managed long/short. Monthly liquidity. Suitable for sophisticated investors only.',
  'WA', 'Perth',
  5000000000, '$50M target',
  NULL, NULL,
  'Managed Funds', 'Absolute Return / Hedge Fund',
  '{"asset_class": "ASX equities — event-driven special situations", "management_fee_percent": 1.50, "min_investment": "$250K", "return_1yr": "22.4%", "return_3yr": "17.1%", "siv_complying": false}',
  'standard', false, false,
  'listings@invest.com.au', '08 9000 0050',
  'active', NOW() + INTERVAL '30 days', 234, 9
),
(
  'fund',
  'Atlas Renewable Energy Infrastructure Fund',
  'atlas-renewable-energy-infrastructure-fund',
  'Infrastructure fund with a portfolio of operational Australian renewable energy assets (solar, wind, battery storage). 420 MW total capacity, long-term PPAs and CfDs in place. Target net IRR 10-12%. Open for co-investment by foreign institutional investors under FIRB exemption.',
  'SA', 'Adelaide',
  60000000000, '$600M AUM',
  NULL, NULL,
  'Managed Funds', 'Renewable Energy Infrastructure Fund',
  '{"asset_class": "Australian renewable energy infrastructure", "management_fee_percent": 1.00, "min_investment": "$10M", "return_1yr": "11.8%", "return_3yr": "10.4%", "siv_complying": true}',
  'premium', true, true,
  'listings@invest.com.au', '08 8000 0050',
  'active', NOW() + INTERVAL '90 days', 892, 33
),
(
  'fund',
  'Bridgepoint Listed Investment Company — Diversified',
  'bridgepoint-lic-diversified',
  'ASX-listed investment company (LIC) investing in a diversified portfolio of Australian equities and alternatives. 15-year track record, consistent dividend yield of 5.2% fully franked. Open for secondary market investment at a 6% discount to NTA.',
  'NSW', 'Sydney',
  75000000000, '$750M NTA',
  NULL, NULL,
  'Managed Funds', 'Listed Investment Company (LIC)',
  '{"asset_class": "Australian equities and alternatives", "management_fee_percent": 0.65, "min_investment": "$10K (ASX listed)", "return_1yr": "13.6%", "return_3yr": "11.2%", "siv_complying": false}',
  'featured', false, false,
  'listings@invest.com.au', '02 9000 0054',
  'active', NOW() + INTERVAL '60 days', 567, 20
);

-- ============================================================
-- SEED DATA: investment_listings — STARTUP vertical (10 listings)
-- ============================================================
INSERT INTO investment_listings (vertical, title, slug, description, location_state, location_city, asking_price_cents, price_display, annual_revenue_cents, annual_profit_cents, industry, sub_category, key_metrics, listing_type, firb_eligible, siv_complying, contact_email, contact_phone, status, expires_at, views, enquiries) VALUES
(
  'startup',
  'Proptech SaaS — AI-Powered Property Inspection Platform',
  'proptech-saas-ai-property-inspection',
  'AI-powered property inspection and reporting SaaS platform with 340 paying customers (real estate agencies and building inspectors). $1.2M ARR, growing 120% YoY. Raising $3M Series A to accelerate national rollout and launch NZ market.',
  'VIC', 'Melbourne',
  300000000, '$3M raise',
  120000000, NULL,
  'Technology', 'PropTech / SaaS',
  '{"sector": "proptech", "stage": "series-a", "amount_raising": "$3M", "pre_money_valuation": "$12M", "esic_eligible": false, "platform": "VentureCrowd"}',
  'premium', false, false,
  'listings@invest.com.au', '03 9000 0060',
  'active', NOW() + INTERVAL '90 days', 689, 26
),
(
  'startup',
  'AgTech Startup — Precision Irrigation IoT Platform',
  'agtech-precision-irrigation-iot',
  'IoT precision irrigation platform with 180 farm deployments across NSW and VIC. Proven 30% water savings and 12% yield improvement. Raising $2M seed round to scale hardware manufacturing and expand to WA and QLD. ESIC eligible.',
  'NSW', 'Wagga Wagga',
  200000000, '$2M raise',
  28000000, NULL,
  'Technology', 'AgTech / IoT',
  '{"sector": "agtech", "stage": "seed", "amount_raising": "$2M", "pre_money_valuation": "$6M", "esic_eligible": true, "platform": "Birchal"}',
  'featured', false, false,
  'listings@invest.com.au', '02 6900 0001',
  'active', NOW() + INTERVAL '60 days', 412, 16
),
(
  'startup',
  'FinTech — BNPL Platform for B2B Trade Finance',
  'fintech-bnpl-b2b-trade-finance',
  'B2B buy-now-pay-later platform addressing the $180B SME trade finance gap in Australia. 420 merchant partners, $8.4M loan book, sub-2% default rate. Raising $5M Series A; AFSL application lodged. Targeting 1,200 merchants by FY27.',
  'NSW', 'Sydney',
  500000000, '$5M raise',
  84000000, NULL,
  'Financial Services', 'FinTech / BNPL',
  '{"sector": "fintech", "stage": "series-a", "amount_raising": "$5M", "pre_money_valuation": "$18M", "esic_eligible": false, "platform": "OnMarket"}',
  'premium', false, false,
  'listings@invest.com.au', '02 9000 0060',
  'active', NOW() + INTERVAL '90 days', 578, 22
),
(
  'startup',
  'HealthTech — Remote Patient Monitoring for Rural GP Clinics',
  'healthtech-remote-patient-monitoring-rural',
  'Remote patient monitoring SaaS + hardware for rural and regional GP clinics. 28 clinics live, 4,200 monitored patients. MBS-reimbursable. Pre-revenue product pivoted to subscription model 18 months ago: $480K ARR. Raising $1.5M pre-Series A. ESIC eligible.',
  'QLD', 'Brisbane',
  150000000, '$1.5M raise',
  48000000, NULL,
  'Healthcare', 'HealthTech / MedTech',
  '{"sector": "healthtech", "stage": "seed", "amount_raising": "$1.5M", "pre_money_valuation": "$5.5M", "esic_eligible": true, "platform": "Birchal"}',
  'featured', false, false,
  'listings@invest.com.au', '07 3000 0060',
  'active', NOW() + INTERVAL '60 days', 345, 14
),
(
  'startup',
  'EdTech — STEM Upskilling Platform for Mining Sector',
  'edtech-stem-upskilling-mining-sector',
  'Mobile-first STEM and trades upskilling platform built for the resources sector. 12 enterprise clients including Tier 1 mining companies, 6,800 active learners. $2.1M ARR. Raising $4M to build AI-personalised learning and expand to construction.',
  'WA', 'Perth',
  400000000, '$4M raise',
  210000000, NULL,
  'Education', 'EdTech / E-Learning',
  '{"sector": "edtech", "stage": "series-a", "amount_raising": "$4M", "pre_money_valuation": "$14M", "esic_eligible": false, "platform": "VentureCrowd"}',
  'featured', false, false,
  'listings@invest.com.au', '08 9000 0060',
  'active', NOW() + INTERVAL '60 days', 312, 13
),
(
  'startup',
  'CleanTech Pre-Seed — Carbon Capture Using Agricultural Biochar',
  'cleantech-pre-seed-biochar-carbon-capture',
  'Pre-seed cleantech startup commercialising a proprietary pyrolysis process to convert agricultural waste into biochar for carbon sequestration. ACCUs being generated. Pilot plant operational in SA. Raising $800K to prove scalability ahead of Series A. ESIC eligible.',
  'SA', 'Adelaide',
  80000000, '$800K raise',
  NULL, NULL,
  'CleanTech', 'Carbon / Biochar',
  '{"sector": "cleantech", "stage": "pre-seed", "amount_raising": "$800K", "pre_money_valuation": "$3M", "esic_eligible": true, "platform": "Birchal"}',
  'standard', false, false,
  'listings@invest.com.au', '08 8000 0060',
  'active', NOW() + INTERVAL '30 days', 189, 8
),
(
  'startup',
  'MarTech SaaS — Social Commerce Platform for Brands',
  'martech-social-commerce-platform-brands',
  'Creator and social commerce enablement platform with 180 brand clients (FMCG, fashion, beauty). $3.4M ARR, NRR 128%, raising $6M Series A for US market entry. Platform connects brands with 12,000 micro-influencers in AU/NZ.',
  'NSW', 'Sydney',
  600000000, '$6M raise',
  340000000, NULL,
  'Technology', 'MarTech / Social Commerce',
  '{"sector": "martech", "stage": "series-a", "amount_raising": "$6M", "pre_money_valuation": "$22M", "esic_eligible": false, "platform": "OnMarket"}',
  'premium', false, false,
  'listings@invest.com.au', '02 9000 0061',
  'active', NOW() + INTERVAL '90 days', 456, 18
),
(
  'startup',
  'FoodTech Seed Round — Plant-Based Seafood Alternatives',
  'foodtech-seed-plant-based-seafood',
  'FoodTech startup producing plant-based seafood alternatives (shrimp, crab, tuna) from Australian seaweed and legume proteins. Listed in 42 Coles stores, QSR pilot underway. Raising $2.5M seed for production scale-up ahead of export. ESIC eligible.',
  'VIC', 'Melbourne',
  250000000, '$2.5M raise',
  38000000, NULL,
  'Food & Beverage', 'FoodTech / Alternative Protein',
  '{"sector": "foodtech", "stage": "seed", "amount_raising": "$2.5M", "pre_money_valuation": "$9M", "esic_eligible": true, "platform": "Birchal"}',
  'standard', false, false,
  'listings@invest.com.au', '03 9000 0061',
  'active', NOW() + INTERVAL '30 days', 234, 10
),
(
  'startup',
  'CyberSec SaaS — SME Threat Intelligence Platform',
  'cybersec-saas-sme-threat-intelligence',
  'Cybersecurity SaaS platform providing automated threat detection and remediation for Australian SMEs (sub-500 employees). 610 paying customers, $1.8M ARR, 94% gross retention. Raising $3.5M Series A to build an MSP channel and launch in the UK.',
  'QLD', 'Brisbane',
  350000000, '$3.5M raise',
  180000000, NULL,
  'Technology', 'CyberSecurity / SaaS',
  '{"sector": "cybersecurity", "stage": "series-a", "amount_raising": "$3.5M", "pre_money_valuation": "$13M", "esic_eligible": false, "platform": "VentureCrowd"}',
  'featured', false, false,
  'listings@invest.com.au', '07 3000 0061',
  'active', NOW() + INTERVAL '60 days', 378, 15
),
(
  'startup',
  'LegalTech Pre-Seed — AI Contract Review for SMEs',
  'legaltech-pre-seed-ai-contract-review',
  'AI-powered contract review and risk flagging tool built for Australian SMEs. 120 paying customers, $180K ARR, 3 months post-launch. Founded by ex-King & Wood Mallesons partners. Raising $1.2M pre-seed to build enterprise features. ESIC eligible.',
  'NSW', 'Sydney',
  120000000, '$1.2M raise',
  18000000, NULL,
  'Legal Technology', 'LegalTech / AI',
  '{"sector": "legaltech", "stage": "pre-seed", "amount_raising": "$1.2M", "pre_money_valuation": "$5M", "esic_eligible": true, "platform": "OnMarket"}',
  'standard', false, false,
  'listings@invest.com.au', '02 9000 0062',
  'active', NOW() + INTERVAL '30 days', 213, 9
);

-- ============================================================
-- Helper function: increment_listing_enquiries
-- Called by the enquire API route to atomically increment the
-- enquiries counter without a read-modify-write race condition.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_listing_enquiries(listing_id INTEGER)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE investment_listings
  SET enquiries = enquiries + 1,
      updated_at = NOW()
  WHERE id = listing_id;
$$;

-- ============================================================
-- Helper function: increment_listing_views
-- For use by the frontend to record a view event.
-- ============================================================
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id INTEGER)
RETURNS VOID
LANGUAGE SQL
AS $$
  UPDATE investment_listings
  SET views = views + 1,
      updated_at = NOW()
  WHERE id = listing_id;
$$;
