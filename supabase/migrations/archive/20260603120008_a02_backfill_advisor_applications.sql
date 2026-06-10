-- ============================================================================
-- Migration: Backfill public.advisor_applications (A-02 batch 3)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_applications` is declared in `lib/database.types.ts` (line 281)
--   and has 44 call sites, but the migration tree has no CREATE TABLE.
--   `20260309_security_and_performance_fixes.sql` adds an INSERT policy in a
--   DO block with IF EXISTS — so it silently skips the policy if the table
--   doesn't exist (safe for fresh rebuild). RLS was never enabled on this table.
--
-- Verified callers (grep app/ lib/)
--   Anon/server createClient() callers (RLS applies):
--     - app/api/advisor-apply/route.ts    SELECT (dup check by email) + INSERT
--   Admin-client callers (BYPASSRLS — not affected by RLS):
--     - app/api/admin/advisor-applications/route.ts  SELECT + UPDATE
--     - app/api/advisor-apply/route.ts    (admin for agreement_acceptances)
--   Browser createClient() (authenticated — admin portal):
--     - app/admin/page.tsx               SELECT count
--     - app/admin/advisors/page.tsx      SELECT + UPDATE
--     - app/admin/automation/applications/page.tsx  SELECT
--
-- IMPORTANT — prior policy state on advisor_applications:
--   `20260309_security_and_performance_fixes.sql` creates "Insert advisor
--   applications" FOR INSERT TO authenticated in a conditional DO block (only
--   if the table already exists). No ENABLE RLS in any migration. This is the
--   first migration to ENABLE RLS on this table.
--
-- RLS policy chosen — permissive for current app-layer behaviour
--   The advisor-apply public form uses createClient() (anon) for both the
--   duplicate-email SELECT and the application INSERT. Enabling deny-all-anon
--   would break the apply flow without a code change. This migration encodes
--   the current behaviour:
--   - anon + authenticated: SELECT USING (true) — required for dup-email check.
--   - anon + authenticated: INSERT WITH CHECK (true) — required for form submit.
--   - admin (role='admin'): ALL — covers admin portal reads/reviews/updates.
--   - service_role: ALL — admin client callers bypass RLS regardless.
--
-- TODO: human review of policy semantics — the anon SELECT USING (true) means
--   any caller with the anon key can enumerate all advisor applications. The
--   long-term fix is to refactor app/api/advisor-apply/route.ts to use the
--   admin client for the duplicate-email check and INSERT, then drop the anon
--   SELECT policy. See also REMEDIATION_QUEUE.md C-03 context.
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS, ENABLE/FORCE RLS, DROP POLICY IF EXISTS +
--   CREATE POLICY — all idempotent. 20260309's "Insert advisor applications"
--   DO block re-creates the same-named policy (DROP IF EXISTS + CREATE) only
--   when the table exists; this migration establishes that policy first.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access"        ON public.advisor_applications;
--     DROP POLICY IF EXISTS "Admin can manage applications"    ON public.advisor_applications;
--     DROP POLICY IF EXISTS "Anon can access applications"     ON public.advisor_applications;
--     DROP POLICY IF EXISTS "Insert advisor applications"      ON public.advisor_applications;
--     ALTER TABLE public.advisor_applications NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.advisor_applications DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_applications; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_applications (
  id                    serial        PRIMARY KEY,
  name                  text          NOT NULL,
  type                  text          NOT NULL,
  email                 text          NOT NULL,
  abn                   text,
  account_type          text,
  admin_notes           text,
  admin_overridden_at   timestamptz,
  admin_overridden_by   text,
  admin_priority        text,
  afsl_number           text,
  bio                   text,
  client_types          text,
  fee_description       text,
  firm_id               integer,
  firm_name             text,
  languages             text,
  location_state        text,
  location_suburb       text,
  phone                 text,
  photo_url             text,
  pitch_message         text,
  professional_id       integer       REFERENCES public.professionals(id),
  referral_source       text,
  registration_number   text,
  rejection_reason      text,
  reviewed_at           timestamptz,
  reviewed_by           text,
  specialties           text,
  status                text,
  supply_gap_score      numeric,
  website               text,
  years_experience      integer,
  created_at            timestamptz   DEFAULT now()
);

ALTER TABLE public.advisor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_applications FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access"       ON public.advisor_applications;
DROP POLICY IF EXISTS "Admin can manage applications"  ON public.advisor_applications;
DROP POLICY IF EXISTS "Anon can access applications"   ON public.advisor_applications;
DROP POLICY IF EXISTS "Insert advisor applications"    ON public.advisor_applications;

CREATE POLICY "service_role full access"
  ON public.advisor_applications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Admin portal reads, reviews, and approves applications via browser
-- createClient() (authenticated, raw_user_meta_data->>'role' = 'admin').
CREATE POLICY "Admin can manage applications"
  ON public.advisor_applications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Public apply form uses createClient() (anon) for duplicate-email SELECT
-- and for the application INSERT. Both operations are required for the public
-- advisor-apply flow. See TODO above for the longer-term tightening path.
CREATE POLICY "Anon can access applications"
  ON public.advisor_applications
  FOR SELECT TO anon, authenticated
  USING (true);

-- INSERT policy mirrors 20260309_security_and_performance_fixes.sql
-- "Insert advisor applications". 20260309's DO-block re-creates the same
-- policy (DROP IF EXISTS + CREATE) — idempotent since the DO block only
-- runs if the table already exists, which it will after this migration.
CREATE POLICY "Insert advisor applications"
  ON public.advisor_applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

COMMIT;
