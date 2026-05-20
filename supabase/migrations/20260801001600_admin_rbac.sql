-- ============================================================================
-- Migration: 20260801001600_admin_rbac.sql
-- Purpose: Idea #14 — capability-based admin/support roles, ADDITIVE ONLY.
--          Today admin is an ADMIN_EMAILS env allowlist with no granularity
--          and no audit. This adds the role/capability tables + a per-admin
--          registry so support staff / compliance reviewers can get scoped
--          access. It does NOT cut over: ADMIN_EMAILS stays authoritative,
--          and lib/admin-rbac.ts treats env admins as superusers during the
--          transition. The founder owns the eventual cutover decision.
--
-- Also broadens the audit_events read policy (#11) to recognise a
-- can_view_audit capability in addition to the moderator flag.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 1, #14)
-- Risk: low — additive tables; no existing admin auth path changed. The
--             audit_events policy change only WIDENS read access.
-- Rollback:
--   BEGIN;
--     -- restore the narrow audit read policy
--     DROP POLICY IF EXISTS "privileged read audit_events" ON public.audit_events;
--     CREATE POLICY "privileged read audit_events" ON public.audit_events
--       FOR SELECT TO authenticated
--       USING (EXISTS (SELECT 1 FROM public.forum_user_profiles
--                      WHERE user_id = auth.uid() AND is_moderator = true));
--     DROP TABLE IF EXISTS public.admin_role_capabilities;
--     DROP TABLE IF EXISTS public.admin_users;
--     DROP TABLE IF EXISTS public.admin_roles;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_role_capabilities (
  role_id     bigint NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  capability  text NOT NULL,
  PRIMARY KEY (role_id, capability)
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal_id  uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  email         text NOT NULL UNIQUE,
  role_id       bigint NOT NULL REFERENCES public.admin_roles(id),
  active        boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users (active) WHERE active = true;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_capabilities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- service_role only — admin auth resolution runs admin-side.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['admin_roles','admin_role_capabilities','admin_users'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role full access %I" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "service_role full access %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- Seed the role catalogue + capability matrix. Idempotent.
INSERT INTO public.admin_roles (slug, name) VALUES
  ('owner',       'Owner'),
  ('editor',      'Editor'),
  ('support',     'Support'),
  ('readonly',    'Read-only'),
  ('compliance',  'Compliance'),
  ('engineering', 'Engineering')
ON CONFLICT (slug) DO NOTHING;

-- Capability matrix. owner gets everything; others scoped.
INSERT INTO public.admin_role_capabilities (role_id, capability)
SELECT r.id, c.capability
FROM public.admin_roles r
CROSS JOIN (VALUES
  ('owner','can_edit_advisors'),('owner','can_view_pii'),('owner','can_change_pricing'),
  ('owner','can_moderate'),('owner','can_manage_billing'),('owner','can_run_crons'),
  ('owner','can_view_audit'),('owner','can_manage_admins'),
  ('editor','can_edit_advisors'),('editor','can_moderate'),
  ('support','can_view_pii'),('support','can_moderate'),
  ('readonly','can_view_audit'),
  ('compliance','can_view_pii'),('compliance','can_view_audit'),
  ('engineering','can_run_crons'),('engineering','can_view_audit')
) AS c(role_slug, capability)
WHERE r.slug = c.role_slug
ON CONFLICT (role_id, capability) DO NOTHING;

-- Broaden the audit_events read policy to recognise can_view_audit.
DROP POLICY IF EXISTS "privileged read audit_events" ON public.audit_events;
CREATE POLICY "privileged read audit_events"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE user_id = auth.uid() AND is_moderator = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      JOIN public.admin_role_capabilities arc ON arc.role_id = au.role_id
      JOIN public.principals p ON p.id = au.principal_id
      WHERE p.auth_user_id = auth.uid()
        AND au.active = true
        AND arc.capability = 'can_view_audit'
    )
  );

COMMIT;
