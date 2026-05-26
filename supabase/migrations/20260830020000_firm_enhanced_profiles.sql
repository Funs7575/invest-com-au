-- advisor_firms enhanced profile columns (B2 — Firm branded-profile subscription tier).
--
-- These columns unlock additional content areas on the public /firm/[slug] page
-- when is_enhanced = true. Toggled by admin or via a firm-portal subscription.
--
-- Rollback:
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS is_enhanced;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS enhanced_since;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS header_image_url;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS tagline;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS featured_services;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS case_studies;
--   ALTER TABLE advisor_firms DROP COLUMN IF EXISTS highlight_stats;

ALTER TABLE advisor_firms
  ADD COLUMN IF NOT EXISTS is_enhanced       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enhanced_since    timestamptz,
  ADD COLUMN IF NOT EXISTS header_image_url  text,
  ADD COLUMN IF NOT EXISTS tagline           text,
  -- featured_services: JSON array of { title, description, icon? }
  ADD COLUMN IF NOT EXISTS featured_services jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- case_studies: JSON array of { title, summary, outcome? }
  ADD COLUMN IF NOT EXISTS case_studies      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- highlight_stats: JSON array of { label, value } displayed as a stat strip
  ADD COLUMN IF NOT EXISTS highlight_stats   jsonb       NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE advisor_firms
  ADD CONSTRAINT advisor_firms_header_url_len  CHECK (char_length(header_image_url) <= 2048),
  ADD CONSTRAINT advisor_firms_tagline_len     CHECK (char_length(tagline) <= 180);

CREATE INDEX IF NOT EXISTS idx_advisor_firms_enhanced
  ON advisor_firms(is_enhanced)
  WHERE is_enhanced = true;
