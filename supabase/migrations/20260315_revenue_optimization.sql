-- ═══════════════════════════════════════════════════════════
-- Revenue Optimization Migration
-- Adds CPA tracking, revenue scoring, advisor tiers,
-- materialized view, analytics views, and email funnel tables
-- ═══════════════════════════════════════════════════════════

-- ── 1. BROKER REVENUE FIELDS ──────────────────────────────
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cpa_value INTEGER; -- CPA in dollars ($400 = 400)
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS affiliate_priority TEXT CHECK (affiliate_priority IN ('high', 'medium', 'low'));
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS monthly_sponsorship_fee INTEGER DEFAULT 0;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS promoted_placement BOOLEAN DEFAULT false;
-- deal_expiry, deal_text, deal_category already exist; add deal_description if missing
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS deal_description TEXT;
-- fee_last_checked already exists; ensure it exists
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS fee_last_checked TIMESTAMPTZ;

-- Set default CPA priorities based on existing sponsorship_tier
UPDATE brokers SET affiliate_priority = 'high'   WHERE sponsorship_tier IN ('gold', 'platinum') AND affiliate_priority IS NULL;
UPDATE brokers SET affiliate_priority = 'medium'  WHERE sponsorship_tier = 'silver'              AND affiliate_priority IS NULL;
UPDATE brokers SET affiliate_priority = 'low'     WHERE affiliate_priority IS NULL;

-- ── 2. REVENUE SCORING FUNCTION ──────────────────────────
CREATE OR REPLACE FUNCTION calculate_broker_revenue_score(
  p_rating        NUMERIC,
  p_cpa_value     INTEGER,
  p_has_deal      BOOLEAN,
  p_has_chess     BOOLEAN,
  p_promoted      BOOLEAN,
  p_editors_pick  BOOLEAN
) RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC;
BEGIN
  score :=
    (COALESCE(p_rating, 0) * 0.3) +
    ((COALESCE(p_cpa_value, 0)::NUMERIC / 50.0) * 0.4) +
    (CASE WHEN p_has_deal       THEN 1.5 ELSE 0 END) +
    (CASE WHEN p_has_chess      THEN 0.5 ELSE 0 END) +
    (CASE WHEN p_promoted       THEN 3.0 ELSE 0 END) +
    (CASE WHEN p_editors_pick   THEN 1.0 ELSE 0 END);
  RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── 3. ADVISOR TIERS TABLE ───────────────────────────────
CREATE TABLE IF NOT EXISTS advisor_tiers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL CHECK (name IN ('bronze', 'silver', 'gold')),
  monthly_fee   INTEGER NOT NULL DEFAULT 0,   -- AUD cents
  lead_fee      INTEGER NOT NULL DEFAULT 10000, -- AUD cents per lead
  match_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  features      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE advisor_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read advisor_tiers" ON advisor_tiers FOR SELECT USING (true);

-- Seed tiers (idempotent)
INSERT INTO advisor_tiers (name, monthly_fee, lead_fee, match_multiplier, features) VALUES
  ('bronze', 0,     10000, 1.0, '["Directory listing", "Profile page", "Organic matches only"]'),
  ('silver', 20000, 8000,  2.0, '["Everything in Bronze", "Featured badge", "Priority in search", "2x match rate"]'),
  ('gold',   50000, 6000,  4.0, '["Everything in Silver", "Homepage spotlight", "Article bylines", "Quarterly email blast", "4x match rate"]')
ON CONFLICT DO NOTHING;

-- Add tier column to professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_tier TEXT DEFAULT 'bronze' CHECK (advisor_tier IN ('bronze', 'silver', 'gold'));
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS total_leads_received INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS leads_accepted INTEGER DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_lead_date TIMESTAMPTZ;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_nudge_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_professionals_tier ON professionals(advisor_tier);
CREATE INDEX IF NOT EXISTS idx_professionals_featured ON professionals(featured_until) WHERE featured_until IS NOT NULL;

