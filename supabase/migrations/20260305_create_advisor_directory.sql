-- ============================================================================
-- Migration: 20260305_create_advisor_directory.sql
-- Purpose: Create the advisor directory foundation — `professionals` core
--          advisor-profile table (5 indexes, 2 policies), `professional_leads`
--          enquiry table (3 indexes, 2 policies, FK to professionals), enable
--          RLS on both, install the shared `update_updated_at()` trigger
--          function and bind it to both tables.
-- Rollback: DROP both tables CASCADE (every advisor profile + every enquiry
--          row is destroyed); DROP the 4 RLS policies (drop with tables);
--          DROP the 2 triggers (drop with tables); DROP the shared
--          `update_updated_at()` function only if no other table relies
--          on it (downstream migrations REUSE this function — DO NOT
--          DROP it during partial revert).
-- Risk: high — `professionals` is the source of truth for the advisor
--       directory and is FK'd by ~15 downstream tables (advisor_articles,
--       advisor_bookings, advisor_applications, professional_reviews,
--       advisor_firm_invitations, advisor_credit_balance, …). CASCADE
--       collapses all of them. `professional_leads` rows represent
--       paying-billed lead enquiries (lead_value, billed flag) — losing
--       them loses revenue ledger data.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS professionals (id, slug, name, type
--      CHECK (6 enum values), specialties jsonb, location_*, afsl_number,
--      acn, abn, registration_number, bio, photo_url, website, phone,
--      email, fee_structure, fee_description, rating, review_count,
--      verified, status CHECK ('active','inactive','pending'),
--      onboarded_at, created_at, updated_at).
--   2. CREATE INDEX IF NOT EXISTS idx_professionals_type,
--      _state, _status, _slug, _type_state.
--   3. CREATE TABLE IF NOT EXISTS professional_leads (id,
--      professional_id FK→professionals, user_name, user_email,
--      user_phone, message, source_page, utm_*, status CHECK
--      ('new','sent','contacted','converted','lost','spam'),
--      lead_value, billed, created_at, updated_at).
--   4. CREATE INDEX IF NOT EXISTS idx_leads_professional, _status, _created.
--   5. ALTER TABLE professionals / professional_leads ENABLE ROW LEVEL SECURITY.
--   6. CREATE POLICY "Public can view active professionals" ON professionals.
--   7. CREATE POLICY "Anyone can submit leads" ON professional_leads.
--   8. CREATE POLICY "Admins full access professionals" ON professionals.
--   9. CREATE POLICY "Admins full access leads" ON professional_leads.
--  10. CREATE OR REPLACE FUNCTION update_updated_at() — shared trigger fn
--      that downstream migrations also reuse.
--  11. CREATE TRIGGER professionals_updated_at BEFORE UPDATE … EXECUTE
--      FUNCTION update_updated_at().
--  12. CREATE TRIGGER professional_leads_updated_at BEFORE UPDATE … EXECUTE
--      FUNCTION update_updated_at().
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): snapshot professionals + professional_leads
--   -- (lead_value + billed columns are revenue ledger data). Verify no
--   -- downstream migrations depend on update_updated_at() before dropping.
--  12. DROP TRIGGER IF EXISTS professional_leads_updated_at
--        ON professional_leads;
--  11. DROP TRIGGER IF EXISTS professionals_updated_at ON professionals;
--  10. -- DO NOT DROP update_updated_at() — many downstream tables
--      -- (advisor_firms, advisor_articles, advisor_bookings, …) reuse
--      -- this trigger function. Only drop on a full schema teardown.
--      -- Full-teardown step: DROP FUNCTION IF EXISTS update_updated_at();
--   9. DROP POLICY IF EXISTS "Admins full access leads" ON professional_leads;
--   8. DROP POLICY IF EXISTS "Admins full access professionals"
--        ON professionals;
--   7. DROP POLICY IF EXISTS "Anyone can submit leads" ON professional_leads;
--   6. DROP POLICY IF EXISTS "Public can view active professionals"
--        ON professionals;
--   5. (RLS toggles drop with the tables.)
--   4. DROP INDEX IF EXISTS idx_leads_created;
--      DROP INDEX IF EXISTS idx_leads_status;
--      DROP INDEX IF EXISTS idx_leads_professional;
--   3. DROP TABLE IF EXISTS professional_leads CASCADE;
--      -- DESTRUCTIVE: drops billed-lead history (revenue ledger).
--   2. DROP INDEX IF EXISTS idx_professionals_type_state;
--      DROP INDEX IF EXISTS idx_professionals_slug;
--      DROP INDEX IF EXISTS idx_professionals_status;
--      DROP INDEX IF EXISTS idx_professionals_state;
--      DROP INDEX IF EXISTS idx_professionals_type;
--   1. DROP TABLE IF EXISTS professionals CASCADE;
--      -- DESTRUCTIVE: collapses the entire advisor directory and ~15
--      -- downstream advisor_* tables via FK CASCADE.
-- ============================================================================

