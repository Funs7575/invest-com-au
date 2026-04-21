-- ============================================================
-- Fix public-read data leaks on bd_pipeline and competitor_watch
--
-- Both tables had a SELECT policy with qual=true on {public},
-- which exposed their contents (enterprise pipeline contacts/
-- stages/deal sizes; competitor intel) to anon requests via
-- PostgREST. Surfaced during the agent-infrastructure migration
-- RLS audit on 2026-04-21 and captured in TODO.md
-- §"Urgent — data exposure".
--
-- This migration:
--   1. Drops "Public can read BD pipeline" on bd_pipeline.
--      Existing "Service role manages BD pipeline" covers all
--      legitimate access (admin routes using createAdminClient).
--   2. Drops "Public read competitor_watch" on competitor_watch.
--   3. Adds explicit service_role FOR ALL policy on
--      competitor_watch (service_role previously worked only via
--      BYPASSRLS — no explicit policy existed).
--
-- After this migration, both tables are default-deny for anon
-- and authenticated.
--
-- Known downstream impact:
--   - app/admin/competitors/page.tsx is a client component that
--     reads competitor_watch via the browser anon client. It
--     will return empty results until converted to an API route
--     pattern matching app/api/admin/bd-pipeline/route.ts
--     (server handler + createAdminClient). Page is internal
--     and its write actions were already silently RLS-blocked,
--     so blast radius is limited.
--
-- Rollback: re-CREATE the dropped policies. No data modified.
-- ============================================================

-- 1. bd_pipeline — drop public read
DROP POLICY IF EXISTS "Public can read BD pipeline" ON public.bd_pipeline;

-- 2. competitor_watch — drop public read
DROP POLICY IF EXISTS "Public read competitor_watch" ON public.competitor_watch;

-- 3. competitor_watch — add explicit service_role policy
DROP POLICY IF EXISTS "Service role manages competitor_watch" ON public.competitor_watch;
CREATE POLICY "Service role manages competitor_watch" ON public.competitor_watch
  FOR ALL TO service_role USING (true) WITH CHECK (true);
