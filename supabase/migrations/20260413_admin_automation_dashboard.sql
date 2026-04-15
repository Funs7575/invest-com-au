-- Admin automation dashboard foundations.
--
-- Two changes:
--   1. New `cron_run_log` table so every cron can persist a run
--      record on completion. Without this there's no way to answer
--      "when did X last run successfully" or "what did X return on
--      its last run" from the admin dashboard — Vercel's cron log
--      UI is 24-hour retention and not queryable.
--   2. Override audit columns on every classifier target table so
--      an admin can reverse a classifier verdict through the
--      dashboard and we have a clear audit trail of who did it
--      and when.

-- ── 1. cron_run_log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_run_log (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL,
  started_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  duration_ms    integer,
  status         text NOT NULL,  -- 'running' | 'ok' | 'error' | 'partial'
  stats          jsonb,
  error_message  text,
  triggered_by   text DEFAULT 'cron'  -- 'cron' | 'admin_manual' | 'test'
);

ALTER TABLE public.cron_run_log
  DROP CONSTRAINT IF EXISTS cron_run_log_status_check;
ALTER TABLE public.cron_run_log
  ADD CONSTRAINT cron_run_log_status_check CHECK (
    status = ANY (ARRAY['running'::text, 'ok'::text, 'error'::text, 'partial'::text])
  );

-- Query patterns: "latest run of cron X", "any runs in the last 48h",
-- "errors only". Index on (name, started_at DESC) covers them all.
CREATE INDEX IF NOT EXISTS idx_cron_run_log_name_started
  ON public.cron_run_log (name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_run_log_errors
  ON public.cron_run_log (started_at DESC)
  WHERE status = 'error';

-- Auto-cleanup: keep 90 days of runs. Beyond that the stats are
-- interesting for analytics but not operational, so we trim to keep
-- the table small.
CREATE INDEX IF NOT EXISTS idx_cron_run_log_cleanup
  ON public.cron_run_log (started_at)
  WHERE started_at < (now() - INTERVAL '90 days');

ALTER TABLE public.cron_run_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.cron_run_log IS
  'Every cron run writes one row here on completion. Source of truth for the admin automation dashboard''s "last run" + "is this healthy" checks.';

-- ── 2. Override audit columns ────────────────────────────────────

-- lead_disputes already has admin_notes + status; add override tracking
ALTER TABLE public.lead_disputes
  ADD COLUMN IF NOT EXISTS admin_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_overridden_by text,
  ADD COLUMN IF NOT EXISTS admin_override_reason text;

-- advisor_applications
ALTER TABLE public.advisor_applications
  ADD COLUMN IF NOT EXISTS admin_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_overridden_by text;

-- investment_listings — auto-approve/reject path gets override visibility
ALTER TABLE public.investment_listings
  ADD COLUMN IF NOT EXISTS auto_classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_classified_verdict text,
  ADD COLUMN IF NOT EXISTS auto_classified_risk_score integer,
  ADD COLUMN IF NOT EXISTS auto_classified_reasons jsonb,
  ADD COLUMN IF NOT EXISTS admin_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_overridden_by text;

ALTER TABLE public.investment_listings
  DROP CONSTRAINT IF EXISTS investment_listings_auto_verdict_check;
ALTER TABLE public.investment_listings
  ADD CONSTRAINT investment_listings_auto_verdict_check CHECK (
    auto_classified_verdict IS NULL OR auto_classified_verdict = ANY (ARRAY[
      'auto_approve'::text, 'auto_reject'::text, 'escalate'::text
    ])
  );

-- user_reviews + professional_reviews — text moderation verdicts
ALTER TABLE public.user_reviews
  ADD COLUMN IF NOT EXISTS auto_moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_moderated_verdict text,
  ADD COLUMN IF NOT EXISTS auto_moderated_reasons jsonb,
  ADD COLUMN IF NOT EXISTS admin_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_overridden_by text;

ALTER TABLE public.user_reviews
  DROP CONSTRAINT IF EXISTS user_reviews_auto_verdict_check;
ALTER TABLE public.user_reviews
  ADD CONSTRAINT user_reviews_auto_verdict_check CHECK (
    auto_moderated_verdict IS NULL OR auto_moderated_verdict = ANY (ARRAY[
      'auto_publish'::text, 'auto_reject'::text, 'escalate'::text
    ])
  );

ALTER TABLE public.professional_reviews
  ADD COLUMN IF NOT EXISTS auto_moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_moderated_verdict text,
  ADD COLUMN IF NOT EXISTS auto_moderated_reasons jsonb,
  ADD COLUMN IF NOT EXISTS admin_overridden_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_overridden_by text;

ALTER TABLE public.professional_reviews
  DROP CONSTRAINT IF EXISTS professional_reviews_auto_verdict_check;
ALTER TABLE public.professional_reviews
  ADD CONSTRAINT professional_reviews_auto_verdict_check CHECK (
    auto_moderated_verdict IS NULL OR auto_moderated_verdict = ANY (ARRAY[
      'auto_publish'::text, 'auto_reject'::text, 'escalate'::text
    ])
  );

COMMENT ON COLUMN public.lead_disputes.admin_overridden_at IS
  'When an admin manually reversed the classifier verdict via the automation dashboard.';
COMMENT ON COLUMN public.cron_run_log.triggered_by IS
  'cron = scheduled Vercel run, admin_manual = manually triggered from the dashboard, test = test run.';
