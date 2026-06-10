-- =============================================================================
-- Migration: FF-04 — feature_flags.last_evaluated_at
-- Date:       2026-07-18
-- Audit ref:  docs/audits/REMEDIATION_QUEUE.md § "Stream FF — FF-04"
-- Queue item: FF-04 (flag usage tracking)
--
-- Why: The FF-02 expiry cron archives flags that have been *disabled* for
--   90+ days. Without evaluation tracking it cannot distinguish a dormant
--   flag from one that is disabled but still actively evaluated (and would
--   correctly evaluate false). Adding `last_evaluated_at` lets the cron
--   check: disabled AND not evaluated recently → safe to archive. It also
--   surfaces in the admin UI so operators can see at a glance which flags
--   are actively used vs. completely forgotten.
--
-- Idempotency: ADD COLUMN IF NOT EXISTS is safe to re-run.
--   No data is modified; existing rows get last_evaluated_at = NULL
--   (meaning "not yet tracked").
--
-- IMPORTANT — prior policy state:
--   RLS enabled in 20260415_wave_7_trust_ops.sql.
--   "service_role full access" policy set in
--   20260508_o_iter9_rls_catchup.sql — no new policy needed.
--
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.feature_flags
--       DROP COLUMN IF EXISTS last_evaluated_at;
--   COMMIT;
-- =============================================================================

BEGIN;

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS last_evaluated_at timestamptz;

COMMENT ON COLUMN public.feature_flags.last_evaluated_at IS
  'Timestamp of the most recent isFlagEnabled() call that reached the DB '
  '(i.e., on cache miss). Updated fire-and-forget in loadFlag(). NULL means '
  'not yet tracked (pre-FF-04) or never evaluated since the flag was seeded.';

COMMIT;
