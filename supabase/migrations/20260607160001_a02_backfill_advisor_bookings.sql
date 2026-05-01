-- ============================================================================
-- Migration: Backfill public.advisor_bookings (A-02 batch 4 of ~8)
-- Date:      2026-05-01 (queued under 20260607 to sort after existing A-stream)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (schema drift, §A)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_bookings` exists in `lib/database.types.ts` and is used by the
--   public advisor booking flow and the admin performance page. No CREATE TABLE
--   migration exists. This migration brings the schema declaration in-tree and
--   corrects a prior policy that restricted INSERT to authenticated users only,
--   blocking the public booking flow.
--
-- Callers (client type):
--   - app/api/advisor-booking/route.ts: createClient() (server, anon key)
--     — public booking flow: SELECT existing bookings (slot conflict check) +
--       INSERT new booking. NO authentication required.
--   - app/api/advisor-dashboard/route.ts: createClient() (server, anon key with
--     advisor session cookie via requireAdvisorSession()) — SELECT own bookings.
--   - app/admin/advisor-performance/page.tsx: createClient() (browser, authenticated
--     admin) — SELECT all bookings for performance metrics.
--
-- IMPORTANT — prior policy state:
--   `20260309_security_and_performance_fixes.sql` conditionally creates:
--     CREATE POLICY "Insert advisor bookings" ON advisor_bookings
--       FOR INSERT TO authenticated WITH CHECK (true)
--   This policy restricts INSERT to authenticated users only, which BLOCKS the
--   public advisor-booking route (anon client, no auth cookie). This migration
--   drops the prior policy and replaces it with correct anon INSERT access.
--
-- RLS policies chosen
--   - service_role: explicit FOR ALL.
--   - anon SELECT: USING (status != 'cancelled') — public booking endpoint
--     reads existing bookings for a given professional+date to check conflicts.
--     Admin performance page uses admin browser client (authenticated).
--   - anon INSERT: WITH CHECK (true) — public booking creation. Investor name
--     and email are collected at booking time; rate limiting is in the route handler.
--   - Admin FOR ALL: admin browser client — performance analytics.
--   - TODO: human review — advisor self-read policy. Advisor dashboard reads own
--     bookings via anon client (advisor_sessions-based auth, not Supabase auth JWT).
--     A proper advisor-scoped SELECT would require a lookup into advisor_sessions
--     or broker_accounts. For now, the anon SELECT USING (status != 'cancelled')
--     allows the dashboard to read bookings (filtered to specific professional_id
--     by the app's WHERE clause). Not ideal; a future dedicated advisor policy
--     is recommended once the advisor→auth.uid() mapping is formalised.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing databases.
--   - ENABLE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY for every policy.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"    ON public.advisor_bookings;
--     DROP POLICY IF EXISTS "anon can view bookings"      ON public.advisor_bookings;
--     DROP POLICY IF EXISTS "anon can create booking"     ON public.advisor_bookings;
--     DROP POLICY IF EXISTS "admin full access"           ON public.advisor_bookings;
--     -- Restore prior policy from 20260309 if needed:
--     -- CREATE POLICY "Insert advisor bookings" ON advisor_bookings
--     --   FOR INSERT TO authenticated WITH CHECK (true);
--     ALTER TABLE public.advisor_bookings DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_bookings; -- only on a clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_bookings (
  id                  SERIAL PRIMARY KEY,
  professional_id     INTEGER     NOT NULL,
  investor_name       TEXT        NOT NULL,
  investor_email      TEXT        NOT NULL,
  investor_phone      TEXT,
  booking_date        DATE        NOT NULL,
  booking_time        TEXT        NOT NULL,
  duration_minutes    INTEGER,
  topic               TEXT,
  source_page         TEXT,
  status              TEXT        DEFAULT 'pending',
  confirmation_token  TEXT,
  cancellation_reason TEXT,
  cancelled_at        TIMESTAMPTZ,
  lead_id             INTEGER,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT advisor_bookings_professional_id_fkey
    FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advisor_bookings_professional_id
  ON public.advisor_bookings (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_bookings_booking_date
  ON public.advisor_bookings (booking_date);

CREATE INDEX IF NOT EXISTS idx_advisor_bookings_status
  ON public.advisor_bookings (status);

ALTER TABLE public.advisor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_bookings FORCE  ROW LEVEL SECURITY;

-- Drop prior policy from 20260309 (blocked public booking flow: restricted INSERT to authenticated only)
DROP POLICY IF EXISTS "Insert advisor bookings" ON public.advisor_bookings;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_bookings;
CREATE POLICY "service_role full access"
  ON public.advisor_bookings
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Anon SELECT: needed for slot conflict check in public booking flow + advisor dashboard reads.
-- App WHERE clause filters to specific professional_id and booking_date.
DROP POLICY IF EXISTS "anon can view bookings" ON public.advisor_bookings;
CREATE POLICY "anon can view bookings"
  ON public.advisor_bookings
  FOR SELECT TO anon
  USING (status IS DISTINCT FROM 'cancelled');

-- Anon INSERT: public booking creation. Rate limiting is enforced in the route handler.
DROP POLICY IF EXISTS "anon can create booking" ON public.advisor_bookings;
CREATE POLICY "anon can create booking"
  ON public.advisor_bookings
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin full access" ON public.advisor_bookings;
CREATE POLICY "admin full access"
  ON public.advisor_bookings
  FOR ALL TO authenticated
  USING     ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
