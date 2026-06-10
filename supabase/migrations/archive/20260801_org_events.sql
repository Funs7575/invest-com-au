-- Migration: 20260801_org_events.sql
--
-- Allows organisations (CPD providers) to create events via advisor_events.
-- Adds an optional organisation_id FK column alongside the existing
-- professional_id. Either professional_id OR organisation_id is set, not both.
--
-- Idempotency: ALTER TABLE ... ADD COLUMN IF NOT EXISTS; DROP/CREATE POLICY pairs.
--
-- Rollback:
--   ALTER TABLE public.advisor_events DROP COLUMN IF EXISTS organisation_id;
--   DROP INDEX IF EXISTS idx_advisor_events_organisation;
--   DROP POLICY IF EXISTS "advisor_events_org_select" ON public.advisor_events;
--   DROP POLICY IF EXISTS "advisor_events_org_write" ON public.advisor_events;

BEGIN;

-- Make professional_id nullable so org-owned events don't need a professional row
ALTER TABLE public.advisor_events
  ALTER COLUMN professional_id DROP NOT NULL;

ALTER TABLE public.advisor_events
  ADD COLUMN IF NOT EXISTS organisation_id INTEGER
    REFERENCES public.organisations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_advisor_events_organisation
  ON public.advisor_events (organisation_id, starts_at);

-- Orgs can SELECT their own events
DROP POLICY IF EXISTS "advisor_events_org_select" ON public.advisor_events;
CREATE POLICY "advisor_events_org_select"
  ON public.advisor_events FOR SELECT
  TO authenticated
  USING (
    organisation_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.admin_user_id = auth.uid()
        OR o.id IN (
          SELECT om.organisation_id FROM public.organisation_members om
          WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
  );

-- Orgs can INSERT/UPDATE/DELETE their own events
DROP POLICY IF EXISTS "advisor_events_org_write" ON public.advisor_events;
CREATE POLICY "advisor_events_org_write"
  ON public.advisor_events FOR ALL
  TO authenticated
  USING (
    organisation_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.admin_user_id = auth.uid()
        OR o.id IN (
          SELECT om.organisation_id FROM public.organisation_members om
          WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT o.id FROM public.organisations o
      WHERE o.admin_user_id = auth.uid()
        OR o.id IN (
          SELECT om.organisation_id FROM public.organisation_members om
          WHERE om.user_id = auth.uid() AND om.status = 'active'
        )
    )
  );

COMMIT;
