-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260831000000_ledger_refund_to_cash_clawback_kind.sql
--
-- Purpose:
--   Widen the advisor_credit_ledger.kind CHECK constraint to allow a new
--   'refund_to_cash_clawback' kind.
--
--   This kind is emitted by the charge.refunded webhook handler
--   (lib/stripe-webhook/handlers/charge-refunded.ts) when an advisor credit
--   TOPUP is refunded under refund_policy = "cash". The original top-up granted
--   spendable credit (a 'topup' ledger row), so a cash refund must record a
--   *negative* ledger entry that claws the granted credit back out — otherwise
--   the advisor keeps the credit AND gets the cash returned to their card
--   (revenue leak / double-pay). Tracking it as its own kind (rather than the
--   existing 'chargeback_clawback', which is reserved for dispute-driven
--   reversals) keeps refund vs chargeback accounting cleanly separable.
--
-- Idempotency: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT. Additive widening of
--   an existing CHECK; no row mutations. Re-running is safe.
--
-- Rollback strategy (forward-only in prod; documented for completeness):
--   No row uses 'refund_to_cash_clawback' until the webhook ships, so to revert
--   before any such row exists:
--     ALTER TABLE public.advisor_credit_ledger
--       DROP CONSTRAINT advisor_credit_ledger_kind_check;
--     ALTER TABLE public.advisor_credit_ledger
--       ADD CONSTRAINT advisor_credit_ledger_kind_check
--       CHECK (kind IN ('topup','refund_to_credit','lead_spend',
--         'lead_dispute_refund','tier_proration_credit','admin_adjustment',
--         'expiry','chargeback_clawback','referral_payout',
--         'success_bonus_award'));
--   If any 'refund_to_cash_clawback' rows already exist, they MUST be migrated
--   to another kind (e.g. 'admin_adjustment') BEFORE narrowing the constraint,
--   or the ADD CONSTRAINT will fail — and removing them would corrupt the
--   advisor's authoritative balance (SUM(amount_cents)). Do not narrow without
--   founder/ops sign-off.
--
-- RLS: no change. advisor_credit_ledger RLS + policies were established in
--   20260508130000_advisor_credit_ledger.sql; this migration only widens a
--   value CHECK and adds no new table/column.
--
-- Risk: low — single widened CHECK, no data movement.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.advisor_credit_ledger
  DROP CONSTRAINT IF EXISTS advisor_credit_ledger_kind_check;

ALTER TABLE public.advisor_credit_ledger
  ADD CONSTRAINT advisor_credit_ledger_kind_check
  CHECK (kind IN (
    'topup',
    'refund_to_credit',
    'lead_spend',
    'lead_dispute_refund',
    'tier_proration_credit',
    'admin_adjustment',
    'expiry',
    'chargeback_clawback',
    'refund_to_cash_clawback',
    'referral_payout',
    'success_bonus_award'
  ));
