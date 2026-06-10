-- ============================================================================
-- Migration: 20260514_mm04_team_brief_assignments.sql
-- Purpose: Track which Pro Squad member has claimed an accepted Match Request
--          ("brief"). Underpins the new /teams/[slug]/inbox + claim/handoff/
--          complete/release flow added in MM04.
--
-- Why: PR #821 brought multi-member Expert Teams that can accept briefs as a
-- single unit (advisor_auctions.accepted_by_team_id). There was no record of
-- which individual member is on the hook for the work, so squads were
-- duplicating work or dropping balls. This table is the squad-side handoff
-- ledger — one row per (brief, claimer), with status transitions for the
-- claim lifecycle.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS +
-- DROP POLICY IF EXISTS / CREATE POLICY. Safe to re-apply.
--
-- Rollback (destructive):
--   DROP TABLE IF EXISTS public.team_brief_assignments;
--
-- Risk: low — additive table, no schema changes elsewhere, no data loss on
-- rollback (only handoff ledger).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.team_brief_assignments (
  id                bigserial PRIMARY KEY,
  brief_id          integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  team_id           integer NOT NULL REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  professional_id   integer NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'claimed'
    CHECK (status IN ('claimed', 'handed_off', 'completed', 'released')),
  notes             text,
  claimed_at        timestamptz NOT NULL DEFAULT now(),
  released_at       timestamptz,
  UNIQUE (brief_id, professional_id)
);

-- Fast lookups for the inbox: "claims on this team" + "claims on this brief".
CREATE INDEX IF NOT EXISTS idx_team_brief_assignments_team_brief
  ON public.team_brief_assignments (team_id, brief_id);

CREATE INDEX IF NOT EXISTS idx_team_brief_assignments_brief
  ON public.team_brief_assignments (brief_id);

-- "Active claims for this team" KPI strip — filter by status quickly.
CREATE INDEX IF NOT EXISTS idx_team_brief_assignments_team_status
  ON public.team_brief_assignments (team_id, status);

ALTER TABLE public.team_brief_assignments ENABLE ROW LEVEL SECURITY;

-- Service-role full access — used by the API routes which write through the
-- admin client (cross-row updates, no JWT path for the second member who
-- receives a handoff).
DROP POLICY IF EXISTS "Service role full access team_brief_assignments"
  ON public.team_brief_assignments;
CREATE POLICY "Service role full access team_brief_assignments"
  ON public.team_brief_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated active members of the team can SELECT every claim on that
-- team's briefs (visibility = whole squad sees who's on what).
DROP POLICY IF EXISTS "Active team members can read team claims"
  ON public.team_brief_assignments;
CREATE POLICY "Active team members can read team claims"
  ON public.team_brief_assignments FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT etm.team_id
      FROM public.expert_team_members etm
      JOIN public.professionals p ON p.id = etm.professional_id
      WHERE p.auth_user_id = auth.uid()
        AND etm.status = 'active'
    )
  );

-- Authenticated active members can INSERT their own claim row (claim a
-- brief for themselves). The API still validates idempotency + 409 on
-- another-member conflict.
DROP POLICY IF EXISTS "Active team members can insert own claim"
  ON public.team_brief_assignments;
CREATE POLICY "Active team members can insert own claim"
  ON public.team_brief_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
    AND team_id IN (
      SELECT etm.team_id
      FROM public.expert_team_members etm
      JOIN public.professionals p ON p.id = etm.professional_id
      WHERE p.auth_user_id = auth.uid()
        AND etm.status = 'active'
    )
  );

-- Authenticated active members can UPDATE their own claim row only
-- (handoff / complete / release). Cross-member writes go through the
-- service-role API route.
DROP POLICY IF EXISTS "Active team members can update own claim"
  ON public.team_brief_assignments;
CREATE POLICY "Active team members can update own claim"
  ON public.team_brief_assignments FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.auth_user_id = auth.uid()
    )
  );

COMMIT;
