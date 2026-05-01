-- Date: 2026-06-08
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §A (schema drift / missing RLS)
-- Queue item: A-03 batch 3 supplement (marketplace_placements)
-- Why: marketplace_placements is a shared placement inventory catalog table that
--   carries pricing data (base_rate_cents, avg_ctr_pct) but has no
--   ENABLE ROW LEVEL SECURITY. PR #413 (parallel fire) covered broker_wallets,
--   wallet_transactions, and marketplace_invoices. This migration covers the
--   remaining revenue-adjacent table marketplace_placements.
-- Idempotency: ENABLE/FORCE RLS are no-ops when re-applied. DROP POLICY IF
--   EXISTS guards make CREATE POLICY idempotent.
-- Rollback: ALTER TABLE public.marketplace_placements DISABLE ROW LEVEL SECURITY;
--
-- Prior policy state (mandatory check per remediation-defaults §4):
--   marketplace_placements: grep confirms 0 prior CREATE POLICY statements.
--   No DROP POLICY IF EXISTS required beyond the idempotency guards below.
--
-- Caller analysis:
--   marketplace_placements is a shared placement catalog (no broker_slug column).
--   Rows = ad placement slots (Header Banner, Sidebar, etc.) with pricing config.
--
--   API routes (service-role):
--     - cron/marketplace-stats/route.ts → UPDATE monthly_impressions/avg_ctr_pct
--       via createAdminClient() — bypasses RLS
--   Admin browser pages (authenticated role + admin JWT):
--     - admin/marketplace/placements/page.tsx → SELECT + INSERT + UPDATE
--     - admin/marketplace/campaigns/page.tsx → SELECT (join with campaigns)
--     - admin/marketplace/intelligence/page.tsx → SELECT
--     - admin/marketplace/funnel/page.tsx → SELECT
--     - admin/analytics/AdminAnalyticsClient.tsx → SELECT
--   Broker portal (authenticated role, broker JWT):
--     - broker-portal/placements/page.tsx → SELECT WHERE is_active
--     - broker-portal/page.tsx → SELECT (join on campaign.placement_id)

BEGIN;

DROP POLICY IF EXISTS "Service role full access on marketplace_placements" ON public.marketplace_placements;
DROP POLICY IF EXISTS "Admin can manage marketplace_placements" ON public.marketplace_placements;
DROP POLICY IF EXISTS "Authenticated can read active placements" ON public.marketplace_placements;

ALTER TABLE public.marketplace_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_placements FORCE ROW LEVEL SECURITY;

-- Service-role (cron jobs updating impression stats). Explicit policy for
-- pg_policies auditability even though service-role bypasses RLS.
CREATE POLICY "Service role full access on marketplace_placements"
  ON public.marketplace_placements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin browser pages INSERT/UPDATE/SELECT/DELETE placement records.
-- Admin identity: raw_user_meta_data->>'role' = 'admin' in auth.users.
-- Same pattern as "Admin can manage disputes" (20260606_c02_lead_disputes_rls.sql).
CREATE POLICY "Admin can manage marketplace_placements"
  ON public.marketplace_placements
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

-- Broker portal reads active placements to browse/select available ad slots.
-- TODO: human review of policy semantics — placement catalog contains pricing
-- (base_rate_cents, avg_ctr_pct). Confirm this data is intentionally visible
-- to all authenticated brokers before broker portal goes live.
CREATE POLICY "Authenticated can read active placements"
  ON public.marketplace_placements
  FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMIT;
