-- ============================================================================
-- Migration: A-02 batch 4 — backfill advisor_specialties
-- Date: 2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §5.1 (schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Why:
--   advisor_specialties is a reference table mapping specialty names to
--   advisor type categories (e.g. "Self-Managed Super Funds" → "financial_planner").
--   The table exists in lib/database.types.ts but has no CREATE TABLE migration
--   (schema drift). Without RLS, the table is wide open via PostgREST.
--   This is public reference data (no PII), so anon SELECT is intentional —
--   adding RLS makes the intent explicit and prevents future anon writes.
--
-- Verified callers:
--   No app callers today (table is seeded for future advisor profile
--   specialty filtering). The anon SELECT policy enables future public-facing
--   filter UI without code changes.
--
-- IMPORTANT — prior policy state on advisor_specialties:
--   No prior CREATE TABLE or ENABLE RLS in any migration. This migration is the
--   first time RLS is enabled on this table.
--
-- Idempotent:
--   CREATE TABLE IF NOT EXISTS; ENABLE/FORCE RLS are no-ops if already set.
--   DROP POLICY IF EXISTS + CREATE is idempotent.
--
-- Rollback:
--   DROP POLICY IF EXISTS "Public read specialties" ON advisor_specialties;
--   DROP POLICY IF EXISTS "service_role full access specialties" ON advisor_specialties;
--   ALTER TABLE advisor_specialties NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE advisor_specialties DISABLE ROW LEVEL SECURITY;
--   DROP TABLE IF EXISTS public.advisor_specialties;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_specialties (
  id               serial       PRIMARY KEY,
  name             text         NOT NULL,
  category         text         NOT NULL,
  applicable_types text[]       NOT NULL DEFAULT '{}',
  display_order    integer,
  created_at       timestamptz  DEFAULT now()
);

ALTER TABLE public.advisor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_specialties FORCE ROW LEVEL SECURITY;

-- Service-role explicit allow.
DROP POLICY IF EXISTS "service_role full access specialties" ON advisor_specialties;
CREATE POLICY "service_role full access specialties"
  ON advisor_specialties
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public read: specialties are reference data; no PII; anon filter UI.
DROP POLICY IF EXISTS "Public read specialties" ON advisor_specialties;
CREATE POLICY "Public read specialties"
  ON advisor_specialties
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
