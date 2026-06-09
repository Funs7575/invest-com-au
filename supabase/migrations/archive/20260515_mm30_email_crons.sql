-- ============================================================================
-- Migration: 20260515_mm30_email_crons.sql
-- Purpose: Idempotency tracking for two new email cron jobs:
--   - Pro weekly digest (Mondays AEST): pros get a digest of new open
--     briefs matching their categories from the past 7 days.
--   - Tax-time nurture funnel: 3-email sequence to investors who started a
--     `tax_help` Get Matched plan and didn't convert to a brief in 14/21/28d.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + UNIQUE constraint per (recipient,
-- period). Cron re-runs are safe no-ops.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.tax_nurture_sends;
--   DROP TABLE IF EXISTS public.pro_digest_sends;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.pro_digest_sends (
  id              bigserial PRIMARY KEY,
  professional_id integer NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  brief_count     integer NOT NULL DEFAULT 0,
  sent_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pro_digest_sends_period
  ON public.pro_digest_sends (professional_id, period_start);

ALTER TABLE public.pro_digest_sends ENABLE ROW LEVEL SECURITY;
-- service_role-only.

CREATE TABLE IF NOT EXISTS public.tax_nurture_sends (
  id            bigserial PRIMARY KEY,
  plan_id       integer NOT NULL REFERENCES public.get_matched_action_plans(id) ON DELETE CASCADE,
  auth_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text NOT NULL,
  step          integer NOT NULL CHECK (step IN (1, 2, 3)),
  sent_at       timestamptz NOT NULL DEFAULT now(),
  clicked_at    timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_nurture_sends_plan_step
  ON public.tax_nurture_sends (plan_id, step);

ALTER TABLE public.tax_nurture_sends ENABLE ROW LEVEL SECURITY;
-- service_role-only.

COMMIT;
