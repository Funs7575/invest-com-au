-- ============================================================================
-- Migration: 20260514_mm09_team_brief_referrals.sql
-- Purpose: Inter-team brief referrals — let one verified Expert Team forward
--          an out-of-scope brief (visible in their squad inbox) to another
--          verified team. Receiving squad accepts or declines; accept claims
--          the brief for the to_team_id via the existing team-brief
--          assignment surface (or a direct UPDATE fallback in lib code).
--
-- Why: today a squad's only options on a brief outside their niche are to
-- progress it (compliance risk) or release it (founder ROI loss). A referral
-- channel keeps the brief alive inside the marketplace and signals network
-- effects.
--
-- Idempotency: CREATE TABLE / CREATE INDEX / CREATE POLICY use IF NOT EXISTS
-- or DROP-then-CREATE. Safe to re-apply.
--
-- Rollback (destructive, reverse order):
--   DROP FUNCTION IF EXISTS public.tbr_is_team_member(integer);
--   DROP TABLE IF EXISTS public.team_brief_referrals;
--
-- Risk: low — additive, references existing tables only; no row data is
-- migrated in or out.
-- ============================================================================

BEGIN;

-- ── 1. Helper: is the auth.uid()'s professional a member of <team_id>? ─────
-- Used by RLS policies. SECURITY DEFINER so the policy doesn't need its own
-- SELECT permission on professionals/expert_team_members for the caller.
CREATE OR REPLACE FUNCTION public.tbr_is_team_member(p_team_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.expert_team_members m
    JOIN public.professionals p ON p.id = m.professional_id
    WHERE m.team_id = p_team_id
      AND m.status = 'active'
      AND p.auth_user_id = auth.uid()
  );
$$;

-- ── 2. team_brief_referrals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_brief_referrals (
  id                              bigserial PRIMARY KEY,
  brief_id                        integer NOT NULL
    REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  from_team_id                    integer NOT NULL
    REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  to_team_id                      integer NOT NULL
    REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  from_professional_id            integer
    REFERENCES public.professionals(id),
  note                            text,
  status                          text NOT NULL DEFAULT 'pending',
  responded_at                    timestamptz,
  responded_by_professional_id    integer
    REFERENCES public.professionals(id),
  created_at                      timestamptz NOT NULL DEFAULT now()
);

-- CHECK + UNIQUE added separately so re-runs don't fail on ADD COLUMN.
ALTER TABLE public.team_brief_referrals
  DROP CONSTRAINT IF EXISTS team_brief_referrals_status_check;
ALTER TABLE public.team_brief_referrals
  ADD  CONSTRAINT team_brief_referrals_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

ALTER TABLE public.team_brief_referrals
  DROP CONSTRAINT IF EXISTS team_brief_referrals_no_self_refer;
ALTER TABLE public.team_brief_referrals
  ADD  CONSTRAINT team_brief_referrals_no_self_refer
  CHECK (from_team_id <> to_team_id);

-- One referral per (brief, target team). Re-refer to the same team is a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_brief_referrals_brief_to_team
  ON public.team_brief_referrals (brief_id, to_team_id);

CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_brief
  ON public.team_brief_referrals (brief_id);
CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_to_status
  ON public.team_brief_referrals (to_team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_from
  ON public.team_brief_referrals (from_team_id, created_at DESC);

ALTER TABLE public.team_brief_referrals ENABLE ROW LEVEL SECURITY;

-- Authenticated users on either side of the referral can read it.
DROP POLICY IF EXISTS "Team members read their referrals"
  ON public.team_brief_referrals;
CREATE POLICY "Team members read their referrals"
  ON public.team_brief_referrals
  FOR SELECT
  TO authenticated
  USING (
    public.tbr_is_team_member(from_team_id)
    OR public.tbr_is_team_member(to_team_id)
  );

-- Authenticated users on the from-side can INSERT a referral.
DROP POLICY IF EXISTS "From-team members can insert referrals"
  ON public.team_brief_referrals;
CREATE POLICY "From-team members can insert referrals"
  ON public.team_brief_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (public.tbr_is_team_member(from_team_id));

-- Service role has unconditional access — API code enforces detailed checks
-- (active membership, brief still open, etc.) on behalf of the caller.
DROP POLICY IF EXISTS "Service role full access team_brief_referrals"
  ON public.team_brief_referrals;
CREATE POLICY "Service role full access team_brief_referrals"
  ON public.team_brief_referrals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
