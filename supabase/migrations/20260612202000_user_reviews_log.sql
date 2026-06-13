-- Migration: user_reviews_log — the Monthly Money Review ritual.
--
-- A guided ~10-minute monthly session ("since your last review — net
-- worth, your rates, goals progress, open decisions") needs two things
-- persisted per user: WHICH months they completed (for the streak +
-- history calendar), and a SNAPSHOT of the numbers at completion time.
--
-- The snapshot is load-bearing, not decorative: there is no balance-
-- history table, so "since last review" deltas are computed by diffing
-- the CURRENT figures against the PREVIOUS completed review's stored
-- `snapshot` jsonb (lib/monthly-review.ts). The first review has no prior
-- snapshot, so it frames the numbers as a baseline rather than a delta.
--
-- One row per (user_id, period) where period is a calendar month like
-- '2026-06'. The UNIQUE constraint makes completion idempotent — a user
-- finishing the same month twice updates the existing row rather than
-- stacking duplicates.
--
-- Feature gating: the whole ritual is dormant behind the `monthly_review`
-- feature flag (fail-closed) until this table is applied in prod, so the
-- table can ship ahead of the entry points with nothing reading it.
--
-- RLS: per-user owner policies on auth.uid() = user_id (SELECT / INSERT /
-- UPDATE — reviews are append-or-amend, never deleted by the user) plus a
-- service_role policy for the monthly-invite cron, which reads completion
-- state cross-user with no JWT available.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.user_reviews_log;

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_reviews_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  -- Calendar month the review covers, e.g. '2026-06'. Text (not date) so
  -- the UNIQUE-per-month semantics are explicit and human-readable.
  period text NOT NULL CHECK (period ~ '^\d{4}-\d{2}$'),
  completed_at timestamptz,
  -- Figures captured at completion: net-worth total, per-goal progress,
  -- rate context, health-score components, open-decision count. Diffed
  -- against the next review to produce "since last review" deltas.
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_log_user
  ON public.user_reviews_log (user_id);
-- The streak + history queries read a user's rows newest-period-first.
CREATE INDEX IF NOT EXISTS idx_user_reviews_log_user_period
  ON public.user_reviews_log (user_id, period DESC);

ALTER TABLE public.user_reviews_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_reviews_log_own_read" ON public.user_reviews_log;
CREATE POLICY "user_reviews_log_own_read"
  ON public.user_reviews_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_reviews_log_own_insert" ON public.user_reviews_log;
CREATE POLICY "user_reviews_log_own_insert"
  ON public.user_reviews_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_reviews_log_own_update" ON public.user_reviews_log;
CREATE POLICY "user_reviews_log_own_update"
  ON public.user_reviews_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_reviews_log_service" ON public.user_reviews_log;
CREATE POLICY "user_reviews_log_service"
  ON public.user_reviews_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
