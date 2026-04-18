-- ============================================================
-- Slug normalisation — align investment_listings.vertical with
-- the route slugs used across /invest/[vertical].
--
-- Currently the table mixes underscore and hyphen conventions
-- (e.g. 'commercial_property' vs route 'commercial-property'),
-- plus singular/plural ('fund' vs route 'funds'). This mismatch
-- is one of the root causes of vertical listing pages showing
-- zero results.
--
-- After this migration, vertical values match the canonical
-- slugs in lib/listing-verticals.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS _slug_fix_log (
  id SERIAL,
  note TEXT,
  ts TIMESTAMPTZ DEFAULT NOW()
);

UPDATE public.investment_listings
  SET vertical = 'commercial-property'
  WHERE vertical = 'commercial_property';

UPDATE public.investment_listings
  SET vertical = 'buy-business'
  WHERE vertical = 'business';

UPDATE public.investment_listings
  SET vertical = 'startups'
  WHERE vertical = 'startup';

UPDATE public.investment_listings
  SET vertical = 'renewable-energy'
  WHERE vertical = 'energy';

UPDATE public.investment_listings
  SET vertical = 'funds'
  WHERE vertical = 'fund';

INSERT INTO _slug_fix_log (note)
  VALUES ('slug normalisation applied — 20260507');
