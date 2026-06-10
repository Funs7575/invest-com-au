-- ============================================================================
-- Migration: 20260510220000_business_accounts.sql
-- Purpose: business_owner AccountKind — typed profile for business owners
--          claiming grants, R&D incentives, sell-business prep, etc. Mirrors
--          the professionals + broker_accounts pattern: per-user FK to
--          auth.users with RLS-scoped read/write on own row only.
-- Audit ref: account-system-expansion plan, Phase 3.
-- Risk: low — additive table; per-user RLS; no FK to anything besides
--       auth.users.
-- Rollback: DROP TABLE IF EXISTS public.business_accounts;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_accounts (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid   NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name   text   NOT NULL CHECK (length(business_name) > 0 AND length(business_name) <= 200),
  legal_name      text,
  abn             text   CHECK (abn IS NULL OR length(abn) = 11),
  acn             text   CHECK (acn IS NULL OR length(acn) = 9),
  industry        text,
  employees_band  text   CHECK (employees_band IS NULL OR employees_band IN (
                    '1','2-4','5-19','20-199','200+'
                  )),
  revenue_band    text   CHECK (revenue_band IS NULL OR revenue_band IN (
                    'under_75k','75k_2m','2m_10m','10m_50m','50m_plus'
                  )),
  primary_state   text   CHECK (primary_state IS NULL OR primary_state IN (
                    'NSW','VIC','QLD','WA','SA','TAS','NT','ACT'
                  )),
  year_established integer CHECK (year_established IS NULL OR (year_established >= 1850 AND year_established <= 2100)),
  status          text   NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','inactive')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_accounts_auth_user
  ON public.business_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_business_accounts_status
  ON public.business_accounts (status) WHERE status = 'active';

ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business reads own account" ON public.business_accounts;
CREATE POLICY "business reads own account"
  ON public.business_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "business inserts own account" ON public.business_accounts;
CREATE POLICY "business inserts own account"
  ON public.business_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "business updates own account" ON public.business_accounts;
CREATE POLICY "business updates own account"
  ON public.business_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access business_accounts" ON public.business_accounts;
CREATE POLICY "service_role full access business_accounts"
  ON public.business_accounts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────
-- Update account_kind_membership view to UNION in the new table.
-- The view has CREATE OR REPLACE semantics so we re-emit the full
-- definition with the new branch appended.
-- ──────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.account_kind_membership AS
  SELECT
    auth_user_id, 'advisor'::text AS kind, id::text AS kind_id, status,
    COALESCE(firm_name, name) AS display_label, created_at
  FROM public.professionals WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id, 'broker_partner'::text, id::text, status,
    COALESCE(company_name, full_name, broker_slug), created_at
  FROM public.broker_accounts WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id, 'investor'::text, id::text, 'active'::text,
    COALESCE(display_name, 'Investor account'), created_at
  FROM public.investor_profiles WHERE auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id, 'business_owner'::text, id::text, status,
    COALESCE(legal_name, business_name), created_at
  FROM public.business_accounts WHERE auth_user_id IS NOT NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
