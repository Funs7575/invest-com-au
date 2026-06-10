-- ============================================================================
-- Migration: Backfill public.lead_disputes (A-02 batch 2)
-- Date:      2026-05-01 (queued under 20260603 to sort after existing work)
-- Audit ref: docs/audits/codebase-health-2026-04-24.md (A-02 schema drift)
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-02
--
-- Purpose
--   `lead_disputes` is declared in `lib/database.types.ts` (line 7311) and has
--   26 call sites in app/ + lib/, but the migration tree has no CREATE TABLE
--   for it. The earliest migration referencing the table is
--   `20260413_advisor_lead_dispute_auto_resolve.sql`, which adds columns via
--   ALTER TABLE (implying the table already existed via the Supabase dashboard).
--   `20260606_c02_lead_disputes_rls.sql` (C-DISC-20260430-03) added RLS policies
--   but also has no CREATE TABLE.
--
--   This migration adds the table to the migration tree so a clean rebuild
--   produces a schema that matches lib/database.types.ts. It is a companion to
--   the RLS-only migration `20260606_c02_lead_disputes_rls.sql`, which runs
--   after this file and re-applies the same policies idempotently.
--
-- Verified callers (grep app/ lib/)
--   All callers use createAdminClient() (service_role) or browser createClient()
--   (authenticated, for admin portal):
--   Admin-client callers (BYPASSRLS — not affected by RLS):
--     - app/api/advisor-auth/disputes/route.ts    SELECT + INSERT
--     - lib/advisor-lead-dispute-resolver.ts       SELECT + UPDATE
--     - app/api/cron/auto-resolve-disputes/        SELECT + UPDATE
--     - app/api/admin/automation/override/         SELECT + UPDATE
--     - app/api/admin/reports/afsl-monthly/        SELECT
--     - app/api/admin/ai-chat/                     SELECT
--     - app/api/cron/automation-verdict-rollup/    SELECT
--     - app/api/cron/warehouse-rollup/             SELECT
--     - app/api/cron/data-integrity-audit/         SELECT
--     - app/admin/automation/disputes/page.tsx     SELECT
--   Browser client (authenticated — covered by "Admin can manage disputes"):
--     - app/admin/advisors/page.tsx   SELECT + UPDATE
--     - app/admin/page.tsx            SELECT count
--     - app/admin/revenue/page.tsx    SELECT count
--
-- IMPORTANT — prior policy state:
--   `20260606_c02_lead_disputes_rls.sql` (queued under 20260606, sorts AFTER
--   this migration) provides ENABLE RLS + FORCE RLS + three named policies. That
--   migration uses DROP POLICY IF EXISTS for all its policy names, so it safely
--   overwrites the policies established here. Both migrations are idempotent.
--
-- RLS policy chosen — service_role + admin + advisor (mirrors C-02)
--   Policies are intentionally identical to `20260606_c02_lead_disputes_rls.sql`
--   so this migration is self-contained; C-02's DROP IF EXISTS + CREATE is a
--   clean overwrite of these same-named policies.
--
-- Idempotency
--   - CREATE TABLE IF NOT EXISTS — no-op on existing table.
--   - ENABLE/FORCE ROW LEVEL SECURITY — no-op if already enabled.
--   - DROP POLICY IF EXISTS + CREATE POLICY — idempotent reruns.
--   - `20260606_c02_lead_disputes_rls.sql` also drops and recreates
--     the same policy names, so running both migrations in sequence is safe.
--
-- Rollback
--   BEGIN;
--     DROP POLICY IF EXISTS "Advisor can view own disputes" ON public.lead_disputes;
--     DROP POLICY IF EXISTS "Admin can manage disputes"     ON public.lead_disputes;
--     DROP POLICY IF EXISTS "service_role full access disputes" ON public.lead_disputes;
--     ALTER TABLE public.lead_disputes NO FORCE ROW LEVEL SECURITY;
--     ALTER TABLE public.lead_disputes DISABLE ROW LEVEL SECURITY;
--     -- DROP TABLE public.lead_disputes; -- only on clean rebuild
--   COMMIT;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lead_disputes (
  id                      serial        PRIMARY KEY,
  lead_id                 integer       NOT NULL REFERENCES public.professional_leads(id),
  professional_id         integer       NOT NULL REFERENCES public.professionals(id),
  reason                  text          NOT NULL,
  billing_id              integer       REFERENCES public.advisor_billing(id),
  details                 text,
  status                  text,
  reason_code             text,
  refunded_cents          integer,
  resolved_at             timestamptz,
  admin_notes             text,
  admin_override_reason   text,
  admin_overridden_at     timestamptz,
  admin_overridden_by     text,
  auto_resolved_at        timestamptz,
  auto_resolved_confidence text,
  auto_resolved_reasons   jsonb,
  auto_resolved_verdict   text,
  created_at              timestamptz   DEFAULT now()
);

ALTER TABLE public.lead_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_disputes FORCE  ROW LEVEL SECURITY;

-- Drop any prior policies (also covers both name variants from parallel drafts).
DROP POLICY IF EXISTS "service_role full access disputes"         ON public.lead_disputes;
DROP POLICY IF EXISTS "service_role full access on lead_disputes" ON public.lead_disputes;
DROP POLICY IF EXISTS "Admin can manage disputes"                 ON public.lead_disputes;
DROP POLICY IF EXISTS "Advisor can view own disputes"             ON public.lead_disputes;

-- Service-role explicit allow. Admin client (service_role) bypasses RLS
-- regardless; explicit policy makes intent visible in pg_policies for auditors.
CREATE POLICY "service_role full access disputes"
  ON public.lead_disputes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin users (raw_user_meta_data->>'role' = 'admin') can manage all disputes
-- via the admin portal browser client. Mirrors the pattern in
-- 20260606_c02_lead_disputes_rls.sql — both migrations use identical USING/CHECK
-- so C-02's DROP IF EXISTS + CREATE is a safe idempotent overwrite.
CREATE POLICY "Admin can manage disputes"
  ON public.lead_disputes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Advisors can read their own disputes. professional_id links to
-- professionals.id; ownership is inferred via the professionals join.
CREATE POLICY "Advisor can view own disputes"
  ON public.lead_disputes
  FOR SELECT
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE auth_user_id = auth.uid()
    )
  );

-- No anon INSERT/UPDATE/DELETE. Disputes are created and resolved exclusively
-- by the advisor portal (admin client) and cron jobs (admin client).

-- TODO: human review of policy semantics — lead_disputes has no direct
-- auth.uid() column; advisor ownership is inferred via professionals join.
-- Confirm no cross-advisor dispute exposure is possible (a given auth.uid()
-- maps to exactly one professionals.id via auth_user_id, so the subquery is
-- bounded to a single advisor's rows).

COMMIT;
