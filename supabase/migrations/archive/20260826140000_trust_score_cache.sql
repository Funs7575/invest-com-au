-- Migration: 20260826140000_trust_score_cache.sql
-- Adds cached trust-score columns to professionals and trust-tier badge types.
--
-- Rollback:
--   ALTER TABLE professionals
--     DROP COLUMN IF EXISTS trust_score_overall,
--     DROP COLUMN IF EXISTS trust_score_updated_at,
--     DROP COLUMN IF EXISTS trust_score_version;
--   -- Restore original check constraint on advisor_badges (manual, see below)

BEGIN;

-- ── 1. Cache columns on professionals ─────────────────────────────────────────

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS trust_score_overall     SMALLINT,
  ADD COLUMN IF NOT EXISTS trust_score_updated_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trust_score_version     SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.professionals.trust_score_overall
  IS '0–100 composite trust score; NULL until first nightly recompute.';
COMMENT ON COLUMN public.professionals.trust_score_updated_at
  IS 'Timestamp of last trust-score recompute by the nightly cron.';
COMMENT ON COLUMN public.professionals.trust_score_version
  IS 'Bumped on every recompute so callers can detect stale reads.';

-- ── 2. Expand advisor_badges badge_type to include trust-tier badges ───────────

ALTER TABLE public.advisor_badges
  DROP CONSTRAINT IF EXISTS advisor_badges_badge_type_check;

ALTER TABLE public.advisor_badges
  ADD CONSTRAINT advisor_badges_badge_type_check
  CHECK (badge_type IN (
    'profile_complete',
    'first_review',
    'top_rated',
    'fast_responder',
    'cpd_compliant',
    'first_course',
    'course_creator',
    'popular_educator',
    'community_active',
    'early_adopter',
    'verified',
    -- Trust-tier gamification badges (awarded by recompute-trust-scores cron)
    'trust_starter',   -- score >= 40
    'trust_growth',    -- score >= 55
    'trust_pro',       -- score >= 70
    'trust_elite'      -- score >= 85
  ));

COMMIT;
