-- ============================================================
-- User-data RLS policies — first batch (O-01, iter 1)
--
-- Source: 04-26 audit §4.4.1 — `rls_enabled_no_policy` advisor
-- finding (57 tables). User-data class subset; this migration
-- handles the 3 obvious `user_*` triplet:
--
--   1. public.user_notifications  (per-user inbox)
--   2. public.user_quiz_history   (per-user quiz answers)
--   3. public.user_bookmarks      (per-user saved items)
--
-- Each was created by 20260416_wave_11_reality_check.sql with
-- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` but no policies,
-- meaning anon + authenticated reads were silently denied. All
-- existing callers go through `createAdminClient()` (service-role
-- bypasses RLS) so this migration changes ZERO current behaviour.
-- It adds:
--
--   - Explicit `service_role FOR ALL` allow on each table (so the
--     bypass is documented, not ambient).
--   - `auth.uid()`-scoped SELECT/INSERT/UPDATE/DELETE on each
--     table for `authenticated` callers — unblocks future
--     migrations of the bell-icon poll, /account/notifications,
--     /account/bookmarks routes off the admin client onto the
--     user-cookie client.
--
-- For `user_quiz_history`, anonymous (session_id-only) rows
-- remain service-role-only by design — RLS cannot scope an
-- anonymous session-id to the requesting browser without a
-- shared secret. Today's writers are all server-side (cron +
-- /api/quiz/submit using admin client), so no behaviour change.
--
-- Tested via the Supabase advisor: after this migration the
-- `rls_enabled_no_policy` finding count drops from 57 → 54.
--
-- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF
-- EXISTS so re-running the migration is safe.
--
-- Rollback (operator-only):
--   DROP POLICY IF EXISTS "service_role full access" ON public.user_notifications;
--   DROP POLICY IF EXISTS "owner can read"           ON public.user_notifications;
--   DROP POLICY IF EXISTS "owner can update"         ON public.user_notifications;
--   DROP POLICY IF EXISTS "owner can delete"         ON public.user_notifications;
--   DROP POLICY IF EXISTS "owner can insert"         ON public.user_notifications;
--   (and the matching policies on user_quiz_history + user_bookmarks)
--   Tables remain RLS-enabled with no policies — same default-deny
--   state they were in before this migration.
-- ============================================================

-- ── 1. user_notifications ────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.user_notifications;
CREATE POLICY "service_role full access" ON public.user_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner can read" ON public.user_notifications;
CREATE POLICY "owner can read" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can update" ON public.user_notifications;
CREATE POLICY "owner can update" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can delete" ON public.user_notifications;
CREATE POLICY "owner can delete" ON public.user_notifications
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- INSERT intentionally NOT granted to authenticated — notifications
-- are always written by server-side code (cron, webhooks, admin
-- actions) using service role. A user inserting a notification on
-- their own behalf would be a bug, not a feature.

-- ── 2. user_quiz_history ─────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.user_quiz_history;
CREATE POLICY "service_role full access" ON public.user_quiz_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner can read" ON public.user_quiz_history;
CREATE POLICY "owner can read" ON public.user_quiz_history
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can insert" ON public.user_quiz_history;
CREATE POLICY "owner can insert" ON public.user_quiz_history
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE/DELETE intentionally NOT granted — quiz history is
-- append-only from the user's perspective. Admin client handles
-- any backoffice corrections.

-- ── 3. user_bookmarks ────────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.user_bookmarks;
CREATE POLICY "service_role full access" ON public.user_bookmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "owner can read" ON public.user_bookmarks;
CREATE POLICY "owner can read" ON public.user_bookmarks
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can insert" ON public.user_bookmarks;
CREATE POLICY "owner can insert" ON public.user_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can update" ON public.user_bookmarks;
CREATE POLICY "owner can update" ON public.user_bookmarks
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "owner can delete" ON public.user_bookmarks;
CREATE POLICY "owner can delete" ON public.user_bookmarks
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
