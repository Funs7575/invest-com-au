-- =============================================================================
-- Date:       2026-07-07
-- Audit ref:  docs/audits/codebase-health-2026-04-24.md §RLS
-- Queue item: A-03 batch 6 — consultations / courses / au_postcodes family
-- Why:        Five tables appear in lib/database.types.ts but have no CREATE
--             TABLE or RLS in the migration tree.  A fresh Supabase environment
--             built from supabase/migrations/ would have no security boundaries
--             on this data.
-- Idempotency: safe to re-apply — all TABLE creates are IF NOT EXISTS; all
--             POLICY creates are preceded by DROP POLICY IF EXISTS; ENABLE /
--             FORCE RLS is idempotent in PostgreSQL.
-- Rollback:   BEGIN; ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.consultation_bookings DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.course_lessons DISABLE ROW LEVEL SECURITY;
--             ALTER TABLE public.au_postcodes DISABLE ROW LEVEL SECURITY;
--             COMMIT;
--             (also drop any policies created here if full rollback needed)
-- =============================================================================
-- IMPORTANT — prior policy state (discovered via grep on supabase/migrations/):
--   consultations:        no prior ENABLE RLS, no prior policies
--   consultation_bookings: no prior ENABLE RLS, no prior policies
--   courses:              no prior ENABLE RLS, no prior policies
--   course_lessons:       no prior ENABLE RLS, no prior policies
--   au_postcodes:         no prior ENABLE RLS, no prior policies
-- All DROP POLICY IF EXISTS lines below are therefore no-ops on first apply.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. consultations — paid consultation catalog
-- =============================================================================
-- Callers:
--   app/consultations/page.tsx             server createClient() (anon key) → public SELECT
--   app/consultations/[slug]/page.tsx      server createClient() (anon key) → public SELECT
--   app/api/consultation/book/route.ts     createAdminClient() → bypasses RLS (catalog SELECT only)
--   lib/stripe-webhook/...                 admin ctx → bypasses RLS
--   app/admin/consultations/page.tsx       browser createClient() + user JWT → SELECT + WRITE
--
-- NOTE: app/admin/consultations/page.tsx does INSERT/DELETE via browser createClient().
--       Service-role writes (admin client) go through createAdminClient() in the book
--       route and stripe webhook.  Admin-page browser-client mutations will fail under
--       deny-all-write RLS; flagged for X-stream (swap to createAdminClient()).
--       TODO: human review of policy semantics — admin-page write path needs separate fix.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consultations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads published consultations"  ON public.consultations;
DROP POLICY IF EXISTS "Authenticated reads all consultations" ON public.consultations;
DROP POLICY IF EXISTS "service_role full access"           ON public.consultations;

-- Public visitors see only published entries
CREATE POLICY "Anon reads published consultations"
    ON public.consultations FOR SELECT
    TO anon
    USING (status = 'published');

-- Authenticated users (admins) see all rows including drafts
CREATE POLICY "Authenticated reads all consultations"
    ON public.consultations FOR SELECT
    TO authenticated
    USING (true);

-- Service role handles all writes (book route + webhook + admin backend)
CREATE POLICY "service_role full access"
    ON public.consultations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 2. consultation_bookings — per-user bookings for paid consultations
-- =============================================================================
-- Callers:
--   app/api/consultation/bookings/route.ts  createClient() + auth.getUser() → user-scoped SELECT
--   app/api/consultation/book/route.ts      createAdminClient() → INSERT (bypasses)
--   lib/stripe-webhook/...                  admin ctx → UPDATE (bypasses)
--   app/admin/consultations/page.tsx        browser createClient() → SELECT all
--
-- NOTE: Admin page reads all bookings via browser createClient() + user JWT.
--       Under user-scoped RLS the admin will only see their own bookings (empty for
--       staff accounts).  Flagged for X-stream fix (admin page → createAdminClient()).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consultation_bookings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User manages own bookings"  ON public.consultation_bookings;
DROP POLICY IF EXISTS "service_role full access"   ON public.consultation_bookings;

-- Users read and manage their own bookings
CREATE POLICY "User manages own bookings"
    ON public.consultation_bookings FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Service role for admin backend + webhook updates
CREATE POLICY "service_role full access"
    ON public.consultation_bookings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 3. courses — paid course catalog
-- =============================================================================
-- Callers:
--   lib/course.ts                    server createClient() (anon key) → public SELECT
--   app/courses/[slug]/page.tsx      server createClient() (anon key) → public SELECT
--   app/api/course/purchase/route.ts  createClient() (anon) + createAdminClient() → SELECT+write
--   app/admin/courses/...            browser createClient() + user JWT → SELECT+WRITE
--   lib/stripe-webhook/...           admin ctx → write
--
-- Courses are a public catalog (like /brokers); purchase gating is in app logic.
-- Admin-page browser-client mutations: flagged — should use createAdminClient().
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.courses (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads courses"              ON public.courses;
DROP POLICY IF EXISTS "Authenticated reads courses"     ON public.courses;
DROP POLICY IF EXISTS "service_role full access"        ON public.courses;

-- Public catalog — lib/course.ts uses server anon client with no user JWT
CREATE POLICY "Anon reads courses"
    ON public.courses FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads courses"
    ON public.courses FOR SELECT
    TO authenticated
    USING (true);

-- Writes: admin backend, webhook, and (transitionally) admin browser client
-- TODO: human review — admin-page browser writes should migrate to createAdminClient()
CREATE POLICY "service_role full access"
    ON public.courses FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 4. course_lessons — per-course lesson rows
-- =============================================================================
-- Callers:
--   lib/course.ts                          server createClient() (anon) → public SELECT
--   app/courses/[slug]/[lessonSlug]/page.tsx  server createClient() (anon) → public SELECT
--   app/admin/courses/[slug]/page.tsx      browser createClient() → SELECT+WRITE
--
-- Access gate (purchased vs non-purchased) is enforced in app logic, not RLS.
-- lesson content itself is not user-specific.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.course_lessons (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads course lessons"          ON public.course_lessons;
DROP POLICY IF EXISTS "Authenticated reads course lessons" ON public.course_lessons;
DROP POLICY IF EXISTS "service_role full access"           ON public.course_lessons;

CREATE POLICY "Anon reads course lessons"
    ON public.course_lessons FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads course lessons"
    ON public.course_lessons FOR SELECT
    TO authenticated
    USING (true);

-- Admin mutations go through service_role (admin-page browser client is flagged)
CREATE POLICY "service_role full access"
    ON public.course_lessons FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 5. au_postcodes — reference data for postcode lookup / advisor search
-- =============================================================================
-- Callers:
--   app/api/advisor-search/postcodes/route.ts  server createClient() (anon key) → SELECT
--   app/api/admin/advisor-applications/route.ts  createAdminClient() → SELECT (bypasses)
--
-- Pure reference data; no user-specific rows.  No write path from app (admin
-- applications route uses admin client; reference data is seeded via migration).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.au_postcodes (
    id         bigserial PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.au_postcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.au_postcodes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads postcodes"    ON public.au_postcodes;
DROP POLICY IF EXISTS "service_role full access" ON public.au_postcodes;

-- Public reference data — advisor-search postcodes API uses server anon client
CREATE POLICY "Anon reads postcodes"
    ON public.au_postcodes FOR SELECT
    TO anon
    USING (true);

-- Seed / maintenance writes go through service_role
CREATE POLICY "service_role full access"
    ON public.au_postcodes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMIT;
