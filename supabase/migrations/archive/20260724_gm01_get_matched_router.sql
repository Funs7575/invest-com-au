-- ============================================================================
-- Migration: 20260724_gm01_get_matched_router.sql
-- Purpose: Get Matched 2.0 — turn the broker-quiz into the whole-site decision
--          router that outputs an Investment Action Plan. Adds the intent
--          taxonomy, adaptive question registry, route-result templates, the
--          saveable Action Plan record, and the funnel analytics log. Also
--          adds `linked_action_plan_id` to advisor_auctions so the Brief
--          Tracker can show "from your action plan" provenance.
--
-- Idempotent: ALTER TABLE … ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
-- EXISTS / CREATE INDEX IF NOT EXISTS / ON CONFLICT DO NOTHING. Safe to
-- re-apply.
--
-- Rollback (destructive, reverse order):
--   DROP TABLE IF EXISTS public.get_matched_events;
--   DROP TABLE IF EXISTS public.get_matched_action_plans CASCADE;
--   DROP TABLE IF EXISTS public.get_matched_result_templates;
--   DROP TABLE IF EXISTS public.get_matched_questions;
--   DROP TABLE IF EXISTS public.intent_taxonomy;
--   ALTER TABLE public.advisor_auctions DROP COLUMN IF EXISTS linked_action_plan_id;
--
-- Risk: medium — additive only on advisor_auctions; new tables are seeded
-- (intents/questions/result_templates) and discarding admin tuning on
-- rollback. Plans + events tables hold user data.
-- ============================================================================

BEGIN;

