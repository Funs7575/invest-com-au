-- PR 8.5: Broker reliability score — crowd-sourced incident reports and
-- micro-survey. Aggregate counts drive a per-broker reliability score
-- displayed on broker profile pages and cards.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.broker_reliability_reports;

CREATE TABLE IF NOT EXISTS public.broker_reliability_reports (
  id           uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid       NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_id    integer    NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  event_type   text       NOT NULL
                          CHECK (event_type IN (
                            'platform_outage',
                            'hidden_fees',
                            'withdrawal_delay',
                            'poor_support',
                            'positive_experience'
                          )),
  description  text       CHECK (description IS NULL OR length(description) <= 500),
  status       text       NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_reliability_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_reliability_reports FORCE ROW LEVEL SECURITY;

-- Users can insert their own reports.
CREATE POLICY "user insert own reliability report"
  ON public.broker_reliability_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own reports.
CREATE POLICY "user read own reliability reports"
  ON public.broker_reliability_reports
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Public can read verified reports (aggregate trust signals).
CREATE POLICY "public read verified reliability reports"
  ON public.broker_reliability_reports
  FOR SELECT
  USING (status = 'verified');

-- Service role full access (admin moderation + cron auto-approve).
CREATE POLICY "service_role full access reliability reports"
  ON public.broker_reliability_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS broker_reliability_reports_broker_idx
  ON public.broker_reliability_reports (broker_id, status, event_type);

CREATE INDEX IF NOT EXISTS broker_reliability_reports_user_idx
  ON public.broker_reliability_reports (user_id, created_at DESC);
