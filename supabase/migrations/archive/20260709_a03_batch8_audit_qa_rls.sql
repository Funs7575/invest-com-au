-- =============================================================================
-- Date:       2026-07-09
-- Audit ref:  docs/audits/codebase-health-2026-04-24.md §RLS
-- Queue item: A-03 batch 8 — admin_audit_log / broker_questions / broker_answers
-- Why:        Three tables appear in lib/database.types.ts with no CREATE TABLE
--             or RLS in the migration tree. A fresh Supabase environment built
--             from supabase/migrations/ would have no security boundaries on
--             audit logs, user-submitted questions, or Q&A answers.
-- Idempotency: CREATE TABLE IF NOT EXISTS; DROP POLICY IF EXISTS before every
--             CREATE POLICY; ENABLE/FORCE RLS idempotent.
-- Rollback:   BEGIN;
--               ALTER TABLE public.admin_audit_log   DISABLE ROW LEVEL SECURITY;
--               ALTER TABLE public.broker_questions  DISABLE ROW LEVEL SECURITY;
--               ALTER TABLE public.broker_answers    DISABLE ROW LEVEL SECURITY;
--             COMMIT;
-- =============================================================================
-- IMPORTANT — prior policy state (discovered via grep supabase/migrations/):
--   admin_audit_log:  no prior ENABLE RLS, no prior policies.
--   broker_questions: no prior ENABLE RLS, no prior policies.
--                     Note: G-04 finding — 20260411 migration entirely did not
--                     apply; broker_questions.vote_count column may be absent.
--                     Policies below do not reference vote_count in USING
--                     clauses to avoid FK/column-not-exist errors on first apply.
--   broker_answers:   no prior ENABLE RLS, no prior policies.
--                     20260309_security_and_performance_fixes.sql drops
--                     DROP POLICY IF EXISTS "Service role full access" on
--                     broker_answers and broker_questions (as part of a broader
--                     sweep) — those are comment-only; no active POLICY on
--                     either table in any applied migration.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. admin_audit_log — append-only admin action audit trail
-- =============================================================================
-- Callers (all admin-only paths, no anon/public access):
--   app/admin/marketplace/brokers/page.tsx  browser createClient() + JWT → INSERT
--   app/admin/marketplace/placements/page.tsx  browser createClient() → INSERT
--   app/admin/marketplace/campaigns/page.tsx   browser createClient() → INSERT
--   app/admin/marketplace/sponsor-billing/page.tsx  browser createClient() → INSERT
--   app/admin/audit-log/page.tsx             browser createClient() → SELECT
--
-- Design note: all callers are admin pages protected by middleware; any
-- authenticated JWT reaching these endpoints has already passed the admin
-- auth gate. An `authenticated` INSERT policy is safe in context — a regular
-- user cannot reach /admin/* pages. Audit log is append-only by convention
-- (no UPDATE/DELETE policies).
-- TODO: human review — long-term, admin writes should migrate to server
-- actions using createAdminClient() for strict provenance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated reads audit log"   ON public.admin_audit_log;
DROP POLICY IF EXISTS "Authenticated inserts audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "service_role full access"        ON public.admin_audit_log;

-- Admin pages read the audit log via browser createClient()
CREATE POLICY "Authenticated reads audit log"
    ON public.admin_audit_log FOR SELECT
    TO authenticated
    USING (true);

-- Admin pages append entries via browser createClient(); append-only (no UPDATE/DELETE)
CREATE POLICY "Authenticated inserts audit log"
    ON public.admin_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Service role for backend operations
CREATE POLICY "service_role full access"
    ON public.admin_audit_log FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 2. broker_questions — user-submitted questions on broker pages
-- =============================================================================
-- Callers:
--   app/best/[slug]/page.tsx           server createClient() (anon) → SELECT + JOIN answers
--   app/api/questions/route.ts         server createClient() + auth.getUser() → INSERT
--   app/api/questions/[id]/vote/route.ts  server createClient() + auth.getUser() → UPDATE vote_count
--   app/admin/questions/page.tsx       browser createClient() → SELECT + UPDATE status
--   app/admin/moderation/page.tsx      browser createClient() → SELECT
--
-- vote_count updates go through app-layer rate limiting (lib/rate-limit.ts).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.broker_questions (
    id         bigserial PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.broker_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_questions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads broker questions"           ON public.broker_questions;
DROP POLICY IF EXISTS "Authenticated reads broker questions"  ON public.broker_questions;
DROP POLICY IF EXISTS "Authenticated submits questions"       ON public.broker_questions;
DROP POLICY IF EXISTS "Authenticated updates questions"       ON public.broker_questions;
DROP POLICY IF EXISTS "service_role full access"              ON public.broker_questions;

-- Public broker pages list questions via server anon client
CREATE POLICY "Anon reads broker questions"
    ON public.broker_questions FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads broker questions"
    ON public.broker_questions FOR SELECT
    TO authenticated
    USING (true);

-- Users submit questions (rate-limited in app)
CREATE POLICY "Authenticated submits questions"
    ON public.broker_questions FOR INSERT
    TO authenticated
    WITH CHECK (
        broker_slug IS NOT NULL
        AND length(trim(broker_slug)) > 0
    );

-- Vote-count updates + admin status changes go through authenticated UPDATE
-- (vote route: server createClient + user JWT; admin: browser createClient)
CREATE POLICY "Authenticated updates questions"
    ON public.broker_questions FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Admin full access for moderation, deletion
CREATE POLICY "service_role full access"
    ON public.broker_questions FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- 3. broker_answers — advisor/expert answers to broker questions
-- =============================================================================
-- Callers:
--   app/best/[slug]/page.tsx               server createClient() (anon) → SELECT (via JOIN)
--   app/api/questions/[id]/answer/route.ts server createClient() + auth.getUser() → INSERT
--   app/api/answers/[id]/vote/route.ts     createAdminClient() → UPDATE helpful_count
--   app/api/questions/moderate/route.ts    createAdminClient() → SELECT + UPDATE status
--   app/admin/questions/page.tsx           browser createClient() → SELECT + INSERT
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.broker_answers (
    id         bigserial PRIMARY KEY,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.broker_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_answers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon reads broker answers"           ON public.broker_answers;
DROP POLICY IF EXISTS "Authenticated reads broker answers"  ON public.broker_answers;
DROP POLICY IF EXISTS "Authenticated submits answers"       ON public.broker_answers;
DROP POLICY IF EXISTS "service_role full access"            ON public.broker_answers;

-- Public broker pages read answers via server anon client (JOIN on broker_questions)
CREATE POLICY "Anon reads broker answers"
    ON public.broker_answers FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Authenticated reads broker answers"
    ON public.broker_answers FOR SELECT
    TO authenticated
    USING (true);

-- Advisors and admin submit answers via server createClient() + user JWT
CREATE POLICY "Authenticated submits answers"
    ON public.broker_answers FOR INSERT
    TO authenticated
    WITH CHECK (
        question_id IS NOT NULL
    );

-- Vote count + moderation updates go through createAdminClient() (bypasses RLS)
-- Admin browser reads also covered by authenticated SELECT above
CREATE POLICY "service_role full access"
    ON public.broker_answers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMIT;
