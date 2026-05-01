-- ============================================================================
-- Migration: A-02 batch 5 — advisor firm + guide + moderation tables
-- Date:      2026-05-02 (timestamped 20260608 to sort after 20260607* batch 4)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02 batch 5
--
-- Purpose
--   Five advisor-related tables were created with RLS enabled in their
--   original migrations but with two policy hygiene issues:
--     1. FORCE ROW LEVEL SECURITY was not applied — superuser connections
--        bypass RLS unless FORCE is set, leaving an unintended escape hatch.
--     2. Service-role policies used `USING (auth.role() = 'service_role')`
--        instead of the `TO service_role` role-specifier. The former works via
--        a row-level expression check; the latter is the auditable canonical
--        form, making `pg_policies` unambiguously show which role is allowed.
--   Additionally, `advisor_article_moderation_log` had a misleading
--   `USING (false)` deny-all policy (a common pattern for "service_role only"
--   that is confusing because it visually reads as "nothing is allowed" rather
--   than "service_role bypasses this anyway").
--
-- Tables covered
--   1. advisor_firms                — firm-level billing entities (active firms public)
--   2. advisor_firm_invitations     — token-keyed invite table (service-role only access)
--   3. advisor_guide_content        — public reference guides per advisor type
--   4. advisor_profile_views        — view tracking for advisor dashboard analytics
--   5. advisor_article_moderation_log — audit log for advisor article moderation actions
--
-- IMPORTANT — prior policy state (all discovered by grep; DROP by exact name below)
--
--   advisor_firms (20260310_advisor_firms_and_invitations.sql:122-123):
--     CREATE POLICY "Public can read active firms" FOR SELECT USING (status='active')
--     CREATE POLICY "Service role full access firms" FOR ALL USING (auth.role()='service_role')
--
--   advisor_firm_invitations (20260310_advisor_firms_and_invitations.sql:142):
--     CREATE POLICY "Service role full access invitations" FOR ALL USING (auth.role()='service_role')
--
--   advisor_guide_content (20260309_content_tables.sql:113-114):
--     CREATE POLICY "Public read advisor guides" FOR SELECT TO anon, authenticated USING (true)
--     (already correct syntax; DROP/recreate for consistency + add service_role + FORCE)
--
--   advisor_profile_views (20260309_advisor_reviews_and_views.sql:118 + security_and_performance_fixes.sql:292-298):
--     CREATE POLICY "Anyone can increment views" -- ALREADY DROPPED in security_and_performance_fixes.sql
--     CREATE POLICY "Public read advisor views"  FOR SELECT TO anon, authenticated USING (true)
--     (INSERT policy was commented out in security_and_performance_fixes.sql — no INSERT policy in effect)
--
--   advisor_article_moderation_log (20260310_content_architecture.sql:140):
--     CREATE POLICY "Service role only mod log" FOR ALL USING (false)
--     (misleading deny-all — service_role bypasses RLS regardless; see fix below)
--
-- Verified callers
--   advisor_firms:
--     app/sitemap.ts                       — server client SELECT active firms
--     app/firm/[slug]/page.tsx             — server client SELECT by slug
--     app/api/advisor-auth/firm/route.ts   — server client SELECT + admin UPDATE
--     app/api/advisor-auth/firm/invite/route.ts — server client SELECT + admin write
--     app/api/admin/advisor-applications/route.ts — server client SELECT
--
--   advisor_firm_invitations:
--     app/api/advisor-auth/firm/invite/route.ts — admin INSERT/UPDATE + server SELECT by token
--     app/api/advisor-apply/route.ts            — server client SELECT by token
--     app/api/advisor-apply/invite/route.ts     — admin SELECT by token (C-03 approved exception)
--     No auth.uid() linkage — token IS the security; admin client used for most operations.
--
--   advisor_guide_content:
--     app/advisors/[type]/guide/page.tsx (inferred) — server client SELECT by slug/type
--
--   advisor_profile_views:
--     app/admin/advisor-performance/page.tsx — server client SELECT
--     app/api/advisor-auth/data/route.ts     — server client SELECT (comment "no RLS" is stale)
--     app/api/advisor-dashboard/route.ts     — server client SELECT
--     No INSERT in app code — view increment path was removed; admin client used if needed.
--
--   advisor_article_moderation_log:
--     app/api/advisor-articles/route.ts:36 — server client INSERT (admin-verified user only)
--     app/api/advisor-articles/route.ts:92 — admin client SELECT
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing tables.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - FORCE ROW LEVEL SECURITY  — no-op if already forced.
--   - DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run.
--
-- Rollback
--   BEGIN;
--     -- advisor_firms
--     DROP POLICY IF EXISTS "Public can read active firms v2" ON advisor_firms;
--     DROP POLICY IF EXISTS "service_role full access"        ON advisor_firms;
--     CREATE POLICY "Public can read active firms"  ON advisor_firms FOR SELECT USING (status='active');
--     CREATE POLICY "Service role full access firms" ON advisor_firms FOR ALL USING (auth.role()='service_role');
--     ALTER TABLE advisor_firms DISABLE ROW LEVEL SECURITY;
--     -- advisor_firm_invitations
--     DROP POLICY IF EXISTS "service_role full access"  ON advisor_firm_invitations;
--     CREATE POLICY "Service role full access invitations" ON advisor_firm_invitations FOR ALL USING (auth.role()='service_role');
--     ALTER TABLE advisor_firm_invitations DISABLE ROW LEVEL SECURITY;
--     -- advisor_guide_content
--     DROP POLICY IF EXISTS "Public read advisor guides v2" ON advisor_guide_content;
--     DROP POLICY IF EXISTS "service_role full access"      ON advisor_guide_content;
--     CREATE POLICY "Public read advisor guides" ON advisor_guide_content FOR SELECT TO anon, authenticated USING (true);
--     ALTER TABLE advisor_guide_content DISABLE ROW LEVEL SECURITY;
--     -- advisor_profile_views
--     DROP POLICY IF EXISTS "Public read advisor views v2"  ON advisor_profile_views;
--     DROP POLICY IF EXISTS "service_role full access"      ON advisor_profile_views;
--     ALTER TABLE advisor_profile_views DISABLE ROW LEVEL SECURITY;
--     -- advisor_article_moderation_log
--     DROP POLICY IF EXISTS "service_role full access"      ON advisor_article_moderation_log;
--     DROP POLICY IF EXISTS "admin can log moderation"      ON advisor_article_moderation_log;
--     CREATE POLICY "Service role only mod log" ON advisor_article_moderation_log FOR ALL USING (false);
--     ALTER TABLE advisor_article_moderation_log DISABLE ROW LEVEL SECURITY;
--   COMMIT;
--   NOTE: rollback does not re-disable RLS if it was enabled by an earlier migration.
--   IMPORTANT prior RLS state: all 5 tables had RLS ENABLED (not FORCED) before this migration.
-- ============================================================================

