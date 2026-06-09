-- ============================================================================
-- Migration: Backfill public.content_calendar (A-04 batch 3 of 4)
-- Date:      2026-05-01 (queued under 20260604 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-04
--
-- Purpose
--   `content_calendar` exists in `lib/database.types.ts` (line 4459-ish) and is
--   used by the admin content calendar page and the AI draft generation route.
--   No CREATE TABLE migration exists. This migration brings the schema in-tree.
--
-- Callers (client type):
--   - app/admin/content-calendar/page.tsx: createClient (browser, authenticated admin)
--     — full CUD (SELECT/INSERT/UPDATE/DELETE)
--   - app/api/admin/content/generate-draft/route.ts: createAdminClient() (service-role)
--     — reads calendar items, writes back AI-generated article drafts
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*content_calendar|content_calendar.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — the AI draft generation route uses admin client.
--   - Admin FOR ALL: authenticated admin users (browser client) — calendar management.
--   - anon: no policy — deny by default. Editorial calendar is internal-only.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.content_calendar;
--     DROP POLICY IF EXISTS "admin full access"        ON public.content_calendar;
--     ALTER TABLE public.content_calendar DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.content_calendar; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.content_calendar (
  id                    SERIAL PRIMARY KEY,
  title                 TEXT          NOT NULL,
  article_type          TEXT          NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'planned',
  category              TEXT,
  target_keyword        TEXT,
  secondary_keywords    JSONB,
  brief                 TEXT,
  priority              TEXT,
  target_publish_date   DATE,
  actual_publish_date   DATE,
  article_id            INTEGER,
  assigned_author_id    INTEGER,
  assigned_reviewer_id  INTEGER,
  internal_links        JSONB,
  related_brokers       JSONB,
  related_tools         JSONB,
  ai_model              TEXT,
  ai_draft_generated_at TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT content_calendar_article_id_fkey
    FOREIGN KEY (article_id) REFERENCES public.articles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_status
  ON public.content_calendar (status);

CREATE INDEX IF NOT EXISTS idx_content_calendar_target_publish_date
  ON public.content_calendar (target_publish_date);

ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.content_calendar;
CREATE POLICY "service_role full access"
  ON public.content_calendar
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin full access" ON public.content_calendar;
CREATE POLICY "admin full access"
  ON public.content_calendar
  FOR ALL TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
