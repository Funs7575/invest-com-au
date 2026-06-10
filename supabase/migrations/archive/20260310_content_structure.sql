-- ============================================================
-- 20260310: Content structure improvements
-- ============================================================
--
-- Adds content_type plus cross-linking arrays to articles, and
-- display + cross-linking fields to advisor_articles. Backfills
-- content_type from existing categories.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   DROP INDEX IF EXISTS idx_articles_related_verticals;
--   DROP INDEX IF EXISTS idx_articles_related_brokers;
--   DROP INDEX IF EXISTS idx_articles_content_type;
--   ALTER TABLE public.articles
--     DROP COLUMN IF EXISTS related_verticals,
--     DROP COLUMN IF EXISTS related_advisor_types,
--     DROP COLUMN IF EXISTS content_type;
--   ALTER TABLE public.advisor_articles
--     DROP COLUMN IF EXISTS reading_time_mins,
--     DROP COLUMN IF EXISTS featured,
--     DROP COLUMN IF EXISTS related_advisor_type,
--     DROP COLUMN IF EXISTS related_broker_slugs,
--     DROP COLUMN IF EXISTS author_photo_url;
--
-- Risk: low — additive columns + idempotent backfill UPDATE
-- (only flips rows still on the editorial default).
-- All operations use IF NOT EXISTS to be idempotent on re-run.

-- Articles table enhancements
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'editorial';
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS related_advisor_types text[] DEFAULT '{}';
ALTER TABLE public.articles 
  ADD COLUMN IF NOT EXISTS related_verticals text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_articles_content_type ON public.articles(content_type);
CREATE INDEX IF NOT EXISTS idx_articles_related_brokers ON public.articles USING gin(related_brokers);
CREATE INDEX IF NOT EXISTS idx_articles_related_verticals ON public.articles USING gin(related_verticals);

-- Backfill content_type from categories
UPDATE public.articles SET content_type = 'news' WHERE category = 'news' AND content_type = 'editorial';
UPDATE public.articles SET content_type = 'review' WHERE category = 'reviews' AND content_type = 'editorial';

-- Advisor articles enhancements for display and cross-linking
ALTER TABLE public.advisor_articles 
  ADD COLUMN IF NOT EXISTS author_photo_url text;
ALTER TABLE public.advisor_articles 
  ADD COLUMN IF NOT EXISTS related_broker_slugs text[] DEFAULT '{}';
ALTER TABLE public.advisor_articles 
  ADD COLUMN IF NOT EXISTS related_advisor_type text;
ALTER TABLE public.advisor_articles 
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE public.advisor_articles 
  ADD COLUMN IF NOT EXISTS reading_time_mins integer;
