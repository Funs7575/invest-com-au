-- Wave 8 schema — growth engine.
--
-- Tables introduced:
--   1. nps_responses           — Net Promoter / CSAT feedback
--   2. newsletter_subscribers  — dedicated list for the
--                                newsletter CTA (separate from
--                                email_captures so we can manage
--                                subscribers as a first-class
--                                audience)
--   3. dynamic_pricing_rules   — tiered + surge pricing for
--                                leads (runs alongside the existing
--                                `lead_pricing` table)
--
-- Extensions to existing tables:
--   - professionals → health scorecard cache columns
--
-- Materialised view:
--   - advisor_cohort_metrics   — monthly signup cohorts → leads /
--                                spend / active months → powers
--                                the retention dashboard

-- ── 1. nps_responses ───────────────────────────────────────────────
-- One row per NPS / CSAT answer. Targetable at advisors or users.
-- Follow-up comment is optional but highly valued — surfaced on the
-- admin NPS dashboard as verbatim feedback.
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id              bigserial PRIMARY KEY,
  respondent_type text NOT NULL,        -- 'user' | 'advisor' | 'broker'
  respondent_id   text,                 -- email or id, null for anonymous
  trigger         text NOT NULL,        -- 'post_purchase' | 'post_lead' | 'monthly' | 'exit_intent'
  score           integer NOT NULL,     -- 0-10
  comment         text,
  session_id      text,
  user_agent      text,
  ip_hash         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nps_responses_created
  ON public.nps_responses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nps_responses_respondent
  ON public.nps_responses (respondent_type, created_at DESC);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nps_responses
  DROP CONSTRAINT IF EXISTS nps_responses_score_check;
ALTER TABLE public.nps_responses
  ADD CONSTRAINT nps_responses_score_check CHECK (
    score >= 0 AND score <= 10
  );

ALTER TABLE public.nps_responses
  DROP CONSTRAINT IF EXISTS nps_responses_respondent_type_check;
ALTER TABLE public.nps_responses
  ADD CONSTRAINT nps_responses_respondent_type_check CHECK (
    respondent_type = ANY (ARRAY['user'::text, 'advisor'::text, 'broker'::text])
  );

-- ── 2. newsletter_subscribers ──────────────────────────────────────
-- Dedicated newsletter list. Separate from email_captures so that
-- deleting a signup here does not lose the quiz/calculator capture.
-- Supports preference_level for "weekly", "monthly", "quarterly"
-- cadence.
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id              bigserial PRIMARY KEY,
  email           text NOT NULL UNIQUE,
  name            text,
  source          text,                 -- which component / page added them
  preference      text NOT NULL DEFAULT 'weekly', -- 'weekly' | 'monthly' | 'quarterly'
  status          text NOT NULL DEFAULT 'active', -- 'active' | 'unsubscribed' | 'bounced'
  confirmed_at    timestamptz,          -- double opt-in timestamp
  last_sent_at    timestamptz,
  subscribed_at   timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active
  ON public.newsletter_subscribers (status, preference)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
  ON public.newsletter_subscribers (email);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_status_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'unsubscribed'::text, 'bounced'::text])
  );

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT IF EXISTS newsletter_subscribers_preference_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_preference_check CHECK (
    preference = ANY (ARRAY['weekly'::text, 'monthly'::text, 'quarterly'::text])
  );

-- ── 3. dynamic_pricing_rules ───────────────────────────────────────
-- Layered on top of `lead_pricing` — pricing resolver consults this
-- table first and falls back to static pricing if no matching rule.
--
-- priority: higher wins when multiple rules match.
-- Each rule carries a multiplier on the base lead price (1.0 = no
-- change, 0.8 = -20%, 1.5 = +50%) and an optional fixed floor/cap.
CREATE TABLE IF NOT EXISTS public.dynamic_pricing_rules (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  advisor_type    text,                 -- null = any
  vertical        text,                 -- null = any
  min_quality_score integer,            -- lead_quality_score gating
  max_quality_score integer,
  time_of_day_start_hour integer,       -- 0-23 local AEST
  time_of_day_end_hour   integer,
  new_advisor_days integer,             -- e.g. "advisor < 30d old" discount tier
  multiplier      numeric NOT NULL DEFAULT 1.0,
  floor_cents     integer,
  cap_cents       integer,
  priority        integer NOT NULL DEFAULT 100,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text
);

CREATE INDEX IF NOT EXISTS idx_dynamic_pricing_rules_enabled
  ON public.dynamic_pricing_rules (enabled, priority DESC)
  WHERE enabled = true;

ALTER TABLE public.dynamic_pricing_rules ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.dynamic_pricing_rules
  DROP CONSTRAINT IF EXISTS dynamic_pricing_rules_multiplier_check;
ALTER TABLE public.dynamic_pricing_rules
  ADD CONSTRAINT dynamic_pricing_rules_multiplier_check CHECK (
    multiplier >= 0.1 AND multiplier <= 5.0
  );

-- ── 4. professionals health scorecard cache columns ────────────────
ALTER TABLE IF EXISTS public.professionals
  ADD COLUMN IF NOT EXISTS health_score integer,
  ADD COLUMN IF NOT EXISTS health_scored_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_factors jsonb;

-- ── 5. advisor_cohort_metrics view ─────────────────────────────────
-- Monthly signup cohort → leads purchased, total spend, months
-- active. Materialised so the dashboard stays fast. Refreshed by
-- the cohort-refresh cron nightly.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.advisor_cohort_metrics AS
WITH cohorts AS (
  SELECT
    id,
    date_trunc('month', created_at)::date AS cohort_month,
    COALESCE(credit_balance_cents, 0) AS credit_balance_cents,
    status,
    created_at
  FROM public.professionals
)
SELECT
  c.cohort_month,
  COUNT(*) AS advisors_signed_up,
  COUNT(*) FILTER (WHERE c.status = 'active') AS advisors_still_active,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE c.status = 'active') / NULLIF(COUNT(*), 0),
    2
  ) AS retention_pct,
  COALESCE(SUM(c.credit_balance_cents), 0) AS total_credit_balance_cents,
  MIN(c.created_at) AS earliest_signup,
  MAX(c.created_at) AS latest_signup
FROM cohorts c
GROUP BY c.cohort_month
ORDER BY c.cohort_month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_advisor_cohort_metrics_month
  ON public.advisor_cohort_metrics (cohort_month);
