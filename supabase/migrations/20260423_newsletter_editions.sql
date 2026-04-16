-- Create the newsletter_editions table.
--
-- This table was referenced by the /newsletter archive page and
-- /newsletter/[edition] detail page but was never created by any
-- migration. Both pages query it via Supabase client — the client
-- returns null/empty rather than crashing, so the pages rendered
-- empty rather than 500ing. This migration fixes the gap.
--
-- The weekly-newsletter cron (/api/cron/weekly-newsletter) should
-- INSERT a row here each time it sends a digest. The row stores
-- the rendered HTML so the archive page can display past editions.

CREATE TABLE IF NOT EXISTS public.newsletter_editions (
  id               bigserial PRIMARY KEY,
  edition_date     date NOT NULL UNIQUE,
  subject          text NOT NULL,
  html_content     text,
  fee_changes_count integer NOT NULL DEFAULT 0,
  articles_count   integer NOT NULL DEFAULT 0,
  deals_count      integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_editions_date
  ON public.newsletter_editions (edition_date DESC);

ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY;

-- Allow public read so the archive page can fetch without auth
CREATE POLICY "newsletter_editions_public_read"
  ON public.newsletter_editions
  FOR SELECT
  USING (true);

COMMENT ON TABLE public.newsletter_editions IS
  'Archive of sent weekly newsletter digests. One row per edition_date.';
