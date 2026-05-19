-- ============================================================================
-- Migration: 20260801000800_gdpr_soft_delete.sql
-- Purpose: Pre-launch GDPR / APP-compliant soft-delete foundation.
--          Adds deleted_at + pii_redacted_at columns to the principals
--          registry and the 5 user-facing entity tables. Tightens the
--          existing per-user read policies with `AND deleted_at IS NULL`
--          so soft-deleted rows immediately disappear from queries
--          without requiring every caller to add a WHERE clause.
--
--          Two-stage retention model:
--            - deleted_at set    → row is hidden from user-facing queries
--                                  immediately; PII preserved for the
--                                  initial 30-day grace window so a user
--                                  who deletes by mistake can be restored
--            - pii_redacted_at   → set by a daily cron once deleted_at is
--                                  >30 days old; nulls PII columns but
--                                  retains financial-record skeleton
--                                  under "Deleted user" for AFSL 7-year
--                                  retention requirement
--            - hard delete       → separate cron once deleted_at is
--                                  >7 years old
--
--          The cron implementations (redact-deleted-users +
--          hard-delete-expired) land in a follow-up; the column-level
--          schema is staged here so the soft-delete endpoint can ship
--          immediately and the cron is purely additive when it lands.
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 2 — Session 2.1.
-- Risk: medium — RLS predicate tightening is behaviour-changing. With
--                no existing soft-deleted rows it's a no-op until users
--                start deleting, but if a future migration sets
--                deleted_at on rows BEFORE this is rolled forward, those
--                rows become invisible. Verified zero rows have
--                deleted_at populated before applying.
-- Rollback:
--   BEGIN;
--     -- Restore prior policies (drop new ones, re-create without the
--     -- deleted_at clause)
--     DROP POLICY IF EXISTS "human reads own principal" ON public.principals;
--     CREATE POLICY "human reads own principal" ON public.principals
--       FOR SELECT TO authenticated
--       USING (kind = 'human' AND auth_user_id = auth.uid());
--     -- ... (same shape for the 5 entity tables)
--     ALTER TABLE public.principals DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.principals DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.professionals DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.professionals DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.broker_accounts DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.broker_accounts DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.investor_profiles DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.investor_profiles DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.business_accounts DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.business_accounts DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.listing_owner_accounts DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.listing_owner_accounts DROP COLUMN IF EXISTS pii_redacted_at;
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── Add columns ──────────────────────────────────────────────────────────
ALTER TABLE public.principals
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

ALTER TABLE public.broker_accounts
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

ALTER TABLE public.business_accounts
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

ALTER TABLE public.listing_owner_accounts
  ADD COLUMN IF NOT EXISTS deleted_at      timestamptz,
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

-- ─── Indexes for cron scans ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_principals_deleted_at
  ON public.principals (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professionals_deleted_at
  ON public.professionals (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broker_accounts_deleted_at
  ON public.broker_accounts (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investor_profiles_deleted_at
  ON public.investor_profiles (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_accounts_deleted_at
  ON public.business_accounts (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_owner_accounts_deleted_at
  ON public.listing_owner_accounts (deleted_at) WHERE deleted_at IS NOT NULL;

-- ─── Tighten per-user read policies to hide soft-deleted rows ─────────────
-- principals
DROP POLICY IF EXISTS "human reads own principal" ON public.principals;
CREATE POLICY "human reads own principal"
  ON public.principals FOR SELECT
  TO authenticated
  USING (kind = 'human' AND auth_user_id = auth.uid() AND deleted_at IS NULL);

-- investor_profiles
-- Existing policies are named with the kind prefix per the project's
-- convention. We re-create only the SELECT policy with the new predicate.
-- (Other tables follow the same pattern below.)
DROP POLICY IF EXISTS "investor reads own profile" ON public.investor_profiles;
CREATE POLICY "investor reads own profile"
  ON public.investor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

-- business_accounts
DROP POLICY IF EXISTS "business reads own account" ON public.business_accounts;
CREATE POLICY "business reads own account"
  ON public.business_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

-- listing_owner_accounts
DROP POLICY IF EXISTS "listing_owner reads own account" ON public.listing_owner_accounts;
CREATE POLICY "listing_owner reads own account"
  ON public.listing_owner_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id AND deleted_at IS NULL);

-- professionals and broker_accounts use bespoke policy names from their
-- own migrations and have public-read paths for marketplace listings.
-- Tightening their SELECT policies requires a separate migration that
-- carefully distinguishes "owner reads own (deleted_at-aware)" vs
-- "public reads active marketplace row (status=active AND deleted_at
-- IS NULL)". Staged here for follow-up rather than risking a marketplace
-- visibility regression. The deleted_at column is in place so any
-- caller can `.is('deleted_at', null)` defensively in the meantime.

COMMIT;
