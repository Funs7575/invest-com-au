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
