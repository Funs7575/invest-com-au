-- ============================================================================
-- Migration: 20260801000100_principal_id_on_entity_tables.sql
-- Purpose: Add `principal_id` column linking each of the 5 user-facing
--          account-kind entity tables to the unified `principals` registry.
--          Nullable during transition. `auth_user_id` remains the load-
--          bearing column for RLS and lookups; `principal_id` populates in
--          the backfill migration that follows.
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 0 — Session 0.1.
-- Risk: low — additive nullable columns + partial indexes; no existing
--       behaviour changed.
-- Rollback:
--   BEGIN;
--     DROP INDEX IF EXISTS idx_professionals_principal_id;
--     DROP INDEX IF EXISTS idx_broker_accounts_principal_id;
--     DROP INDEX IF EXISTS idx_investor_profiles_principal_id;
--     DROP INDEX IF EXISTS idx_business_accounts_principal_id;
--     DROP INDEX IF EXISTS idx_listing_owner_accounts_principal_id;
--     ALTER TABLE public.professionals DROP COLUMN IF EXISTS principal_id;
--     ALTER TABLE public.broker_accounts DROP COLUMN IF EXISTS principal_id;
--     ALTER TABLE public.investor_profiles DROP COLUMN IF EXISTS principal_id;
--     ALTER TABLE public.business_accounts DROP COLUMN IF EXISTS principal_id;
--     ALTER TABLE public.listing_owner_accounts DROP COLUMN IF EXISTS principal_id;
--   COMMIT;
-- ============================================================================

BEGIN;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

ALTER TABLE public.broker_accounts
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

ALTER TABLE public.listing_owner_accounts
  ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.principals(id) ON DELETE SET NULL;

-- Partial indexes — only populated rows are interesting for joins.
CREATE INDEX IF NOT EXISTS idx_professionals_principal_id
  ON public.professionals (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broker_accounts_principal_id
  ON public.broker_accounts (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investor_profiles_principal_id
  ON public.investor_profiles (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_accounts_principal_id
  ON public.business_accounts (principal_id) WHERE principal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_owner_accounts_principal_id
  ON public.listing_owner_accounts (principal_id) WHERE principal_id IS NOT NULL;

COMMIT;
