-- ============================================================================
-- Migration: 20260514_mm10_pro_intake_questions.sql
-- Purpose: MM-10 — Pro intake question customisation.
--
--   Adds `pro_intake_questions` (1-5 custom prompts per professional or
--   expert_team owner) and `pro_intake_answers` (consumer responses keyed to a
--   `advisor_auctions.id`/`brief_id`). Lets a professional or expert_team gate
--   the post-accept handoff behind 1-5 short qualifying prompts so the first
--   conversation lands with the context the pro needs.
--
--   Owner is exactly one of `professional_id` OR `team_id` (CHECK enforced).
--   The 1-5 cap is enforced in API code (`lib/pro-intake.ts`) — keeping it out
--   of a trigger lets us return a friendly 4xx message without race-trapping
--   on the DB.
--
-- Idempotent: CREATE TABLE/INDEX/POLICY all use IF NOT EXISTS or DROP-then-CREATE.
--
-- Rollback (destructive):
--   DROP TABLE IF EXISTS public.pro_intake_answers;
--   DROP TABLE IF EXISTS public.pro_intake_questions;
--
-- Risk: low — new tables, no changes to existing data.
-- ============================================================================

BEGIN;

-- ── 1. pro_intake_questions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_intake_questions (
  id            bigserial PRIMARY KEY,
  owner_kind    text NOT NULL CHECK (owner_kind IN ('professional', 'team')),
  professional_id int REFERENCES public.professionals(id) ON DELETE CASCADE,
  team_id       int REFERENCES public.expert_teams(id) ON DELETE CASCADE,
  prompt        text NOT NULL,
  kind          text NOT NULL DEFAULT 'text'
                  CHECK (kind IN ('text', 'number', 'select', 'phone', 'email')),
  options       jsonb NOT NULL DEFAULT '[]'::jsonb,
  required      boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of professional_id / team_id is set, and it lines up with owner_kind.
  CONSTRAINT pro_intake_questions_owner_one_of CHECK (
    (owner_kind = 'professional' AND professional_id IS NOT NULL AND team_id IS NULL)
    OR
    (owner_kind = 'team'         AND team_id         IS NOT NULL AND professional_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_pro_intake_questions_professional
  ON public.pro_intake_questions (professional_id, enabled, sort_order)
  WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pro_intake_questions_team
  ON public.pro_intake_questions (team_id, enabled, sort_order)
  WHERE team_id IS NOT NULL;

-- ── 2. pro_intake_answers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pro_intake_answers (
  id           bigserial PRIMARY KEY,
  brief_id     int NOT NULL REFERENCES public.advisor_auctions(id) ON DELETE CASCADE,
  question_id  int NOT NULL REFERENCES public.pro_intake_questions(id) ON DELETE CASCADE,
  answer       text NOT NULL,
  answered_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pro_intake_answers_brief_question_unique UNIQUE (brief_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_intake_answers_brief
  ON public.pro_intake_answers (brief_id);

-- ── 3. RLS on pro_intake_questions ──────────────────────────────────────────
ALTER TABLE public.pro_intake_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_intake_questions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access pro_intake_questions"
  ON public.pro_intake_questions;
CREATE POLICY "service_role full access pro_intake_questions"
  ON public.pro_intake_questions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT — anyone signed in can read enabled questions so the
-- consumer-side intake page can render them without a service-role hop.
DROP POLICY IF EXISTS "Authenticated read enabled intake questions"
  ON public.pro_intake_questions;
CREATE POLICY "Authenticated read enabled intake questions"
  ON public.pro_intake_questions
  FOR SELECT
  TO authenticated
  USING (enabled = true);

-- Owner INSERT — must own the professional row or be an active team member.
DROP POLICY IF EXISTS "Owner insert intake questions"
  ON public.pro_intake_questions;
CREATE POLICY "Owner insert intake questions"
  ON public.pro_intake_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (owner_kind = 'professional' AND professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    ))
    OR
    (owner_kind = 'team' AND team_id IN (
      SELECT m.team_id
        FROM public.expert_team_members m
        JOIN public.professionals p ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    ))
  );

-- Owner UPDATE — same predicate, applied to existing row.
DROP POLICY IF EXISTS "Owner update intake questions"
  ON public.pro_intake_questions;
CREATE POLICY "Owner update intake questions"
  ON public.pro_intake_questions
  FOR UPDATE
  TO authenticated
  USING (
    (owner_kind = 'professional' AND professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    ))
    OR
    (owner_kind = 'team' AND team_id IN (
      SELECT m.team_id
        FROM public.expert_team_members m
        JOIN public.professionals p ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    ))
  )
  WITH CHECK (
    (owner_kind = 'professional' AND professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    ))
    OR
    (owner_kind = 'team' AND team_id IN (
      SELECT m.team_id
        FROM public.expert_team_members m
        JOIN public.professionals p ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    ))
  );

-- Owner DELETE.
DROP POLICY IF EXISTS "Owner delete intake questions"
  ON public.pro_intake_questions;
CREATE POLICY "Owner delete intake questions"
  ON public.pro_intake_questions
  FOR DELETE
  TO authenticated
  USING (
    (owner_kind = 'professional' AND professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    ))
    OR
    (owner_kind = 'team' AND team_id IN (
      SELECT m.team_id
        FROM public.expert_team_members m
        JOIN public.professionals p ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    ))
  );

-- ── 4. RLS on pro_intake_answers ────────────────────────────────────────────
ALTER TABLE public.pro_intake_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_intake_answers FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access pro_intake_answers"
  ON public.pro_intake_answers;
CREATE POLICY "service_role full access pro_intake_answers"
  ON public.pro_intake_answers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated SELECT — the brief owner (matches advisor_auctions.contact_email
-- against the signed-in auth.users email) or the accepting professional / team
-- member can read the answers. Anonymous consumers (no auth.uid()) go through
-- the admin client in `lib/pro-intake.ts` with explicit ownership checks.
DROP POLICY IF EXISTS "Brief owner or acceptor read intake answers"
  ON public.pro_intake_answers;
CREATE POLICY "Brief owner or acceptor read intake answers"
  ON public.pro_intake_answers
  FOR SELECT
  TO authenticated
  USING (
    brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.professionals p
          ON p.id = a.accepted_by_professional_id
       WHERE p.auth_user_id = auth.uid()
    )
    OR brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN public.expert_team_members m
          ON m.team_id = a.accepted_by_team_id
        JOIN public.professionals p
          ON p.id = m.professional_id
       WHERE p.auth_user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- Authenticated INSERT — only the brief owner (email match) can submit answers.
-- Anonymous consumers (no Supabase JWT) submit through the admin-client API
-- path which checks ownership against the brief's recorded contact_email.
DROP POLICY IF EXISTS "Brief owner insert intake answers"
  ON public.pro_intake_answers;
CREATE POLICY "Brief owner insert intake answers"
  ON public.pro_intake_answers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    brief_id IN (
      SELECT a.id
        FROM public.advisor_auctions a
        JOIN auth.users u ON u.id = auth.uid()
       WHERE lower(a.contact_email) = lower(u.email)
    )
  );

COMMIT;
