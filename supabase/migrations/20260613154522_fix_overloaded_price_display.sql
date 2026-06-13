-- Fix overloaded `price_display` strings on wave-4 seed listings.
--
-- These rows crammed price + return-metric (yield / per-unit / tax-perks) into a
-- single `price_display` string, which the card rendered as one oversized,
-- wrapping number (e.g. "AUD $850,000 — Net yield 11.2%"). The card now renders
-- the ticket price from asking_price_cents / key_metrics and the return metric
-- from key_metrics (net_yield_pct / target_irr_pct / spot_price_aud / units) in
-- its own slot — see lib/listing-format.ts::listingHeadlineStat — so these
-- overloaded overrides must be cleared to let the structured fields drive the
-- display.
--
-- Also corrects a price inconsistency on the biodiversity row: asking_price_cents
-- was $25,000 while the listing represents 50 credits at ~$1,000/credit =
-- $50,000 (the overloaded string was masking the wrong number).
--
-- Data-only, idempotent (each UPDATE guards on the current value), forward-only.
-- Rollback: restore the prior `price_display` strings from this migration's git
-- history, and set asking_price_cents = 2500000 on the biodiversity row.

BEGIN;

-- SDA housing — yield now renders from key_metrics.net_yield_pct.
UPDATE investment_listings SET price_display = NULL
 WHERE slug IN (
   'sda-melbourne-fully-accessible-3br',
   'sda-brisbane-hpa-4br',
   'sda-perth-improved-livability',
   'sda-syd-robust-2br'
 )
   AND price_display IS NOT NULL;

-- ESVCLP funds — "Min investment" renders from key_metrics.min_investment_aud;
-- the tax-offset / CGT story lives in the description + detail page.
UPDATE investment_listings SET price_display = NULL
 WHERE slug IN (
   'esvclp-australia-tech-fund-iv',
   'esvclp-aussie-climate-fund-ii',
   'esvclp-medtech-impact-iii'
 )
   AND price_display IS NOT NULL;

-- Carbon / environmental units — per-unit price renders from
-- key_metrics.spot_price_aud (or asking_price_cents / units).
UPDATE investment_listings SET price_display = NULL
 WHERE slug IN (
   'accu-generic-spot-100-units',
   'accu-hir-vegetation-1000-units',
   'vcu-verra-redd-1000-units',
   'accu-savanna-burning-500-units'
 )
   AND price_display IS NOT NULL;

-- Biodiversity credits — clear the overloaded string AND correct the total to
-- match 50 credits x ~$1,000/credit; the card then derives "$1k per credit".
UPDATE investment_listings
   SET price_display = NULL,
       asking_price_cents = 5000000
 WHERE slug = 'biodiversity-credits-nsw-50-units'
   AND asking_price_cents = 2500000;

COMMIT;