-- ── 1. intent_taxonomy ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.intent_taxonomy (
  id              serial PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  label           text NOT NULL,
  description     text,
  default_route   text NOT NULL DEFAULT 'guide'
    CHECK (default_route IN (
      'compare','browse','individual','firm','expert_team',
      'investor_brief','listing_brief','second_opinion','guide'
    )),
  default_brief_template text,
  risk_level      text NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low','medium','high')),
  enabled         boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 100,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intent_taxonomy_enabled
  ON public.intent_taxonomy (enabled, sort_order);

ALTER TABLE public.intent_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled intents" ON public.intent_taxonomy;
CREATE POLICY "Public can read enabled intents"
  ON public.intent_taxonomy FOR SELECT
  USING (enabled = true);

DROP POLICY IF EXISTS "Service role full access intents" ON public.intent_taxonomy;
CREATE POLICY "Service role full access intents"
  ON public.intent_taxonomy FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO public.intent_taxonomy (slug, label, description, default_route, default_brief_template, risk_level, sort_order) VALUES
  ('compare_platform',      'Compare investing platforms',  'Compare brokers, super funds, robo-advisors or property platforms.',  'compare',         NULL,                       'low',    10),
  ('start_investing',       'Start investing',              'New to investing — figure out the right first step.',                 'compare',         NULL,                       'low',    20),
  ('smsf_property',         'Invest through SMSF',          'Property or shares inside a self-managed super fund.',                'expert_team',     'smsf_property',            'medium', 30),
  ('buy_property',          'Buy investment property',      'Residential investment property.',                                    'individual',      'mortgage',                 'low',    40),
  ('opportunity_assessment','Assess an opportunity',        'Get help reviewing a specific deal or listing.',                      'expert_team',     'opportunity_assessment',   'medium', 50),
  ('business_acquisition',  'Buy a business',               'Acquire an Australian business.',                                     'expert_team',     'business_acquisition',     'medium', 60),
  ('commercial_property',   'Commercial property',          'Buy, lease or invest in commercial property.',                        'expert_team',     'commercial_property',      'medium', 70),
  ('foreign_investor',      'Invest from overseas',         'Non-resident or overseas investor into Australia.',                   'expert_team',     'foreign_investor',         'high',   80),
  ('expat_investing',       'Australian expat investing',   'Australian living overseas investing back home.',                     'individual',      'expat',                    'medium', 90),
  ('financial_advice',      'Get financial advice',         'Licensed financial planning advice.',                                 'individual',      'financial_adviser',        'high',  100),
  ('tax_help',              'Get tax / accounting help',    'Tax planning or returns.',                                            'individual',      'tax',                      'medium',110),
  ('mortgage_help',         'Get lending / mortgage help',  'Home, investment or commercial finance.',                             'individual',      'mortgage',                 'low',   120),
  ('legal_help',            'Get legal / conveyancing help','Property settlement, contracts, structuring.',                        'individual',      'general',                  'medium',130),
  ('second_opinion',        'Get a second opinion',         'Have advice or a deal independently reviewed.',                       'second_opinion',  'second_opinion',           'medium',140),
  ('listing_owner',         'Post / list an opportunity',   'Seller of a business, property or other deal.',                       'listing_brief',   'listing',                  'low',   150),
  ('listing_readiness',     'Prepare a listing',            'Get your opportunity ready to list.',                                 'listing_brief',   'listing_readiness',        'low',   160),
  ('not_sure',              'Not sure yet',                 'Browse and figure it out as you go.',                                 'guide',           NULL,                       'low',   999)
ON CONFLICT (slug) DO NOTHING;

-- ── 2. get_matched_questions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.get_matched_questions (
  id              serial PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  step            int NOT NULL,
  kind            text NOT NULL
    CHECK (kind IN ('select','multiselect','text','number','contextual')),
  prompt          text NOT NULL,
  subtitle        text,
  options         jsonb NOT NULL DEFAULT '[]'::jsonb,
  shown_if        jsonb NOT NULL DEFAULT '{}'::jsonb,
  maps_to         text NOT NULL,
  risk_weight     int NOT NULL DEFAULT 0,
  mode            text NOT NULL DEFAULT 'both'
    CHECK (mode IN ('fast','guided','both')),
  enabled         boolean NOT NULL DEFAULT true,
  sort_order      int NOT NULL DEFAULT 100,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_get_matched_questions_enabled
  ON public.get_matched_questions (enabled, step, sort_order);

ALTER TABLE public.get_matched_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled questions" ON public.get_matched_questions;
CREATE POLICY "Public can read enabled questions"
  ON public.get_matched_questions FOR SELECT
  USING (enabled = true);

DROP POLICY IF EXISTS "Service role full access questions" ON public.get_matched_questions;
CREATE POLICY "Service role full access questions"
  ON public.get_matched_questions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Seed: 7 base questions + 4 branching questions. Options stored as jsonb
-- arrays of {value,label,intent_hint?,route_hint?}.
INSERT INTO public.get_matched_questions (slug, step, kind, prompt, subtitle, options, shown_if, maps_to, mode, sort_order) VALUES
  (
    'starting_point', 1, 'select',
    'Where are you starting from?',
    'We adapt the rest of the plan to your situation.',
    '[
      {"value":"australia","label":"Australia"},
      {"value":"overseas","label":"Overseas"},
      {"value":"expat","label":"Australian expat"},
      {"value":"business","label":"Business / company"},
      {"value":"professional","label":"Adviser / broker / professional"},
      {"value":"listing_owner","label":"Listing owner / seller"}
    ]'::jsonb,
    '{}'::jsonb,
    'starting_point', 'both', 10
  ),
  (
    'goal', 2, 'select',
    'What are you trying to do?',
    'This is the most important step. Pick the closest match.',
    '[
      {"value":"compare_platform","label":"Compare investing platforms","intent_hint":"compare_platform","route_hint":"compare"},
      {"value":"start_investing","label":"Start investing","intent_hint":"start_investing","route_hint":"compare"},
      {"value":"buy_property","label":"Buy investment property","intent_hint":"buy_property","route_hint":"individual"},
      {"value":"smsf_property","label":"Invest through my SMSF","intent_hint":"smsf_property","route_hint":"expert_team"},
      {"value":"opportunity_assessment","label":"Assess an opportunity","intent_hint":"opportunity_assessment","route_hint":"expert_team"},
      {"value":"business_acquisition","label":"Buy a business","intent_hint":"business_acquisition","route_hint":"expert_team"},
      {"value":"commercial_property","label":"Commercial property","intent_hint":"commercial_property","route_hint":"expert_team"},
      {"value":"foreign_investor","label":"Invest from overseas","intent_hint":"foreign_investor","route_hint":"expert_team"},
      {"value":"financial_advice","label":"Get expert help","intent_hint":"financial_advice","route_hint":"individual"},
      {"value":"listing_owner","label":"Post / list an opportunity","intent_hint":"listing_owner","route_hint":"listing_brief"},
      {"value":"not_sure","label":"Not sure yet","intent_hint":"not_sure","route_hint":"guide"}
    ]'::jsonb,
    '{}'::jsonb,
    'intent', 'both', 20
  ),
  (
    'smsf_situation', 3, 'select',
    'What best describes your SMSF situation?',
    NULL,
    '[
      {"value":"no_smsf","label":"Thinking about setting up an SMSF"},
      {"value":"considering_smsf","label":"Already considering one"},
      {"value":"smsf_established","label":"I already have an SMSF"},
      {"value":"smsf_property","label":"I want to buy property through SMSF"},
      {"value":"not_sure","label":"Not sure"}
    ]'::jsonb,
    '{"intent":["smsf_property"]}'::jsonb,
    'smsf_status', 'guided', 30
  ),
  (
    'opportunity_situation', 3, 'select',
    'What best describes the opportunity?',
    NULL,
    '[
      {"value":"on_invest","label":"I found it on Invest.com.au"},
      {"value":"elsewhere","label":"I found it elsewhere"},
      {"value":"browsing","label":"I want to browse opportunities"},
      {"value":"assessing","label":"I need help assessing a deal"},
      {"value":"listing_it","label":"I want to list / sell one","route_hint":"listing_brief"}
    ]'::jsonb,
    '{"intent":["opportunity_assessment"]}'::jsonb,
    'opportunity_context', 'guided', 30
  ),
  (
    'foreign_situation', 3, 'select',
    'What kind of investment from overseas?',
    NULL,
    '[
      {"value":"property","label":"Australian property"},
      {"value":"business","label":"Australian businesses"},
      {"value":"tax_legal","label":"Need tax / legal help first"},
      {"value":"finance","label":"Need finance / mortgage help"},
      {"value":"not_sure","label":"Not sure where to start"}
    ]'::jsonb,
    '{"intent":["foreign_investor"]}'::jsonb,
    'foreign_focus', 'guided', 30
  ),
  (
    'help_preference', 4, 'select',
    'How much help do you want?',
    'You can change this later.',
    '[
      {"value":"info_only","label":"Just show me information","route_hint":"guide"},
      {"value":"compare","label":"Show me platforms to compare","route_hint":"compare"},
      {"value":"individual","label":"Show me individual experts","route_hint":"individual"},
      {"value":"firm","label":"Show me firms / brokerages","route_hint":"firm"},
      {"value":"expert_team","label":"Show me expert teams","route_hint":"expert_team"},
      {"value":"investor_brief","label":"Create a brief for professionals","route_hint":"investor_brief"},
      {"value":"not_sure","label":"Not sure — guide me"}
    ]'::jsonb,
    '{}'::jsonb,
    'help_preference', 'both', 40
  ),
  (
    'budget', 5, 'select',
    'Budget or scale?',
    'Bands only — keeps things private.',
    '[
      {"value":"under_10k","label":"Under A$10k"},
      {"value":"10k_100k","label":"A$10k – A$100k"},
      {"value":"100k_500k","label":"A$100k – A$500k"},
      {"value":"500k_1m","label":"A$500k – A$1m"},
      {"value":"1m_plus","label":"A$1m+"},
      {"value":"prefer_not","label":"Prefer not to say"}
    ]'::jsonb,
    '{}'::jsonb,
    'budget_band', 'both', 50
  ),
  (
    'timeline', 6, 'select',
    'Timeline?',
    NULL,
    '[
      {"value":"now","label":"Now"},
      {"value":"1_3_months","label":"1–3 months"},
      {"value":"3_6_months","label":"3–6 months"},
      {"value":"6_12_months","label":"6–12 months"},
      {"value":"researching","label":"Just researching"}
    ]'::jsonb,
    '{}'::jsonb,
    'timeline', 'both', 60
  ),
  (
    'continue', 7, 'select',
    'How should we continue?',
    'Pick one — you can always come back.',
    '[
      {"value":"show_plan","label":"Show my action plan","route_hint":"guide"},
      {"value":"create_brief","label":"Create an Investor Brief","route_hint":"investor_brief"},
      {"value":"browse","label":"Browse recommended options"},
      {"value":"email_me","label":"Email me my result"},
      {"value":"create_account","label":"Create a free account to save"}
    ]'::jsonb,
    '{}'::jsonb,
    'continue_choice', 'guided', 70
  )
