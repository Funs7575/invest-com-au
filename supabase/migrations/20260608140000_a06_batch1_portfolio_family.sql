-- =============================================================================
-- Date:          2026-05-01
-- Audit ref:     docs/audits/codebase-health-2026-04-24.md §A "RLS drift"
-- Queue item:    A-06 batch 1 (portfolio family)
-- Why:           Five portfolio tables (user_portfolios, portfolio_alerts,
--                portfolio_calculations, portfolio_fee_snapshots,
--                portfolio_holdings) hold personal financial data — broker
--                holdings, fee snapshots, portfolio valuations, and alert
--                preferences. None have ENABLE ROW LEVEL SECURITY, meaning
--                any authenticated user with a JWT could read or modify every
--                other user's portfolio data via PostgREST.
--
--                Critically, user_portfolios and portfolio_alerts have INSERT/
--                UPDATE policies defined in prior migrations (20260309 and
--                20260310) but those policies are DEAD LETTERS — Postgres
--                doesn't enforce policies on tables where RLS is not enabled.
--                The prior policy attempts used:
--                  a) auth.uid() = user_id — but user_portfolios has no
--                     user_id column (email-keyed); those EXECUTE blocks
--                     would have silently failed.
--                  b) email = JWT::email — problematic non-standard approach
--                     that relies on raw JWT parsing.
--                All callers use createAdminClient() (service_role). The
--                correct posture is service_role-only access.
--
-- Idempotency:   DROP POLICY IF EXISTS before each CREATE POLICY;
--                ENABLE/FORCE RLS is idempotent; safe to re-apply.
-- Rollback:      For each table:
--                ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--                DROP POLICY IF EXISTS "service_role full access" ON <table>;
-- IMPORTANT — prior policy state on user_portfolios:
--   - 20260309_security_and_performance_fixes.sql lines 333-339: EXECUTE
--     'CREATE POLICY "Insert user portfolios" ON user_portfolios FOR INSERT
--     TO authenticated WITH CHECK (auth.uid() = user_id)' — silently no-ops
--     because user_portfolios has no user_id column. Policy does not exist.
--   - 20260309 lines 334,338: EXECUTE 'DROP POLICY IF EXISTS "Update user
--     portfolios" ON user_portfolios' + CREATE — same silent failure.
--   - 20260310_fix_security_advisories.sql lines 30-37: DROP POLICY IF EXISTS
--     "Update own portfolio" + CREATE (email = JWT email approach). This
--     policy MAY exist if 20260310 ran (it's a direct CREATE, not an EXECUTE
--     inside IF EXISTS). Dropped below for safety.
-- IMPORTANT — prior policy state on portfolio_alerts:
--   - 20260309 lines 348-354: Same EXECUTE pattern with auth.uid() = user_id
--     (portfolio_alerts has no user_id column — silent failure).
--   - 20260310 lines 19-27: DROP + CREATE "Update own portfolio alerts"
--     (email join via portfolio_id → user_portfolios.email). May exist.
-- =============================================================================

BEGIN;

-- ── user_portfolios ──────────────────────────────────────────────────────────
ALTER TABLE user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_portfolios FORCE ROW LEVEL SECURITY;

-- Drop all prior policy attempts (see header for sourcing)
DROP POLICY IF EXISTS "Insert user portfolios"  ON user_portfolios;
DROP POLICY IF EXISTS "Update user portfolios"  ON user_portfolios;
DROP POLICY IF EXISTS "Update own portfolio"    ON user_portfolios;
DROP POLICY IF EXISTS "service_role full access" ON user_portfolios;

CREATE POLICY "service_role full access"
  ON user_portfolios
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO: human review of policy semantics — table is email-keyed (no user_id /
--       auth.uid() linkage). All callers use createAdminClient(). If a future
--       user-auth path is added, consider adding auth.users email join:
--       USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))

-- ── portfolio_alerts ─────────────────────────────────────────────────────────
ALTER TABLE portfolio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_alerts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insert portfolio alerts"       ON portfolio_alerts;
DROP POLICY IF EXISTS "Update portfolio alerts"       ON portfolio_alerts;
DROP POLICY IF EXISTS "Update own portfolio alerts"   ON portfolio_alerts;
DROP POLICY IF EXISTS "service_role full access"      ON portfolio_alerts;

CREATE POLICY "service_role full access"
  ON portfolio_alerts
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── portfolio_calculations ───────────────────────────────────────────────────
ALTER TABLE portfolio_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_calculations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON portfolio_calculations;

CREATE POLICY "service_role full access"
  ON portfolio_calculations
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── portfolio_fee_snapshots ──────────────────────────────────────────────────
ALTER TABLE portfolio_fee_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_fee_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON portfolio_fee_snapshots;

CREATE POLICY "service_role full access"
  ON portfolio_fee_snapshots
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── portfolio_holdings ───────────────────────────────────────────────────────
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON portfolio_holdings;

CREATE POLICY "service_role full access"
  ON portfolio_holdings
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
