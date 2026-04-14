-- Wave 9 schema — warehouse, AI concierge, fraud ML, churn ML, i18n.
--
-- Tables:
--   1. warehouse_daily_facts    — exec BI mart table (one row per
--                                 day with revenue, active advisors,
--                                 new signups, lead volume, NPS avg)
--   2. chatbot_conversations    — AI concierge session transcripts
--                                 for audit + analytics
--   3. fraud_signals            — per-row abuse scores and flags
--                                 (reviews / advisors / disputes)
--   4. churn_scores             — advisor churn-risk snapshots
--   5. i18n_currency_rates      — daily FX for currency conversion

-- ── 1. warehouse_daily_facts ───────────────────────────────────────
-- Append-only mart table. One row per (day, metric_name) so we
-- can add new metrics without schema changes. The exec BI
-- dashboard pivots on the client.
CREATE TABLE IF NOT EXISTS public.warehouse_daily_facts (
  id              bigserial PRIMARY KEY,
  day             date NOT NULL,
  metric_name     text NOT NULL,
  metric_value    numeric NOT NULL,
  dimension_1     text,
  dimension_2     text,
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, metric_name, dimension_1, dimension_2)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_daily_facts_day
  ON public.warehouse_daily_facts (day DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_daily_facts_metric_day
  ON public.warehouse_daily_facts (metric_name, day DESC);

ALTER TABLE public.warehouse_daily_facts ENABLE ROW LEVEL SECURITY;

-- ── 2. chatbot_conversations ───────────────────────────────────────
-- One row per user message + one row per assistant reply. Reasoning
-- / tool calls stored as JSON blob for audit. Moderation classifier
-- runs over every user message and rejects anything that looks like
-- prompt injection or abusive content.
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id              bigserial PRIMARY KEY,
  session_id      text NOT NULL,
  user_key        text,
  role            text NOT NULL,        -- 'user' | 'assistant' | 'system'
  content         text NOT NULL,
  context         jsonb,                -- retrieved docs, tool calls
  flagged         boolean NOT NULL DEFAULT false,
  flagged_reason  text,
  model           text,
  tokens_in       integer,
  tokens_out      integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session
  ON public.chatbot_conversations (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_flagged
  ON public.chatbot_conversations (created_at DESC)
  WHERE flagged = true;

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.chatbot_conversations
  DROP CONSTRAINT IF EXISTS chatbot_conversations_role_check;
ALTER TABLE public.chatbot_conversations
  ADD CONSTRAINT chatbot_conversations_role_check CHECK (
    role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])
  );

-- ── 3. fraud_signals ───────────────────────────────────────────────
-- One row per scored entity. `score` is 0-100 where higher means
-- more suspicious. `signals` is a JSON array of contributing
-- features so admins can see WHY a row scored high.
CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id              bigserial PRIMARY KEY,
  entity_type     text NOT NULL,        -- 'user_review' | 'professional_review' | 'advisor' | 'lead_dispute'
  entity_id       text NOT NULL,
  score           numeric NOT NULL,     -- 0-100
  signals         jsonb,                -- feature contributions
  verdict         text NOT NULL,        -- 'clean' | 'suspicious' | 'fraud'
  reviewed_at     timestamptz,
  reviewed_by     text,
  reviewed_verdict text,                -- admin override
  computed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_score
  ON public.fraud_signals (score DESC, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_verdict
  ON public.fraud_signals (verdict, computed_at DESC);

ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fraud_signals
  DROP CONSTRAINT IF EXISTS fraud_signals_verdict_check;
ALTER TABLE public.fraud_signals
  ADD CONSTRAINT fraud_signals_verdict_check CHECK (
    verdict = ANY (ARRAY['clean'::text, 'suspicious'::text, 'fraud'::text])
  );

-- ── 4. churn_scores ────────────────────────────────────────────────
-- Advisor churn risk snapshot. Low churn risk (<20) = healthy, 20-60
-- = watch, >60 = act. Stored per-scoring-run so we can see
-- progression over time. The active score is the most recent row
-- per advisor.
CREATE TABLE IF NOT EXISTS public.churn_scores (
  id              bigserial PRIMARY KEY,
  professional_id integer NOT NULL,
  risk_score      numeric NOT NULL,     -- 0-100
  risk_bucket     text NOT NULL,        -- 'low' | 'watch' | 'high'
  reasons         jsonb,
  computed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_churn_scores_advisor_time
  ON public.churn_scores (professional_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_scores_recent_high
  ON public.churn_scores (computed_at DESC)
  WHERE risk_bucket = 'high';

ALTER TABLE public.churn_scores ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.churn_scores
  DROP CONSTRAINT IF EXISTS churn_scores_risk_bucket_check;
ALTER TABLE public.churn_scores
  ADD CONSTRAINT churn_scores_risk_bucket_check CHECK (
    risk_bucket = ANY (ARRAY['low'::text, 'watch'::text, 'high'::text])
  );

-- ── 5. i18n_currency_rates ─────────────────────────────────────────
-- Daily FX rates for the foreign investor currency switcher. Source
-- is the /api/cron/fx-rates cron. Latest row wins for display.
CREATE TABLE IF NOT EXISTS public.i18n_currency_rates (
  id              bigserial PRIMARY KEY,
  base_currency   text NOT NULL DEFAULT 'AUD',
  target_currency text NOT NULL,
  rate            numeric NOT NULL,
  effective_date  date NOT NULL,
  source          text,
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base_currency, target_currency, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_i18n_currency_rates_latest
  ON public.i18n_currency_rates (target_currency, effective_date DESC);

ALTER TABLE public.i18n_currency_rates ENABLE ROW LEVEL SECURITY;
