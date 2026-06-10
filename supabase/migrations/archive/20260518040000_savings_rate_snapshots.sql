-- Migration: savings_rate_snapshots — unblocks the rate-alerts cron.
--
-- FIN_NOTEBOOK Revenue #4 ships in two halves:
--   1. Capture form + subscription table (rate_alert_subscriptions —
--      shipped today in 20260518010000).
--   2. Source-of-truth rate data + change detection (this migration +
--      a follow-up admin import flow).
--
-- Without this table, `app/api/cron/rate-alerts/route.ts` was wired but
-- a deliberate no-op because the brokers table has no rate columns. With
-- it, the cron can compare current snapshot rates against subscriber
-- thresholds and dispatch notifications.
--
-- Schema:
--   - broker_id: FK to public.brokers, the platform offering the rate
--     (only platform_type IN ('savings_account','term_deposit') is meant
--     to land here, but enforced at the import layer rather than via FK
--     constraint to keep the import flexible).
--   - product_kind: savings_account | term_deposit (denormalised from
--     brokers.platform_type for query efficiency — the rate-alerts cron
--     filters by kind first).
--   - rate_bps: integer basis points (525 = 5.25% p.a.). Always the
--     headline rate — for tiered products this is the best advertised
--     rate, with the tier conditions captured in `notes`.
--   - intro_rate_bps + intro_term_months: optional bonus / intro rate
--     and its duration. Many savers chase intro rates so the alert
--     match needs to know whether a 5.5% headline is base (sticky) or
--     intro (temporary).
--   - min_balance_cents / max_balance_cents: tier band the rate applies
--     to. Subscriber filters reference these so a user shopping for
--     a high-balance product doesn't get pinged about a $5k cap product.
--   - term_months: NULL for savings accounts, term length for TDs.
--   - captured_at: when the snapshot was taken. The cron always reads
--     the most-recent snapshot per (broker_id, product_kind, tier).
--   - source: 'manual' (admin CSV import) | 'scraped' (future) |
--     'partner_feed' (future). Telemetry for which feed introduced a
--     rate change.
--   - notes: free-text — bonus conditions ("opens new account every
--     month + 5+ debit txns"), discontinued-product warnings, etc.
--
-- RLS: public CAN read (rate data is intentionally public — this drives
-- the comparison surface). Service-role-only writes; admin imports go
-- through `app/api/admin/savings-rates/import` (next PR — schema lands
-- first so the cron + admin route can both refer to the canonical
-- shape).
--
-- Rollback:
--   DROP TABLE IF EXISTS public.savings_rate_snapshots;

BEGIN;

CREATE TABLE IF NOT EXISTS public.savings_rate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id integer NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  product_kind text NOT NULL,
  rate_bps integer NOT NULL,
  intro_rate_bps integer,
  intro_term_months integer,
  min_balance_cents bigint NOT NULL DEFAULT 0,
  max_balance_cents bigint,
  term_months integer,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  notes text NOT NULL DEFAULT '',
  CONSTRAINT savings_rate_product_kind_check CHECK (
    product_kind IN ('savings_account', 'term_deposit')
  ),
  CONSTRAINT savings_rate_source_check CHECK (
    source IN ('manual', 'scraped', 'partner_feed')
  ),
  CONSTRAINT savings_rate_rate_bps_range CHECK (rate_bps BETWEEN 0 AND 5000),
  CONSTRAINT savings_rate_intro_consistency CHECK (
    (intro_rate_bps IS NULL AND intro_term_months IS NULL)
    OR (intro_rate_bps IS NOT NULL AND intro_term_months IS NOT NULL AND intro_term_months > 0)
  )
);

-- Hot-path: rate-alerts cron wants the most-recent snapshot per
-- (broker_id, product_kind) ordered by rate. This composite supports
-- the cron's `DISTINCT ON (broker_id, product_kind) ... ORDER BY
-- broker_id, product_kind, captured_at DESC` pattern.
CREATE INDEX IF NOT EXISTS idx_savings_rate_snapshots_latest
  ON public.savings_rate_snapshots (broker_id, product_kind, captured_at DESC);

-- Subscriber-side hot path: "give me everyone whose threshold is now
-- crossed by the current best rate per product_kind". Filter on
-- product_kind + rate_bps.
CREATE INDEX IF NOT EXISTS idx_savings_rate_snapshots_kind_rate
  ON public.savings_rate_snapshots (product_kind, rate_bps DESC, captured_at DESC);

ALTER TABLE public.savings_rate_snapshots ENABLE ROW LEVEL SECURITY;

-- Rates are intentionally public — the comparison surface reads them
-- anonymously and indexed search engines should be able to crawl them.
DROP POLICY IF EXISTS "Public can read savings_rate_snapshots" ON public.savings_rate_snapshots;
CREATE POLICY "Public can read savings_rate_snapshots"
  ON public.savings_rate_snapshots FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Service role manages savings_rate_snapshots" ON public.savings_rate_snapshots;
CREATE POLICY "Service role manages savings_rate_snapshots"
  ON public.savings_rate_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.savings_rate_snapshots IS
  'Append-only rate-history for savings accounts + term deposits. Source '
  'of truth for the rate-alerts cron (FIN_NOTEBOOK Revenue #4). The most-'
  'recent row per (broker_id, product_kind, min_balance_cents) wins.';

COMMIT;
