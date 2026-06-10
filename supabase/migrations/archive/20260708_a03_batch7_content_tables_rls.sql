-- =============================================================================
-- Date:       2026-07-08
-- Audit ref:  docs/audits/codebase-health-2026-04-24.md §RLS
-- Queue item: A-03 batch 7 — content / reference tables (team_members,
--             country_investment_profiles, foreign_investment_rates,
--             switch_stories)
-- Why:        Four tables appear in lib/database.types.ts with no CREATE TABLE
--             or RLS in the migration tree. A fresh Supabase environment built
--             from supabase/migrations/ would serve all content without any
--             security boundary.
-- Idempotency: safe to re-apply — CREATE TABLE IF NOT EXISTS; DROP POLICY IF
--             EXISTS before every CREATE POLICY; ENABLE/FORCE RLS idempotent.
-- Rollback:   BEGIN;
--               ALTER TABLE public.team_members                 DISABLE ROW LEVEL SECURITY;
--               ALTER TABLE public.country_investment_profiles  DISABLE ROW LEVEL SECURITY;
--               ALTER TABLE public.foreign_investment_rates     DISABLE ROW LEVEL SECURITY;
--               ALTER TABLE public.switch_stories               DISABLE ROW LEVEL SECURITY;
--             COMMIT;
-- =============================================================================
-- IMPORTANT — prior policy state (discovered via grep on supabase/migrations/):
--
--   team_members:                no prior ENABLE RLS, no prior policies.
--   country_investment_profiles: no prior ENABLE RLS, no prior policies.
--   foreign_investment_rates:    no prior ENABLE RLS, no prior policies.
--
--   switch_stories: one INSERT policy exists in
--     supabase/migrations/20260309_security_and_performance_fixes.sql:
--       CREATE POLICY "Insert switch stories" ON switch_stories
--         FOR INSERT TO anon, authenticated
--         WITH CHECK (email IS NOT NULL ... AND body IS NOT NULL ...)
--     This migration adds ENABLE RLS + SELECT + service_role policies only.
--     The INSERT policy is NOT dropped or re-created here to preserve the
--     validation predicate from 20260309. DROP POLICY IF EXISTS lines below
--     are defensive no-ops for any stale alternative names.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. team_members — editorial team content (authors, bios, avatars)
-- =============================================================================
-- Callers:
--   app/sitemap.ts                    server createClient() (anon) → SELECT active
--   app/authors/page.tsx              server createClient() (anon) → SELECT active
--   app/authors/[slug]/page.tsx       server createClient() (anon) → SELECT by slug
--   app/admin/team-members/page.tsx   browser createClient() + user JWT → SELECT + WRITE
--   app/admin/articles/page.tsx       browser createClient() → SELECT active
--   app/admin/consultations/page.tsx  browser createClient() → SELECT
--   app/admin/content-calendar/page.tsx  browser createClient() → SELECT
--   app/admin/courses/page.tsx        browser createClient() → SELECT
--
-- NOTE: app/admin/team-members/page.tsx does INSERT/UPDATE/DELETE via browser
--       createClient(). Under deny-all-write RLS admin mutations will fail.
--       Flagged for X-stream follow-up (swap admin mutations to createAdminClient()).
--       TODO: human review — admin mutation path needs separate fix.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads team members"           ON public.team_members;
DROP POLICY IF EXISTS "Authenticated reads team members"  ON public.team_members;
DROP POLICY IF EXISTS "service_role full access"          ON public.team_members;

-- Sitemap + authors pages use server anon client
CREATE POLICY "Anon reads team members"
    ON public.team_members FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads team members"
    ON public.team_members FOR SELECT
    TO authenticated
    USING (true);

-- Admin writes (content management) go through service_role
-- TODO: admin-page browser mutations need createAdminClient() follow-up
CREATE POLICY "service_role full access"
    ON public.team_members FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 2. country_investment_profiles — foreign investment info per country
-- =============================================================================
-- Callers:
--   app/foreign-investment/[country]/page.tsx  server createClient() (anon) → public SELECT
--
-- Pure public reference content; no user-specific data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.country_investment_profiles (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.country_investment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_investment_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads country profiles"           ON public.country_investment_profiles;
DROP POLICY IF EXISTS "Authenticated reads country profiles"  ON public.country_investment_profiles;
DROP POLICY IF EXISTS "service_role full access"              ON public.country_investment_profiles;

CREATE POLICY "Anon reads country profiles"
    ON public.country_investment_profiles FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads country profiles"
    ON public.country_investment_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "service_role full access"
    ON public.country_investment_profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 3. foreign_investment_rates — FIRB thresholds and tax rates per country
-- =============================================================================
-- Callers:
--   app/foreign-investment/[country]/page.tsx   server createClient() (anon) → public SELECT
--   app/api/foreign-investment/rates/route.ts   createAdminClient() → SELECT (bypasses RLS)
--
-- Public reference data; admin client caller already bypasses RLS.
-- Adding anon SELECT makes server createClient() calls safe without RLS bypass.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.foreign_investment_rates (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.foreign_investment_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foreign_investment_rates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads foreign investment rates"          ON public.foreign_investment_rates;
DROP POLICY IF EXISTS "Authenticated reads foreign investment rates" ON public.foreign_investment_rates;
DROP POLICY IF EXISTS "service_role full access"                     ON public.foreign_investment_rates;

CREATE POLICY "Anon reads foreign investment rates"
    ON public.foreign_investment_rates FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads foreign investment rates"
    ON public.foreign_investment_rates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "service_role full access"
    ON public.foreign_investment_rates FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 4. switch_stories — user-submitted broker-switch testimonials
-- =============================================================================
-- Callers:
--   app/stories/page.tsx             server createClient() (anon) → public SELECT published
--   app/api/switch-story/route.ts    createAdminClient() → INSERT + SELECT (bypasses)
--   app/api/switch-story/moderate/route.ts  createAdminClient() → UPDATE (bypasses)
--   app/api/switch-story/verify/route.ts    createAdminClient() → UPDATE (bypasses)
--   app/admin/switch-stories/page.tsx  browser createClient() → SELECT all
--   app/admin/moderation/page.tsx    browser createClient() → SELECT pending
--
-- Prior policies from 20260309_security_and_performance_fixes.sql:
--   "Insert switch stories" ON switch_stories FOR INSERT TO anon, authenticated
--     WITH CHECK (email, display_name, body non-empty)
-- This migration adds ENABLE RLS + SELECT + service_role only.
-- The 20260309 INSERT policy is preserved as-is.
-- =============================================================================

ALTER TABLE public.switch_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.switch_stories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads published switch stories"  ON public.switch_stories;
DROP POLICY IF EXISTS "Authenticated reads switch stories"   ON public.switch_stories;
DROP POLICY IF EXISTS "service_role full access"             ON public.switch_stories;

-- Public stories page reads published/approved stories via server anon client
CREATE POLICY "Anon reads published switch stories"
    ON public.switch_stories FOR SELECT
    TO anon
    USING (status = 'published');

-- Admin moderation pages read all (pending + published + rejected)
CREATE POLICY "Authenticated reads switch stories"
    ON public.switch_stories FOR SELECT
    TO authenticated
    USING (true);

-- All write operations (insert, update status) go through admin client routes
CREATE POLICY "service_role full access"
    ON public.switch_stories FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- NOTE: "Insert switch stories" FOR INSERT TO anon, authenticated
--       from 20260309_security_and_performance_fixes.sql is intentionally
--       preserved. Public submission form uses server createClient() and
--       the existing INSERT policy's WITH CHECK validates email+body.

COMMIT;
