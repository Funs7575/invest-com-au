-- ============================================================================
-- Migration: 20260316_create_leads_table.sql
-- Purpose: Create unified `leads` table used by /api/submit-lead for both
--          advisor-quiz leads and platform-affiliate leads.
-- Rollback: DROP the four indexes, then DROP the leads table.
-- Risk: high — DROP TABLE permanently discards every captured lead row,
--       which is the revenue-bearing payload of the entire quiz funnel.
--       Operators MUST snapshot `leads` to cold storage before any
--       reverse migration.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS leads (id, lead_type, professional_id,
--      broker_id, user_email, user_name, user_phone, user_location_state,
--      user_intent, revenue_value_cents, source_page, utm_*, status,
--      created_at, updated_at) with two CHECK constraints
--      (lead_type IN ('advisor','platform'); status IN ('new','sent',
--      'contacted','converted','lost','spam')).
--   2. CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(lead_type).
--   3. CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(user_email).
--   4. CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status).
--   5. CREATE INDEX IF NOT EXISTS idx_leads_created
--                                  ON leads(created_at DESC).
--
-- Rollback (in reverse order):
--   5. DROP INDEX IF EXISTS public.idx_leads_created;
--   4. DROP INDEX IF EXISTS public.idx_leads_status;
--   3. DROP INDEX IF EXISTS public.idx_leads_email;
--   2. DROP INDEX IF EXISTS public.idx_leads_type;
--   1. DROP TABLE IF EXISTS public.leads;
--      -- DESTRUCTIVE: discards every captured lead. Snapshot first.
-- ============================================================================

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
