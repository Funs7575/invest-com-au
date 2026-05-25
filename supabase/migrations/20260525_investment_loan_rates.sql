-- Migration: investment_loan_rates
-- Creates the investment_loan_rates table, seeds it with the lender data
-- previously hardcoded in app/property/finance/page.tsx, and applies RLS.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS investment_loan_rates;
--   (All data is re-seeded on re-apply; no dependent objects exist at this point.)

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS investment_loan_rates (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_name          text    NOT NULL,
  lender_slug          text    NOT NULL UNIQUE,
  rate_pct             numeric NOT NULL,
  comparison_rate_pct  numeric NOT NULL,
  max_lvr              int     NOT NULL,
  interest_only        bool    NOT NULL DEFAULT false,
  offset_available     bool    NOT NULL DEFAULT false,
  min_loan_cents       bigint  NOT NULL,
  apply_url            text    NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE investment_loan_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_loan_rates FORCE ROW LEVEL SECURITY;

-- Drop first so re-runs are idempotent.
DROP POLICY IF EXISTS "investment_loan_rates_anon_select" ON investment_loan_rates;
DROP POLICY IF EXISTS "investment_loan_rates_service_role_all" ON investment_loan_rates;

-- Any visitor (including anonymous users) can read rates — this is public data.
CREATE POLICY "investment_loan_rates_anon_select"
  ON investment_loan_rates
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cron and admin routes use the service role for mutations.
CREATE POLICY "investment_loan_rates_service_role_all"
  ON investment_loan_rates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed (idempotent upsert on lender_slug) ───────────────────────────────────
-- Values transcribed from the hardcoded LENDERS array that existed in
-- app/property/finance/page.tsx at the time of this migration.
-- apply_url defaults to the in-app mortgage broker finder; update per-lender
-- when direct affiliate or landing-page URLs are available.

INSERT INTO investment_loan_rates
  (lender_name, lender_slug, rate_pct, comparison_rate_pct, max_lvr, interest_only, offset_available, min_loan_cents, apply_url)
VALUES
  ('Commonwealth Bank', 'commonwealth-bank', 6.49, 6.55, 80, true,  true,  10000000, '/find-advisor?type=mortgage-brokers'),
  ('Westpac',           'westpac',           6.39, 6.48, 80, true,  true,  15000000, '/find-advisor?type=mortgage-brokers'),
  ('ANZ',               'anz',               6.44, 6.50, 80, true,  true,   5000000, '/find-advisor?type=mortgage-brokers'),
  ('NAB',               'nab',               6.54, 6.59, 80, true,  true,  10000000, '/find-advisor?type=mortgage-brokers'),
  ('Macquarie Bank',    'macquarie-bank',    6.19, 6.22, 70, false, true,  20000000, '/find-advisor?type=mortgage-brokers'),
  ('Pepper Money',      'pepper-money',      6.79, 6.99, 90, true,  false,  5000000, '/find-advisor?type=mortgage-brokers'),
  ('Liberty Financial', 'liberty-financial', 6.69, 6.85, 85, true,  false,  5000000, '/find-advisor?type=mortgage-brokers'),
  ('ING',               'ing',               6.29, 6.35, 80, false, true,  15000000, '/find-advisor?type=mortgage-brokers')
ON CONFLICT (lender_slug) DO NOTHING;
