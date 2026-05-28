-- Migration: 20260826150000_advisor_user_match_scores.sql
-- Pre-computed user-advisor compatibility scores (updated weekly by cron).
-- These are factual compatibility scores based on stated preferences and
-- stated advisor offerings — NOT personal advice, suitability assessments,
-- or ranking assertions. Compliance label is displayed on all surfaces.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_user_match_scores CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_user_match_scores (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id INTEGER     NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  match_percent   SMALLINT    NOT NULL CHECK (match_percent BETWEEN 0 AND 100),
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_user_match_scores_user
  ON public.advisor_user_match_scores (user_id, match_percent DESC);

ALTER TABLE public.advisor_user_match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_user_match_scores FORCE ROW LEVEL SECURITY;

-- Users can read only their own scores
DROP POLICY IF EXISTS "user_reads_own_match_scores" ON public.advisor_user_match_scores;
CREATE POLICY "user_reads_own_match_scores"
  ON public.advisor_user_match_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role: full access (cron writes via admin client)
DROP POLICY IF EXISTS "service_role_all_match_scores" ON public.advisor_user_match_scores;
CREATE POLICY "service_role_all_match_scores"
  ON public.advisor_user_match_scores TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
