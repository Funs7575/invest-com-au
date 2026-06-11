-- Migration: rate-alert mailer support
--
-- Three pieces, all required by the rate-alert mailer + manage-prefs work:
--
--   1. investment_loan_rates — resurrects the table from the archived
--      pre-squash migration (20260525_investment_loan_rates.sql). The table
--      never reached prod (supabase-migrate.yml secret-precheck green-skip,
--      see docs/audits/SCHEMA-DRIFT-2026-06-05.md), leaving
--      /api/cron/refresh-loan-rates fully broken and /api/cron/rate-alerts
--      partial (loan_rate subscriptions silently skipped). Purely factual
--      public market data: anon/authenticated SELECT, service_role writes.
--
--   2. rate_alert_subscriptions.product_kind CHECK relaxation — prod only
--      allows ('savings_account','term_deposit'), but /api/account/alerts
--      maps loan_rate/broker_fee metric kinds into product_kind, so creating
--      those alerts 23514-fails today. Adds 'loan' and 'brokerage'.
--
--   3. rate_alert_sends — per-subscription send log giving the mailer cron
--      DB-enforced idempotency (unique (subscription_id, period_key); one
--      send per subscription per UTC day). Mirrors the pro_digest_sends
--      service_role-only pattern. The cron degrades gracefully when this
--      table is absent (falls back to last_notified_at stamping), so the
--      code can ship ahead of the push.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.rate_alert_sends;
--   DROP TABLE IF EXISTS public.investment_loan_rates;
--   ALTER TABLE public.rate_alert_subscriptions
--     DROP CONSTRAINT IF EXISTS rate_alert_subscriptions_product_kind_check;
--   ALTER TABLE public.rate_alert_subscriptions
--     ADD CONSTRAINT rate_alert_subscriptions_product_kind_check
--     CHECK (product_kind = ANY (ARRAY['savings_account'::text, 'term_deposit'::text]));
--   (Re-tightening the CHECK requires deleting any 'loan'/'brokerage' rows first.)

-- ── 1. investment_loan_rates ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investment_loan_rates (
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

ALTER TABLE public.investment_loan_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_loan_rates FORCE ROW LEVEL SECURITY;

-- Drop first so re-runs are idempotent.
DROP POLICY IF EXISTS "investment_loan_rates_anon_select" ON public.investment_loan_rates;
DROP POLICY IF EXISTS "investment_loan_rates_service_role_all" ON public.investment_loan_rates;

-- Any visitor (including anonymous users) can read rates — public factual data.
CREATE POLICY "investment_loan_rates_anon_select"
  ON public.investment_loan_rates
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cron and admin routes use the service role for mutations.
CREATE POLICY "investment_loan_rates_service_role_all"
  ON public.investment_loan_rates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed (idempotent upsert on lender_slug) — values from the archived
-- migration, themselves transcribed from the hardcoded LENDERS array that
-- existed in app/property/finance/page.tsx. apply_url defaults to the
-- in-app mortgage broker finder; update per-lender when direct landing-page
-- URLs are available.
INSERT INTO public.investment_loan_rates
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

-- ── 2. Relax rate_alert_subscriptions.product_kind CHECK ─────────────────────
-- Find the existing product_kind CHECK by definition (its auto-generated name
-- may vary) and replace it only if it doesn't already allow 'loan'.

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.rate_alert_subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%product_kind%'
      AND pg_get_constraintdef(oid) NOT ILIKE '%loan%'
  LOOP
    EXECUTE format('ALTER TABLE public.rate_alert_subscriptions DROP CONSTRAINT %I', c.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.rate_alert_subscriptions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%product_kind%'
  ) THEN
    ALTER TABLE public.rate_alert_subscriptions
      ADD CONSTRAINT rate_alert_subscriptions_product_kind_check
      CHECK (product_kind = ANY (ARRAY['savings_account'::text, 'term_deposit'::text, 'loan'::text, 'brokerage'::text]));
  END IF;
END $$;

-- ── 3. rate_alert_sends — idempotent send log ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_alert_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.rate_alert_subscriptions(id) ON DELETE CASCADE,
  -- UTC-day bucket (e.g. 'd20617') — unique per subscription, so a
  -- concurrent double-run of the cron can never double-send within a day.
  period_key      text NOT NULL,
  kind            text NOT NULL DEFAULT 'threshold'
                  CHECK (kind = ANY (ARRAY['threshold'::text, 'rate_change'::text])),
  sent_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_alert_sends_sub_period_uq
  ON public.rate_alert_sends (subscription_id, period_key);
CREATE INDEX IF NOT EXISTS rate_alert_sends_sent_at_idx
  ON public.rate_alert_sends (sent_at DESC);

ALTER TABLE public.rate_alert_sends ENABLE ROW LEVEL SECURITY;

-- Cron-only table — service_role exclusively (pro_digest_sends pattern).
DROP POLICY IF EXISTS "rate_alert_sends_service_role_all" ON public.rate_alert_sends;
CREATE POLICY "rate_alert_sends_service_role_all"
  ON public.rate_alert_sends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
