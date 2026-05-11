-- ============================================================================
-- Migration: 20260511000000_investor_goals.sql
-- Purpose: Investor goal tracker (PR-X5h). A goal is a target dollar amount
--          + target date + monthly contribution + expected return assumption.
--          Pure projection — "at current rate you'll hit $X by date Y" —
--          comparison-driven, not advice. Surfaces alongside holdings on
--          /account/holdings.
--
--          Note: the table was first created via the Supabase dashboard
--          during iter 353 (commit c3a19667 regenerated database.types.ts
--          for it). This migration is the canonical idempotent definition;
--          on remote where the table already exists the CREATE skips and
--          the policy DROP/CREATE pair re-establishes RLS. On a fresh local
--          stack the migration creates the table with the same shape so
--          dev parity is preserved.
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md Phase 3 X5h
-- Risk: low — additive; RLS-scoped per-user; no public read.
-- Rollback: DROP TABLE IF EXISTS public.investor_goals;
--           (DESTRUCTIVE — discards user-entered goals. No seed; users would
--           need to re-enter manually.)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_goals (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           text   NOT NULL,
  goal_type       text   NOT NULL,
  target_cents    bigint NOT NULL,
  target_date     date   NOT NULL,
  current_balance_cents bigint NOT NULL DEFAULT 0,
  monthly_contribution_cents bigint NOT NULL DEFAULT 0,
  expected_return_pct numeric NOT NULL DEFAULT 6,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_goals_user
  ON public.investor_goals (auth_user_id, target_date ASC);

ALTER TABLE public.investor_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_goals FORCE ROW LEVEL SECURITY;

-- Authenticated users see / write ONLY their own rows.
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

-- Service role full access for admin / cron / GDPR-export paths.
DROP POLICY IF EXISTS "service_role full access investor_goals" ON public.investor_goals;
CREATE POLICY "service_role full access investor_goals"
  ON public.investor_goals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
