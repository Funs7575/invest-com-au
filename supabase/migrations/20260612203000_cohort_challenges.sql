-- Migration: cohort_challenges — time-boxed group programs with shared progress.
--
-- Idea #20 (docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS.md). Cohort
-- Challenges are time-boxed, task/learning-based programs ("Get
-- Investment-Ready in 21 days", "EOFY Sprint") that walk a user through real
-- existing surfaces — set a goal, run the health check, read a lesson — with
-- personal + anonymised cohort progress, an optional linked club room, and a
-- completion certificate. Strictly task/learning-based: there is NO
-- portfolio-performance competition, NO leaderboard of returns, and no
-- user-vs-user money comparison. General-information framing only.
--
-- Three tables:
--   challenges                  — one row per cohort run. The curriculum itself
--                                 (daily tasks) is code-defined in
--                                 lib/challenges/; `curriculum_key` joins a row
--                                 to its code curriculum. Marketing pages, so
--                                 public SELECT.
--   challenge_enrolments        — one row per (challenge, user). Carries
--                                 enrolment + completion timestamps, the minted
--                                 certificate id (challenge certificates live
--                                 here, NOT in course_certificates which is
--                                 course-bound via a NOT NULL course_id +
--                                 UNIQUE(user_id, course_id)), and a `status`
--                                 that doubles as the next-cohort waitlist
--                                 ('waitlisted' when enrolment_open = false).
--   challenge_task_completions  — one row per (enrolment, task_key). Append-only
--                                 personal progress; UNIQUE keeps completions
--                                 idempotent. Cohort aggregates are COUNT-only
--                                 reads across this table (no identities), and
--                                 the UI suppresses any bucket below n=5.
--
-- Everything is dormant behind the `cohort_challenges` feature flag at the
-- application layer until launch; this migration only creates the schema.
--
-- RLS:
--   challenges                 — public SELECT (anon + authenticated): these are
--                                marketing/landing pages. Writes are
--                                service_role only (admin scheduling / cron).
--   challenge_enrolments       — owner policies keyed on auth.uid() = user_id
--                                (select/insert/update/delete), plus service_role
--                                ALL for cron (daily nudge) and admin.
--   challenge_task_completions — owner policies scoped through the parent
--                                enrolment's user_id, plus service_role ALL.
--                                Cohort-wide COUNT aggregates run under
--                                service_role (a legitimate cross-user read per
--                                CLAUDE.md), never leaking row identities.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.challenge_task_completions;
--   DROP TABLE IF EXISTS public.challenge_enrolments;
--   DROP TABLE IF EXISTS public.challenges;

BEGIN;

-- ── challenges ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  -- Joins this cohort row to its code-defined curriculum in lib/challenges/.
  curriculum_key text NOT NULL,
  starts_at date,
  ends_at date,
  enrolment_open boolean NOT NULL DEFAULT true,
  max_cohort integer,
  -- Optional auto-/manually-linked investment club room for this cohort.
  club_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (slug),
  CONSTRAINT challenges_dates_chk CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT challenges_max_cohort_chk CHECK (max_cohort IS NULL OR max_cohort > 0)
);

CREATE INDEX IF NOT EXISTS idx_challenges_curriculum_key
  ON public.challenges (curriculum_key);
CREATE INDEX IF NOT EXISTS idx_challenges_starts_at
  ON public.challenges (starts_at);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Public marketing pages: anyone may read.
DROP POLICY IF EXISTS "Challenges are publicly readable" ON public.challenges;
CREATE POLICY "Challenges are publicly readable"
  ON public.challenges FOR SELECT TO anon, authenticated USING (true);

-- Only service_role writes (admin scheduling / cron).
DROP POLICY IF EXISTS "Service role manages challenges" ON public.challenges;
CREATE POLICY "Service role manages challenges"
  ON public.challenges FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── challenge_enrolments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_enrolments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  -- 'enrolled' = active participant; 'waitlisted' = joined while the cohort was
  -- closed (enrolment_open = false), emailed when the next cohort opens.
  status text NOT NULL DEFAULT 'enrolled'
    CHECK (status IN ('enrolled', 'waitlisted')),
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  -- Challenge completion certificate (course_certificates is course-bound, so
  -- challenge certificates are stored inline here). Unguessable lookup key.
  certificate_id text,
  certificate_issued_at timestamp with time zone,
  -- Idempotency for the daily nudge: the date (UTC) of the last nudge sent.
  last_nudge_on date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (challenge_id, user_id),
  UNIQUE (certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_enrolments_user
  ON public.challenge_enrolments (user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_enrolments_challenge
  ON public.challenge_enrolments (challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_enrolments_status
  ON public.challenge_enrolments (status);

ALTER TABLE public.challenge_enrolments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own challenge enrolments" ON public.challenge_enrolments;
CREATE POLICY "Users read own challenge enrolments"
  ON public.challenge_enrolments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own challenge enrolments" ON public.challenge_enrolments;
CREATE POLICY "Users create own challenge enrolments"
  ON public.challenge_enrolments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own challenge enrolments" ON public.challenge_enrolments;
CREATE POLICY "Users update own challenge enrolments"
  ON public.challenge_enrolments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own challenge enrolments" ON public.challenge_enrolments;
CREATE POLICY "Users delete own challenge enrolments"
  ON public.challenge_enrolments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages challenge enrolments" ON public.challenge_enrolments;
CREATE POLICY "Service role manages challenge enrolments"
  ON public.challenge_enrolments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── challenge_task_completions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES public.challenge_enrolments(id) ON DELETE CASCADE,
  task_key text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (enrolment_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_challenge_task_completions_enrolment
  ON public.challenge_task_completions (enrolment_id);

ALTER TABLE public.challenge_task_completions ENABLE ROW LEVEL SECURITY;

-- Owner access scoped through the parent enrolment's user_id.
DROP POLICY IF EXISTS "Users read own task completions" ON public.challenge_task_completions;
CREATE POLICY "Users read own task completions"
  ON public.challenge_task_completions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.challenge_enrolments e
    WHERE e.id = challenge_task_completions.enrolment_id
      AND e.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users create own task completions" ON public.challenge_task_completions;
CREATE POLICY "Users create own task completions"
  ON public.challenge_task_completions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.challenge_enrolments e
    WHERE e.id = challenge_task_completions.enrolment_id
      AND e.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users delete own task completions" ON public.challenge_task_completions;
CREATE POLICY "Users delete own task completions"
  ON public.challenge_task_completions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.challenge_enrolments e
    WHERE e.id = challenge_task_completions.enrolment_id
      AND e.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role manages task completions" ON public.challenge_task_completions;
CREATE POLICY "Service role manages task completions"
  ON public.challenge_task_completions FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