ON CONFLICT (slug) DO NOTHING;

-- ── 3. get_matched_result_templates ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.get_matched_result_templates (
  id              serial PRIMARY KEY,
  route           text NOT NULL
    CHECK (route IN (
      'compare','browse','individual','firm','expert_team',
      'investor_brief','listing_brief','second_opinion','guide'
    )),
  intent_slug     text,
  headline        text NOT NULL,
  why_text        text NOT NULL,
  checklist       jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_cta     jsonb NOT NULL DEFAULT '{}'::jsonb,
  secondary_ctas  jsonb NOT NULL DEFAULT '[]'::jsonb,
  cross_sells     jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled         boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text,
  UNIQUE (route, intent_slug)
);

CREATE INDEX IF NOT EXISTS idx_result_templates_route
  ON public.get_matched_result_templates (route, enabled);

ALTER TABLE public.get_matched_result_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled result templates" ON public.get_matched_result_templates;
CREATE POLICY "Public can read enabled result templates"
  ON public.get_matched_result_templates FOR SELECT
  USING (enabled = true);

DROP POLICY IF EXISTS "Service role full access result templates" ON public.get_matched_result_templates;
CREATE POLICY "Service role full access result templates"
  ON public.get_matched_result_templates FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Seed: default template per route + rich overrides for the four big intents.
