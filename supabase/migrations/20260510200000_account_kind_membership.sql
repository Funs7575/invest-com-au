-- ============================================================================
-- Migration: 20260510200000_account_kind_membership.sql
-- Purpose: Unified view across every kind table so application code can ask
--          "what hats does this auth.users row wear?" in one query. Powers
--          the workspace chooser at /account/select-workspace and the portal
--          active-kind gates.
-- Audit ref: account-system-expansion plan, Phase 2.5.
-- Risk: low — view-only; no data writes; underlying tables unchanged.
-- Rollback: DROP VIEW IF EXISTS public.account_kind_membership;
-- ============================================================================

BEGIN;

-- View intentionally returns one row per (auth_user_id, kind) pair. A user
-- with multiple hats gets multiple rows. Each kind's status is forwarded
-- straight from its source table so callers can filter by 'active' /
-- 'pending' / etc. as needed.
--
-- NOTE: investor_profiles has no status column today (every row is
-- considered "active"); we synthesise 'active' as the literal. If we later
-- add a status column to investor_profiles, alter this view in a follow-up.
CREATE OR REPLACE VIEW public.account_kind_membership AS
  SELECT
    auth_user_id,
    'advisor'::text AS kind,
    id::text AS kind_id,
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
    'active'::text AS status,
    COALESCE(display_name, 'Investor account') AS display_label,
    created_at
  FROM public.investor_profiles
  WHERE auth_user_id IS NOT NULL;

-- Views inherit the underlying tables' RLS, but we want callers to query
-- this through service-role for the cross-kind summary. The view itself
-- has no policy syntax; instead we GRANT SELECT only to service_role +
-- authenticated, and the underlying tables' deny-all-anon RLS continues
-- to protect rows.
REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
-- Authenticated users CAN read (they'll only see their own rows because
-- each underlying table's RLS scopes by auth.uid()).
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
