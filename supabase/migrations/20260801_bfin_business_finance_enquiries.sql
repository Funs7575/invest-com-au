-- Migration: backfill CREATE TABLE for business_finance_enquiries
--
-- Table was created directly in the Supabase dashboard (no prior migration).
-- This migration backfills the CREATE TABLE so the database types drift gate
-- passes and fresh environments can be built from migrations alone.
--
-- Rollback: DROP TABLE public.business_finance_enquiries;
-- Risk: low — production table already exists; IF NOT EXISTS makes this safe to re-run.

CREATE TABLE IF NOT EXISTS public.business_finance_enquiries (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at               timestamptz   NOT NULL DEFAULT now(),
  email                    text          NOT NULL,
  contact_name             text          NOT NULL,
  business_name            text          NOT NULL,
  phone                    text,
  finance_type             text          NOT NULL,
  loan_amount_cents        bigint,
  annual_revenue_cents     bigint,
  time_in_business_months  integer,
  message                  text,
  purpose                  text,
  status                   text          NOT NULL DEFAULT 'new'
);

COMMENT ON TABLE public.business_finance_enquiries IS
  'SMB finance lead capture from /business-finance vertical. Writers: /api/business-finance/enquiry POST (anon policy) + admin service role. Readers: service role (admin dashboard, BD team).';

ALTER TABLE public.business_finance_enquiries ENABLE ROW LEVEL SECURITY;

-- Anonymous users can submit enquiries; authenticated users can too.
CREATE POLICY IF NOT EXISTS "anon_insert_business_finance_enquiries"
  ON public.business_finance_enquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role reads/modifies rows (admin dashboard, BD team).
-- No SELECT policy for anon or authenticated roles by design.
