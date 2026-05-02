-- ============================================================
-- Date:        2026-06-11
-- Audit ref:   docs/audits/codebase-health-2026-04-24.md
-- Queue item:  A-05 batch 1 — agent + ops table RLS hardening
-- Why:         Six agent/ops tables had incomplete RLS: agent_analytics had
--              a too-permissive policy (no TO clause, applied to all roles
--              including anon) plus an inappropriate GRANT to authenticated;
--              agent_tasks / agent_memory / agent_logs / platform_snapshots
--              were missing FORCE ROW LEVEL SECURITY; broker_price_snapshots
--              had ENABLE RLS but zero policies (silent deny-all with no
--              auditability). All callers for these tables use createAdminClient()
--              (service-role), so the correct policy is service_role ALL.
-- Idempotency: Safe to re-apply. DROP POLICY IF EXISTS is a no-op if already
--              dropped. ALTER TABLE … FORCE ROW LEVEL SECURITY is idempotent.
--              CREATE POLICY inside DO$$ block checks pg_policies first.
--              REVOKE on non-existent privilege is a no-op.
-- Rollback:    For each table: ALTER TABLE … NO FORCE ROW LEVEL SECURITY;
--              reinstate original policies from their source migrations.
--              For agent_analytics: re-run steps in
--              20260423124310_create_agent_analytics_table.sql lines 69-80.
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- IMPORTANT — prior policy state:
--
-- agent_analytics:
--   "Service role can manage analytics" (FOR ALL, no TO clause)
--   in 20260423124310_create_agent_analytics_table.sql line 73.
--   GRANT to authenticated also in that file (line 79). Both are
--   replaced below with an explicit TO service_role policy.
--
-- agent_tasks:   "Service role manages agent_tasks"      (TO service_role ✓)
-- agent_memory:  "Service role manages agent_memory"     (TO service_role ✓)
-- agent_logs:    "Service role manages agent_logs"       (TO service_role ✓)
-- platform_snapshots: "Service role manages platform_snapshots" (TO service_role ✓)
--   All four from 20260512_agent_infrastructure.sql.
--   FORCE RLS only missing — policies are already correct.
--
-- broker_price_snapshots:
--   No policies in any migration (ENABLE RLS set in
--   20260419_wave_15_price_snapshots.sql but no CREATE POLICY).
-- ────────────────────────────────────────────────────────────

-- ── 1. agent_analytics ───────────────────────────────────────
-- Remove the too-permissive policy (no TO clause — applied to all roles).
DROP POLICY IF EXISTS "Service role can manage analytics" ON public.agent_analytics;

-- Remove the inappropriate column-level grant to authenticated.
-- All callers use createAdminClient() (service_role); no app/ route
-- or lib/ module accesses agent_analytics via the authenticated client.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.agent_analytics FROM authenticated;

ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_analytics FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_analytics'
      AND policyname = 'Service role manages agent_analytics'
  ) THEN
    CREATE POLICY "Service role manages agent_analytics"
      ON public.agent_analytics
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ── 2. agent_tasks — add FORCE RLS (policy already correct) ──
ALTER TABLE public.agent_tasks FORCE ROW LEVEL SECURITY;

-- ── 3. agent_memory — add FORCE RLS ──────────────────────────
ALTER TABLE public.agent_memory FORCE ROW LEVEL SECURITY;

-- ── 4. agent_logs — add FORCE RLS ────────────────────────────
ALTER TABLE public.agent_logs FORCE ROW LEVEL SECURITY;

-- ── 5. platform_snapshots — add FORCE RLS ────────────────────
ALTER TABLE public.platform_snapshots FORCE ROW LEVEL SECURITY;

-- ── 6. broker_price_snapshots — add policies + FORCE RLS ─────
-- Callers: lib/price-snapshots.ts (lines 112, 170, 188, 234) via
-- createAdminClient(). No app/ or lib/ caller uses createClient().
ALTER TABLE public.broker_price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_price_snapshots FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'broker_price_snapshots'
      AND policyname = 'Service role manages broker_price_snapshots'
  ) THEN
    CREATE POLICY "Service role manages broker_price_snapshots"
      ON public.broker_price_snapshots
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
