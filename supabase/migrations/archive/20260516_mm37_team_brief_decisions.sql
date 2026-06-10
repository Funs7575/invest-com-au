-- ============================================================================
-- Migration: 20260516_mm37_team_brief_decisions.sql
-- Purpose: Pro Squad bulk-inbox "not for us" + "snoozed" decisions. Lets
--          squads bulk-decline briefs out of their niche so the inbox stays
--          tidy without releasing the brief (other squads may still claim).
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + unique (team_id, brief_id,
-- decision). Bulk re-runs are safe no-ops.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.team_brief_decisions;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_brief_decisions (
  id                          bigserial PRIMARY KEY,
  team_id                     integer NOT NULL REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  brief_id                    integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  decision                    text NOT NULL CHECK (decision IN ('not_for_us', 'snoozed')),
  reason                      text,
  decided_by_professional_id  integer REFERENCES public.professionals(id),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_brief_decisions
  ON public.team_brief_decisions (team_id, brief_id, decision);
CREATE INDEX IF NOT EXISTS idx_team_brief_decisions_team
  ON public.team_brief_decisions (team_id, created_at DESC);

ALTER TABLE public.team_brief_decisions ENABLE ROW LEVEL SECURITY;

-- Members of the team can SELECT their team's decisions.
DROP POLICY IF EXISTS "team members read decisions" ON public.team_brief_decisions;
CREATE POLICY "team members read decisions"
  ON public.team_brief_decisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.expert_team_members m
      JOIN public.professionals p ON p.id = m.professional_id
      WHERE m.team_id = team_brief_decisions.team_id
        AND m.status = 'active'
        AND p.auth_user_id = auth.uid()
    )
  );

-- service_role inserts on behalf of the bulk action.

COMMIT;
