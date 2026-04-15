-- Wave 14 schema — newsroom engine.
--
-- Tables introduced:
--   1. article_templates         — structured form definitions for common piece types
--                                   (broker_review, news_brief, how_to, comparison_post)
--   2. article_scorecard_runs    — deterministic rule-based scorecard runs against
--                                   an article draft, persisted so the admin UI can
--                                   render history and so the most-recent run is
--                                   cached (not re-run on every keystroke)
--   3. article_preview_tokens    — signed draft-preview URLs so an editor can share
--                                   an unpublished piece with a reviewer without
--                                   opening admin access
--
-- Design notes:
--   - The scorecard is deterministic, not LLM-based, and runs in <10ms.
--     The existing `article_quality_scores` table (Wave 3) stays for the
--     slower LLM-backed post-publish pass; this is the write-time lane.
--   - Templates are seed data, not user-generated. Editors pick a template
--     to start a piece but the editor doesn't save template overrides.
--   - Preview tokens are single-use by intent (revoked on open), but
--     nothing enforces that — they expire instead. This matches how
--     Google Docs share-links work and is the simplest thing editors
--     understand.

-- ── 1. article_templates ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.article_templates (
  id                   bigserial PRIMARY KEY,
  slug                 text NOT NULL UNIQUE,           -- 'broker_review', 'news_brief'
  display_name         text NOT NULL,
  description          text NOT NULL,
  category_hint        text,                           -- 'reviews' | 'news' | 'how-to'
  min_words            integer NOT NULL DEFAULT 600,
  required_sections    jsonb NOT NULL DEFAULT '[]',    -- [{ heading, intent, placeholder }]
  required_fields      jsonb NOT NULL DEFAULT '[]',    -- [{ key, label, kind }]
  default_tags         text[] NOT NULL DEFAULT '{}',
  compliance_notes     text,                           -- one-line reminder for the editor
  display_order        integer NOT NULL DEFAULT 100,
  status               text NOT NULL DEFAULT 'active', -- 'active' | 'retired'
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_templates_active
  ON public.article_templates (display_order, slug)
  WHERE status = 'active';

ALTER TABLE public.article_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.article_templates
  DROP CONSTRAINT IF EXISTS article_templates_status_check;
ALTER TABLE public.article_templates
  ADD CONSTRAINT article_templates_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'retired'::text])
  );

COMMENT ON TABLE public.article_templates IS
  'Structured template definitions for common article types. Editors pick a template to start a draft.';

-- ── 2. article_scorecard_runs ───────────────────────────────────
-- One row per scorecard run. We keep history (not just latest)
-- so an editor can see the piece improving as they write it, and
-- the admin can audit what the classifier flagged pre-publish.
CREATE TABLE IF NOT EXISTS public.article_scorecard_runs (
  id                   bigserial PRIMARY KEY,
  article_slug         text NOT NULL,
  score                integer NOT NULL,               -- 0-100
  grade                text NOT NULL,                  -- 'A' | 'B' | 'C' | 'D' | 'F'
  passed_checks        text[] NOT NULL DEFAULT '{}',
  failed_checks        text[] NOT NULL DEFAULT '{}',
  remediation          jsonb,                          -- [{ check, message, severity }]
  run_by               text,                           -- admin email, nullable for automated
  run_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_scorecard_runs_article
  ON public.article_scorecard_runs (article_slug, run_at DESC);

ALTER TABLE public.article_scorecard_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.article_scorecard_runs
  DROP CONSTRAINT IF EXISTS article_scorecard_runs_grade_check;
ALTER TABLE public.article_scorecard_runs
  ADD CONSTRAINT article_scorecard_runs_grade_check CHECK (
    grade = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'F'::text])
  );

