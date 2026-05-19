-- ============================================================================
-- Migration: 20260801000300_account_kind_membership_via_principals.sql
-- Purpose: Add `principal_id` to the account_kind_membership view so callers
--          can resolve a membership row to its unified principal in one query
--          without a second lookup. All existing columns preserved exactly so
--          `lib/account-kinds.ts` continues to work without changes.
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.1.
-- Risk: low — view rewrite with additive column. Existing callers unaffected.
-- Rollback: re-apply 20260510240000_listing_owner_accounts.sql (last prior
--           definition of this view, without principal_id).
-- ============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.account_kind_membership AS
  SELECT
    auth_user_id,
    'advisor'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(firm_name, name) AS display_label,
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
    created_at
  FROM public.listing_owner_accounts
  WHERE auth_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
