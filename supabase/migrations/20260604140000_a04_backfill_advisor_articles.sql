-- ============================================================================
-- Migration: Backfill public.advisor_articles (A-04 batch 1 of 4)
-- Date:      2026-05-01 (queued under 20260604 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-04
--
-- Purpose
--   `advisor_articles` exists in `lib/database.types.ts` (line 455) and is used
--   by ~10 call sites (sitemap, hub pages, admin pages, advisor portal). However,
--   no CREATE TABLE migration exists — the table was created out-of-tree. This
--   migration brings the schema declaration in-tree so that a fresh Supabase
--   rebuild matches the app's TypeScript expectations.
--
-- Callers (client type):
--   - app/sitemap.ts: createClient (server, anon) — SELECT WHERE status='published'
--   - app/term-deposits/page.tsx: createClient (server, anon) — public hub page
--   - app/property-platforms/page.tsx: createClient (server, anon) — public hub page
--   - app/super/page.tsx: createClient (server, anon) — public hub page
--   - app/admin/page.tsx: createClient (browser, authenticated admin) — admin CRUD
--   - app/admin/revenue/page.tsx: createClient (browser, authenticated admin) — admin read
--   - app/api/admin/content/generate-draft/route.ts: createAdminClient() — service-role
--     (legitimate admin API route)
--
-- IMPORTANT — prior policy state (from 20260309_security_and_performance_fixes.sql):
--   The 20260309 migration conditionally created two policies (if the table existed):
--     CREATE POLICY "Insert advisor articles" ON advisor_articles
--       FOR INSERT TO authenticated WITH CHECK (professional_id IS NOT NULL)
--     CREATE POLICY "Update advisor articles" ON advisor_articles
--       FOR UPDATE TO authenticated USING (true) WITH CHECK (professional_id IS NOT NULL)
--   These policies are too permissive — any authenticated user can insert or update
--   any advisor article. This migration drops them and replaces with scoped policies.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL (audit visibility; bypasses RLS regardless).
--   - anon SELECT: WHERE status='published' — public hub pages read published articles.
--   - authenticated SELECT: same WHERE status='published' (anon policy covers this but
--     explicit authenticated rule makes intent clear).
--   - Admin FOR ALL: authenticated users with admin role metadata (browser admin pages).
--   - TODO: human review of policy semantics — advisor INSERT/UPDATE scope not
--     resolvable via auth.uid() alone. `professional_id` references `professionals`
--     (not auth.users) so a link table lookup (advisor_sessions or similar) would be
--     needed to scope mutations to the owning advisor. The advisor portal currently
--     uses createAdminClient() for article mutations (legitimate per CLAUDE.md §
--     "anonymous-path lib/* helpers" — no anon INSERT policy exists), which bypasses
--     RLS. This migration does NOT add advisor self-service INSERT/UPDATE policies;
--     that is left for a future iteration after the professional→auth.uid() mapping
--     is formalised.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"    ON public.advisor_articles;
--     DROP POLICY IF EXISTS "anon can read published"     ON public.advisor_articles;
--     DROP POLICY IF EXISTS "authenticated read published" ON public.advisor_articles;
--     DROP POLICY IF EXISTS "admin full access"           ON public.advisor_articles;
--     -- Restore prior policies from 20260309 if needed (run that migration again).
--     ALTER TABLE public.advisor_articles DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_articles; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_articles (
  id                    SERIAL PRIMARY KEY,
  professional_id       INTEGER       NOT NULL,
  author_name           TEXT          NOT NULL,
  content               TEXT          NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'draft',
  slug                  TEXT,
  category              TEXT,
  excerpt               TEXT,
  cover_image_url       TEXT,
  meta_title            TEXT,
  meta_description      TEXT,
  canonical_url         TEXT,
  featured              BOOLEAN,
  read_time             INTEGER,
  reading_time_mins     INTEGER,
  avg_read_time_seconds INTEGER,
  click_count           INTEGER       DEFAULT 0,
  lead_clicks           INTEGER       DEFAULT 0,
  profile_clicks        INTEGER       DEFAULT 0,
  share_count           INTEGER       DEFAULT 0,
  author_firm           TEXT,
  author_photo_url      TEXT,
  author_slug           TEXT,
  related_advisor_type  TEXT,
  related_advisor_types TEXT[],
  related_broker_slugs  TEXT[],
  related_brokers       TEXT[],
  rejection_reason      TEXT,
  admin_notes           TEXT,
  moderation_score      NUMERIC,
  reviewed_by           TEXT,
  reviewed_at           TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  published_at          TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  payment_status        TEXT,
  payment_reference     TEXT,
  price_cents           INTEGER,
  pricing_tier          TEXT,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT advisor_articles_professional_id_fkey
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE
);

ALTER TABLE public.advisor_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_articles FORCE  ROW LEVEL SECURITY;

-- Drop prior policies from 20260309_security_and_performance_fixes.sql
DROP POLICY IF EXISTS "Insert advisor articles" ON public.advisor_articles;
DROP POLICY IF EXISTS "Update advisor articles" ON public.advisor_articles;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_articles;
CREATE POLICY "service_role full access"
  ON public.advisor_articles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can read published" ON public.advisor_articles;
CREATE POLICY "anon can read published"
  ON public.advisor_articles
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "authenticated read published" ON public.advisor_articles;
CREATE POLICY "authenticated read published"
  ON public.advisor_articles
  FOR SELECT TO authenticated
  USING (status = 'published');

-- Admin browser pages (app/admin/*) use createClient() (browser anon key).
-- Authenticated admins use the `authenticated` DB role with admin role metadata.
-- TODO: human review of policy semantics — consider narrowing to specific columns
-- or adding a dedicated admin_role() SQL function for clarity.
DROP POLICY IF EXISTS "admin full access" ON public.advisor_articles;
CREATE POLICY "admin full access"
  ON public.advisor_articles
  FOR ALL TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
