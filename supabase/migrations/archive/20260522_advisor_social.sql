-- Migration: 20260522_advisor_social.sql
--
-- Advisor social layer: posts, follows, and reactions.
-- Advisors can post updates/insights; follow each other; react to posts.
-- All tables have RLS enabled. Posts are public-readable when published.
--
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before each
-- CREATE POLICY; idempotent CHECK constraints.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_post_reactions CASCADE;
--   DROP TABLE IF EXISTS public.advisor_follows CASCADE;
--   DROP TABLE IF EXISTS public.advisor_posts CASCADE;

BEGIN;

-- ─── advisor_posts ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_posts (
  id              SERIAL PRIMARY KEY,
  professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  post_type       TEXT NOT NULL DEFAULT 'update'
    CHECK (post_type IN ('update', 'insight', 'question', 'resource')),
  link_url        TEXT,
  link_title      TEXT,
  image_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'hidden', 'deleted')),
  reaction_count  INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_posts_professional
  ON public.advisor_posts (professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_posts_status
  ON public.advisor_posts (status, created_at DESC);

ALTER TABLE public.advisor_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_posts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_posts_public_read" ON public.advisor_posts;
CREATE POLICY "advisor_posts_public_read"
  ON public.advisor_posts FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "advisor_posts_owner_select" ON public.advisor_posts;
CREATE POLICY "advisor_posts_owner_select"
  ON public.advisor_posts FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advisor_posts_owner_write" ON public.advisor_posts;
CREATE POLICY "advisor_posts_owner_write"
  ON public.advisor_posts FOR ALL
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "advisor_posts_service_role" ON public.advisor_posts;
CREATE POLICY "advisor_posts_service_role"
  ON public.advisor_posts TO service_role
  USING (true) WITH CHECK (true);

-- ─── advisor_follows ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_follows (
  id                    SERIAL PRIMARY KEY,
  follower_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_professional_id INTEGER NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_user_id, following_professional_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_follows_follower
  ON public.advisor_follows (follower_user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_follows_following
  ON public.advisor_follows (following_professional_id);

ALTER TABLE public.advisor_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_follows FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_follows_user_select" ON public.advisor_follows;
CREATE POLICY "advisor_follows_user_select"
  ON public.advisor_follows FOR SELECT
  TO authenticated
  USING (follower_user_id = auth.uid());

DROP POLICY IF EXISTS "advisor_follows_user_write" ON public.advisor_follows;
CREATE POLICY "advisor_follows_user_write"
  ON public.advisor_follows FOR ALL
  TO authenticated
  USING (follower_user_id = auth.uid())
  WITH CHECK (follower_user_id = auth.uid());

DROP POLICY IF EXISTS "advisor_follows_service_role" ON public.advisor_follows;
CREATE POLICY "advisor_follows_service_role"
  ON public.advisor_follows TO service_role
  USING (true) WITH CHECK (true);

-- Allow public count of followers per advisor (for profile display)
DROP POLICY IF EXISTS "advisor_follows_public_count" ON public.advisor_follows;
CREATE POLICY "advisor_follows_public_count"
  ON public.advisor_follows FOR SELECT
  USING (true);

-- ─── advisor_post_reactions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.advisor_post_reactions (
  id            SERIAL PRIMARY KEY,
  post_id       INTEGER NOT NULL REFERENCES public.advisor_posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like'
    CHECK (reaction_type IN ('like', 'insightful', 'celebrate')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_post_reactions_post
  ON public.advisor_post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_advisor_post_reactions_user
  ON public.advisor_post_reactions (user_id);

ALTER TABLE public.advisor_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_post_reactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_post_reactions_public_read" ON public.advisor_post_reactions;
CREATE POLICY "advisor_post_reactions_public_read"
  ON public.advisor_post_reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "advisor_post_reactions_user_write" ON public.advisor_post_reactions;
CREATE POLICY "advisor_post_reactions_user_write"
  ON public.advisor_post_reactions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "advisor_post_reactions_service_role" ON public.advisor_post_reactions;
CREATE POLICY "advisor_post_reactions_service_role"
  ON public.advisor_post_reactions TO service_role
  USING (true) WITH CHECK (true);

-- ─── follower_count on professionals ─────────────────────────────────────────

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS follower_count INTEGER NOT NULL DEFAULT 0;

COMMIT;
