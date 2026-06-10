-- ============================================================================
-- Migration: 20260604060000_apply_credit_ledger_balance_rpc.sql
-- Purpose: Provide an ATOMIC balance-mutation RPC for the advisor credit
--          ledger so the cached `professionals.credit_balance_cents`
--          (plus the lifetime_* roll-ups) can never drift under concurrent
--          writes. Replaces the read-modify-write + optimistic-lock loop in
--          `lib/advisor-credit-ledger.ts::recordLedgerEntry`, which had a
--          no-op retry predicate AND no 0-row-update detection (a 0-row
--          PostgREST UPDATE returns no error, so a lost cache write was
--          silently treated as success — balance drift, no error surfaced).
--
--          The RPC performs the increment in a single statement under a row
--          lock (FOR UPDATE), so two concurrent top-up / lead-spend writers
--          to the same advisor can no longer lose an update. It also enforces
--          a NEGATIVE-BALANCE GUARD (mirroring lib/marketplace/wallet.ts
--          `adjustWallet`): when `p_allow_negative` is false a mutation that
--          would push `credit_balance_cents` below zero RAISES, so an
--          over-spend cannot quietly create a negative cached balance.
--
-- Rollback: DROP FUNCTION IF EXISTS public.apply_credit_ledger_balance(
--             integer, integer, boolean, integer, integer);
--           (NON-destructive — drops only the function. No table/column/row
--           changes are made by this migration, so dropping it simply
--           reverts callers to the previous read-modify-write path. Safe to
--           re-run; CREATE OR REPLACE is idempotent.)
--
-- Risk: medium — money-balance path. Function only TOUCHES the caller's own
--       advisor row (single id), is SECURITY DEFINER so the service-role
--       caller's existing scope is unchanged, and is search_path-pinned to
--       `public` to prevent search-path hijacking.
--
-- RLS: no new user-data table is introduced. The function mutates the
--      existing `professionals` table and is callable only by service_role
--      (EXECUTE is revoked from PUBLIC/anon/authenticated below), so advisor
--      RLS on `professionals` is unaffected.
-- ============================================================================

BEGIN;

-- Atomically apply a signed delta to professionals.credit_balance_cents and
-- the lifetime_* roll-ups, under a row lock, with an optional negative-balance
-- guard. Returns the new credit_balance_cents.
--
-- Params:
--   p_professional_id    advisor row id
--   p_delta_cents        signed delta (positive = credit, negative = spend)
--   p_allow_negative     when false, RAISE if the new balance would be < 0
--   p_lifetime_credit_delta_cents     added to lifetime_credit_cents (>= 0)
--   p_lifetime_spend_delta_cents      added to lifetime_lead_spend_cents (>= 0)
CREATE OR REPLACE FUNCTION public.apply_credit_ledger_balance(
  p_professional_id              integer,
  p_delta_cents                  integer,
  p_allow_negative               boolean DEFAULT false,
  p_lifetime_credit_delta_cents  integer DEFAULT 0,
  p_lifetime_spend_delta_cents   integer DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance     integer;
BEGIN
  -- Lock the advisor row so concurrent ledger writes serialise on it.
  SELECT credit_balance_cents
    INTO v_current_balance
    FROM public.professionals
   WHERE id = p_professional_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_credit_ledger_balance: advisor % not found', p_professional_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_new_balance := COALESCE(v_current_balance, 0) + p_delta_cents;

  -- Negative-balance guard (mirrors lib/marketplace/wallet.ts adjustWallet).
  -- Correction kinds (expiry / chargeback clawback / admin adjustment /
  -- dispute) pass p_allow_negative = true so reconciliations that legitimately
  -- drive a balance negative are not blocked; spend kinds keep the guard on.
  IF p_delta_cents < 0 AND NOT p_allow_negative AND v_new_balance < 0 THEN
    RAISE EXCEPTION
      'apply_credit_ledger_balance: insufficient balance for advisor % (current %, delta %)',
      p_professional_id, COALESCE(v_current_balance, 0), p_delta_cents
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.professionals
     SET credit_balance_cents   = v_new_balance,
         lifetime_credit_cents  = COALESCE(lifetime_credit_cents, 0)
                                    + GREATEST(COALESCE(p_lifetime_credit_delta_cents, 0), 0),
         lifetime_lead_spend_cents = COALESCE(lifetime_lead_spend_cents, 0)
                                    + GREATEST(COALESCE(p_lifetime_spend_delta_cents, 0), 0)
   WHERE id = p_professional_id;

  RETURN v_new_balance;
END;
$$;

-- Service-role-only: the ledger helper always runs with the service-role key
-- (createAdminClient). Lock down EXECUTE so anon/authenticated cannot move
-- balances directly.
REVOKE ALL ON FUNCTION public.apply_credit_ledger_balance(
  integer, integer, boolean, integer, integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_credit_ledger_balance(
  integer, integer, boolean, integer, integer
) FROM anon;
REVOKE ALL ON FUNCTION public.apply_credit_ledger_balance(
  integer, integer, boolean, integer, integer
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_ledger_balance(
  integer, integer, boolean, integer, integer
) TO service_role;

COMMIT;
