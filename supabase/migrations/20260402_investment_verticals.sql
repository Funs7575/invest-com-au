-- 20260402_investment_verticals.sql
-- Investment verticals table and seed data for the /invest hub
-- ============================================================

CREATE TABLE IF NOT EXISTS investment_verticals (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  fdi_share_percent NUMERIC,
  sort_order INTEGER DEFAULT 99,
  hero_title TEXT,
  hero_subtitle TEXT,
  domestic BOOLEAN DEFAULT true,
  international BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS investment_verticals_slug_idx ON investment_verticals(slug);
CREATE INDEX IF NOT EXISTS investment_verticals_sort_idx ON investment_verticals(sort_order);

-- RLS: public read, no write from client
ALTER TABLE investment_verticals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investment_verticals' AND policyname = 'public_read'
  ) THEN
    EXECUTE 'CREATE POLICY public_read ON investment_verticals FOR SELECT USING (true)';
  END IF;
END
$$;

-- ============================================================
-- SEED DATA: investment_verticals
-- ============================================================
INSERT INTO investment_verticals (slug, name, description, icon, fdi_share_percent, sort_order, hero_title, hero_subtitle, domestic, international)
VALUES
  (
    'residential-property',
    'Residential Property',
    'Buy, hold, or develop residential real estate — houses, apartments, townhouses, and land across Australia. One of the most popular asset classes for local and foreign investors.',
    'home',
    28,
    1,
    'Invest in Australian Residential Property (2026)',
    'Houses, apartments, townhouses and land. For local buyers and FIRB-approved foreign investors.',
    true,
    true
  ),
  (
    'shares',
    'Shares & Equities',
    'Invest in ASX-listed companies, LICs, ETFs, and international equities through Australian brokers. Low minimum investment, high liquidity.',
    'trending-up',
    NULL,
    2,
    'Invest in Australian Shares (2026)',
    'ASX equities, ETFs, and LICs. Compare brokers and get started with as little as $500.',
    true,
    true
  ),
  (
    'buy-business',
    'Buy a Business',
    'Acquire an established Australian business — from cafes and retail to manufacturing, professional services, and e-commerce. Business visa pathways available for overseas buyers.',
    'briefcase',
    22,
    3,
    'Buy a Business in Australia (2026)',
    'Established businesses for sale across every sector. Business 188A and SIV visa pathways for overseas buyers.',
    true,
    true
  ),
  (
    'commercial-property',
    'Commercial Property',
    'Invest in offices, industrial warehouses, retail centres, childcare, and hotels. Earn passive income through long-term net leases across Australia''s major cities and regions.',
    'building',
    30,
    4,
    'Australian Commercial Property Investment (2026)',
    'Office, industrial, retail, childcare, and hotel assets with strong long-term lease covenants.',
    true,
    true
  ),
  (
    'farmland',
    'Farmland & Agriculture',
    'Buy grazing stations, cropping farms, horticulture properties, and water entitlements. Australia is one of the world''s most attractive agricultural investment destinations.',
    'leaf',
    25,
    5,
    'Invest in Australian Farmland & Agriculture (2026)',
    'Grazing, cropping, dairy, and horticulture across Australia. FIRB guidance for foreign buyers.',
    true,
    true
  ),
  (
    'mining',
    'Mining & Resources',
    'Invest directly in Australian mining projects — lithium, gold, copper, iron ore, and rare earths. Australia is the world''s leading producer of many critical minerals.',
    'layers',
    40,
    6,
    'Mining Investment Opportunities in Australia (2026)',
    'Direct project investments, ASX miners, joint ventures, and exploration tenements.',
    true,
    true
  ),
  (
    'renewable-energy',
    'Renewable Energy',
    'Co-invest in solar farms, wind projects, battery storage, and hydrogen. Australia is rapidly expanding its renewable energy capacity with significant institutional co-investment opportunities.',
    'zap',
    20,
    7,
    'Renewable Energy Investment Australia (2026)',
    'Solar, wind, battery storage, and green hydrogen projects seeking equity partners.',
    true,
    true
  ),
  (
    'startups',
    'Startups & Venture',
    'Invest in early-stage Australian startups through equity crowdfunding, angel rounds, and venture funds. ESIC-eligible companies offer 20% tax offset and CGT exemptions.',
    'rocket',
    10,
    8,
    'Invest in Australian Startups (2026)',
    'Equity crowdfunding, angel deals, and ESIC-eligible startups. Tax incentives for eligible investors.',
    true,
    true
  ),
  (
    'franchise',
    'Franchise Opportunities',
    'Join proven Australian franchise systems — from fast food and fitness to automotive and home services. Known investment levels, training, and ongoing franchisor support.',
    'star',
    NULL,
    9,
    'Franchise Investment Opportunities in Australia (2026)',
    'Proven franchise systems across food, retail, services, and more. Known investment levels.',
    true,
    false
  ),
  (
    'funds',
    'Investment Funds',
    'Invest through ASIC-regulated managed investment schemes, PE funds, and hedge funds. SIV-complying funds available for Significant Investor Visa applicants seeking permanent residency.',
    'dollar-sign',
    15,
    10,
    'Australian Investment Fund Directory (2026)',
    'ASIC-regulated funds across all asset classes, including SIV-complying structures.',
    true,
    true
  ),
  (
    'private-equity',
    'Private Equity',
    'Access institutional private equity deals — buyouts, growth equity, and mezzanine debt. Minimum investment thresholds apply. Wholesale investor qualification required.',
    'lock',
    12,
    11,
    'Private Equity Investment in Australia (2026)',
    'Buyouts, growth equity, and mezzanine debt for wholesale investors.',
    true,
    true
  ),
  (
    'bonds',
    'Bonds & Fixed Income',
    'Invest in Australian government bonds, corporate bonds, and hybrid securities. Stable income returns with lower risk than equities. ASX-listed and OTC options available.',
    'shield',
    NULL,
    12,
    'Australian Bonds & Fixed Income (2026)',
    'Government bonds, corporate bonds, and hybrids. Stable income for conservative investors.',
    true,
    true
  ),
  (
    'gold',
    'Gold & Precious Metals',
    'Invest in Australian gold through physical bullion, ASX-listed gold ETFs, gold miners, and streaming companies. Australia is the world''s second-largest gold producer.',
    'award',
    NULL,
    13,
    'Gold Investment in Australia (2026)',
    'Physical gold, ASX gold ETFs, gold miners, and royalty streaming companies.',
    true,
    true
  ),
  (
    'ipos',
    'IPOs & New Listings',
    'Participate in Australian Initial Public Offerings (IPOs) and ASX new listings. Access pre-IPO rounds through registered brokers and crowdfunding platforms.',
    'trending-up',
    NULL,
    14,
    'Australian IPOs & New Listings (2026)',
    'Upcoming ASX IPOs, pre-IPO rounds, and how to participate.',
    true,
    false
  ),
  (
    'savings',
    'High-Interest Savings',
    'Park your cash in competitive high-interest savings accounts, term deposits, and cash management accounts from Australian banks and credit unions.',
    'piggy-bank',
    NULL,
    15,
    'Best High-Interest Savings Accounts Australia (2026)',
    'Compare savings accounts, term deposits, and CMAs from Australia''s top financial institutions.',
    true,
    false
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  fdi_share_percent = EXCLUDED.fdi_share_percent,
  sort_order = EXCLUDED.sort_order,
  hero_title = EXCLUDED.hero_title,
  hero_subtitle = EXCLUDED.hero_subtitle,
  domestic = EXCLUDED.domestic,
  international = EXCLUDED.international,
  updated_at = NOW();
