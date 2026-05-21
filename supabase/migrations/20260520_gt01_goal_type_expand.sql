-- ============================================================================
-- Migration: 20260520_gt01_goal_type_expand.sql
-- Date: 2026-05-20
-- Audit ref: GT-01 (goal tracking — queue item GT-01, REMEDIATION_QUEUE.md)
-- Queue item: GT-01 — goal tracking: FHB deposit, FIRE, retirement, debt-free
-- Why: The original investor_goals migration constrained goal_type to four
--      values ('house_deposit','retirement','education','generic'). The GT-01
--      product spec explicitly calls for 'fire' (Financial Independence Retire
--      Early) and 'debt_free' goal types. FIRE has a fundamentally different
--      default return assumption (4% safe-withdrawal-rate lens) and the UI
--      shows a "FIRE number" (25× annual expenses) rather than a raw dollar
--      target; debt_free goals project loan payoff rather than savings growth.
--      Both require distinct UI paths in GoalsClient.tsx.
-- Idempotency: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT — reruns safely
--              because DROP is conditional and ADD only fires if the DROP
--              actually removed it. Existing rows are unaffected (no 'fire' or
--              'debt_free' values existed under the old constraint).
-- Rollback:
--   ALTER TABLE public.investor_goals
--     DROP CONSTRAINT IF EXISTS investor_goals_goal_type_check;
--   ALTER TABLE public.investor_goals
--     ADD CONSTRAINT investor_goals_goal_type_check
--     CHECK (goal_type IN ('house_deposit','retirement','education','generic'));
--
-- IMPORTANT — prior policy state: RLS was already enabled by migration
--   20260510280000_investor_goals.sql. This migration makes no policy
--   changes — schema constraint only.
-- ============================================================================

BEGIN;

ALTER TABLE public.investor_goals
  DROP CONSTRAINT IF EXISTS investor_goals_goal_type_check;

ALTER TABLE public.investor_goals
  ADD CONSTRAINT investor_goals_goal_type_check
  CHECK (goal_type IN (
    'house_deposit',
    'retirement',
    'education',
    'generic',
    'fire',
    'debt_free'
  ));

COMMIT;
