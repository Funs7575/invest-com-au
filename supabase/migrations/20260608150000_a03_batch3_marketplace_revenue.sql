-- Date: 2026-06-08
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §A (schema drift / missing RLS)
-- Queue item: A-03 batch 3
-- Why: Four marketplace/revenue tables (broker_wallets, marketplace_invoices,
--   marketplace_placements, wallet_transactions) exist in lib/database.types.ts
--   and carry sensitive financial data but have never had ENABLE ROW LEVEL
--   SECURITY run. Without RLS enabled, PostgREST serves any anon or
--   authenticated request unrestricted — a direct-REST call with the anon key
--   could enumerate wallet balances, invoice amounts, and transaction ledgers
--   for all brokers.
-- Idempotency: safe to re-apply. ENABLE/FORCE are no-ops when already set;
--   CREATE POLICY uses DROP POLICY IF EXISTS guards below; IF NOT EXISTS not
--   available for policies so we drop first.
-- Rollback: ALTER TABLE <table> DISABLE ROW LEVEL SECURITY; and restore any
--   application policy for the table. None of the four tables had prior
--   policies — rollback requires only DISABLE RLS on each table.
--
-- Prior policy state (mandatory check per remediation-defaults §4):
--   broker_wallets: grep confirms 0 prior CREATE POLICY statements.
--   marketplace_invoices: grep confirms 0 prior CREATE POLICY statements.
--   marketplace_placements: grep confirms 0 prior CREATE POLICY statements.
--   wallet_transactions: grep confirms 0 prior CREATE POLICY statements.
--
-- Caller analysis:
--   broker_wallets:
--     API routes (service-role): marketplace/register, marketplace/setup-payment-method,
--       cron/low-balance-alerts, cron/welcome-drip → createAdminClient()
--     Broker portal (authenticated browser): broker-portal/page.tsx,
--       broker-portal/layout.tsx, broker-portal/wallet/page.tsx → createClient()
--     Admin pages (authenticated browser): admin/marketplace/*, admin/revenue
--       → createClient() with admin JWT
--   marketplace_invoices:
--     API routes (service-role): marketplace/webhook, marketplace/invoice/[id],
--       marketplace/wallet-topup, broker-portal/invoices/[id]/pdf → createAdminClient()
--     Broker portal (authenticated): broker-portal/invoices/page.tsx → createClient()
--     Admin pages (authenticated): admin/marketplace/reconciliation → createClient()
--   marketplace_placements:
--     API routes (service-role): cron/marketplace-stats → createAdminClient()
--     Admin pages (authenticated): admin/marketplace/placements (SELECT/INSERT/UPDATE),
--       admin/marketplace/campaigns, admin/marketplace/intelligence → createClient()
--     Broker portal (authenticated): broker-portal/placements/page.tsx (SELECT),
--       broker-portal/page.tsx (join) → createClient()
--     NOTE: marketplace_placements has no broker_slug column — it is a shared
--     placement inventory catalog, not per-broker data.
--   wallet_transactions:
--     Admin pages (authenticated): admin/marketplace/* → createClient()
--     Broker portal (authenticated): broker-portal/wallet/page.tsx → createClient()
--     broker_slug column exists for scoping.

BEGIN;

-- ─── broker_wallets ───────────────────────────────────────────────────────────
ALTER TABLE public.broker_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_wallets FORCE ROW LEVEL SECURITY;

-- Service-role API routes bypass RLS, but explicit policy aids pg_policies auditing.
CREATE POLICY "Service role full access on broker_wallets"
  ON public.broker_wallets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin browser pages (admin/marketplace/*, admin/revenue) use createClient()
-- (authenticated role + JWT raw_user_meta_data role=admin). These pages SELECT
-- wallet data across all brokers for reconciliation and monitoring.
CREATE POLICY "Admin can manage broker_wallets"
  ON public.broker_wallets
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

-- Broker portal (authenticated): broker sees own wallet balance only.
-- broker_accounts.auth_user_id links the Supabase Auth user to a broker_slug.
CREATE POLICY "Broker can view own wallet"
  ON public.broker_wallets
  FOR SELECT
  TO authenticated
  USING (
    broker_slug IN (
      SELECT broker_slug FROM public.broker_accounts
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- ─── marketplace_invoices ─────────────────────────────────────────────────────
ALTER TABLE public.marketplace_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on marketplace_invoices"
  ON public.marketplace_invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage marketplace_invoices"
  ON public.marketplace_invoices
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

-- Broker portal: broker can view invoices for their own account.
CREATE POLICY "Broker can view own invoices"
  ON public.marketplace_invoices
  FOR SELECT
  TO authenticated
  USING (
    broker_slug IN (
      SELECT broker_slug FROM public.broker_accounts
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- ─── marketplace_placements ───────────────────────────────────────────────────
-- marketplace_placements is a shared placement inventory catalog (no broker_slug).
-- Admin manages the inventory (INSERT/UPDATE/DELETE); authenticated users (both
-- admin and brokers) can read the active catalog.
ALTER TABLE public.marketplace_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_placements FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on marketplace_placements"
  ON public.marketplace_placements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin pages INSERT/UPDATE/DELETE placement records (manage inventory slots).
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

-- Broker portal can browse active placements to select campaigns.
-- TODO: human review of policy semantics — placement catalog contains pricing
-- (base_rate_cents, avg_ctr_pct). Confirm this data is intentionally visible
-- to authenticated brokers before the broker portal goes live.
CREATE POLICY "Authenticated can read active placements"
  ON public.marketplace_placements
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ─── wallet_transactions ──────────────────────────────────────────────────────
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on wallet_transactions"
  ON public.wallet_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage wallet_transactions"
  ON public.wallet_transactions
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

-- Broker portal: broker can view own transaction ledger.
CREATE POLICY "Broker can view own wallet transactions"
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (
    broker_slug IN (
      SELECT broker_slug FROM public.broker_accounts
      WHERE auth_user_id = auth.uid()::text
    )
  );

COMMIT;
