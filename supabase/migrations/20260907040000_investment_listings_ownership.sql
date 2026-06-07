-- ============================================================================
-- Migration: investment_listings ownership (Phase 1 increment 2)
-- Date: 2026-06-07
-- Plan: docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md (D1/D2/D3)
--
-- Why: the listings consolidation makes investment_listings the single system
-- of record and gives every listing an identified owner. Phase 1 increment 1
-- (PR #1459) already requires an authenticated user to POST /api/listings/submit
-- and provisions a listing_owner_accounts row; this migration adds the column +
-- policies that let the owner-scoped portal read/manage their own listings.
--
-- IMPORTANT — apply order: this migration must be applied to the live DB BEFORE
-- the increment-2 code that writes owner_user_id ships, otherwise the submit
-- insert references a column that doesn't exist and 500s. It is intentionally
-- additive and safe to apply on its own (nullable column; legacy rows stay
-- owner_user_id = NULL and remain claimable via the existing email-OTP path).
--
-- Current RLS (from 20260601_rls_investment_listings.sql + 20260602 tighten):
--   anon         → SELECT only (USING true; public catalogue). Writes via admin.
--   service_role → ALL (bypass).
--   authenticated→ NO policy today, so a signed-in user reading via the
--                  authenticated role gets zero rows. This migration adds an
--                  authenticated SELECT policy (USING true — same public
--                  catalogue intent as anon) so logged-in users can browse and
--                  owners can read their own (incl. pending) listings. This is
--                  strictly additive (grants access currently denied).
--
-- What this migration does NOT do (deliberately, follow-up steps):
--   - It does not add an owner UPDATE policy (edits still go through the admin
--     client / "email listings@ to edit" until the owner self-edit UI lands).
--   - It does not backfill owner_user_id for legacy rows (none can be inferred;
--     they stay claimable by email).
--   - It does not migrate the separate `listings` (MM12 owner-flow) table in —
--     that data migration is a separate scripted step.
--
-- Idempotent: ADD COLUMN/CREATE INDEX use IF NOT EXISTS; the policy uses
-- DROP POLICY IF EXISTS + CREATE so reruns succeed.
--
-- Rollback:
--   DROP POLICY IF EXISTS "authenticated select catalogue" ON investment_listings;
--   DROP INDEX IF EXISTS idx_investment_listings_owner_user_id;
--   ALTER TABLE investment_listings DROP COLUMN IF EXISTS owner_user_id;
-- ============================================================================

BEGIN;

-- 1. Ownership column. Nullable so existing anonymous rows are unaffected;
--    ON DELETE SET NULL keeps a listing alive (and email-claimable) if the
--    owner's auth account is later deleted.
ALTER TABLE investment_listings
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Partial index for the owner-scoped portal lookups (WHERE owner_user_id = auth.uid()).
CREATE INDEX IF NOT EXISTS idx_investment_listings_owner_user_id
  ON investment_listings (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

-- 3. Authenticated SELECT policy. The catalogue is public (anon already has
--    USING true); this grants the same read to the authenticated role so
--    logged-in users can browse and owners can see their own pending rows.
--    Writes remain admin-only (no INSERT/UPDATE/DELETE policy for authenticated).
DROP POLICY IF EXISTS "authenticated select catalogue" ON investment_listings;
CREATE POLICY "authenticated select catalogue"
  ON investment_listings
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
