-- =============================================================================
-- Migration: CMP W1-A — user_calculator_state + anonymous claim path
-- Date:       2026-07-20
-- Audit ref:  /home/finnduns/.claude/plans/ok-audit-agaisnt-what-enumerated-honey.md § "W1-A"
-- Queue item: CMP W1-A (calculator continuity foundation)
--
-- Why: Calculator outputs today live ONLY in sessionStorage via lib/qualification-store.ts.
--   That gives zero-RTT prefill on the same device but vanishes across devices and
--   on cookie clear. CMP Wave 1 needs cross-device persistence so signed-in users
--   carry calculator context (income, deposit, trades/month) into other calculators
--   AND into the comparison cart's persona-match (W2-B). Anonymous users keep the
--   sessionStorage primary path; on signup, claim_state copies into the DB row via
--   the existing claimAnonymousSaves pattern.
--
-- Design decisions:
--   - One row per user (PK = user_id). State is a single JSONB blob shaped as
--     `{ [calculatorKey]: { source, data, captured_at } }` — same shape as the
--     existing QualificationData interface in lib/qualification-store.ts so reader
--     code (app/api/submit-lead) doesn't need to fork.
--   - JSONB merge on conflict (state || EXCLUDED.state) — partial updates from one
--     calculator never clobber another. Race-safe when claim runs in parallel with
--     a fresh write.
--   - anonymous_saves gets a calculator_state JSONB column (default '{}'::jsonb)
--     so the existing claim flow can carry calculator state too without a new
--     pre-auth table. NULL-safe.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, ADD COLUMN IF NOT
--   EXISTS. Re-runs are no-ops.
--
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "users can manage own calculator state" ON public.user_calculator_state;
--     DROP POLICY IF EXISTS "service_role full access"             ON public.user_calculator_state;
--     ALTER TABLE public.user_calculator_state DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.user_calculator_state; -- only on a clean rebuild
--     ALTER TABLE public.anonymous_saves DROP COLUMN IF EXISTS calculator_state;
--   COMMIT;
--
-- IMPORTANT — prior policy state: no prior CREATE POLICY on user_calculator_state
--   (table does not exist). anonymous_saves already has its own RLS — adding a
--   nullable column does not change policy semantics.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_calculator_state (
  user_id    uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  state      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_calculator_state_updated
  ON public.user_calculator_state (updated_at DESC);

ALTER TABLE public.user_calculator_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calculator_state FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can manage own calculator state" ON public.user_calculator_state;
CREATE POLICY "users can manage own calculator state"
  ON public.user_calculator_state
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role full access" ON public.user_calculator_state;
CREATE POLICY "service_role full access"
  ON public.user_calculator_state
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Extend anonymous_saves to carry pre-auth calculator state. The existing
-- claimAnonymousSaves(sessionId, userId) helper in lib/bookmarks.ts will be
-- extended to also merge this column into user_calculator_state.state.
ALTER TABLE public.anonymous_saves
  ADD COLUMN IF NOT EXISTS calculator_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