-- Cross-sells capped at 3.
INSERT INTO public.get_matched_result_templates
  (route, intent_slug, headline, why_text, checklist, primary_cta, secondary_ctas, cross_sells)
SELECT * FROM (VALUES
  (
    'compare', NULL,
    'Compare Platforms',
    'Based on your answers, the right next step is to compare platforms side-by-side. You can stay completely independent — Invest.com.au provides general information only.',
    '[
      {"label":"See the comparison shortlist"},
      {"label":"Run the fee calculator"},
      {"label":"Check what each broker actually charges"},
      {"label":"Save your shortlist"}
    ]'::jsonb,
    '{"label":"Compare platforms","href":"/compare"}'::jsonb,
    '[
      {"label":"Fee calculator","href":"/calculators/fee-impact"},
      {"label":"Get expert help if unsure","href":"/get-matched?goal=financial_advice"}
    ]'::jsonb,
    '[
      {"label":"How brokerage actually adds up","href":"/article/how-brokerage-adds-up","icon":"calculator"},
      {"label":"CHESS vs custodial","href":"/article/chess-vs-custodial","icon":"shield-check"}
    ]'::jsonb
  ),
  (
    'compare', 'compare_platform',
    'Compare Investing Platforms',
    'You told us you want to compare. Here are the verified comparison tables that match your budget and asset preferences.',
    '[
      {"label":"Open the comparison shortlist","href":"/compare"},
      {"label":"Run the platform fee calculator","href":"/calculators/fee-impact"},
      {"label":"Check CHESS sponsorship","href":"/chess-lookup"},
      {"label":"Read this year''s broker review"}
    ]'::jsonb,
    '{"label":"Compare platforms","href":"/compare"}'::jsonb,
    '[
      {"label":"Find the cheapest US-shares broker","href":"/global-investing/shares/us"},
      {"label":"Switch broker safely","href":"/switch"}
    ]'::jsonb,
    '[
      {"label":"Best ETF brokers right now","href":"/best/cheapest-us-shares","icon":"trending-up"},
      {"label":"Save your shortlist","href":"/shortlist","icon":"bookmark"}
    ]'::jsonb
  ),
  (
    'browse', NULL,
    'Browse Opportunities',
    'Open opportunities matching your shape. You stay anonymous unless you choose to enquire.',
    '[
      {"label":"View matching opportunities","href":"/invest"},
      {"label":"Save your opportunity alerts"},
      {"label":"Create an Opportunity Brief"}
    ]'::jsonb,
    '{"label":"View opportunities","href":"/invest"}'::jsonb,
    '[
      {"label":"Get help assessing","href":"/get-matched?goal=opportunity_assessment"}
    ]'::jsonb,
    '[
      {"label":"How to read a private deal","href":"/articles","icon":"file-text"}
    ]'::jsonb
  ),
  (
    'individual', NULL,
    'Verified Individual Expert',
    'A single verified professional is likely the cleanest fit. You stay in control — they only see your details after you decide to share them.',
    '[
      {"label":"Browse verified individuals","href":"/advisors?provider_type=individual"},
      {"label":"Compare two profiles side-by-side"},
      {"label":"Create a brief for one professional"}
    ]'::jsonb,
    '{"label":"Browse individuals","href":"/advisors?provider_type=individual"}'::jsonb,
    '[
      {"label":"Or consider a firm","href":"/advisors?provider_type=firm"},
      {"label":"Create an Investor Brief","href":"/briefs/new"}
    ]'::jsonb,
    '[
      {"label":"Questions to ask any adviser","href":"/articles","icon":"message-circle"}
    ]'::jsonb
  ),
  (
    'firm', NULL,
    'Firm or Brokerage',
    'You prefer the structure of a firm. Browse verified firms — each one has at least one verified representative.',
    '[
      {"label":"Browse verified firms","href":"/advisors?provider_type=firm"},
      {"label":"Compare firm representatives"},
      {"label":"Create an Investor Brief"}
    ]'::jsonb,
    '{"label":"Browse firms","href":"/advisors?provider_type=firm"}'::jsonb,
    '[
      {"label":"View firm reviews","href":"/advisors"},
      {"label":"Create an Investor Brief","href":"/briefs/new"}
    ]'::jsonb,
    '[
      {"label":"Firm vs individual: how to pick","href":"/articles","icon":"users"}
    ]'::jsonb
  ),
  (
    'expert_team', NULL,
    'Verified Expert Team',
    'Your situation usually involves more than one professional. A verified expert team coordinates the work so you don''t.',
    '[
      {"label":"Browse verified expert teams","href":"/advisors#expert-teams"},
      {"label":"See who is on each team"},
      {"label":"Create an Investor Brief for a team"}
    ]'::jsonb,
    '{"label":"Browse expert teams","href":"/advisors#expert-teams"}'::jsonb,
    '[
      {"label":"Create an Investor Brief","href":"/briefs/new"},
      {"label":"Who do I need on my team?","href":"/articles"}
    ]'::jsonb,
    '[
      {"label":"How verified teams work","href":"/articles","icon":"users"}
    ]'::jsonb
  ),
  (
    'expert_team', 'smsf_property',
    'Verified SMSF Property Expert Team',
    'This usually involves more than one professional: SMSF structure, financial advice, lending and property selection. A verified team coordinates the work so you don''t.',
    '[
      {"label":"Read the SMSF property guide","href":"/smsf"},
      {"label":"Compare SMSF-compatible platforms / brokers","href":"/compare"},
      {"label":"Speak with an SMSF accountant"},
      {"label":"Speak with a licensed financial adviser"},
      {"label":"Check SMSF borrowing options"},
      {"label":"Create your SMSF Property Brief"}
    ]'::jsonb,
    '{"label":"Create SMSF Property Brief","href":"/briefs/new?template=smsf_property&provider_preference=expert_team&routing_mode=smart_match"}'::jsonb,
    '[
      {"label":"Browse SMSF Expert Teams","href":"/advisors#expert-teams"},
      {"label":"Compare SMSF brokers","href":"/compare"},
      {"label":"Find SMSF accountants","href":"/advisors?type=smsf_accountant"}
    ]'::jsonb,
    '[
      {"label":"SMSF property checklist","href":"/smsf-calculator","icon":"calculator"},
      {"label":"How SMSF lending actually works","href":"/articles","icon":"landmark"}
    ]'::jsonb
  ),
  (
    'expert_team', 'foreign_investor',
    'Verified Foreign Investor Expert Team',
    'Investing in Australia from overseas usually needs tax, FIRB / legal, mortgage and a buyer''s agent. A verified team coordinates the work so you don''t.',
    '[
      {"label":"Read the foreign investor guide","href":"/foreign-investment"},
      {"label":"Run the FIRB fee estimator","href":"/firb-fee-estimator"},
      {"label":"Check your tax residency"},
      {"label":"Get mortgage options for non-residents"},
      {"label":"Create your Foreign Investor Brief"}
    ]'::jsonb,
    '{"label":"Create Foreign Investor Brief","href":"/briefs/new?template=foreign_investor&provider_preference=expert_team&routing_mode=smart_match"}'::jsonb,
    '[
      {"label":"Browse Foreign Investor teams","href":"/advisors#expert-teams"},
      {"label":"Compare AU-friendly brokers","href":"/compare"}
    ]'::jsonb,
    '[
      {"label":"FIRB application 101","href":"/foreign-investment","icon":"globe"},
      {"label":"Non-resident CGT checker","href":"/non-resident-cgt-checker","icon":"calculator"}
    ]'::jsonb
  ),
  (
    'expert_team', 'opportunity_assessment',
    'Verified Opportunity Due-Diligence Team',
    'Assessing a deal is usually a team sport — finance, tax, legal, due diligence. A verified team coordinates the work so you don''t miss anything.',
    '[
      {"label":"List the opportunity you''re reviewing"},
      {"label":"Identify the finance options","href":"/calculators/mortgage-calculator"},
      {"label":"Get tax / accounting input"},
      {"label":"Get legal review"},
      {"label":"Create your Opportunity Brief"}
    ]'::jsonb,
    '{"label":"Create Opportunity Brief","href":"/briefs/new?template=opportunity_assessment&provider_preference=expert_team&routing_mode=smart_match"}'::jsonb,
    '[
      {"label":"Browse Due-Diligence teams","href":"/advisors#expert-teams"},
      {"label":"Get finance only","href":"/get-matched?goal=mortgage_help"}
    ]'::jsonb,
    '[
      {"label":"Private deal red flags","href":"/articles","icon":"shield"}
    ]'::jsonb
  ),
  (
    'investor_brief', NULL,
    'Create an Investor Brief',
    'You''re ready to be contacted by a verified provider. We''ll route your masked brief to the right professionals.',
    '[
      {"label":"Confirm the goal of your brief"},
      {"label":"Pick smart-match, direct or multi-response"},
      {"label":"Add contact and consent"}
    ]'::jsonb,
    '{"label":"Create brief","href":"/briefs/new"}'::jsonb,
    '[
      {"label":"Browse providers first","href":"/advisors"}
    ]'::jsonb,
    '[
      {"label":"How accept works","href":"/articles","icon":"info"}
    ]'::jsonb
  ),
  (
    'listing_brief', NULL,
    'Prepare Your Listing',
    'You''re on the seller side. A successful listing usually needs a few moving parts — legal, financial, valuation, marketing. Prepare a Listing Brief and we''ll route it to the right verified professionals, or hand-pick them yourself below.',
    '[
      {"label":"Listing readiness check"},
      {"label":"Get a transaction lawyer for the contract"},
      {"label":"Get an accountant on tax structuring"},
      {"label":"Get an independent valuation"},
      {"label":"Prepare your due-diligence pack"},
      {"label":"Create your Listing Brief"}
    ]'::jsonb,
    '{"label":"Create Listing Brief","href":"/briefs/new?template=listing_readiness"}'::jsonb,
    '[
      {"label":"Post your opportunity","href":"/invest"},
      {"label":"Speak to listing experts","href":"/advisors"}
    ]'::jsonb,
    '[
      {"label":"Find a transaction lawyer","href":"/advisors?type=lawyer","icon":"scale"},
      {"label":"Find a property / business accountant","href":"/advisors?type=accountant","icon":"calculator"},
      {"label":"Find a valuation expert","href":"/advisors?type=valuer","icon":"trending-up"}
    ]'::jsonb
  ),
  (
    'second_opinion', NULL,
    'Second Opinion Brief',
    'You want an independent review of advice or a deal. Verified professionals can review it under their own licence and terms.',
    '[
      {"label":"Describe what needs reviewing"},
      {"label":"Pick the right review type"},
      {"label":"Create your Second Opinion Brief"}
    ]'::jsonb,
    '{"label":"Create Second Opinion Brief","href":"/briefs/new?template=second_opinion"}'::jsonb,
    '[
      {"label":"Find a licensed adviser","href":"/advisors?type=financial_planner"},
      {"label":"Find a tax / accounting reviewer","href":"/advisors?type=tax_agent"}
    ]'::jsonb,
    '[
      {"label":"When to get a second opinion","href":"/articles","icon":"shield"}
    ]'::jsonb
  ),
  (
    'guide', NULL,
    'Start with information',
    'You''re early — here is the curated reading and tooling for where you are.',
    '[
      {"label":"Read the most relevant guide"},
      {"label":"Run a calculator"},
      {"label":"Come back when you''re ready"}
    ]'::jsonb,
    '{"label":"Browse guides","href":"/articles"}'::jsonb,
    '[
      {"label":"Start the action plan over","href":"/get-matched"}
    ]'::jsonb,
    '[
      {"label":"Most popular guides","href":"/articles","icon":"file-text"}
    ]'::jsonb
  )
) AS seed(route, intent_slug, headline, why_text, checklist, primary_cta, secondary_ctas, cross_sells)
WHERE NOT EXISTS (
  SELECT 1 FROM public.get_matched_result_templates r
  WHERE r.route = seed.route
    AND (r.intent_slug IS NOT DISTINCT FROM seed.intent_slug)
);

