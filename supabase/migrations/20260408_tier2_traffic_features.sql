-- ============================================================
-- Tier 2 Traffic Features Migration
-- Features: Fee Alerts, Suburb Guides, Newsletter Archive
-- ============================================================

-- ── Feature 7: Fee Alert Subscriptions (formalize) ──────────

CREATE TABLE IF NOT EXISTS fee_alert_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  broker_slugs TEXT[] DEFAULT '{}',
  alert_type TEXT DEFAULT 'any' CHECK (alert_type IN ('any', 'increase', 'decrease')),
  frequency TEXT DEFAULT 'instant' CHECK (frequency IN ('instant', 'weekly')),
  verified BOOLEAN DEFAULT false,
  verify_token TEXT,
  unsubscribe_token TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_alert_subs_verified ON fee_alert_subscriptions(verified, frequency);

ALTER TABLE fee_alert_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert fee alerts" ON fee_alert_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own fee alerts" ON fee_alert_subscriptions FOR SELECT USING (true);
CREATE POLICY "Service update fee alerts" ON fee_alert_subscriptions FOR UPDATE USING (true);

-- ── Feature 9: Suburb Investment Guides ─────────────────────

ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS investment_summary TEXT;
ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS infrastructure_notes TEXT;
ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS schools_rating NUMERIC(3,1);
ALTER TABLE suburb_data ADD COLUMN IF NOT EXISTS transport_rating NUMERIC(3,1);

-- Backfill slugs from suburb + state
UPDATE suburb_data SET slug = lower(regexp_replace(suburb, '[^a-zA-Z0-9]', '-', 'g')) || '-' || lower(state)
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_suburb_data_slug ON suburb_data(slug);

-- ── Feature 10: Newsletter Archive ──────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_sends (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  edition_date TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, edition_date)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_edition ON newsletter_sends(edition_date);

ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service manage newsletter sends" ON newsletter_sends FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS newsletter_editions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  edition_date TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  fee_changes_count INTEGER DEFAULT 0,
  articles_count INTEGER DEFAULT 0,
  deals_count INTEGER DEFAULT 0,
  subscribers_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE newsletter_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read newsletter editions" ON newsletter_editions FOR SELECT USING (true);
CREATE POLICY "Service write newsletter editions" ON newsletter_editions FOR ALL USING (true);

-- Ensure email_captures has newsletter columns
ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS newsletter_opt_in BOOLEAN DEFAULT false;
ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false;
ALTER TABLE email_captures ADD COLUMN IF NOT EXISTS last_newsletter_at TIMESTAMPTZ;
