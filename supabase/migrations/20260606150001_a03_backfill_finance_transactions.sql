-- ============================================================================
-- Migration: Backfill public.finance_transactions (A-03 batch 2 of ~8)
-- Date:      2026-05-01 (queued under 20260606 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `finance_transactions` exists in `lib/database.types.ts` and is used by
--   the admin finance page for internal transaction tracking. No CREATE TABLE
--   migration exists. This migration brings the schema declaration in-tree.
--
-- Callers (client type):
--   - app/admin/finance/page.tsx: createClient (browser, authenticated admin)
--     — full CRUD (SELECT/INSERT/UPDATE/DELETE).
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*finance_transactions|finance_transactions.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — future cron/admin API access.
--   - Admin FOR ALL: authenticated admin users (browser client) — finance management.
--   - anon: no policy — internal ledger must not be publicly readable.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.finance_transactions;
--     DROP POLICY IF EXISTS "admin full access"        ON public.finance_transactions;
--     ALTER TABLE public.finance_transactions DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.finance_transactions; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id                  SERIAL PRIMARY KEY,
  date                DATE        NOT NULL,
  type                TEXT        NOT NULL,
  category            TEXT        NOT NULL,
  description         TEXT        NOT NULL,
  amount_cents        INTEGER     NOT NULL,
  counterparty        TEXT,
  reference           TEXT,
  recurring           BOOLEAN     DEFAULT false,
  recurring_interval  TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_date
  ON public.finance_transactions (date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_type
  ON public.finance_transactions (type);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.finance_transactions;
CREATE POLICY "service_role full access"
  ON public.finance_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin full access" ON public.finance_transactions;
CREATE POLICY "admin full access"
  ON public.finance_transactions
  FOR ALL TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
