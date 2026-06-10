-- Migration: 20260522_advisor_gamification.sql
-- Advisor badges and monthly leaderboard for engagement gamification.
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_leaderboard_monthly CASCADE;
--   DROP TABLE IF EXISTS public.advisor_badges CASCADE;

BEGIN;

-- ─── advisor_badges ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_badges (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  badge_type      TEXT NOT NULL CHECK (badge_type IN (
    'profile_complete',     -- profile filled out 100%
    'first_review',         -- received first review
    'top_rated',            -- avg rating >= 4.8 with 5+ reviews
    'fast_responder',       -- avg response time < 2 hours
    'cpd_compliant',        -- completed 40+ CPD hours in current year
    'first_course',         -- published first course
    'course_creator',       -- 3+ published courses
    'popular_educator',     -- 10+ course enrollments
    'community_active',     -- 5+ posts in past 30 days
    'early_adopter',        -- joined platform in first 6 months (hardcoded before cutoff)
    'verified'              -- AFSL verified advisor
  )),
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB,
  UNIQUE (professional_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_advisor_badges_professional
  ON public.advisor_badges (professional_id, earned_at DESC);

ALTER TABLE public.advisor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_badges FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_badges_public_read" ON public.advisor_badges;
CREATE POLICY "advisor_badges_public_read"
  ON public.advisor_badges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "advisor_badges_service_role" ON public.advisor_badges;
CREATE POLICY "advisor_badges_service_role"
  ON public.advisor_badges TO service_role
  USING (true) WITH CHECK (true);

-- ─── advisor_leaderboard_monthly ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_leaderboard_monthly (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  year_month      TEXT NOT NULL,             -- e.g. '2026-05'
  rank            INTEGER NOT NULL,
  score           INTEGER NOT NULL DEFAULT 0, -- composite score
  review_count    INTEGER NOT NULL DEFAULT 0,
  avg_rating      NUMERIC(3,2),
  response_score  INTEGER NOT NULL DEFAULT 0, -- 0-100
  profile_score   INTEGER NOT NULL DEFAULT 0, -- 0-100
  badge_count     INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_advisor_leaderboard_monthly_ym
  ON public.advisor_leaderboard_monthly (year_month, rank);

ALTER TABLE public.advisor_leaderboard_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_leaderboard_monthly FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard_public_read" ON public.advisor_leaderboard_monthly;
CREATE POLICY "leaderboard_public_read"
  ON public.advisor_leaderboard_monthly FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "leaderboard_service_role" ON public.advisor_leaderboard_monthly;
CREATE POLICY "leaderboard_service_role"
  ON public.advisor_leaderboard_monthly TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
