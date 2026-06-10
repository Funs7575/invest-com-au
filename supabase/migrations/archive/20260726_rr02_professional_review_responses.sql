-- ============================================================================
-- Migration: 20260726_rr02_professional_review_responses.sql
-- Date: 2026-05-14
-- Audit ref: docs/audits/codebase-health-2026-04-24.md
-- Queue item: RR-02 (advisor response to reviews)
--
-- Why: Financial advisors on the platform have no way to publicly respond
-- to reviews submitted about them. A response capability increases trust
-- (potential clients see both perspectives) and gives advisors a reputation-
-- management tool. Each review can have at most one official advisor response.
--
-- Idempotency claim: is a no-op when re-applied because every CREATE/ALTER
-- statement uses IF NOT EXISTS.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.professional_review_responses CASCADE;
--
-- IMPORTANT — prior policy state on professional_reviews:
--   "Public can view approved reviews" (SELECT, status='approved') — FROM 20260309_advisor_reviews_and_views.sql
--   "Anyone can submit reviews" (INSERT, WITH CHECK (true)) — FROM 20260309_advisor_reviews_and_views.sql
--   "Admins full access reviews" — FROM 20260309_advisor_reviews_and_views.sql
--   These policies are NOT modified by this migration.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.professional_review_responses (
  id            SERIAL PRIMARY KEY,
  review_id     INTEGER NOT NULL REFERENCES public.professional_reviews(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(body) BETWEEN 10 AND 1000),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT professional_review_responses_one_per_review UNIQUE (review_id)
);

COMMENT ON TABLE public.professional_review_responses IS
  'One optional response per review, written by the professional being reviewed.';

CREATE INDEX IF NOT EXISTS idx_prof_review_responses_review_id
  ON public.professional_review_responses(review_id);

CREATE INDEX IF NOT EXISTS idx_prof_review_responses_professional_id
  ON public.professional_review_responses(professional_id);

-- RLS
ALTER TABLE public.professional_review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_review_responses FORCE ROW LEVEL SECURITY;

-- Public can read all responses (they are shown alongside approved reviews)
DROP POLICY IF EXISTS "Public can read review responses" ON public.professional_review_responses;
CREATE POLICY "Public can read review responses"
  ON public.professional_review_responses
  FOR SELECT
  USING (true);

-- Service role has full access (API route uses admin client to insert/upsert)
DROP POLICY IF EXISTS "Service role full access review responses" ON public.professional_review_responses;
CREATE POLICY "Service role full access review responses"
  ON public.professional_review_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO: human review of policy semantics
-- The response API verifies the professional_id matches the session before
-- writing; the RLS policy trusts the API's service_role verification.

COMMIT;
