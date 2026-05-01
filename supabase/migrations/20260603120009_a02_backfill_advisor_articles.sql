-- ============================================================================
-- Migration: Backfill public.advisor_articles (A-02 batch 3)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_articles` is declared in `lib/database.types.ts` (line 455) and
--   has 45 call sites, but the migration tree has no CREATE TABLE. RLS was
--   never enabled. `20260309_security_and_performance_fixes.sql` creates
--   INSERT and UPDATE policies in a conditional DO block (IF table exists).
--
-- Verified callers (grep app/ lib/)
--   Anon-key server createClient() callers (RLS applies):
--     - app/sitemap.ts                      SELECT WHERE status='published'
--     - app/term-deposits/page.tsx          SELECT WHERE status='published'
--     - app/property-platforms/page.tsx     SELECT WHERE status='published'
--     - app/super/page.tsx                  SELECT WHERE status='published'
--     - app/api/advisor-articles/route.ts   SELECT WHERE status='published'
--                                           UPDATE view_count (counter increment)
--     - app/api/advisor-articles/route.ts   SELECT WHERE professional_id=X
--                                           (advisor mode — authenticated role)
--   Admin-client callers (BYPASSRLS):
--     - app/api/advisor-articles/route.ts   admin select/update (mode=admin)
--     - app/admin/page.tsx                  SELECT count (browser createClient,
--                                           authenticated admin role)
--     - app/admin/revenue/page.tsx          SELECT (authenticated admin)
--     - app/api/admin/ai-chat/route.ts      SELECT
--     - various cron/moderation routes
--
-- IMPORTANT — prior policy state on advisor_articles:
--   `20260309_security_and_performance_fixes.sql` (lines 384-403) creates
--   "Insert advisor articles" and "Update advisor articles" FOR authenticated
--   in a conditional DO block (IF table exists). No ENABLE RLS. This migration
--   is the first time RLS is enabled on this table.
--
-- RLS policy chosen
--   - service_role: ALL (admin client callers bypass RLS regardless).
--   - anon + authenticated SELECT WHERE status='published': for public pages,
--     sitemap, and the article-by-slug fetch in advisor-articles route.
--   - authenticated SELECT on own articles: advisor-mode route fetches all
--     articles for a specific professional_id (owned by the advisor).
--   - authenticated INSERT WITH CHECK (professional_id IS NOT NULL): mirrors
--     20260309 "Insert advisor articles"; 20260309 re-creates this idempotently.
--   - authenticated UPDATE USING (true) WITH CHECK (professional_id IS NOT NULL):
--     mirrors 20260309 "Update advisor articles".
--   - anon UPDATE (view_count, click_count only): column-scoped via REVOKE +
--     GRANT. advisor-articles route increments view_count on public articles
--     via createClient() (anon). Pattern matches investment_listings counters.
--
-- TODO: human review of policy semantics
--   - "authenticated UPDATE USING (true)" allows any authenticated user to
--     update any advisor article. Long-term fix: scope to own articles via
--     professional_id IN (SELECT id FROM professionals WHERE auth_user_id=uid).
--   - "authenticated SELECT on own articles" queries by professional_id
--     parameter without RLS verification of ownership; a caller could supply
--     any professional_id. Long-term: scope via professionals.auth_user_id join.
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS, ENABLE/FORCE RLS, DROP POLICY IF EXISTS +
--   CREATE POLICY — idempotent. REVOKE/GRANT are idempotent no-ops when the
--   privilege state already matches.
--
-- Rollback
--   BEGIN;
--     GRANT UPDATE ON public.advisor_articles TO anon;
--     DROP POLICY IF EXISTS "service_role full access"    ON public.advisor_articles;
--     DROP POLICY IF EXISTS "Public read published"       ON public.advisor_articles;
--     DROP POLICY IF EXISTS "Advisor read own articles"   ON public.advisor_articles;
--     DROP POLICY IF EXISTS "Insert advisor articles"     ON public.advisor_articles;
--     DROP POLICY IF EXISTS "Update advisor articles"     ON public.advisor_articles;
--     DROP POLICY IF EXISTS "Anon update counters"        ON public.advisor_articles;
--     ALTER TABLE public.advisor_articles NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.advisor_articles DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_articles; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_articles (
  id                    serial        PRIMARY KEY,
  professional_id       integer       NOT NULL REFERENCES public.professionals(id),
  author_name           text          NOT NULL,
  content               text          NOT NULL,
  status                text          NOT NULL,
  title                 text          NOT NULL,
  admin_notes           text,
  author_firm           text,
  author_photo_url      text,
  author_slug           text,
  avg_read_time_seconds numeric,
  canonical_url         text,
  category              text,
  click_count           integer,
  cover_image_url       text,
  excerpt               text,
  featured              boolean,
  lead_clicks           integer,
  meta_description      text,
  meta_title            text,
  moderation_score      numeric,
  paid_at               timestamptz,
  payment_reference     text,
  payment_status        text,
  price_cents           integer,
  pricing_tier          text,
  profile_clicks        integer,
  published_at          timestamptz,
  read_time             integer,
  reading_time_mins     integer,
  rejection_reason      text,
  related_advisor_type  text,
  related_advisor_types text[],
  related_broker_slugs  text[],
  related_brokers       text[],
  reviewed_at           timestamptz,
  reviewed_by           text,
  share_count           integer,
  slug                  text,
  submitted_at          timestamptz,
  tags                  text[],
  view_count            integer,
  word_count            integer,
  created_at            timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now()
);

ALTER TABLE public.advisor_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_articles FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"  ON public.advisor_articles;
DROP POLICY IF EXISTS "Public read published"     ON public.advisor_articles;
DROP POLICY IF EXISTS "Advisor read own articles" ON public.advisor_articles;
DROP POLICY IF EXISTS "Insert advisor articles"   ON public.advisor_articles;
DROP POLICY IF EXISTS "Update advisor articles"   ON public.advisor_articles;
DROP POLICY IF EXISTS "Anon update counters"      ON public.advisor_articles;

CREATE POLICY "service_role full access"
  ON public.advisor_articles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public pages (sitemap, term-deposits, property-platforms, super) and the
-- article-by-slug fetch use createClient() (anon) with .eq("status","published").
CREATE POLICY "Public read published"
  ON public.advisor_articles
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Advisor portal reads own articles (all statuses, filtered by professional_id).
-- Scoped to the advisor's own articles via the professionals table.
CREATE POLICY "Advisor read own articles"
  ON public.advisor_articles
  FOR SELECT TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

-- Mirrors 20260309 "Insert advisor articles"; 20260309 re-creates idempotently.
CREATE POLICY "Insert advisor articles"
  ON public.advisor_articles
  FOR INSERT TO authenticated
  WITH CHECK (professional_id IS NOT NULL);

-- Mirrors 20260309 "Update advisor articles"; 20260309 re-creates idempotently.
CREATE POLICY "Update advisor articles"
  ON public.advisor_articles
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (professional_id IS NOT NULL);

-- Counter-only UPDATE for anon. The advisor-articles route increments
-- view_count on published articles via createClient() (anon key). Column
-- scope is enforced below by GRANT (view_count, click_count) only — the
-- same pattern as investment_listings counters.
CREATE POLICY "Anon update counters"
  ON public.advisor_articles
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Narrow anon UPDATE to counter columns only. Without this, the policy above
-- lets anon edit any column (title, content, status, etc.).
REVOKE UPDATE ON public.advisor_articles FROM anon;
GRANT  UPDATE (view_count, click_count) ON public.advisor_articles TO anon;

COMMIT;
