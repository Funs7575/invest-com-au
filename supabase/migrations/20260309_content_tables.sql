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
