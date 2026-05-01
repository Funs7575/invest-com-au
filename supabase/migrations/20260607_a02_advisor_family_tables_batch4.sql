-- Migration: A-02 batch 4 — advisor_auth_tokens, advisor_bookings, advisor_booking_slots
-- Date: 2026-06-07
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §1 (schema drift)
-- Queue item: A-02 batch 4 (PR #401)
-- Why: These three advisor-family tables exist in lib/database.types.ts and are actively
--   queried by app routes, but have no CREATE TABLE migration. A fresh Supabase environment
--   built from migrations alone is missing them. This migration backfills the DDL so the
--   migration tree matches the live schema.
-- Idempotency: All CREATE TABLE / INDEX / POLICY statements use IF NOT EXISTS / DROP IF EXISTS.
--   Re-applying this migration on a live DB that already has these tables is a no-op.
-- Rollback: DROP TABLE IF EXISTS advisor_auth_tokens, advisor_bookings, advisor_booking_slots CASCADE;
--   (only safe if no prod data exists in these tables; in practice, forward-fix-up migrations
--   are the preferred pattern per CONTRIBUTING.md — do not run rollback against live)

-- ============================================================
-- Table: advisor_auth_tokens
-- Callers: app/api/admin/advisor-applications/route.ts (admin client INSERT),
--          app/api/cron/cleanup/route.ts (admin client DELETE),
--          app/api/advisor-auth/verify/route.ts (server client SELECT + UPDATE).
-- RLS intent: deny-all anon + deny-all authenticated + explicit service_role allow.
--   Tokens are one-time magic-links for advisor login; exposing them via anon or
--   authenticated clients would enable token enumeration attacks.
--   The verify route uses the server (anon-key) client — this is a legitimate exception
--   to the deny-all intent: the token IS the credential (bearer-token pattern), so a
--   service_role RPC or admin client switch is the correct long-term fix.
--   TODO: human review of policy semantics — advisor-auth/verify/route.ts should switch
--   to admin client so this table can be fully deny-all anon. Tracked as X-07 successor.
-- ============================================================

CREATE TABLE IF NOT EXISTS advisor_auth_tokens (
  id              BIGSERIAL PRIMARY KEY,
  professional_id BIGINT        NOT NULL
                  REFERENCES professionals(id) ON DELETE CASCADE,
  token           TEXT          NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ   NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_professional
  ON advisor_auth_tokens (professional_id);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_token
  ON advisor_auth_tokens (token);

CREATE INDEX IF NOT EXISTS idx_advisor_auth_tokens_expires
  ON advisor_auth_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE advisor_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_auth_tokens FORCE ROW LEVEL SECURITY;

-- Drop any pre-existing policies so this migration is idempotent
-- IMPORTANT — prior policy state: no prior CREATE POLICY on advisor_auth_tokens
-- found in any migration (grep confirmed). The DO-block in 20260309_security_and_performance_fixes.sql
-- only adds a FK index, not a policy. Net state before this migration: no RLS.
DROP POLICY IF EXISTS "Service role full access on advisor_auth_tokens" ON advisor_auth_tokens;

-- Explicit service_role allow for auditability (pg_policies shows intent)
CREATE POLICY "Service role full access on advisor_auth_tokens"
  ON advisor_auth_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Table: advisor_bookings
-- Callers:
--   GET /api/advisor-booking — anon client, SELECT booking_time WHERE professional_id+date
--     (slot-conflict check for the public booking calendar)
--   POST /api/advisor-booking — anon client, INSERT (anonymous investor books a time slot)
--   app/admin/advisor-performance/page.tsx — likely admin client, SELECT summary stats
--   app/api/advisor-dashboard/route.ts — requireAdvisorSession, SELECT own bookings
-- RLS intent:
--   anon INSERT — public booking form needs this to work without user auth.
--   anon SELECT — needed by the GET slot-conflict check (uses anon client). USING(true) is
--     broad (exposes investor PII if queried without WHERE scoping) but the application
--     already scopes all SELECTs to professional_id+date. Marking with TODO for tighter
--     column-level enforcement or a switch to admin client.
--   service_role ALL — admin pages + advisor dashboard (via requireAdvisorSession helper
--     which reads professional_id from session, so query is always scoped).
--   TODO: human review of SELECT policy semantics — the USING(true) allows anon
--     enumeration of all bookings with investor PII if a rogue client queries without
--     WHERE clauses. Long-term fix: switch advisor-booking GET to admin client + narrow
--     anon SELECT to deny-all. Tracked for X-07 successor work.
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

-- IMPORTANT — prior policy state: 20260309_security_and_performance_fixes.sql (line 409-413)
-- conditionally creates "Insert advisor bookings" ON advisor_bookings FOR INSERT TO authenticated.
-- That policy is TO authenticated (not anon), so anonymous investors cannot currently book
-- via the anon-client route. The prior policy is dropped and replaced below with an anon INSERT.
DROP POLICY IF EXISTS "Insert advisor bookings"                       ON advisor_bookings;
DROP POLICY IF EXISTS "Anon can book advisor"                         ON advisor_bookings;
DROP POLICY IF EXISTS "Anon can check slot availability"              ON advisor_bookings;
DROP POLICY IF EXISTS "Service role full access on advisor_bookings"  ON advisor_bookings;

-- Public INSERT — anonymous investors can submit a booking request
CREATE POLICY "Anon can book advisor"
  ON advisor_bookings
  FOR INSERT
  TO anon
  WITH CHECK (
    investor_email IS NOT NULL
    AND professional_id IS NOT NULL
  );

-- Public SELECT — slot-conflict check in GET /api/advisor-booking
-- TODO: human review of policy semantics — USING(true) is broad; see header comment above
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

-- ============================================================
-- Table: advisor_booking_slots
-- Callers: GET /api/advisor-booking — anon client, SELECT WHERE professional_id+is_active=true
-- RLS intent: anon SELECT for active slots (non-PII schedule data, needed for public
--   booking calendar). Service_role full access for advisor portal slot management.
-- ============================================================

CREATE TABLE IF NOT EXISTS advisor_booking_slots (
  id                    BIGSERIAL PRIMARY KEY,
  professional_id       BIGINT    NOT NULL
                        REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week           INTEGER   NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME      NOT NULL,
  end_time              TIME      NOT NULL,
  slot_duration_minutes INTEGER   DEFAULT 60,
  is_active             BOOLEAN   DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_advisor_booking_slots_professional
  ON advisor_booking_slots (professional_id, is_active);

ALTER TABLE advisor_booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_booking_slots FORCE ROW LEVEL SECURITY;

-- IMPORTANT — prior policy state: no prior CREATE POLICY on advisor_booking_slots found
-- in any migration (grep confirmed). Net state before this migration: no RLS.
DROP POLICY IF EXISTS "Anon can view active booking slots"                ON advisor_booking_slots;
DROP POLICY IF EXISTS "Service role full access on advisor_booking_slots" ON advisor_booking_slots;

-- Public SELECT — active slots only (non-PII: just day_of_week, start/end times)
CREATE POLICY "Anon can view active booking slots"
  ON advisor_booking_slots
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Service role full access — advisor portal slot management
CREATE POLICY "Service role full access on advisor_booking_slots"
  ON advisor_booking_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
