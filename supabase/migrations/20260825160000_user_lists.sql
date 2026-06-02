-- Migration: user_lists — public shareable shortlists (PR 4.2).
--
-- user_lists: one list per row. is_public=true lists are readable by anyone.
-- user_list_items: individual items (broker/etf/article/advisor) in a list.
-- user_list_follows: join table for following a public list.
--
-- item_count + follower_count are kept in sync by the application layer
-- (increment/decrement on insert/delete) — no triggers, simpler to maintain.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.user_list_follows;
--   DROP TABLE IF EXISTS public.user_list_items;
--   DROP TABLE IF EXISTS public.user_lists;

BEGIN;

-- ── user_lists ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_lists (
  id               bigserial PRIMARY KEY,
  owner_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  description      text NOT NULL DEFAULT '',
  slug             text NOT NULL UNIQUE,
  is_public        boolean NOT NULL DEFAULT false,
  item_count       integer NOT NULL DEFAULT 0,
  follower_count   integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_lists_owner_idx
  ON public.user_lists (owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_lists_public_idx
  ON public.user_lists (is_public, follower_count DESC)
  WHERE is_public = true;

ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lists FORCE ROW LEVEL SECURITY;

-- Owner can do everything.
DROP POLICY IF EXISTS "user_lists_owner_all" ON public.user_lists;
CREATE POLICY "user_lists_owner_all"
  ON public.user_lists
  FOR ALL
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Anyone can read public lists.
DROP POLICY IF EXISTS "user_lists_public_read" ON public.user_lists;
CREATE POLICY "user_lists_public_read"
  ON public.user_lists
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "user_lists_service_all" ON public.user_lists;
CREATE POLICY "user_lists_service_all"
  ON public.user_lists
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── user_list_items ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_list_items (
  id          bigserial PRIMARY KEY,
  list_id     bigint NOT NULL REFERENCES public.user_lists(id) ON DELETE CASCADE,
  item_type   text NOT NULL
    CHECK (item_type IN ('broker', 'etf', 'article', 'advisor', 'property')),
  item_ref    text NOT NULL,   -- slug or identifier
  label       text NOT NULL DEFAULT '',
  notes       text NOT NULL DEFAULT '',
  added_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, item_type, item_ref)
);

CREATE INDEX IF NOT EXISTS user_list_items_list_idx
  ON public.user_list_items (list_id);

ALTER TABLE public.user_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_list_items FORCE ROW LEVEL SECURITY;

-- Owner's items — full access.
DROP POLICY IF EXISTS "user_list_items_owner_all" ON public.user_list_items;
CREATE POLICY "user_list_items_owner_all"
  ON public.user_list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_lists
      WHERE id = list_id AND owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_lists
      WHERE id = list_id AND owner_user_id = auth.uid()
    )
  );

-- Items in a public list — readable by anyone.
DROP POLICY IF EXISTS "user_list_items_public_read" ON public.user_list_items;
CREATE POLICY "user_list_items_public_read"
  ON public.user_list_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_lists
      WHERE id = list_id AND is_public = true
    )
  );

DROP POLICY IF EXISTS "user_list_items_service_all" ON public.user_list_items;
CREATE POLICY "user_list_items_service_all"
  ON public.user_list_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── user_list_follows ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_list_follows (
  id                bigserial PRIMARY KEY,
  list_id           bigint NOT NULL REFERENCES public.user_lists(id) ON DELETE CASCADE,
  follower_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, follower_user_id)
);

CREATE INDEX IF NOT EXISTS user_list_follows_list_idx
  ON public.user_list_follows (list_id);

CREATE INDEX IF NOT EXISTS user_list_follows_user_idx
  ON public.user_list_follows (follower_user_id);

ALTER TABLE public.user_list_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_list_follows FORCE ROW LEVEL SECURITY;

-- Users can see who follows public lists + manage their own follows.
DROP POLICY IF EXISTS "user_list_follows_read" ON public.user_list_follows;
CREATE POLICY "user_list_follows_read"
  ON public.user_list_follows
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_lists
      WHERE id = list_id AND is_public = true
    )
  );

DROP POLICY IF EXISTS "user_list_follows_own_insert" ON public.user_list_follows;
CREATE POLICY "user_list_follows_own_insert"
  ON public.user_list_follows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_lists
      WHERE id = list_id AND is_public = true
    )
  );

DROP POLICY IF EXISTS "user_list_follows_own_delete" ON public.user_list_follows;
CREATE POLICY "user_list_follows_own_delete"
  ON public.user_list_follows
  FOR DELETE
  USING (follower_user_id = auth.uid());

DROP POLICY IF EXISTS "user_list_follows_service_all" ON public.user_list_follows;
CREATE POLICY "user_list_follows_service_all"
  ON public.user_list_follows
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Denormalised count maintenance ───────────────────────────────────────────
-- Triggers keep item_count + follower_count up-to-date without application
-- arithmetic that's vulnerable to races.

CREATE OR REPLACE FUNCTION public.user_lists_update_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.user_lists SET item_count = item_count + 1 WHERE id = NEW.list_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.user_lists SET item_count = GREATEST(item_count - 1, 0) WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_list_items_count ON public.user_list_items;
CREATE TRIGGER trg_user_list_items_count
  AFTER INSERT OR DELETE ON public.user_list_items
  FOR EACH ROW EXECUTE FUNCTION public.user_lists_update_item_count();

CREATE OR REPLACE FUNCTION public.user_lists_update_follower_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.user_lists SET follower_count = follower_count + 1 WHERE id = NEW.list_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.user_lists SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_list_follows_count ON public.user_list_follows;
CREATE TRIGGER trg_user_list_follows_count
  AFTER INSERT OR DELETE ON public.user_list_follows
  FOR EACH ROW EXECUTE FUNCTION public.user_lists_update_follower_count();

-- These are RETURNS TRIGGER functions (Postgres forbids calling them directly)
-- and the triggers fire regardless of the invoking role's EXECUTE grant. Revoke
-- the default PUBLIC EXECUTE so the security advisor's
-- {anon,authenticated}_security_definer_function_executable warnings stay clear.
REVOKE EXECUTE ON FUNCTION public.user_lists_update_item_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_lists_update_follower_count() FROM PUBLIC, anon, authenticated;

COMMIT;
