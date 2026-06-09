-- ============================================================================
-- Migration: Backfill public.conversion_events (A-03 batch 2 of ~8)
-- Date:      2026-05-01 (queued under 20260606 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03
--
-- Purpose
--   `conversion_events` exists in `lib/database.types.ts` and is used by the
--   marketplace postback API and the broker portal dashboard. No CREATE TABLE
--   migration exists. This migration brings the schema declaration in-tree.
--
-- Callers (client type):
--   - app/api/marketplace/postback/route.ts: createAdminClient() (service-role)
--     — writes postback conversion events (INSERT), reads for dedup (SELECT).
--   - app/broker-portal/page.tsx: createClient (browser, authenticated broker)
--     — reads own conversions (.eq("broker_slug", slug)).
--   - app/broker-portal/conversions/page.tsx: createClient (browser, authenticated)
--     — reads own conversions.
--   - app/broker-portal/analytics/page.tsx: createClient (browser, authenticated)
--     — reads own conversions.
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*conversion_events|conversion_events.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — postback route + admin reporting.
--   - authenticated SELECT (broker-scoped): broker portal pages use browser
--     authenticated client. Scoped via broker_slug join to broker_accounts
--     using auth_user_id = auth.uid()::text. Broker can only read own events.
--   - anon: no policy — conversion data is proprietary to each broker.
--   - TODO: human review — broker INSERT policy omitted intentionally.
--     All INSERT calls go through the postback route (admin client, bypasses
--     RLS). If a broker self-service insert path is ever added, a scoped
--     WITH CHECK (broker_slug = (SELECT broker_slug FROM broker_accounts
--     WHERE auth_user_id = auth.uid()::text)) INSERT policy is needed.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"        ON public.conversion_events;
--     DROP POLICY IF EXISTS "broker can view own conversions" ON public.conversion_events;
--     ALTER TABLE public.conversion_events DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.conversion_events; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id                       SERIAL PRIMARY KEY,
  broker_slug              TEXT        NOT NULL,
  campaign_id              INTEGER,
  click_id                 TEXT,
  event_type               TEXT        NOT NULL,
  conversion_value_cents   INTEGER,
  source                   TEXT,
  ip_hash                  TEXT,
  metadata                 JSONB,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_broker_slug
  ON public.conversion_events (broker_slug);

CREATE INDEX IF NOT EXISTS idx_conversion_events_campaign_id
  ON public.conversion_events (campaign_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_click_id
  ON public.conversion_events (click_id);

CREATE INDEX IF NOT EXISTS idx_conversion_events_created_at
  ON public.conversion_events (created_at DESC);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.conversion_events;
CREATE POLICY "service_role full access"
  ON public.conversion_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Broker portal reads: authenticated broker sees only their own conversions.
-- broker_accounts.auth_user_id is a TEXT column storing the Supabase auth UUID.
DROP POLICY IF EXISTS "broker can view own conversions" ON public.conversion_events;
CREATE POLICY "broker can view own conversions"
  ON public.conversion_events
  FOR SELECT TO authenticated
  USING (
    broker_slug = (
      SELECT broker_slug
        FROM public.broker_accounts
       WHERE auth_user_id = auth.uid()::text
       LIMIT 1
    )
  );

COMMIT;
