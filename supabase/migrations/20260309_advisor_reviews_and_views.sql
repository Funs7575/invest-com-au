-- Migration: Add professional_reviews table and advisor view tracking
-- Run in Supabase Dashboard > SQL Editor

-- ═══════════════════════════════════════════════
-- Table: professional_reviews
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS professional_reviews (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id),
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_professional ON professional_reviews(professional_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON professional_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_professional_status ON professional_reviews(professional_id, status);

-- Unique constraint: one review per email per professional
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_email ON professional_reviews(professional_id, reviewer_email);

-- RLS
ALTER TABLE professional_reviews ENABLE ROW LEVEL SECURITY;

-- Public can view approved reviews
CREATE POLICY "Public can view approved reviews" ON professional_reviews
  FOR SELECT USING (status = 'approved');

-- Anyone can submit a review
CREATE POLICY "Anyone can submit reviews" ON professional_reviews
  FOR INSERT WITH CHECK (true);

-- Admins full access
CREATE POLICY "Admins full access reviews" ON professional_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin')
  );

-- Updated_at trigger
CREATE TRIGGER professional_reviews_updated_at
  BEFORE UPDATE ON professional_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════
-- Table: advisor_profile_views (daily view counts)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS advisor_profile_views (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id),
  view_date DATE NOT NULL,
  view_count INTEGER DEFAULT 1,
  UNIQUE(professional_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_professional ON advisor_profile_views(professional_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON advisor_profile_views(view_date);

-- RLS
ALTER TABLE advisor_profile_views ENABLE ROW LEVEL SECURITY;

-- Allow inserts/updates from anon for view tracking
CREATE POLICY "Anyone can increment views" ON advisor_profile_views
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- RPC: increment_advisor_view (upsert daily view count)
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_advisor_view(p_professional_id INTEGER, p_date DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO advisor_profile_views (professional_id, view_date, view_count)
  VALUES (p_professional_id, p_date, 1)
  ON CONFLICT (professional_id, view_date)
  DO UPDATE SET view_count = advisor_profile_views.view_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'professional_reviews table created' AS status;
SELECT 'advisor_profile_views table created' AS status;
SELECT 'increment_advisor_view function created' AS status;
