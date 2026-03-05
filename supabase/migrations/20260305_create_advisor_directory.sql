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
