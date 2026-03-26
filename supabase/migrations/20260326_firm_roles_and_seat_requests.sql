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
