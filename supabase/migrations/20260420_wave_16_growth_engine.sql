-- Wave 16 schema — growth engine.
--
-- Tables introduced:
--   1. best_for_scenarios    — programmatic SEO seed for /best-for/<slug>
--   2. newsletter_segments   — named segments for targeted sends
--   3. newsletter_subscriptions — per-email subscription state (opt in/out)
--                                  with segment membership
--   4. exit_intent_events    — anonymous capture of exit-intent modal
--                              dismisses + conversions for A/B tuning
--
-- Design notes:
--   - best_for_scenarios is seed data. Each row powers a
--     programmatic /best-for/<slug> page with a server-rendered
--     broker ranking, an editorial intro, and an advisor CTA.
--   - newsletter_subscriptions is distinct from email_captures (the
--     existing wave 4 table) — email_captures is the lead-capture
--     superset, newsletter_subscriptions is the opt-in subset with
--     double-opt-in confirmation and segment membership. We do
--     NOT merge them because email_captures is append-only for
--     attribution tracking.
--   - exit_intent_events is anonymous and aggregated — we record
--     (modal_variant, action, session_id_hash) and roll up nightly
--     for the admin A/B view. No PII.

-- ── 1. best_for_scenarios ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.best_for_scenarios (
  id                   bigserial PRIMARY KEY,
  slug                 text NOT NULL UNIQUE,
  h1                   text NOT NULL,
  intro                text NOT NULL,
  meta_description     text NOT NULL,
  -- Scoring weights — each field is a weight 0..1 summed against
  -- broker attributes to rank them for this scenario.
  -- e.g. { "asx_fee": 0.4, "us_fee": 0.2, "chess_sponsored": 0.3 }
  scoring_weights      jsonb NOT NULL,
  -- Required attributes: brokers that DON'T have these are filtered out.
  -- e.g. ["chess_sponsored", "smsf_support"]
  required_attrs       text[] NOT NULL DEFAULT '{}',
  -- Preferred category / platform_type filter
  category_filter      text,
  -- Target user blurb rendered on the page
  target_user          text NOT NULL,
  -- Sub-headings for the page body (optional)
  body_sections        jsonb,
  status               text NOT NULL DEFAULT 'active',
  display_order        integer NOT NULL DEFAULT 100,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_best_for_scenarios_active
  ON public.best_for_scenarios (display_order, slug)
  WHERE status = 'active';

ALTER TABLE public.best_for_scenarios ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.best_for_scenarios
  DROP CONSTRAINT IF EXISTS best_for_scenarios_status_check;
ALTER TABLE public.best_for_scenarios
  ADD CONSTRAINT best_for_scenarios_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'draft'::text, 'retired'::text])
  );

