-- Migration: business_finance_enquiries table.
--
-- Captures SMB finance lead enquiries from /business-finance (Revenue #5
-- vertical). The table is service-role-owned; the API route uses a server
-- Supabase client + the anon INSERT policy to write new rows without
-- bypassing RLS.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.business_finance_enquiries;

BEGIN;

CREATE TABLE IF NOT EXISTS public.business_finance_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  finance_type text NOT NULL,
  loan_amount_cents bigint,
  purpose text,
  time_in_business_months integer,
  annual_revenue_cents bigint,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bfe_finance_type_check CHECK (
    finance_type IN ('business_loan','equipment_finance','invoice_finance','line_of_credit','trade_finance','other')
  ),
  CONSTRAINT bfe_status_check CHECK (
    status IN ('new','contacted','qualified','lost')
  )
);

CREATE INDEX IF NOT EXISTS idx_bfe_status
  ON public.business_finance_enquiries (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bfe_email
  ON public.business_finance_enquiries (lower(email));

ALTER TABLE public.business_finance_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages business_finance_enquiries"
  ON public.business_finance_enquiries;
CREATE POLICY "Service role manages business_finance_enquiries"
  ON public.business_finance_enquiries
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Anon can INSERT only — status must be 'new', amount guard, no SELECT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Anon can submit business_finance_enquiries"
  ON public.business_finance_enquiries;
CREATE POLICY "Anon can submit business_finance_enquiries"
  ON public.business_finance_enquiries
  AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (
    status = 'new'
    AND (loan_amount_cents IS NULL OR loan_amount_cents BETWEEN 0 AND 50000000000)
  );

COMMENT ON TABLE public.business_finance_enquiries IS
  'SMB finance lead capture from /business-finance vertical. '
  'Writers: /api/business-finance/enquiry POST (anon policy) + admin service role. '
  'Readers: service role (admin dashboard, BD team).';

COMMIT;
