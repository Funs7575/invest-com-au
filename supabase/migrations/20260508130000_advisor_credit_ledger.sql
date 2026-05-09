-- ============================================================================
-- Migration: 20260508130000_advisor_credit_ledger.sql
-- Purpose: Introduce `advisor_credit_ledger` as the single source of truth
--          for every advisor credit-balance mutation (top-up, refund-to-
--          credit, lead spend, dispute refund, tier proration, admin
--          adjustment, expiry, chargeback clawback). The
--          `professionals.credit_balance_cents` column becomes a
--          denormalised cache; SUM(amount_cents) over the ledger is the
--          authoritative balance.
-- Rollback: DROP TABLE IF EXISTS public.advisor_credit_ledger;
--           (DESTRUCTIVE — discards every ledger row. The
--           professionals.credit_balance_cents cache is unaffected; any
--           future re-introduction of the ledger should re-run the
--           backfill block at the bottom of this migration.)
-- Risk: medium — additive table + idempotent backfill, no foreign-key
--       cascades, no consumers depend on it before PR-B1 lands.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.advisor_credit_ledger.
--   2. CREATE UNIQUE INDEX uq_credit_ledger_kind_ref (idempotency).
--   3. CREATE INDEX idx_credit_ledger_pro_created (advisor reads).
--   4. CREATE INDEX idx_credit_ledger_expiring (cron sweep).
--   5. ENABLE + FORCE RLS, advisor-reads-own + service-role-full policies.
--   6. Backfill from advisor_credit_topups WHERE status = 'completed'.
--
-- Rollback (destructive):
--   - DROP TABLE IF EXISTS public.advisor_credit_ledger;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_credit_ledger (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  professional_id      integer NOT NULL REFERENCES public.professionals(id),
  amount_cents         integer NOT NULL,            -- signed: positive = credit, negative = spend
  balance_after_cents  integer NOT NULL,            -- snapshot for auditability
  kind                 text    NOT NULL CHECK (kind IN (
    'topup',
    'refund_to_credit',
    'lead_spend',
    'lead_dispute_refund',
    'tier_proration_credit',
    'admin_adjustment',
    'expiry',
    'chargeback_clawback'
  )),
  reference_type       text,                        -- e.g. 'stripe_charge', 'professional_lead', 'advisor_credit_topup'
  reference_id         text,                        -- foreign id as text so we can hold UUIDs / Stripe ids / numerics
  description          text NOT NULL,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at           timestamptz,                 -- top-up credits: now() + 24 months; refund/proration: NULL
  created_by           text,                        -- 'webhook' | 'advisor' | 'admin:<email>' | 'cron:expiry' | 'migration'
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Idempotency guard: a (kind, reference_type, reference_id) triple can land
-- at most once. Used by the Stripe webhook to be safe under replay and by
-- the dispute resolver to guard against double-refund.
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_kind_ref
  ON public.advisor_credit_ledger (kind, reference_type, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_pro_created
  ON public.advisor_credit_ledger (professional_id, created_at DESC);

-- Partial index for the daily expiry sweep — only rows that can expire.
CREATE INDEX IF NOT EXISTS idx_credit_ledger_expiring
  ON public.advisor_credit_ledger (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.advisor_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_credit_ledger FORCE ROW LEVEL SECURITY;

-- Advisor reads own ledger (joining via professionals.auth_user_id).
DROP POLICY IF EXISTS "Advisors read own ledger" ON public.advisor_credit_ledger;
CREATE POLICY "Advisors read own ledger"
  ON public.advisor_credit_ledger FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Service role does everything (webhooks, helpers, cron).
DROP POLICY IF EXISTS "Service role full access to credit ledger" ON public.advisor_credit_ledger;
CREATE POLICY "Service role full access to credit ledger"
  ON public.advisor_credit_ledger FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────────────────────
-- Backfill: synthesise topup rows from completed advisor_credit_topups so
-- that SUM(amount_cents) over the ledger ≈ professionals.credit_balance_cents.
-- balance_after_cents is approximate (per-row), since reconstructing the
-- exact running balance from purely-additive topup history would require
-- joining lead-spend events that aren't in the ledger yet. The /scripts/
-- reconcile-credit-ledger script can recompute exact running balances
-- post-deploy if historical accuracy is needed.
-- ──────────────────────────────────────────────────────────────────────────

INSERT INTO public.advisor_credit_ledger
  (professional_id, amount_cents, balance_after_cents, kind, reference_type,
   reference_id, description, created_by, created_at)
SELECT
  t.professional_id,
  t.amount_cents,
  t.amount_cents AS balance_after_cents,
  'topup'        AS kind,
  'advisor_credit_topup' AS reference_type,
  t.id::text     AS reference_id,
  'Backfill from advisor_credit_topups' AS description,
  'migration'    AS created_by,
  t.created_at
FROM public.advisor_credit_topups t
WHERE t.status = 'completed'
ON CONFLICT (kind, reference_type, reference_id) DO NOTHING;

COMMIT;
