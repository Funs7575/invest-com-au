-- ============================================================================
-- Migration: 001_initial.sql
-- Purpose: Bootstrap the original schema — six core tables (brokers,
--          articles, scenarios, affiliate_clicks, quiz_weights,
--          site_settings), enable RLS on all six, install six public-read
--          / public-insert RLS policies, and create five performance
--          indexes (broker slug/status, article slug, scenario slug,
--          affiliate_clicks broker_id).
-- Rollback: DROP every object created — five indexes, six policies, six
--          tables (all CASCADE because downstream migrations FK into
--          brokers and add columns/policies on top of every table here).
-- Risk: high (irreversible) — these tables hold every broker, article,
--       scenario, affiliate-click, quiz-weight, and site-setting row in
--       the application. CASCADE drops cascade into ~100 downstream
--       migrations' tables, indexes, FKs, and triggers. Operator MUST
--       take a full database snapshot (`pg_dump` or Supabase backup)
--       before reverting; the migration cannot recreate the row data.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE brokers (id, name, slug, color, ...).
--   2. CREATE TABLE articles (id, title, slug, excerpt, ...).
--   3. CREATE TABLE scenarios (id, title, slug, hero_title, ...).
--   4. CREATE TABLE affiliate_clicks (id, broker_id FK→brokers, ...).
--   5. CREATE TABLE quiz_weights (id, broker_id FK→brokers, ...).
--   6. CREATE TABLE site_settings (id, key, value, ...).
--   7. ALTER TABLE ... ENABLE ROW LEVEL SECURITY on all six tables.
--   8. CREATE POLICY "Public read for active brokers" ON brokers.
--   9. CREATE POLICY "Public read articles" ON articles.
--  10. CREATE POLICY "Public read scenarios" ON scenarios.
--  11. CREATE POLICY "Insert clicks" ON affiliate_clicks.
--  12. CREATE POLICY "Public read quiz weights" ON quiz_weights.
--  13. CREATE POLICY "Public read settings" ON site_settings.
--  14. CREATE INDEX idx_brokers_slug, idx_brokers_status,
--      idx_articles_slug, idx_scenarios_slug,
--      idx_affiliate_clicks_broker_id.
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): take a full pg_dump / Supabase snapshot. Every
--   -- broker, article, scenario, click, quiz weight, and site setting
--   -- will be lost; downstream migrations that FK into brokers (campaigns,
--   -- user_reviews, switch_stories, broker_questions, etc.) will also
--   -- be dropped via CASCADE.
--  14. DROP INDEX IF EXISTS idx_affiliate_clicks_broker_id;
--      DROP INDEX IF EXISTS idx_scenarios_slug;
--      DROP INDEX IF EXISTS idx_articles_slug;
--      DROP INDEX IF EXISTS idx_brokers_status;
--      DROP INDEX IF EXISTS idx_brokers_slug;
--  13. DROP POLICY IF EXISTS "Public read settings" ON site_settings;
--  12. DROP POLICY IF EXISTS "Public read quiz weights" ON quiz_weights;
--  11. DROP POLICY IF EXISTS "Insert clicks" ON affiliate_clicks;
--  10. DROP POLICY IF EXISTS "Public read scenarios" ON scenarios;
--   9. DROP POLICY IF EXISTS "Public read articles" ON articles;
--   8. DROP POLICY IF EXISTS "Public read for active brokers" ON brokers;
--   7. (RLS toggles drop with the tables.)
--   6. DROP TABLE IF EXISTS site_settings CASCADE;
--   5. DROP TABLE IF EXISTS quiz_weights CASCADE;
--   4. DROP TABLE IF EXISTS affiliate_clicks CASCADE;
--   3. DROP TABLE IF EXISTS scenarios CASCADE;
--   2. DROP TABLE IF EXISTS articles CASCADE;
--   1. DROP TABLE IF EXISTS brokers CASCADE;
--      -- DESTRUCTIVE: collapses the entire application schema. Restore
--      -- from snapshot is the only recovery path.
-- ============================================================================

-- Create brokers table
CREATE TABLE brokers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  icon TEXT,
  cta_text TEXT,
  tagline TEXT,
  asx_fee TEXT,
  asx_fee_value NUMERIC(10,2),
  us_fee TEXT,
  us_fee_value NUMERIC(10,2),
  fx_rate NUMERIC(5,3),
  chess_sponsored BOOLEAN DEFAULT FALSE,
  inactivity_fee TEXT,
  payment_methods JSONB DEFAULT '[]'::jsonb,
  smsf_support BOOLEAN DEFAULT FALSE,
  is_crypto BOOLEAN DEFAULT FALSE,
  min_deposit TEXT,
  platforms JSONB DEFAULT '[]'::jsonb,
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  affiliate_url TEXT,
  rating NUMERIC(3,1),
  layer TEXT,
  deal BOOLEAN DEFAULT FALSE,
  editors_pick BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  review_content TEXT,
  fee_audit JSONB,
  markets JSONB,
  regulated_by TEXT,
  year_founded INTEGER,
  headquarters TEXT,
  deal_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create articles table
CREATE TABLE articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  category TEXT,
  content TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  read_time INTEGER,
  related_brokers JSONB DEFAULT '[]'::jsonb,
  related_calc TEXT,
  evergreen BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scenarios table
CREATE TABLE scenarios (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  hero_title TEXT,
  icon TEXT,
  problem TEXT,
  solution TEXT,
  brokers JSONB DEFAULT '[]'::jsonb,
  considerations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create affiliate_clicks table
CREATE TABLE affiliate_clicks (
  id BIGSERIAL PRIMARY KEY,
  broker_id BIGINT REFERENCES brokers(id),
  broker_name TEXT,
  broker_slug TEXT,
  source TEXT,
  page TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_weights table
CREATE TABLE quiz_weights (
  id BIGSERIAL PRIMARY KEY,
  broker_id BIGINT REFERENCES brokers(id),
  broker_slug TEXT,
  beginner_weight INTEGER DEFAULT 0,
  low_fee_weight INTEGER DEFAULT 0,
  us_shares_weight INTEGER DEFAULT 0,
  smsf_weight INTEGER DEFAULT 0,
  crypto_weight INTEGER DEFAULT 0,
  advanced_weight INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create site_settings table
CREATE TABLE site_settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Public read for active brokers" ON brokers FOR SELECT USING (status = 'active');
CREATE POLICY "Public read articles" ON articles FOR SELECT USING (TRUE);
CREATE POLICY "Public read scenarios" ON scenarios FOR SELECT USING (TRUE);
CREATE POLICY "Insert clicks" ON affiliate_clicks FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Public read quiz weights" ON quiz_weights FOR SELECT USING (TRUE);
CREATE POLICY "Public read settings" ON site_settings FOR SELECT USING (TRUE);

-- Create indexes for performance
CREATE INDEX idx_brokers_slug ON brokers(slug);
CREATE INDEX idx_brokers_status ON brokers(status);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_scenarios_slug ON scenarios(slug);
CREATE INDEX idx_affiliate_clicks_broker_id ON affiliate_clicks(broker_id);
