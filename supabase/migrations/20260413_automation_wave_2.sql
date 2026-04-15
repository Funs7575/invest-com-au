-- Automation wave 2 schema.
--
-- Covers:
--   1. classifier_config       — live-editable thresholds per classifier
--   2. automation_kill_switches — system-wide / per-feature disable flag
--   3. photo_moderation_log    — audit trail for every photo check
--   4. article_quality_scores  — LLM scoring history per article
--   5. property_suburb_refresh_log — audit + diff trail for the refresh cron
--   6. admin_action_log        — unified audit for every admin override
--   7. automation_verdict_daily — time-series aggregate table (hourly cron
--                                  rollup so the dashboard chart doesn't
--                                  scan raw tables on every page load)

-- ── 1. classifier_config ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.classifier_config (
  id              serial PRIMARY KEY,
  classifier      text NOT NULL,
  threshold_name  text NOT NULL,
  value           numeric NOT NULL,
  min_value       numeric,   -- guardrail: writes outside [min, max] are rejected
  max_value       numeric,
  description     text,
  updated_by      text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classifier, threshold_name)
);

CREATE INDEX IF NOT EXISTS idx_classifier_config_classifier
  ON public.classifier_config (classifier);

ALTER TABLE public.classifier_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.classifier_config IS
  'Live-editable classifier thresholds. Each classifier reads from this table at request time and falls back to hardcoded defaults if no row is present.';

-- ── 2. automation_kill_switches ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_kill_switches (
  feature      text PRIMARY KEY,   -- 'global' | feature key from FEATURE_CONFIG
  disabled     boolean NOT NULL DEFAULT false,
  reason       text,
  disabled_by  text,
  disabled_at  timestamptz
);

ALTER TABLE public.automation_kill_switches ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.automation_kill_switches IS
  'Kill switches for automation features. feature=global disables every classifier at once. Per-feature rows disable a single classifier. Checked by every classifier entry point.';

-- ── 3. photo_moderation_log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.photo_moderation_log (
  id             bigserial PRIMARY KEY,
  photo_url      text NOT NULL,
  target_type    text NOT NULL,  -- 'advisor_photo' | 'listing_image' | 'broker_logo'
  target_id      integer,
  provider       text NOT NULL,  -- 'cloudflare' | 'rekognition' | 'stub'
  verdict        text NOT NULL,  -- 'clean' | 'flagged' | 'rejected' | 'unknown'
  confidence     numeric,
  labels         jsonb,          -- provider-specific raw labels
  checked_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_moderation_log_target
  ON public.photo_moderation_log (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_photo_moderation_log_recent
  ON public.photo_moderation_log (checked_at DESC);

ALTER TABLE public.photo_moderation_log ENABLE ROW LEVEL SECURITY;

-- ── 4. article_quality_scores ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.article_quality_scores (
  id             bigserial PRIMARY KEY,
  article_id     integer,
  article_slug   text,
  provider       text NOT NULL,  -- 'claude' | 'openai' | 'stub'
  model          text,
  score          integer NOT NULL,  -- 0-100 aggregate
  rubric         jsonb NOT NULL,    -- {clarity, accuracy, completeness, compliance, seo}
  verdict        text NOT NULL,     -- 'auto_approve' | 'escalate' | 'auto_reject'
  feedback       text,
  checked_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_quality_scores_article
  ON public.article_quality_scores (article_id, checked_at DESC);

ALTER TABLE public.article_quality_scores ENABLE ROW LEVEL SECURITY;

-- ── 5. property_suburb_refresh_log ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_suburb_refresh_log (
  id             bigserial PRIMARY KEY,
  suburb_slug    text NOT NULL,
  provider       text NOT NULL,  -- 'corelogic' | 'sqm' | 'stub'
  fields_changed jsonb,           -- { median_price: [old, new], ... }
  refreshed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_suburb_refresh_log_suburb
  ON public.property_suburb_refresh_log (suburb_slug, refreshed_at DESC);

ALTER TABLE public.property_suburb_refresh_log ENABLE ROW LEVEL SECURITY;

-- ── 6. admin_action_log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_action_log (
  id              bigserial PRIMARY KEY,
  admin_email     text NOT NULL,
  feature         text NOT NULL,   -- key from FEATURE_CONFIG
  action          text NOT NULL,   -- 'override' | 'trigger' | 'config' | 'bulk' | 'kill_switch'
  target_row_id   integer,
  target_verdict  text,
  reason          text,
  context         jsonb,           -- freeform for bulk actions etc.
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_admin
  ON public.admin_action_log (admin_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_feature
  ON public.admin_action_log (feature, created_at DESC);

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

-- ── 7. automation_verdict_daily ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_verdict_daily (
  id             serial PRIMARY KEY,
  feature        text NOT NULL,
  day            date NOT NULL,
  auto_acted     integer NOT NULL DEFAULT 0,
  escalated      integer NOT NULL DEFAULT 0,
  rejected       integer NOT NULL DEFAULT 0,
  approved       integer NOT NULL DEFAULT 0,
  refunded_cents bigint  NOT NULL DEFAULT 0,
  UNIQUE (feature, day)
);

CREATE INDEX IF NOT EXISTS idx_automation_verdict_daily_feature_day
  ON public.automation_verdict_daily (feature, day DESC);

ALTER TABLE public.automation_verdict_daily ENABLE ROW LEVEL SECURITY;

-- ── Constraints ──────────────────────────────────────────────────
ALTER TABLE public.photo_moderation_log
  DROP CONSTRAINT IF EXISTS photo_moderation_log_verdict_check;
ALTER TABLE public.photo_moderation_log
  ADD CONSTRAINT photo_moderation_log_verdict_check CHECK (
    verdict = ANY (ARRAY['clean'::text, 'flagged'::text, 'rejected'::text, 'unknown'::text])
  );

ALTER TABLE public.article_quality_scores
  DROP CONSTRAINT IF EXISTS article_quality_scores_verdict_check;
ALTER TABLE public.article_quality_scores
  ADD CONSTRAINT article_quality_scores_verdict_check CHECK (
    verdict = ANY (ARRAY['auto_approve'::text, 'escalate'::text, 'auto_reject'::text])
  );

ALTER TABLE public.admin_action_log
  DROP CONSTRAINT IF EXISTS admin_action_log_action_check;
ALTER TABLE public.admin_action_log
  ADD CONSTRAINT admin_action_log_action_check CHECK (
    action = ANY (ARRAY['override'::text, 'trigger'::text, 'config'::text, 'bulk'::text, 'kill_switch'::text])
  );
