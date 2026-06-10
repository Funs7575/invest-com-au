-- ============================================================================
-- Migration: 20260309_content_tables.sql
-- Purpose: Migrate two very large content-as-code files into Supabase
--          tables — `versus_editorials` (was versus-content.ts, 49K LOC)
--          and `advisor_guide_content` (was advisor-guides.ts, 45K LOC).
--          Both tables get RLS enabled with public-read policies and
--          two indexes apiece for the lookup paths used by the
--          comparison pages and advisor-guide pages.
-- Rollback: DROP indexes, DROP policy, DISABLE RLS, DROP each table —
--           in reverse order, advisor_guide_content first, then
--           versus_editorials.
-- Risk: high — DROP TABLE on populated tables permanently discards
--       editorial content. The original .ts source files have since
--       been deleted (the whole point of this migration was to move
--       content out of the codebase), so there is no cheap revert to
--       a pre-state. Operators MUST snapshot both tables to cold
--       storage before any reverse migration; otherwise the comparison
--       pages and advisor-guide pages will render empty.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS versus_editorials (id SERIAL PK,
--      slug UNIQUE, broker_a_slug, broker_b_slug, title,
--      meta_description, intro, choose_a, choose_b, sections JSONB,
--      verdict, faqs JSONB, created_at, updated_at).
--   2. ALTER TABLE versus_editorials ENABLE ROW LEVEL SECURITY.
--   3. CREATE POLICY "Public read versus editorials" FOR SELECT
--        TO anon, authenticated USING (true).
--   4. CREATE INDEX idx_versus_editorials_slug ON versus_editorials(slug).
--   5. CREATE INDEX idx_versus_editorials_brokers
--        ON versus_editorials(broker_a_slug, broker_b_slug).
--   6. CREATE TABLE IF NOT EXISTS advisor_guide_content (id SERIAL PK,
--      slug UNIQUE, advisor_type, title, meta_description, intro,
--      sections JSONB, checklist JSONB, red_flags JSONB, faqs JSONB,
--      cost_guide JSONB, created_at, updated_at).
--   7. ALTER TABLE advisor_guide_content ENABLE ROW LEVEL SECURITY.
--   8. CREATE POLICY "Public read advisor guides" FOR SELECT
--        TO anon, authenticated USING (true).
--   9. CREATE INDEX idx_advisor_guide_content_slug
--        ON advisor_guide_content(slug).
--  10. CREATE INDEX idx_advisor_guide_content_type
--        ON advisor_guide_content(advisor_type).
--
-- Rollback (in reverse order):
--  10. DROP INDEX IF EXISTS public.idx_advisor_guide_content_type;
--   9. DROP INDEX IF EXISTS public.idx_advisor_guide_content_slug;
--   8. DROP POLICY IF EXISTS "Public read advisor guides"
--        ON advisor_guide_content;
--   7. ALTER TABLE advisor_guide_content DISABLE ROW LEVEL SECURITY;
--   6. DROP TABLE IF EXISTS advisor_guide_content;
--      -- DESTRUCTIVE: discards every advisor-guide editorial row.
--      -- Snapshot first.
--   5. DROP INDEX IF EXISTS public.idx_versus_editorials_brokers;
--   4. DROP INDEX IF EXISTS public.idx_versus_editorials_slug;
--   3. DROP POLICY IF EXISTS "Public read versus editorials"
--        ON versus_editorials;
--   2. ALTER TABLE versus_editorials DISABLE ROW LEVEL SECURITY;
--   1. DROP TABLE IF EXISTS versus_editorials;
--      -- DESTRUCTIVE: discards every broker-vs-broker editorial row.
--      -- Snapshot first.
-- ============================================================================

-- Migration: Move large content-as-code files to Supabase tables
-- versus-content.ts (49K LOC) → versus_editorials
-- advisor-guides.ts (45K LOC) → advisor_guide_content

-- ─── Versus Editorials ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS versus_editorials (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- e.g. "commsec-vs-stake" (sorted alphabetically)
  broker_a_slug TEXT NOT NULL,         -- first slug alphabetically
  broker_b_slug TEXT NOT NULL,         -- second slug alphabetically
  title TEXT NOT NULL,                 -- display title (currently derived from broker names)
  meta_description TEXT,
  intro TEXT,                          -- "tldr" field from the TS source
  choose_a TEXT,                       -- "Choose X if..." for broker_a
  choose_b TEXT,                       -- "Choose X if..." for broker_b
  sections JSONB,                      -- array of {heading, body}
  verdict TEXT,
  faqs JSONB,                          -- array of {question, answer}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE versus_editorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read versus editorials" ON versus_editorials
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX idx_versus_editorials_slug ON versus_editorials(slug);
CREATE INDEX idx_versus_editorials_brokers ON versus_editorials(broker_a_slug, broker_b_slug);


-- ─── Advisor Guide Content ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_guide_content (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- e.g. "how-to-choose-financial-planner"
  advisor_type TEXT NOT NULL,          -- ProfessionalType value, e.g. "financial_planner"
  title TEXT NOT NULL,
  meta_description TEXT,
  intro TEXT,
  sections JSONB,                      -- array of {heading, body}
  checklist JSONB,                     -- array of strings
  red_flags JSONB,                     -- array of strings
  faqs JSONB,                          -- array of {question, answer}
  cost_guide JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE advisor_guide_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read advisor guides" ON advisor_guide_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX idx_advisor_guide_content_slug ON advisor_guide_content(slug);
CREATE INDEX idx_advisor_guide_content_type ON advisor_guide_content(advisor_type);
