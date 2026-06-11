-- gm06: Migrate get_matched_result_templates to the v2 schema used by the
-- Decision Engine (P1–P9). The baseline table had a legacy shape
-- (slug / title / body_md / steps / cta_label / cta_route) that the new
-- engine never queries — every getResultTemplate() call threw on the missing
-- `route` column, caught the error, and fell back to the hardcoded minimal
-- fallbacks. Result: every user saw the same generic output regardless of
-- their answers.
--
-- This migration:
--   1. Adds the v2 columns (idempotent — IF NOT EXISTS guards).
--   2. Adds a unique index on (route, intent_slug) for fast lookups.
--   3. Seeds the 9 canonical route templates so the engine returns real
--      content immediately after deploy.
--
-- Rollback strategy:
--   ALTER TABLE public.get_matched_result_templates
--     DROP COLUMN IF EXISTS route,
--     DROP COLUMN IF EXISTS headline,
--     DROP COLUMN IF EXISTS why_text,
--     DROP COLUMN IF EXISTS checklist,
--     DROP COLUMN IF EXISTS primary_cta,
--     DROP COLUMN IF EXISTS secondary_ctas,
--     DROP COLUMN IF EXISTS cross_sells;
--   DROP INDEX IF EXISTS idx_gm_result_templates_route_intent;
--   (Old slug/title/body_md columns are untouched — no data loss.)

-- ── 1. Add v2 columns ──────────────────────────────────────────────────────

ALTER TABLE public.get_matched_result_templates
  ADD COLUMN IF NOT EXISTS route         text,
  ADD COLUMN IF NOT EXISTS headline      text,
  ADD COLUMN IF NOT EXISTS why_text      text,
  ADD COLUMN IF NOT EXISTS checklist     jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS primary_cta   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS secondary_ctas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cross_sells   jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ── 2. Unique index for (route, intent_slug) lookups ──────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_gm_result_templates_route_intent
  ON public.get_matched_result_templates (route, intent_slug)
  WHERE intent_slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gm_result_templates_route_default
  ON public.get_matched_result_templates (route)
  WHERE intent_slug IS NULL;

-- ── 3. Seed the 9 canonical route templates ───────────────────────────────
-- intent_slug NULL = default for that route (no per-intent override).
-- These mirror FALLBACK_TEMPLATES in lib/getmatched/fallbacks.ts exactly so
-- the DB and code stay in lockstep. Admin can add per-intent rows on top.

INSERT INTO public.get_matched_result_templates
  (slug, title, enabled, route, intent_slug, headline, why_text, checklist, primary_cta, secondary_ctas, cross_sells)
VALUES

-- compare (default)
('compare_default', 'Compare Platforms', true, 'compare', NULL,
  'Compare Platforms',
  'Based on your answers, comparing platforms side-by-side is the right next step. We''ve scored your top match below — keep scrolling for the rest of the shortlist.',
  '[
    {"label":"See your top match","href":"/compare"},
    {"label":"Compare the full shortlist","href":"/compare"},
    {"label":"Run the fee calculator","href":"/fee-impact"},
    {"label":"Check CHESS sponsorship","href":"/chess-lookup"},
    {"label":"Save your shortlist"}
  ]'::jsonb,
  '{"label":"See full comparison","href":"/compare"}'::jsonb,
  '[{"label":"Fee calculator","href":"/fee-impact"},{"label":"Get expert help if unsure","href":"/get-matched?goal=help"}]'::jsonb,
  '[{"label":"How brokerage actually adds up","href":"/article/how-brokerage-adds-up","icon":"calculator"},{"label":"CHESS vs custodial","href":"/article/chess-vs-custodial","icon":"shield-check"}]'::jsonb
),

-- browse (default)
('browse_default', 'Browse Opportunities', true, 'browse', NULL,
  'Browse Opportunities',
  'Open opportunities matching your shape. You stay anonymous unless you choose to enquire — no signup required.',
  '[
    {"label":"View matching opportunities","href":"/invest"},
    {"label":"Filter by vertical, ticket size, location"},
    {"label":"Save searches for alerts"},
    {"label":"Create an Opportunity Brief if you want help assessing"}
  ]'::jsonb,
  '{"label":"View opportunities","href":"/invest"}'::jsonb,
  '[{"label":"Get help assessing","href":"/get-matched?goal=help"},{"label":"Compare platforms instead","href":"/compare"}]'::jsonb,
  '[{"label":"How to read a private deal","href":"/articles","icon":"file-text"},{"label":"Wholesale-investor explainer","href":"/articles","icon":"shield"}]'::jsonb
),

-- individual (default)
('individual_default', 'Verified Individual Expert', true, 'individual', NULL,
  'Verified Individual Expert',
  'A single verified professional is likely the cleanest fit. You stay in control — they only see your details after you decide to share them.',
  '[
    {"label":"Browse verified individuals","href":"/advisors?provider_type=individual"},
    {"label":"Compare two profiles side-by-side"},
    {"label":"Create a brief for one professional"}
  ]'::jsonb,
  '{"label":"Browse verified experts","href":"/advisors?provider_type=individual"}'::jsonb,
  '[{"label":"Or consider a firm","href":"/advisors?provider_type=firm"},{"label":"Get Quotes from Verified Experts","href":"/briefs/new"}]'::jsonb,
  '[{"label":"Questions to ask any adviser","href":"/articles","icon":"message-circle"},{"label":"How verified profiles work","href":"/articles","icon":"shield-check"}]'::jsonb
),

