-- Migration: A-02 batch 4 supplement — advisor_bookings backfill
-- Date: 2026-06-07
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §1 (schema drift)
-- Queue item: A-02 batch 4 supplement (PR #403)
-- Why: advisor_bookings exists in lib/database.types.ts and is actively queried
--   by 5 production call sites but has no CREATE TABLE migration. PR #402 covered
--   advisor_auth_tokens / advisor_booking_slots / advisor_specialties / advisor_metrics_daily;
--   this migration adds the remaining advisor-bookings table.
-- Idempotency: CREATE TABLE / INDEX / POLICY all use IF NOT EXISTS / DROP IF EXISTS.
--   Re-applying against a live DB that already has advisor_bookings is a no-op.
-- Rollback: DROP TABLE IF EXISTS advisor_bookings CASCADE;
--   (only safe if no prod data exists; prefer forward-fix-up per CONTRIBUTING.md)

-- ============================================================
-- Table: advisor_bookings
-- Callers:
--   GET /api/advisor-booking — createClient() (anon), SELECT booking_time
--     WHERE professional_id+date (slot-conflict check for the public booking calendar)
--   POST /api/advisor-booking — createClient() (anon), INSERT (anonymous investor books)
--   app/admin/advisor-performance/page.tsx — createAdminClient(), SELECT summary stats
--   app/api/advisor-dashboard/route.ts — requireAdvisorSession, SELECT own bookings
-- RLS intent:
--   anon INSERT — public booking form needs this; the route uses anon client with no auth.
--   anon SELECT — needed by the GET slot-conflict check (createClient(), no cookie).
--     USING(true) is intentionally broad to support the existing query pattern.
--     TODO: human review of policy semantics — the USING(true) anon SELECT allows
--     enumeration of all bookings with investor PII (name, email, phone) if queried
--     without application-level WHERE scoping. Long-term fix: switch advisor-booking
--     GET to admin client and narrow anon SELECT to deny-all.
--   service_role ALL — admin dashboard + advisor portal reads (always scoped by
--     professional_id at the application level).
-- Prior policy state:
--   20260309_security_and_performance_fixes.sql (lines 408-413) conditionally creates
--   "Insert advisor bookings" FOR INSERT TO authenticated WITH CHECK (true). That policy
--   targets TO authenticated, blocking the anon-client route that actually creates
--   bookings today (unauthenticated investors). Dropped below and replaced with anon INSERT.
-- ============================================================

CREATE TABLE IF NOT EXISTS advisor_bookings (
  id                  BIGSERIAL PRIMARY KEY,
  professional_id     BIGINT        NOT NULL
                      REFERENCES professionals(id) ON DELETE CASCADE,
  investor_name       TEXT          NOT NULL,
  investor_email      TEXT          NOT NULL,
  investor_phone      TEXT,
  booking_date        DATE          NOT NULL,
  booking_time        TIME          NOT NULL,
  duration_minutes    INTEGER       DEFAULT 60,
  topic               TEXT,
  source_page         TEXT,
  status              TEXT          DEFAULT 'pending',
  lead_id             BIGINT,
  confirmation_token  TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  updated_at          TIMESTAMPTZ   DEFAULT now(),
  created_at          TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_bookings_professional
  ON advisor_bookings (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_bookings_date
  ON advisor_bookings (professional_id, booking_date)
  WHERE status != 'cancelled';

ALTER TABLE advisor_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_bookings FORCE ROW LEVEL SECURITY;

-- Drop all prior policies before (re)creating — idempotent reruns
-- IMPORTANT — prior policy state: 20260309_security_and_performance_fixes.sql (line 409)
-- conditionally creates "Insert advisor bookings" FOR INSERT TO authenticated.
-- That policy is TO authenticated (not anon), which blocks the actual booking
-- route that uses the anon client. Dropped below and replaced.
DROP POLICY IF EXISTS "Insert advisor bookings"                       ON advisor_bookings;
DROP POLICY IF EXISTS "Anon can book advisor"                         ON advisor_bookings;
DROP POLICY IF EXISTS "Anon can check slot availability"              ON advisor_bookings;
DROP POLICY IF EXISTS "Service role full access on advisor_bookings"  ON advisor_bookings;

-- Public INSERT — anonymous investors submit booking requests (no auth required)
CREATE POLICY "Anon can book advisor"
  ON advisor_bookings
  FOR INSERT
  TO anon
  WITH CHECK (
    investor_email IS NOT NULL
    AND professional_id IS NOT NULL
  );

-- Public SELECT — slot-conflict check in GET /api/advisor-booking
-- TODO: human review of policy semantics — USING(true) is broad; see header above
CREATE POLICY "Anon can check slot availability"
  ON advisor_bookings
  FOR SELECT
  TO anon
  USING (true);

-- Service role full access for admin dashboard + advisor portal reads
CREATE POLICY "Service role full access on advisor_bookings"
  ON advisor_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
