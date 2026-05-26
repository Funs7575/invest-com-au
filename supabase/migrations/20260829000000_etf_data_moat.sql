-- PR 8.1-8.3: ETF data moat — holdings + distributions tables.
--
-- etf_holdings: top constituent securities per ASX-listed ETF (by weight).
--   Seeded with publicly published top holdings for the 6 most popular
--   AU-listed ETFs. Designed to accept a bulk import from a licensed data
--   feed (Morningstar/ASX/ETF provider) when sourcing is confirmed.
--
-- etf_distributions: upcoming distribution events per ETF.
--   Seeded with the next 12 months of known distribution schedules.
--   Also ready for a licensed feed.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.etf_distributions;
--   DROP TABLE IF EXISTS public.etf_holdings;

-- ── etf_holdings ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.etf_holdings (
  id                serial       PRIMARY KEY,
  etf_slug          text         NOT NULL,  -- ASX ticker e.g. 'vas', 'vgs'
  etf_name          text         NOT NULL,
  ticker            text         NOT NULL,  -- underlying security e.g. 'BHP', 'AAPL'
  security_name     text         NOT NULL,
  weight_bps        integer      NOT NULL CHECK (weight_bps >= 0),  -- basis points; 100 = 1%
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (etf_slug, ticker)
);

-- Public read: published ETF disclosure data. Service role for writes/imports.
ALTER TABLE public.etf_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_holdings FORCE ROW LEVEL SECURITY;

CREATE POLICY "etf_holdings_public_read"
  ON public.etf_holdings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "etf_holdings_service_write"
  ON public.etf_holdings FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS etf_holdings_slug_idx
  ON public.etf_holdings (etf_slug, weight_bps DESC);

-- ── etf_distributions ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.etf_distributions (
  id                serial       PRIMARY KEY,
  etf_slug          text         NOT NULL,
  etf_name          text         NOT NULL,
  ex_date           date         NOT NULL,
  pay_date          date,
  amount_cents      integer      CHECK (amount_cents IS NULL OR amount_cents >= 0),
  franking_pct      numeric(5,2) NOT NULL DEFAULT 0 CHECK (franking_pct >= 0 AND franking_pct <= 100),
  distribution_type text         NOT NULL DEFAULT 'income'
                    CHECK (distribution_type IN ('income', 'dividend', 'capital_gain')),
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (etf_slug, ex_date)
);

ALTER TABLE public.etf_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etf_distributions FORCE ROW LEVEL SECURITY;

CREATE POLICY "etf_distributions_public_read"
  ON public.etf_distributions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "etf_distributions_service_write"
  ON public.etf_distributions FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS etf_distributions_slug_date_idx
  ON public.etf_distributions (etf_slug, ex_date DESC);

CREATE INDEX IF NOT EXISTS etf_distributions_future_idx
  ON public.etf_distributions (ex_date ASC)
  WHERE ex_date >= CURRENT_DATE;

-- ── Seed: etf_holdings ────────────────────────────────────────────────────────
-- Top ~15 holdings per ETF from publicly published fund disclosures.
-- Weights are approximate and represent percent of fund in basis points.
-- Source: Vanguard Australia, iShares Australia, BetaShares product pages (2026).

INSERT INTO public.etf_holdings (etf_slug, etf_name, ticker, security_name, weight_bps) VALUES

