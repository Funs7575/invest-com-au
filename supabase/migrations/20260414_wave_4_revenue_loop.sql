-- Wave 4: Revenue loop schema.
--
-- Tables introduced:
--   1. sponsored_placements   — paid advisor boost tier (bid + cap)
--   2. referral_rewards       — referral payout state machine
--   3. attribution_touches    — multi-touch funnel events
--
-- Existing tables extended:
--   - ab_experiments  → add auto_promote_at + auto_promoted_variant
--   - professionals   → flag for is_sponsored
-- (column adds are IF NOT EXISTS — safe to re-run)

-- ── 1. sponsored_placements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sponsored_placements (
  id              bigserial PRIMARY KEY,
  professional_id integer NOT NULL,
  vertical        text,
  tier            text NOT NULL, -- 'boost' | 'premium' | 'top'
  daily_cap_cents bigint NOT NULL DEFAULT 0,
  spend_today_cents bigint NOT NULL DEFAULT 0,
  starts_at       timestamptz NOT NULL DEFAULT now(),
  ends_at         timestamptz,
  active          boolean NOT NULL DEFAULT true,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsored_placements_prof
  ON public.sponsored_placements (professional_id, active, starts_at);
CREATE INDEX IF NOT EXISTS idx_sponsored_placements_vertical
  ON public.sponsored_placements (vertical, active)
  WHERE active = true;

ALTER TABLE public.sponsored_placements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sponsored_placements
  DROP CONSTRAINT IF EXISTS sponsored_placements_tier_check;
ALTER TABLE public.sponsored_placements
  ADD CONSTRAINT sponsored_placements_tier_check CHECK (
    tier = ANY (ARRAY['boost'::text, 'premium'::text, 'top'::text])
  );

-- Flag on professionals so the ranker can fast-path
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_sponsored boolean NOT NULL DEFAULT false;
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS sponsored_boost integer;

-- ── 2. referral_rewards ───────────────────────────────────────────
-- One row per successful referral. The payout cron processes rows
-- where status='pending' and creates an advisor credit balance
-- adjustment + a financial_audit_log entry.
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id              bigserial PRIMARY KEY,
  referral_code   text NOT NULL,
  referrer_email  text NOT NULL,
  referred_email  text NOT NULL,
  trigger_event   text NOT NULL,              -- 'signup' | 'first_lead' | 'first_topup'
  reward_cents    integer NOT NULL,
  status          text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'rejected'
  paid_at         timestamptz,
  payout_method   text,                       -- 'credit_balance' | 'bank' | 'stripe'
  payout_reference text,
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_status
  ON public.referral_rewards (status, created_at);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer
  ON public.referral_rewards (referrer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_code
  ON public.referral_rewards (referral_code);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.referral_rewards
  DROP CONSTRAINT IF EXISTS referral_rewards_status_check;
ALTER TABLE public.referral_rewards
  ADD CONSTRAINT referral_rewards_status_check CHECK (
    status = ANY (ARRAY['pending'::text, 'paid'::text, 'rejected'::text])
  );

-- ── 3. attribution_touches ────────────────────────────────────────
-- One row per recorded touchpoint along a user's journey. Used for
-- first-touch / last-touch / linear attribution on the admin
-- dashboard. session_id is a client-generated UUID that survives
-- page nav but dies at browser close; user_key links sessions by
-- email when the user identifies.
CREATE TABLE IF NOT EXISTS public.attribution_touches (
  id              bigserial PRIMARY KEY,
  session_id      text NOT NULL,
  user_key        text,                 -- email or user_id once known
  event           text NOT NULL,        -- 'view' | 'click' | 'signup' | 'lead' | 'conversion'
  channel         text,                 -- 'organic' | 'direct' | 'paid' | 'email' | 'referral' | 'social'
  source          text,                 -- utm_source
  medium          text,                 -- utm_medium
  campaign        text,                 -- utm_campaign
  landing_path    text,                 -- first page seen in this touchpoint
  page_path       text,                 -- current page
  vertical        text,                 -- broker / advisor / property / super etc
  value_cents     integer,              -- revenue at this touch, if applicable
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_touches_session
  ON public.attribution_touches (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_attribution_touches_user_key
  ON public.attribution_touches (user_key, created_at);
CREATE INDEX IF NOT EXISTS idx_attribution_touches_event
  ON public.attribution_touches (event, created_at DESC);

ALTER TABLE public.attribution_touches ENABLE ROW LEVEL SECURITY;

-- ── 4. ab_tests auto-promote columns ───────────────────────────────
-- Add auto_promoted_variant for the nightly promoter cron to stamp
-- the declared winner. min_sample_size is a gate the cron enforces
-- (don't promote if we haven't reached it yet).
ALTER TABLE IF EXISTS public.ab_tests
  ADD COLUMN IF NOT EXISTS auto_promoted_variant text,
  ADD COLUMN IF NOT EXISTS auto_promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS min_sample_size integer DEFAULT 200,
  ADD COLUMN IF NOT EXISTS significance_threshold numeric DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS auto_promoted boolean NOT NULL DEFAULT false;

-- ── 5. quiz_leads drip columns ─────────────────────────────────────
-- Abandoned-quiz re-engagement cron tracks state per lead so it
-- doesn't re-send. converted_at lets us mark a lead done the moment
-- they click through or submit an advisor enquiry.
ALTER TABLE IF EXISTS public.quiz_leads
  ADD COLUMN IF NOT EXISTS drip_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drip_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_quiz_leads_drip ON public.quiz_leads (drip_step, captured_at);

-- ── 6. professionals.advisor_dormant_nudged_at ────────────────────
-- Stamp set by the weekly dormant-nudge cron so we don't re-send
-- within the cooldown window.
ALTER TABLE IF EXISTS public.professionals
  ADD COLUMN IF NOT EXISTS advisor_dormant_nudged_at timestamptz;

-- ── 7. email_captures.winback_sent_at ─────────────────────────────
-- Stamp set by the monthly winback cron so we only send one
-- winback email per user.
ALTER TABLE IF EXISTS public.email_captures
  ADD COLUMN IF NOT EXISTS winback_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_email_captures_winback
  ON public.email_captures (winback_sent_at, captured_at);
