-- ============================================================================
-- Migration: 20260801000500_backfill_partner_org_principals.sql
-- Purpose: Populate principals(kind='partner_org') from existing
--          newsletter_sponsors and partner_integrations rows. Deduplicates
--          within each source table by (display_name, source-tag) so a
--          company that's sponsored 5 newsletters gets ONE principal, and a
--          company that appears in both tables gets two principals (one per
--          source) — we'd rather under-merge than over-merge externally
--          attested commercial relationships.
--
-- Future sponsor → broker_partner upgrade flow: when a partner_org principal
-- later signs up via /broker-portal/signup, the post-signin hook should
-- detect the email match and update the existing principals row in place
-- (set kind='human', set auth_user_id) rather than creating a new one. This
-- migration leaves slug=NULL deliberately so the upgrade has space to set it.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.3.
-- Risk: medium — backfill scales with current commercial-partner row count.
--                Idempotent (NOT EXISTS guards), safe to re-run.
-- Rollback:
--   BEGIN;
--     UPDATE public.newsletter_sponsors SET principal_id = NULL;
--     UPDATE public.partner_integrations SET principal_id = NULL;
--     DELETE FROM public.principals WHERE kind = 'partner_org';
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── newsletter_sponsors → partner_org principals ──────────────────────────
INSERT INTO public.principals (kind, display_name, metadata, status)
SELECT DISTINCT
  'partner_org',
  n.company_name,
  jsonb_build_object('source', 'newsletter_sponsors'),
  'active'
FROM public.newsletter_sponsors n
WHERE n.company_name IS NOT NULL
  AND length(trim(n.company_name)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.principals pr
    WHERE pr.kind = 'partner_org'
      AND pr.display_name = n.company_name
      AND pr.metadata->>'source' = 'newsletter_sponsors'
  );

UPDATE public.newsletter_sponsors n
SET principal_id = pr.id
FROM public.principals pr
WHERE n.principal_id IS NULL
  AND n.company_name = pr.display_name
  AND pr.kind = 'partner_org'
  AND pr.metadata->>'source' = 'newsletter_sponsors';

-- ─── partner_integrations → partner_org principals ─────────────────────────
INSERT INTO public.principals (kind, display_name, metadata, status)
SELECT DISTINCT
  'partner_org',
  p.partner_name,
  jsonb_build_object('source', 'partner_integrations', 'partner_type', p.partner_type),
  CASE WHEN p.status IN ('live','contracted') THEN 'active'
       WHEN p.status IN ('paused','terminated') THEN 'suspended'
       ELSE 'pending'
  END
FROM public.partner_integrations p
WHERE p.partner_name IS NOT NULL
  AND length(trim(p.partner_name)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.principals pr
    WHERE pr.kind = 'partner_org'
      AND pr.display_name = p.partner_name
      AND pr.metadata->>'source' = 'partner_integrations'
      AND pr.metadata->>'partner_type' = p.partner_type
  );

UPDATE public.partner_integrations p
SET principal_id = pr.id
FROM public.principals pr
WHERE p.principal_id IS NULL
  AND p.partner_name = pr.display_name
  AND pr.kind = 'partner_org'
  AND pr.metadata->>'source' = 'partner_integrations'
  AND pr.metadata->>'partner_type' = p.partner_type;

COMMIT;
