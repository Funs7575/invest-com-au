-- ============================================================================
-- Migration: 20260801001200_pricing_matrix.sql
-- Purpose: Phase 4.1 — two-axis pricing for advisor leads.
--          finalPrice = baseLeadPrice
--                       × advisor_specialties.lead_multiplier
--                       × firm_pricing_tiers.multiplier
--
--          Axis 1 — specialty multiplier (per-advisor, follows the
--          specialty): cross-border / FATCA / SIV etc. priced at premium.
--          Axis 2 — firm tier (per-firm, applied across all the firm's
--          advisors): boutique 1.0, enterprise 0.85, sponsor 0.6.
--
--          Keeps the two axes independent so a firm of 10 advisors with
--          1 cross-border specialist doesn't have all 10 paying premium
--          rates.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 4 — Session 4.1.
-- Risk: low — additive: new firm_pricing_tiers table + nullable
--             multiplier column on advisor_specialties. Existing
--             lib/advisor-billing.ts keeps working at baseLeadPrice
--             until refactored to read these axes (deferred).
-- Rollback:
--   BEGIN;
--     ALTER TABLE public.advisor_specialties DROP COLUMN IF EXISTS lead_multiplier;
--     ALTER TABLE public.advisor_firms DROP COLUMN IF EXISTS pricing_tier_id;
--     DROP TABLE IF EXISTS public.firm_pricing_tiers;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.firm_pricing_tiers (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  multiplier      numeric(4,2) NOT NULL CHECK (multiplier > 0 AND multiplier <= 5),
  description     text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_pricing_tiers_active
  ON public.firm_pricing_tiers (active) WHERE active = true;

ALTER TABLE public.firm_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_pricing_tiers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active firm_pricing_tiers"
  ON public.firm_pricing_tiers;
CREATE POLICY "Public can read active firm_pricing_tiers"
  ON public.firm_pricing_tiers FOR SELECT
  TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "service_role full access firm_pricing_tiers"
  ON public.firm_pricing_tiers;
CREATE POLICY "service_role full access firm_pricing_tiers"
  ON public.firm_pricing_tiers FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER firm_pricing_tiers_updated_at
  BEFORE UPDATE ON public.firm_pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed the three documented tiers. ON CONFLICT keeps re-runs idempotent.
INSERT INTO public.firm_pricing_tiers (slug, name, multiplier, description) VALUES
  ('boutique',   'Boutique',   1.00, 'Standard pay-as-you-go pricing.'),
  ('enterprise', 'Enterprise', 0.85, 'Volume-commit discount for firms with 20+ active advisors.'),
  ('sponsor',    'Sponsor',    0.60, 'Reserved for sponsorship + co-marketing arrangements.')
ON CONFLICT (slug) DO NOTHING;

-- Firms gain a pricing tier reference; NULL = boutique default.
ALTER TABLE public.advisor_firms
  ADD COLUMN IF NOT EXISTS pricing_tier_id bigint
    REFERENCES public.firm_pricing_tiers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_firms_pricing_tier
  ON public.advisor_firms (pricing_tier_id) WHERE pricing_tier_id IS NOT NULL;

-- Specialties gain a per-specialty lead-price multiplier. NULL = 1.00
-- (no adjustment). Cross-border specialties documented in FIN_NOTEBOOK
-- get backfilled to 1.75 if they exist.
ALTER TABLE public.advisor_specialties
  ADD COLUMN IF NOT EXISTS lead_multiplier numeric(4,2)
    CHECK (lead_multiplier IS NULL OR (lead_multiplier > 0 AND lead_multiplier <= 5));

-- Best-effort backfill for the cross-border specialties shipped in the
-- 2026-05-02 specialty-taxonomy wave. Names match exactly; if the
-- specialty doesn't exist in this project, the UPDATE is a no-op.
UPDATE public.advisor_specialties
SET lead_multiplier = 1.75
WHERE name IN (
  'UK Pension Transfer',
  'FATCA-Aware US Expat Planning',
  'DASP Processing',
  'FIRB Property (Non-Resident)'
) AND lead_multiplier IS NULL;

COMMIT;