-- ── 2. newsletter_segments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_segments (
  id                   bigserial PRIMARY KEY,
  slug                 text NOT NULL UNIQUE,
  display_name         text NOT NULL,
  description          text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_segments ENABLE ROW LEVEL SECURITY;

-- ── 3. newsletter_subscriptions ────────────────────────────────
-- One row per (email, segment_slug). Nulls for segment_slug mean
-- the all-subscribers default channel.
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id                   bigserial PRIMARY KEY,
  email                text NOT NULL,
  segment_slug         text,
  confirmed            boolean NOT NULL DEFAULT false,
  confirmation_token   text,
  unsubscribed_at      timestamptz,
  unsubscribe_token    text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  confirmed_at         timestamptz,
  UNIQUE (email, segment_slug)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email
  ON public.newsletter_subscriptions (email, confirmed);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_segment
  ON public.newsletter_subscriptions (segment_slug, confirmed)
  WHERE unsubscribed_at IS NULL;

ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── 4. exit_intent_events ──────────────────────────────────────
-- Aggregated for A/B tuning of modal variants. No PII — just the
-- variant name, the action (dismiss | subscribe | quiz_click), and
-- a hashed session id.
CREATE TABLE IF NOT EXISTS public.exit_intent_events (
  id                   bigserial PRIMARY KEY,
  modal_variant        text NOT NULL,
  action               text NOT NULL,      -- 'shown' | 'dismissed' | 'converted_subscribe' | 'converted_quiz'
  session_hash         text,
  page_path            text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exit_intent_events_variant_time
  ON public.exit_intent_events (modal_variant, created_at DESC);

ALTER TABLE public.exit_intent_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exit_intent_events
  DROP CONSTRAINT IF EXISTS exit_intent_events_action_check;
ALTER TABLE public.exit_intent_events
  ADD CONSTRAINT exit_intent_events_action_check CHECK (
    action = ANY (ARRAY['shown'::text, 'dismissed'::text, 'converted_subscribe'::text, 'converted_quiz'::text])
  );

-- ── Seed the first batch of /best-for/ scenarios ──────────────
INSERT INTO public.best_for_scenarios
  (slug, h1, intro, meta_description, scoring_weights, required_attrs, target_user, display_order)
VALUES (
  'smsf-500k',
  'Best brokers for SMSF trustees with $500k+',
  'Self-managed super funds with six-figure balances need brokers that support SMSF ownership structures, offer CHESS-sponsored holdings, and keep international trading costs low. The rankings below weight CHESS sponsorship, SMSF support and international access more heavily than brokerage on small trades.',
  'Independent comparison of the best share-trading platforms for Australian SMSF trustees with $500k+, weighted by CHESS sponsorship, SMSF support and international access.',
  '{"chess_sponsored": 0.35, "smsf_support": 0.30, "us_fee_value": -0.15, "asx_fee_value": -0.20}'::jsonb,
  ARRAY['smsf_support', 'chess_sponsored']::text[],
  'SMSF trustees with $500k+ who need CHESS-sponsored custody and international market access.',
  10
)
ON CONFLICT (slug) DO UPDATE SET
  h1 = EXCLUDED.h1,
  intro = EXCLUDED.intro,
  meta_description = EXCLUDED.meta_description,
  scoring_weights = EXCLUDED.scoring_weights,
  required_attrs = EXCLUDED.required_attrs,
  target_user = EXCLUDED.target_user,
  updated_at = now();

INSERT INTO public.best_for_scenarios
  (slug, h1, intro, meta_description, scoring_weights, required_attrs, target_user, display_order)
VALUES (
  'etfs-under-1000',
  'Best brokers for buying ETFs with less than $1,000',
  'Small ETF buyers are punished by percentage brokerage — a 0.10% charge on a $500 trade is negligible, but a $9.50 flat fee eats 1.9% of your position on day one. The rankings below weight low flat brokerage most heavily, followed by dividend reinvestment support and fractional shares where available.',
  'Independent ranking of the cheapest Australian brokers for buying ETFs with less than $1,000 per trade. Flat brokerage, DRP support, fractional shares compared.',
  '{"asx_fee_value": -0.50, "chess_sponsored": 0.20, "us_fee_value": -0.10}'::jsonb,
  ARRAY[]::text[],
  'Beginner investors building an ETF portfolio with small, regular contributions.',
  20
)
ON CONFLICT (slug) DO UPDATE SET
  h1 = EXCLUDED.h1,
  intro = EXCLUDED.intro,
  meta_description = EXCLUDED.meta_description,
  scoring_weights = EXCLUDED.scoring_weights,
  required_attrs = EXCLUDED.required_attrs,
  target_user = EXCLUDED.target_user,
  updated_at = now();

INSERT INTO public.best_for_scenarios
  (slug, h1, intro, meta_description, scoring_weights, required_attrs, target_user, display_order)
VALUES (
  'international-shares-beginner',
  'Best brokers for international shares (beginner-friendly)',
  'Beginners buying US or global shares care about FX costs, interface simplicity, and fractional share support. The rankings below weight low FX rates and US brokerage above everything else, with a bonus for brokers that support fractional purchases so a beginner can buy a single share of a $300+ ticker.',
  'Independent ranking of the best beginner-friendly brokers for international shares. FX rates, US brokerage, fractional support and onboarding experience compared.',
  '{"us_fee_value": -0.35, "fx_rate": -0.35, "asx_fee_value": -0.10}'::jsonb,
  ARRAY[]::text[],
  'New investors who want to buy US or global shares without getting destroyed by FX fees.',
  30
)
ON CONFLICT (slug) DO UPDATE SET
  h1 = EXCLUDED.h1,
  intro = EXCLUDED.intro,
  meta_description = EXCLUDED.meta_description,
  scoring_weights = EXCLUDED.scoring_weights,
  required_attrs = EXCLUDED.required_attrs,
  target_user = EXCLUDED.target_user,
  updated_at = now();

-- Seed the default newsletter segments
INSERT INTO public.newsletter_segments (slug, display_name, description)
VALUES
  ('weekly', 'Weekly digest', 'Weekly summary of fee changes, new broker reviews and editorial picks.'),
  ('deals', 'Deals + offers', 'Just the deals — new broker sign-up bonuses, fee drops and limited-time offers.'),
  ('advisor-insight', 'Advisor insight', 'For SMSF trustees and high-net-worth readers — advisor-authored commentary and scenario walkthroughs.')
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description;