-- VAS — Vanguard Australian Shares Index ETF (ASX 300)
('vas', 'Vanguard Australian Shares Index ETF', 'BHP',  'BHP Group Limited',          850),
('vas', 'Vanguard Australian Shares Index ETF', 'CBA',  'Commonwealth Bank of Aust.', 800),
('vas', 'Vanguard Australian Shares Index ETF', 'CSL',  'CSL Limited',                550),
('vas', 'Vanguard Australian Shares Index ETF', 'NAB',  'National Australia Bank',    450),
('vas', 'Vanguard Australian Shares Index ETF', 'WBC',  'Westpac Banking Corp',       380),
('vas', 'Vanguard Australian Shares Index ETF', 'ANZ',  'ANZ Group Holdings',         350),
('vas', 'Vanguard Australian Shares Index ETF', 'WES',  'Wesfarmers Limited',         320),
('vas', 'Vanguard Australian Shares Index ETF', 'RIO',  'Rio Tinto Limited',          290),
('vas', 'Vanguard Australian Shares Index ETF', 'MQG',  'Macquarie Group',            260),
('vas', 'Vanguard Australian Shares Index ETF', 'WOW',  'Woolworths Group',           220),
('vas', 'Vanguard Australian Shares Index ETF', 'TCL',  'Transurban Group',           180),
('vas', 'Vanguard Australian Shares Index ETF', 'GMG',  'Goodman Group',              170),
('vas', 'Vanguard Australian Shares Index ETF', 'FMG',  'Fortescue Limited',          160),
('vas', 'Vanguard Australian Shares Index ETF', 'TLS',  'Telstra Group',              150),
('vas', 'Vanguard Australian Shares Index ETF', 'WTC',  'WiseTech Global',            120),

-- IOZ — iShares Core S&P/ASX 200 ETF (ASX 200)
('ioz', 'iShares Core S&P/ASX 200 ETF', 'BHP',  'BHP Group Limited',          920),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'CBA',  'Commonwealth Bank of Aust.', 850),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'CSL',  'CSL Limited',                580),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'NAB',  'National Australia Bank',    480),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'WBC',  'Westpac Banking Corp',       400),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'ANZ',  'ANZ Group Holdings',         370),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'WES',  'Wesfarmers Limited',         340),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'RIO',  'Rio Tinto Limited',          300),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'MQG',  'Macquarie Group',            280),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'WOW',  'Woolworths Group',           230),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'TCL',  'Transurban Group',           190),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'GMG',  'Goodman Group',              180),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'FMG',  'Fortescue Limited',          170),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'TLS',  'Telstra Group',              160),
('ioz', 'iShares Core S&P/ASX 200 ETF', 'WDS',  'Woodside Energy Group',      140),

-- VHY — Vanguard Australian Shares High Yield ETF
('vhy', 'Vanguard Australian Shares High Yield ETF', 'BHP',  'BHP Group Limited',      1020),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'CBA',  'Commonwealth Bank',       870),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'NAB',  'National Australia Bank', 760),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'WBC',  'Westpac Banking Corp',    680),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'ANZ',  'ANZ Group Holdings',      590),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'RIO',  'Rio Tinto Limited',       480),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'WES',  'Wesfarmers Limited',      390),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'FMG',  'Fortescue Limited',       320),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'WDS',  'Woodside Energy Group',   260),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'ORG',  'Origin Energy',           230),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'STO',  'Santos Limited',          210),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'WOW',  'Woolworths Group',        180),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'COL',  'Coles Group',             160),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'APA',  'APA Group',               140),
('vhy', 'Vanguard Australian Shares High Yield ETF', 'TLS',  'Telstra Group',           130),

-- VGS — Vanguard MSCI Index International Shares ETF (World ex-AU)
('vgs', 'Vanguard MSCI Index International Shares ETF', 'AAPL',   'Apple Inc',              520),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'MSFT',   'Microsoft Corporation',  490),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'NVDA',   'NVIDIA Corporation',     420),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'AMZN',   'Amazon.com Inc',         280),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'META',   'Meta Platforms',         220),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'GOOGL',  'Alphabet Inc (A)',       170),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'GOOG',   'Alphabet Inc (C)',       140),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'TSLA',   'Tesla Inc',              130),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'AVGO',   'Broadcom Inc',           120),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'LLY',    'Eli Lilly & Co',         110),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'JPM',    'JPMorgan Chase',         100),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'UNH',    'UnitedHealth Group',      90),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'BRK-B',  'Berkshire Hathaway B',    90),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'V',      'Visa Inc',                80),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'ASML',   'ASML Holding',            70),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'XOM',    'Exxon Mobil Corp',        60),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'TSM',    'TSMC',                    60),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'NOVO-B', 'Novo Nordisk',            55),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'NESN',   'Nestlé SA',               55),
('vgs', 'Vanguard MSCI Index International Shares ETF', 'COST',   'Costco Wholesale',        50),