BEGIN;

-- ==========================================================================
-- 1. advisor_firms
-- ==========================================================================

-- Existing table from 20260310_advisor_firms_and_invitations.sql — no-op.
ALTER TABLE public.advisor_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_firms FORCE  ROW LEVEL SECURITY;

-- Drop prior policies by exact name (discovered via grep above).
DROP POLICY IF EXISTS "Public can read active firms"   ON public.advisor_firms;
DROP POLICY IF EXISTS "Service role full access firms" ON public.advisor_firms;

-- Recreate with canonical role-specifier syntax.
CREATE POLICY "service_role full access"
  ON public.advisor_firms
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public can read active firms v2"
  ON public.advisor_firms
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

-- ==========================================================================
-- 2. advisor_firm_invitations
-- ==========================================================================

-- TODO: human review of policy semantics.
-- No auth.uid() linkage on this table — invitations are identified by token.
-- Most write operations (INSERT, UPDATE) are performed via admin client in
-- advisor-auth/firm/invite routes. Token-keyed SELECT paths also use admin
-- (approved C-03 exception). The service-role-only policy is intentional;
-- a per-token anon SELECT policy is not added here because it would require
-- a SECURITY DEFINER function or request-parameter injection neither of which
-- is standard RLS — the admin client is the correct access pattern here.

ALTER TABLE public.advisor_firm_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_firm_invitations FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access invitations" ON public.advisor_firm_invitations;

CREATE POLICY "service_role full access"
  ON public.advisor_firm_invitations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==========================================================================
-- 3. advisor_guide_content
-- ==========================================================================

ALTER TABLE public.advisor_guide_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_guide_content FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read advisor guides" ON public.advisor_guide_content;

CREATE POLICY "service_role full access"
  ON public.advisor_guide_content
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read advisor guides v2"
  ON public.advisor_guide_content
  FOR SELECT TO anon, authenticated
  USING (true);

-- ==========================================================================
-- 4. advisor_profile_views
-- ==========================================================================

ALTER TABLE public.advisor_profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_profile_views FORCE  ROW LEVEL SECURITY;

-- "Anyone can increment views" was already dropped in 20260309_security_and_performance_fixes.sql
-- but include here for idempotency on a DB with partial migration history.
DROP POLICY IF EXISTS "Anyone can increment views" ON public.advisor_profile_views;
DROP POLICY IF EXISTS "Public read advisor views"  ON public.advisor_profile_views;

CREATE POLICY "service_role full access"
  ON public.advisor_profile_views
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read advisor views v2"
  ON public.advisor_profile_views
  FOR SELECT TO anon, authenticated
  USING (true);

-- No INSERT policy: the original "Anyone can increment views" INSERT policy was
-- intentionally removed in 20260309_security_and_performance_fixes.sql. App code
-- has no active INSERT path for this table (view increments are tracked differently).
-- If an INSERT path is reintroduced, add a policy here and in the queue.

-- ==========================================================================
-- 5. advisor_article_moderation_log
-- ==========================================================================

ALTER TABLE public.advisor_article_moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_article_moderation_log FORCE  ROW LEVEL SECURITY;

-- Drop the misleading deny-all policy. "USING (false)" read as "nothing allowed"
-- but service_role bypasses RLS regardless, making it confusing in pg_policies.
DROP POLICY IF EXISTS "Service role only mod log" ON public.advisor_article_moderation_log;

CREATE POLICY "service_role full access"
  ON public.advisor_article_moderation_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- TODO: human review of policy semantics.
-- app/api/advisor-articles/route.ts:logMod() inserts via the cookie-based
-- server client (authenticated role) after verifying the caller is an admin
-- email (getAdminEmails() check). This INSERT policy allows any authenticated
-- user to write moderation log entries; the application-layer admin check is
-- the effective gate. A tighter approach would be to update logMod() to use
-- the admin client instead, removing the need for an authenticated INSERT
-- policy entirely. Tracked for follow-up in stream C (admin client scope).
CREATE POLICY "admin can log moderation"
  ON public.advisor_article_moderation_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

COMMIT;
