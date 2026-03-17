-- ============================================================
-- Property Investment Vertical — Tables, RLS, Seed Data
-- ============================================================

-- 1. property_developers (must exist before property_listings FK)
CREATE TABLE IF NOT EXISTS property_developers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  website text,
  description text,
  established_year integer,
  projects_completed integer DEFAULT 0,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending')),
  monthly_fee_cents integer DEFAULT 0,
  credit_balance_cents integer DEFAULT 0,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. property_listings
CREATE TABLE IF NOT EXISTS property_listings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  developer_name text,
  developer_id bigint REFERENCES property_developers(id),
  property_type text NOT NULL CHECK (property_type IN ('apartment','townhouse','house_land')),
  city text,
  suburb text,
  state text,
  address_display text,
  price_from_cents bigint,
  price_to_cents bigint,
  bedrooms_min integer,
  bedrooms_max integer,
  completion_date text,
  description text,
  investment_highlights jsonb DEFAULT '[]',
  rental_yield_estimate numeric(5,2),
  capital_growth_10yr numeric(5,2),
  images jsonb DEFAULT '[]',
  floor_plans jsonb DEFAULT '[]',
  brochure_url text,
  firb_approved boolean DEFAULT false,
  foreign_buyer_eligible boolean DEFAULT false,
  new_development boolean DEFAULT true,
  off_the_plan boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold_out','coming_soon')),
  featured boolean DEFAULT false,
  sponsored boolean DEFAULT false,
  lead_count integer DEFAULT 0,
  monthly_fee_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. property_leads
CREATE TABLE IF NOT EXISTS property_leads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id bigint REFERENCES property_listings(id),
  developer_id bigint REFERENCES property_developers(id),
  user_name text NOT NULL,
  user_email text NOT NULL,
  user_phone text,
  user_country text,
  user_message text,
  investment_budget text,
  timeline text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted')),
  source_page text,
  utm_source text,
  created_at timestamptz DEFAULT now()
);

