-- ============================================================================
-- Migration: 20260515_mm25_marketplace_ranking.sql
-- Purpose: Admin-tunable marketplace ranking weights. The /advisors and
--          /teams listings score each provider with a weighted sum of:
--          verified status, outcome score, response latency, credit balance
--          headroom, AND subscription tier priority (MM-24). Weights live
--          in a table so admins can re-rank the marketplace without code
--          deploys.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS + INSERT ON CONFLICT DO NOTHING.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.marketplace_ranking_weights;
--
-- Risk: low — additive; if the table is empty or unreachable, code falls
-- back to constant default weights so /advisors still ranks deterministically.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_ranking_weights (
  id           bigserial PRIMARY KEY,
  surface      text NOT NULL,   -- 'advisors' or 'teams'
  signal       text NOT NULL,   -- 'verified', 'outcome_score', 'response_latency_inv', 'subscription_tier', 'credit_headroom', 'rating'
  weight_bps   integer NOT NULL,
  enabled      boolean NOT NULL DEFAULT true,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_ranking_surface_signal
  ON public.marketplace_ranking_weights (surface, signal);

ALTER TABLE public.marketplace_ranking_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read enabled weights" ON public.marketplace_ranking_weights;
CREATE POLICY "anon read enabled weights"
  ON public.marketplace_ranking_weights
  FOR SELECT
  TO anon, authenticated
  USING (enabled = true);

-- service_role bypasses RLS implicitly — no policy needed.

-- Seed defaults. Weights in basis points so admins can fine-tune; sum
-- doesn't need to equal 10000 — they're additive multipliers on
-- normalised 0..1 signal values.
INSERT INTO public.marketplace_ranking_weights (surface, signal, weight_bps, notes) VALUES
  ('advisors', 'verified',             10000, 'Verified status (1.0 = verified, 0 otherwise)'),
  ('advisors', 'outcome_score',         8000, 'Verified outcome score 0..1'),
  ('advisors', 'response_latency_inv',  4000, '1.0 = responds <1h; 0 = no data / never responds'),
  ('advisors', 'subscription_tier',     5000, 'See pro_subscription tier weights (MM-24)'),
  ('advisors', 'rating',                3000, 'Public rating 0..5 normalised'),
  ('teams',    'verified',             10000, ''),
  ('teams',    'outcome_score',         8000, ''),
  ('teams',    'subscription_tier',     5000, ''),
  ('teams',    'rating',                3000, '')
ON CONFLICT (surface, signal) DO NOTHING;

COMMIT;
