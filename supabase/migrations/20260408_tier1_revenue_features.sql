-- ============================================================
-- Tier 1 Revenue Features Migration
-- Features: Signup Tracking, A/B Testing, Drip Funnel
-- ============================================================

-- ── Feature 1: Broker Signup Tracking ───────────────────────

CREATE TABLE IF NOT EXISTS broker_signups (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER REFERENCES brokers(id),
  broker_slug TEXT NOT NULL,
  click_id TEXT,
  signup_date TIMESTAMPTZ DEFAULT NOW(),
  revenue_cents INTEGER DEFAULT 0,
  commission_type TEXT CHECK (commission_type IN ('cpa', 'revshare', 'hybrid')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'paid')),
  source TEXT DEFAULT 'postback',
  external_ref TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signups_broker ON broker_signups(broker_slug);
CREATE INDEX IF NOT EXISTS idx_signups_click ON broker_signups(click_id);
CREATE INDEX IF NOT EXISTS idx_signups_date ON broker_signups(signup_date DESC);
CREATE INDEX IF NOT EXISTS idx_signups_status ON broker_signups(status);

ALTER TABLE broker_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read signups" ON broker_signups FOR SELECT USING (true);
CREATE POLICY "Service insert signups" ON broker_signups FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS affiliate_monthly_reports (
  id SERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  broker_slug TEXT NOT NULL,
  broker_name TEXT,
  total_clicks INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  conversion_rate NUMERIC(6,4),
  epc_cents NUMERIC(10,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, broker_slug)
);

ALTER TABLE affiliate_monthly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read reports" ON affiliate_monthly_reports FOR SELECT USING (true);
CREATE POLICY "Service write reports" ON affiliate_monthly_reports FOR ALL USING (true);

-- ── Feature 2: Site-wide A/B Testing ────────────────────────

CREATE TABLE IF NOT EXISTS site_ab_tests (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('cta_copy', 'cta_color', 'cta_placement', 'layout', 'redirect_vs_apply')),
  page TEXT NOT NULL DEFAULT '/compare',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variant_a JSONB NOT NULL DEFAULT '{}',
  variant_b JSONB NOT NULL DEFAULT '{}',
  traffic_split INTEGER DEFAULT 50 CHECK (traffic_split BETWEEN 1 AND 99),
  impressions_a INTEGER DEFAULT 0,
  impressions_b INTEGER DEFAULT 0,
  clicks_a INTEGER DEFAULT 0,
  clicks_b INTEGER DEFAULT 0,
  conversions_a INTEGER DEFAULT 0,
  conversions_b INTEGER DEFAULT 0,
  winner TEXT CHECK (winner IN ('a', 'b')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage ab tests" ON site_ab_tests FOR ALL USING (true);

-- ── Feature 4: Enhanced Drip Funnel ─────────────────────────

ALTER TABLE investor_drip_log ADD COLUMN IF NOT EXISTS drip_type TEXT DEFAULT 'investor';
ALTER TABLE investor_drip_log ADD COLUMN IF NOT EXISTS broker_recommendations JSONB;
ALTER TABLE investor_drip_log ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE investor_drip_log ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS drip_affiliate_clicks (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  drip_number INTEGER NOT NULL,
  broker_slug TEXT NOT NULL,
  click_id TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drip_clicks_email ON drip_affiliate_clicks(email);
CREATE INDEX IF NOT EXISTS idx_drip_clicks_broker ON drip_affiliate_clicks(broker_slug);

ALTER TABLE drip_affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manage drip clicks" ON drip_affiliate_clicks FOR ALL USING (true);
