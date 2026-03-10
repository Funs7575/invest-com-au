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
