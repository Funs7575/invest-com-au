-- ============================================================================
-- Migration: 20260801001100_forum_moderation.sql
-- Purpose: Phase 2.4 — give the forum_user_profiles.is_moderator flag
--          actual powers. Adds forum_moderation_actions (append-only
--          audit log of every mod action, keyed by actor_principal_id)
--          and forum_user_profiles columns needed for ban audit trail
--          (banned_at, banned_until, ban_reason). The action endpoints
--          (lock-thread, hide-post, ban-user, etc.) live at
--          /api/admin/forum-moderation and check is_moderator + write
--          here on every action.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 2 — Session 2.4.
-- Risk: low — additive audit table + nullable columns; no behaviour
--             changes unless an endpoint writes to them.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.forum_moderation_actions;
--     ALTER TABLE public.forum_user_profiles
--       DROP COLUMN IF EXISTS banned_at,
--       DROP COLUMN IF EXISTS banned_until,
--       DROP COLUMN IF EXISTS ban_reason;
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── forum_moderation_actions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forum_moderation_actions (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  actor_user_id     uuid,
  action            text NOT NULL
                    CHECK (action IN (
                      'lock_thread', 'unlock_thread',
                      'hide_post', 'unhide_post',
                      'hide_thread', 'unhide_thread',
                      'ban_user', 'unban_user', 'suspend_user',
                      'pin_thread', 'unpin_thread'
                    )),
  target_type       text NOT NULL CHECK (target_type IN ('thread', 'post', 'user')),
  target_id         text NOT NULL,
  reason            text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  acted_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forum_moderation_actions_target
  ON public.forum_moderation_actions (target_type, target_id, acted_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_moderation_actions_actor
  ON public.forum_moderation_actions (actor_principal_id, acted_at DESC)
  WHERE actor_principal_id IS NOT NULL;

ALTER TABLE public.forum_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_moderation_actions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access forum_moderation_actions"
  ON public.forum_moderation_actions;
CREATE POLICY "service_role full access forum_moderation_actions"
  ON public.forum_moderation_actions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "moderators read forum_moderation_actions"
  ON public.forum_moderation_actions;
CREATE POLICY "moderators read forum_moderation_actions"
  ON public.forum_moderation_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE user_id = auth.uid() AND is_moderator = true
    )
  );

-- ─── ban audit columns on forum_user_profiles ────────────────────────────
ALTER TABLE public.forum_user_profiles
  ADD COLUMN IF NOT EXISTS banned_at      timestamptz,
  ADD COLUMN IF NOT EXISTS banned_until   timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason     text;

CREATE INDEX IF NOT EXISTS idx_forum_user_profiles_banned
  ON public.forum_user_profiles (status) WHERE status IN ('banned', 'suspended');

COMMIT;
