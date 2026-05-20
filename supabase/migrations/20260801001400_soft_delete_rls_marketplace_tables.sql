-- ============================================================================
-- Migration: 20260801001400_soft_delete_rls_marketplace_tables.sql
-- Purpose: Phase 2.1 completion — tighten the professionals + broker_accounts
--          SELECT policies with `deleted_at IS NULL` so soft-deleted rows
--          disappear from reads. These two tables were deliberately left out
--          of 20260801000800 because they have read paths the simpler kind
--          tables don't:
--            - professionals: a PUBLIC read policy ("Public can view active
--              professionals") powers the /find-advisor marketplace + every
--              advisor profile page. Must keep status='active' AND now also
--              require deleted_at IS NULL.
--            - broker_accounts: owner-only read ("broker reads own account").
--              Add deleted_at IS NULL so a broker who deleted their account
--              can't still read their own row.
--
--          Admin full-access + service_role policies are intentionally NOT
--          touched — admins/cron must still see soft-deleted rows to run
--          the redaction + hard-delete crons and to restore mistaken
--          deletions during the grace window.
--
-- Audit ref: docs/audits/account-architecture-master-plan-2026-05-19.md
--            Phase 2 — Session 2.1 (deferred RLS half).
-- Risk: medium — changes the marketplace public-read predicate. With zero
--                soft-deleted professionals today it's a behavioural no-op,
--                but a bug here would hide active advisors. Verified: the
--                only change is the added `AND deleted_at IS NULL` conjunct;
--                status='active' semantics unchanged.
-- Rollback:
--   BEGIN;
--     DROP POLICY IF EXISTS "Public can view active professionals" ON public.professionals;
--     CREATE POLICY "Public can view active professionals" ON public.professionals
--       FOR SELECT USING (status = 'active');
--     DROP POLICY IF EXISTS "broker reads own account" ON public.broker_accounts;
--     CREATE POLICY "broker reads own account" ON public.broker_accounts
--       FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
--   COMMIT;
-- ============================================================================

BEGIN;

-- ─── professionals: public marketplace read ───────────────────────────────
DROP POLICY IF EXISTS "Public can view active professionals" ON public.professionals;
CREATE POLICY "Public can view active professionals"
  ON public.professionals
  FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- ─── broker_accounts: owner read ──────────────────────────────────────────
DROP POLICY IF EXISTS "broker reads own account" ON public.broker_accounts;
CREATE POLICY "broker reads own account"
  ON public.broker_accounts
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() AND deleted_at IS NULL);

COMMIT;
