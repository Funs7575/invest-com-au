-- Migration: user_term_deposits — track personally-held term deposits for
-- maturity-reminder cron (PR 3.4).
--
-- td_reminder_sends deduplicates the 30/7/1-day reminder emails so each
-- (td_id, days_before) pair is sent at most once.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.td_reminder_sends;
--   DROP TABLE IF EXISTS public.user_term_deposits;

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_term_deposits (
  id                bigserial PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name  text NOT NULL,
  provider_slug     text NOT NULL DEFAULT '',
  principal_cents   bigint NOT NULL CHECK (principal_cents > 0),
  rate_bps          integer NOT NULL CHECK (rate_bps BETWEEN 0 AND 5000),
  term_months       integer NOT NULL CHECK (term_months > 0),
  maturity_date     date NOT NULL,
  notes             text NOT NULL DEFAULT '',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_term_deposits_user_idx
  ON public.user_term_deposits (user_id);

CREATE INDEX IF NOT EXISTS user_term_deposits_maturity_idx
  ON public.user_term_deposits (maturity_date);

ALTER TABLE public.user_term_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_term_deposits FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_term_deposits_own" ON public.user_term_deposits;
CREATE POLICY "user_term_deposits_own"
  ON public.user_term_deposits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_term_deposits_service_all" ON public.user_term_deposits;
CREATE POLICY "user_term_deposits_service_all"
  ON public.user_term_deposits
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dedup table: one reminder per (td_id, days_before). Cascades on TD delete.
CREATE TABLE IF NOT EXISTS public.td_reminder_sends (
  id           bigserial PRIMARY KEY,
  td_id        bigint NOT NULL REFERENCES public.user_term_deposits(id) ON DELETE CASCADE,
  days_before  integer NOT NULL CHECK (days_before IN (30, 7, 1)),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (td_id, days_before)
);

CREATE INDEX IF NOT EXISTS td_reminder_sends_td_idx
  ON public.td_reminder_sends (td_id);

ALTER TABLE public.td_reminder_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.td_reminder_sends FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "td_reminder_sends_own_read" ON public.td_reminder_sends;
CREATE POLICY "td_reminder_sends_own_read"
  ON public.td_reminder_sends
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_term_deposits
      WHERE id = td_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "td_reminder_sends_service_all" ON public.td_reminder_sends;
CREATE POLICY "td_reminder_sends_service_all"
  ON public.td_reminder_sends
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
