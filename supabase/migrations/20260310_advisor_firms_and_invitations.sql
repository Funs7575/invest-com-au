-- ============================================================================
-- Migration: 20260310_advisor_firms_and_invitations.sql
-- Purpose: Add the firm-level account model — `advisor_firms` table
--          (slug, abn, acn, afsl_number, status CHECK, admin_professional_id
--          FK→professionals, max_seats), `advisor_firm_invitations` table
--          (firm_id FK→advisor_firms ON DELETE CASCADE, email, token UNIQUE,
--          role, status, expires_at), 4 indexes, RLS + 3 policies; add 3
--          columns to advisor_applications (account_type CHECK, abn,
--          firm_id FK), 3 columns to professionals (firm_id FK,
--          is_firm_admin, account_type CHECK), 1 conditional FK index on
--          professionals(firm_id); install update_updated_at trigger on
--          advisor_firms.
-- Rollback: DROP the trigger, DROP the index on professionals(firm_id),
--          ALTER TABLE professionals DROP COLUMN ... (3 cols), ALTER TABLE
--          advisor_applications DROP COLUMN ... (3 cols), DROP TABLE
--          advisor_firm_invitations CASCADE (token table — losing rows
--          invalidates pending invitation links), DROP TABLE advisor_firms
--          CASCADE (loses every firm record).
-- Risk: high — `advisor_firms` rows are operator-onboarded billing
--       entities; reverse loses the firm registry. `advisor_firm_invitations`
--       holds outstanding invite tokens — losing them invalidates pending
--       advisor invites. The dropped FK columns on professionals /
--       advisor_applications cascade-orphan firm membership data.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS advisor_firms (id, name, slug UNIQUE,
--      abn, acn, afsl_number, website, phone, email, logo_url, location_*,
--      bio, status CHECK ('active','inactive','pending','suspended'),
--      admin_professional_id FK→professionals, max_seats DEFAULT 10,
--      created_at, updated_at).
--   2. CREATE INDEX IF NOT EXISTS idx_advisor_firms_status, _slug.
--   3. ALTER TABLE advisor_firms ENABLE ROW LEVEL SECURITY.
--   4. CREATE POLICY "Public can read active firms" ON advisor_firms.
--   5. CREATE POLICY "Service role full access firms" ON advisor_firms.
--   6. CREATE TABLE IF NOT EXISTS advisor_firm_invitations (id, firm_id
--      FK→advisor_firms ON DELETE CASCADE, email, name, invited_by
--      FK→professionals, token UNIQUE, role DEFAULT 'member', status
--      CHECK ('pending','accepted','expired','revoked'), accepted_at,
--      expires_at DEFAULT (NOW() + INTERVAL '7 days'), created_at).
--   7. CREATE INDEX IF NOT EXISTS idx_firm_invitations_token, _firm.
--   8. ALTER TABLE advisor_firm_invitations ENABLE ROW LEVEL SECURITY.
--   9. CREATE POLICY "Service role full access invitations"
--      ON advisor_firm_invitations.
--  10. ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS
--      account_type TEXT DEFAULT 'individual' CHECK (...), abn TEXT,
--      firm_id INTEGER REFERENCES advisor_firms(id).
--  11. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS firm_id INTEGER
--      REFERENCES advisor_firms(id), is_firm_admin BOOLEAN DEFAULT false,
--      account_type TEXT DEFAULT 'individual' CHECK (...).
--  12. CREATE INDEX IF NOT EXISTS idx_professionals_firm
--      ON professionals(firm_id) WHERE firm_id IS NOT NULL.
--  13. CREATE TRIGGER update_advisor_firms_updated_at BEFORE UPDATE …
--      EXECUTE FUNCTION update_updated_at().
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): export advisor_firms + advisor_firm_invitations
--   -- (firm registry + outstanding invite tokens are not recoverable
--   -- from the migration body). Communicate to firm admins that pending
--   -- invitation links will become invalid.
--  13. DROP TRIGGER IF EXISTS update_advisor_firms_updated_at
--        ON advisor_firms;
--  12. DROP INDEX IF EXISTS idx_professionals_firm;
--  11. ALTER TABLE professionals
--        DROP COLUMN IF EXISTS account_type,
--        DROP COLUMN IF EXISTS is_firm_admin,
--        DROP COLUMN IF EXISTS firm_id;
--      -- App code reads professionals.firm_id / is_firm_admin — revert
--      -- ship-side first.
--  10. ALTER TABLE advisor_applications
--        DROP COLUMN IF EXISTS firm_id,
--        DROP COLUMN IF EXISTS abn,
--        DROP COLUMN IF EXISTS account_type;
--   9. DROP POLICY IF EXISTS "Service role full access invitations"
--        ON advisor_firm_invitations;
--   8. (RLS toggle drops with the table.)
--   7. DROP INDEX IF EXISTS idx_firm_invitations_firm;
--      DROP INDEX IF EXISTS idx_firm_invitations_token;
--   6. DROP TABLE IF EXISTS advisor_firm_invitations CASCADE;
--      -- DESTRUCTIVE: outstanding invite tokens invalidated.
--   5. DROP POLICY IF EXISTS "Service role full access firms"
--        ON advisor_firms;
--   4. DROP POLICY IF EXISTS "Public can read active firms" ON advisor_firms;
--   3. (RLS toggle drops with the table.)
--   2. DROP INDEX IF EXISTS idx_advisor_firms_slug;
--      DROP INDEX IF EXISTS idx_advisor_firms_status;
--   1. DROP TABLE IF EXISTS advisor_firms CASCADE;
--      -- DESTRUCTIVE: drops every firm registry row plus dependent
--      -- advisor_applications.firm_id / professionals.firm_id values
--      -- (already nulled in step 10/11; CASCADE noop here unless 10/11
--      -- skipped).
-- ============================================================================

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
