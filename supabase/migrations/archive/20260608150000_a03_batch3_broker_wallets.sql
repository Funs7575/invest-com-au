-- ============================================================================
-- Migration: Backfill public.broker_wallets (A-03 batch 3)
-- Date:      2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §4.1 — table declared
--            in lib/database.types.ts but absent from the migration tree.
-- Queue item: docs/audits/REMEDIATION_QUEUE.md A-03 batch 3
--
-- Purpose
--   broker_wallets holds the real-time balance, lifetime spend/deposit
--   counters, and auto-topup settings for each marketplace broker. It is a
--   financial-data table with no prior RLS.
--
-- Callers (verified 2026-05-01):
--   ADMIN (service-role): app/api/marketplace/register/route.ts (INSERT),
--     app/api/marketplace/setup-payment-method/route.ts (UPDATE),
--     app/api/cron/low-balance-alerts/route.ts (SELECT),
--     app/api/cron/welcome-drip/route.ts (SELECT).
--   BROWSER CLIENT (authenticated, admin-protected routes):
--     app/admin/revenue/page.tsx (SELECT),
--     app/admin/marketplace/page.tsx (SELECT),
--     app/admin/marketplace/brokers/page.tsx (SELECT).
--
-- Why it matters
--   Without RLS, any authenticated Supabase user could SELECT/INSERT/UPDATE
--   broker balance rows using the anon key. The admin pages use the browser
--   client (createClient) so they need an authenticated SELECT policy.
--
-- Idempotency
--   CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before each CREATE
--   POLICY — safe to re-apply.
--
-- Rollback
--   ALTER TABLE public.broker_wallets DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "service_role full access" ON public.broker_wallets;
--   DROP POLICY IF EXISTS "authenticated read only" ON public.broker_wallets;
--   -- (schema: table existed in prod before this migration)
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.broker_wallets (
  id                          bigserial     NOT NULL,
  broker_slug                 text          NOT NULL,
  balance_cents               integer       NOT NULL DEFAULT 0,
  currency                    text          NOT NULL DEFAULT 'AUD',
  lifetime_deposited_cents    integer       NOT NULL DEFAULT 0,
  lifetime_spent_cents        integer       NOT NULL DEFAULT 0,
  auto_topup_enabled          boolean       NOT NULL DEFAULT false,
  auto_topup_threshold_cents  integer,
  auto_topup_amount_cents     integer,
  low_balance_alert_enabled   boolean       NOT NULL DEFAULT false,
  low_balance_threshold_cents integer,
  stripe_payment_method_id    text,
  last_low_balance_alert_at   timestamptz,
  created_at                  timestamptz   DEFAULT now(),
  updated_at                  timestamptz   DEFAULT now(),
  CONSTRAINT broker_wallets_pkey PRIMARY KEY (id),
  CONSTRAINT broker_wallets_broker_slug_key UNIQUE (broker_slug)
);

ALTER TABLE public.broker_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_wallets FORCE  ROW LEVEL SECURITY;

-- Service-role: unrestricted (cron, webhooks, marketplace API).
DROP POLICY IF EXISTS "service_role full access" ON public.broker_wallets;
CREATE POLICY "service_role full access"
  ON public.broker_wallets
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated: SELECT only for admin dashboard pages (browser client).
-- Admin route protection is enforced by proxy.ts middleware (admin-email gate).
-- No auth.uid() linkage in this table — middleware is the authoritative gate.
-- TODO: human review of policy semantics — consider revoking if admin pages move to createAdminClient().
DROP POLICY IF EXISTS "authenticated read only" ON public.broker_wallets;
CREATE POLICY "authenticated read only"
  ON public.broker_wallets
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
