-- ============================================================================
-- Migration: 20260510160000_holdings_price_cache.sql
-- Purpose: Server-side cache for current market prices used by the
--          /account/holdings gain/loss display (W2 Phase 1 follow-up).
--          Caches Yahoo Finance + CoinGecko responses to stay under
--          free-tier rate limits even with high traffic.
-- Audit ref: docs/plans/investor-account-end-to-end-plan.md PR-X5c
-- Risk: low — additive table; deny-all-anon (server-only reads via
--       service-role); no user-data tied; safe to wipe.
-- Rollback: DROP TABLE IF EXISTS public.holdings_price_cache;
--           Cache rebuilds itself on demand from upstream.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.holdings_price_cache (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker          text   NOT NULL CHECK (length(ticker) > 0 AND length(ticker) <= 30),
  exchange        text   NOT NULL CHECK (exchange IN (
                    'ASX','NASDAQ','NYSE','LSE','HKEX','SGX','TYO','KRX','CRYPTO','OTHER'
                  )),
  -- Price stored in minor units (cents for fiat, satoshi-equiv for crypto?)
  -- → use cents for everything. CoinGecko returns AUD price for crypto;
  --   we multiply by 100 and round.
  price_cents     bigint NOT NULL CHECK (price_cents >= 0),
  currency        text   NOT NULL CHECK (length(currency) = 3),  -- 'AUD','USD','GBP', etc.
  source          text   NOT NULL CHECK (source IN ('yahoo','coingecko','manual','stale')),
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  -- An attempt at a fresh fetch that returned no data still updates this row
  -- with the previous price marked source='stale' so the UI can render a
  -- footnote ("price last updated N hours ago"). last_attempt_at lets us
  -- avoid hammering an upstream that just rate-limited us.
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticker, exchange)
);

CREATE INDEX IF NOT EXISTS idx_holdings_price_cache_lookup
  ON public.holdings_price_cache (ticker, exchange);

ALTER TABLE public.holdings_price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings_price_cache FORCE ROW LEVEL SECURITY;

-- No anon / authenticated SELECT policy → deny-all by default. The cache
-- is a server-side concern; users get prices via the holdings page which
-- reads through service_role.
DROP POLICY IF EXISTS "service_role full access holdings_price_cache" ON public.holdings_price_cache;
CREATE POLICY "service_role full access holdings_price_cache"
  ON public.holdings_price_cache FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
