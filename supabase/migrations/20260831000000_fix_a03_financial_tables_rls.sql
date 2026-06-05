-- ============================================================================
-- Migration: Owner-scope RLS on broker_wallets / wallet_transactions /
--            marketplace_invoices  (P0 SECURITY FIX)
-- Date:      2026-06-05
-- Audit ref: bot exposure sweep — cross-user financial-data leak.
-- Supersedes the over-broad "authenticated read only" policies created in:
--   20260608150000_a03_batch3_broker_wallets.sql      (~line 76)
--   20260608150001_a03_batch3_wallet_transactions.sql (~line 65)
--   20260608150002_a03_batch3_marketplace_invoices.sql(~line 67)
--
-- SECURITY RATIONALE (the leak)
--   All three a03 batch-3 migrations shipped this policy:
--       CREATE POLICY "authenticated read only" ... FOR SELECT TO authenticated
--         USING (true);
--   `USING (true)` means *any* logged-in Supabase user (any holder of an
--   authenticated JWT — e.g. any consumer who signed up to save a broker
--   comparison) can SELECT *every* row in these tables via PostgREST. That
--   exposes, across ALL brokers:
--     - broker_wallets.stripe_payment_method_id  (Stripe PM handle)
--     - wallet_transactions.stripe_payment_intent_id
--     - marketplace_invoices.stripe_checkout_session_id /
--       stripe_payment_intent_id / broker_email / broker_company_name /
--       broker_abn   (PII + Stripe identifiers)
--   The original migration notes flagged this ("No auth.uid() linkage … TODO:
--   human review") and relied solely on proxy.ts (ADMIN_EMAILS edge gate) to
--   protect the admin dashboards — but PostgREST honours the RLS policy, not
--   the Next.js middleware, so a non-admin authenticated user querying the
--   table directly (or via any client-side createClient call) bypasses the
--   edge gate entirely. This is a direct cross-user data exposure (P0).
--
-- OWNERSHIP MODEL (verified against schema + callers, 2026-06-05)
--   These tables have NO user_id/owner_id column. Ownership is modelled by
--   `broker_slug` (text), which links to public.broker_accounts.broker_slug.
--   broker_accounts.auth_user_id (TEXT, stores the Supabase auth UUID) is the
--   per-user linkage. This mirrors the established pattern in
--   20260606150000_a03_backfill_conversion_events.sql:
--       broker_slug = (SELECT broker_slug FROM broker_accounts
--                       WHERE auth_user_id = auth.uid()::text LIMIT 1)
--
-- TWO LEGITIMATE authenticated-role read paths (both use the browser client,
-- so both are subject to RLS):
--   1. Broker portal (own data only) — createClient() from lib/supabase/client:
--        app/broker-portal/wallet/page.tsx      → broker_wallets, wallet_transactions
--        app/broker-portal/invoices/page.tsx    → marketplace_invoices
--        lib/marketplace/broker-auth.ts         → broker_wallets (own)
--      A broker must see ONLY rows for their own broker_slug.
--   2. Admin dashboards (all brokers) — createClient() (browser), gated by
--      proxy.ts ADMIN_EMAILS at the edge; reads across ALL brokers:
--        app/admin/marketplace/page.tsx, .../reconciliation/page.tsx,
--        .../intelligence/page.tsx, .../brokers/page.tsx, app/admin/revenue/page.tsx
--      Admins are authenticated users with no broker_accounts row, so the
--      owner-scoped subquery alone would (correctly) return them 0 rows and
--      break the dashboards. We therefore add an admin predicate using the
--      repo's canonical admin-in-RLS check (same as
--      20260606150001_a03_backfill_finance_transactions.sql and the a04
--      backfills): (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'.
--      NOTE: the authoritative admin guard remains proxy.ts (ADMIN_EMAILS).
--      This predicate is defence-in-depth so the dashboards keep functioning
--      under RLS without re-opening the table to every authenticated user.
--
--   All WRITES (topup, spend, refund, webhook, register, invoice insert) go
--   through lib/marketplace/wallet.ts + the marketplace API/webhook routes,
--   which use createAdminClient() (service_role) and BYPASS RLS. So no
--   authenticated INSERT/UPDATE/DELETE policy is required, and none is added —
--   keeping these financial tables read-only for everyone except service_role
--   and (for admin dashboards) admins. The admin policy is SELECT-only by
--   design; the one admin browser-client write path (reconciliation/brokers
--   pages inserting an invoice / broker_accounts row) is intentionally NOT
--   covered here — those flows should move to an admin API route on
--   service_role. If an admin browser INSERT is genuinely needed before that
--   migration, add a scoped WITH CHECK admin INSERT policy in a follow-up.
--
-- WHAT THIS MIGRATION CHANGES (per table)
--   - DROP the over-broad "authenticated read only" USING(true) SELECT policy.
--   - CREATE "broker reads own <table>" — SELECT, authenticated, owner-scoped.
--   - CREATE "admin reads all <table>" — SELECT, authenticated, admin-only.
--   - Re-assert the service_role full-access policy (idempotent) + RLS enabled.
--   service_role retains unrestricted access (and bypasses RLS regardless).
--
-- IDEMPOTENCY
--   ALTER ... ENABLE/FORCE ROW LEVEL SECURITY are no-ops if already set.
--   Every policy is DROP POLICY IF EXISTS before CREATE POLICY. Safe to re-run.
--
-- ROLLBACK (re-opens the leak — only for emergency revert)
--   BEGIN;
--     -- broker_wallets
--     DROP POLICY IF EXISTS "broker reads own wallet"        ON public.broker_wallets;
--     DROP POLICY IF EXISTS "admin reads all wallets"        ON public.broker_wallets;
--     CREATE POLICY "authenticated read only" ON public.broker_wallets
--       FOR SELECT TO authenticated USING (true);
--     -- wallet_transactions
--     DROP POLICY IF EXISTS "broker reads own transactions"  ON public.wallet_transactions;
--     DROP POLICY IF EXISTS "admin reads all transactions"   ON public.wallet_transactions;
--     CREATE POLICY "authenticated read only" ON public.wallet_transactions
--       FOR SELECT TO authenticated USING (true);
--     -- marketplace_invoices
--     DROP POLICY IF EXISTS "broker reads own invoices"      ON public.marketplace_invoices;
--     DROP POLICY IF EXISTS "admin reads all invoices"       ON public.marketplace_invoices;
--     CREATE POLICY "authenticated read only" ON public.marketplace_invoices
--       FOR SELECT TO authenticated USING (true);
--   COMMIT;
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. broker_wallets  (stripe_payment_method_id, balances, auto-topup config)
-- ----------------------------------------------------------------------------
ALTER TABLE public.broker_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_wallets FORCE  ROW LEVEL SECURITY;

-- Re-assert service-role full access (cron, webhooks, marketplace API).
DROP POLICY IF EXISTS "service_role full access" ON public.broker_wallets;
CREATE POLICY "service_role full access"
  ON public.broker_wallets
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Remove the over-broad leak: USING (true) let any authenticated user read all.
DROP POLICY IF EXISTS "authenticated read only" ON public.broker_wallets;

-- Broker portal: a broker sees ONLY their own wallet row.
DROP POLICY IF EXISTS "broker reads own wallet" ON public.broker_wallets;
CREATE POLICY "broker reads own wallet"
  ON public.broker_wallets
  FOR SELECT TO authenticated
  USING (
    broker_slug = (
      SELECT broker_slug
        FROM public.broker_accounts
       WHERE auth_user_id = auth.uid()::text
       LIMIT 1
    )
  );

-- Admin dashboards: authenticated admins read all wallets (defence-in-depth;
-- proxy.ts ADMIN_EMAILS remains the primary edge gate).
DROP POLICY IF EXISTS "admin reads all wallets" ON public.broker_wallets;
CREATE POLICY "admin reads all wallets"
  ON public.broker_wallets
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 2. wallet_transactions  (stripe_payment_intent_id, ledger)
-- ----------------------------------------------------------------------------
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.wallet_transactions;
CREATE POLICY "service_role full access"
  ON public.wallet_transactions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read only" ON public.wallet_transactions;

DROP POLICY IF EXISTS "broker reads own transactions" ON public.wallet_transactions;
CREATE POLICY "broker reads own transactions"
  ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    broker_slug = (
      SELECT broker_slug
        FROM public.broker_accounts
       WHERE auth_user_id = auth.uid()::text
       LIMIT 1
    )
  );

DROP POLICY IF EXISTS "admin reads all transactions" ON public.wallet_transactions;
CREATE POLICY "admin reads all transactions"
  ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- 3. marketplace_invoices  (stripe ids + broker_email + broker_abn + PII)
-- ----------------------------------------------------------------------------
ALTER TABLE public.marketplace_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_invoices FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.marketplace_invoices;
CREATE POLICY "service_role full access"
  ON public.marketplace_invoices
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read only" ON public.marketplace_invoices;

DROP POLICY IF EXISTS "broker reads own invoices" ON public.marketplace_invoices;
CREATE POLICY "broker reads own invoices"
  ON public.marketplace_invoices
  FOR SELECT TO authenticated
  USING (
    broker_slug = (
      SELECT broker_slug
        FROM public.broker_accounts
       WHERE auth_user_id = auth.uid()::text
       LIMIT 1
    )
  );

DROP POLICY IF EXISTS "admin reads all invoices" ON public.marketplace_invoices;
CREATE POLICY "admin reads all invoices"
  ON public.marketplace_invoices
  FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

COMMIT;
