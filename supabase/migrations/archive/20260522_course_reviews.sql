-- Migration: 20260522_course_reviews.sql
-- Course review system: enrolled students can leave star ratings and text reviews.
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP/CREATE POLICY pairs.
-- Rollback: DROP TABLE IF EXISTS public.course_reviews CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.course_reviews (
  id              SERIAL PRIMARY KEY,
  course_id       BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id     INTEGER REFERENCES public.course_purchases(id) ON DELETE SET NULL,
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  headline        TEXT CHECK (char_length(headline) <= 150),
  body            TEXT CHECK (char_length(body) <= 2000),
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course
  ON public.course_reviews (course_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_reviews_user
  ON public.course_reviews (user_id);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_reviews_public_read" ON public.course_reviews;
CREATE POLICY "course_reviews_public_read"
  ON public.course_reviews FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "course_reviews_user_write" ON public.course_reviews;
CREATE POLICY "course_reviews_user_write"
  ON public.course_reviews FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "course_reviews_service_role" ON public.course_reviews;
CREATE POLICY "course_reviews_service_role"
  ON public.course_reviews TO service_role
  USING (true) WITH CHECK (true);

-- Cached aggregate columns on courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

COMMIT;
