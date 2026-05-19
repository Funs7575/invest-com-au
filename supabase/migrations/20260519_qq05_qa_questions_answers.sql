-- Migration: 20260519_qq05_qa_questions_answers.sql
-- Date: 2026-05-19
-- Audit ref: codebase-health-2026-04-24.md
-- Queue item: QQ-05 — public Q&A capture schema (qa_questions + qa_answers)
--
-- Why (in user terms):
--   The QuestionCaptureForm component (QQ-04, shipped in PR #800) lets visitors
--   submit investing questions for the research desk to answer. Without the
--   backing tables and API route, form submissions return 404. This migration
--   creates the storage layer: qa_questions (user submissions, moderated) and
--   qa_answers (editorial/AI answers, published after approval).
--
-- IMPORTANT — prior policy state:
--   No prior CREATE TABLE, ENABLE ROW LEVEL SECURITY, or CREATE POLICY entries
--   exist for qa_questions or qa_answers in any migration. These are brand-new
--   tables. Confirmed via: grep -rn "qa_questions\|qa_answers" supabase/migrations/
--
-- Idempotency:
--   All CREATE TABLE statements use IF NOT EXISTS. Policy drops use IF EXISTS.
--   Re-running this migration is a safe no-op.
--
-- Rollback:
--   DROP TABLE IF EXISTS qa_answers;
--   DROP TABLE IF EXISTS qa_questions;
--   (Removes all user-submitted questions. Only roll back if no questions have
--   been received in production — check qa_questions count first.)
--
-- TODO: human review of policy semantics — anonymous INSERT is intentional
-- (public Q&A capture requires no auth), but review the anon SELECT scope
-- before enabling AI-powered answer display in QQ-09.

BEGIN;

-- ─────────────────────────────────────────────
-- 1. qa_questions — public investing questions submitted by visitors
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qa_questions (
  id             BIGSERIAL PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE, -- short reference shown to submitter (e.g. qqq20260519abc)
  question_text  TEXT NOT NULL CHECK (char_length(question_text) BETWEEN 10 AND 500),
  category       TEXT NOT NULL DEFAULT 'general',
  email          TEXT,                 -- optional; notified when answer published
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_note TEXT,                -- admin rejection reason (not shown to public)
  source_ip_hash  TEXT,                -- SHA-256(ip + salt), for spam detection; not PII
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_questions FORCE ROW LEVEL SECURITY;

-- Anonymous: INSERT (public question capture — core use case)
DROP POLICY IF EXISTS "anon_insert_qa_questions" ON qa_questions;
CREATE POLICY "anon_insert_qa_questions" ON qa_questions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Anonymous: SELECT approved questions only (for future public browse surface)
DROP POLICY IF EXISTS "anon_select_approved_qa_questions" ON qa_questions;
CREATE POLICY "anon_select_approved_qa_questions" ON qa_questions
  FOR SELECT TO anon
  USING (status = 'approved');

-- Authenticated users: same as anon for reads (no ownership linkage; anon submissions have no user_id)
DROP POLICY IF EXISTS "authenticated_select_approved_qa_questions" ON qa_questions;
CREATE POLICY "authenticated_select_approved_qa_questions" ON qa_questions
  FOR SELECT TO authenticated
  USING (status = 'approved');

-- Service role: full access (admin moderation, AI answer generation, cron jobs)
DROP POLICY IF EXISTS "service_role_all_qa_questions" ON qa_questions;
CREATE POLICY "service_role_all_qa_questions" ON qa_questions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 2. qa_answers — editorial/AI answers to approved questions
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS qa_answers (
  id          BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'editorial'
                CHECK (source IN ('editorial', 'ai', 'community')),
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  published_at TIMESTAMPTZ, -- set when status transitions to 'approved'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_answers FORCE ROW LEVEL SECURITY;

-- Anonymous: SELECT published answers only
DROP POLICY IF EXISTS "anon_select_published_qa_answers" ON qa_answers;
CREATE POLICY "anon_select_published_qa_answers" ON qa_answers
  FOR SELECT TO anon
  USING (status = 'approved' AND published_at IS NOT NULL);

-- Authenticated: same as anon for reads
DROP POLICY IF EXISTS "authenticated_select_published_qa_answers" ON qa_answers;
CREATE POLICY "authenticated_select_published_qa_answers" ON qa_answers
  FOR SELECT TO authenticated
  USING (status = 'approved' AND published_at IS NOT NULL);

-- Service role: full access (moderation, AI answer insertion, admin panel)
DROP POLICY IF EXISTS "service_role_all_qa_answers" ON qa_answers;
CREATE POLICY "service_role_all_qa_answers" ON qa_answers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 3. Performance indexes
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_qa_questions_status ON qa_questions(status);
CREATE INDEX IF NOT EXISTS idx_qa_questions_category ON qa_questions(category);
CREATE INDEX IF NOT EXISTS idx_qa_questions_created_at ON qa_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_answers_question_id ON qa_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_qa_answers_status ON qa_answers(status);

COMMIT;
