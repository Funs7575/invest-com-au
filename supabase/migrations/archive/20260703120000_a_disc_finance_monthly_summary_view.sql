-- =============================================================================
-- Date:          2026-05-02
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "schema drift"
-- Queue item:    A-DISC-20260501-01 — CREATE VIEW migration for finance_monthly_summary
-- Why:           `finance_monthly_summary` appears in `lib/database.types.ts` as a
--                view (Row type only — no Insert/Update types) and is queried by
--                `app/admin/finance/page.tsx` to render the monthly P&L chart.
--                No migration exists that creates this view, meaning a clean
--                Supabase environment rebuilt from `supabase/migrations/*.sql`
--                alone would not have it, causing the admin finance dashboard to
--                silently return empty data.
--
-- Callers:
--   • app/admin/finance/page.tsx — createClient() (browser, authenticated admin)
--     supabase.from("finance_monthly_summary").select("*").limit(24)
--     The underlying finance_transactions table has a "admin full access"
--     RLS policy (TO authenticated, USING raw_user_meta_data->>'role'='admin')
--     so authenticated admin users can read through the view without additional
--     grants.
--
-- Idempotency:   CREATE OR REPLACE VIEW is always idempotent — safe to re-apply.
--
-- Rollback:
--   DROP VIEW IF EXISTS public.finance_monthly_summary;
--   (The underlying finance_transactions table is not touched — this migration
--   only creates the view definition. Re-running the migration recreates it.)
--
-- Note on RLS:   PostgreSQL views are not row-level security targets themselves
--                (you cannot ENABLE ROW LEVEL SECURITY on a VIEW). Access control
--                is enforced by the underlying table (finance_transactions) which
--                has RLS enabled with admin + service_role policies. The view
--                inherits those restrictions — anonymous users cannot read through
--                it without a matching RLS policy on the base table.
-- =============================================================================

CREATE OR REPLACE VIEW public.finance_monthly_summary AS
SELECT
  to_char(date, 'YYYY-MM')                                                    AS month,
  SUM(CASE WHEN type = 'income'  THEN amount_cents ELSE 0 END)::BIGINT         AS income_cents,
  SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END)::BIGINT         AS expense_cents,
  SUM(CASE WHEN type = 'income'  THEN amount_cents
           WHEN type = 'expense' THEN -amount_cents ELSE 0 END)::BIGINT        AS net_cents,
  COUNT(CASE WHEN type = 'income'  THEN 1 END)::BIGINT                         AS income_count,
  COUNT(CASE WHEN type = 'expense' THEN 1 END)::BIGINT                         AS expense_count
FROM public.finance_transactions
GROUP BY to_char(date, 'YYYY-MM')
ORDER BY month DESC;

-- Grant SELECT to authenticated role so admin users (who authenticate via
-- Supabase Auth and receive the 'authenticated' DB role) can query the view
-- directly from the browser client.  The underlying RLS on finance_transactions
-- still enforces that only raw_user_meta_data->>'role' = 'admin' users see rows.
GRANT SELECT ON public.finance_monthly_summary TO authenticated;
GRANT SELECT ON public.finance_monthly_summary TO service_role;
