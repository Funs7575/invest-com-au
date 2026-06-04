-- Migration: push_subscriptions — add user_id, RLS; notification_preferences — add browser_push
--
-- Why:
--   The push_subscriptions table was created with no user linkage and no RLS.
--   We need user_id so the alert crons can find a user's browser subscription
--   when firing an alert, and browser_push on notification_preferences so users
--   can opt in/out without the cron having to re-check a separate concept.
--
-- Rollback strategy:
--   ALTER TABLE public.push_subscriptions
--     DROP COLUMN IF EXISTS user_id;
--   DROP INDEX IF EXISTS idx_push_subscriptions_user_id;
--   ALTER TABLE public.notification_preferences
--     DROP COLUMN IF EXISTS browser_push;
--   -- RLS cleanup:
--   DROP POLICY IF EXISTS "service_role full access" ON push_subscriptions;
--   DROP POLICY IF EXISTS "Users view own subscriptions" ON push_subscriptions;
--   ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;

BEGIN;

-- ── push_subscriptions — base table ───────────────────────────────────────────
-- Repo-parity fix (P0-3): push_subscriptions was only ever ALTER'd, never
-- CREATE'd in any migration, so both a fresh DB build and the live DB lacked the
-- table entirely (the ALTER below would error on a clean apply). Created here
-- IF NOT EXISTS so this migration is self-contained. Schema matches the push
-- subscribe route's upsert (onConflict: endpoint) and the dispatch helper's
-- select (id, endpoint, keys_p256dh, keys_auth). user_id is added by the ALTER
-- below so the FK lives in one place.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint     text        NOT NULL UNIQUE,
  keys_p256dh  text        NOT NULL,
  keys_auth    text        NOT NULL,
  topics       text[]      NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── push_subscriptions — user linkage ─────────────────────────────────────────

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id)
  WHERE user_id IS NOT NULL;

-- ── push_subscriptions — RLS ──────────────────────────────────────────────────
-- The table previously had no RLS. Enabling it here — service_role keeps full
-- access (the dispatch helper uses service_role), and authenticated users can
-- only see/manage their own subscriptions.

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON push_subscriptions;
CREATE POLICY "service_role full access"
  ON push_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own subscriptions" ON push_subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON push_subscriptions
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── notification_preferences — browser_push column ───────────────────────────
-- New boolean preference; defaults to null (no preference set).
-- The dispatch helper treats null the same as false — opt-out by default.
-- Users enable it explicitly via the account UI.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS browser_push boolean;

COMMIT;
