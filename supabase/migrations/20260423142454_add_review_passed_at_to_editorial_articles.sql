-- Add review_passed_at to editorial_articles so the auto-publish pass can
-- enforce the 4h Fin no-objection window per agent spec .claude/agents/04-editorial.md
-- §Prompt skeleton step 4.
--
-- Nullable. Stamped by the editorial_publish_gate workflow when a draft is
-- approved (status='draft' -> 'review_passed'). A later auto-publish workflow
-- will read rows with:
--   status='review_passed' AND fin_objection_at IS NULL
--                          AND now() - review_passed_at >= interval '4 hours'.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_editorial_articles_review_passed_at;
--   ALTER TABLE public.editorial_articles DROP COLUMN review_passed_at;
-- Safe - no existing data to migrate, no dependents yet.

ALTER TABLE public.editorial_articles
  ADD COLUMN IF NOT EXISTS review_passed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_editorial_articles_review_passed_at
  ON public.editorial_articles (review_passed_at)
  WHERE review_passed_at IS NOT NULL;
