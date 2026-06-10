-- ============================================================================
-- Migration: 20260510280000_investor_goals.sql
-- Purpose: User-defined savings/investment goals with deadline + target. The
--          /account/goals page projects current portfolio + monthly savings
--          rate forward to show whether the user is on track. Pure
--          projection — never advice, never recommendation.
-- Audit ref: account-system-expansion plan, "Goals tracker".
-- Risk: low — additive table; per-user RLS; no FK to anything besides
--       auth.users.
-- Rollback: DROP TABLE IF EXISTS public.investor_goals;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_goals (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           text   NOT NULL CHECK (length(label) > 0 AND length(label) <= 120),
  -- Goal type drives default projection assumptions in the UI; storage is
  -- just the enum, computation is in lib/goals/project.ts.
  goal_type       text   NOT NULL CHECK (goal_type IN (
                    'house_deposit','retirement','education','generic'
                  )),
  target_cents    bigint NOT NULL CHECK (target_cents >= 0),
  target_date     date NOT NULL,
  current_balance_cents bigint NOT NULL DEFAULT 0 CHECK (current_balance_cents >= 0),
  monthly_contribution_cents bigint NOT NULL DEFAULT 0 CHECK (monthly_contribution_cents >= 0),
  -- Expected nominal return %/year — caller-set; UI defaults vary by
  -- goal_type. Stored, not computed, so the projection is reproducible.
  expected_return_pct numeric(5,2) NOT NULL DEFAULT 6.5
                  CHECK (expected_return_pct >= -10 AND expected_return_pct <= 30),
  notes           text   CHECK (notes IS NULL OR length(notes) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_goals_user
  ON public.investor_goals (auth_user_id, target_date ASC);

ALTER TABLE public.investor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_goals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor reads own goals" ON public.investor_goals;
CREATE POLICY "investor reads own goals"
  ON public.investor_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor inserts own goals" ON public.investor_goals;
CREATE POLICY "investor inserts own goals"
  ON public.investor_goals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own goals" ON public.investor_goals;
CREATE POLICY "investor updates own goals"
  ON public.investor_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor deletes own goals" ON public.investor_goals;
CREATE POLICY "investor deletes own goals"
  ON public.investor_goals FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access investor_goals" ON public.investor_goals;
CREATE POLICY "service_role full access investor_goals"
  ON public.investor_goals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
