-- Migration: user_scenarios — named, reusable calculator scenarios.
--
-- The Scenario Workspace lets a signed-in user save NAMED snapshots from any
-- calculator ("Aggressive DCA", "If we refinance"), reopen them later, compare
-- 2-3 of the same calculator side-by-side, and share a read-only link.
--
-- Relationship to existing state:
--   `user_calculator_state` (one JSONB blob per user, keyed by calculator slug,
--   shipped W1-A) stores only the LATEST inputs per calculator. This table
--   layers NAMED snapshots on top — many rows per (user, calculator_key) — so
--   a user can keep several distinct what-if scenarios per calculator. The two
--   are independent: saving a scenario does not touch user_calculator_state.
--
-- Columns:
--   calculator_key   free-form slug matching the calculator's useCalculatorState
--                    key (e.g. "mortgage_calculator", "scenario_planner").
--   name             user-given label, <= 80 chars (CHECK enforced).
--   inputs           the calculator's input blob (restored on "open in calc").
--   results_snapshot optional pre-computed headline figures for list display
--                    so the library page doesn't recompute every calculator.
--   share_token      null until the owner generates a public read-only link;
--                    UNIQUE so token lookups are a single-row index hit.
--
-- RLS:
--   Owner (auth.uid() = user_id) may SELECT/INSERT/UPDATE/DELETE their rows.
--   service_role retains ALL access (ops / future cron, none today).
--   A narrow anon+authenticated SELECT policy exposes ONLY rows that have a
--   non-null share_token, so the public /scenarios/shared/[token] page can read
--   a shared scenario with the regular (RLS) client — no admin client, no owner
--   identity. The public page selects only non-identifying columns.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.user_scenarios;

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_scenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculator_key text NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 80),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_snapshot jsonb,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scenarios_user_calc
  ON public.user_scenarios (user_id, calculator_key);
CREATE INDEX IF NOT EXISTS idx_user_scenarios_share_token
  ON public.user_scenarios (share_token)
  WHERE share_token IS NOT NULL;

ALTER TABLE public.user_scenarios ENABLE ROW LEVEL SECURITY;

-- Owner: full CRUD over their own rows.
DROP POLICY IF EXISTS "Users select own scenarios" ON public.user_scenarios;
CREATE POLICY "Users select own scenarios"
  ON public.user_scenarios FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own scenarios" ON public.user_scenarios;
CREATE POLICY "Users insert own scenarios"
  ON public.user_scenarios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own scenarios" ON public.user_scenarios;
CREATE POLICY "Users update own scenarios"
  ON public.user_scenarios FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own scenarios" ON public.user_scenarios;
CREATE POLICY "Users delete own scenarios"
  ON public.user_scenarios FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Public read-only access to SHARED scenarios only (token is the auth factor).
-- The /scenarios/shared/[token] page filters by share_token = <token> and
-- selects only non-identifying columns; this policy makes that read possible
-- with the regular RLS client (no admin escape hatch).
DROP POLICY IF EXISTS "Anyone reads shared scenarios" ON public.user_scenarios;
CREATE POLICY "Anyone reads shared scenarios"
  ON public.user_scenarios FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL);

-- Ops / service role retains full access (no cron today).
DROP POLICY IF EXISTS "Service role manages user_scenarios" ON public.user_scenarios;
CREATE POLICY "Service role manages user_scenarios"
  ON public.user_scenarios FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