-- ── 3. article_preview_tokens ───────────────────────────────────
-- Signed preview URLs for draft sharing. Each token maps to a
-- single article_slug and expires. No mutable state on the row
-- itself — the resolver just checks (a) exists (b) not expired
-- (c) not revoked, then renders the current draft content.
CREATE TABLE IF NOT EXISTS public.article_preview_tokens (
  id                   bigserial PRIMARY KEY,
  token                text NOT NULL UNIQUE,            -- 32-char url-safe random
  article_slug         text NOT NULL,
  created_by           text NOT NULL,                   -- admin email
  note                 text,                            -- internal reminder
  expires_at           timestamptz NOT NULL,
  revoked_at           timestamptz,
  opened_count         integer NOT NULL DEFAULT 0,
  last_opened_at       timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_preview_tokens_slug
  ON public.article_preview_tokens (article_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_preview_tokens_active
  ON public.article_preview_tokens (expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.article_preview_tokens ENABLE ROW LEVEL SECURITY;

-- ── 4. Seed the 4 starter templates ─────────────────────────────
-- Editors pick one of these to start a new piece. Template data
-- is editorial (not user-facing), so we only need a minimal set.
INSERT INTO public.article_templates
  (slug, display_name, description, category_hint, min_words, required_sections, required_fields, default_tags, compliance_notes, display_order)
VALUES (
  'broker_review',
  'Broker review',
  'Full platform review with pros, cons, fees, and a verdict. Runs 1,200-2,500 words.',
  'reviews',
  1200,
  '[
    {"heading": "Verdict", "intent": "One-paragraph summary including our rating and who it''s best for.", "placeholder": "Stake is a no-frills online broker best for Australians who want US shares with a simple interface and low brokerage..."},
    {"heading": "Who should use it", "intent": "Target user + deal-breakers.", "placeholder": "Best for: first-time investors who want..."},
    {"heading": "Fees", "intent": "Brokerage, FX, inactivity, withdrawals, subscriptions.", "placeholder": "Brokerage: $3 flat..."},
    {"heading": "Features", "intent": "Trading interface, markets covered, research tools, mobile app, customer support.", "placeholder": "Markets: ASX, US..."},
    {"heading": "Pros and cons", "intent": "Balanced list, backed by evidence.", "placeholder": "Pros:\\n- ...\\nCons:\\n- ..."},
    {"heading": "Alternatives", "intent": "2-3 alternatives with why.", "placeholder": "Consider CMC if you want..."},
    {"heading": "Compliance", "intent": "General advice warning, affiliate disclosure, last-reviewed date.", "placeholder": "This review is general advice only..."}
  ]'::jsonb,
  '[
    {"key": "broker_slug", "label": "Broker slug", "kind": "text"},
    {"key": "rating", "label": "Rating (0-5)", "kind": "number"},
    {"key": "affiliate_disclosure", "label": "Affiliate disclosure included", "kind": "boolean"}
  ]'::jsonb,
  ARRAY['reviews', 'broker']::text[],
  'Must include affiliate disclosure + general advice warning. Never guarantee future returns.',
  10
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  required_sections = EXCLUDED.required_sections,
  required_fields = EXCLUDED.required_fields,
  compliance_notes = EXCLUDED.compliance_notes,
  updated_at = now();

INSERT INTO public.article_templates
  (slug, display_name, description, category_hint, min_words, required_sections, required_fields, default_tags, compliance_notes, display_order)
VALUES (
  'news_brief',
  'News brief',
  'Rapid-publish piece tied to a confirmed ASX release or government announcement. Runs 400-800 words.',
  'news',
  400,
  '[
    {"heading": "What happened", "intent": "Plain-English summary of the announcement, with a direct link to the primary source.", "placeholder": "On [date], [company/agency] announced..."},
    {"heading": "Why it matters for Australian investors", "intent": "Who is affected, what they should do or watch.", "placeholder": "For retail investors holding..."},
    {"heading": "Affected ASX-listed companies", "intent": "Tickers + the direct link, no price predictions.", "placeholder": "Woodside Energy (WDS) is the largest listed operator in..."},
    {"heading": "Risk factors", "intent": "Regulatory, execution, commodity-price, ESG.", "placeholder": "Key risks include..."},
    {"heading": "Compliance", "intent": "General advice warning + primary-source link reiterated.", "placeholder": "This news summary is general advice only..."}
  ]'::jsonb,
  '[
    {"key": "event_date", "label": "Event date", "kind": "date"},
    {"key": "source_url", "label": "Primary source URL", "kind": "url"},
    {"key": "sector_slug", "label": "Related sector slug", "kind": "text"}
  ]'::jsonb,
  ARRAY['news', 'commodity']::text[],
  'Primary source link required. No forward-looking price targets. Byline + reviewer stamp before publish.',
  20
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  required_sections = EXCLUDED.required_sections,
  required_fields = EXCLUDED.required_fields,
  compliance_notes = EXCLUDED.compliance_notes,
  updated_at = now();

INSERT INTO public.article_templates
  (slug, display_name, description, category_hint, min_words, required_sections, required_fields, default_tags, compliance_notes, display_order)
VALUES (
  'how_to',
  'How-to guide',
  'Step-by-step explainer. Runs 1,000-2,000 words with a numbered steps list.',
  'beginners',
  1000,
  '[
    {"heading": "What you''ll need", "intent": "Prerequisites + rough time estimate.", "placeholder": "Before you start: a verified email, photo ID, approx 15 minutes..."},
    {"heading": "Step 1", "intent": "First action, clearly described.", "placeholder": "..."},
    {"heading": "Step 2", "intent": "Next action.", "placeholder": "..."},
    {"heading": "Step 3", "intent": "Continue numbering.", "placeholder": "..."},
    {"heading": "Common mistakes to avoid", "intent": "Specific gotchas, not generic advice.", "placeholder": "..."},
    {"heading": "Compliance", "intent": "General advice warning + link to further reading.", "placeholder": "This guide is general advice only..."}
  ]'::jsonb,
  '[
    {"key": "difficulty", "label": "Difficulty (beginner|intermediate|advanced)", "kind": "text"},
    {"key": "time_minutes", "label": "Time (minutes)", "kind": "number"}
  ]'::jsonb,
  ARRAY['beginners', 'how-to']::text[],
  'Step numbering must be sequential. No affiliate-exclusive "sign up here to continue" gates mid-steps.',
  30
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  required_sections = EXCLUDED.required_sections,
  required_fields = EXCLUDED.required_fields,
  compliance_notes = EXCLUDED.compliance_notes,
  updated_at = now();

