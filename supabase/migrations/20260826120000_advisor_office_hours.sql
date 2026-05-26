-- Migration: advisor_office_hours + office_hour_questions + rsvps + upvotes
--
-- Adds:
--   advisor_office_hours        — live Q&A sessions created by advisors
--   office_hour_questions       — questions submitted by users; answered by advisor
--   office_hour_rsvps           — users RSVP to attend a session
--   office_hour_upvotes         — one vote per user per question; drives sort order
--
-- Realtime: office_hour_questions subscribes to INSERT + UPDATE via
--   supabase.channel('office-hours-<id>').on('postgres_changes', ...).subscribe()
--
-- Rollback:
--   DROP TABLE IF EXISTS office_hour_upvotes, office_hour_rsvps,
--     office_hour_questions, advisor_office_hours CASCADE;

BEGIN;

-- ── advisor_office_hours ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor_office_hours (
  id               bigserial PRIMARY KEY,
  advisor_id       bigint NOT NULL REFERENCES professionals (id) ON DELETE CASCADE,
  title            text NOT NULL CHECK (char_length(title) <= 200),
  description      text,
  scheduled_at     timestamptz NOT NULL,
  ends_at          timestamptz,
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'upcoming', 'live', 'ended', 'transcript')),
  max_questions    integer NOT NULL DEFAULT 20 CHECK (max_questions BETWEEN 1 AND 100),
  rsvp_count       integer NOT NULL DEFAULT 0,
  is_published     boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_hours_status
  ON advisor_office_hours (status, scheduled_at)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_office_hours_advisor
  ON advisor_office_hours (advisor_id, scheduled_at DESC);

ALTER TABLE advisor_office_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_office_hours FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_hours_public_read"    ON advisor_office_hours;
DROP POLICY IF EXISTS "office_hours_advisor_insert" ON advisor_office_hours;
DROP POLICY IF EXISTS "office_hours_advisor_update" ON advisor_office_hours;
DROP POLICY IF EXISTS "office_hours_service_all"    ON advisor_office_hours;

CREATE POLICY "office_hours_public_read"
  ON advisor_office_hours FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Advisor can insert and update their own sessions (service-role for portal API).
CREATE POLICY "office_hours_service_all"
  ON advisor_office_hours FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── office_hour_questions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS office_hour_questions (
  id             bigserial PRIMARY KEY,
  session_id     bigint NOT NULL REFERENCES advisor_office_hours (id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  display_name   text NOT NULL,
  question       text NOT NULL CHECK (char_length(question) BETWEEN 5 AND 500),
  is_anonymous   boolean NOT NULL DEFAULT false,
  answer         text,
  answered_at    timestamptz,
  upvote_count   integer NOT NULL DEFAULT 0,
  is_removed     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_hour_questions_session
  ON office_hour_questions (session_id, upvote_count DESC)
  WHERE is_removed = false;

ALTER TABLE office_hour_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_hour_questions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ohq_public_read"   ON office_hour_questions;
DROP POLICY IF EXISTS "ohq_user_insert"   ON office_hour_questions;
DROP POLICY IF EXISTS "ohq_service_all"   ON office_hour_questions;

CREATE POLICY "ohq_public_read"
  ON office_hour_questions FOR SELECT
  TO anon, authenticated
  USING (is_removed = false);

CREATE POLICY "ohq_user_insert"
  ON office_hour_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ohq_service_all"
  ON office_hour_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── office_hour_rsvps ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS office_hour_rsvps (
  id           bigserial PRIMARY KEY,
  session_id   bigint NOT NULL REFERENCES advisor_office_hours (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reminded_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_office_hour_rsvps_session
  ON office_hour_rsvps (session_id);

ALTER TABLE office_hour_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_hour_rsvps FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ohr_own_read"    ON office_hour_rsvps;
DROP POLICY IF EXISTS "ohr_own_insert"  ON office_hour_rsvps;
DROP POLICY IF EXISTS "ohr_own_delete"  ON office_hour_rsvps;
DROP POLICY IF EXISTS "ohr_service_all" ON office_hour_rsvps;

CREATE POLICY "ohr_own_read"
  ON office_hour_rsvps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ohr_own_insert"
  ON office_hour_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ohr_own_delete"
  ON office_hour_rsvps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ohr_service_all"
  ON office_hour_rsvps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── office_hour_upvotes ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS office_hour_upvotes (
  id           bigserial PRIMARY KEY,
  question_id  bigint NOT NULL REFERENCES office_hour_questions (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_office_hour_upvotes_question
  ON office_hour_upvotes (question_id);

ALTER TABLE office_hour_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_hour_upvotes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ohu_own_read"    ON office_hour_upvotes;
DROP POLICY IF EXISTS "ohu_own_insert"  ON office_hour_upvotes;
DROP POLICY IF EXISTS "ohu_own_delete"  ON office_hour_upvotes;
DROP POLICY IF EXISTS "ohu_service_all" ON office_hour_upvotes;

CREATE POLICY "ohu_own_read"
  ON office_hour_upvotes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ohu_own_insert"
  ON office_hour_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ohu_own_delete"
  ON office_hour_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ohu_service_all"
  ON office_hour_upvotes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── RPC helpers for atomic upvote counting ────────────────────────────────────
-- Called from the upvote API endpoint so the UPDATE fires a Realtime event
-- on office_hour_questions (live viewers see the count change immediately).

CREATE OR REPLACE FUNCTION increment_oh_upvote(question_id_arg bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE office_hour_questions
  SET upvote_count = upvote_count + 1
  WHERE id = question_id_arg;
$$;

CREATE OR REPLACE FUNCTION decrement_oh_upvote(question_id_arg bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE office_hour_questions
  SET upvote_count = GREATEST(0, upvote_count - 1)
  WHERE id = question_id_arg;
$$;

COMMIT;
