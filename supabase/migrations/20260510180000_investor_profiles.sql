-- ============================================================================
-- Migration: 20260510180000_investor_profiles.sql
-- Purpose: Investor-side profile cache. Captures life-event flags (FHB,
--          pre-retiree, business owner, cross-border, HNW) + ranker inputs
--          (intent country snapshot, budget band, experience, primary
--          vertical) so the smart-recs ranker (PR #715/#717) can read
--          structured data instead of re-parsing user_quiz_history JSONB
--          every page render. Single row per auth.users.id.
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md Phase 2 + the
--           account-system-expansion plan (Phase 2).
-- Risk: low — additive table; per-user RLS; no FK to anything besides
--       auth.users.
-- Rollback: DROP TABLE IF EXISTS public.investor_profiles;
--           Source data lives in user_quiz_history + iv_intent_country
--           cookie, so the table can be rebuilt from those sources by
--           re-running syncQuizToInvestorProfile() per user.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,

  -- Life-event flags. Set by quiz answer interpretation; user can also
  -- toggle from /account/profile in a later phase. Used by smart-recs
  -- ranker for content surfacing — never to drive personal advice copy.
  is_fhb          boolean NOT NULL DEFAULT false,
  is_pre_retiree  boolean NOT NULL DEFAULT false,
  is_business_owner boolean NOT NULL DEFAULT false,
  is_cross_border boolean NOT NULL DEFAULT false,
  is_hnw          boolean NOT NULL DEFAULT false,

  -- Ranker inputs. Mirror QuizProfile shape from lib/quiz-profile.ts so
  -- the smart-recs strip can read either source interchangeably. NULL
  -- means "no quiz data yet".
  intent_country_snapshot text CHECK (
    intent_country_snapshot IS NULL OR
    intent_country_snapshot IN ('uk','us','cn','in','jp','sg','hk','kr','my','nz','ae','sa')
  ),
  budget_band     text CHECK (
    budget_band IS NULL OR
    budget_band IN ('small','medium','large','whale')
  ),
  experience_level text CHECK (
    experience_level IS NULL OR
    experience_level IN ('beginner','intermediate','pro')
  ),
  primary_vertical text,  -- 'shares' / 'super' / 'property' / 'crypto' / etc.

  -- Escape hatch for fields we add post-launch without a migration. UI
  -- and ranker should NOT depend on this; promote frequently-read
  -- fields to typed columns when usage stabilises.
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_profiles_intent_country
  ON public.investor_profiles (intent_country_snapshot)
  WHERE intent_country_snapshot IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_business_owner
  ON public.investor_profiles (is_business_owner)
  WHERE is_business_owner = true;

CREATE INDEX IF NOT EXISTS idx_investor_profiles_fhb
  ON public.investor_profiles (is_fhb)
  WHERE is_fhb = true;

ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investor reads own profile" ON public.investor_profiles;
CREATE POLICY "investor reads own profile"
  ON public.investor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor inserts own profile" ON public.investor_profiles;
CREATE POLICY "investor inserts own profile"
  ON public.investor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "investor updates own profile" ON public.investor_profiles;
CREATE POLICY "investor updates own profile"
  ON public.investor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access investor_profiles" ON public.investor_profiles;
CREATE POLICY "service_role full access investor_profiles"
  ON public.investor_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
