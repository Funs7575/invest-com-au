-- ============================================================================
-- Migration: 20260801001700_lead_demand_signals.sql
-- Purpose: Idea #3 — demand-aware third pricing axis. Stores a per-category
--          supply/demand multiplier (refreshed by a cron from recent lead +
--          accept volume) that lib/lead-pricing.ts composes on top of the
--          specialty × firm-tier axes. Scarce categories (few advisors,
--          many leads) price up; saturated ones price down.
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 2, #3)
-- Risk: low — additive lookup table; multiplier is bounded in the lib
--             (0.8–1.5) so a bad signal can't produce runaway pricing.
-- Rollback:
--   BEGIN; DROP TABLE IF EXISTS public.lead_demand_signals; COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_demand_signals (
  category        text PRIMARY KEY,
  supply_count    integer NOT NULL DEFAULT 0,
  demand_count    integer NOT NULL DEFAULT 0,
  multiplier      numeric(4,2) NOT NULL DEFAULT 1.00
                  CHECK (multiplier >= 0.5 AND multiplier <= 2.0),
  window_days     integer NOT NULL DEFAULT 30,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_demand_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_demand_signals FORCE ROW LEVEL SECURITY;

-- Public read (the multiplier is shown to advisors as price context) +
-- service_role write (the cron computes it).
DROP POLICY IF EXISTS "Public read lead_demand_signals" ON public.lead_demand_signals;
CREATE POLICY "Public read lead_demand_signals"
  ON public.lead_demand_signals FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access lead_demand_signals" ON public.lead_demand_signals;
CREATE POLICY "service_role full access lead_demand_signals"
  ON public.lead_demand_signals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
