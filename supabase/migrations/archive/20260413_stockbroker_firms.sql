-- ============================================================
-- 20260413: Stockbroker firm / private wealth vertical
-- ============================================================
--
-- Adds optional columns to `professionals` so a stockbroker firm
-- row can carry the extra fields a comparison surface needs
-- (minimum portfolio, fee model, service tiers, specialties,
-- AFSL, research offering). Rows representing individual advisors
-- leave these columns NULL.
--
-- We extend `professionals` rather than create a new table because
-- the existing lead-routing, contact form, wallet/topup, review
-- and search infrastructure already operates on this table. New
-- rows just have `type = 'stockbroker_firm'` or
-- `type = 'private_wealth_manager'`.
--
-- ROLLBACK STRATEGY (forward-only in prod; for dev/staging only):
--   DROP INDEX IF EXISTS idx_professionals_minimum_investment;
--   DROP INDEX IF EXISTS idx_professionals_firm_type;
--   ALTER TABLE public.professionals
--     DROP COLUMN IF EXISTS aum_aud_billions,
--     DROP COLUMN IF EXISTS office_states,
--     DROP COLUMN IF EXISTS year_founded,
--     DROP COLUMN IF EXISTS research_offering,
--     DROP COLUMN IF EXISTS service_tiers,
--     DROP COLUMN IF EXISTS fee_model,
--     DROP COLUMN IF EXISTS minimum_investment_cents,
--     DROP COLUMN IF EXISTS firm_type;
--
-- Risk: low — additive optional columns + partial indexes only.
-- All operations use IF NOT EXISTS to be idempotent on re-run.

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS firm_type text,
  ADD COLUMN IF NOT EXISTS minimum_investment_cents bigint,
  ADD COLUMN IF NOT EXISTS fee_model text,
  ADD COLUMN IF NOT EXISTS service_tiers jsonb,
  ADD COLUMN IF NOT EXISTS research_offering text,
  ADD COLUMN IF NOT EXISTS year_founded integer,
  ADD COLUMN IF NOT EXISTS office_states text[],
  ADD COLUMN IF NOT EXISTS aum_aud_billions numeric;

-- fee_model is one of: 'percent_aum' | 'commission' | 'flat_retainer' | 'hybrid'
-- (free-text validated at the application layer to avoid migration churn)

CREATE INDEX IF NOT EXISTS idx_professionals_firm_type
  ON public.professionals (type)
  WHERE type IN ('stockbroker_firm', 'private_wealth_manager');

CREATE INDEX IF NOT EXISTS idx_professionals_minimum_investment
  ON public.professionals (minimum_investment_cents)
  WHERE minimum_investment_cents IS NOT NULL;

COMMENT ON COLUMN public.professionals.firm_type IS
  'Sub-categorisation for stockbroker_firm rows: e.g. boutique, bank-owned, mid-tier, institutional. NULL for non-firm rows.';
COMMENT ON COLUMN public.professionals.minimum_investment_cents IS
  'Minimum portfolio size to become a client, in cents AUD. The #1 filter on the comparison surface.';
COMMENT ON COLUMN public.professionals.fee_model IS
  'percent_aum | commission | flat_retainer | hybrid';
COMMENT ON COLUMN public.professionals.service_tiers IS
  'Array of {name, min_investment_cents, description} objects describing service tiers (e.g. Execution-only, Advisory, Discretionary).';
