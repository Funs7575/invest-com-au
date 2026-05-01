-- ============================================================================
-- Migration: A-02 batch 6 — notification_preferences backfill + RLS
-- Date:      2026-05-02 (timestamped 20260609 to sort after 20260608* batch 5)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02 batch 6
--
-- Purpose
--   `notification_preferences` has no CREATE TABLE in the migration history
--   (confirmed via grep across all migrations — zero results). The table exists
--   in production (lib/database.types.ts declares it; app/api/notification-
--   preferences/route.ts reads and writes it). A fresh Supabase environment
--   built from migrations alone would be missing this table, breaking:
--     - GET /api/notification-preferences (user reads own prefs)
--     - POST /api/notification-preferences (user upserts own prefs)
--     - GET /api/cron/personalized-digest (reads all users with weekly_digest)
--
--   This migration backfills the CREATE TABLE and adds RLS appropriate for
--   per-user preference data.
--
-- Schema source: lib/database.types.ts notification_preferences.Row
--   id                  uuid PRIMARY KEY default gen_random_uuid()
--   user_id             uuid (FK → auth.users; nullable in types; UNIQUE for upsert)
--   fee_alerts          boolean
--   weekly_digest       boolean
--   deal_alerts         boolean
--   campaign_updates    boolean
--   marketing           boolean
--   created_at          timestamptz
--   updated_at          timestamptz
--
-- IMPORTANT — prior policy state
--   grep -rn "POLICY.*notification_preferences" supabase/migrations/*.sql → (no results)
--   grep -rn "notification_preferences" supabase/migrations/*.sql → (no results)
--   No prior policies exist. This is the first migration to touch this table.
--
-- Verified callers
--   app/api/notification-preferences/route.ts — createClient() (server, authenticated)
--     GET:  SELECT fee_alerts…marketing WHERE user_id = auth.uid()
--     POST: UPSERT { user_id, ...prefs, updated_at } ON CONFLICT (user_id)
--   app/api/cron/personalized-digest/route.ts  — createAdminClient() (service_role)
--     SELECT user_id WHERE weekly_digest = true (cross-user; service_role bypass)
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS — no-op when table already exists.
--   ENABLE/FORCE ROW LEVEL SECURITY — no-op when already set.
--   DROP POLICY IF EXISTS + CREATE POLICY — safe to re-run.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"         ON notification_preferences;
--     DROP POLICY IF EXISTS "User can manage own preferences"  ON notification_preferences;
--     ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
--     -- Only drop the table on a fresh environment (data loss on prod):
--     -- DROP TABLE IF EXISTS notification_preferences;
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  fee_alerts        boolean,
  weekly_digest     boolean,
  deal_alerts       boolean,
  campaign_updates  boolean,
  marketing         boolean,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences (user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE  ROW LEVEL SECURITY;

-- No prior policies to drop (first migration to touch this table).

CREATE POLICY "service_role full access"
  ON public.notification_preferences
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Users can read and write only their own preference row.
-- The POST route uses upsert ON CONFLICT(user_id), which requires both
-- INSERT (for new users) and UPDATE (for existing) — FOR ALL covers both.
CREATE POLICY "User can manage own preferences"
  ON public.notification_preferences
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
