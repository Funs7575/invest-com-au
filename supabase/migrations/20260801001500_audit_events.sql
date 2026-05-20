-- ============================================================================
-- Migration: 20260801001500_audit_events.sql
-- Purpose: Idea #11 — the unified audit-trail spine. Every privileged action
--          in the system (admin mutations, moderation, account deletion,
--          workspace switches, agent actions) records one row here keyed by
--          the acting principal. AFSL needs a single answer to "who did what,
--          when". Domain-specific tables (forum_moderation_actions,
--          account_kind_switch_log) stay as-is; audit_events is the unified
--          read surface they ALSO feed via lib/audit.ts.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 1, #11)
-- Risk: low — additive table; write helper is best-effort (never throws),
--             so a logging failure never blocks the underlying action.
--             Write volume managed by indexes + a 90-day archive policy
--             (retention_rules entry added when the cron is wired).
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.audit_events;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Nullable: anonymous / pre-principal actions (e.g. a public form) may
  -- have no principal. actor_kind disambiguates the source.
  actor_principal_id  uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  actor_kind          text NOT NULL DEFAULT 'system'
                      CHECK (actor_kind IN ('human','agent','partner_org','internal','system')),
  -- Dotted namespace: '<domain>.<verb>' e.g. 'forum.lock_thread',
  -- 'admin.edit_advisor', 'account.delete', 'workspace.switch'.
  action              text NOT NULL,
  resource_type       text,
  resource_id         text,
  summary             text,
  before_state        jsonb,
  after_state         jsonb,
  ip                  text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
  ON public.audit_events (actor_principal_id, created_at DESC)
  WHERE actor_principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_events_resource
  ON public.audit_events (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action
  ON public.audit_events (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at
  ON public.audit_events (created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

-- service_role writes (the lib/audit.ts helper runs admin-side).
DROP POLICY IF EXISTS "service_role full access audit_events" ON public.audit_events;
CREATE POLICY "service_role full access audit_events"
  ON public.audit_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Admins / moderators read. Until the admin RBAC table (#14) lands, gate
-- reads behind the forum-moderator flag OR an ADMIN_EMAILS-backed session
-- (checked app-side); the policy here grants authenticated read only to
-- principals flagged as forum moderators, which is the one DB-checkable
-- privileged role today. The #14 migration broadens this to a
-- can_view_audit capability.
DROP POLICY IF EXISTS "privileged read audit_events" ON public.audit_events;
CREATE POLICY "privileged read audit_events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE user_id = auth.uid() AND is_moderator = true
    )
  );

COMMIT;
