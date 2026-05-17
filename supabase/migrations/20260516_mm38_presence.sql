-- ============================================================================
-- Migration: 20260516_mm38_presence.sql
-- Purpose: Lightweight "online now" indicator for pros + squads. A client
--          heartbeat (POST /api/presence/ping every 90s while tab is visible)
--          upserts last_ping_at; server-side reads return true if ping is
--          within 5 minutes.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + unique partial indexes guard
-- against duplicate rows per professional / team.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.presence_pings;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.presence_pings (
  id              bigserial PRIMARY KEY,
  professional_id integer REFERENCES public.professionals(id) ON DELETE CASCADE,
  team_id         integer REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  last_ping_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (professional_id IS NOT NULL AND team_id IS NULL)
    OR (professional_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_pings_professional
  ON public.presence_pings (professional_id)
  WHERE professional_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_presence_pings_team
  ON public.presence_pings (team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_presence_pings_last_ping
  ON public.presence_pings (last_ping_at);

ALTER TABLE public.presence_pings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read presence" ON public.presence_pings;
CREATE POLICY "anon read presence"
  ON public.presence_pings
  FOR SELECT TO anon, authenticated
  USING (true);

-- INSERT/UPDATE happens via service_role only (API route enforces ownership).

COMMIT;
