-- ============================================================================
-- Migration: 20260801002400_agent_internal_identity.sql
-- Purpose: Idea #15 — agent + internal-team identity, ADDITIVE FOUNDATION
--          ONLY. Extends the principals model to cover the two non-human
--          actor kinds and adds their registry tables, so the identity
--          model is complete and ready. It deliberately does NOT:
--            - backfill the 19 agents (a data decision the founder owns)
--            - touch the live agent_logs / agent_name write path (the
--              R1-HIGH cutover with trigger + dual-write stays the
--              founder's call — see the expansion plan)
--            - seed any internal/founder accounts
--          So nothing in prod changes until those steps are taken
--          deliberately; this purely makes the schema available.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 1, #15)
-- Risk: low (as scoped) — widens an existing CHECK (additive; existing
--             rows unaffected) + adds empty registry tables. The risky
--             agent_logs cutover is explicitly out of scope.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.agent_capabilities;
--     DROP TABLE IF EXISTS public.agents;
--     DROP TABLE IF EXISTS public.internal_team_members;
--     ALTER TABLE public.principals DROP CONSTRAINT IF EXISTS principals_kind_check;
--     ALTER TABLE public.principals ADD CONSTRAINT principals_kind_check
--       CHECK (kind IN ('human','partner_org'));
--   COMMIT;
-- ============================================================================

BEGIN;

-- Widen the principals.kind CHECK to admit 'agent' + 'internal'.
ALTER TABLE public.principals DROP CONSTRAINT IF EXISTS principals_kind_check;
ALTER TABLE public.principals
  ADD CONSTRAINT principals_kind_check
  CHECK (kind IN ('human','partner_org','agent','internal'));

-- ─── agents registry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agents (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal_id         uuid UNIQUE REFERENCES public.principals(id) ON DELETE CASCADE,
  number               integer UNIQUE CHECK (number BETWEEN 0 AND 99),
  slug                 text UNIQUE NOT NULL,
  display_name         text NOT NULL,
  spec_file            text,
  default_tier         integer CHECK (default_tier BETWEEN 1 AND 5),
  cadence              text,
  activates_post_afsl  boolean NOT NULL DEFAULT false,
  deactivated_at       timestamptz,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_capabilities (
  agent_id    bigint NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  capability  text NOT NULL,
  PRIMARY KEY (agent_id, capability)
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_capabilities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access agents" ON public.agents;
CREATE POLICY "service_role full access agents"
  ON public.agents FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role full access agent_capabilities" ON public.agent_capabilities;
CREATE POLICY "service_role full access agent_capabilities"
  ON public.agent_capabilities FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── internal team members ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.internal_team_members (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  principal_id  uuid UNIQUE REFERENCES public.principals(id) ON DELETE CASCADE,
  role          text NOT NULL
                CHECK (role IN ('founder','cofounder','responsible_manager',
                                'editorial_collaborator','admin','compliance_external')),
  capabilities  text[] NOT NULL DEFAULT '{}',
  active        boolean NOT NULL DEFAULT true,
  joined_at     date,
  notes         text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_team_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access internal_team_members" ON public.internal_team_members;
CREATE POLICY "service_role full access internal_team_members"
  ON public.internal_team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER internal_team_members_updated_at
  BEFORE UPDATE ON public.internal_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMIT;