-- ── 4. LEADS TABLE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type         TEXT NOT NULL CHECK (lead_type IN ('advisor', 'platform')),

  -- Advisor leads
  professional_id   INTEGER REFERENCES professionals(id),
  advisor_specialty TEXT,

  -- Platform/affiliate leads
  broker_id         BIGINT REFERENCES brokers(id),
  affiliate_click_id TEXT,

  -- User data
  user_email        TEXT NOT NULL,
  user_phone        TEXT,
  user_name         TEXT,
  user_location_state TEXT,
  user_intent       JSONB,

  -- Revenue
  revenue_value_cents INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'rejected', 'converted')),

  -- Attribution
  source_page       TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  converted_at      TIMESTAMPTZ
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on leads" ON leads FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_leads_type        ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_professional ON leads(professional_id);

-- ── 5. EMAIL SUBSCRIBERS TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS email_subscribers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  segment         TEXT CHECK (segment IN ('platform_seeker', 'advisor_seeker', 'both', 'newsletter')),
  quiz_responses  JSONB,
  lead_magnet     TEXT,
  report_data     JSONB,
  subscribed_at   TIMESTAMPTZ DEFAULT NOW(),
  last_email_opened_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  source_page     TEXT,
  utm_params      JSONB
);
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert email_subscribers" ON email_subscribers FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email   ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_segment ON email_subscribers(segment);

-- ── 6. EMAIL CAMPAIGNS TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS email_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name    TEXT NOT NULL,
  segment          TEXT,
  subject_line     TEXT,
  sent_at          TIMESTAMPTZ,
  total_sent       INTEGER DEFAULT 0,
  total_opened     INTEGER DEFAULT 0,
  total_clicked    INTEGER DEFAULT 0,
  revenue_generated_cents INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on email_campaigns" ON email_campaigns FOR ALL USING (false);

-- ── 7. ARTICLE REVENUE TRACKING FIELDS ─────────────────
ALTER TABLE articles ADD COLUMN IF NOT EXISTS primary_broker_ids    BIGINT[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS expected_rev_per_visit NUMERIC DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_visits          INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_affiliate_clicks INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_conversions     INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS total_revenue_cents   INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS target_keyword        TEXT;

-- ── 8. ANALYTICS EVENTS TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name  TEXT NOT NULL,
  properties  JSONB,
  session_id  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert analytics_events" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_ts   ON analytics_events(created_at DESC);

-- ── 9. DAILY REVENUE VIEW ──────────────────────────────
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT
  DATE(created_at)                                                              AS date,
  SUM(CASE WHEN lead_type = 'platform' THEN revenue_value_cents ELSE 0 END)    AS affiliate_revenue_cents,
  COUNT(CASE WHEN lead_type = 'platform' THEN 1 END)                           AS affiliate_count,
  SUM(CASE WHEN lead_type = 'advisor'  THEN revenue_value_cents ELSE 0 END)    AS advisor_revenue_cents,
  COUNT(CASE WHEN lead_type = 'advisor'  THEN 1 END)                           AS advisor_count,
  SUM(revenue_value_cents)                                                       AS total_revenue_cents,
  COUNT(*)                                                                       AS total_conversions
FROM leads
WHERE status IN ('converted', 'accepted')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ── 10. BROKER REVENUE SCORE VIEW ──────────────────────
-- A lightweight view (not materialized) sorted by revenue score.
-- Refresh logic can be added via cron if needed.
CREATE OR REPLACE VIEW brokers_revenue_ranked AS
SELECT
  *,
  calculate_broker_revenue_score(
    rating,
    cpa_value,
    (deal = true AND (deal_expiry IS NULL OR deal_expiry > NOW())),
    chess_sponsored,
    promoted_placement,
    editors_pick
  ) AS revenue_score
FROM brokers
WHERE status = 'active'
ORDER BY revenue_score DESC;
