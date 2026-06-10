-- ============================================================================
-- Migration: Backfill public.advisor_billing (A-02 batch 3)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `advisor_billing` is declared in `lib/database.types.ts` (line 656) and
--   has 18 call sites, but the migration tree has no CREATE TABLE. The
--   companion RLS migration `20260604_c02_advisor_data_tables_rls.sql` adds
--   ENABLE RLS + policies but has no CREATE TABLE. This migration provides the
--   schema so a clean rebuild produces a complete table before C-02 applies RLS.
--
-- Verified callers (grep app/ lib/)
--   All callers use createAdminClient() (BYPASSRLS — unaffected by RLS):
--     - app/api/advisor-auth/data/route.ts    SELECT
--     - app/api/advisor-auth/topup/route.ts   INSERT + UPDATE
--     - app/api/stripe/webhook/route.ts       INSERT + UPDATE
--     - app/api/cron/auto-resolve-disputes/   SELECT
--   Browser createClient() (authenticated — admin portal):
--     - app/admin/revenue/page.tsx            SELECT (admin role check)
--
-- IMPORTANT — prior policy state on advisor_billing:
--   `20260604_c02_advisor_data_tables_rls.sql` (sorts AFTER this migration,
--   20260604 > 20260603) provides ENABLE RLS + FORCE RLS + two named policies.
--   That migration uses DROP POLICY IF EXISTS for both names, so it safely
--   overwrites the policies established here. Both migrations are idempotent.
--   Policy names here are identical to C-02 so DROP IF EXISTS + CREATE is a
--   clean same-named overwrite.
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS, ENABLE/FORCE RLS, DROP POLICY IF EXISTS +
--   CREATE POLICY — all idempotent. C-02 re-applies the same policies.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "service_role full access billing" ON public.advisor_billing;
--     DROP POLICY IF EXISTS "Advisor can view own billing"     ON public.advisor_billing;
--     ALTER TABLE public.advisor_billing NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.advisor_billing DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.advisor_billing; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.advisor_billing (
  id                          serial        PRIMARY KEY,
  professional_id             integer       NOT NULL REFERENCES public.professionals(id),
  amount_cents                integer       NOT NULL,
  description                 text          NOT NULL,
  invoice_number              text,
  lead_id                     integer       REFERENCES public.professional_leads(id),
  paid_at                     timestamptz,
  status                      text,
  stripe_invoice_id           text,
  stripe_payment_intent_id    text,
  created_at                  timestamptz   DEFAULT now(),
  updated_at                  timestamptz   DEFAULT now()
);

ALTER TABLE public.advisor_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advisor_billing FORCE  ROW LEVEL SECURITY;

-- Drop any prior policies (also covers both name variants).
DROP POLICY IF EXISTS "service_role full access billing" ON public.advisor_billing;
DROP POLICY IF EXISTS "Advisor can view own billing"     ON public.advisor_billing;

-- Service-role explicit allow. All current callers use admin client (BYPASSRLS);
-- this policy makes intent visible in pg_policies. Mirrors C-02.
CREATE POLICY "service_role full access billing"
  ON public.advisor_billing
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Advisor self-scoped SELECT. Supabase Auth advisors can read their own billing
-- rows. Mirrors 20260604_c02_advisor_data_tables_rls.sql exactly; C-02 re-applies
-- this policy idempotently via DROP IF EXISTS + CREATE.
CREATE POLICY "Advisor can view own billing"
  ON public.advisor_billing
  FOR SELECT TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

-- No anon INSERT/UPDATE/DELETE. All billing mutations go through admin client.

-- TODO: human review of policy semantics — ownership inferred via professionals
-- join (no direct auth.uid() column). Matches C-02's intent.

COMMIT;
