-- ============================================================================
-- Migration: Backfill public.marketplace_invoices (A-03 batch 3)
-- Date:      2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §4.1 — table declared
--            in lib/database.types.ts but absent from the migration tree.
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03 batch 3
--
-- Purpose
--   marketplace_invoices stores Stripe-backed invoices for broker
--   marketplace spend: impression packages, wallet topups, etc. Contains
--   broker ABN / company name / email (PII-adjacent).
--
-- Callers (verified 2026-05-01):
--   ADMIN (service-role): app/api/marketplace/webhook/route.ts (INSERT + UPDATE
--     on Stripe payment events), app/api/marketplace/wallet-topup/route.ts.
--   BROWSER CLIENT (authenticated, admin-protected):
--     app/admin/marketplace/reconciliation/page.tsx (SELECT + INSERT).
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before CREATE POLICY.
--
-- Rollback
--   ALTER TABLE public.marketplace_invoices DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "service_role full access" ON public.marketplace_invoices;
--   DROP POLICY IF EXISTS "authenticated read only" ON public.marketplace_invoices;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_invoices (
  id                           bigserial   NOT NULL,
  broker_slug                  text        NOT NULL,
  type                         text        NOT NULL,
  amount_cents                 integer     NOT NULL,
  currency                     text        NOT NULL DEFAULT 'AUD',
  status                       text        NOT NULL DEFAULT 'pending',
  invoice_number               text,
  description                  text,
  line_items                   jsonb,
  subtotal_cents               integer,
  tax_cents                    integer,
  paid_at                      timestamptz,
  stripe_checkout_session_id   text,
  stripe_payment_intent_id     text,
  broker_email                 text,
  broker_company_name          text,
  broker_abn                   text,
  created_at                   timestamptz DEFAULT now(),
  CONSTRAINT marketplace_invoices_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_invoices_broker_slug
  ON public.marketplace_invoices (broker_slug, created_at DESC);

ALTER TABLE public.marketplace_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_invoices FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.marketplace_invoices;
CREATE POLICY "service_role full access"
  ON public.marketplace_invoices
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated: SELECT for admin reconciliation page (browser client).
-- TODO: human review of policy semantics — admin pages should ideally use createAdminClient().
DROP POLICY IF EXISTS "authenticated read only" ON public.marketplace_invoices;
CREATE POLICY "authenticated read only"
  ON public.marketplace_invoices
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
