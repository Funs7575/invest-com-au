-- ============================================================================
-- Migration: 009_quiz_follow_up.sql
-- Purpose: Quiz follow-up drip email tracking table — records which
--          follow-up emails have been sent to quiz leads, to prevent
--          duplicate sends.
-- Rollback: drop both indexes, then DROP TABLE quiz_follow_ups (RLS is
--           dropped implicitly with the table).
-- Risk: low — additive only; new isolated table with no FK dependents.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS quiz_follow_ups (...);
--   2. CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_follow_ups_email_type
--        ON quiz_follow_ups (email, drip_type);
--   3. CREATE INDEX IF NOT EXISTS idx_quiz_follow_ups_email
--        ON quiz_follow_ups (email);
--   4. ALTER TABLE quiz_follow_ups ENABLE ROW LEVEL SECURITY;
--      -- (no policies = service-role-only access)
--
-- Rollback (in reverse order):
--   1. DROP INDEX IF EXISTS idx_quiz_follow_ups_email;
--   2. DROP INDEX IF EXISTS idx_quiz_follow_ups_email_type;
--   3. DROP TABLE IF EXISTS quiz_follow_ups;
--      -- RLS state is dropped implicitly with the table.
--

-- Quiz follow-up drip email tracking table
-- Tracks which follow-up emails have been sent to quiz leads to prevent duplicates.

CREATE TABLE IF NOT EXISTS quiz_follow_ups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  drip_type TEXT NOT NULL, -- 'quiz_followup_1', 'quiz_followup_2', 'quiz_followup_3'
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent duplicate drips (one of each type per email)
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_follow_ups_email_type
  ON quiz_follow_ups (email, drip_type);

-- Fast lookup by email
CREATE INDEX IF NOT EXISTS idx_quiz_follow_ups_email
  ON quiz_follow_ups (email);

-- RLS: only service role can access (no public policies = deny all for anon/authenticated)
ALTER TABLE quiz_follow_ups ENABLE ROW LEVEL SECURITY;
