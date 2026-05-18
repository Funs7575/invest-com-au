-- Migration: align forum_user_profiles with what the /community/[category]/[threadId]
-- page already reads.
--
-- PRODUCT_AUDIT.md 2026-04-15 §CRITICAL #2 reported the forum tables as
-- "missing" — they actually exist (forum_categories, forum_threads,
-- forum_posts, forum_user_profiles, forum_votes are all live), but
-- `forum_user_profiles` was missing the two columns the thread-detail
-- page reads: `reputation` (integer) and `badge` (text). Without those,
-- the page query returned NULL for those fields and rendered empty
-- reputation chips.
--
-- Also normalises sort indexes that already exist on the other tables
-- but were missing here.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_forum_user_profiles_reputation;
--   ALTER TABLE public.forum_user_profiles
--     DROP COLUMN IF EXISTS reputation,
--     DROP COLUMN IF EXISTS badge;

BEGIN;

ALTER TABLE public.forum_user_profiles
  ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS badge text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_forum_user_profiles_reputation
  ON public.forum_user_profiles (reputation DESC);

COMMIT;
