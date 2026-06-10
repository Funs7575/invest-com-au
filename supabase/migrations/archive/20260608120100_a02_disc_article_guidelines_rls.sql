-- ============================================================================
-- Migration: A-DISC-20260502-01 — article_guidelines FORCE RLS + service_role
-- Date:      2026-05-02 (timestamped 20260608120100 to sort after batch 5)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-DISC-20260502-01
--
-- Purpose
--   `article_guidelines` was created with ENABLE ROW LEVEL SECURITY and a
--   "Public read guidelines" SELECT policy in 20260310_content_architecture.sql
--   (line 114–115), but two hygiene issues remain:
--     1. FORCE ROW LEVEL SECURITY was not applied — superuser connections
--        bypass RLS unless FORCE is set.
--     2. No explicit service_role policy — the intent (service_role allowed)
--        is invisible in pg_policies; relies on implicit RLS bypass, making
--        audit queries ambiguous.
--   Additionally, the existing SELECT policy has no `TO` role specifier,
--   which implicitly applies to all roles; the canonical form names the roles
--   explicitly.
--
-- Table
--   article_guidelines — public reference table of AI content compliance
--   guidelines shown to advisors during article creation. No PII.
--
-- IMPORTANT — prior policy state (discovered by grep)
--
--   article_guidelines (20260310_content_architecture.sql:114-115):
--     ALTER TABLE article_guidelines ENABLE ROW LEVEL SECURITY;
--     CREATE POLICY "Public read guidelines" ON article_guidelines
--       FOR SELECT USING (active = true);
--     (no TO clause — implicit all roles; no FORCE RLS; no service_role policy)
--
-- Verified callers
--   app/api/advisor-articles/route.ts:98 — admin client (service_role)
--     SELECT key/title/description/sort_order WHERE active=true, ORDER sort_order
--   No anon/authenticated callers found in app/ or lib/.
--   The public SELECT policy is retained for future anonymous enumeration
--   of active guidelines (e.g., a public /guidelines endpoint) — it is a
--   public-reference table with no PII.
--
-- Idempotency
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - FORCE ROW LEVEL SECURITY  — no-op if already forced.
--   - DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run.
--   (All five tables pre-exist — this migration only alters policies.)
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON article_guidelines;
--     DROP POLICY IF EXISTS "Public read guidelines v2" ON article_guidelines;
--     CREATE POLICY "Public read guidelines" ON article_guidelines
--       FOR SELECT USING (active = true);
--     ALTER TABLE article_guidelines DISABLE ROW LEVEL SECURITY;
--   COMMIT;
--   NOTE: rollback does not re-disable RLS if it was enabled before this migration.
-- ============================================================================

BEGIN;

ALTER TABLE public.article_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_guidelines FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read guidelines" ON public.article_guidelines;

CREATE POLICY "service_role full access"
  ON public.article_guidelines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Public read guidelines v2"
  ON public.article_guidelines
  FOR SELECT TO anon, authenticated
  USING (active = true);

COMMIT;
