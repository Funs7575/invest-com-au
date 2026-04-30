-- ============================================================================
-- Migration: 20260423124310_create_agent_analytics_table.sql
-- Purpose: Create `agent_analytics` — a daily per-agent success-rate
--          rollup table written by n8n cron jobs and read by the admin
--          observability dashboard.
-- Rollback: REVOKE grants, DROP policy, DISABLE RLS, DROP indexes,
--           DROP table.
-- Risk: medium — DROP TABLE discards historical agent-success-rate
--       rollups. Source data in agent logs survives, so the rollups can
--       be recomputed; but any time-series gap in the dashboard during
--       reverse + recompute will be visible to operators.
-- ============================================================================
--
-- Forward operations:
--   1. CREATE TABLE IF NOT EXISTS public.agent_analytics
--        (id BIGSERIAL PK, agent_name, date, total_logs, error_count,
--         warn_count, info_count, success_rate, avg_runtime_ms,
--         estimated_cost_usd, metadata, created_at, updated_at,
--         UNIQUE(agent_name, date)).
--   2. CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_name.
--   3. CREATE INDEX IF NOT EXISTS idx_agent_analytics_date (date DESC).
--   4. CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_date
--                                  (agent_name, date DESC).
--   5. ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY.
--   6. DROP POLICY IF EXISTS "Service role can manage analytics".
--   7. CREATE POLICY "Service role can manage analytics" FOR ALL
--        USING (true) WITH CHECK (true).
--   8. GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated.
--   9. GRANT SELECT, INSERT, UPDATE, DELETE ... TO service_role.
--
-- Rollback (in reverse order):
--   9. REVOKE ALL ON public.agent_analytics FROM service_role;
--   8. REVOKE ALL ON public.agent_analytics FROM authenticated;
--   7. DROP POLICY IF EXISTS "Service role can manage analytics"
--        ON public.agent_analytics;
--   6. -- (no inverse needed for the idempotent DROP POLICY guard.)
--   5. ALTER TABLE public.agent_analytics DISABLE ROW LEVEL SECURITY;
--   4. DROP INDEX IF EXISTS public.idx_agent_analytics_agent_date;
--   3. DROP INDEX IF EXISTS public.idx_agent_analytics_date;
--   2. DROP INDEX IF EXISTS public.idx_agent_analytics_agent_name;
--   1. DROP TABLE IF EXISTS public.agent_analytics;
--      -- DESTRUCTIVE: discards every daily rollup row.
-- ============================================================================

-- Create agent_analytics table for daily per-agent success rate tracking
CREATE TABLE IF NOT EXISTS public.agent_analytics (
  id BIGSERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_logs INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  warn_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  success_rate FLOAT NOT NULL DEFAULT 100.0,
  avg_runtime_ms FLOAT,
  estimated_cost_usd FLOAT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_name, date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_name ON public.agent_analytics(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_date ON public.agent_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_analytics_agent_date ON public.agent_analytics(agent_name, date DESC);

-- Enable RLS
ALTER TABLE public.agent_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: service role can do everything (n8n writes)
DROP POLICY IF EXISTS "Service role can manage analytics" ON public.agent_analytics;
CREATE POLICY "Service role can manage analytics" ON public.agent_analytics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_analytics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_analytics TO service_role;
