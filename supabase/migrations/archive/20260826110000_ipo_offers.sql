-- Migration: ipo_offers + ipo_watchlist + ipo_alert_sends
--
-- Adds:
--   ipo_offers        — canonical list of ASX IPOs (managed by admins/cron)
--   ipo_watchlist     — users subscribe to alert types per IPO
--   ipo_alert_sends   — dedup log; prevents duplicate alert emails per user/ipo/alert_type
--
-- Rollback:
--   DROP TABLE IF EXISTS ipo_alert_sends, ipo_watchlist, ipo_offers CASCADE;

BEGIN;

-- ── ipo_offers ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ipo_offers (
  id                       bigserial PRIMARY KEY,
  asx_code                 text,
  company_name             text NOT NULL,
  sector                   text,
  offer_type               text NOT NULL DEFAULT 'ipo'
                           CHECK (offer_type IN ('ipo', 'spac', 'reit', 'trust', 'other')),
  status                   text NOT NULL DEFAULT 'upcoming'
                           CHECK (status IN ('upcoming', 'open', 'closed', 'listed', 'withdrawn')),
  offer_open_date          date,
  offer_close_date         date,
  listing_date             date,
  issue_price_cents        integer,
  amount_raised_cents      bigint,
  minimum_application_cents integer,
  first_day_return_pct     numeric(5, 2),
  description              text,
  prospectus_url           text,
  note                     text,
  is_published             boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipo_offers_status
  ON ipo_offers (status, listing_date DESC)
  WHERE is_published = true;

ALTER TABLE ipo_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_offers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipo_offers_public_read"  ON ipo_offers;
DROP POLICY IF EXISTS "ipo_offers_service_all"  ON ipo_offers;

CREATE POLICY "ipo_offers_public_read"
  ON ipo_offers FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

CREATE POLICY "ipo_offers_service_all"
  ON ipo_offers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── ipo_watchlist ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ipo_watchlist (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  ipo_id      bigint NOT NULL REFERENCES ipo_offers (id) ON DELETE CASCADE,
  alert_type  text NOT NULL
              CHECK (alert_type IN ('open', 'close', 'listing', 'prospectus')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ipo_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_ipo_watchlist_user
  ON ipo_watchlist (user_id);

CREATE INDEX IF NOT EXISTS idx_ipo_watchlist_ipo
  ON ipo_watchlist (ipo_id);

ALTER TABLE ipo_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_watchlist FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipo_watchlist_own_read"    ON ipo_watchlist;
DROP POLICY IF EXISTS "ipo_watchlist_own_insert"  ON ipo_watchlist;
DROP POLICY IF EXISTS "ipo_watchlist_own_delete"  ON ipo_watchlist;
DROP POLICY IF EXISTS "ipo_watchlist_service_all" ON ipo_watchlist;

CREATE POLICY "ipo_watchlist_own_read"
  ON ipo_watchlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ipo_watchlist_own_insert"
  ON ipo_watchlist FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ipo_watchlist_own_delete"
  ON ipo_watchlist FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ipo_watchlist_service_all"
  ON ipo_watchlist FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── ipo_alert_sends ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ipo_alert_sends (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL,
  ipo_id      bigint NOT NULL,
  alert_type  text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, ipo_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_ipo_alert_sends_ipo
  ON ipo_alert_sends (ipo_id, alert_type);

ALTER TABLE ipo_alert_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_alert_sends FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ipo_alert_sends_service_all" ON ipo_alert_sends;

CREATE POLICY "ipo_alert_sends_service_all"
  ON ipo_alert_sends FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed data ──────────────────────────────────────────────────────────────────
-- Editorial seed of recent and upcoming ASX IPOs for display at launch.
-- Admin panel / future live-feed cron will manage ongoing updates.

INSERT INTO ipo_offers (
  asx_code, company_name, sector, offer_type, status,
  listing_date, issue_price_cents, amount_raised_cents,
  first_day_return_pct, note, is_published
) VALUES
  ('GYG',    'Guzman y Gomez',            'Consumer (Restaurants)', 'ipo', 'listed',
   '2024-06-01', 2200, 33500000000, 36.00,   'First-day pop ~36%',             true),
  ('DGT',    'DigiCo Infrastructure REIT', 'Infrastructure REIT',   'reit', 'listed',
   '2024-12-01', 500,  200000000000, NULL,   'Largest 2024 ASX IPO by raise',  true),
  ('ARI',    'Aerison Group',              'Industrial services',    'ipo', 'listed',
   '2025-01-01', 150,  6000000000,  NULL,   'Mid-cap industrial',             true),
  ('VIRGIN', 'Virgin Australia',           'Aviation',               'ipo', 'upcoming',
   NULL,         NULL, 68500000000, NULL,   'Bain Capital re-list; date TBC', true)
ON CONFLICT DO NOTHING;

COMMIT;
