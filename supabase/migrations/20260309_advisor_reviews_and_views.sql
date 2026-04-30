-- ============================================================================
-- Migration: 20260309_advisor_reviews_and_views.sql
-- Purpose: Create professional_reviews + advisor_profile_views tables
--          (with RLS, policies, indexes, updated_at trigger), and an
--          increment_advisor_view RPC for daily view-count upsert.
-- Rollback: DROP RPC, DROP TRIGGER, DROP TABLEs (CASCADE clears RLS
--          policies and indexes). DESTRUCTIVE — every review and view
--          count is discarded.
-- Risk: high — reverse drops user-submitted review content. Reviews are
--       referenced from advisor profile pages and may be cited in support
--       tickets; recovery requires backup restore.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS professional_reviews (...).
--   2. CREATE INDEX idx_reviews_professional, idx_reviews_status,
--      idx_reviews_professional_status, idx_reviews_unique_email.
--   3. ALTER TABLE professional_reviews ENABLE ROW LEVEL SECURITY.
--   4. CREATE POLICY "Public can view approved reviews" / "Anyone can submit
--      reviews" / "Admins full access reviews".
--   5. CREATE TRIGGER professional_reviews_updated_at.
--   6. CREATE TABLE IF NOT EXISTS advisor_profile_views (...).
--   7. CREATE INDEX idx_profile_views_professional, idx_profile_views_date.
--   8. ALTER TABLE advisor_profile_views ENABLE ROW LEVEL SECURITY.
--   9. CREATE POLICY "Anyone can increment views".
--  10. CREATE OR REPLACE FUNCTION increment_advisor_view(...).
--
-- Rollback (in reverse order):
--  10. DROP FUNCTION IF EXISTS public.increment_advisor_view(INTEGER, DATE);
--   9. DROP POLICY IF EXISTS "Anyone can increment views" ON advisor_profile_views;
--   8. ALTER TABLE advisor_profile_views DISABLE ROW LEVEL SECURITY;
--   7. DROP INDEX IF EXISTS public.idx_profile_views_date;
--      DROP INDEX IF EXISTS public.idx_profile_views_professional;
--   6. DROP TABLE IF EXISTS public.advisor_profile_views;
--      -- DESTRUCTIVE: all per-day view counts lost.
--   5. DROP TRIGGER IF EXISTS professional_reviews_updated_at
--        ON public.professional_reviews;
--   4. DROP POLICY IF EXISTS "Admins full access reviews" ON professional_reviews;
--      DROP POLICY IF EXISTS "Anyone can submit reviews" ON professional_reviews;
--      DROP POLICY IF EXISTS "Public can view approved reviews" ON professional_reviews;
--   3. ALTER TABLE professional_reviews DISABLE ROW LEVEL SECURITY;
--   2. DROP INDEX IF EXISTS public.idx_reviews_unique_email;
--      DROP INDEX IF EXISTS public.idx_reviews_professional_status;
--      DROP INDEX IF EXISTS public.idx_reviews_status;
--      DROP INDEX IF EXISTS public.idx_reviews_professional;
--   1. DROP TABLE IF EXISTS public.professional_reviews;
--      -- DESTRUCTIVE: every advisor review is permanently discarded.
-- ============================================================================

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
