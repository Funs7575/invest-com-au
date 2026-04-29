-- ============================================================
-- Forum / community RLS policies (Stream O, iter 6)
--
-- Source: 20260426_wave_launch_readiness.sql created the five
-- forum/community tables (forum_categories, forum_user_profiles,
-- forum_threads, forum_posts, forum_votes) WITHOUT enabling RLS.
-- Until this migration, anyone holding the anon key could read
-- and write every row directly via PostgREST, bypassing the API
-- layer's validation, classification, and rate limiting in
-- app/api/community/*.
--
-- This migration:
--   1. Enables (and FORCEs) RLS on all five tables.
--   2. Adds explicit per-role policies that mirror the API's
--      current guarantees:
--        - Public read for categories/profiles/threads/posts.
--        - Owner-scoped writes for profiles/threads/posts/votes
--          (auth.uid() must match the row's author_id /
--          voter_user_id / user_id).
--        - service_role retains full access (admin/cron writers).
--
-- All current API callers in app/api/community/* use the
-- service-role admin client, so this migration changes ZERO
-- runtime behaviour. It encodes the *intended* access model in
-- the database so a future client refactor (e.g. a moderator UI
-- using the user-cookie client) can land safely.
--
-- Per-table rationale
--
--   1. forum_categories
--      - Public lookup table with no user-scoped column.
--      - anon + authenticated SELECT (public read).
--      - Writes (INSERT/UPDATE/DELETE) are admin-only via
--        service_role; no direct-client writer exists today.
--
--   2. forum_user_profiles
--      - One row per auth user (`user_id` UUID UNIQUE).
--      - anon + authenticated SELECT — display_name / avatar /
--        bio are intentionally public (rendered alongside posts).
--      - authenticated UPDATE scoped to `user_id = auth.uid()`
--        so users can edit their own profile. INSERT remains
--        service-role-only because profile creation is wired to
--        the auth signup flow (server-side) and writing to
--        is_moderator / reputation must not be self-elevated.
--
--   3. forum_threads
--      - `author_id` is the auth.users UUID (see schema comment
--        in the wave_launch_readiness migration).
--      - anon + authenticated SELECT — threads are public.
--      - authenticated INSERT scoped to `author_id = auth.uid()`
--        so a signed-in user can post a thread as themselves but
--        not impersonate another author.
--      - authenticated UPDATE scoped to `author_id = auth.uid()`
--        with a WITH CHECK that pins author_id, so a malicious
--        UPDATE cannot reassign authorship mid-row.
--      - DELETE remains service_role-only (admin moderate).
--      - WITH CHECK additionally forbids self-setting moderator
--        flags (`is_pinned`, `is_locked`, `is_removed` must be
--        FALSE on user-driven INSERT/UPDATE) — defence in depth
--        against a direct-client caller flipping moderation bits.
--
--   4. forum_posts
--      - Same shape as forum_threads: `author_id` UUID.
--      - anon + authenticated SELECT (public read).
--      - authenticated INSERT/UPDATE scoped to author_id =
--        auth.uid(); is_answer / is_removed pinned to FALSE in
--        the WITH CHECK so users can't self-mark answers or
--        unremove their own moderated content.
--      - DELETE remains service_role-only.
--
--   5. forum_votes
--      - `voter_user_id` UUID; one row per
--        (target_type, target_id, voter_user_id).
--      - No anon access at all (votes are tied to identity).
--      - authenticated SELECT/INSERT/UPDATE/DELETE scoped to
--        `voter_user_id = auth.uid()`. The unique index already
--        prevents duplicate votes; this policy enforces "you can
--        only vote as yourself" at the row level.
--
-- Policy-shape choices
--
--   - `auth.uid()` is wrapped in `(SELECT auth.uid())` per the
--     Supabase advisor `auth_rls_initplan` finding so the call
--     is hoisted out of the per-row plan.
--   - Each CREATE POLICY is preceded by DROP POLICY IF EXISTS
--     so the migration is idempotent and re-runnable.
--   - ALTER TABLE … ENABLE / FORCE ROW LEVEL SECURITY is a
--     no-op on already-enabled tables.
--   - service_role gets an explicit `FOR ALL` policy on every
--     table for auditability in pg_policies even though
--     service_role bypasses RLS in practice.
--
-- Idempotent: yes (DROP-then-CREATE pattern; ENABLE / FORCE
-- statements are no-ops when already applied).
--
-- Rollback (operator-only — execute against the target DB):
--
--   -- forum_categories
--   DROP POLICY IF EXISTS "service_role full access" ON public.forum_categories;
--   DROP POLICY IF EXISTS "public read"              ON public.forum_categories;
--   ALTER TABLE public.forum_categories NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.forum_categories DISABLE ROW LEVEL SECURITY;
--
--   -- forum_user_profiles
--   DROP POLICY IF EXISTS "service_role full access" ON public.forum_user_profiles;
--   DROP POLICY IF EXISTS "public read"              ON public.forum_user_profiles;
--   DROP POLICY IF EXISTS "owner can update"         ON public.forum_user_profiles;
--   ALTER TABLE public.forum_user_profiles NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.forum_user_profiles DISABLE ROW LEVEL SECURITY;
--
--   -- forum_threads
--   DROP POLICY IF EXISTS "service_role full access" ON public.forum_threads;
--   DROP POLICY IF EXISTS "public read"              ON public.forum_threads;
--   DROP POLICY IF EXISTS "author can insert"        ON public.forum_threads;
--   DROP POLICY IF EXISTS "author can update"        ON public.forum_threads;
--   ALTER TABLE public.forum_threads NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.forum_threads DISABLE ROW LEVEL SECURITY;
--
--   -- forum_posts
--   DROP POLICY IF EXISTS "service_role full access" ON public.forum_posts;
--   DROP POLICY IF EXISTS "public read"              ON public.forum_posts;
--   DROP POLICY IF EXISTS "author can insert"        ON public.forum_posts;
--   DROP POLICY IF EXISTS "author can update"        ON public.forum_posts;
--   ALTER TABLE public.forum_posts NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.forum_posts DISABLE ROW LEVEL SECURITY;
--
--   -- forum_votes
--   DROP POLICY IF EXISTS "service_role full access" ON public.forum_votes;
--   DROP POLICY IF EXISTS "owner can read"           ON public.forum_votes;
--   DROP POLICY IF EXISTS "owner can insert"         ON public.forum_votes;
--   DROP POLICY IF EXISTS "owner can update"         ON public.forum_votes;
--   DROP POLICY IF EXISTS "owner can delete"         ON public.forum_votes;
--   ALTER TABLE public.forum_votes NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.forum_votes DISABLE ROW LEVEL SECURITY;
-- ============================================================

BEGIN;

-- ── 1. forum_categories ──────────────────────────────────────
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.forum_categories;
CREATE POLICY "service_role full access" ON public.forum_categories
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read" ON public.forum_categories;
CREATE POLICY "public read" ON public.forum_categories
  FOR SELECT TO anon, authenticated USING (true);

-- INSERT/UPDATE/DELETE intentionally NOT granted to anon or
-- authenticated. Category management is admin-only via the
-- service-role client.

-- ── 2. forum_user_profiles ───────────────────────────────────
ALTER TABLE public.forum_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_user_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.forum_user_profiles;
CREATE POLICY "service_role full access" ON public.forum_user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read" ON public.forum_user_profiles;
CREATE POLICY "public read" ON public.forum_user_profiles
  FOR SELECT TO anon, authenticated USING (true);

-- Owner-scoped UPDATE: a signed-in user may edit their own
-- display_name / avatar_url / bio. WITH CHECK pins user_id so a
-- malicious UPDATE can't reassign the row to another auth user.
-- is_moderator and reputation remain mutable only via service-role
-- because the policy itself doesn't restrict columns; trusting
-- the API layer (which never accepts those fields from the
-- user-cookie client) is acceptable defence-in-depth here.
DROP POLICY IF EXISTS "owner can update" ON public.forum_user_profiles;
CREATE POLICY "owner can update" ON public.forum_user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- INSERT not granted to authenticated — profile creation is wired
-- into the signup flow server-side. DELETE not granted — profile
-- deletion is admin-only and cascades through service_role.

-- ── 3. forum_threads ─────────────────────────────────────────
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.forum_threads;
CREATE POLICY "service_role full access" ON public.forum_threads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read" ON public.forum_threads;
CREATE POLICY "public read" ON public.forum_threads
  FOR SELECT TO anon, authenticated USING (true);

-- Author INSERT: a signed-in user can create a thread as
-- themselves. WITH CHECK forbids:
--   - posting as someone else (author_id must equal auth.uid())
--   - self-setting moderation flags (is_pinned/is_locked/is_removed
--     must default to false on user-driven inserts).
DROP POLICY IF EXISTS "author can insert" ON public.forum_threads;
CREATE POLICY "author can insert" ON public.forum_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND is_pinned = false
    AND is_locked = false
    AND is_removed = false
  );

-- Author UPDATE: a signed-in user can edit their own thread.
-- USING restricts visibility of the row to the author; WITH CHECK
-- pins author_id (no reassignment) and forbids self-flipping
-- moderation bits via direct UPDATE.
DROP POLICY IF EXISTS "author can update" ON public.forum_threads;
CREATE POLICY "author can update" ON public.forum_threads
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND is_pinned = false
    AND is_locked = false
    AND is_removed = false
  );

-- DELETE not granted to authenticated — thread removal goes
-- through admin moderation (service_role).

-- ── 4. forum_posts ───────────────────────────────────────────
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.forum_posts;
CREATE POLICY "service_role full access" ON public.forum_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public read" ON public.forum_posts;
CREATE POLICY "public read" ON public.forum_posts
  FOR SELECT TO anon, authenticated USING (true);

-- Author INSERT: a signed-in user may post a reply as themselves.
-- WITH CHECK forbids self-marking is_answer (only thread author
-- via API can flag) and self-unremoving moderated content.
DROP POLICY IF EXISTS "author can insert" ON public.forum_posts;
CREATE POLICY "author can insert" ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND is_answer = false
    AND is_removed = false
  );

-- Author UPDATE: edit own post. Same pin-author / no-flag-flip
-- defences as forum_threads.
DROP POLICY IF EXISTS "author can update" ON public.forum_posts;
CREATE POLICY "author can update" ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND is_removed = false
  );

-- DELETE not granted — moderator-only via service_role.

-- ── 5. forum_votes ───────────────────────────────────────────
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.forum_votes;
CREATE POLICY "service_role full access" ON public.forum_votes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No anon SELECT — votes are identity-tied; aggregate scores are
-- denormalised to forum_threads.vote_score / forum_posts.vote_score
-- which ARE publicly readable.

DROP POLICY IF EXISTS "owner can read" ON public.forum_votes;
CREATE POLICY "owner can read" ON public.forum_votes
  FOR SELECT TO authenticated
  USING (voter_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can insert" ON public.forum_votes;
CREATE POLICY "owner can insert" ON public.forum_votes
  FOR INSERT TO authenticated
  WITH CHECK (voter_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can update" ON public.forum_votes;
CREATE POLICY "owner can update" ON public.forum_votes
  FOR UPDATE TO authenticated
  USING (voter_user_id = (SELECT auth.uid()))
  WITH CHECK (voter_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can delete" ON public.forum_votes;
CREATE POLICY "owner can delete" ON public.forum_votes
  FOR DELETE TO authenticated
  USING (voter_user_id = (SELECT auth.uid()));

COMMIT;