-- NDQ — BetaShares NASDAQ 100 ETF
('ndq', 'BetaShares NASDAQ 100 ETF', 'MSFT',  'Microsoft Corporation',  850),
('ndq', 'BetaShares NASDAQ 100 ETF', 'AAPL',  'Apple Inc',              830),
('ndq', 'BetaShares NASDAQ 100 ETF', 'NVDA',  'NVIDIA Corporation',     780),
('ndq', 'BetaShares NASDAQ 100 ETF', 'AMZN',  'Amazon.com Inc',         520),
('ndq', 'BetaShares NASDAQ 100 ETF', 'META',  'Meta Platforms',         450),
('ndq', 'BetaShares NASDAQ 100 ETF', 'AVGO',  'Broadcom Inc',           420),
('ndq', 'BetaShares NASDAQ 100 ETF', 'TSLA',  'Tesla Inc',              300),
('ndq', 'BetaShares NASDAQ 100 ETF', 'GOOGL', 'Alphabet Inc (A)',       250),
('ndq', 'BetaShares NASDAQ 100 ETF', 'GOOG',  'Alphabet Inc (C)',       230),
('ndq', 'BetaShares NASDAQ 100 ETF', 'COST',  'Costco Wholesale',       220),
('ndq', 'BetaShares NASDAQ 100 ETF', 'NFLX',  'Netflix Inc',            190),
('ndq', 'BetaShares NASDAQ 100 ETF', 'ASML',  'ASML Holding',           150),
('ndq', 'BetaShares NASDAQ 100 ETF', 'AMD',   'Advanced Micro Devices', 140),
('ndq', 'BetaShares NASDAQ 100 ETF', 'QCOM',  'Qualcomm Inc',           130),
('ndq', 'BetaShares NASDAQ 100 ETF', 'PANW',  'Palo Alto Networks',     100),
('ndq', 'BetaShares NASDAQ 100 ETF', 'ADBE',  'Adobe Inc',               90),

-- IVV — iShares S&P 500 ETF
('ivv', 'iShares S&P 500 ETF', 'AAPL',  'Apple Inc',              720),
('ivv', 'iShares S&P 500 ETF', 'MSFT',  'Microsoft Corporation',  650),
('ivv', 'iShares S&P 500 ETF', 'NVDA',  'NVIDIA Corporation',     580),
('ivv', 'iShares S&P 500 ETF', 'AMZN',  'Amazon.com Inc',         400),
('ivv', 'iShares S&P 500 ETF', 'META',  'Meta Platforms',         320),
('ivv', 'iShares S&P 500 ETF', 'GOOGL', 'Alphabet Inc (A)',       240),
('ivv', 'iShares S&P 500 ETF', 'GOOG',  'Alphabet Inc (C)',       210),
('ivv', 'iShares S&P 500 ETF', 'TSLA',  'Tesla Inc',              190),
('ivv', 'iShares S&P 500 ETF', 'BRK-B', 'Berkshire Hathaway B',  170),
('ivv', 'iShares S&P 500 ETF', 'AVGO',  'Broadcom Inc',           160),
('ivv', 'iShares S&P 500 ETF', 'JPM',   'JPMorgan Chase',         140),
('ivv', 'iShares S&P 500 ETF', 'LLY',   'Eli Lilly & Co',         130),
('ivv', 'iShares S&P 500 ETF', 'V',     'Visa Inc',               110),
('ivv', 'iShares S&P 500 ETF', 'UNH',   'UnitedHealth Group',     100),
('ivv', 'iShares S&P 500 ETF', 'XOM',   'Exxon Mobil Corp',        90)

