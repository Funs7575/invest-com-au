-- ============================================================================
-- Migration: 20260801000400_principal_id_on_partner_tables.sql
-- Purpose: Add `principal_id` linking commercial-partner metadata rows to the
--          unified `principals` registry. Scope is the two real partner-org
--          tables — newsletter_sponsors and partner_integrations — that
--          represent external organisations with no auth.users row. Other
--          tables sometimes lumped under "commercial partners" (e.g.
--          sponsored_placements, outbound_webhook_endpoints) are owned by
--          existing professional/team/admin principals and don't need a
--          partner_org row of their own.
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.3.
-- Risk: low — additive nullable columns + partial indexes.
-- Rollback:
--   BEGIN;
--     DROP INDEX IF EXISTS idx_newsletter_sponsors_principal_id;
--     DROP INDEX IF EXISTS idx_partner_integrations_principal_id;
--     ALTER TABLE public.newsletter_sponsors DROP COLUMN IF EXISTS principal_id;
--     ALTER TABLE public.partner_integrations DROP COLUMN IF EXISTS principal_id;
--   COMMIT;
-- ============================================================================

BEGIN;

ALTER TABLE public.newsletter_sponsors
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

ALTER TABLE public.partner_integrations
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_sponsors_principal_id
  ON public.newsletter_sponsors (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partner_integrations_principal_id
  ON public.partner_integrations (principal_id) WHERE principal_id IS NOT NULL;

COMMIT;
