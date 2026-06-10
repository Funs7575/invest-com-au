-- ============================================================================
-- Migration: 20260423_newsletter_editions.sql
-- Purpose: Create `newsletter_editions` — archive of sent weekly digests
--          referenced by /newsletter and /newsletter/[edition] but never
--          previously created. Each row is one rendered digest.
-- Rollback: DROP policy, DISABLE RLS, DROP index, DROP table, DROP
--           comment-on-table comment.
-- Risk: medium — DROP TABLE discards every archived edition (rendered
--       HTML + counts). Source numbers (fee_changes, articles, deals)
--       can be recomputed but the rendered HTML cannot. Snapshot before
--       any reverse migration.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.newsletter_editions
--        (id bigserial PK, edition_date UNIQUE, subject, html_content,
--         fee_changes_count, articles_count, deals_count, created_at).
--   2. CREATE INDEX IF NOT EXISTS idx_newsletter_editions_date
--                                  (edition_date DESC).
--   3. ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY.
--   4. CREATE POLICY "newsletter_editions_public_read" FOR SELECT
--        USING (true).
--   5. COMMENT ON TABLE public.newsletter_editions IS '...'.
--
-- Rollback (in reverse order):
--   5. COMMENT ON TABLE public.newsletter_editions IS NULL;
--   4. DROP POLICY IF EXISTS "newsletter_editions_public_read"
--        ON public.newsletter_editions;
--   3. ALTER TABLE public.newsletter_editions DISABLE ROW LEVEL SECURITY;
--   2. DROP INDEX IF EXISTS public.idx_newsletter_editions_date;
--   1. DROP TABLE IF EXISTS public.newsletter_editions;
--      -- DESTRUCTIVE: discards rendered HTML for every archived
--      -- edition. Snapshot first.
-- ============================================================================

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
