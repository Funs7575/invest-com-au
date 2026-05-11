-- ============================================================================
-- Migration: 20260510260000_property_holdings.sql
-- Purpose: Investor manual property tracking. Investor_holdings was shares-
--          only; property is the largest AU asset class (median AU
--          investor's net worth is property-dominated). This adds the
--          parallel table for /account/property surfaces.
-- Audit ref: account-system-expansion plan, "Property holdings tracker".
-- Risk: low — additive table; per-user RLS; no FK to anything besides
--       auth.users.
-- Rollback: DROP TABLE IF EXISTS public.property_holdings;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.property_holdings (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Address (free-text; we don't gazetteer-validate at MVP)
  address_line    text   NOT NULL CHECK (length(address_line) > 0 AND length(address_line) <= 200),
  suburb          text,
  state           text   CHECK (state IS NULL OR state IN ('NSW','VIC','QLD','WA','SA','TAS','NT','ACT')),
  postcode        text,
  -- Acquisition + financial
  purchase_price_cents bigint NOT NULL CHECK (purchase_price_cents >= 0),
  purchase_date   date NOT NULL,
  current_value_estimate_cents bigint CHECK (current_value_estimate_cents IS NULL OR current_value_estimate_cents >= 0),
  -- Investment property fields (NULL = owner-occupied)
  is_investment_property boolean NOT NULL DEFAULT false,
  weekly_rent_cents bigint CHECK (weekly_rent_cents IS NULL OR weekly_rent_cents >= 0),
  loan_balance_cents bigint CHECK (loan_balance_cents IS NULL OR loan_balance_cents >= 0),
  loan_rate_pct   numeric(5,3) CHECK (loan_rate_pct IS NULL OR (loan_rate_pct >= 0 AND loan_rate_pct <= 99)),
  property_type   text   CHECK (property_type IS NULL OR property_type IN (
                    'house','apartment','townhouse','commercial','land','rural','other'
                  )),
  notes           text   CHECK (notes IS NULL OR length(notes) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_holdings_user
  ON public.property_holdings (auth_user_id, purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_property_holdings_state
  ON public.property_holdings (state) WHERE state IS NOT NULL;

ALTER TABLE public.property_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_holdings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor reads own properties" ON public.property_holdings;
CREATE POLICY "investor reads own properties"
  ON public.property_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor inserts own properties" ON public.property_holdings;
CREATE POLICY "investor inserts own properties"
  ON public.property_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own properties" ON public.property_holdings;
CREATE POLICY "investor updates own properties"
  ON public.property_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor deletes own properties" ON public.property_holdings;
CREATE POLICY "investor deletes own properties"
  ON public.property_holdings FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access property_holdings" ON public.property_holdings;
CREATE POLICY "service_role full access property_holdings"
  ON public.property_holdings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
