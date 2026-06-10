-- ============================================================================
-- Migration: 20260801000800_gdpr_soft_delete.sql
-- Purpose: Pre-launch GDPR / APP-compliant soft-delete + redaction foundation,
--          wired into main's EXISTING account-deletion flow
--          (`account_deletion_requests`, populated by
--          POST /api/account/delete).
--
--          Adds two timestamp columns to each of the 5 user-facing entity
--          tables:
--            - deleted_at      → set the moment a user requests deletion
--                                (soft-delete marker; PII preserved during
--                                the 30-day grace window so an accidental
--                                deletion can be cancelled/restored)
--            - pii_redacted_at → set by the redact-deleted-users cron once
--                                the account_deletion_requests grace window
--                                has expired; PII columns are nulled but the
--                                financial-record skeleton is retained under
--                                a "Deleted user" placeholder for the AFSL
--                                7-year retention requirement
--
--          A matching `pii_redacted_at` column is added to
--          `account_deletion_requests` so the cron can record when a
--          request's PII was redacted (distinct from `fulfilled_at`, which
--          the existing flow already uses to mark the request closed).
--
--          The two crons that consume these columns
--          (redact-deleted-users + hard-delete-expired) ship in the same
--          change and are registered in lib/cron-groups.ts under daily-2,
--          alongside the existing gdpr-retention-purge job.
--
--          DELIBERATELY ADDITIVE: this migration does NOT tighten any
--          existing RLS SELECT policy. #964 attempted to add
--          `AND deleted_at IS NULL` to per-user read policies, but several
--          of these tables (professionals, broker_accounts,
--          listing_owner_accounts) have public marketplace read paths where
--          a careless predicate change risks a visibility regression.
--          Callers that must hide soft-deleted rows should filter
--          `.is("deleted_at", null)` explicitly; tightening the policies is
--          left to a separate, carefully-scoped migration.
-- Risk: low — additive columns + partial indexes only. No data touched, no
--             policy behaviour changed. With zero soft-deleted rows at
--             apply time it is a no-op until a user requests deletion.
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.account_deletion_requests DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.professionals          DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.professionals          DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.broker_accounts        DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.broker_accounts        DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.investor_profiles      DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.investor_profiles      DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.business_accounts      DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.business_accounts      DROP COLUMN IF EXISTS pii_redacted_at;
--     ALTER TABLE public.listing_owner_accounts DROP COLUMN IF EXISTS deleted_at;
--     ALTER TABLE public.listing_owner_accounts DROP COLUMN IF EXISTS pii_redacted_at;
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── Soft-delete + redaction columns on the 5 entity tables ────────────────
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

-- Cron bookkeeping column on the existing deletion-request ledger.
ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS pii_redacted_at timestamptz;

COMMENT ON COLUMN public.account_deletion_requests.pii_redacted_at IS
  'Timestamp when the redact-deleted-users cron nulled PII on the linked '
  'entity rows after the grace window expired. NULL = not yet redacted.';

-- ─── Partial indexes so the daily crons scan only relevant rows ────────────
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

-- Hard-delete cron scans rows already redacted (pii_redacted_at set) whose
-- retention window has elapsed.
CREATE INDEX IF NOT EXISTS idx_professionals_pii_redacted_at
  ON public.professionals (pii_redacted_at) WHERE pii_redacted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broker_accounts_pii_redacted_at
  ON public.broker_accounts (pii_redacted_at) WHERE pii_redacted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investor_profiles_pii_redacted_at
  ON public.investor_profiles (pii_redacted_at) WHERE pii_redacted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_accounts_pii_redacted_at
  ON public.business_accounts (pii_redacted_at) WHERE pii_redacted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_owner_accounts_pii_redacted_at
  ON public.listing_owner_accounts (pii_redacted_at) WHERE pii_redacted_at IS NOT NULL;

COMMIT;