-- firm (default)
('firm_default', 'Firm or Brokerage', true, 'firm', NULL,
  'Firm or Brokerage',
  'You prefer the structure of a firm. Browse verified firms — each one has at least one verified representative.',
  '[
    {"label":"Browse verified firms","href":"/advisors?provider_type=firm"},
    {"label":"Compare firm representatives"},
    {"label":"Create an Investor Brief"}
  ]'::jsonb,
  '{"label":"Browse firms","href":"/advisors?provider_type=firm"}'::jsonb,
  '[{"label":"View firm reviews","href":"/advisors"},{"label":"Get Quotes from Firms","href":"/briefs/new"}]'::jsonb,
  '[{"label":"Firm vs individual: how to pick","href":"/articles","icon":"users"}]'::jsonb
),

-- expert_team (default)
('expert_team_default', 'Verified Pro Squad', true, 'expert_team', NULL,
  'Verified Pro Squad',
  'Your situation usually involves more than one professional. A verified Pro Squad coordinates the work so you don''t — accountant, adviser, broker all in one team.',
  '[
    {"label":"Browse verified Pro Squads","href":"/advisors#expert-teams"},
    {"label":"See who is on each squad"},
    {"label":"Get Quotes from a Pro Squad"}
  ]'::jsonb,
  '{"label":"Browse Pro Squads","href":"/advisors#expert-teams"}'::jsonb,
  '[{"label":"Get Quotes from a Pro Squad","href":"/briefs/new"},{"label":"Who do I need on my team?","href":"/articles"}]'::jsonb,
  '[{"label":"How verified teams work","href":"/articles","icon":"users"}]'::jsonb
),

-- investor_brief (default)
('investor_brief_default', 'Get Quotes from Verified Pros', true, 'investor_brief', NULL,
  'Get Quotes from Verified Pros',
  'You''re ready to be contacted by a verified Australian professional. We''ll route your masked Match Request to the right pros — you stay anonymous until you choose to share your details.',
  '[
    {"label":"Confirm what you need"},
    {"label":"Choose smart-match, direct, or multi-response"},
    {"label":"Add contact and consent"}
  ]'::jsonb,
  '{"label":"Get Quotes","href":"/briefs/new"}'::jsonb,
  '[{"label":"Browse providers first","href":"/advisors"}]'::jsonb,
  '[{"label":"How accept works","href":"/articles","icon":"info"}]'::jsonb
),

-- listing_brief (default)
('listing_brief_default', 'Sell with Us', true, 'listing_brief', NULL,
  'Sell with Us',
  'You''re on the seller side. A successful listing usually needs a few moving parts — legal, financial, valuation, marketing. List your deal with us and we''ll route it to the right verified Australian professionals.',
  '[
    {"label":"Listing readiness check"},
    {"label":"Get a transaction lawyer for the contract"},
    {"label":"Get an accountant on tax structuring"},
    {"label":"Get an independent valuation"},
    {"label":"Prepare your due-diligence pack"},
    {"label":"List your deal"}
  ]'::jsonb,
  '{"label":"Sell with Us","href":"/briefs/new?template=listing_readiness"}'::jsonb,
  '[{"label":"Post your opportunity","href":"/invest"},{"label":"Speak to listing experts","href":"/advisors"}]'::jsonb,
  '[{"label":"Find a transaction lawyer","href":"/advisors?type=lawyer","icon":"scale"},{"label":"Find a property / business accountant","href":"/advisors?type=accountant","icon":"calculator"}]'::jsonb
),

-- second_opinion (default)
('second_opinion_default', 'Get a Second Opinion', true, 'second_opinion', NULL,
  'Get a Second Opinion',
  'You want an independent review of advice or a deal. Verified Australian professionals can review it under their own licence and terms.',
  '[
    {"label":"Describe what needs reviewing"},
    {"label":"Pick the right review type"},
    {"label":"Request your second opinion"}
  ]'::jsonb,
  '{"label":"Get a Second Opinion","href":"/briefs/new?template=second_opinion"}'::jsonb,
  '[{"label":"Find a licensed adviser","href":"/advisors?type=financial_planner"},{"label":"Find a tax / accounting reviewer","href":"/advisors?type=tax_agent"}]'::jsonb,
  '[{"label":"When to get a second opinion","href":"/articles","icon":"shield"}]'::jsonb
),

-- guide (default)
('guide_default', 'Start with information', true, 'guide', NULL,
  'Start with information',
  'You''re early — here is the curated reading and tooling for where you are.',
  '[
    {"label":"Read the most relevant guide"},
    {"label":"Run a calculator"},
    {"label":"Come back when you''re ready"}
  ]'::jsonb,
  '{"label":"Browse guides","href":"/articles"}'::jsonb,
  '[{"label":"Start the action plan over","href":"/get-matched"}]'::jsonb,
  '[{"label":"Most popular guides","href":"/articles","icon":"file-text"}]'::jsonb
)

ON CONFLICT DO NOTHING;
