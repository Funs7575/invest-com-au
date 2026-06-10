-- telegram_subscriptions: links a Telegram chat_id to an email/user so the
-- rate-alerts cron can deliver threshold notifications via Telegram Bot API.
--
-- Rollback: DROP TABLE IF EXISTS public.telegram_subscriptions;
--
-- Design notes:
--   - chat_id is the stable Telegram user or group ID (int8 on the Telegram side)
--   - email is the primary linkage key (matched against rate_alert_subscriptions)
--   - user_id is nullable — set when the user is authenticated at subscription time
--   - rate_alerts / fee_alerts toggle which alert types flow to Telegram
--   - confirmed guards against chat_ids submitted by third parties; the cron
--     only delivers to confirmed=true rows

CREATE TABLE IF NOT EXISTS public.telegram_subscriptions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint      NOT NULL,
  email            text        NOT NULL,
  user_id          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  rate_alerts      boolean     NOT NULL DEFAULT true,
  fee_alerts       boolean     NOT NULL DEFAULT true,
  confirmed        boolean     NOT NULL DEFAULT false,
  active           boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT telegram_subscriptions_chat_id_email_key
    UNIQUE (telegram_chat_id, email)
);

-- Only a confirmed, active subscription should be deliverable
CREATE INDEX IF NOT EXISTS telegram_subscriptions_deliverable_idx
  ON public.telegram_subscriptions (email, confirmed, active)
  WHERE confirmed = true AND active = true;

-- RLS — service_role manages the table; no anon or authenticated client access
ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access"
  ON public.telegram_subscriptions
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_telegram_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_telegram_subscriptions_updated_at
  ON public.telegram_subscriptions;

CREATE TRIGGER set_telegram_subscriptions_updated_at
  BEFORE UPDATE ON public.telegram_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_telegram_subscriptions_updated_at();
