-- ============================================================
-- LAUNCH READINESS: Missing tables, thin content seeding,
-- additional best-for scenarios, commodity data
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. MISSING TABLES: newsletter_editions
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_editions (
  id            BIGSERIAL PRIMARY KEY,
  edition_date  DATE NOT NULL UNIQUE,
  subject       TEXT NOT NULL,
  preview_text  TEXT,
  body_html     TEXT,
  body_text     TEXT,
  fee_changes   INTEGER DEFAULT 0,
  articles      INTEGER DEFAULT 0,
  deals         INTEGER DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',  -- draft | scheduled | sent
  sent_at       TIMESTAMPTZ,
  open_rate     NUMERIC(5,2),
  click_rate    NUMERIC(5,2),
  subscriber_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_editions_date ON public.newsletter_editions (edition_date DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_editions_status ON public.newsletter_editions (status);

-- ────────────────────────────────────────────────────────────
-- 2. MISSING TABLES: forum_categories, forum_threads, forum_posts,
--    forum_user_profiles, forum_reactions
-- ────────────────────────────────────────────────────────────
-- Schema must match the columns the existing community API
-- already queries (app/api/community/{categories,threads,posts,vote,
-- moderate}/route.ts). Cross-checked against every .select / .insert
-- / .update call in those files before finalising.
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT DEFAULT 'message-circle',
  color           TEXT DEFAULT '#64748b',
  sort_order      INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | archived
  thread_count    INTEGER DEFAULT 0,
  post_count      INTEGER DEFAULT 0,
  last_thread_id  BIGINT,
  last_post_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_user_profiles (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  bio             TEXT,
  reputation      INTEGER DEFAULT 0,
  post_count      INTEGER DEFAULT 0,
  thread_count    INTEGER DEFAULT 0,
  is_moderator    BOOLEAN NOT NULL DEFAULT false,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  last_active     TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'active',  -- active | banned | suspended
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- forum_threads.author_id is the auth.users UUID, not a numeric profile FK.
-- Existing API writes user.id directly to author_id (see app/api/community/threads/route.ts).
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id              BIGSERIAL PRIMARY KEY,
  category_id     BIGINT NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL,
  author_name     TEXT,
  title           TEXT NOT NULL,
  slug            TEXT NOT NULL,
  body            TEXT NOT NULL,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  is_locked       BOOLEAN NOT NULL DEFAULT false,
  is_removed      BOOLEAN NOT NULL DEFAULT false,
  view_count      INTEGER NOT NULL DEFAULT 0,
  reply_count     INTEGER NOT NULL DEFAULT 0,
  vote_score      INTEGER NOT NULL DEFAULT 0,
  last_reply_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON public.forum_threads (category_id, is_pinned DESC, last_reply_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_forum_threads_active ON public.forum_threads (created_at DESC) WHERE is_removed = false;
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON public.forum_threads (author_id);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id              BIGSERIAL PRIMARY KEY,
  thread_id       BIGINT NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL,
  author_name     TEXT,
  body            TEXT NOT NULL,
  parent_id       BIGINT REFERENCES public.forum_posts(id),
  vote_score      INTEGER NOT NULL DEFAULT 0,
  is_answer       BOOLEAN NOT NULL DEFAULT false,
  is_removed      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON public.forum_posts (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_posts_active ON public.forum_posts (thread_id, created_at) WHERE is_removed = false;
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts (author_id);

-- Vote tracking — referenced by /api/community/vote. One row per
-- (target_type, target_id, voter_user_id). Vote of +1 / -1; aggregate
-- score is denormalised onto the target row's vote_score column.
CREATE TABLE IF NOT EXISTS public.forum_votes (
  id              BIGSERIAL PRIMARY KEY,
  target_type     TEXT NOT NULL,  -- 'thread' | 'post'
  target_id       BIGINT NOT NULL,
  voter_user_id   UUID NOT NULL,
  vote            SMALLINT NOT NULL,  -- +1 or -1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_type, target_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_votes_target ON public.forum_votes (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_voter ON public.forum_votes (voter_user_id);

-- ────────────────────────────────────────────────────────────
-- 3. SEED: forum_categories (8 categories)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.forum_categories (slug, name, description, icon, color, sort_order, status) VALUES
  ('share-trading',      'Share Trading',       'ASX and international share trading discussion. Broker reviews, stock analysis, and trading strategies.',  'trending-up',   '#f59e0b', 10, 'active'),
  ('etfs-index-funds',   'ETFs & Index Funds',  'Exchange-traded funds, index investing, DCA strategies, and portfolio construction.',                      'bar-chart-2',   '#3b82f6', 20, 'active'),
  ('property-investing', 'Property Investing',  'Residential, commercial, and REIT investment. Mortgage strategies, negative gearing, and property tax.',   'home',          '#10b981', 30, 'active'),
  ('super-retirement',   'Super & Retirement',  'Superannuation strategies, SMSF, retirement planning, and pension phase.',                                 'shield',        '#8b5cf6', 40, 'active'),
  ('crypto',             'Crypto & Digital',    'Cryptocurrency, blockchain, DeFi, and digital asset investing in Australia.',                              'zap',           '#f97316', 50, 'active'),
  ('tax-strategy',       'Tax Strategy',        'Tax-effective investing, CGT strategies, franking credits, negative gearing, and structuring.',             'calculator',    '#ef4444', 60, 'active'),
  ('beginners',          'Beginners Corner',    'New to investing? Ask anything. No question is too basic. Supportive community for first-time investors.', 'help-circle',   '#06b6d4', 70, 'active'),
  ('broker-reviews',     'Broker Reviews',      'Share your experience with brokers, platforms, and financial products. Help others make informed choices.', 'star',          '#eab308', 80, 'active')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. SEED: 3 newsletter editions (pre-launch archive)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.newsletter_editions (edition_date, subject, preview_text, fee_changes, articles, deals, status) VALUES
  ('2026-04-07', 'Broker Fee Watch: Stake cuts US brokerage, CommSec launches new tier', 'This week: 3 fee changes, 2 new articles, 1 deal', 3, 2, 1, 'sent'),
  ('2026-04-14', 'Critical Minerals Boom: How to invest in Australia''s mining renaissance', 'US-Australia $8.5B framework, EU FTA, rare earth opportunities', 1, 3, 2, 'sent'),
  ('2026-04-21', 'ETF Fee War: Betashares drops MER on A200 to 0.04%', 'Cheapest ASX 200 ETF ever, plus 4 new broker reviews', 2, 4, 1, 'sent')
ON CONFLICT (edition_date) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. SEED: 20 more best_for_scenarios (30 → 50)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.best_for_scenarios
  (slug, h1, intro, meta_description, scoring_weights, required_attrs, target_user, display_order)
VALUES
  ('fractional-shares',
   'Best brokers for fractional shares in Australia (2026)',
   'Fractional shares let you invest in expensive stocks like Apple or Berkshire Hathaway with as little as $1. Not all Australian brokers offer fractional trading — and those that do have different minimums, fee structures, and available markets.',
   'Compare Australian brokers offering fractional share trading. Minimum investment, fees, and available markets ranked.',
   '{"rating": 0.35, "us_fee_value": -0.30, "asx_fee_value": -0.20, "min_deposit": -0.15}',
   '{"fractional_shares": true}',
   'Investors who want to buy partial shares of expensive stocks with small amounts.',
   310),

  ('copy-trading',
   'Best copy trading platforms in Australia (2026)',
   'Copy trading lets you automatically mirror the trades of experienced investors. It''s a hands-off approach that suits beginners who want market exposure without researching individual stocks.',
   'Compare copy trading platforms available in Australia. Features, fees, and available traders ranked.',
   '{"rating": 0.45, "us_fee_value": -0.25, "asx_fee_value": -0.15, "min_deposit": -0.15}',
   '{"copy_trading": true}',
   'Beginners or busy investors who want to mirror experienced traders automatically.',
   320),

  ('margin-lending',
   'Best brokers for margin lending in Australia (2026)',
   'Margin lending amplifies your returns — and your losses. Choosing a broker with competitive margin rates, reasonable maintenance requirements, and strong margin call processes is critical for leveraged investors.',
   'Compare Australian brokers offering margin lending. Interest rates, LVRs, and margin call policies ranked.',
   '{"rating": 0.30, "asx_fee_value": -0.30, "chess_sponsored": 0.25, "inactivity_fee": -0.15}',
   '{"margin_lending": true}',
   'Experienced investors using leverage to amplify ASX or international share positions.',
   330),

  ('family-accounts',
   'Best brokers for family & kids investing (2026)',
   'Teaching children about investing starts with finding a platform that supports minor accounts or custodial investing. Not all brokers allow accounts for under-18s, and those that do have different rules around parental oversight.',
   'Compare Australian brokers that support minor or custodial accounts for family investing. Features and fees ranked.',
   '{"rating": 0.40, "min_deposit": -0.30, "asx_fee_value": -0.20, "inactivity_fee": -0.10}',
   '{}',
   'Parents wanting to set up investment accounts for their children under 18.',
   340),

  ('international-shares-beyond-us',
   'Best brokers for international shares beyond the US (2026)',
   'Most Australian brokers offer ASX and US markets, but access to European, Asian, and UK exchanges varies widely. If you want to buy LSE, TSE, HKEX, or Euronext stocks, your broker choice matters enormously.',
   'Compare Australian brokers for international shares beyond the US. European, Asian, and UK market access ranked.',
   '{"us_fee_value": -0.20, "fx_rate": -0.40, "rating": 0.25, "asx_fee_value": -0.15}',
   '{}',
   'Global investors who want access to European, Asian, and UK markets from Australia.',
   350),

  ('demo-account',
   'Best demo accounts for share trading in Australia (2026)',
   'A demo account lets you practice trading with virtual money before risking real capital. It''s the safest way to learn platform features, test strategies, and build confidence before going live.',
   'Compare Australian brokers offering free demo trading accounts. Paper trading, virtual portfolios, and practice features ranked.',
   '{"rating": 0.50, "asx_fee_value": -0.20, "min_deposit": -0.20, "us_fee_value": -0.10}',
   '{"demo_account": true}',
   'New investors who want to practice trading risk-free before committing real money.',
   360),

  ('asx-small-caps',
   'Best brokers for ASX small-cap trading (2026)',
   'Small-cap and micro-cap ASX stocks offer higher growth potential but require a broker with strong ASX execution, real-time depth data, and competitive brokerage for frequent trading. Some platforms restrict trading in low-liquidity stocks.',
   'Compare Australian brokers for ASX small-cap and micro-cap trading. Execution quality, data, and fees ranked.',
   '{"asx_fee_value": -0.50, "chess_sponsored": 0.20, "rating": 0.20, "inactivity_fee": -0.10}',
   '{"chess_sponsored": true}',
   'Active traders targeting ASX small-cap and micro-cap growth stocks.',
   370),

  ('high-frequency-api',
   'Best brokers with API access for algorithmic trading (2026)',
   'Algorithmic traders need API access, low latency, and competitive per-trade costs. Only a handful of Australian-accessible brokers offer production-grade APIs with WebSocket streaming and FIX protocol support.',
   'Compare Australian brokers offering API access for algorithmic and automated trading. APIs, latency, and fees ranked.',
   '{"asx_fee_value": -0.40, "us_fee_value": -0.25, "rating": 0.20, "chess_sponsored": 0.15}',
   '{}',
   'Algorithmic traders and developers who need programmatic access to market data and order execution.',
   380),

  ('ipo-investing',
   'Best brokers for IPO investing in Australia (2026)',
   'Access to IPO allocations varies significantly between brokers. Some offer retail investors direct participation in ASX IPOs, while others are limited to institutional clients. The rankings below weight IPO access availability and track record.',
   'Compare Australian brokers for IPO access and participation. Allocation availability, fees, and track record ranked.',
   '{"rating": 0.40, "asx_fee_value": -0.25, "chess_sponsored": 0.25, "inactivity_fee": -0.10}',
   '{"chess_sponsored": true}',
   'Investors who want to participate in ASX IPOs and new listings.',
   390),

  ('tax-reporting',
   'Best brokers for tax reporting in Australia (2026)',
   'End-of-financial-year tax reporting is dramatically easier with some brokers than others. Pre-filled tax reports, CGT calculators, and ATO integration can save hours of manual work — or thousands in accountant fees.',
   'Compare Australian brokers by tax reporting features. CGT reports, ATO integration, and EOFY tools ranked.',
   '{"rating": 0.35, "chess_sponsored": 0.25, "asx_fee_value": -0.20, "inactivity_fee": -0.20}',
   '{}',
   'Australian investors who want streamlined tax reporting and CGT calculation at EOFY.',
   400),

  ('corporate-accounts',
   'Best brokers for company & trust trading accounts (2026)',
   'Trading through a company or family trust structure requires a broker that supports corporate accounts with proper entity documentation. Not all retail platforms accept non-individual entities.',
   'Compare Australian brokers accepting company and trust trading accounts. Entity support, fees, and features ranked.',
   '{"rating": 0.40, "chess_sponsored": 0.30, "asx_fee_value": -0.20, "inactivity_fee": -0.10}',
   '{}',
   'Investors trading through company structures, family trusts, or SMSFs.',
   410),

  ('sustainable-super',
   'Best ethical & sustainable super funds in Australia (2026)',
   'Sustainable super funds screen out fossil fuels, weapons, and gambling while directing capital toward renewable energy, healthcare, and social impact. Performance has kept pace with mainstream options — often outperforming over the medium term.',
   'Compare ethical and sustainable super funds in Australia. ESG screening, performance, fees, and impact ranked.',
   '{"rating": 0.45, "chess_sponsored": 0.20, "asx_fee_value": -0.15, "inactivity_fee": -0.20}',
   '{}',
   'Australians who want their superannuation aligned with environmental and social values.',
   420),

  ('share-trading-seniors',
   'Best share trading platforms for retirees (2026)',
   'Retirees need platforms that prioritise ease of use, reliable customer support, CHESS sponsorship for ownership security, and low ongoing costs. Avoid platforms that charge inactivity fees — retirement income can be irregular.',
   'Compare share trading platforms suited for Australian retirees. Ease of use, support, CHESS, and fees ranked.',
   '{"inactivity_fee": -0.30, "chess_sponsored": 0.30, "rating": 0.25, "asx_fee_value": -0.15}',
   '{"chess_sponsored": true}',
   'Australian retirees who want a simple, reliable platform for managing their share portfolio.',
   430),

  ('term-deposits',
   'Best term deposit rates in Australia (2026)',
   'Term deposits offer guaranteed returns with zero market risk — ideal for capital preservation. Rates vary significantly between banks, and the highest rates often come from smaller ADIs and neobanks.',
   'Compare the best term deposit rates in Australia. 1-year, 2-year, and 3-year rates ranked across major and neobanks.',
   '{"rating": 0.50, "asx_fee_value": -0.10, "inactivity_fee": -0.20, "chess_sponsored": 0.20}',
   '{}',
   'Conservative investors seeking guaranteed returns through Australian term deposits.',
   440),

  ('high-interest-savings',
   'Best high-interest savings accounts in Australia (2026)',
   'The best savings accounts offer competitive ongoing rates without punishing bonus conditions. Beware accounts that advertise high headline rates but require 5+ monthly deposits and zero withdrawals to qualify.',
   'Compare the best high-interest savings accounts in Australia. Ongoing rates, bonus conditions, and withdrawal terms ranked.',
   '{"rating": 0.50, "inactivity_fee": -0.25, "min_deposit": -0.15, "asx_fee_value": -0.10}',
   '{}',
   'Australians looking for the highest savings account interest rate with fair conditions.',
   450),

  ('share-trading-nz',
   'Best brokers for NZ residents investing in ASX (2026)',
   'New Zealand residents can access the ASX through several brokers, but eligibility, tax treatment, and fee structures differ from Australian residents. The NZ-AU DTA affects withholding tax on dividends.',
   'Compare brokers for NZ residents investing in ASX shares. Eligibility, fees, and NZ tax treatment ranked.',
   '{"rating": 0.35, "asx_fee_value": -0.30, "fx_rate": -0.20, "chess_sponsored": 0.15}',
   '{"accepts_non_residents": true}',
   'New Zealand residents who want to invest in Australian shares on the ASX.',
   460),

  ('cheapest-etf-portfolio',
   'Cheapest ETF portfolio to build in Australia (2026)',
   'The total cost of an ETF portfolio includes brokerage per trade, the ETF management fee (MER), and any platform fees. The cheapest portfolios combine zero-brokerage platforms with ultra-low MER ETFs.',
   'Find the cheapest way to build an ETF portfolio in Australia. Brokerage, MER, and platform fees compared.',
   '{"asx_fee_value": -0.50, "inactivity_fee": -0.25, "rating": 0.15, "chess_sponsored": 0.10}',
   '{}',
   'Cost-conscious investors building a diversified ETF portfolio at the lowest possible cost.',
   470),

  ('joint-accounts',
   'Best brokers with joint accounts in Australia (2026)',
   'Joint share trading accounts let couples invest together, but not all brokers support them. Joint accounts affect CGT splitting, estate planning, and account access — choose a broker that handles joint ownership properly.',
   'Compare Australian brokers offering joint share trading accounts. Features, CGT handling, and fees ranked.',
   '{"rating": 0.40, "chess_sponsored": 0.30, "asx_fee_value": -0.20, "inactivity_fee": -0.10}',
   '{"joint_accounts": true}',
   'Couples who want to invest together through a joint brokerage account.',
   480),

  ('after-hours-trading',
   'Best brokers for after-hours trading in Australia (2026)',
   'After-hours trading lets you react to US earnings announcements, economic data, and overnight news before the ASX opens. Only a few platforms offer extended-hours access to US markets from Australia.',
   'Compare Australian brokers offering after-hours trading. Pre-market, post-market, and overnight access ranked.',
   '{"us_fee_value": -0.35, "fx_rate": -0.30, "rating": 0.25, "asx_fee_value": -0.10}',
   '{}',
   'Investors who want to trade US stocks outside of regular US market hours from Australia.',
   490),

  ('crypto-staking',
   'Best crypto staking platforms in Australia (2026)',
   'Crypto staking lets you earn passive rewards by locking up proof-of-stake tokens like ETH, SOL, and DOT. Australian exchanges vary in supported assets, staking APY, lock-up periods, and fee structures.',
   'Compare crypto staking platforms available in Australia. Supported assets, APY, fees, and lock-up terms ranked.',
   '{"rating": 0.45, "asx_fee_value": -0.10, "min_deposit": -0.25, "inactivity_fee": -0.20}',
   '{}',
   'Crypto investors who want to earn passive staking rewards on Australian-regulated exchanges.',
   500)

ON CONFLICT (slug) DO UPDATE SET
  h1               = EXCLUDED.h1,
  intro            = EXCLUDED.intro,
  meta_description = EXCLUDED.meta_description,
  scoring_weights  = EXCLUDED.scoring_weights,
  required_attrs   = EXCLUDED.required_attrs,
  target_user      = EXCLUDED.target_user,
  display_order    = EXCLUDED.display_order;

-- ────────────────────────────────────────────────────────────
-- 6. SEED: commodity_stocks (5 → 30)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.commodity_stocks (ticker, name, commodity, market_cap_aud, sector, description) VALUES
  ('BHP', 'BHP Group', 'diversified', 230000000000, 'Mining', 'World''s largest mining company. Iron ore, copper, nickel, potash, coal.'),
  ('RIO', 'Rio Tinto', 'iron_ore', 180000000000, 'Mining', 'Global mining major. Iron ore, aluminium, copper, diamonds.'),
  ('FMG', 'Fortescue', 'iron_ore', 65000000000, 'Mining', 'Pure-play Pilbara iron ore producer. Green energy division.'),
  ('WDS', 'Woodside Energy', 'lng', 48000000000, 'Energy', 'Australia''s largest LNG producer. Scarborough, NWS, Pluto.'),
  ('STO', 'Santos', 'lng', 18000000000, 'Energy', 'Oil and gas producer. Barossa, PNG LNG, Cooper Basin.'),
  ('NCM', 'Newmont (ASX)', 'gold', 55000000000, 'Gold', 'World''s largest gold miner. Boddington, Tanami, Cadia.'),
  ('NST', 'Northern Star', 'gold', 15000000000, 'Gold', 'Major Australian gold producer. Kalgoorlie Super Pit, Jundee, Pogo.'),
  ('EVN', 'Evolution Mining', 'gold', 8000000000, 'Gold', 'Gold and copper miner. Cowal, Mt Rawdon, Ernest Henry.'),
  ('PLS', 'Pilbara Minerals', 'lithium', 12000000000, 'Mining', 'Leading Australian spodumene lithium producer. Pilgangoora.'),
  ('LYC', 'Lynas Rare Earths', 'rare_earths', 8000000000, 'Mining', 'World''s largest non-Chinese rare earth producer. Mt Weld, Kalgoorlie.'),
  ('ILU', 'Iluka Resources', 'rare_earths', 5000000000, 'Mining', 'Mineral sands and rare earths. Eneabba refinery for critical minerals.'),
  ('IGO', 'IGO Limited', 'lithium', 6000000000, 'Mining', 'Lithium and nickel. Greenbushes JV (world''s largest lithium mine).'),
  ('MIN', 'Mineral Resources', 'lithium', 7000000000, 'Mining', 'Mining services and lithium. Wodgina, Mt Marion.'),
  ('ARU', 'Arafura Rare Earths', 'rare_earths', 800000000, 'Mining', 'Nolans NdPr rare earths project, NT. DFS complete.'),
  ('WHC', 'Whitehaven Coal', 'coal', 8000000000, 'Mining', 'Premium metallurgical and thermal coal. Maules Creek, Narrabri.'),
  ('S32', 'South32', 'diversified', 12000000000, 'Mining', 'Diversified miner. Alumina, manganese, coal, zinc, copper.'),
  ('OZL', 'OZ Minerals', 'copper', 0, 'Mining', 'Copper-gold miner. Prominent Hill, Carrapateena. Acquired by BHP.'),
  ('SFR', 'Sandfire Resources', 'copper', 4000000000, 'Mining', 'Copper miner. DeGrussa, Motheo (Botswana), Black Butte (US).'),
  ('NIC', 'Nickel Industries', 'nickel', 3000000000, 'Mining', 'Nickel pig iron and HPAL nickel. Indonesia operations.'),
  ('PDN', 'Paladin Energy', 'uranium', 3500000000, 'Mining', 'Uranium producer. Langer Heinrich (Namibia) restart.'),
  ('LOT', 'Lotus Resources', 'uranium', 500000000, 'Mining', 'Uranium developer. Kayelekera mine restart (Malawi).'),
  ('DEG', 'De Grey Mining', 'gold', 4000000000, 'Gold', 'Hemi gold discovery. One of Australia''s largest undeveloped gold deposits.'),
  ('GOR', 'Gold Road Resources', 'gold', 3000000000, 'Gold', 'Gruyere gold mine JV. WA goldfields.'),
  ('RRL', 'Regis Resources', 'gold', 2500000000, 'Gold', 'McPhillamys gold project (NSW). Duketon (WA).'),
  ('LTR', 'Liontown Resources', 'lithium', 3000000000, 'Mining', 'Kathleen Valley lithium project. Spodumene developer.'),
  ('WGX', 'Westgold Resources', 'gold', 2000000000, 'Gold', 'Murchison gold operations. Fortnum hub.'),
  ('NHC', 'New Hope Corporation', 'coal', 4000000000, 'Mining', 'Thermal coal producer. New Acland, Bengalla.'),
  ('ORE', 'Orocobre (now Allkem)', 'lithium', 0, 'Mining', 'Merged with Livent to form Arcadium Lithium.'),
  ('BOE', 'Boss Energy', 'uranium', 1500000000, 'Mining', 'Honeymoon uranium ISR restart. South Australia.'),
  ('ERA', 'Energy Resources of AU', 'uranium', 800000000, 'Mining', 'Ranger uranium mine rehabilitation. Rio Tinto subsidiary.')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. SEED: commodity_etfs (2 → 15)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.commodity_etfs (ticker, name, commodity, mer_percent, provider, description) VALUES
  ('MNRS', 'VanEck Gold Miners ETF', 'gold', 0.53, 'VanEck', 'Tracks NYSE Arca Gold Miners Index. Exposure to global gold mining companies.'),
  ('QRE', 'BetaShares Resources ETF', 'diversified', 0.34, 'BetaShares', 'Tracks S&P/ASX 200 Resources sector. Broad Australian resources exposure.'),
  ('ETLM', 'Global X Battery Tech & Lithium ETF', 'lithium', 0.69, 'Global X', 'Tracks Solactive Global Lithium & Battery Technology Index.'),
  ('GDX', 'VanEck Gold Miners (US-listed)', 'gold', 0.51, 'VanEck', 'US-listed gold miners ETF. Largest global gold mining ETF by AUM.'),
  ('FUEL', 'BetaShares Global Energy Companies ETF', 'energy', 0.57, 'BetaShares', 'Tracks S&P Global 1200 Energy Sector. Oil, gas, LNG exposure.'),
  ('URNM', 'Sprott Junior Uranium Miners ETF', 'uranium', 0.85, 'Sprott', 'Exposure to junior uranium mining companies. Higher risk/reward.'),
  ('ACDC', 'Global X Battery Tech & Lithium ETF (Alt)', 'lithium', 0.69, 'Global X', 'Alternative ticker for lithium/battery technology exposure.'),
  ('OOO', 'BetaShares Crude Oil ETF', 'oil', 1.29, 'BetaShares', 'Tracks crude oil futures. Synthetic exposure, not physical.'),
  ('QAU', 'BetaShares Gold Bullion ETF (AUD hedged)', 'gold', 0.59, 'BetaShares', 'Physical gold bullion ETF. AUD-hedged. Direct gold price exposure.'),
  ('GOLD', 'ETFS Physical Gold', 'gold', 0.40, 'ETFS', 'Physical gold bullion ETF. Unhedged AUD exposure.'),
  ('PMGOLD', 'Perth Mint Gold', 'gold', 0.15, 'Perth Mint', 'Government-guaranteed physical gold. Lowest MER gold ETF on ASX.'),
  ('WIRE', 'Global X Copper Miners ETF', 'copper', 0.65, 'Global X', 'Tracks Solactive Global Copper Miners Index. Pure copper mining exposure.'),
  ('FOOD', 'BetaShares Global Agriculture ETF', 'agriculture', 0.57, 'BetaShares', 'Tracks agriculture companies. Fertilisers, grain, livestock.'),
  ('AQLT', 'iShares Core Composite Bond ETF', 'bonds', 0.10, 'iShares', 'Australian composite bond ETF. Government + corporate bonds.'),
  ('IHVV', 'iShares S&P 500 AUD Hedged', 'diversified', 0.09, 'iShares', 'Not a commodity ETF — included for diversification context.')
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 8. SEED: commodity_sectors (1 → 8)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.commodity_sectors (slug, name, description, display_order) VALUES
  ('gold', 'Gold', 'Safe haven asset at record highs. Australian gold miners benefit from AUD weakness against USD.', 10),
  ('lithium', 'Lithium & Battery Metals', 'EV battery demand driving 500-700% projected growth by 2030. Australia is the world''s largest lithium producer.', 20),
  ('rare-earths', 'Rare Earths & Critical Minerals', 'Strategic minerals for defence, renewables, and EV motors. China supply restrictions creating investment opportunities.', 30),
  ('iron-ore', 'Iron Ore', 'Australia''s largest export commodity. Pilbara operations by BHP, Rio Tinto, and Fortescue.', 40),
  ('copper', 'Copper', 'Electrification megatrend. EVs use 3-4x more copper than ICE vehicles. Olympic Dam, Ernest Henry.', 50),
  ('uranium', 'Uranium & Nuclear', 'Nuclear renaissance driving demand. Australia holds world''s largest reserves.', 60),
  ('energy', 'Oil, Gas & LNG', 'Woodside, Santos, and LNG exporters. Transition risk but strong cashflows.', 70),
  ('coal', 'Coal (Met & Thermal)', 'Metallurgical coal essential for steelmaking. ESG concerns affecting thermal coal.', 80)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 9. SEED: regulatory_alerts (0 → 5)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.regulatory_alerts (title, slug, body, severity, source, source_url, effective_date, status, published_at) VALUES
  ('ASIC bans payment for order flow for retail CFD providers',
   'asic-bans-payment-order-flow-cfd',
   'ASIC has finalised Product Intervention Order CI 2025/001 banning payment for order flow (PFOF) arrangements for retail CFD providers operating in Australia. The ban takes effect 1 July 2026. This aligns Australia with the EU MiFID II approach and removes a key conflict of interest in CFD pricing.',
   'high', 'ASIC', 'https://asic.gov.au', '2026-07-01', 'published', NOW() - INTERVAL '14 days'),

  ('Established dwelling ban extended to 31 March 2027',
   'established-dwelling-ban-extended-2027',
   'The Australian Government has confirmed the temporary ban on foreign purchases of established residential dwellings will remain in force until at least 31 March 2027. Non-resident foreign investors continue to be restricted to new dwellings only. FIRB application fees for new dwelling purchases remain unchanged.',
   'high', 'Treasury', 'https://treasury.gov.au', '2025-04-01', 'published', NOW() - INTERVAL '30 days'),

  ('ATO updates CGT withholding rate for foreign residents to 15%',
   'ato-cgt-withholding-foreign-residents-15-percent',
   'The ATO has confirmed the non-final withholding tax rate on capital gains from the disposal of taxable Australian property by foreign residents increases from 12.5% to 15% for contracts entered into from 1 January 2026. This applies to direct property sales above $750,000 and indirect interests in Australian real property.',
   'medium', 'ATO', 'https://ato.gov.au', '2026-01-01', 'published', NOW() - INTERVAL '60 days'),

  ('APRA increases minimum capital requirements for ADIs',
   'apra-minimum-capital-adi-2026',
   'APRA has finalised APS 110 revisions increasing minimum CET1 capital ratios for all authorised deposit-taking institutions from 4.5% to 5.0%, effective 1 January 2027. The buffer increase is designed to absorb potential losses from commercial property lending exposure. No immediate impact on deposit rates expected.',
   'low', 'APRA', 'https://apra.gov.au', '2027-01-01', 'published', NOW() - INTERVAL '7 days'),

  ('Critical Minerals Strategic Reserve Bill passes Federal Parliament',
   'critical-minerals-strategic-reserve-bill-2026',
   'The Export Finance and Insurance Corporation Amendment (Strategic Reserve) Bill 2026 has passed both houses of Federal Parliament. The Bill expands Export Finance Australia''s powers to facilitate critical minerals supply chain development and establishes the $1.2 billion Critical Minerals Strategic Reserve, operational from H2 2026.',
   'medium', 'Parliament', 'https://aph.gov.au', '2026-06-01', 'published', NOW() - INTERVAL '3 days')
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 10. SEED: switch_stories (0 → 8)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.switch_stories (display_name, from_broker, to_broker, reason, story, annual_savings_cents, status, approved_at) VALUES
  ('James T.', 'CommSec', 'Stake', 'brokerage_cost', 'I was paying $29.95 per trade on CommSec for my regular DCA into VAS and VGS. Switching to Stake cut that to $3 per trade. Over 24 monthly buys per year, I save over $640 annually. The platform is simpler but does everything I need.', 64000, 'approved', NOW() - INTERVAL '10 days'),
  ('Sarah M.', 'SelfWealth', 'CMC Markets', 'features', 'SelfWealth was great when it launched, but CMC Markets now offers $0 brokerage on your first trade each day plus better international access. I trade ASX and US markets, and the CMC platform is more capable for research.', 30000, 'approved', NOW() - INTERVAL '8 days'),
  ('David L.', 'ANZ Share Investing', 'Interactive Brokers', 'international_access', 'ANZ charged $19.95 per ASX trade and didn''t support US shares at all. IBKR gives me access to 150+ markets globally at rock-bottom rates. As an expat investing from Singapore, IBKR is the only platform that actually works for me.', 120000, 'approved', NOW() - INTERVAL '6 days'),
  ('Michelle K.', 'Raiz', 'Vanguard Personal Investor', 'fees', 'Raiz was costing me 0.275% in platform fees on a growing balance. Once I had $50K invested, that was $137/year just in platform fees — before ETF MERs. VPI has no platform fee and I invest in the same Vanguard ETFs directly.', 13700, 'approved', NOW() - INTERVAL '5 days'),
  ('Tom R.', 'IG Markets', 'Pepperstone', 'spreads', 'IG''s forex spreads were consistently wider than Pepperstone on AUD/USD and EUR/USD pairs. After tracking my fills for 3 months, I was losing roughly 0.3 pips per trade. On 200 trades per month, that adds up fast.', 48000, 'approved', NOW() - INTERVAL '4 days'),
  ('Priya S.', 'Spaceship', 'Stake', 'chess_ownership', 'Spaceship holds shares in a pooled nominee structure — I never actually owned the shares directly. When I moved to Stake, my holdings are CHESS-sponsored under my own HIN. That ownership security matters to me.', 0, 'approved', NOW() - INTERVAL '3 days'),
  ('Marcus W.', 'Westpac Online Investing', 'Pearler', 'automation', 'Westpac''s interface felt like it was from 2005. Pearler lets me set up automatic recurring investments into my ETF portfolio — no manual orders every month. Plus $6.50/trade vs $19.95. The automation alone saves me hours.', 32400, 'approved', NOW() - INTERVAL '2 days'),
  ('Linda C.', 'nabtrade', 'CommSec', 'research', 'nabtrade was fine for execution, but CommSec''s research tools, analyst recommendations, and market depth display are significantly better. I''m willing to pay a bit more per trade for the research quality.', -1000, 'approved', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;
