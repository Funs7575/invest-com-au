-- Migration: market_events — public market/economic events calendar (PR 5.1).
--
-- market_events stores upcoming and historical market-relevant events:
-- RBA meetings, ASX earnings seasons, economic data releases, dividends, IPOs.
-- Displayed on /calendar; exported as iCalendar via /api/market-events/ical.
--
-- is_all_day=true:  event spans the whole day (DTSTART;VALUE=DATE in iCal)
-- is_all_day=false: event has a specific start_time + timezone
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.market_events;

BEGIN;

CREATE TABLE IF NOT EXISTS public.market_events (
  id           bigserial PRIMARY KEY,
  event_date   date NOT NULL,
  event_type   text NOT NULL
    CHECK (event_type IN ('rba', 'asx', 'earnings', 'economic', 'dividend', 'ipo', 'other')),
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  source_url   text NOT NULL DEFAULT '',
  is_all_day   boolean NOT NULL DEFAULT true,
  start_time   time,
  timezone     text NOT NULL DEFAULT 'Australia/Sydney',
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_events_date_idx
  ON public.market_events (event_date, event_type)
  WHERE is_published = true;

ALTER TABLE public.market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "market_events_public_read" ON public.market_events;
CREATE POLICY "market_events_public_read"
  ON public.market_events FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "market_events_service_all" ON public.market_events;
CREATE POLICY "market_events_service_all"
  ON public.market_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed: upcoming 2026 events ────────────────────────────────────────────────
-- RBA Board meeting dates (official 2026 schedule: fortnightly Tuesdays,
-- decision published same day ~14:30 AEST).

INSERT INTO public.market_events (event_date, event_type, title, description, source_url, start_time, timezone)
VALUES
  ('2026-07-07', 'rba', 'RBA Cash Rate Decision — July 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney'),
  ('2026-08-04', 'rba', 'RBA Cash Rate Decision — August 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney'),
  ('2026-09-01', 'rba', 'RBA Cash Rate Decision — September 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney'),
  ('2026-10-06', 'rba', 'RBA Cash Rate Decision — October 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney'),
  ('2026-11-03', 'rba', 'RBA Cash Rate Decision — November 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney'),
  ('2026-12-01', 'rba', 'RBA Cash Rate Decision — December 2026',
   'Reserve Bank of Australia board meeting. Cash rate decision published at 14:30 AEST.',
   'https://www.rba.gov.au/monetary-policy/rba-board-minutes/', '04:30', 'Australia/Sydney')
ON CONFLICT DO NOTHING;

INSERT INTO public.market_events (event_date, event_type, title, description, is_all_day)
VALUES
  ('2026-08-14', 'economic', 'Australian Unemployment Rate — July 2026',
   'ABS Labour Force survey results for July 2026. Key indicator for RBA rate decisions.', true),
  ('2026-08-27', 'economic', 'Australian CPI — Q2 2026 (Quarterly)',
   'ABS Consumer Price Index for Q2 2026. Key inflation metric watched by the RBA.', true),
  ('2026-07-01', 'asx', 'ASX S&P/ASX 200 Quarterly Rebalance — June Quarter',
   'Quarterly rebalance of the S&P/ASX 200 index. Index additions and deletions effective today.', true),
  ('2026-10-01', 'asx', 'ASX S&P/ASX 200 Quarterly Rebalance — September Quarter',
   'Quarterly rebalance of the S&P/ASX 200 index. Index additions and deletions effective today.', true)
ON CONFLICT DO NOTHING;

COMMIT;
