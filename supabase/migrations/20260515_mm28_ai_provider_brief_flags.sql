-- ============================================================================
-- Migration: 20260515_mm28_ai_provider_brief_flags.sql
-- Purpose: Two more AI features behind kill-switch flags (default OFF):
--   1. ai_provider_summaries     — auto-generated pro profile blurb (Claude).
--   2. ai_brief_quality_scoring  — 1..5 quality score on inbound briefs.
--
-- Both routes return 404 / no-op while disabled, so zero Anthropic spend
-- lands in prod until an admin flips them in /admin/automation/flags.
--
-- Schema additions:
--   - professionals.ai_generated_summary       text NULL
--   - professionals.ai_summary_generated_at    timestamptz NULL
--   - professionals.ai_summary_published       boolean DEFAULT false
--   - advisor_auctions.ai_quality_score        int NULL
--   - advisor_auctions.ai_quality_reason       text NULL
--
-- Idempotency: ADD COLUMN IF NOT EXISTS + INSERT ... ON CONFLICT DO NOTHING.
--
-- Rollback:
--   DELETE FROM feature_flags
--    WHERE flag_key IN ('ai_provider_summaries','ai_brief_quality_scoring');
--   ALTER TABLE professionals
--     DROP COLUMN IF EXISTS ai_generated_summary,
--     DROP COLUMN IF EXISTS ai_summary_generated_at,
--     DROP COLUMN IF EXISTS ai_summary_published;
--   ALTER TABLE advisor_auctions
--     DROP COLUMN IF EXISTS ai_quality_score,
--     DROP COLUMN IF EXISTS ai_quality_reason;
--
-- Risk: low — additive only; default values preserve existing behaviour.
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS ai_generated_summary     text,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS ai_summary_published     boolean NOT NULL DEFAULT false;

ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS ai_quality_score   integer,
  ADD COLUMN IF NOT EXISTS ai_quality_reason  text;

ALTER TABLE public.advisor_auctions
  DROP CONSTRAINT IF EXISTS advisor_auctions_ai_quality_score_check;
ALTER TABLE public.advisor_auctions
  ADD CONSTRAINT advisor_auctions_ai_quality_score_check
  CHECK (ai_quality_score IS NULL OR (ai_quality_score >= 1 AND ai_quality_score <= 5));

INSERT INTO public.feature_flags
  (flag_key, description, enabled, rollout_pct, allowlist, denylist, segments)
VALUES
  ('ai_provider_summaries',
   'AI-generated pro profile summaries (Claude). When enabled, /api/pros/ai-summary can generate a one-paragraph blurb for a pro; pro reviews + approves before it goes live on their public profile. ANTHROPIC_API_KEY billing applies. Default OFF.',
   false, 0, '{}', '{}', '{}'),
  ('ai_brief_quality_scoring',
   'AI 1-5 quality score on inbound briefs. When enabled, /api/briefs POST asynchronously scores each new brief via Claude; score < 3 sets risk_review_status=review so admins triage before routing. ANTHROPIC_API_KEY billing applies. Default OFF.',
   false, 0, '{}', '{}', '{}')
ON CONFLICT (flag_key) DO NOTHING;

COMMIT;
