-- Migration: mm06 — marketplace fan-out into the in-app notification inbox
--   + professionals.onboarding_done_at for the pro onboarding tour (C3).
--
-- A `public.user_notifications` table already exists (wave-11 reality-check,
-- 2026-04-16) and carries the in-app inbox: `user_id`, `type`, `title`,
-- `body`, `link_url`, `read_at`. Spec C1 requires marketplace events
-- (`brief_accepted`, `message_received`, `outcome_request`, `plan_diff`,
-- `topup_succeeded`, `topup_failed`, `quote_received`, `generic`) to land
-- in the same inbox so users see a single, unified bell-icon list.
--
-- Rather than fork a parallel table, this migration extends the existing
-- one:
--   1. Relaxes the `type` CHECK constraint so the new "kind" values are
--      accepted alongside the legacy `system` / `deal` / `fee_change` /
--      `reply` / `referral` / `announcement` types.
--   2. Adds a recent-by-user index used by the dropdown's 20-row pull.
--
-- Also adds `professionals.onboarding_done_at` (timestamptz) so the pro
-- onboarding tour can stamp completion server-side (the localStorage flag
-- is for client-side suppression only).
--
-- Idempotent: every statement is `IF NOT EXISTS` / `DROP CONSTRAINT IF
-- EXISTS` so reruns are safe.
--
-- Rollback:
--   ALTER TABLE public.user_notifications
--     DROP CONSTRAINT IF EXISTS user_notifications_type_check;
--   -- (optional) re-create the prior narrower constraint:
--   -- ALTER TABLE public.user_notifications
--   --   ADD CONSTRAINT user_notifications_type_check CHECK (
--   --     type = ANY (ARRAY['system','deal','fee_change','reply','referral','announcement'])
--   --   );
--   DROP INDEX IF EXISTS public.idx_user_notifications_recent;
--   ALTER TABLE public.professionals DROP COLUMN IF EXISTS onboarding_done_at;

-- ── 1. Extend the `type` CHECK constraint ────────────────────────────
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check CHECK (
    type = ANY (ARRAY[
      -- Legacy general-inbox kinds (wave-11)
      'system'::text,
      'deal'::text,
      'fee_change'::text,
      'reply'::text,
      'referral'::text,
      'announcement'::text,
      -- mm06 marketplace event kinds (C1)
      'brief_accepted'::text,
      'message_received'::text,
      'outcome_request'::text,
      'plan_diff'::text,
      'topup_succeeded'::text,
      'topup_failed'::text,
      'quote_received'::text,
      'generic'::text
    ])
  );

-- ── 2. Recent-by-user index for the dropdown's 20-row pull ───────────
-- The unread index from wave-11 only covers `read_at IS NULL`; the
-- dropdown fetches the most recent rows regardless of read state.
CREATE INDEX IF NOT EXISTS idx_user_notifications_recent
  ON public.user_notifications (user_id, created_at DESC);

-- ── 3. professionals.onboarding_done_at for the C3 onboarding tour ───
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS onboarding_done_at timestamptz;
