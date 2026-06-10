-- ============================================================================
-- Migration: 010_logo_url_and_site_settings.sql
-- Purpose: Add `logo_url` column to brokers + create `site_settings`
--          key/value table seeded with twelve `autopilot_*` toggle keys
--          (defaults all 'true').
-- Rollback: REVOKE policies, DISABLE RLS, DROP table, then DROP COLUMN
--           on brokers.logo_url.
-- Risk: high — `brokers.logo_url` is read on every broker card and
--       comparison page; reverse drops every uploaded logo URL and
--       blanks the broker comparison UI. `site_settings` controls the
--       autopilot kill-switches actively read by 12 cron handlers — if
--       any cron job runs against a missing site_settings table, those
--       jobs short-circuit (the table-missing path falls back to the
--       enabled default in code, but errors will spam logs). Snapshot
--       both before any reverse migration.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE brokers ADD COLUMN IF NOT EXISTS logo_url TEXT.
--   2. CREATE TABLE IF NOT EXISTS site_settings
--        (key TEXT PK, value TEXT NOT NULL DEFAULT '',
--         updated_at TIMESTAMPTZ DEFAULT now()).
--   3. INSERT 12 autopilot toggle rows (autopilot_enabled +
--      autopilot_<job> for check-fees, expire-deals, marketplace-stats,
--      quiz-follow-up, auto-publish, content-staleness,
--      check-affiliate-links, low-balance-alerts, welcome-drip,
--      weekly-newsletter, retry-webhooks) with value 'true',
--      ON CONFLICT (key) DO NOTHING.
--   4. ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY.
--   5. CREATE POLICY "Authenticated users can read site_settings"
--        FOR SELECT TO authenticated USING (true).
--   6. CREATE POLICY "Authenticated users can update site_settings"
--        FOR UPDATE TO authenticated USING (true).
--   7. CREATE POLICY "Authenticated users can insert site_settings"
--        FOR INSERT TO authenticated WITH CHECK (true).
--
-- Rollback (in reverse order):
--   7. DROP POLICY IF EXISTS "Authenticated users can insert site_settings"
--        ON site_settings;
--   6. DROP POLICY IF EXISTS "Authenticated users can update site_settings"
--        ON site_settings;
--   5. DROP POLICY IF EXISTS "Authenticated users can read site_settings"
--        ON site_settings;
--   4. ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
--   3. -- Seed inserts disappear with the table DROP at step 2; no
--      -- separate inverse DELETE needed.
--   2. DROP TABLE IF EXISTS site_settings;
--      -- DESTRUCTIVE: removes every autopilot kill-switch override
--      -- (operator-set 'false' values are lost; jobs revert to
--      -- code-default 'enabled' on next run).
--   1. ALTER TABLE brokers DROP COLUMN IF EXISTS logo_url;
--      -- DESTRUCTIVE: drops every uploaded broker logo URL on
--      -- populated rows. Snapshot first.
-- ============================================================================

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
