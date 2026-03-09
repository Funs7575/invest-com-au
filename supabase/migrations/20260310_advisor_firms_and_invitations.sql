-- Migration: Advisor Firms & Invitations
-- Adds firm accounts, team invitations, and links professionals to firms

-- 1. Create advisor_firms table
CREATE TABLE IF NOT EXISTS advisor_firms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  abn TEXT,
  acn TEXT,
  afsl_number TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  location_state TEXT,
  location_suburb TEXT,
  location_display TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','inactive','pending','suspended')),
  admin_professional_id INTEGER REFERENCES professionals(id),
  max_seats INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_advisor_firms_status ON advisor_firms(status);
CREATE INDEX IF NOT EXISTS idx_advisor_firms_slug ON advisor_firms(slug);
ALTER TABLE advisor_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active firms" ON advisor_firms FOR SELECT USING (status = 'active');
CREATE POLICY "Service role full access firms" ON advisor_firms FOR ALL USING (auth.role() = 'service_role');

-- 2. Create advisor_firm_invitations table
CREATE TABLE IF NOT EXISTS advisor_firm_invitations (
  id SERIAL PRIMARY KEY,
  firm_id INTEGER NOT NULL REFERENCES advisor_firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  invited_by INTEGER NOT NULL REFERENCES professionals(id),
  token TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_token ON advisor_firm_invitations(token);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_firm ON advisor_firm_invitations(firm_id);
ALTER TABLE advisor_firm_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access invitations" ON advisor_firm_invitations FOR ALL USING (auth.role() = 'service_role');

-- 3. Add columns to advisor_applications
ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'firm'));
ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS abn TEXT;
ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS firm_id INTEGER REFERENCES advisor_firms(id);

-- 4. Add columns to professionals
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS firm_id INTEGER REFERENCES advisor_firms(id);
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS is_firm_admin BOOLEAN DEFAULT false;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'firm_member'));
CREATE INDEX IF NOT EXISTS idx_professionals_firm ON professionals(firm_id) WHERE firm_id IS NOT NULL;

-- 5. Add updated_at trigger to advisor_firms (reuse existing function)
CREATE TRIGGER update_advisor_firms_updated_at BEFORE UPDATE ON advisor_firms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
