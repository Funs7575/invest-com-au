-- ============================================================================
-- Migration: 20260310_agreement_acceptance_tracking.sql
-- Purpose: Create agreement_acceptances ledger table (RLS service-role-only)
--          plus three professionals columns (terms_accepted_at,
--          terms_version, content_license_accepted_at) and two brokers
--          columns (advertising_terms_accepted_at, advertising_terms_version)
--          so legal-agreement consent can be audited.
-- Rollback: DROP TABLE agreement_acceptances; reverse the column ADDs on
--          professionals and brokers.
-- Risk: high — reverse drops legal acceptance evidence (timestamps + IPs +
--       user-agents). Required for compliance audit trail; restore from
--       backup before reverting in prod.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.agreement_acceptances (...).
--   2. ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY.
--   3. CREATE POLICY "Service role only on agreement_acceptances"
--        ... USING (false).
--   4. CREATE INDEX idx_agreement_acceptances_professional,
--      idx_agreement_acceptances_broker, idx_agreement_acceptances_type.
--   5. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS terms_accepted_at,
--      terms_version, content_license_accepted_at.
--   6. ALTER TABLE brokers ADD COLUMN IF NOT EXISTS
--      advertising_terms_accepted_at, advertising_terms_version.
--
-- Rollback (in reverse order):
--   6. ALTER TABLE brokers DROP COLUMN IF EXISTS advertising_terms_version;
--      ALTER TABLE brokers DROP COLUMN IF EXISTS advertising_terms_accepted_at;
--   5. ALTER TABLE professionals DROP COLUMN IF EXISTS content_license_accepted_at;
--      ALTER TABLE professionals DROP COLUMN IF EXISTS terms_version;
--      ALTER TABLE professionals DROP COLUMN IF EXISTS terms_accepted_at;
--   4. DROP INDEX IF EXISTS public.idx_agreement_acceptances_type;
--      DROP INDEX IF EXISTS public.idx_agreement_acceptances_broker;
--      DROP INDEX IF EXISTS public.idx_agreement_acceptances_professional;
--   3. DROP POLICY IF EXISTS "Service role only on agreement_acceptances"
--        ON public.agreement_acceptances;
--   2. ALTER TABLE public.agreement_acceptances DISABLE ROW LEVEL SECURITY;
--   1. DROP TABLE IF EXISTS public.agreement_acceptances;
--      -- DESTRUCTIVE: full legal-acceptance audit log discarded.
-- ============================================================================

-- Track acceptance of legal agreements
CREATE TABLE IF NOT EXISTS public.agreement_acceptances (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_type text NOT NULL CHECK (user_type IN ('visitor', 'advisor', 'broker', 'admin')),
  agreement_type text NOT NULL CHECK (agreement_type IN ('terms_of_use', 'privacy_policy', 'advisor_services', 'broker_advertising', 'content_license', 'cookie_consent')),
  agreement_version text NOT NULL DEFAULT '1.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  professional_id integer REFERENCES professionals(id),
  broker_id integer REFERENCES brokers(id),
  email text,
  accepted_by_name text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on agreement_acceptances" ON public.agreement_acceptances FOR ALL USING (false);

CREATE INDEX idx_agreement_acceptances_professional ON public.agreement_acceptances(professional_id) WHERE professional_id IS NOT NULL;
CREATE INDEX idx_agreement_acceptances_broker ON public.agreement_acceptances(broker_id) WHERE broker_id IS NOT NULL;
CREATE INDEX idx_agreement_acceptances_type ON public.agreement_acceptances(agreement_type);

ALTER TABLE professionals ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS terms_version text;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS content_license_accepted_at timestamptz;

ALTER TABLE brokers ADD COLUMN IF NOT EXISTS advertising_terms_accepted_at timestamptz;
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS advertising_terms_version text;