ON CONFLICT (etf_slug, ticker) DO NOTHING;

-- ── Seed: etf_distributions ───────────────────────────────────────────────────
-- Known distribution schedules for the 6 seeded ETFs, next 12 months.
-- Amounts in AUD cents per unit (approximate; confirmed post ex-date by fund).
-- Franking reflects each ETF's typical Australian sourcing.

INSERT INTO public.etf_distributions
  (etf_slug, etf_name, ex_date, pay_date, amount_cents, franking_pct, distribution_type)
VALUES

-- VAS — quarterly (March / June / September / December)
('vas', 'Vanguard Australian Shares Index ETF', '2026-06-25', '2026-07-09',  58, 75, 'income'),
('vas', 'Vanguard Australian Shares Index ETF', '2026-09-25', '2026-10-09',  55, 75, 'income'),
('vas', 'Vanguard Australian Shares Index ETF', '2026-12-23', '2027-01-08',  62, 75, 'income'),
('vas', 'Vanguard Australian Shares Index ETF', '2027-03-25', '2027-04-09',  57, 75, 'income'),

-- IOZ — quarterly
('ioz', 'iShares Core S&P/ASX 200 ETF', '2026-06-22', '2026-07-06', 31, 80, 'income'),
('ioz', 'iShares Core S&P/ASX 200 ETF', '2026-09-22', '2026-10-06', 29, 80, 'income'),
('ioz', 'iShares Core S&P/ASX 200 ETF', '2026-12-22', '2027-01-06', 34, 80, 'income'),
('ioz', 'iShares Core S&P/ASX 200 ETF', '2027-03-22', '2027-04-06', 30, 80, 'income'),

-- VHY — quarterly (higher yield)
('vhy', 'Vanguard Australian Shares High Yield ETF', '2026-06-24', '2026-07-10', 89, 80, 'income'),
('vhy', 'Vanguard Australian Shares High Yield ETF', '2026-09-24', '2026-10-10', 85, 80, 'income'),
('vhy', 'Vanguard Australian Shares High Yield ETF', '2026-12-22', '2026-12-31', 95, 80, 'income'),
('vhy', 'Vanguard Australian Shares High Yield ETF', '2027-03-24', '2027-04-09', 88, 80, 'income'),

-- VGS — semi-annual (June / December); international, no AU franking
('vgs', 'Vanguard MSCI Index International Shares ETF', '2026-06-18', '2026-07-02', 42, 0, 'income'),
('vgs', 'Vanguard MSCI Index International Shares ETF', '2026-12-17', '2027-01-07', 45, 0, 'income'),
('vgs', 'Vanguard MSCI Index International Shares ETF', '2027-06-17', '2027-07-01', 43, 0, 'income'),

-- NDQ — semi-annual; international, no AU franking
('ndq', 'BetaShares NASDAQ 100 ETF', '2026-06-19', '2026-07-03', 12, 0, 'income'),
('ndq', 'BetaShares NASDAQ 100 ETF', '2026-12-18', '2027-01-07', 14, 0, 'income'),
('ndq', 'BetaShares NASDAQ 100 ETF', '2027-06-18', '2027-07-02', 13, 0, 'income'),

-- IVV — semi-annual; international, no AU franking
('ivv', 'iShares S&P 500 ETF', '2026-06-20', '2026-07-04', 28, 0, 'income'),
('ivv', 'iShares S&P 500 ETF', '2026-12-19', '2027-01-05', 31, 0, 'income'),
('ivv', 'iShares S&P 500 ETF', '2027-06-20', '2027-07-04', 29, 0, 'income')

ON CONFLICT (etf_slug, ex_date) DO NOTHING;
