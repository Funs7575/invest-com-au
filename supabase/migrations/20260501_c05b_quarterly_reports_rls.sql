-- ─────────────────────────────────────────────────────────────────────────────
-- C-05b: quarterly_reports RLS — re-assert canonical policy (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Context:
--   `quarterly_reports` was originally created in 20260316_q1_2026_report.sql
--   without RLS. The 2026-04-29 O-iter7 migration
--   (20260429_o_iter7_rls_editorial_obs_secrets.sql) enabled RLS and added:
--     - "anon read published quarterly_reports" — anon/authenticated SELECT
--       WHERE status = 'published'
--     - "service_role full access" — service_role FOR ALL USING (true) WITH
--       CHECK (true)
--
--   This migration accompanies the C-05b admin page refactor that moves the
--   admin CRUD UI from a browser anon-key client (lib/supabase/client.ts) to
--   the new `/api/admin/quarterly-reports` route (service-role admin client).
--   We re-assert the same policies idempotently and rename the service-role
--   policy to a clearer C-05b-aligned name. RLS already being enabled means
--   ENABLE ROW LEVEL SECURITY here is a no-op; the `IF EXISTS` drops below
--   make this migration safe to re-run.
--
-- Behaviour after this migration:
--   - Anon / authenticated / cookie-session callers (the public /reports
--     pages and the sitemap) can SELECT only rows where status='published'.
--     Drafts are invisible to them.
--   - Service-role callers (the /api/admin/quarterly-reports route handlers
--     using createAdminClient()) can SELECT/INSERT/UPDATE/DELETE all rows.
--   - The admin page (app/admin/quarterly-reports/page.tsx) no longer talks
--     to PostgREST with the anon key. Auth is enforced by requireAdmin() in
--     the API route handler (proxy.ts gates the page tree at /admin/* but
--     does NOT yet gate /api/admin/* — requireAdmin() is the active guard).
--
-- Rollback strategy:
--   The pre-O-iter7 state (RLS disabled entirely) is reachable with:
--
--     BEGIN;
--     DROP POLICY IF EXISTS "service role manages quarterly_reports"
--       ON public.quarterly_reports;
--     DROP POLICY IF EXISTS "anon read published quarterly_reports"
--       ON public.quarterly_reports;
--     ALTER TABLE public.quarterly_reports DISABLE ROW LEVEL SECURITY;
--     COMMIT;
--
--   The O-iter7 policy names ("service_role full access" + "anon read
--   published quarterly_reports") are also dropped + recreated below; the
--   rollback above leaves the table policy-less, which is the original
--   behaviour. To go back to the O-iter7 state instead, re-run
--   20260429_o_iter7_rls_editorial_obs_secrets.sql.

BEGIN;

ALTER TABLE public.quarterly_reports ENABLE ROW LEVEL SECURITY;

-- Idempotency: drop both the C-05b name AND the prior O-iter7 name so a
-- re-run of this migration leaves a single canonical policy per role
-- instead of stacking duplicates.
DROP POLICY IF EXISTS "anon read published quarterly_reports"
  ON public.quarterly_reports;
DROP POLICY IF EXISTS "service role manages quarterly_reports"
  ON public.quarterly_reports;
DROP POLICY IF EXISTS "service_role full access"
  ON public.quarterly_reports;

CREATE POLICY "anon read published quarterly_reports"
  ON public.quarterly_reports
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "service role manages quarterly_reports"
  ON public.quarterly_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
