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
