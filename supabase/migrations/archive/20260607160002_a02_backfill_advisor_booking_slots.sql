-- ============================================================================
-- Migration: Backfill public.advisor_booking_slots (A-02 batch 4 of ~8)
-- Date:      2026-05-01 (queued under 20260607 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_booking_slots` exists in `lib/database.types.ts` and is used by
--   the public booking availability endpoint. No prior schema declaration found in tree.
--   This migration brings the schema declaration in-tree.
--
-- Callers (client type):
--   - app/api/advisor-booking/route.ts: createClient() (server, anon key)
--     — GET handler reads active slots for a professional to show availability.
--   - app/api/advisor-dashboard/route.ts: createClient() (server, anon key with
--     advisor session cookie) — advisor reads and manages their own slots.
--
-- IMPORTANT — prior policy state: no prior policies found in any migration.
--   `grep -nE "(POLICY.*advisor_booking_slots|advisor_booking_slots.*POLICY)" migrations/*.sql`
--   returns no results. First RLS migration on this table.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL — admin slot management.
--   - anon SELECT: USING (is_active = true) — public booking flow shows only
--     active slots. Advisor dashboard reads filtered by professional_id in the
--     app's WHERE clause.
--   - TODO: human review — advisor self-write policy. Advisor dashboard manages
--     slots via anon client (advisor_sessions auth, not Supabase auth JWT).
--     INSERT/UPDATE/DELETE on slots should ideally be advisor-scoped. For now,
--     these operations go through the admin client or are blocked (slots are
--     typically managed via the advisor dashboard which uses the anon client —
--     a future advisor-session-based policy would be needed here).
--
-- Idempotency
--   - IF NOT EXISTS guard on table + index creates — no-op if already applied.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"     ON public.advisor_booking_slots;
--     DROP POLICY IF EXISTS "anon can view active slots"   ON public.advisor_booking_slots;
--     ALTER TABLE public.advisor_booking_slots DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_booking_slots; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_booking_slots (
  id                    SERIAL PRIMARY KEY,
  professional_id       INTEGER     NOT NULL,
  day_of_week           INTEGER     NOT NULL,
  start_time            TEXT        NOT NULL,
  end_time              TEXT        NOT NULL,
  slot_duration_minutes INTEGER,
  is_active             BOOLEAN     DEFAULT true,
  CONSTRAINT advisor_booking_slots_professional_id_fkey
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advisor_booking_slots_professional_id
  ON public.advisor_booking_slots (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_booking_slots_active
  ON public.advisor_booking_slots (professional_id, is_active) WHERE is_active = true;

ALTER TABLE public.advisor_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_booking_slots FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_booking_slots;
CREATE POLICY "service_role full access"
  ON public.advisor_booking_slots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can view active slots" ON public.advisor_booking_slots;
CREATE POLICY "anon can view active slots"
  ON public.advisor_booking_slots
  FOR SELECT TO anon
  USING (is_active = true);

COMMIT;
