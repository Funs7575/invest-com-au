-- ============================================================================
-- Migration: 20260510240000_listing_owner_accounts.sql
-- Purpose: listing_owner AccountKind — promotes the existing OTP-cookie
--          flow at /invest/my-listings to a full Supabase Auth account.
--          OTP cookie path stays as a 60-day fallback tier.
-- Audit ref: account-system-expansion plan, Phase 4.
-- Risk: low — additive table + nullable column on listing_claims.
-- Rollback: DROP TABLE IF EXISTS public.listing_owner_accounts;
--           ALTER TABLE public.listing_claims DROP COLUMN IF EXISTS auth_user_id;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.listing_owner_accounts (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  email_verified_at timestamptz,
  status          text   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_owner_accounts_auth_user
  ON public.listing_owner_accounts (auth_user_id);

ALTER TABLE public.listing_owner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_owner_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listing_owner reads own account" ON public.listing_owner_accounts;
CREATE POLICY "listing_owner reads own account"
  ON public.listing_owner_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "listing_owner upserts own account" ON public.listing_owner_accounts;
CREATE POLICY "listing_owner upserts own account"
  ON public.listing_owner_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "listing_owner updates own account" ON public.listing_owner_accounts;
CREATE POLICY "listing_owner updates own account"
  ON public.listing_owner_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access listing_owner_accounts"
  ON public.listing_owner_accounts;
CREATE POLICY "service_role full access listing_owner_accounts"
  ON public.listing_owner_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- listing_claims gets an auth_user_id column so claimed listings can be
-- aggregated per-user. Existing OTP-cookie claims have NULL here; the
-- claim API populates the column when the user is authenticated.
ALTER TABLE public.listing_claims
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listing_claims_auth_user
  ON public.listing_claims (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Update account_kind_membership view to UNION in listing_owner_accounts.
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
  FROM public.listing_owner_accounts WHERE auth_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
