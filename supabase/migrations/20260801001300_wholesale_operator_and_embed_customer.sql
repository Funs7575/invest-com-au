-- ============================================================================
-- Migration: 20260801001300_wholesale_operator_and_embed_customer.sql
-- Purpose: Phase 4.2 + 4.4 — two new account kinds.
--
--   wholesale_operators
--     s708-qualified fund managers running listings on the alternatives
--     verticals (MM-V06 stream's wholesale gates). Their workspace lives
--     at /wholesale-portal — distinct from advisor-portal because the
--     compliance posture (sophisticated-investor only) and the
--     listing-management surface are different.
--
--   embed_customers
--     B2B SaaS for white-label widget consumers. API-key + quota +
--     Stripe billing. Portal at /embed-portal.
--
--   (Phase 4.3 firm_staff intentionally skipped — that's a permissions
--   layer within an advisor_firm, not a distinct workspace kind.
--   Will be modelled via firm_memberships role expansion in a future
--   session.)
--
-- The account_kind_membership view extends with two more UNION branches.
-- The 5 lib registry sites (lib/account-types.ts, lib/account-kinds.ts,
-- lib/portal-gate.ts, app/account/select-workspace/SelectWorkspaceClient.tsx,
-- components/WorkspaceSwitcher.tsx) all get the matching entries in a
-- companion code change; scripts/check-entity-registry.mjs fails CI if
-- any of those sites drifts.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 4 — Sessions 4.2 + 4.4.
-- Risk: low — additive entity tables; view rewrite is purely additive.
-- Rollback:
--   BEGIN;
--     DROP VIEW IF EXISTS public.account_kind_membership;
--     -- (recreate from 20260801000600_squad_workspace_kind.sql)
--     DROP TABLE IF EXISTS public.embed_customers;
--     DROP TABLE IF EXISTS public.wholesale_operators;
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── wholesale_operators ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wholesale_operators (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id        uuid   NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  principal_id        uuid   REFERENCES public.principals(id) ON DELETE SET NULL,
  display_name        text,
  afsl_number         text,
  fund_type           text   CHECK (fund_type IN (
                        'private_equity', 'venture_capital', 'real_estate',
                        'private_credit', 'litigation_funding',
                        'insurance_linked', 'hedge', 'other'
                      ) OR fund_type IS NULL),
  s708_verified_at    timestamptz,
  status              text   NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  deleted_at          timestamptz,
  pii_redacted_at     timestamptz,
  metadata            jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wholesale_operators_auth_user
  ON public.wholesale_operators (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_wholesale_operators_status
  ON public.wholesale_operators (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_wholesale_operators_principal_id
  ON public.wholesale_operators (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wholesale_operators_deleted_at
  ON public.wholesale_operators (deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE public.wholesale_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_operators FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wholesale_operator reads own profile" ON public.wholesale_operators;
CREATE POLICY "wholesale_operator reads own profile"
  ON public.wholesale_operators FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "wholesale_operator inserts own profile" ON public.wholesale_operators;
CREATE POLICY "wholesale_operator inserts own profile"
  ON public.wholesale_operators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "wholesale_operator updates own profile" ON public.wholesale_operators;
CREATE POLICY "wholesale_operator updates own profile"
  ON public.wholesale_operators FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access wholesale_operators"
  ON public.wholesale_operators;
CREATE POLICY "service_role full access wholesale_operators"
  ON public.wholesale_operators FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER wholesale_operators_updated_at
  BEFORE UPDATE ON public.wholesale_operators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── embed_customers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.embed_customers (
  id                       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id             uuid   NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  principal_id             uuid   REFERENCES public.principals(id) ON DELETE SET NULL,
  display_name             text,
  company_name             text,
  api_key_hash             text   UNIQUE,
  api_key_created_at       timestamptz,
  monthly_quota_requests   int    NOT NULL DEFAULT 10000,
  stripe_customer_id       text,
  subscription_status      text   CHECK (subscription_status IN (
                              'trialing', 'active', 'past_due',
                              'canceled', 'incomplete', 'incomplete_expired'
                            ) OR subscription_status IS NULL),
  status                   text   NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  deleted_at               timestamptz,
  pii_redacted_at          timestamptz,
  metadata                 jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embed_customers_auth_user
  ON public.embed_customers (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_embed_customers_status
  ON public.embed_customers (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_embed_customers_principal_id
  ON public.embed_customers (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embed_customers_deleted_at
  ON public.embed_customers (deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE public.embed_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_customers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "embed_customer reads own profile" ON public.embed_customers;
CREATE POLICY "embed_customer reads own profile"
  ON public.embed_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "embed_customer inserts own profile" ON public.embed_customers;
CREATE POLICY "embed_customer inserts own profile"
  ON public.embed_customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "embed_customer updates own profile" ON public.embed_customers;
CREATE POLICY "embed_customer updates own profile"
  ON public.embed_customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "service_role full access embed_customers"
  ON public.embed_customers;
CREATE POLICY "service_role full access embed_customers"
  ON public.embed_customers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER embed_customers_updated_at
  BEFORE UPDATE ON public.embed_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── account_kind_membership view: extend with two more branches ──────────
CREATE OR REPLACE VIEW public.account_kind_membership AS
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
    AND p.auth_user_id IS NOT NULL
UNION ALL
  SELECT
    auth_user_id,
    'wholesale_operator'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(display_name, 'Wholesale operator account') AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.wholesale_operators
  WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL
UNION ALL
  SELECT
    auth_user_id,
    'embed_customer'::text AS kind,
    id::text AS kind_id,
    principal_id,
    status,
    COALESCE(company_name, display_name, 'Embed customer account') AS display_label,
    NULL::text AS scope_slug,
    created_at
  FROM public.embed_customers
  WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL;

REVOKE ALL ON public.account_kind_membership FROM anon, authenticated, service_role;
GRANT SELECT ON public.account_kind_membership TO service_role;
GRANT SELECT ON public.account_kind_membership TO authenticated;

COMMIT;
