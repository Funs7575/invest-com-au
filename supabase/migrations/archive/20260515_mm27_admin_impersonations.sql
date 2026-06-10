-- ============================================================================
-- Migration: 20260515_mm27_admin_impersonations.sql
-- Purpose: Audit trail for admin "impersonate-as-user" sessions. Used for
--          support debugging; every impersonation is logged with start/end
--          timestamps and a JSONB array of actions taken during the session.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.admin_impersonations;
--
-- Risk: low — additive table; service_role-only access.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_impersonations (
  id              bigserial PRIMARY KEY,
  admin_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email    text NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  actions_taken   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ip_hash         text,
  user_agent      text
);

CREATE INDEX IF NOT EXISTS idx_admin_impersonations_admin
  ON public.admin_impersonations (admin_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_impersonations_target
  ON public.admin_impersonations (target_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_impersonations_active
  ON public.admin_impersonations (admin_user_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.admin_impersonations ENABLE ROW LEVEL SECURITY;

-- service_role-only access — no anon or authenticated policy.

COMMIT;
