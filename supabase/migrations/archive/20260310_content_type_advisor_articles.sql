-- ============================================================================
-- Migration: 20260310_content_type_advisor_articles.sql
-- Purpose: Add content_type column to articles + 5 cross-linking / display
--          columns to advisor_articles, plus 4 supporting indexes.
-- Rollback: DROP added indexes, then DROP added columns. The UPDATE-driven
--          backfill of articles.content_type cannot be reconstructed
--          (the prior values were NULL — backfill came from the category
--          column, which is preserved).
-- Risk: medium — reverse DROP COLUMN on populated tables loses the
--       backfilled content_type values and any per-article featured /
--       read_time / word_count edits made after the migration.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type DEFAULT 'editorial'.
--   2. UPDATE articles SET content_type = 'how-to' | 'news' | 'review'
--      WHERE category IN ('beginners','news','reviews').
--   3. ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS related_brokers,
--      related_advisor_types, featured, read_time, word_count.
--   4. CREATE INDEX idx_articles_content_type, idx_advisor_articles_status,
--      idx_advisor_articles_category, idx_advisor_articles_featured.
--
-- Rollback (in reverse order):
--   4. DROP INDEX IF EXISTS public.idx_advisor_articles_featured;
--      DROP INDEX IF EXISTS public.idx_advisor_articles_category;
--      DROP INDEX IF EXISTS public.idx_advisor_articles_status;
--      DROP INDEX IF EXISTS public.idx_articles_content_type;
--   3. ALTER TABLE advisor_articles DROP COLUMN IF EXISTS word_count;
--      ALTER TABLE advisor_articles DROP COLUMN IF EXISTS read_time;
--      ALTER TABLE advisor_articles DROP COLUMN IF EXISTS featured;
--      ALTER TABLE advisor_articles DROP COLUMN IF EXISTS related_advisor_types;
--      ALTER TABLE advisor_articles DROP COLUMN IF EXISTS related_brokers;
--   2. (No reverse — UPDATE backfilled NULLs from articles.category, which
--      remains the source of truth; rerunning forward step 2 reproduces
--      the same values.)
--   1. ALTER TABLE articles DROP COLUMN IF EXISTS content_type;
--      -- DESTRUCTIVE on populated rows: any post-migration content_type
--      -- values diverging from category are lost.
-- ============================================================================

-- Content type and advisor article enhancements

-- 1. Add content_type to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'editorial';
UPDATE articles SET content_type = 'how-to' WHERE category = 'beginners';
UPDATE articles SET content_type = 'news' WHERE category = 'news';
UPDATE articles SET content_type = 'review' WHERE category = 'reviews';

-- 2. Add columns to advisor_articles for better cross-linking and display
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS related_brokers text[] DEFAULT '{}';
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS related_advisor_types text[] DEFAULT '{}';
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS read_time integer;
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS word_count integer;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);
CREATE INDEX IF NOT EXISTS idx_advisor_articles_status ON advisor_articles(status);
CREATE INDEX IF NOT EXISTS idx_advisor_articles_category ON advisor_articles(category);
CREATE INDEX IF NOT EXISTS idx_advisor_articles_featured ON advisor_articles(featured) WHERE featured = true;