-- 4. buyer_agents
CREATE TABLE IF NOT EXISTS buyer_agents (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  photo_url text,
  agency_name text,
  bio text,
  states_covered text[] DEFAULT '{}',
  suburbs_speciality text[] DEFAULT '{}',
  investment_focus text[] DEFAULT '{}',
  avg_property_value text,
  fee_structure text,
  fee_fixed_cents integer,
  fee_percent numeric(5,2),
  phone text,
  email text,
  website text,
  rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  verified boolean DEFAULT false,
  featured boolean DEFAULT false,
  listing_fee_cents integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. suburb_data
CREATE TABLE IF NOT EXISTS suburb_data (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  suburb text NOT NULL,
  state text NOT NULL,
  postcode text,
  median_price_house bigint,
  median_price_unit bigint,
  rental_yield_house numeric(5,2),
  rental_yield_unit numeric(5,2),
  vacancy_rate numeric(5,2),
  capital_growth_1yr numeric(5,2),
  capital_growth_3yr numeric(5,2),
  capital_growth_5yr numeric(5,2),
  capital_growth_10yr numeric(5,2),
  population integer,
  population_growth numeric(5,2),
  median_age integer,
  median_income integer,
  distance_to_cbd_km numeric(6,1),
  data_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(suburb, state)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(status);
CREATE INDEX IF NOT EXISTS idx_property_listings_city ON property_listings(city);
CREATE INDEX IF NOT EXISTS idx_property_listings_type ON property_listings(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listings_featured ON property_listings(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_property_listings_slug ON property_listings(slug);
CREATE INDEX IF NOT EXISTS idx_property_leads_developer ON property_leads(developer_id);
CREATE INDEX IF NOT EXISTS idx_property_leads_listing ON property_leads(listing_id);
CREATE INDEX IF NOT EXISTS idx_buyer_agents_status ON buyer_agents(status);
CREATE INDEX IF NOT EXISTS idx_buyer_agents_slug ON buyer_agents(slug);
CREATE INDEX IF NOT EXISTS idx_suburb_data_suburb ON suburb_data(suburb);
CREATE INDEX IF NOT EXISTS idx_suburb_data_state ON suburb_data(state);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE suburb_data ENABLE ROW LEVEL SECURITY;

-- Public read on property_listings
CREATE POLICY "Public can read active listings" ON property_listings
  FOR SELECT USING (status IN ('active','coming_soon'));

-- Public read on property_developers (name/logo only handled at query level)
CREATE POLICY "Public can read active developers" ON property_developers
  FOR SELECT USING (status = 'active');

-- Public read on buyer_agents
CREATE POLICY "Public can read active buyer agents" ON buyer_agents
  FOR SELECT USING (status = 'active');

-- Public read on suburb_data
CREATE POLICY "Public can read suburb data" ON suburb_data
  FOR SELECT USING (true);

-- Service role has full access on property_leads (no anon read)
CREATE POLICY "Service role full access on leads" ON property_leads
  FOR ALL USING (auth.role() = 'service_role');

-- Service role write on all tables
CREATE POLICY "Service role write listings" ON property_listings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write developers" ON property_developers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write buyer agents" ON buyer_agents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role write suburb data" ON suburb_data
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Seed: Property Developers
-- ============================================================
INSERT INTO property_developers (slug, name, logo_url, website, description, established_year, projects_completed, contact_name, contact_email, contact_phone, status, monthly_fee_cents, credit_balance_cents)
VALUES
  ('mirvac', 'Mirvac', NULL, 'https://www.mirvac.com', 'One of Australia''s leading integrated real estate groups with over 50 years of experience in residential, office, industrial, and retail development.', 1972, 350, 'Sarah Chen', 'enquiries@mirvac.com', '1300 356 870', 'active', 99900, 500000),
  ('lendlease', 'Lendlease', NULL, 'https://www.lendlease.com', 'Global real estate and infrastructure group creating places where communities thrive. Major developments across Sydney, Melbourne, and Brisbane.', 1958, 500, 'James Morton', 'residential@lendlease.com', '1800 536 353', 'active', 99900, 300000),
  ('stockland', 'Stockland', NULL, 'https://www.stockland.com.au', 'Australia''s largest diversified real estate company, creating liveable, sustainable communities across the country.', 1952, 400, 'Emily Park', 'homes@stockland.com.au', '1300 557 095', 'active', 99900, 400000),
  ('meriton', 'Meriton', NULL, 'https://www.meriton.com.au', 'Australia''s largest apartment developer with a track record of delivering quality residential apartments for over 60 years.', 1963, 80000, 'David Liu', 'sales@meriton.com.au', '1300 063 748', 'active', 99900, 600000),
  ('sekisui-house', 'Sekisui House', NULL, 'https://www.sekisuihouse.com.au', 'Japanese-Australian developer known for innovative, sustainable residential communities and premium apartment living.', 1960, 200, 'Kenji Tanaka', 'enquiries@sekisuihouse.com.au', '1300 073 587', 'active', 99900, 250000)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: Property Listings (8 across Sydney, Melbourne, Brisbane)
-- ============================================================
INSERT INTO property_listings (slug, title, developer_name, developer_id, property_type, city, suburb, state, address_display, price_from_cents, price_to_cents, bedrooms_min, bedrooms_max, completion_date, description, investment_highlights, rental_yield_estimate, capital_growth_10yr, images, firb_approved, foreign_buyer_eligible, new_development, off_the_plan, status, featured, sponsored, monthly_fee_cents)
VALUES
  ('the-operetta-paramatta', 'The Operetta', 'Meriton', (SELECT id FROM property_developers WHERE slug='meriton'), 'apartment', 'Sydney', 'Parramatta', 'NSW', 'Church St, Parramatta NSW 2150', 65000000, 135000000, 1, 3, 'Q4 2027', 'Premium apartments in the heart of Parramatta CBD, steps from the new Metro station. Featuring resort-style amenities including rooftop pool, gymnasium, and co-working spaces.', '["300m to Parramatta Metro station","Parramatta CBD median unit price grew 8.2% in 2025","Strong rental demand from Westmead Hospital and Western Sydney University","FIRB approved for overseas investors","Stamp duty concessions for off-the-plan purchases"]', 4.80, 7.50, '[]', true, true, true, true, 'active', true, true, 49900),

  ('botanical-residences-south-melbourne', 'Botanical Residences', 'Mirvac', (SELECT id FROM property_developers WHERE slug='mirvac'), 'apartment', 'Melbourne', 'South Melbourne', 'VIC', 'Kings Way, South Melbourne VIC 3205', 55000000, 195000000, 1, 3, 'Q2 2028', 'A landmark collection of residences overlooking the Royal Botanic Gardens. Designed by award-winning architects with premium finishes throughout and world-class shared amenities.', '["Overlooking Royal Botanic Gardens","5 min to Melbourne CBD","Heritage precinct with strong capital growth history","Resort-style pool, spa, and private dining room","Stamp duty savings for off-the-plan buyers"]', 4.20, 6.80, '[]', true, true, true, true, 'active', true, false, 49900),

  ('riverview-terrace-newstead', 'Riverview Terrace', 'Lendlease', (SELECT id FROM property_developers WHERE slug='lendlease'), 'townhouse', 'Brisbane', 'Newstead', 'QLD', 'Breakfast Creek Rd, Newstead QLD 4006', 89500000, 145000000, 3, 4, 'Q1 2027', 'Waterfront townhomes along the Brisbane River in the thriving Newstead precinct. Each home features a private courtyard, double garage, and premium Miele kitchen appliances.', '["Brisbane River frontage","Walking distance to Gasworks Plaza and Howard Smith Wharves","Newstead median house price up 12.4% in 2025","High rental yields in Brisbane inner suburbs","Olympic infrastructure driving growth to 2032"]', 5.10, 8.20, '[]', false, false, true, false, 'active', true, false, 49900),

  ('elara-marsden-park', 'Elara Estate', 'Stockland', (SELECT id FROM property_developers WHERE slug='stockland'), 'house_land', 'Sydney', 'Marsden Park', 'NSW', 'Richmond Rd, Marsden Park NSW 2765', 72000000, 98000000, 3, 5, 'Q3 2027', 'House and land packages in Sydney''s fastest-growing corridor. Master-planned community with parks, schools, and shopping village. Minutes from the new Sydney Metro West station.', '["Sydney Metro West station within 2km","New Costco and IKEA nearby","Land values in NW Sydney up 9.1% annually","Affordable entry point for Sydney market","High family rental demand — 2.1% vacancy rate"]', 4.50, 8.90, '[]', false, false, true, false, 'active', false, false, 29900),

  ('yarra-one-south-yarra', 'Yarra One', 'Sekisui House', (SELECT id FROM property_developers WHERE slug='sekisui-house'), 'apartment', 'Melbourne', 'South Yarra', 'VIC', 'Toorak Rd, South Yarra VIC 3141', 48000000, 320000000, 1, 4, 'Q4 2027', 'Ultra-premium apartments on Toorak Road. Japanese-inspired design with meticulous attention to detail, featuring natural materials, expansive balconies, and panoramic city views.', '["Toorak Road premium address","South Yarra train station 200m","Consistently top 5 Melbourne suburb for capital growth","Japanese craftsmanship and design excellence","Concierge, pool, gym, private cinema"]', 3.80, 6.50, '[]', true, true, true, true, 'active', false, true, 49900),

  ('west-village-west-end', 'West Village', 'Sekisui House', (SELECT id FROM property_developers WHERE slug='sekisui-house'), 'apartment', 'Brisbane', 'West End', 'QLD', 'Boundary St, West End QLD 4101', 45000000, 115000000, 1, 3, 'Q2 2027', 'A vibrant urban village in one of Brisbane''s most sought-after inner-city suburbs. Rooftop gardens, artisan retail, and a community-focused design with exceptional liveability.', '["West End — Brisbane''s trendiest inner suburb","2km to Brisbane CBD","High walkability score (92/100)","Strong rental demand from students and young professionals","Olympic legacy infrastructure within 3km"]', 5.40, 7.80, '[]', false, false, true, true, 'active', false, false, 29900),

  ('haven-crows-nest', 'Haven Residences', 'Mirvac', (SELECT id FROM property_developers WHERE slug='mirvac'), 'apartment', 'Sydney', 'Crows Nest', 'NSW', 'Pacific Hwy, Crows Nest NSW 2065', 78000000, 220000000, 1, 3, 'Q1 2028', 'Boutique residences above the new Crows Nest Metro station. Exceptional connectivity to North Sydney and the CBD, with premium retail and dining at your doorstep.', '["Directly above Crows Nest Metro station","North Sydney CBD 1 stop away","Lower North Shore median prices up 7.8%","Premium boutique design — only 85 residences","Established café and dining precinct"]', 4.00, 7.10, '[]', true, true, true, true, 'coming_soon', false, false, 49900),

  ('aurora-melbourne-central', 'Aurora Melbourne Central', 'Meriton', (SELECT id FROM property_developers WHERE slug='meriton'), 'apartment', 'Melbourne', 'Melbourne CBD', 'VIC', 'La Trobe St, Melbourne VIC 3000', 38000000, 85000000, 1, 2, 'Completed', 'Completed and ready to move in. Iconic tower in Melbourne''s city centre with breathtaking views, world-class amenities, and an unbeatable location steps from Melbourne Central Station.', '["Completed — settle immediately, no construction risk","Melbourne Central Station 100m","Strong CBD rental market — 1.8% vacancy","Fully furnished options available","Perfect for student or corporate rental strategy"]', 5.60, 5.20, '[]', true, true, false, false, 'active', false, false, 29900)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: Buyer Agents (10 across major states)
-- ============================================================
INSERT INTO buyer_agents (slug, name, photo_url, agency_name, bio, states_covered, suburbs_speciality, investment_focus, avg_property_value, fee_structure, fee_fixed_cents, fee_percent, phone, email, website, rating, review_count, verified, featured, status)
VALUES
  ('james-walker', 'James Walker', NULL, 'Walker Property Advisory', 'With over 15 years of experience in the Sydney property market, James specialises in helping investors identify high-growth suburbs before the market catches on. Former REA Group analyst with deep data-driven insights.', '{NSW}', '{Parramatta,Penrith,Liverpool,Blacktown,Campbelltown}', '{Capital Growth,First Home Buyer,Renovation}', '$800k – $1.5M', 'Fixed fee + success bonus', 1500000, 1.50, '0412 345 678', 'james@walkerpa.com.au', 'https://walkerpa.com.au', 4.90, 47, true, true, 'active'),

  ('sarah-nguyen', 'Sarah Nguyen', NULL, 'Harbour Property Buyers', 'Sarah is a licensed buyer''s agent who has helped over 200 clients purchase property across Sydney''s Inner West and Eastern Suburbs. She specialises in off-market acquisitions and auction strategy.', '{NSW}', '{Marrickville,Newtown,Surry Hills,Randwick,Bondi}', '{Owner Occupier,Prestige,Off-Market}', '$1.2M – $3M', 'Percentage of purchase price', 0, 2.00, '0423 456 789', 'sarah@harbourpb.com.au', 'https://harbourpb.com.au', 4.80, 63, true, true, 'active'),

  ('michael-chen', 'Michael Chen', NULL, 'Melbourne Investment Partners', 'Michael is a REBAA-accredited buyer''s agent focused exclusively on investment properties in Melbourne''s growth corridors. His portfolio clients average 8.2% annual returns over 10 years.', '{VIC}', '{Footscray,Sunshine,Werribee,Craigieburn,Point Cook}', '{Capital Growth,Cash Flow,Portfolio Building}', '$500k – $1M', 'Fixed fee', 1200000, 0, '0434 567 890', 'michael@mip.com.au', 'https://mip.com.au', 4.70, 38, true, false, 'active'),

  ('emma-taylor', 'Emma Taylor', NULL, 'Prestige Buyers Melbourne', 'Emma specialises in premium Melbourne properties — inner-city apartments, heritage homes, and blue-chip suburbs. With a background in architecture, she has an eye for quality that sets her apart.', '{VIC}', '{South Yarra,Toorak,Brighton,Armadale,Hawthorn}', '{Prestige,Owner Occupier,Downsizer}', '$1.5M – $5M', 'Percentage of purchase price', 0, 1.80, '0445 678 901', 'emma@prestigebuyers.com.au', 'https://prestigebuyers.com.au', 4.90, 52, true, true, 'active'),

  ('david-murphy', 'David Murphy', NULL, 'Brisbane Buyers Agency', 'David has been buying property in Brisbane since 2008 and has seen the market through multiple cycles. He focuses on identifying undervalued suburbs with strong infrastructure investment driving growth.', '{QLD}', '{Newstead,West End,Woolloongabba,Morningside,Nundah}', '{Capital Growth,Cash Flow,Olympic Corridor}', '$600k – $1.2M', 'Fixed fee', 1100000, 0, '0456 789 012', 'david@brisbuyers.com.au', 'https://brisbuyers.com.au', 4.80, 41, true, false, 'active'),

  ('lisa-campbell', 'Lisa Campbell', NULL, 'Gold Coast Property Pros', 'Lisa specialises in the Gold Coast and Northern Rivers region, helping interstate investors capitalise on Queensland''s ongoing migration boom. Deep local knowledge and strong agent network.', '{QLD}', '{Burleigh Heads,Palm Beach,Robina,Coolangatta,Broadbeach}', '{Lifestyle Investment,Short-term Rental,Capital Growth}', '$700k – $1.5M', 'Fixed fee + success bonus', 1300000, 1.00, '0467 890 123', 'lisa@gcpropertypros.com.au', 'https://gcpropertypros.com.au', 4.60, 29, true, false, 'active'),

  ('tom-anderson', 'Tom Anderson', NULL, 'Perth Property Partners', 'Tom is Western Australia''s leading buyer''s agent for investment property, with deep expertise in Perth''s mining-driven rental market and emerging northern corridor suburbs.', '{WA}', '{Scarborough,Joondalup,Baldivis,Rockingham,Mandurah}', '{Cash Flow,Mining Town,Regional Growth}', '$400k – $900k', 'Fixed fee', 900000, 0, '0478 901 234', 'tom@perthpp.com.au', 'https://perthpp.com.au', 4.50, 22, true, false, 'active'),

  ('natalie-hart', 'Natalie Hart', NULL, 'National Property Advisory', 'Natalie is one of Australia''s few truly national buyer''s agents, with teams across Sydney, Melbourne, and Brisbane. She builds portfolio strategies for high-net-worth clients seeking diversification across state lines.', '{NSW,VIC,QLD}', '{Sydney CBD,Melbourne CBD,Brisbane CBD,Parramatta,Southbank}', '{Portfolio Building,SMSF Property,Commercial}', '$500k – $2M', 'Percentage of purchase price', 0, 1.50, '0489 012 345', 'natalie@npa.com.au', 'https://npa.com.au', 4.70, 56, true, true, 'active'),

  ('ben-wright', 'Ben Wright', NULL, 'Adelaide Buyer Advocates', 'Ben has helped over 300 buyers navigate Adelaide''s affordable and high-yielding property market. His data-driven approach has consistently identified suburbs 12-18 months ahead of the growth curve.', '{SA}', '{Prospect,Norwood,Unley,Glenelg,Semaphore}', '{Cash Flow,First Home Buyer,Regional Growth}', '$400k – $800k', 'Fixed fee', 800000, 0, '0490 123 456', 'ben@adelaidebuyers.com.au', 'https://adelaidebuyers.com.au', 4.60, 34, true, false, 'active'),

  ('karen-white', 'Karen White', NULL, 'Hobart Property Buyers', 'Karen is Tasmania''s premier buyer''s agent, specialising in Hobart''s booming property market. With vacancy rates among the lowest in Australia, her clients enjoy exceptional rental returns.', '{TAS}', '{Hobart CBD,Sandy Bay,Battery Point,North Hobart,New Town}', '{Cash Flow,Short-term Rental,Lifestyle Investment}', '$500k – $1M', 'Fixed fee + success bonus', 1000000, 1.00, '0401 234 567', 'karen@hobartpb.com.au', 'https://hobartpb.com.au', 4.80, 27, true, false, 'active')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- Seed: Suburb Data (top 20 Australian investment suburbs)
-- ============================================================
INSERT INTO suburb_data (suburb, state, postcode, median_price_house, median_price_unit, rental_yield_house, rental_yield_unit, vacancy_rate, capital_growth_1yr, capital_growth_3yr, capital_growth_5yr, capital_growth_10yr, population, population_growth, median_age, median_income, distance_to_cbd_km)
VALUES
  ('Parramatta', 'NSW', '2150', 130000000, 62000000, 3.20, 4.80, 2.10, 6.50, 18.20, 32.50, 72.00, 30000, 3.80, 33, 72000, 24.0),
  ('Penrith', 'NSW', '2750', 92000000, 48000000, 3.80, 5.10, 1.80, 8.20, 22.50, 38.00, 89.00, 14000, 2.90, 34, 65000, 54.0),
  ('Liverpool', 'NSW', '2170', 98000000, 50000000, 3.50, 4.90, 2.00, 7.10, 19.80, 35.00, 82.00, 28000, 3.20, 32, 58000, 32.0),
  ('Crows Nest', 'NSW', '2065', 280000000, 95000000, 2.50, 4.00, 1.50, 5.80, 16.40, 28.00, 62.00, 9500, 1.20, 36, 95000, 5.0),
  ('Marsden Park', 'NSW', '2765', 95000000, NULL, 3.90, NULL, 1.60, 9.10, 28.50, 52.00, 105.00, 18000, 8.50, 31, 82000, 45.0),
  ('South Yarra', 'VIC', '3141', 250000000, 58000000, 2.30, 3.80, 2.20, 4.20, 12.80, 22.50, 55.00, 24000, 1.80, 32, 88000, 5.0),
  ('Footscray', 'VIC', '3011', 105000000, 42000000, 3.40, 4.60, 2.50, 7.80, 21.00, 36.00, 78.00, 18000, 3.50, 31, 62000, 6.0),
  ('South Melbourne', 'VIC', '3205', 195000000, 65000000, 2.60, 4.20, 1.90, 5.50, 15.20, 26.00, 58.00, 12000, 1.60, 34, 92000, 3.0),
  ('Melbourne CBD', 'VIC', '3000', NULL, 52000000, NULL, 5.60, 3.50, 3.80, 10.50, 18.00, 42.00, 55000, 4.20, 28, 65000, 0.0),
  ('Craigieburn', 'VIC', '3064', 72000000, 38000000, 3.80, 5.20, 1.40, 8.50, 24.00, 42.00, 92.00, 65000, 5.60, 30, 58000, 28.0),
  ('Newstead', 'QLD', '4006', 180000000, 68000000, 3.00, 4.50, 1.80, 9.20, 26.00, 45.00, 88.00, 8000, 6.20, 33, 85000, 3.0),
  ('West End', 'QLD', '4101', 145000000, 55000000, 3.20, 5.40, 1.60, 10.50, 28.80, 48.00, 92.00, 12000, 4.80, 32, 78000, 2.0),
  ('Woolloongabba', 'QLD', '4102', 120000000, 48000000, 3.50, 5.10, 1.70, 11.20, 30.00, 50.00, 95.00, 9000, 5.50, 31, 72000, 3.0),
  ('Morningside', 'QLD', '4170', 115000000, 52000000, 3.30, 4.80, 1.50, 9.80, 27.50, 46.00, 90.00, 11000, 3.20, 34, 80000, 7.0),
  ('Nundah', 'QLD', '4012', 98000000, 45000000, 3.60, 5.30, 1.40, 10.00, 28.00, 47.00, 91.00, 14000, 3.80, 33, 75000, 9.0),
  ('Scarborough', 'WA', '6019', 115000000, 55000000, 3.50, 4.50, 1.20, 12.50, 32.00, 45.00, 85.00, 16000, 2.80, 35, 78000, 14.0),
  ('Prospect', 'SA', '5082', 95000000, 42000000, 3.80, 5.00, 0.80, 11.00, 30.50, 48.00, 95.00, 22000, 2.20, 36, 72000, 6.0),
  ('Norwood', 'SA', '5067', 130000000, 48000000, 3.20, 4.80, 0.90, 9.50, 26.00, 42.00, 88.00, 6500, 1.50, 38, 82000, 4.0),
  ('Hobart CBD', 'TAS', '7000', 85000000, 48000000, 4.20, 5.80, 0.60, 8.00, 22.00, 38.00, 82.00, 5500, 2.00, 35, 65000, 0.0),
  ('Sandy Bay', 'TAS', '7005', 120000000, 52000000, 3.50, 5.20, 0.70, 7.50, 20.00, 35.00, 78.00, 8000, 1.80, 32, 70000, 3.0)
ON CONFLICT (suburb, state) DO NOTHING;
