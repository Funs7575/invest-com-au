-- ============================================================
-- Add missing `service` + `details` columns to health_pings
--
-- Bug discovered 2026-04-26 during P0-1 (cron silence) deep-dive.
-- The heartbeat cron handler at app/api/cron/heartbeat/route.ts:32
-- inserts:
--
--     .from("health_pings")
--     .insert({
--       service: "cron-heartbeat",   ← column doesn't exist
--       status: "ok",
--       latency_ms: 0,
--       details: { commit, region }, ← column doesn't exist
--     })
--
-- And /api/health/route.ts:50 reads:
--
--     .eq("service", "cron-heartbeat")  ← column doesn't exist
--
-- Both fail with PostgreSQL error 42703 (`column "service" of
-- relation "health_pings" does not exist`). Verified live via
-- Supabase MCP 2026-04-26 18:46 UTC.
--
-- Net effect: heartbeat has been failing on every invocation since
-- the table was created (`health_pings` is genuinely empty — never
-- received a real row). /api/health returns 503 because the
-- cron_freshness check throws on the missing column.
--
-- Generated types (lib/database.types.ts:6805) confirm the table
-- only has: (id, status, latency_ms, created_at). So the schema
-- has always been wrong relative to the code.
--
-- This is part of the 04-24 audit's "231 tables drifted" set —
-- the migration that should have added these columns was either
-- never authored or was lost.
--
-- Fix: add both columns idempotently. Insert default for `service`
-- so existing rows (currently 0) get a sensible value if any
-- backfill is needed later.
--
-- Rollback (operator-only):
--   ALTER TABLE public.health_pings DROP COLUMN IF EXISTS details;
--   ALTER TABLE public.health_pings DROP COLUMN IF EXISTS service;
--
-- Audit ref: docs/audits/2026-04-26-comprehensive-audit.md §9.1
--   (P0-1 follow-up — adjacent root cause to dispatcher silence)
-- Sprint: 1, late session
-- Effort: ~10 min
-- Metric: M07 (Supabase advisor surface — schema drift -1)
-- ============================================================

ALTER TABLE public.health_pings
  ADD COLUMN IF NOT EXISTS service text;

ALTER TABLE public.health_pings
  ADD COLUMN IF NOT EXISTS details jsonb;

-- Index on `service` so the /api/health freshness lookup
-- (`WHERE service='cron-heartbeat' ORDER BY created_at DESC LIMIT 1`)
-- doesn't sequential-scan as the table grows.
CREATE INDEX IF NOT EXISTS idx_health_pings_service_created_at
  ON public.health_pings (service, created_at DESC);
