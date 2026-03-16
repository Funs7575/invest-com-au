-- Migration: Create unified leads table
-- Used by /api/submit-lead for both advisor quiz and platform leads

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_type TEXT NOT NULL CHECK (lead_type IN ('advisor', 'platform')),
  professional_id INTEGER REFERENCES professionals(id),
  broker_id INTEGER REFERENCES brokers(id),
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  user_location_state TEXT,
  user_intent JSONB,
  revenue_value_cents INTEGER DEFAULT 0,
  source_page TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'sent', 'contacted', 'converted', 'lost', 'spam')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(user_email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
