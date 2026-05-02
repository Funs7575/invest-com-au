-- ============================================================================
-- Migration: Backfill public.advisor_verification_log (A-02 batch 3)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_verification_log` is declared in `lib/database.types.ts`
--   (line 1388) with 8 call sites, but the migration tree has no CREATE TABLE
--   and no RLS policies in any migration. All callers use admin client.
--
-- Verified callers (grep app/ lib/)
--   All 8 callers use createAdminClient() (BYPASSRLS):
--     - lib/advisor-verification.ts    INSERT (verification events)
--     - app/api/admin/** routes        SELECT (admin audit views)
--
-- RLS policy chosen — service_role only
--   This is an immutable admin audit trail. No self-serve advisor SELECT is
--   appropriate (advisors should not be able to see or modify their own
--   verification history directly). service_role policy for audit visibility.
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS, ENABLE/FORCE RLS, DROP POLICY IF EXISTS +
--   CREATE POLICY — all idempotent. No prior policies in any migration.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access" ON public.advisor_verification_log;
--     ALTER TABLE public.advisor_verification_log NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.advisor_verification_log DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_verification_log; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_verification_log (
  id              serial        PRIMARY KEY,
  professional_id integer       NOT NULL REFERENCES public.professionals(id),
  action          text          NOT NULL,
  details         text,
  method          text,
  performed_by    text,
  created_at      timestamptz   DEFAULT now()
);

ALTER TABLE public.advisor_verification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_verification_log FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.advisor_verification_log;

CREATE POLICY "service_role full access"
  ON public.advisor_verification_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No authenticated or anon policies. This is an immutable audit trail;
-- all access goes through the admin client (service_role, BYPASSRLS).

COMMIT;
