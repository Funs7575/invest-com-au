-- Schema additions for Automation Wave 1.
--
-- Every feature in this wave either reuses existing tables or needs
-- a small set of new columns / tables. Batching them into a single
-- migration so the PR is easy to roll forward / back.
--
-- Features covered (by number):
--   T1.5  Profile quality gate drip         → professionals.profile_gate_step
--   T1.6  Stripe dunning state machine      → advisor_credit_topups.dunning_*
--   T1.7  Broker data change classifier     → broker_data_changes.auto_applied_*
--   T2.8  Email bounce auto-suppression     → email_suppression_list table
--   T2.10 Lead quality weights feedback     → lead_quality_weights table

-- ── T1.5 Profile gate drip step tracking ────────────────────────
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS profile_gate_step smallint;
COMMENT ON COLUMN public.professionals.profile_gate_step IS
  'Drip step 0=none, 1=welcome, 2=day3, 3=day7, 4=day14. Used by the advisor-profile-gate-drip cron to avoid double-emailing.';

-- ── T1.6 Stripe dunning state on failed topups ──────────────────
ALTER TABLE public.advisor_credit_topups
  ADD COLUMN IF NOT EXISTS dunning_step smallint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dunning_last_attempt_at timestamptz;
COMMENT ON COLUMN public.advisor_credit_topups.dunning_step IS
  'Dunning progress 0=not started, 1=day1, 2=day3, 3=day7. Each step retries the Stripe charge + escalates email urgency.';

-- ── T1.7 Broker data change auto-apply audit ────────────────────
ALTER TABLE public.broker_data_changes
  ADD COLUMN IF NOT EXISTS auto_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_applied_tier text;

ALTER TABLE public.broker_data_changes
  DROP CONSTRAINT IF EXISTS broker_data_changes_auto_tier_check;
ALTER TABLE public.broker_data_changes
  ADD CONSTRAINT broker_data_changes_auto_tier_check CHECK (
    auto_applied_tier IS NULL OR auto_applied_tier = ANY (ARRAY[
      'auto_apply'::text, 'auto_apply_reviewable'::text, 'require_admin'::text
    ])
  );
COMMENT ON COLUMN public.broker_data_changes.auto_applied_tier IS
  'Classification tier at the time the change was processed. Tracked for audit + reversal window enforcement.';

-- ── T2.8 Email suppression list ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_suppression_list (
  email         text PRIMARY KEY,
  reason        text NOT NULL,
  source        text,                 -- 'resend_webhook' | 'manual' | 'cron'
  bounce_count  integer DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  notes         text
);

ALTER TABLE public.email_suppression_list
  DROP CONSTRAINT IF EXISTS email_suppression_list_reason_check;
ALTER TABLE public.email_suppression_list
  ADD CONSTRAINT email_suppression_list_reason_check CHECK (
    reason = ANY (ARRAY[
      'hard_bounce'::text,
      'soft_bounce_repeated'::text,
      'spam_complaint'::text,
      'manual'::text,
      'unsubscribe'::text
    ])
  );

CREATE INDEX IF NOT EXISTS idx_email_suppression_last_seen
  ON public.email_suppression_list (last_seen_at);

ALTER TABLE public.email_suppression_list ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.email_suppression_list IS
  'Emails that must never receive future transactional or marketing sends. Checked by every Resend send helper.';

-- ── T2.10 Lead quality weights feedback ─────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_quality_weights (
  id             serial PRIMARY KEY,
  signal_name    text NOT NULL,
  weight         numeric NOT NULL,
  sample_size    integer NOT NULL,
  hit_rate       numeric NOT NULL,  -- % of leads with this signal that converted
  computed_at    timestamptz NOT NULL DEFAULT now(),
  model_version  integer NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_quality_weights_version
  ON public.lead_quality_weights (model_version DESC, signal_name);

ALTER TABLE public.lead_quality_weights ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.lead_quality_weights IS
  'Observed conversion weights per quality signal. Recomputed nightly. The live scorer reads the latest model_version.';
