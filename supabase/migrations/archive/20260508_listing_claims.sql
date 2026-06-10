-- ============================================================================
-- Migration: 20260508_listing_claims.sql
-- Purpose: Create `listing_claims` — captures "claim this listing"
--          requests from broker and advisor profile pages. Admin reviews
--          the claim and confirms identity / credentials before
--          transferring ownership.
-- Rollback: DROP both indexes, then DROP the listing_claims table.
-- Risk: high — DROP TABLE discards in-flight claim requests, which are
--       directly tied to ownership transfer (operationally sensitive
--       and may have legal implications). Snapshot before any reverse
--       migration. NOTE: 20260601_rls_listing_claims.sql later adds RLS
--       to this table; rolling THIS migration back without first
--       rolling back the 20260601 RLS migration will leave dangling
--       policies on a non-existent table.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.listing_claims
--        (id SERIAL PK, claim_type, target_slug, full_name, email,
--         company_role, phone, message, status DEFAULT 'pending',
--         admin_notes, created_at) with two CHECK constraints
--        (claim_type IN ('broker','advisor','listing'); status IN
--         ('pending','approved','rejected')).
--   2. CREATE INDEX IF NOT EXISTS idx_listing_claims_target
--        ON public.listing_claims (claim_type, target_slug).
--   3. CREATE INDEX IF NOT EXISTS idx_listing_claims_status
--        ON public.listing_claims (status, created_at DESC).
--
-- Rollback (in reverse order):
--   3. DROP INDEX IF EXISTS public.idx_listing_claims_status;
--   2. DROP INDEX IF EXISTS public.idx_listing_claims_target;
--   1. DROP TABLE IF EXISTS public.listing_claims;
--      -- DESTRUCTIVE: discards every captured claim. Roll back the
--      -- later 20260601_rls_listing_claims migration first.
-- ============================================================================

-- ============================================================
-- listing_claims — capture "claim this listing" requests from
-- broker and advisor profile pages. Admin reviews the claim
-- and confirms the claimant's identity / credentials before
-- transferring ownership.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listing_claims (
  id           SERIAL PRIMARY KEY,
  claim_type   TEXT NOT NULL CHECK (claim_type IN ('broker', 'advisor', 'listing')),
  target_slug  TEXT NOT NULL,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  company_role TEXT,
  phone        TEXT,
  message      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_claims_target
  ON public.listing_claims (claim_type, target_slug);
CREATE INDEX IF NOT EXISTS idx_listing_claims_status
  ON public.listing_claims (status, created_at DESC);