INSERT INTO public.article_templates
  (slug, display_name, description, category_hint, min_words, required_sections, required_fields, default_tags, compliance_notes, display_order)
VALUES (
  'comparison_post',
  'Comparison post',
  'X vs Y head-to-head. Runs 900-1,800 words with a structured criteria table.',
  'reviews',
  900,
  '[
    {"heading": "Quick verdict", "intent": "One-paragraph summary: who wins for whom.", "placeholder": "X is the better pick if you care about..., Y is the better pick if you care about..."},
    {"heading": "Fees head-to-head", "intent": "Side-by-side table with identical scenarios.", "placeholder": "Trade: 10 ASX shares at $1000..."},
    {"heading": "Features compared", "intent": "Tabular feature comparison, no hand-waving.", "placeholder": "..."},
    {"heading": "Best for which user", "intent": "Specific user types mapped to each option.", "placeholder": "If you''re a..."},
    {"heading": "Compliance", "intent": "General advice warning + affiliate disclosure.", "placeholder": "..."}
  ]'::jsonb,
  '[
    {"key": "broker_a", "label": "Broker A slug", "kind": "text"},
    {"key": "broker_b", "label": "Broker B slug", "kind": "text"}
  ]'::jsonb,
  ARRAY['reviews', 'comparison']::text[],
  'Comparisons must use identical scenarios (same trade size, same markets) when quoting fees.',
  40
)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  required_sections = EXCLUDED.required_sections,
  required_fields = EXCLUDED.required_fields,
  compliance_notes = EXCLUDED.compliance_notes,
  updated_at = now();
