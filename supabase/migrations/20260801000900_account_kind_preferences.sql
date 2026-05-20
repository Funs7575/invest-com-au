-- ============================================================================
-- Migration: 20260801000900_account_kind_preferences.sql
-- Purpose: Phase 3 workspace-switcher polish. Persists per-user
--          preferences (default workspace + last-active workspace) so the
--          chooser only appears for first-time multi-kind users; repeat
--          visitors land back in the workspace they were last using. Adds
--          a lightweight switch audit log for "wait, why am I in the
--          wrong workspace" debugging and future security review.
--
-- Two new tables:
--
--   account_kind_preferences
--     One row per principal. Tracks default_kind (pinned by the user),
--     default_team_id (when default_kind = 'squad'), last_active_kind,
--     last_active_team_id, last_active_at. NULL default_kind means "no
--     preference — fall through to last-active or chooser".
--
--   account_kind_switch_log
--     Append-only. One row per workspace switch (chooser pick or
--     header dropdown). Keyed by principal_id; from/to columns capture
--     both kind and team for squad workspaces. Volume bound is low —
--     a user might switch a few times per day at most.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 3.
-- Risk: low — additive tables; no existing behaviour changed.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.account_kind_switch_log;
--     DROP TABLE IF EXISTS public.account_kind_preferences;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.account_kind_preferences (
  principal_id          uuid PRIMARY KEY REFERENCES public.principals(id) ON DELETE CASCADE,
  default_kind          text,
  default_team_id       text,
  last_active_kind      text,
  last_active_team_id   text,
  last_active_at        timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_kind_preferences_default_kind
  ON public.account_kind_preferences (default_kind)
  WHERE default_kind IS NOT NULL;

ALTER TABLE public.account_kind_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_kind_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own kind preferences" ON public.account_kind_preferences;
CREATE POLICY "user reads own kind preferences"
  ON public.account_kind_preferences FOR SELECT
  TO authenticated
  USING (
    principal_id IN (
      SELECT id FROM public.principals
      WHERE kind = 'human' AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user upserts own kind preferences" ON public.account_kind_preferences;
CREATE POLICY "user upserts own kind preferences"
  ON public.account_kind_preferences FOR INSERT
  TO authenticated
  WITH CHECK (
    principal_id IN (
      SELECT id FROM public.principals
      WHERE kind = 'human' AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user updates own kind preferences" ON public.account_kind_preferences;
CREATE POLICY "user updates own kind preferences"
  ON public.account_kind_preferences FOR UPDATE
  TO authenticated
  USING (
    principal_id IN (
      SELECT id FROM public.principals
      WHERE kind = 'human' AND auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    principal_id IN (
      SELECT id FROM public.principals
      WHERE kind = 'human' AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role full access kind_preferences" ON public.account_kind_preferences;
CREATE POLICY "service_role full access kind_preferences"
  ON public.account_kind_preferences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER account_kind_preferences_updated_at
  BEFORE UPDATE ON public.account_kind_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── switch log ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.account_kind_switch_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal_id    uuid NOT NULL REFERENCES public.principals(id) ON DELETE CASCADE,
  from_kind       text,
  from_team_id    text,
  to_kind         text NOT NULL,
  to_team_id      text,
  source          text NOT NULL DEFAULT 'switcher'
                  CHECK (source IN ('switcher','chooser','deep_link','callback')),
  switched_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_kind_switch_log_principal
  ON public.account_kind_switch_log (principal_id, switched_at DESC);

ALTER TABLE public.account_kind_switch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_kind_switch_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own switch log" ON public.account_kind_switch_log;
CREATE POLICY "user reads own switch log"
  ON public.account_kind_switch_log FOR SELECT
  TO authenticated
  USING (
    principal_id IN (
      SELECT id FROM public.principals
      WHERE kind = 'human' AND auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service_role full access switch_log" ON public.account_kind_switch_log;
CREATE POLICY "service_role full access switch_log"
  ON public.account_kind_switch_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
