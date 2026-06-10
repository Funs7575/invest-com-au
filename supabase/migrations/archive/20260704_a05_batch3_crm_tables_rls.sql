-- Migration: 20260704_a05_batch3_crm_tables_rls.sql
-- Date: 2026-07-04
-- Audit ref: codebase-health-2026-04-24.md §4 (drift backfill)
-- Queue item: A-05 batch 3 — CRM table RLS hardening
-- Why: Three CRM tables (bd_pipeline, competitor_watch, broker_outreach_log)
--      exist in database.types.ts without ENABLE ROW LEVEL SECURITY. Without
--      RLS, PostgREST exposes them via the anon key. bd_pipeline and
--      competitor_watch contain business development intelligence (partner
--      contact details, deal notes, CPA rates, competitor intel); they must
--      be service_role-only. broker_outreach_log contains outreach contact
--      info and is currently accessed via the browser client by admin users.
-- Idempotency: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS are no-ops
--   on re-run. ENABLE RLS + FORCE RLS are idempotent.
-- Rollback:
--   ALTER TABLE public.bd_pipeline DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.competitor_watch DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "Service role manages bd_pipeline" ON public.bd_pipeline;
--   ALTER TABLE public.broker_outreach_log DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "Authenticated admin can manage broker_outreach_log" ON public.broker_outreach_log;
--   DROP POLICY IF EXISTS "Service role manages broker_outreach_log" ON public.broker_outreach_log;
--
-- IMPORTANT — prior policy state:
--   bd_pipeline: 20260513_fix_public_read_leaks.sql dropped "Public can read
--     BD pipeline" with no replacement. Table has zero policies post-drop.
--   competitor_watch: 20260513 dropped "Public read competitor_watch" and
--     added "Service role manages competitor_watch". This migration keeps that
--     policy (via DROP IF + re-CREATE) and adds ENABLE/FORCE RLS.
--   broker_outreach_log: no prior policies in any migration.
--   -- TODO: human review — broker_outreach_log is accessed by the browser
--   anon client (app/admin/broker-outreach/page.tsx uses createClient()).
--   Ideal fix: switch to createAdminClient() server action and tighten to
--   service_role. Until then, FOR ALL TO authenticated allows the current
--   code path to work after RLS is enabled.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. bd_pipeline
--    Callers: app/api/admin/bd-pipeline/route.ts (createAdminClient)
--    Access: service_role only — business development pipeline, PII + deal data.
--    Prior policies: "Public can read BD pipeline" dropped in 20260513,
--      no replacement added. Zero policies currently.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bd_pipeline (
  id                SERIAL PRIMARY KEY,
  company_name      TEXT        NOT NULL,
  contact_name      TEXT,
  contact_email     TEXT,
  contact_linkedin  TEXT,
  partnership_type  TEXT,
  status            TEXT,
  cpa_rate          TEXT,
  deal_notes        TEXT,
  last_contact_date DATE,
  next_action       TEXT,
  next_action_date  DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bd_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_pipeline FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read BD pipeline" ON public.bd_pipeline;
DROP POLICY IF EXISTS "Service role manages bd_pipeline" ON public.bd_pipeline;
CREATE POLICY "Service role manages bd_pipeline"
  ON public.bd_pipeline
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. competitor_watch
--    Callers: app/api/admin/competitors/route.ts (createAdminClient)
--    Access: service_role only — internal competitive intelligence.
--    Prior policies: "Service role manages competitor_watch" from 20260513.
--      Kept via DROP IF EXISTS + recreate. ENABLE RLS was never added.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.competitor_watch (
  id          SERIAL PRIMARY KEY,
  competitor  TEXT        NOT NULL,
  event_type  TEXT        NOT NULL DEFAULT 'general',
  title       TEXT        NOT NULL,
  detail      TEXT,
  url         TEXT,
  spotted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.competitor_watch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_watch FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read competitor_watch"       ON public.competitor_watch;
DROP POLICY IF EXISTS "Service role manages competitor_watch" ON public.competitor_watch;
CREATE POLICY "Service role manages competitor_watch"
  ON public.competitor_watch
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. broker_outreach_log
--    Callers: app/admin/broker-outreach/page.tsx (createClient — browser, authenticated)
--    Access: authenticated admin users via browser client (current); service_role
--      (cron/API routes if added later).
--    Prior policies: none in any migration.
--    TODO: human review — switch page.tsx to a server action + createAdminClient()
--      so this policy can be tightened to service_role-only.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.broker_outreach_log (
  id            SERIAL PRIMARY KEY,
  broker_name   TEXT        NOT NULL,
  broker_slug   TEXT,
  contact_name  TEXT        NOT NULL,
  contact_email TEXT        NOT NULL,
  sent_by       TEXT        NOT NULL,
  notes         TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.broker_outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_outreach_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated admin can manage broker_outreach_log" ON public.broker_outreach_log;
DROP POLICY IF EXISTS "Service role manages broker_outreach_log"            ON public.broker_outreach_log;

-- Allows existing browser-client admin page to continue reading/writing.
-- TODO: narrow to service_role after page.tsx is migrated to createAdminClient().
CREATE POLICY "Authenticated admin can manage broker_outreach_log"
  ON public.broker_outreach_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role manages broker_outreach_log"
  ON public.broker_outreach_log
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
