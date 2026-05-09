-- =============================================================================
-- Migration: FF-02 — feature_flag_archived_at
-- Date:       2026-07-17
-- Audit ref:  docs/audits/REMEDIATION_QUEUE.md § "Stream FF — Feature flag lifecycle"
-- Queue item: FF-02 (flag expiry policy — auto-archive dormant flags)
--
-- Why: Flags that stay disabled for extended periods accumulate as dead weight
--   in the feature_flags table, making the admin UI noisy and creating
--   confusion about which flags are actively managed vs. abandoned.
--   FF-02 adds an `archived_at` timestamp so a nightly cron can mark stale
--   disabled flags as archived (soft-delete). Archived flags are excluded from
--   the evaluator so they evaluate as false without a DB round-trip, and they
--   are hidden from the default admin flag list.
--
-- Idempotency: ADD COLUMN IF NOT EXISTS is safe to re-run.
--   No data is modified by this migration.
--
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.feature_flags DROP COLUMN IF EXISTS archived_at;
--   COMMIT;
-- =============================================================================

BEGIN;

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN public.feature_flags.archived_at IS
  'Set by the feature-flag-expiry cron when a flag has been disabled for > 90 days. '
  'NULL means active. Non-NULL means archived (evaluates as false, hidden in admin UI).';

COMMIT;
