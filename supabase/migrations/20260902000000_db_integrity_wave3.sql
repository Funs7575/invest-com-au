-- ============================================================================
-- Migration: 20260902000000_db_integrity_wave3.sql
-- Description: DB integrity hardening — Wave 3
--
-- Three targeted fixes identified in the Wave 3 audit:
--   1. advisor_kyc_documents — add missing FK on professional_id so orphan
--      rows are prevented and CASCADE DELETE is enforced consistently with
--      every other table that references professionals(id).
--   2. professional_leads.lead_value — backfill NULLs to 0, then enforce
--      NOT NULL + CHECK >= 0 so revenue ledger rows can never hide a null
--      charge that billing code silently skips.
--   3. agent_analytics.estimated_cost_usd — FLOAT → NUMERIC(12,6) to avoid
--      IEEE 754 rounding errors in cost aggregations and reports.
--
-- All three operations are idempotent; safe to re-run.
-- No data is destroyed; backfill is non-destructive (NULL→0).
--
-- Rollback (in reverse order):
--   3. ALTER TABLE public.agent_analytics
--        ALTER COLUMN estimated_cost_usd TYPE FLOAT
--        USING estimated_cost_usd::FLOAT;
--   2. ALTER TABLE public.professional_leads
--        DROP CONSTRAINT IF EXISTS professional_leads_lead_value_non_negative;
--      ALTER TABLE public.professional_leads
--        ALTER COLUMN lead_value DROP NOT NULL;
--      ALTER TABLE public.professional_leads
--        ALTER COLUMN lead_value DROP DEFAULT;
--   1. ALTER TABLE public.advisor_kyc_documents
--        DROP CONSTRAINT IF EXISTS advisor_kyc_documents_professional_id_fkey;
--
-- IMPORTANT: Do NOT apply this migration autonomously to the production
-- Supabase project. Route through the founder + Supabase dashboard review
-- gate per the Wave 3 migration policy.
-- ============================================================================

-- ── 1. advisor_kyc_documents — add FK to professionals ───────────────────────
-- The table was created with professional_id INTEGER NOT NULL but no REFERENCES
-- clause, leaving it orphan-safe only by application logic. Every other table
-- referencing professionals(id) uses ON DELETE CASCADE; align this one.

ALTER TABLE public.advisor_kyc_documents
  DROP CONSTRAINT IF EXISTS advisor_kyc_documents_professional_id_fkey;

ALTER TABLE public.advisor_kyc_documents
  ADD CONSTRAINT advisor_kyc_documents_professional_id_fkey
  FOREIGN KEY (professional_id)
  REFERENCES public.professionals(id)
  ON DELETE CASCADE;

-- ── 2. professional_leads.lead_value — backfill + NOT NULL + CHECK ────────────
-- lead_value is NUMERIC(8,2) but nullable. Null rows cause silent skips in
-- billing code that uses SUM(lead_value) or checks `if (lead_value > 0)`.
-- Backfill existing NULLs to 0 before setting NOT NULL.

UPDATE public.professional_leads
  SET lead_value = 0
  WHERE lead_value IS NULL;

ALTER TABLE public.professional_leads
  ALTER COLUMN lead_value SET DEFAULT 0,
  ALTER COLUMN lead_value SET NOT NULL;

ALTER TABLE public.professional_leads
  DROP CONSTRAINT IF EXISTS professional_leads_lead_value_non_negative;

ALTER TABLE public.professional_leads
  ADD CONSTRAINT professional_leads_lead_value_non_negative
  CHECK (lead_value >= 0);

-- ── 3. agent_analytics.estimated_cost_usd — FLOAT → NUMERIC(12,6) ────────────
-- FLOAT uses IEEE 754 binary representation; cost aggregations across thousands
-- of agent runs accumulate rounding errors. NUMERIC(12,6) gives exact decimal
-- arithmetic up to $999,999.999999.

ALTER TABLE public.agent_analytics
  ALTER COLUMN estimated_cost_usd
  TYPE NUMERIC(12,6)
  USING estimated_cost_usd::NUMERIC(12,6);
