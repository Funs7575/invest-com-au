-- Migration: 20260703_a05_batch2_ops_tables_rls.sql
-- Date: 2026-07-03
-- Audit ref: codebase-health-2026-04-24.md §4 (drift backfill)
-- Queue item: A-05 batch 2 — ops/observability table RLS hardening
-- Why: Four ops tables (cron_health_alerts, webhook_delivery_queue,
--      posthog_events_mirror, rate_limits) exist in database.types.ts and
--      are actively used in production but have no CREATE TABLE migration
--      backfill and no ENABLE ROW LEVEL SECURITY. Without RLS enabled,
--      the tables' data is accessible via the anon key — a security gap
--      for internal infrastructure tables. This migration:
--        1. Backfills CREATE TABLE IF NOT EXISTS for each table.
--        2. Enables and forces RLS.
--        3. Adds explicit service_role-only policies for the three
--           internal tables whose callers all use createAdminClient().
--        4. For rate_limits, retains anon+authenticated access (required
--           for unauthenticated rate limiting via lib/rate-limit.ts).
-- Idempotency: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS means
--   re-running is safe. ENABLE RLS + FORCE RLS are no-ops when already set.
-- Rollback:
--   ALTER TABLE public.cron_health_alerts DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.webhook_delivery_queue DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.posthog_events_mirror DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "Service role manages rate_limits" ON public.rate_limits;
--   DROP POLICY IF EXISTS "Anon and authenticated can upsert rate limits" ON public.rate_limits;
--   ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
--
-- IMPORTANT — prior policy state for rate_limits:
--   20260309_security_and_performance_fixes.sql:363-369 creates
--   "Upsert rate limits" FOR ALL TO anon, authenticated USING(true)
--   dynamically inside a DO $$...IF EXISTS... block. This migration drops
--   that policy by exact name and recreates it as a stable named policy.
--   The cron_health_alerts, webhook_delivery_queue, and posthog_events_mirror
--   tables had no prior policies.

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. cron_health_alerts
--    Callers: app/api/cron/cron-health-alert/route.ts (createAdminClient)
--             app/api/cron/observability-retention/route.ts (createAdminClient)
--    Access: service_role only — internal cron alerting system.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cron_health_alerts (
  id         SERIAL PRIMARY KEY,
  endpoint   TEXT        NOT NULL,
  kind       TEXT        NOT NULL,
  cadence    TEXT        NOT NULL,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cron_health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_health_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages cron_health_alerts" ON public.cron_health_alerts;
CREATE POLICY "Service role manages cron_health_alerts"
  ON public.cron_health_alerts
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. webhook_delivery_queue
--    Callers: app/api/marketplace/postback/route.ts (createAdminClient)
--             app/api/cron/retry-webhooks/route.ts (createAdminClient)
--    Access: service_role only — internal retry queue.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_delivery_queue (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_slug         TEXT        NOT NULL,
  conversion_event_id INTEGER     NOT NULL,
  webhook_url         TEXT        NOT NULL,
  payload             JSONB       NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending',
  attempt_count       INTEGER     NOT NULL DEFAULT 0,
  max_attempts        INTEGER     NOT NULL DEFAULT 5,
  next_retry_at       TIMESTAMPTZ,
  last_error          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.webhook_delivery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_queue FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages webhook_delivery_queue" ON public.webhook_delivery_queue;
CREATE POLICY "Service role manages webhook_delivery_queue"
  ON public.webhook_delivery_queue
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. posthog_events_mirror
--    Callers: supabase/functions/posthog-webhook-ingest/index.ts (service_role)
--    Access: service_role only — mirror table populated by Edge Function.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posthog_events_mirror (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  posthog_event_id  TEXT        NOT NULL,
  distinct_id       TEXT        NOT NULL,
  event_name        TEXT        NOT NULL,
  event_timestamp   TIMESTAMPTZ NOT NULL,
  properties        JSONB       NOT NULL DEFAULT '{}',
  person_properties JSONB,
  browser           TEXT,
  city              TEXT,
  country           TEXT,
  device_type       TEXT,
  os                TEXT,
  referrer          TEXT,
  session_id        TEXT,
  url               TEXT,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  ingested_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.posthog_events_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posthog_events_mirror FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages posthog_events_mirror" ON public.posthog_events_mirror;
CREATE POLICY "Service role manages posthog_events_mirror"
  ON public.posthog_events_mirror
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. rate_limits
--    Callers: lib/rate-limit.ts (createClient — server client, anon or auth)
--             app/api/cron/cleanup/route.ts (createAdminClient — service_role)
--    Access: anon + authenticated for upsert/select (rate limiting must work
--    without a user JWT); service_role for cron DELETE/SELECT.
--    IMPORTANT — prior policy state (see header comment).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           SERIAL PRIMARY KEY,
  key          TEXT        NOT NULL,
  count        INTEGER     NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rate_limits_key_unique UNIQUE (key)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- Drop the prior dynamically-created policy from 20260309 (all three names it
-- used across different migrations, to ensure a clean idempotent state).
DROP POLICY IF EXISTS "Upsert rate limits"           ON public.rate_limits;
DROP POLICY IF EXISTS "Insert rate limits"           ON public.rate_limits;
DROP POLICY IF EXISTS "Anyone can insert rate limits" ON public.rate_limits;

-- Rate limiting works for unauthenticated requests — anon + authenticated
-- callers via lib/rate-limit.ts (createClient) must be able to read/write.
CREATE POLICY "Anon and authenticated can upsert rate limits"
  ON public.rate_limits
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Explicit service_role allow for cron cleanup (createAdminClient DELETE).
CREATE POLICY "Service role manages rate_limits"
  ON public.rate_limits
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
