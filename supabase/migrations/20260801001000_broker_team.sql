-- ============================================================================
-- Migration: 20260801001000_broker_team.sql
-- Purpose: Phase 2.3 — multi-seat broker partner teams.
--          Mirrors the advisor_firms + advisor_firm_invitations pattern
--          from 20260310 but scoped to broker_accounts. Today
--          broker_accounts is one row per person; a real affiliate
--          partner is an organisation with (typically) sales + finance
--          + ops + technical contacts. Without a team model we lose the
--          relationship when the named contact churns.
--
--          Three new tables:
--            broker_partner_orgs            — org registry (slug, name,
--                                             primary contact email,
--                                             status)
--            broker_team_memberships        — broker_account ↔ org join
--                                             with typed role
--            broker_team_invitations        — token-based invite, 7-day
--                                             expiry, same shape as
--                                             advisor_firm_invitations
--
--          Adds broker_accounts.broker_org_id linking each existing
--          row to its org (nullable for backward compat; backfill
--          one org per distinct broker_slug deferred to follow-up).
--
-- Roles: owner | finance | ops | technical. Permissions enforced at
-- the API layer (broker portal pages check membership.role for
-- access to billing / webhook config / etc).
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 2 — Session 2.3.
-- Risk: low — additive tables; no existing broker behaviour changed.
-- Rollback:
--   BEGIN;
--     DROP TABLE IF EXISTS public.broker_team_invitations CASCADE;
--     DROP TABLE IF EXISTS public.broker_team_memberships CASCADE;
--     DROP TABLE IF EXISTS public.broker_partner_orgs CASCADE;
--     ALTER TABLE public.broker_accounts DROP COLUMN IF EXISTS broker_org_id;
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── broker_partner_orgs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_partner_orgs (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL CHECK (length(name) > 0),
  primary_contact_email text,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'suspended', 'terminated')),
  max_seats       int  NOT NULL DEFAULT 10,
  principal_id    uuid REFERENCES public.principals(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_partner_orgs_status
  ON public.broker_partner_orgs (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_broker_partner_orgs_principal_id
  ON public.broker_partner_orgs (principal_id) WHERE principal_id IS NOT NULL;

ALTER TABLE public.broker_partner_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_partner_orgs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access broker_partner_orgs"
  ON public.broker_partner_orgs;
CREATE POLICY "service_role full access broker_partner_orgs"
  ON public.broker_partner_orgs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER broker_partner_orgs_updated_at
  BEFORE UPDATE ON public.broker_partner_orgs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── broker_team_memberships ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_team_memberships (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          bigint NOT NULL REFERENCES public.broker_partner_orgs(id) ON DELETE CASCADE,
  broker_account_id uuid NOT NULL REFERENCES public.broker_accounts(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'finance', 'ops', 'technical', 'member')),
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'pending', 'removed')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, broker_account_id)
);

CREATE INDEX IF NOT EXISTS idx_broker_team_memberships_org
  ON public.broker_team_memberships (org_id);
CREATE INDEX IF NOT EXISTS idx_broker_team_memberships_account
  ON public.broker_team_memberships (broker_account_id);
CREATE INDEX IF NOT EXISTS idx_broker_team_memberships_active
  ON public.broker_team_memberships (org_id, status) WHERE status = 'active';

ALTER TABLE public.broker_team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_team_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "broker member reads own org memberships"
  ON public.broker_team_memberships;
CREATE POLICY "broker member reads own org memberships"
  ON public.broker_team_memberships FOR SELECT
  TO authenticated
  USING (
    broker_account_id IN (
      SELECT id FROM public.broker_accounts WHERE auth_user_id = auth.uid()
    )
    OR org_id IN (
      SELECT org_id FROM public.broker_team_memberships m2
      WHERE m2.broker_account_id IN (
        SELECT id FROM public.broker_accounts WHERE auth_user_id = auth.uid()
      )
      AND m2.status = 'active'
    )
  );

DROP POLICY IF EXISTS "service_role full access broker_team_memberships"
  ON public.broker_team_memberships;
CREATE POLICY "service_role full access broker_team_memberships"
  ON public.broker_team_memberships FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER broker_team_memberships_updated_at
  BEFORE UPDATE ON public.broker_team_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── broker_team_invitations ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_team_invitations (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id          bigint NOT NULL REFERENCES public.broker_partner_orgs(id) ON DELETE CASCADE,
  email           text NOT NULL,
  name            text,
  invited_by      uuid REFERENCES public.broker_accounts(id) ON DELETE SET NULL,
  token           text UNIQUE NOT NULL,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'finance', 'ops', 'technical', 'member')),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broker_team_invitations_token
  ON public.broker_team_invitations (token);
CREATE INDEX IF NOT EXISTS idx_broker_team_invitations_org
  ON public.broker_team_invitations (org_id);
CREATE INDEX IF NOT EXISTS idx_broker_team_invitations_pending
  ON public.broker_team_invitations (status, expires_at) WHERE status = 'pending';

ALTER TABLE public.broker_team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_team_invitations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access broker_team_invitations"
  ON public.broker_team_invitations;
CREATE POLICY "service_role full access broker_team_invitations"
  ON public.broker_team_invitations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ─── broker_accounts.broker_org_id ────────────────────────────────────────
ALTER TABLE public.broker_accounts
  ADD COLUMN IF NOT EXISTS broker_org_id bigint
    REFERENCES public.broker_partner_orgs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_broker_accounts_broker_org_id
  ON public.broker_accounts (broker_org_id) WHERE broker_org_id IS NOT NULL;

COMMIT;
