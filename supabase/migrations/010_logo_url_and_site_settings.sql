-- Migration 010: Add logo_url to brokers and create site_settings table
-- logo_url: stores the URL to each broker's actual logo image
-- site_settings: key-value store for admin toggles (Autopilot, etc.)

-- 1. Add logo_url column to brokers
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create site_settings table for admin configuration
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default autopilot settings (all enabled by default)
INSERT INTO site_settings (key, value) VALUES
  ('autopilot_enabled', 'true'),
  ('autopilot_check-fees', 'true'),
  ('autopilot_expire-deals', 'true'),
  ('autopilot_marketplace-stats', 'true'),
  ('autopilot_quiz-follow-up', 'true'),
  ('autopilot_auto-publish', 'true'),
  ('autopilot_content-staleness', 'true'),
  ('autopilot_check-affiliate-links', 'true'),
  ('autopilot_low-balance-alerts', 'true'),
  ('autopilot_welcome-drip', 'true'),
  ('autopilot_weekly-newsletter', 'true'),
  ('autopilot_retry-webhooks', 'true')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (admin only in practice)
CREATE POLICY "Authenticated users can read site_settings"
  ON site_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update site_settings"
  ON site_settings FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert site_settings"
  ON site_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);
