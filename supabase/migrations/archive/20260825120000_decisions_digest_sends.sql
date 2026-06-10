-- Migration: decisions_digest_sends — deduplication table for weekly
-- unfinished-business digest (Fridays, tied to weekly_digest pref).
--
-- Why:
--   PR 3.2 adds a Friday email summarising the user's open decision-inbox
--   items. digest_sends is Monday-only (can't share the (user_id, date)
--   key), so a separate table is the clean dedup path.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.decisions_digest_sends;

BEGIN;

CREATE TABLE IF NOT EXISTS public.decisions_digest_sends (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  send_date   date NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  item_count  integer NOT NULL DEFAULT 0,
  high_count  integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, send_date)
);

CREATE INDEX IF NOT EXISTS decisions_digest_sends_user_idx
  ON public.decisions_digest_sends (user_id);

CREATE INDEX IF NOT EXISTS decisions_digest_sends_date_idx
  ON public.decisions_digest_sends (send_date);

ALTER TABLE public.decisions_digest_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions_digest_sends FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decisions_digest_sends_own_read" ON public.decisions_digest_sends;
CREATE POLICY "decisions_digest_sends_own_read"
  ON public.decisions_digest_sends
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "decisions_digest_sends_service_all" ON public.decisions_digest_sends;
CREATE POLICY "decisions_digest_sends_service_all"
  ON public.decisions_digest_sends
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
