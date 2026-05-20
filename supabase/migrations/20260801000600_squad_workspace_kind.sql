-- ============================================================================
-- Migration: 20260801000600_squad_workspace_kind.sql
-- Purpose: Add `'squad'` as a workspace kind alongside the existing 5 base
--          kinds. A squad workspace is a (user, team) scoped context: the
--          user is acting on behalf of an expert_team they're an active
--          member of. View rewrites `account_kind_membership` with a sixth
--          UNION branch over `expert_team_members` (status='active') and
--          adds a `scope_slug` column carrying the team slug for squad
--          rows (NULL for base-kind rows).
--
-- The existing view columns (auth_user_id, kind, kind_id, principal_id,
-- status, display_label, created_at) are preserved exactly. The added
-- `scope_slug` column is the only schema change for view consumers.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 1 — Session 1.1.
-- Risk: low — view rewrite with one additive column. Existing callers
--             unaffected (they SELECT named columns, not *).
-- Rollback: re-apply 20260801000300_account_kind_membership_via_principals.sql
--           (last definition without squad branch + scope_slug column).
-- ============================================================================

BEGIN;

-- DROP + CREATE (not CREATE OR REPLACE): inserting scope_slug mid-column-
-- list. security_invoker=true preserves RLS for authenticated direct reads.
DROP VIEW IF EXISTS public.account_kind_membership;
CREATE VIEW public.account_kind_membership WITH (security_invoker = true) AS
  SELECT
    auth_user_id,
    'advisor'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(firm_name, name) AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.professionals
  WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id,
    'broker_partner'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(company_name, full_name, broker_slug) AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.broker_accounts
  WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id,
    'investor'::text AS kind,
    id::text AS kind_id,
    principal_id,
    'active'::text AS status,
    COALESCE(display_name, 'Investor account') AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.investor_profiles
  WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id,
    'business_owner'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(legal_name, business_name) AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.business_accounts
  WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id,
    'listing_owner'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(display_name, 'Listing owner account') AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.listing_owner_accounts
  WHERE auth_user_id IS NOT NULL
UNION ALL
  -- ─── squad branch ─────────────────────────────────────────────────────────
  -- A user is a "squad" workspace member for every active expert_team_members
  -- row that joins back to a professional with their auth_user_id. The
  -- team slug is carried as scope_slug for routing (/teams/<slug>/dashboard).
  -- kind_id stays the integer team_id (cast to text) for consistency.
  SELECT
    p.auth_user_id,
    'squad'::text AS kind,
    et.id::text AS kind_id,
    p.principal_id,
    etm.status,
    et.name AS display_label,
    et.slug AS scope_slug,
    etm.created_at
  FROM public.expert_team_members etm
  INNER JOIN public.expert_teams et ON et.id = etm.team_id
  INNER JOIN public.professionals p ON p.id = etm.professional_id
  WHERE etm.status = 'active'
    AND p.auth_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
