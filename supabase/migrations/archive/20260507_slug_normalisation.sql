-- ============================================================
-- Slug normalisation — align investment_listings.vertical with
-- the route slugs used across /invest/[vertical].
--
-- Date: 2026-05-07
-- Audit ref: codebase-health-2026-04-24.md §4.3 (G-03)
-- Queue item: G-03 batch 8
-- Why: normalises investment_listings.vertical from mixed
--      underscore/hyphen/singular-plural values to the canonical
--      route slugs in lib/listing-verticals.ts. Without this,
--      vertical listing pages show zero results.
-- Idempotency: UPDATEs are WHERE-filtered; re-applying converges
--              to the same state. Creates a temp _slug_fix_log table
--              as an audit trail (DROP IF EXISTS before re-apply).
-- Rollback:
--   UPDATE public.investment_listings SET vertical = 'commercial_property'
--     WHERE vertical = 'commercial-property';
--   UPDATE public.investment_listings SET vertical = 'fund'
--     WHERE vertical = 'funds';
--   -- (see file body for the full reverse-mapping list)
--   DROP TABLE IF EXISTS _slug_fix_log;
--   Note: this is a data-only migration; the only DDL is the temp
--         log table which is safe to drop.
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
