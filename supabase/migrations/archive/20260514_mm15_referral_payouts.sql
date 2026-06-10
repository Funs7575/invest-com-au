-- ============================================================================
-- Migration: 20260514_mm15_referral_payouts.sql
-- Purpose: Wire credit transfers into the inter-team referral flow shipped in
--          PR #839 (mm09). When a referral is accepted, the receiving squad
--          pays the standard brief-accept credit cost AND the referring squad
--          earns a percentage payout (default 20%). Makes referrals a profit
--          center, not just a courtesy hand-off.
--
-- Changes:
--   1. Extend advisor_credit_ledger.kind CHECK to include 'referral_payout'
--      and 'success_bonus_award' (the second is reserved for the upcoming
--      outcome-based pricing tier).
--   2. Add accounting columns on team_brief_referrals so each accept is
--      auditable end-to-end.
--
-- Idempotency: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT; ADD COLUMN IF NOT
-- EXISTS. Safe to re-apply.
--
-- Rollback:
--   ALTER TABLE advisor_credit_ledger
--     DROP CONSTRAINT advisor_credit_ledger_kind_check;
--   ALTER TABLE advisor_credit_ledger
--     ADD CONSTRAINT advisor_credit_ledger_kind_check
--     CHECK (kind IN ('topup','refund_to_credit','lead_spend',
--                     'lead_dispute_refund','tier_proration_credit',
--                     'admin_adjustment','expiry','chargeback_clawback'));
--   ALTER TABLE team_brief_referrals
--     DROP COLUMN accept_credits_charged,
--     DROP COLUMN referrer_credits_awarded,
--     DROP COLUMN payout_recorded_at;
--
-- Risk: low — additive columns + widened CHECK; no row mutations.
-- ============================================================================

BEGIN;

-- ── 1. Widen the ledger kind CHECK ─────────────────────────────────────────
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
    'referral_payout',
    'success_bonus_award'
  ));

-- ── 2. Accounting columns on referrals ─────────────────────────────────────
ALTER TABLE public.team_brief_referrals
  ADD COLUMN IF NOT EXISTS accept_credits_charged  integer,
  ADD COLUMN IF NOT EXISTS referrer_credits_awarded integer,
  ADD COLUMN IF NOT EXISTS payout_recorded_at      timestamptz;

CREATE INDEX IF NOT EXISTS idx_team_brief_referrals_payout
  ON public.team_brief_referrals (payout_recorded_at)
  WHERE payout_recorded_at IS NOT NULL;

COMMIT;
