-- =============================================================================
-- Date:       2026-05-22
-- Feature:    Advisor as Course Creator
-- Why:        Allow advisors with active Stripe Connect to create, publish, and
--             sell courses through the Advisor Portal. Adds metadata columns to
--             courses and course_lessons, plus RLS policies that gate advisor
--             writes to their own rows.
-- Idempotency: safe to re-apply — all ALTER TABLE ADD COLUMN IF NOT EXISTS,
--             all POLICY creates preceded by DROP POLICY IF EXISTS.
-- Rollback:   BEGIN;
--             ALTER TABLE public.courses DROP COLUMN IF EXISTS is_advisor_created;
--             ALTER TABLE public.courses DROP COLUMN IF EXISTS advisor_professional_id;
--             ALTER TABLE public.courses DROP COLUMN IF EXISTS submitted_at;
--             ALTER TABLE public.courses DROP COLUMN IF EXISTS rejection_reason;
--             DROP POLICY IF EXISTS "Advisor manages own courses" ON public.courses;
--             DROP POLICY IF EXISTS "Advisor manages own course lessons" ON public.course_lessons;
--             COMMIT;
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. courses — extend with advisor-creation metadata
-- =============================================================================

-- Flag to distinguish advisor-submitted courses from platform-owned courses.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_advisor_created BOOLEAN DEFAULT false NOT NULL;

-- The professional_id of the submitting advisor (differs from creator_id which
-- references team_members — advisors are in the professionals table).
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS advisor_professional_id INTEGER REFERENCES public.professionals(id) ON DELETE SET NULL;

-- ISO 8601 timestamp when the advisor submitted the course for admin review.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Free-text rejection reason set by admin when rejecting a submitted course.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =============================================================================
-- 2. RLS policy — advisors can SELECT / INSERT / UPDATE their own courses
--
-- Why admin client is still used in the API:
--   requireAdvisorSession() resolves the session via a cookie-based token
--   (advisor_sessions table) which has no auth.uid() linkage for legacy
--   sessions. The API routes therefore use createAdminClient() and enforce
--   the advisor_professional_id ownership check at the application layer,
--   mirroring the pattern used in profile, disputes, and billing routes.
--
--   The RLS policy below covers the future scenario where advisors
--   authenticate via Supabase Auth (auth_user_id linkage is already present
--   on the professionals table).
-- =============================================================================

DROP POLICY IF EXISTS "Advisor manages own courses" ON public.courses;

CREATE POLICY "Advisor manages own courses"
  ON public.courses
  FOR ALL
  TO authenticated
  USING (
    is_advisor_created = true
    AND advisor_professional_id IN (
      SELECT id FROM public.professionals
      WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_advisor_created = true
    AND advisor_professional_id IN (
      SELECT id FROM public.professionals
      WHERE auth_user_id = auth.uid()
    )
  );

-- =============================================================================
-- 3. course_lessons — RLS for advisor-owned lessons
--
-- Lessons inherit their ownership through the course's slug reference.
-- Advisors can manage lessons on courses they own.
-- =============================================================================

DROP POLICY IF EXISTS "Advisor manages own course lessons" ON public.course_lessons;

CREATE POLICY "Advisor manages own course lessons"
  ON public.course_lessons
  FOR ALL
  TO authenticated
  USING (
    course_slug IN (
      SELECT slug FROM public.courses
      WHERE is_advisor_created = true
        AND advisor_professional_id IN (
          SELECT id FROM public.professionals
          WHERE auth_user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    course_slug IN (
      SELECT slug FROM public.courses
      WHERE is_advisor_created = true
        AND advisor_professional_id IN (
          SELECT id FROM public.professionals
          WHERE auth_user_id = auth.uid()
        )
    )
  );

COMMIT;
