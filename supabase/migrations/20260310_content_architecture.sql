-- ============================================================================
-- Migration: 20260310_content_architecture.sql
-- Purpose: Content-architecture enhancement — add 2 columns to articles
--          (content_type, related_advisor_types text[]); add 6 columns to
--          advisor_articles (word_count, related_broker_slugs text[],
--          related_advisor_types text[], featured, read_time,
--          moderation_score); create article_guidelines table (unique key,
--          title, description, active, sort_order) with RLS + 1 policy;
--          seed 8 article_guidelines rows; create
--          advisor_article_moderation_log table (article_id FK→
--          advisor_articles ON DELETE CASCADE) with RLS + service-role-only
--          policy + 1 index; add 3 performance indexes
--          (idx_articles_content_type, idx_advisor_articles_featured,
--          idx_advisor_articles_status).
-- Rollback: DROP the 3 perf indexes; DROP advisor_article_moderation_log
--          CASCADE (loses moderation audit trail); DROP article_guidelines
--          CASCADE (loses 8 seeded guidelines + any operator-added rows);
--          ALTER TABLE advisor_articles DROP COLUMN ... (6 cols); ALTER
--          TABLE articles DROP COLUMN ... (2 cols).
-- Risk: high — `advisor_article_moderation_log` is an audit trail (every
--       moderation action by reviewer); reverse loses compliance evidence.
--       Dropped columns on articles / advisor_articles are referenced by
--       app code — runtime errors until shipped code reverts.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type text
--      DEFAULT 'editorial', related_advisor_types text[] DEFAULT '{}'.
--   2. ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS word_count
--      integer DEFAULT 0, related_broker_slugs text[] DEFAULT '{}',
--      related_advisor_types text[] DEFAULT '{}', featured boolean
--      DEFAULT false, read_time integer DEFAULT 0, moderation_score
--      integer DEFAULT 0.
--   3. CREATE TABLE IF NOT EXISTS article_guidelines (id IDENTITY, key
--      UNIQUE, title, description, active DEFAULT true, sort_order,
--      created_at).
--   4. ALTER TABLE article_guidelines ENABLE ROW LEVEL SECURITY.
--   5. CREATE POLICY "Public read guidelines" ON article_guidelines.
--   6. INSERT INTO article_guidelines (key, ...) VALUES (8 rows)
--      ON CONFLICT (key) DO NOTHING.
--   7. CREATE TABLE IF NOT EXISTS advisor_article_moderation_log (id
--      IDENTITY, article_id FK→advisor_articles ON DELETE CASCADE,
--      action, old_status, new_status, performed_by, notes, created_at).
--   8. ALTER TABLE advisor_article_moderation_log ENABLE ROW LEVEL SECURITY.
--   9. CREATE POLICY "Service role only mod log"
--      ON advisor_article_moderation_log FOR ALL USING (false).
--  10. CREATE INDEX IF NOT EXISTS idx_advisor_article_mod_log_article.
--  11. CREATE INDEX IF NOT EXISTS idx_articles_content_type,
--      idx_advisor_articles_featured (partial: WHERE featured = true),
--      idx_advisor_articles_status.
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): export advisor_article_moderation_log
--   -- (compliance audit trail) and any operator-added article_guidelines
--   -- rows beyond the 8 seeded keys.
--  11. DROP INDEX IF EXISTS idx_advisor_articles_status;
--      DROP INDEX IF EXISTS idx_advisor_articles_featured;
--      DROP INDEX IF EXISTS idx_articles_content_type;
--  10. DROP INDEX IF EXISTS idx_advisor_article_mod_log_article;
--   9. DROP POLICY IF EXISTS "Service role only mod log"
--        ON advisor_article_moderation_log;
--   8. (RLS toggle drops with the table.)
--   7. DROP TABLE IF EXISTS advisor_article_moderation_log CASCADE;
--      -- DESTRUCTIVE: drops moderation audit trail (compliance evidence).
--   6. DELETE FROM article_guidelines
--      WHERE key IN (
--        'min_words', 'no_product_promo', 'australian_focus',
--        'disclaimers', 'original_content', 'factual_accuracy',
--        'professional_tone', 'no_guarantees'
--      );
--   5. DROP POLICY IF EXISTS "Public read guidelines" ON article_guidelines;
--   4. (RLS toggle drops with the table.)
--   3. DROP TABLE IF EXISTS article_guidelines CASCADE;
--      -- Drops any operator-added guidelines beyond the 8 seeded keys.
--   2. ALTER TABLE advisor_articles
--        DROP COLUMN IF EXISTS moderation_score,
--        DROP COLUMN IF EXISTS read_time,
--        DROP COLUMN IF EXISTS featured,
--        DROP COLUMN IF EXISTS related_advisor_types,
--        DROP COLUMN IF EXISTS related_broker_slugs,
--        DROP COLUMN IF EXISTS word_count;
--      -- App code reads these columns; revert ship-side first.
--   1. ALTER TABLE articles
--        DROP COLUMN IF EXISTS related_advisor_types,
--        DROP COLUMN IF EXISTS content_type;
--      -- articles.content_type drives editorial-vs-how-to filtering;
--      -- revert ship-side first.
-- ============================================================================

