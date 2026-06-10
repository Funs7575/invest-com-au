-- ============================================================
-- Article-engagement RLS policies (O-01, iter 2)
--
-- Source: 04-26 audit §4.4.1 — `rls_enabled_no_policy` advisor
-- finding. Iter 2 of the user-data class. Tables in scope:
--
--   1. public.article_comments   (threaded comments per article)
--   2. public.article_reactions  (per-user/per-IP reaction kinds)
--
-- Both were created by 20260416_wave_11_reality_check.sql with
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` but no policies, so
-- non-service-role reads/writes were silently denied. All current
-- callers go through `lib/article-comments.ts` which uses
-- `createAdminClient()` (service role bypasses RLS), so this
-- migration changes ZERO current behaviour.
--
-- Why these tables get a NUANCED policy set rather than the iter-1
-- "full CRUD for the owner" pattern:
--
--   - article_comments rows carry `author_email` (PII for the
--     comment author). A blanket SELECT-for-authenticated policy
--     would let any signed-in user enumerate every commenter's
--     email by writing their own query. Today the API hides email
--     in the public payload; we preserve that property by NOT
--     adding a SELECT policy for `authenticated` and continuing to
--     route reads through the admin client + the API's column
--     filter.
--
--   - article_reactions rows carry `user_id` (identifies who
--     reacted with what). Aggregated counts are public; the per-
--     row data isn't. Same reasoning: skip authenticated SELECT,
--     keep counts admin-mediated.
--
--   - Author-scoped UPDATE/DELETE on article_comments is safe (the
--     mutation can't leak data, and the owner-scope is enforced by
--     `auth.uid()`). Adding it now means a future "edit your own
--     comment" UI can switch to the user-cookie client without an
--     additional migration.
--
--   - Owner-scoped INSERT/DELETE on article_reactions is safe for
--     the same reason. Anonymous reactions stay admin-mediated
--     because anon RLS can't bind ip_hash to the requesting
--     browser without a shared secret (mirrors the iter-1
--     decision on user_quiz_history.session_id).
--
-- Tested via the Supabase advisor: after this migration the
-- `rls_enabled_no_policy` finding count drops from 54 (post iter 1)
-- → 52.
--
-- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF
-- EXISTS so re-running the migration is safe. `auth.uid()` is
-- pre-emptively wrapped in `(SELECT auth.uid())` per audit finding
-- F-4.5.3 (`auth_rls_initplan`) — saves a future re-edit and
-- closes 2 of the 24 init-plan findings.
--
-- Rollback (operator-only):
--   DROP POLICY IF EXISTS "service_role full access" ON public.article_comments;
--   DROP POLICY IF EXISTS "author can update"        ON public.article_comments;
--   DROP POLICY IF EXISTS "author can delete"        ON public.article_comments;
--   DROP POLICY IF EXISTS "service_role full access" ON public.article_reactions;
--   DROP POLICY IF EXISTS "owner can insert"         ON public.article_reactions;
--   DROP POLICY IF EXISTS "owner can delete"         ON public.article_reactions;
--   Tables remain RLS-enabled with no policies — same default-deny
--   state they were in before this migration.
-- ============================================================

-- ── 1. article_comments ──────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.article_comments;
CREATE POLICY "service_role full access" ON public.article_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Author-scoped UPDATE: a signed-in commenter can edit their own
-- comment. WITH CHECK prevents reassigning author_id to someone
-- else (USING already prevents seeing rows you don't own, but
-- WITH CHECK guards against a malicious UPDATE that flips
-- author_id mid-row to bypass ownership on subsequent ops).
DROP POLICY IF EXISTS "author can update" ON public.article_comments;
CREATE POLICY "author can update" ON public.article_comments
  FOR UPDATE TO authenticated
  USING (author_id IS NOT NULL AND author_id = (SELECT auth.uid()))
  WITH CHECK (author_id IS NOT NULL AND author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "author can delete" ON public.article_comments;
CREATE POLICY "author can delete" ON public.article_comments
  FOR DELETE TO authenticated
  USING (author_id IS NOT NULL AND author_id = (SELECT auth.uid()));

-- SELECT and INSERT intentionally NOT granted to authenticated:
--   - SELECT would expose author_email PII.
--   - INSERT must run server-side so classifyText() can set the
--     status correctly (auto_publish vs pending vs auto_reject) and
--     write the auto_moderated_verdict trail. A direct-client
--     INSERT bypassing classifyText would let users self-publish
--     without moderation.

-- ── 2. article_reactions ─────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.article_reactions;
CREATE POLICY "service_role full access" ON public.article_reactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Owner-scoped INSERT: a signed-in user can record their own
-- reaction. The unique index on (article_slug, user_id, reaction)
-- already prevents duplicates; this policy enforces "you can only
-- insert rows owned by you" so a user can't pad another user's
-- reaction count.
DROP POLICY IF EXISTS "owner can insert" ON public.article_reactions;
CREATE POLICY "owner can insert" ON public.article_reactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND ip_hash IS NULL);

-- Owner-scoped DELETE: a user can un-react.
DROP POLICY IF EXISTS "owner can delete" ON public.article_reactions;
CREATE POLICY "owner can delete" ON public.article_reactions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- SELECT intentionally NOT granted to authenticated — would expose
-- per-user reaction history (low-stakes PII, but principle of
-- least privilege). Counts are aggregated and exposed via the
-- admin-client API in lib/article-comments.ts::getReactionCounts.

-- UPDATE intentionally NOT granted — reactions are immutable from
-- the user's POV (delete + re-insert to "change" reaction).

-- Anonymous (ip_hash) reactions remain service-role-only because
-- there's no way for RLS to bind ip_hash to the requesting
-- browser. Today's anon writers go through the admin-client API
-- which sets ip_hash server-side — preserved by this migration's
-- service_role-only path for anon rows.