-- ── 4. get_matched_action_plans ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.get_matched_action_plans (
  id                    serial PRIMARY KEY,
  session_id            text NOT NULL,
  auth_user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email                 text,
  intent_slug           text REFERENCES public.intent_taxonomy(slug),
  secondary_intent_slug text REFERENCES public.intent_taxonomy(slug),
  route                 text
    CHECK (route IS NULL OR route IN (
      'compare','browse','individual','firm','expert_team',
      'investor_brief','listing_brief','second_opinion','guide'
    )),
  goal                  text,
  answers               jsonb NOT NULL DEFAULT '{}'::jsonb,
  checklist             jsonb NOT NULL DEFAULT '[]'::jsonb,
  budget_band           text,
  timeline              text,
  location_state        text,
  country_of_residence  text,
  help_needed           text[] NOT NULL DEFAULT '{}'::text[],
  risk_flags            text[] NOT NULL DEFAULT '{}'::text[],
  risk_severity         text,
  linked_brief_id       int REFERENCES public.advisor_auctions(id) ON DELETE SET NULL,
  share_token           text UNIQUE NOT NULL,
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','saved','converted','expired')),
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_plans_session
  ON public.get_matched_action_plans (session_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_auth_user
  ON public.get_matched_action_plans (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_plans_token
  ON public.get_matched_action_plans (share_token);
CREATE INDEX IF NOT EXISTS idx_action_plans_intent_route
  ON public.get_matched_action_plans (intent_slug, route);

ALTER TABLE public.get_matched_action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own action plan" ON public.get_matched_action_plans;
CREATE POLICY "Owner reads own action plan"
  ON public.get_matched_action_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Owner updates own action plan" ON public.get_matched_action_plans;
CREATE POLICY "Owner updates own action plan"
  ON public.get_matched_action_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Service role full access action plans" ON public.get_matched_action_plans;
CREATE POLICY "Service role full access action plans"
  ON public.get_matched_action_plans FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. get_matched_events ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.get_matched_events (
  id              bigserial PRIMARY KEY,
  session_id      text,
  auth_user_id    uuid,
  event_type      text NOT NULL,
  step            int,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_page     text,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gm_events_type_created
  ON public.get_matched_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gm_events_session
  ON public.get_matched_events (session_id, created_at);

ALTER TABLE public.get_matched_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access gm events" ON public.get_matched_events;
CREATE POLICY "Service role full access gm events"
  ON public.get_matched_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 6. advisor_auctions extension: link back to action plan ──────────────
ALTER TABLE public.advisor_auctions
  ADD COLUMN IF NOT EXISTS linked_action_plan_id int
    REFERENCES public.get_matched_action_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_auctions_linked_plan
  ON public.advisor_auctions (linked_action_plan_id)
  WHERE linked_action_plan_id IS NOT NULL;

COMMIT;
