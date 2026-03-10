-- Content structure improvements: add content_type, cross-linking columns,
-- and advisor article display fields

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
