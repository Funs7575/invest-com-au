-- Migration: morning_brief — notification preference flag + daily send log
--
-- Why:
--   PR 3.1 adds a personalised opt-in daily brief delivered at 8 AM AEDT.
--   notification_preferences needs a morning_brief column so the cron can
--   select only opted-in users, and morning_brief_sends deduplicates sends
--   the same way digest_sends does for the weekly digest.
--
-- Rollback strategy:
--   ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS morning_brief;
--   DROP TABLE IF EXISTS public.morning_brief_sends;

BEGIN;

-- ── notification_preferences — morning_brief flag ─────────────────────────────

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS morning_brief boolean NOT NULL DEFAULT false;

-- ── morning_brief_sends — deduplication log ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.morning_brief_sends (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  send_date       date NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  sections_included text[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, send_date)
);

CREATE INDEX IF NOT EXISTS morning_brief_sends_user_idx
  ON public.morning_brief_sends (user_id);

CREATE INDEX IF NOT EXISTS morning_brief_sends_date_idx
  ON public.morning_brief_sends (send_date);

ALTER TABLE public.morning_brief_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morning_brief_sends FORCE ROW LEVEL SECURITY;

-- Users can read their own send history (e.g. "last sent" in the UI)
DROP POLICY IF EXISTS "morning_brief_sends_own_read" ON public.morning_brief_sends;
CREATE POLICY "morning_brief_sends_own_read"
  ON public.morning_brief_sends
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access for the cron (INSERT + SELECT for dedup check)
DROP POLICY IF EXISTS "morning_brief_sends_service_all" ON public.morning_brief_sends;
CREATE POLICY "morning_brief_sends_service_all"
  ON public.morning_brief_sends
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
