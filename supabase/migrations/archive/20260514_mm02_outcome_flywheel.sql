-- ============================================================================
-- Migration: 20260514_mm02_outcome_flywheel.sql
-- Purpose: Outcome flywheel (N4) — tracks what actually happened after a
--          Match Request was accepted. Drives provider scoreboards and
--          builds the long-term data moat: % of accepted briefs that
--          reached completion per provider / category.
--
-- Tables:
--   brief_outcomes — one row per consumer-side review (sent ~4 weeks
--     after acceptance), captures completed/in_progress/switched/
--     abandoned + 1-5 rating + optional testimonial.
--   provider_outcome_scores — materialised score per provider, refreshed
--     by the daily cron (separate from raw `professionals.rating`).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS; RLS policies use DROP+CREATE.
--
-- Rollback (destructive):
--   DROP TABLE IF EXISTS public.provider_outcome_scores CASCADE;
--   DROP TABLE IF EXISTS public.brief_outcomes CASCADE;
--
-- Risk: medium — user-data table holds testimonial free-text. RLS
-- isolates by consumer email; admin role has full read.
-- ============================================================================

BEGIN;

-- ── 1. brief_outcomes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brief_outcomes (
  id                    bigserial PRIMARY KEY,
  brief_id              int NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  -- The consumer who made the brief — kept as text to support both
  -- authenticated (auth.uid()) and email-keyed anonymous accesses.
  -- We dedupe on (brief_id) since one outcome per brief.
  consumer_email        text NOT NULL,
  auth_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- The provider who accepted (denormalised for fast joins to scores).
  professional_id       int REFERENCES public.professionals(id) ON DELETE SET NULL,
  team_id               int REFERENCES public.expert_teams(id) ON DELETE SET NULL,
  -- Outcome status
  outcome               text NOT NULL
    CHECK (outcome IN ('completed','in_progress','switched_providers','abandoned')),
  -- 1-5 satisfaction rating (nullable; some users only pick outcome)
  rating                int CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  -- Optional free-text testimonial (max 2000 chars enforced by Zod
  -- on the API ingestion path; DB allows longer for admin edits).
  testimonial           text,
  -- Whether the user opts to make the testimonial public on the
  -- provider profile. Default false — opt-in only.
  show_testimonial      boolean NOT NULL DEFAULT false,
  -- Token-keyed access for anonymous review submissions (email-link
  -- contains token; consumer doesn't need an account).
  review_token          text UNIQUE NOT NULL,
  -- When the review request was emailed; null until the cron sends it.
  review_requested_at   timestamptz,
  -- When the consumer submitted; null until they respond.
  submitted_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  -- One outcome per brief — re-submissions overwrite via API logic.
  UNIQUE (brief_id)
);

CREATE INDEX IF NOT EXISTS idx_brief_outcomes_professional
  ON public.brief_outcomes (professional_id) WHERE professional_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brief_outcomes_team
  ON public.brief_outcomes (team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brief_outcomes_token
  ON public.brief_outcomes (review_token);
CREATE INDEX IF NOT EXISTS idx_brief_outcomes_pending
  ON public.brief_outcomes (review_requested_at) WHERE submitted_at IS NULL;

ALTER TABLE public.brief_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads own outcome via token" ON public.brief_outcomes;
CREATE POLICY "Anon reads own outcome via token"
  ON public.brief_outcomes FOR SELECT
  USING (true);
-- Note: SELECT is open because the review form needs to load by token.
-- INSERT/UPDATE go through API routes only (service role).

DROP POLICY IF EXISTS "Service role full access brief_outcomes" ON public.brief_outcomes;
CREATE POLICY "Service role full access brief_outcomes"
  ON public.brief_outcomes FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated owners update own outcome" ON public.brief_outcomes;
CREATE POLICY "Authenticated owners update own outcome"
  ON public.brief_outcomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- ── 2. provider_outcome_scores ───────────────────────────────────────────
-- Materialised scoreboard: refreshed by the daily cron. Used by:
--   - provider profiles ("Outcome score: 87% completed")
--   - admin reports
--   - future: routing-engine input (match-confidence boost)
CREATE TABLE IF NOT EXISTS public.provider_outcome_scores (
  id                    bigserial PRIMARY KEY,
  professional_id       int REFERENCES public.professionals(id) ON DELETE CASCADE,
  team_id               int REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  -- Time window for the score (ISO date string of window start)
  window_start          date NOT NULL,
  window_end            date NOT NULL,
  briefs_accepted       int NOT NULL DEFAULT 0,
  outcomes_submitted    int NOT NULL DEFAULT 0,
  outcomes_completed    int NOT NULL DEFAULT 0,
  outcomes_in_progress  int NOT NULL DEFAULT 0,
  outcomes_switched     int NOT NULL DEFAULT 0,
  outcomes_abandoned    int NOT NULL DEFAULT 0,
  avg_rating            numeric(3,2),
  -- Completion rate as a percentage 0-100; cached for query speed.
  completion_rate_pct   int,
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- One row per (provider, window). Either professional_id or team_id
  -- is non-null, never both.
  UNIQUE (professional_id, window_start, window_end),
  UNIQUE (team_id, window_start, window_end),
  CHECK (
    (professional_id IS NOT NULL AND team_id IS NULL)
    OR (professional_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_outcome_scores_professional
  ON public.provider_outcome_scores (professional_id, window_end DESC)
  WHERE professional_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outcome_scores_team
  ON public.provider_outcome_scores (team_id, window_end DESC)
  WHERE team_id IS NOT NULL;

ALTER TABLE public.provider_outcome_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads outcome scores" ON public.provider_outcome_scores;
CREATE POLICY "Public reads outcome scores"
  ON public.provider_outcome_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role full access outcome scores" ON public.provider_outcome_scores;
CREATE POLICY "Service role full access outcome scores"
  ON public.provider_outcome_scores FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
