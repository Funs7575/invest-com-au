-- ============================================================================
-- Migration: 20260514_mm01_marketplace_loop.sql
-- Purpose: Marketplace conversion loop additions (N1-N6 PR).
--          Adds stale-brief tracking columns + risk_review queue helper
--          fields to advisor_auctions, plus the digest-suppression column
--          on professionals so the daily-digest cron doesn't double-email.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS.
--
-- Rollback (destructive):
--   ALTER TABLE public.advisor_auctions
--     DROP COLUMN IF EXISTS last_stale_check_at,
--     DROP COLUMN IF EXISTS auto_broadened_at,
--     DROP COLUMN IF EXISTS risk_review_resolved_at,
--     DROP COLUMN IF EXISTS risk_review_decided_by,
--     DROP COLUMN IF EXISTS risk_review_decision_reason;
--   ALTER TABLE public.professionals
--     DROP COLUMN IF EXISTS digest_opt_out;
--
-- Risk: low — additive columns only.
-- ============================================================================

BEGIN;

-- ── 1. advisor_auctions: stale-brief tracking (N2) ───────────────────────
ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS last_stale_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_broadened_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_stale_check
  ON public.advisor_auctions (created_at, accepted_by_professional_id)
  WHERE status = 'open'
    AND accepted_by_professional_id IS NULL
    AND accepted_by_team_id IS NULL;

-- ── 2. advisor_auctions: risk review queue resolution (N6) ───────────────
ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS risk_review_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS risk_review_decided_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS risk_review_decision_reason text;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_risk_pending
  ON public.advisor_auctions (created_at DESC)
  WHERE risk_review_status = 'pending_review';

-- ── 3. professionals: digest opt-out (N1) ────────────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS digest_opt_out boolean NOT NULL DEFAULT false;

COMMIT;
