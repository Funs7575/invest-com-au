-- ============================================================================
-- Migration: 20260310_advisor_credit_balance.sql
-- Purpose: Add prepaid credit balance system for advisors:
--          three credit tracking columns on professionals + a new
--          advisor_credit_topups ledger table (RLS service-role-only).
-- Rollback: DROP advisor_credit_topups + drop the three new columns from
--           professionals.
-- Risk: medium — DROP TABLE on advisor_credit_topups discards any topup
--       history; reverse ALTER ... DROP COLUMN on populated tables loses
--       per-advisor balance data.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS credit_balance_cents.
--   2. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_credit_cents.
--   3. ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_lead_spend_cents.
--   4. CREATE TABLE IF NOT EXISTS public.advisor_credit_topups (...).
--   5. ALTER TABLE public.advisor_credit_topups ENABLE ROW LEVEL SECURITY.
--   6. CREATE POLICY "Service role only on advisor_credit_topups" ... USING (false).
--   7. CREATE INDEX idx_advisor_credit_topups_professional.
--
-- Rollback (in reverse order):
--   7. DROP INDEX IF EXISTS public.idx_advisor_credit_topups_professional;
--   6. DROP POLICY IF EXISTS "Service role only on advisor_credit_topups"
--        ON public.advisor_credit_topups;
--   5. ALTER TABLE public.advisor_credit_topups DISABLE ROW LEVEL SECURITY;
--   4. DROP TABLE IF EXISTS public.advisor_credit_topups;
--      -- DESTRUCTIVE: discards every topup ledger row.
--   3. ALTER TABLE professionals DROP COLUMN IF EXISTS lifetime_lead_spend_cents;
--   2. ALTER TABLE professionals DROP COLUMN IF EXISTS lifetime_credit_cents;
--   1. ALTER TABLE professionals DROP COLUMN IF EXISTS credit_balance_cents;
--      -- DESTRUCTIVE on populated rows: per-advisor balances are lost.
-- ============================================================================

-- Add prepaid credit balance system for advisors
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS credit_balance_cents integer NOT NULL DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_credit_cents integer NOT NULL DEFAULT 0;
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS lifetime_lead_spend_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.advisor_credit_topups (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  professional_id integer NOT NULL REFERENCES professionals(id),
  amount_cents integer NOT NULL,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_credit_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only on advisor_credit_topups" ON public.advisor_credit_topups FOR ALL USING (false);
CREATE INDEX idx_advisor_credit_topups_professional ON public.advisor_credit_topups(professional_id);
