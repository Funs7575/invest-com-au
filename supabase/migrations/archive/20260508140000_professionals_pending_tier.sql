-- ============================================================================
-- Migration: 20260508140000_professionals_pending_tier.sql
-- Purpose: Add `pending_tier` and `pending_tier_effective_at` columns to
--          `professionals` so deferred downgrades can be queued and
--          rendered ("Pro until 7 Jun, then Growth") without flipping
--          advisor_tier until Stripe's cycle-end webhook lands.
-- Rollback: ALTER TABLE professionals DROP COLUMN pending_tier;
--           ALTER TABLE professionals DROP COLUMN pending_tier_effective_at;
--           Non-destructive in normal operation: only advisors who issued
--           a downgrade in the rollback window lose their queued tier
--           change (they remain on the current paid tier instead of
--           cycling down).
-- Risk: low — additive nullable columns; read-only consumers just see
--       null until the new tier-upgrade flow writes them.
-- ============================================================================

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS pending_tier text,
  ADD COLUMN IF NOT EXISTS pending_tier_effective_at timestamptz;

-- (No CHECK constraint on pending_tier — getTier() validates the literal
--  before write; storing free-text keeps the column compatible with
--  future tier additions without a migration.)
