-- Migration: seasonal_email_sends — once-per-year dedup for EOFY, New-FY
-- kickstart, and other seasonal email campaigns.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.seasonal_email_sends;

BEGIN;

CREATE TABLE IF NOT EXISTS public.seasonal_email_sends (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type  text NOT NULL, -- 'eofy_countdown' | 'new_fy_kickstart'
  send_year   integer NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_type, send_year)
);

CREATE INDEX IF NOT EXISTS seasonal_email_sends_user_idx
  ON public.seasonal_email_sends (user_id);

CREATE INDEX IF NOT EXISTS seasonal_email_sends_type_year_idx
  ON public.seasonal_email_sends (email_type, send_year);

ALTER TABLE public.seasonal_email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasonal_email_sends FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasonal_email_sends_own_read" ON public.seasonal_email_sends;
CREATE POLICY "seasonal_email_sends_own_read"
  ON public.seasonal_email_sends
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "seasonal_email_sends_service_all" ON public.seasonal_email_sends;
CREATE POLICY "seasonal_email_sends_service_all"
  ON public.seasonal_email_sends
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
