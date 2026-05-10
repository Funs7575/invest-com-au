-- ============================================================================
-- Migration: 20260510140000_investor_holdings.sql
-- Purpose: Investor manual-holdings tracker for /account/holdings (PR-X5c
--          collapsed: skipping the separate investor_profiles intermediary
--          since auth.users + the existing /account/profile already cover
--          identity. Holdings FK to auth.users directly.
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md Phase 1 X5c
-- Risk: low — additive table; RLS-scoped per-user; no public read.
-- Rollback: DROP TABLE IF EXISTS public.investor_holdings;
--           (DESTRUCTIVE — discards user-entered holdings. There is no seed
--           data to restore — users would need to re-enter manually.)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_holdings (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker          text   NOT NULL CHECK (length(ticker) > 0 AND length(ticker) <= 30),
  exchange        text   NOT NULL CHECK (exchange IN (
                    'ASX','NASDAQ','NYSE','LSE','HKEX','SGX','TYO','KRX','CRYPTO','OTHER'
                  )),
  shares          numeric(20, 8) NOT NULL CHECK (shares > 0),
  cost_basis_per_share_cents bigint NOT NULL CHECK (cost_basis_per_share_cents >= 0),
  acquired_at     date NOT NULL,
  broker_slug     text,                                  -- which broker holds it (free-text; FK-soft to brokers.slug)
  notes           text CHECK (notes IS NULL OR length(notes) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_holdings_user
  ON public.investor_holdings (auth_user_id, acquired_at DESC);

CREATE INDEX IF NOT EXISTS idx_investor_holdings_ticker_lookup
  ON public.investor_holdings (ticker, exchange);

ALTER TABLE public.investor_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_holdings FORCE ROW LEVEL SECURITY;

-- Authenticated users see / write ONLY their own rows.
DROP POLICY IF EXISTS "investor reads own holdings" ON public.investor_holdings;
CREATE POLICY "investor reads own holdings"
  ON public.investor_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor inserts own holdings" ON public.investor_holdings;
CREATE POLICY "investor inserts own holdings"
  ON public.investor_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own holdings" ON public.investor_holdings;
CREATE POLICY "investor updates own holdings"
  ON public.investor_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor deletes own holdings" ON public.investor_holdings;
CREATE POLICY "investor deletes own holdings"
  ON public.investor_holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Service role full access for admin / cron / GDPR-export paths.
DROP POLICY IF EXISTS "service_role full access investor_holdings" ON public.investor_holdings;
CREATE POLICY "service_role full access investor_holdings"
  ON public.investor_holdings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
