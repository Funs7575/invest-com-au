-- Sold archive — realised-price capture on investment_listings.
--
-- Strategic groundwork (FIN_NOTEBOOK 2026-06-12): every sold listing
-- becomes a comparable; the archive accrues into the comps dataset that
-- later powers category price indices and the comps API. Capture starts
-- the day this is applied — the lot page's comparables module and the
-- "recently sold" strips read these columns and degrade gracefully while
-- they are absent.
--
-- `sold_price_cents` is optional on purpose: sellers may mark a listing
-- sold without disclosing the price; undisclosed sales still count for
-- liquidity signals (time-to-sell) but are excluded from price comps.
--
-- Rollback strategy:
--   ALTER TABLE public.investment_listings DROP COLUMN IF EXISTS sold_price_cents;
--   ALTER TABLE public.investment_listings DROP COLUMN IF EXISTS sold_at;

ALTER TABLE public.investment_listings
  ADD COLUMN IF NOT EXISTS sold_price_cents bigint,
  ADD COLUMN IF NOT EXISTS sold_at timestamptz;

-- The archive scan: sold rows per vertical, newest first.
CREATE INDEX IF NOT EXISTS idx_investment_listings_sold
  ON public.investment_listings (vertical, sold_at DESC)
  WHERE (status = 'sold');
