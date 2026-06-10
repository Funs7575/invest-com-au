-- ============================================================================
-- Migration: Backfill public.wallet_transactions (A-03 batch 3)
-- Date:      2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §4.1 — table declared
--            in lib/database.types.ts but absent from the migration tree.
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03 batch 3
--             Also tracked as A-DISC-20260501-02 (surfaced iter 172).
--
-- Purpose
--   wallet_transactions is the immutable ledger of all broker wallet
--   movements (topups, spend, refunds). Financial audit trail — append-only
--   in practice.
--
-- Callers (verified 2026-05-01):
--   ADMIN (service-role): app/api/marketplace/wallet-topup/route.ts,
--     app/api/marketplace/webhook/route.ts (writes on Stripe events).
--   BROWSER CLIENT (authenticated, admin-protected routes):
--     app/admin/marketplace/page.tsx (SELECT),
--     app/admin/marketplace/reconciliation/page.tsx (SELECT),
--     app/admin/marketplace/intelligence/page.tsx (SELECT).
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before CREATE POLICY.
--
-- Rollback
--   ALTER TABLE public.wallet_transactions DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "service_role full access" ON public.wallet_transactions;
--   DROP POLICY IF EXISTS "authenticated read only" ON public.wallet_transactions;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id                         bigserial   NOT NULL,
  broker_slug                text        NOT NULL,
  type                       text        NOT NULL,
  amount_cents               integer     NOT NULL,
  balance_after_cents        integer     NOT NULL,
  description                text,
  reference_type             text,
  reference_id               text,
  stripe_payment_intent_id   text,
  created_by                 text,
  created_at                 timestamptz DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id)
);

-- Lookup pattern: all transactions for a broker (admin reconciliation).
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_broker_slug
  ON public.wallet_transactions (broker_slug, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.wallet_transactions;
CREATE POLICY "service_role full access"
  ON public.wallet_transactions
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated: SELECT only for admin reconciliation pages.
-- No auth.uid() linkage — middleware enforces admin-email gate.
-- TODO: human review of policy semantics — consider revoking if admin pages move to createAdminClient().
DROP POLICY IF EXISTS "authenticated read only" ON public.wallet_transactions;
CREATE POLICY "authenticated read only"
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
