-- ============================================================================
-- Migration: 20260825010000_verified_engagement_reviews.sql
-- Date: 2026-05-25
--
-- Why: Adds a dedicated `verified_engagement` flag (distinct from the existing
-- `is_verified_client` / `verified_client_at` columns) to
-- `professional_reviews`. A review is "engagement-verified" when the reviewer
-- had a recorded engagement with that advisor on the platform (a lead in
-- `professional_leads` or a paid booking in `consultation_bookings`), checked
-- at the moment of submission.
--
-- The new flag powers:
--   - A "Verified" badge on reviews in the public profile and /reviews pages
--   - The advisor reputation score composite (lib/advisor-reputation.ts)
--
-- Idempotency claim: is a no-op when re-applied — every ALTER uses
-- IF NOT EXISTS (PostgreSQL 9.6+). The backfill UPDATE uses WHERE-guarded
-- logic that is safe to run multiple times.
--
-- Rollback:
--   ALTER TABLE public.professional_reviews DROP COLUMN IF EXISTS verified_engagement;
--   ALTER TABLE public.professional_reviews DROP COLUMN IF EXISTS verified_at;
--
-- RLS note: existing policies on professional_reviews are unchanged.
--   "Public can view approved reviews" (SELECT, status='approved')
--   "Anyone can submit reviews"        (INSERT, WITH CHECK (true))
--   "Admins full access reviews"
-- ============================================================================

BEGIN;

-- 1. Add columns (idempotent via IF NOT EXISTS guard inside DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'professional_reviews'
      AND column_name  = 'verified_engagement'
  ) THEN
    ALTER TABLE public.professional_reviews
      ADD COLUMN verified_engagement boolean NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.professional_reviews.verified_engagement IS
      'true when the reviewer had a recorded engagement (lead or booking) with '
      'this advisor on the platform at the time of review submission or backfill.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'professional_reviews'
      AND column_name  = 'verified_at'
  ) THEN
    ALTER TABLE public.professional_reviews
      ADD COLUMN verified_at timestamptz DEFAULT NULL;
    COMMENT ON COLUMN public.professional_reviews.verified_at IS
      'Timestamp when verified_engagement was set to true. Null if not yet verified.';
  END IF;
END;
$$;

-- 2. Index for fast lookups of unverified reviews (used by cron backfill)
CREATE INDEX IF NOT EXISTS idx_prof_reviews_unverified_engagement
  ON public.professional_reviews (professional_id)
  WHERE verified_engagement = false AND reviewer_email IS NOT NULL;

-- 3. Backfill: mark existing reviews as verified where a matching lead exists.
--    Matching criteria: same professional_id + reviewer_email = user_email.
--    Uses WHERE NOT verified_engagement so subsequent runs are no-ops.
UPDATE public.professional_reviews pr
SET
  verified_engagement = true,
  verified_at         = NOW()
WHERE
  pr.verified_engagement = false
  AND pr.reviewer_email IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.professional_leads pl
    WHERE pl.professional_id = pr.professional_id
      AND pl.user_email = pr.reviewer_email
    LIMIT 1
  );

COMMIT;
