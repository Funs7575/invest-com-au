-- PR 7.3: The Invest Score — daily composite market-data index.
--
-- Stores one row per calendar day. The score (0–100) is a weighted
-- composite of observable signals in our database: savings rate level,
-- rate momentum, platform activity, and market breadth.
--
-- Explicitly NOT a buy/sell signal or personal financial advice.
--
-- Rollback: DROP TABLE IF EXISTS public.invest_score_daily;

CREATE TABLE IF NOT EXISTS public.invest_score_daily (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date        NOT NULL UNIQUE,
  score        numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  label        text         NOT NULL,
  components   jsonb        NOT NULL DEFAULT '{}',
  -- e.g. { "rate_level": 70, "rate_momentum": 50, "platform_activity": 65, "market_breadth": 80 }
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.invest_score_daily ENABLE ROW LEVEL SECURITY;

-- Public can read the daily score (this is aggregated market data, not personal).
CREATE POLICY "public read invest score"
  ON public.invest_score_daily
  FOR SELECT
  USING (true);

-- Only service_role can insert or update (driven by the daily cron job).
CREATE POLICY "service_role write invest score"
  ON public.invest_score_daily
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for the most common query pattern: latest date first.
CREATE INDEX IF NOT EXISTS invest_score_daily_date_idx
  ON public.invest_score_daily (date DESC);
