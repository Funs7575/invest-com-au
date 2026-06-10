-- Migration: forum_confessions_debate — anonymous confessions + expert debate (PR 4.4).
--
-- forum_threads gains:
--   thread_type ('discussion' | 'confessions' | 'debate') — default 'discussion'
--   is_anonymous — OP hides real author behind "Anonymous Investor"
--
-- forum_posts gains:
--   is_anonymous   — per-reply anonymity toggle
--   post_type      ('reply' | 'debate') — debate posts carry a bull/bear position
--   debate_position ('bull' | 'bear')  — only meaningful when post_type = 'debate'
--
-- debate_votes: community bull/bear side-poll attached to a debate thread.
--   One vote per (thread_id, voter_user_id) — upsert to change position.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.debate_votes;
--   ALTER TABLE public.forum_posts
--     DROP COLUMN IF EXISTS is_anonymous,
--     DROP COLUMN IF EXISTS post_type,
--     DROP COLUMN IF EXISTS debate_position;
--   ALTER TABLE public.forum_threads
--     DROP COLUMN IF EXISTS is_anonymous,
--     DROP COLUMN IF EXISTS thread_type;

BEGIN;

-- ── forum_threads ─────────────────────────────────────────────────────────────

ALTER TABLE public.forum_threads
  ADD COLUMN IF NOT EXISTS thread_type text NOT NULL DEFAULT 'discussion'
    CHECK (thread_type IN ('discussion', 'confessions', 'debate')),
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_forum_threads_type
  ON public.forum_threads (thread_type, created_at DESC)
  WHERE is_removed = false;

-- ── forum_posts ───────────────────────────────────────────────────────────────

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'reply'
    CHECK (post_type IN ('reply', 'debate')),
  ADD COLUMN IF NOT EXISTS debate_position text
    CHECK (debate_position IS NULL OR debate_position IN ('bull', 'bear'));

CREATE INDEX IF NOT EXISTS idx_forum_posts_debate_position
  ON public.forum_posts (thread_id, debate_position)
  WHERE debate_position IS NOT NULL;

-- ── debate_votes ──────────────────────────────────────────────────────────────
-- Community bull/bear side-poll on a debate thread.
-- One row per (thread_id, voter_user_id) — UPDATE to change side.

CREATE TABLE IF NOT EXISTS public.debate_votes (
  id             bigserial PRIMARY KEY,
  thread_id      bigint NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  voter_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position       text NOT NULL CHECK (position IN ('bull', 'bear')),
  voted_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS debate_votes_thread_idx
  ON public.debate_votes (thread_id);

CREATE INDEX IF NOT EXISTS debate_votes_voter_idx
  ON public.debate_votes (voter_user_id);

ALTER TABLE public.debate_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_votes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debate_votes_public_read" ON public.debate_votes;
CREATE POLICY "debate_votes_public_read"
  ON public.debate_votes FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "debate_votes_own_insert" ON public.debate_votes;
CREATE POLICY "debate_votes_own_insert"
  ON public.debate_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = voter_user_id);

DROP POLICY IF EXISTS "debate_votes_own_update" ON public.debate_votes;
CREATE POLICY "debate_votes_own_update"
  ON public.debate_votes FOR UPDATE
  USING (auth.uid() = voter_user_id)
  WITH CHECK (auth.uid() = voter_user_id);

DROP POLICY IF EXISTS "debate_votes_own_delete" ON public.debate_votes;
CREATE POLICY "debate_votes_own_delete"
  ON public.debate_votes FOR DELETE
  USING (auth.uid() = voter_user_id);

DROP POLICY IF EXISTS "debate_votes_service_all" ON public.debate_votes;
CREATE POLICY "debate_votes_service_all"
  ON public.debate_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
