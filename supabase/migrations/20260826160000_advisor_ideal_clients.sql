-- Migration: 20260826160000_advisor_ideal_clients.sql
-- Structured ideal-client profile for advisors. Advisor sets which investor
-- archetypes, verticals, budget bands, and experience levels they serve best.
-- This drives a match-score boost in the weekly advisor-match-scores cron and
-- powers the "Good fit for your profile" hint on the advisor profile page.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_ideal_clients CASCADE;

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_ideal_clients (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  criteria        JSONB   NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id)
);

COMMENT ON TABLE  public.advisor_ideal_clients IS
  'Structured ideal-client criteria set by the advisor; drives match-score boost.';
COMMENT ON COLUMN public.advisor_ideal_clients.criteria IS
  'JSONB: {verticals: string[], budget_bands: string[], archetypes: string[], experience_levels: string[], description?: string}';

CREATE INDEX IF NOT EXISTS idx_advisor_ideal_clients_professional
  ON public.advisor_ideal_clients (professional_id);

ALTER TABLE public.advisor_ideal_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_ideal_clients FORCE ROW LEVEL SECURITY;

-- Public can read (shown on advisor profile pages)
DROP POLICY IF EXISTS "ideal_clients_public_read" ON public.advisor_ideal_clients;
CREATE POLICY "ideal_clients_public_read"
  ON public.advisor_ideal_clients FOR SELECT
  USING (true);

-- Service role: full access (cron + portal API use admin client)
DROP POLICY IF EXISTS "ideal_clients_service_role" ON public.advisor_ideal_clients;
CREATE POLICY "ideal_clients_service_role"
  ON public.advisor_ideal_clients TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
