-- Migration: advisor_push_subscriptions — supply-side web push (Adviser Push
-- Command Centre, RETENTION_MARKETPLACE_MEGA_SESSIONS idea #8).
--
-- DESIGN CHOICE — extend `push_subscriptions` (option a), NOT a sibling table.
--   `lib/push-dispatch.ts` already owns the single VAPID transport + the stale-
--   endpoint prune path against `push_subscriptions`. A sibling advisor table
--   would fork that loop (and the `pushsubscriptionchange` re-subscribe handler
--   in public/sw.js, which POSTs back to /api/push/subscribe). Extending the
--   one table keeps ONE prune path, ONE transport, and lets the dispatcher
--   filter cheaply by owner. Consumer rows keep `owner_kind='user'` (the column
--   default, so every existing row is correct without a backfill) and are still
--   queried by `user_id`. Advisor rows carry `owner_kind='advisor'` +
--   `professional_id`, and a nullable `user_id` (advisers authenticate via the
--   advisor-session machinery, not necessarily an auth.users row).
--
-- Per-event preferences live in `notification_prefs jsonb` on the same row
-- (there is no existing advisor notification-prefs table to extend; the
-- advisor-auth/notifications route stores EMAIL prefs on a different surface).
-- Shape (all default-on except the noisiest): {"new_brief":bool,
-- "new_message":bool,"dispute":bool,"sla_warning":bool}. The dispatcher
-- treats a missing key as enabled (fail-open to "notify"), so older rows
-- without the key still receive sends.
--
-- RLS posture: unchanged — mirrors the existing table. `push_subscriptions`
-- is authenticated-self (`auth.uid() = user_id`) + service_role-full. Advisor
-- rows have a NULL user_id, so the authenticated-self policy never matches
-- them; ALL advisor reads/writes go through the service-role admin client
-- (legitimate per CLAUDE.md § "Two Supabase clients" — advisor_sessions is
-- deny-all by design and there is no auth.uid() linkage for legacy sessions).
-- No new policy is needed.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_push_subscriptions_professional_id;
--   ALTER TABLE public.push_subscriptions
--     DROP CONSTRAINT IF EXISTS push_subscriptions_owner_kind_check,
--     DROP CONSTRAINT IF EXISTS push_subscriptions_professional_id_fkey,
--     DROP COLUMN IF EXISTS owner_kind,
--     DROP COLUMN IF EXISTS professional_id,
--     DROP COLUMN IF EXISTS notification_prefs;

BEGIN;

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS owner_kind text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS professional_id integer,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Constrain owner_kind to the two known values. Guarded so re-running the
-- migration (or running it after a partial apply) does not error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_owner_kind_check'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_owner_kind_check
      CHECK (owner_kind IN ('user', 'advisor'));
  END IF;
END $$;

-- FK to professionals so a deleted advisor's subscriptions are cleaned up.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_professional_id_fkey'
      AND conrelid = 'public.push_subscriptions'::regclass
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_professional_id_fkey
      FOREIGN KEY (professional_id)
      REFERENCES public.professionals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Partial index: the advisor dispatcher looks rows up by professional_id and
-- only ever cares about advisor-owned rows. Keeps the index small.
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_professional_id
  ON public.push_subscriptions USING btree (professional_id)
  WHERE (professional_id IS NOT NULL);

COMMIT;
