-- ============================================================================
-- Migration: 20260326_firm_roles_and_seat_requests.sql
-- Purpose: Add a role column to professionals (owner/manager/member),
--          backfill it from is_firm_admin, create the firm_seat_requests
--          table (RLS service-role-only) for seat-upgrade requests, and
--          add three supporting indexes.
-- Rollback: DROP firm_seat_requests, drop indexes, drop the role column.
--          UPDATE-driven backfill cannot be reconstructed without the
--          pre-existing is_firm_admin distinction (preserved).
-- Risk: medium — reverse DROP TABLE discards any pending or historical
--       seat-upgrade requests; reverse DROP COLUMN role loses any later
--       owner/manager/member assignments not derivable from is_firm_admin.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS role TEXT
--      DEFAULT 'member' CHECK (role IN ('owner','manager','member')).
--   2. UPDATE professionals SET role = 'owner'  WHERE is_firm_admin = true
--        AND firm_id IS NOT NULL.
--      UPDATE professionals SET role = 'member' WHERE firm_id IS NOT NULL
--        AND is_firm_admin = false.
--   3. CREATE INDEX idx_professionals_role.
--   4. CREATE TABLE IF NOT EXISTS firm_seat_requests (...).
--   5. CREATE INDEX idx_seat_requests_firm, idx_seat_requests_status.
--   6. ALTER TABLE firm_seat_requests ENABLE ROW LEVEL SECURITY.
--   7. CREATE POLICY "Service role full access seat_requests" ... USING
--      (auth.role() = 'service_role').
--   8. CREATE INDEX idx_firm_invitations_email.
--
-- Rollback (in reverse order):
--   8. DROP INDEX IF EXISTS public.idx_firm_invitations_email;
--   7. DROP POLICY IF EXISTS "Service role full access seat_requests"
--        ON firm_seat_requests;
--   6. ALTER TABLE firm_seat_requests DISABLE ROW LEVEL SECURITY;
--   5. DROP INDEX IF EXISTS public.idx_seat_requests_status;
--      DROP INDEX IF EXISTS public.idx_seat_requests_firm;
--   4. DROP TABLE IF EXISTS public.firm_seat_requests;
--      -- DESTRUCTIVE: pending and reviewed seat requests discarded.
--   3. DROP INDEX IF EXISTS public.idx_professionals_role;
--   2. (No reverse — backfill is recomputable from is_firm_admin; the
--      pre-state is "no role column".)
--   1. ALTER TABLE professionals DROP COLUMN IF EXISTS role;
--      -- DESTRUCTIVE on populated rows: any post-migration role
--      -- promotions / demotions are lost.
-- ============================================================================

-- Migration: Firm roles and seat upgrade requests
-- Adds role column to professionals and a seat upgrade request table

-- 1. Add role column to professionals (owner/manager/member)
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'
  CHECK (role IN ('owner', 'manager', 'member'));

-- Set existing firm admins to owner role
UPDATE professionals SET role = 'owner' WHERE is_firm_admin = true AND firm_id IS NOT NULL;
UPDATE professionals SET role = 'member' WHERE firm_id IS NOT NULL AND is_firm_admin = false;

CREATE INDEX IF NOT EXISTS idx_professionals_role ON professionals(role) WHERE firm_id IS NOT NULL;

-- 2. Create firm_seat_requests table for seat upgrade requests
CREATE TABLE IF NOT EXISTS firm_seat_requests (
  id SERIAL PRIMARY KEY,
  firm_id INTEGER NOT NULL REFERENCES advisor_firms(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES professionals(id),
  current_seats INTEGER NOT NULL,
  requested_seats INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_seat_requests_firm ON firm_seat_requests(firm_id);
CREATE INDEX IF NOT EXISTS idx_seat_requests_status ON firm_seat_requests(status);
ALTER TABLE firm_seat_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access seat_requests" ON firm_seat_requests FOR ALL USING (auth.role() = 'service_role');

-- 3. Add firm_id lookup index to advisor_firm_invitations for the invite token lookup
CREATE INDEX IF NOT EXISTS idx_firm_invitations_email ON advisor_firm_invitations(email);
