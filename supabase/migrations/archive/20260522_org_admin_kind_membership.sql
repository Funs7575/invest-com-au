-- Migration: 20260522_org_admin_kind_membership.sql
--
-- Adds 'org_admin' to account_kind_membership so WorkspaceKind gate
-- can route organisation admins to /org-portal after Supabase Auth login.
--
-- Idempotency: CREATE OR REPLACE VIEW is always safe.
--
-- Rollback: re-emit view without the organisations UNION ALL arm.

BEGIN;

CREATE OR REPLACE VIEW public.account_kind_membership AS
  SELECT auth_user_id, 'advisor'::text AS kind, id::text AS kind_id, status,
    COALESCE(firm_name, name) AS display_label, created_at
  FROM public.professionals WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'broker_partner'::text, id::text, status,
    COALESCE(company_name, full_name, broker_slug), created_at
  FROM public.broker_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'investor'::text, id::text, 'active'::text,
    COALESCE(display_name, 'Investor account'), created_at
  FROM public.investor_profiles WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'business_owner'::text, id::text, status,
    COALESCE(legal_name, business_name), created_at
  FROM public.business_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT auth_user_id, 'listing_owner'::text, id::text, status,
    COALESCE(display_name, 'Listing owner account'), created_at
  FROM public.listing_owner_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT owner_user_id, 'startup'::text, id::text, status,
    COALESCE(company_name, 'Startup'), created_at
  FROM public.startup_profiles WHERE owner_user_id IS NOT NULL
UNION ALL
  SELECT admin_user_id AS auth_user_id,
         'org_admin'::text AS kind,
         id::text AS kind_id,
         status,
         name AS display_label,
         created_at
  FROM public.organisations
  WHERE admin_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
