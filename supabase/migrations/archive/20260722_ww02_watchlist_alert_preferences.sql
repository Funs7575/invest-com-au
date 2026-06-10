-- =============================================================================
-- Migration: WW-02 — watchlist_alert_preferences per-user opt-in
-- Date:       2026-07-22
-- Audit ref:  docs/plans/pre-launch-wave-master-prompt.md Wave 2 / W2.13 PR-X5i
--             docs/plans/investor-account-end-to-end-plan.md Phase 3
--             docs/audits/REMEDIATION_QUEUE.md § "Stream WW — Watchlist / portfolio tracker"
-- Queue item: WW-02
--
-- Why: WW-01 (20260716) added user_watchlist_items but not the digest opt-in.
--   The weekly cron at /api/cron/watchlist-alerts sends a per-user digest only
--   for users with alerts_opted_in=true. Absence of a row means "opted out",
--   matching the wider product default of "no email until you tick a box".
--
-- Design decisions:
--   - PK on user_id (one row per user) — there's nothing to disambiguate.
--   - last_digest_sent_at lets the cron skip users who already received this
--     edition's digest (re-runs / partial failures don't re-send).
--   - last_digest_window_start records the timestamp the digest scanned from,
--     so the next sweep can resume where the last one ended (handles weeks
--     where the cron didn't fire on time — surface anything since the last
--     successful send rather than a fixed 7-day rolling window).
--   - No service-role-only policy: cron writes via the existing service-role
--     escape hatch (per CLAUDE.md, cron jobs use createAdminClient()).
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before
--   each CREATE POLICY; ENABLE/FORCE ROW LEVEL SECURITY is idempotent.
--
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "user reads own watchlist alert pref"
--       ON public.watchlist_alert_preferences;
--     DROP POLICY IF EXISTS "user writes own watchlist alert pref"
--       ON public.watchlist_alert_preferences;
--     DROP POLICY IF EXISTS "service_role full access watchlist_alert_preferences"
--       ON public.watchlist_alert_preferences;
--     ALTER TABLE public.watchlist_alert_preferences DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.watchlist_alert_preferences; -- only on clean rebuild
--   COMMIT;
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.watchlist_alert_preferences (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  alerts_opted_in          boolean      NOT NULL DEFAULT false,
  last_digest_sent_at      timestamptz,
  last_digest_window_start timestamptz,
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_alert_preferences_opted_in
  ON public.watchlist_alert_preferences (user_id)
  WHERE alerts_opted_in = true;

ALTER TABLE public.watchlist_alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_alert_preferences FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own watchlist alert pref"
  ON public.watchlist_alert_preferences;
CREATE POLICY "user reads own watchlist alert pref"
  ON public.watchlist_alert_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user writes own watchlist alert pref"
  ON public.watchlist_alert_preferences;
CREATE POLICY "user writes own watchlist alert pref"
  ON public.watchlist_alert_preferences
  FOR ALL TO authenticated
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role full access watchlist_alert_preferences"
  ON public.watchlist_alert_preferences;
CREATE POLICY "service_role full access watchlist_alert_preferences"
  ON public.watchlist_alert_preferences
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