-- Migration: Create advisor directory tables
-- Run in Supabase Dashboard > SQL Editor

-- ═══════════════════════════════════════════════
-- Table: professionals (core advisor profiles)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS professionals (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  firm_name TEXT,
  
  -- Type & classification
  type TEXT NOT NULL CHECK (type IN ('smsf_accountant', 'financial_planner', 'property_advisor', 'tax_agent', 'mortgage_broker', 'estate_planner')),
  specialties JSONB DEFAULT '[]'::jsonb,
  
  -- Location
  location_state TEXT,
  location_suburb TEXT,
  location_display TEXT, -- e.g. "Sydney CBD, NSW"
  
  -- Credentials & compliance
  afsl_number TEXT,
  acn TEXT,
  abn TEXT,
  registration_number TEXT, -- for tax agents (TAN), etc.
  
  -- Profile content
  bio TEXT,
  photo_url TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  
  -- Fees
  fee_structure TEXT, -- e.g. "fee-for-service", "commission", "percentage"
  fee_description TEXT, -- e.g. "From $2,200/yr", "SOA from $3,300"
  
  -- Ratings & reviews
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- Status
  verified BOOLEAN DEFAULT FALSE, -- admin has verified identity
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  
  -- Metadata
  onboarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_professionals_type ON professionals(type);
CREATE INDEX IF NOT EXISTS idx_professionals_state ON professionals(location_state);
CREATE INDEX IF NOT EXISTS idx_professionals_status ON professionals(status);
CREATE INDEX IF NOT EXISTS idx_professionals_slug ON professionals(slug);
CREATE INDEX IF NOT EXISTS idx_professionals_type_state ON professionals(type, location_state);

-- ═══════════════════════════════════════════════
-- Table: professional_leads (enquiry/consultation requests)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS professional_leads (
  id SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES professionals(id),
  
  -- User details
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_phone TEXT,
  message TEXT,
  
  -- Tracking
  source_page TEXT, -- e.g. "/advisor/sarah-chen", "/advisors/smsf-accountants"
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Lead management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'sent', 'contacted', 'converted', 'lost', 'spam')),
  lead_value NUMERIC(8,2), -- charge amount for this lead
  billed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_professional ON professional_leads(professional_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON professional_leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON professional_leads(created_at DESC);

-- ═══════════════════════════════════════════════
-- Enable RLS
-- ═══════════════════════════════════════════════
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_leads ENABLE ROW LEVEL SECURITY;

-- Public read access for active professionals
CREATE POLICY "Public can view active professionals" ON professionals
  FOR SELECT USING (status = 'active');

-- Only authenticated users can insert leads (or anon with API key)
CREATE POLICY "Anyone can submit leads" ON professional_leads
  FOR INSERT WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins full access professionals" ON professionals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin')
  );

CREATE POLICY "Admins full access leads" ON professional_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin')
  );

-- ═══════════════════════════════════════════════
-- Updated_at trigger
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER professional_leads_updated_at
  BEFORE UPDATE ON professional_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verify
SELECT 'professionals table created' AS status;
SELECT 'professional_leads table created' AS status;