-- Content architecture enhancement: content_type, guidelines, moderation

-- 1. Add content_type to articles for filtering editorial vs how-to vs news
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'editorial';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS related_advisor_types text[] DEFAULT '{}';

-- 2. Enhance advisor_articles with moderation and metadata fields
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS word_count integer DEFAULT 0;
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS related_broker_slugs text[] DEFAULT '{}';
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS related_advisor_types text[] DEFAULT '{}';
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS read_time integer DEFAULT 0;
ALTER TABLE advisor_articles ADD COLUMN IF NOT EXISTS moderation_score integer DEFAULT 0;

-- 3. Create article_guidelines table
CREATE TABLE IF NOT EXISTS article_guidelines (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE article_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read guidelines" ON article_guidelines FOR SELECT USING (active = true);

INSERT INTO article_guidelines (key, title, description, sort_order) VALUES
  ('min_words', 'Minimum 600 words', 'Articles must be at least 600 words to provide sufficient depth and value to readers.', 1),
  ('no_product_promo', 'No direct product promotion', 'Articles should educate, not sell. Do not recommend specific platforms or products by name as investment advice.', 2),
  ('australian_focus', 'Australian investor focus', 'Content must be relevant to Australian investors. Reference Australian regulations (ASIC, ATO), tax rules, and local market conditions.', 3),
  ('disclaimers', 'Include appropriate disclaimers', 'Include a general advice warning where applicable. Clearly state that the content is general in nature and not personal financial advice.', 4),
  ('original_content', 'Original content only', 'All submissions must be original work. Plagiarised or AI-generated content without substantial human editing will be rejected.', 5),
  ('factual_accuracy', 'Factual claims must be accurate', 'Statistics, tax rates, and regulatory references must be current and verifiable. Outdated information will be flagged for revision.', 6),
  ('professional_tone', 'Professional, accessible tone', 'Write for a general audience. Avoid excessive jargon. Explain technical concepts clearly.', 7),
  ('no_guarantees', 'No performance guarantees', 'Never guarantee returns or outcomes. Use past tense for historical performance and always note that past performance is not indicative of future results.', 8)
ON CONFLICT (key) DO NOTHING;

-- 4. Create moderation audit log
CREATE TABLE IF NOT EXISTS advisor_article_moderation_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  article_id bigint NOT NULL REFERENCES advisor_articles(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_status text,
  new_status text,
  performed_by text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE advisor_article_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only mod log" ON advisor_article_moderation_log FOR ALL USING (false);
CREATE INDEX IF NOT EXISTS idx_advisor_article_mod_log_article ON advisor_article_moderation_log(article_id);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_articles_content_type ON articles(content_type);
CREATE INDEX IF NOT EXISTS idx_advisor_articles_featured ON advisor_articles(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_advisor_articles_status ON advisor_articles(status);
