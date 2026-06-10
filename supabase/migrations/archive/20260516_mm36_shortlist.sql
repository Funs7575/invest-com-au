-- ============================================================================
-- Migration: 20260516_mm36_shortlist.sql
-- Purpose: Brief comparison shortlist — a consumer with an open Match Request
--          can shortlist up to 5 accepted pros/teams and compare them
--          side-by-side on the tracker page.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + UNIQUE prevent duplicates.
-- 5-max is enforced in app code (per-brief count-before-insert) rather than
-- a trigger to keep the schema simple.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.brief_shortlists;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.brief_shortlists (
  id               bigserial PRIMARY KEY,
  brief_id         integer NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  provider_kind    text NOT NULL CHECK (provider_kind IN ('professional', 'team')),
  provider_id      integer NOT NULL,
  added_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_by_email   text NOT NULL,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_brief_shortlist_unique_provider
  ON public.brief_shortlists (brief_id, provider_kind, provider_id);
CREATE INDEX IF NOT EXISTS idx_brief_shortlists_brief
  ON public.brief_shortlists (brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_shortlists_user
  ON public.brief_shortlists (added_by_user_id);

ALTER TABLE public.brief_shortlists ENABLE ROW LEVEL SECURITY;

-- Consumer (brief owner) reads + writes their shortlist.
DROP POLICY IF EXISTS "brief owner reads shortlist" ON public.brief_shortlists;
CREATE POLICY "brief owner reads shortlist"
  ON public.brief_shortlists
  FOR SELECT
  TO authenticated
  USING (
    added_by_user_id = auth.uid()
    OR added_by_email = auth.email()
  );

DROP POLICY IF EXISTS "brief owner inserts shortlist" ON public.brief_shortlists;
CREATE POLICY "brief owner inserts shortlist"
  ON public.brief_shortlists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by_user_id = auth.uid()
    OR added_by_email = auth.email()
  );

DROP POLICY IF EXISTS "brief owner deletes shortlist" ON public.brief_shortlists;
CREATE POLICY "brief owner deletes shortlist"
  ON public.brief_shortlists
  FOR DELETE
  TO authenticated
  USING (
    added_by_user_id = auth.uid()
    OR added_by_email = auth.email()
  );

-- service_role bypasses RLS implicitly.

COMMIT;
