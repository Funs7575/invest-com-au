-- ============================================================================
-- Migration: A-02 batch 4 — backfill advisor_booking_slots
-- Date: 2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §5.1 (schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Why:
--   advisor_booking_slots stores an advisor's recurring weekly availability
--   schedule (which day/time slots they accept bookings). The table exists in
--   lib/database.types.ts but has no backing schema migration (drift).
--   Without RLS, the anon key exposes all advisors' schedules via PostgREST
--   (acceptable for active slots but creates an enumeration surface).
--
-- Verified callers:
--   app/api/advisor-booking/route.ts  SELECT active slots via createClient() (anon)
--     → GET /api/advisor-booking reads slots filtered by professional_id + is_active.
--       Anon SELECT is required for the public booking form to show availability.
--   (No admin or service-role callers for slots — slot management is a future
--    advisor-portal feature; only reads exist today.)
--
-- IMPORTANT — prior policy state on advisor_booking_slots:
--   Table not present in any prior migration; no prior RLS. This is the
--   first time RLS is enabled on this table.
--
-- Idempotent:
--   IF NOT EXISTS on table + indexes; ENABLE/FORCE RLS are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Public read active booking slots" ON advisor_booking_slots;
--   DROP POLICY IF EXISTS "service_role full access booking_slots" ON advisor_booking_slots;
--   ALTER TABLE advisor_booking_slots NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_booking_slots DISABLE ROW LEVEL SECURITY;
--   DROP TABLE IF EXISTS public.advisor_booking_slots;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_booking_slots (
  id                      serial      PRIMARY KEY,
  professional_id         integer     NOT NULL
                                      REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week             integer     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time              text        NOT NULL,
  end_time                text        NOT NULL,
  is_active               boolean     DEFAULT true,
  slot_duration_minutes   integer     DEFAULT 30
);

CREATE INDEX IF NOT EXISTS idx_advisor_booking_slots_professional_id
  ON public.advisor_booking_slots (professional_id);

ALTER TABLE public.advisor_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_booking_slots FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow.
DROP POLICY IF EXISTS "service_role full access booking_slots" ON advisor_booking_slots;
CREATE POLICY "service_role full access booking_slots"
  ON advisor_booking_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public (anon + authenticated) can read active slots to display availability.
-- Inactive slots are hidden — advisors use admin tooling to manage their schedule.
DROP POLICY IF EXISTS "Public read active booking slots" ON advisor_booking_slots;
CREATE POLICY "Public read active booking slots"
  ON advisor_booking_slots
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMIT;
