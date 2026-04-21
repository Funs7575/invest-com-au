-- ============================================================
-- Agent infrastructure layer
--
-- Creates the 19 agent-only tables that support our 19 AI agents'
-- coordination, memory, outputs, and internal state. Distinct from
-- platform tables (brokers, articles, advisors, etc.) — these are
-- agent-internal and not user-facing.
--
-- See COMPANY.md §"The 24 agent infrastructure tables" for mapping.
-- Of the 24 named there, 5 already exist as platform tables
-- (ab_tests, forum_threads, bd_pipeline, competitor_watch,
-- dynamic_pricing_rules). Agents share those — this migration
-- creates only the remaining 19.
--
-- Access control: RLS enabled on all 19. service_role has full
-- read+write via explicit policies. anon and authenticated have no
-- matching policies (silent deny). A follow-up migration will add
-- targeted authenticated read on ceo_approvals + friend_decisions
-- once the /ceo dashboard ships.
--
-- Rollback: drop tables in reverse FK order (agent_logs before
-- agent_tasks), then DROP FUNCTION set_updated_at_agent_infra.
-- Safe because this migration only adds new objects and does not
-- modify existing tables.
-- ============================================================

-- Shared updated_at trigger, scoped name to avoid collision with
-- any platform-side helper.
CREATE OR REPLACE FUNCTION public.set_updated_at_agent_infra()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 1. agent_tasks — task queue / run tracking
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','done','failed','blocked','cancelled')),
  priority        INT NOT NULL DEFAULT 100,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  result          JSONB,
  error_message   TEXT,
  parent_task_id  UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  scheduled_for   TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_name   ON public.agent_tasks (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status       ON public.agent_tasks (status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_parent       ON public.agent_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_created_at   ON public.agent_tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_scheduled    ON public.agent_tasks (scheduled_for) WHERE scheduled_for IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_agent_tasks ON public.agent_tasks;
CREATE TRIGGER set_updated_at_agent_tasks BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages agent_tasks" ON public.agent_tasks;
CREATE POLICY "Service role manages agent_tasks" ON public.agent_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 2. agent_memory — per-agent key/value long-term memory
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,
  scope           TEXT NOT NULL DEFAULT 'global',
  key             TEXT NOT NULL,
  value           JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agent_name, scope, key)
);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent_name ON public.agent_memory (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires_at ON public.agent_memory (expires_at) WHERE expires_at IS NOT NULL;

DROP TRIGGER IF EXISTS set_updated_at_agent_memory ON public.agent_memory;
CREATE TRIGGER set_updated_at_agent_memory BEFORE UPDATE ON public.agent_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages agent_memory" ON public.agent_memory;
CREATE POLICY "Service role manages agent_memory" ON public.agent_memory
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. agent_logs — append-only run logs (high volume)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,
  task_id         UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  level           TEXT NOT NULL DEFAULT 'info'
                    CHECK (level IN ('debug','info','warn','error','fatal')),
  message         TEXT NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON public.agent_logs (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task_id    ON public.agent_logs (task_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level      ON public.agent_logs (level);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs (created_at DESC);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages agent_logs" ON public.agent_logs;
CREATE POLICY "Service role manages agent_logs" ON public.agent_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. platform_snapshots — daily single-source-of-truth metrics
--    (Analytics Agent #10)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE NOT NULL UNIQUE,
  metrics         JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_agent    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_snapshots_date ON public.platform_snapshots (snapshot_date DESC);

DROP TRIGGER IF EXISTS set_updated_at_platform_snapshots ON public.platform_snapshots;
CREATE TRIGGER set_updated_at_platform_snapshots BEFORE UPDATE ON public.platform_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.platform_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages platform_snapshots" ON public.platform_snapshots;
CREATE POLICY "Service role manages platform_snapshots" ON public.platform_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. prospects — SMB outbound pipeline (SMB Sales Agent #05)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prospects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source             TEXT NOT NULL
                       CHECK (source IN ('apollo','clay','lemlist','northlight','manual','other')),
  external_id        TEXT,
  company_name       TEXT,
  contact_name       TEXT,
  contact_email      TEXT,
  contact_title      TEXT,
  status             TEXT NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','enriched','contacted','replied','qualified','meeting_booked','won','lost','unsubscribed')),
  enrichment         JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_contacted_at  TIMESTAMPTZ,
  next_action_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_prospects_status            ON public.prospects (status);
CREATE INDEX IF NOT EXISTS idx_prospects_contact_email     ON public.prospects (contact_email);
CREATE INDEX IF NOT EXISTS idx_prospects_next_action_at    ON public.prospects (next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospects_created_at        ON public.prospects (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_prospects ON public.prospects;
CREATE TRIGGER set_updated_at_prospects BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages prospects" ON public.prospects;
CREATE POLICY "Service role manages prospects" ON public.prospects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 6. compliance_tasks — compliance queue (Security #08, Licensing #13)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        TEXT NOT NULL,
  task_type         TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low','medium','high','critical')),
  status            TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','resolved','dismissed','escalated')),
  title             TEXT NOT NULL,
  description       TEXT,
  resolution_notes  TEXT,
  due_date          TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_status   ON public.compliance_tasks (status);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_severity ON public.compliance_tasks (severity);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON public.compliance_tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_agent    ON public.compliance_tasks (agent_name);

DROP TRIGGER IF EXISTS set_updated_at_compliance_tasks ON public.compliance_tasks;
CREATE TRIGGER set_updated_at_compliance_tasks BEFORE UPDATE ON public.compliance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages compliance_tasks" ON public.compliance_tasks;
CREATE POLICY "Service role manages compliance_tasks" ON public.compliance_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 7. ceo_approvals — Tier-3 approval gate queue
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ceo_approvals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_agent    TEXT NOT NULL,
  request_type          TEXT NOT NULL,
  summary               TEXT NOT NULL,
  detail                JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_aud            NUMERIC(14,2),
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','expired','withdrawn')),
  decided_at            TIMESTAMPTZ,
  decided_by            TEXT,
  decision_notes        TEXT,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ceo_approvals_status      ON public.ceo_approvals (status);
CREATE INDEX IF NOT EXISTS idx_ceo_approvals_expires_at  ON public.ceo_approvals (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ceo_approvals_created_at  ON public.ceo_approvals (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_ceo_approvals ON public.ceo_approvals;
CREATE TRIGGER set_updated_at_ceo_approvals BEFORE UPDATE ON public.ceo_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.ceo_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages ceo_approvals" ON public.ceo_approvals;
CREATE POLICY "Service role manages ceo_approvals" ON public.ceo_approvals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 8. friend_decisions — Tier-5 Co-Founder route queue
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friend_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by_agent    TEXT NOT NULL,
  topic                 TEXT NOT NULL
                          CHECK (topic IN ('enterprise','asic','industry','partnership','hire','other')),
  summary               TEXT NOT NULL,
  detail                JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_progress','decided','deferred','withdrawn')),
  outcome               TEXT,
  decided_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_friend_decisions_status     ON public.friend_decisions (status);
CREATE INDEX IF NOT EXISTS idx_friend_decisions_topic      ON public.friend_decisions (topic);
CREATE INDEX IF NOT EXISTS idx_friend_decisions_created_at ON public.friend_decisions (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_friend_decisions ON public.friend_decisions;
CREATE TRIGGER set_updated_at_friend_decisions BEFORE UPDATE ON public.friend_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.friend_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages friend_decisions" ON public.friend_decisions;
CREATE POLICY "Service role manages friend_decisions" ON public.friend_decisions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 9. advisor_content_subscriptions — advisor content packages
--    (Editorial Agent #04)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advisor_content_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_firm_id     UUID,  -- refs public.advisor_firms.id; not FK to keep agent layer decoupled
  tier                TEXT NOT NULL DEFAULT 'starter'
                        CHECK (tier IN ('starter','pro','enterprise')),
  status              TEXT NOT NULL DEFAULT 'trial'
                        CHECK (status IN ('trial','active','paused','cancelled','expired')),
  started_at          TIMESTAMPTZ,
  renews_at           TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_advisor_content_subs_firm    ON public.advisor_content_subscriptions (advisor_firm_id);
CREATE INDEX IF NOT EXISTS idx_advisor_content_subs_status  ON public.advisor_content_subscriptions (status);

DROP TRIGGER IF EXISTS set_updated_at_advisor_content_subs ON public.advisor_content_subscriptions;
CREATE TRIGGER set_updated_at_advisor_content_subs BEFORE UPDATE ON public.advisor_content_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.advisor_content_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages advisor_content_subscriptions" ON public.advisor_content_subscriptions;
CREATE POLICY "Service role manages advisor_content_subscriptions" ON public.advisor_content_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 10. revenue_opportunities — Revenue Opt Agent #15 output
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.revenue_opportunities (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_type         TEXT NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  estimated_aud_monthly    NUMERIC(14,2),
  confidence               TEXT NOT NULL DEFAULT 'medium'
                             CHECK (confidence IN ('low','medium','high')),
  status                   TEXT NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','under_review','approved','implemented','dismissed')),
  surfaced_by_agent        TEXT,
  detail                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revenue_opps_status      ON public.revenue_opportunities (status);
CREATE INDEX IF NOT EXISTS idx_revenue_opps_type        ON public.revenue_opportunities (opportunity_type);
CREATE INDEX IF NOT EXISTS idx_revenue_opps_created_at  ON public.revenue_opportunities (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_revenue_opportunities ON public.revenue_opportunities;
CREATE TRIGGER set_updated_at_revenue_opportunities BEFORE UPDATE ON public.revenue_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.revenue_opportunities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages revenue_opportunities" ON public.revenue_opportunities;
CREATE POLICY "Service role manages revenue_opportunities" ON public.revenue_opportunities
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 11. migration_plan — Domain Migration Agent #16 URL inventory
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.migration_plan (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url          TEXT NOT NULL UNIQUE,
  target_url          TEXT,
  url_type            TEXT NOT NULL DEFAULT 'page'
                        CHECK (url_type IN ('page','asset','feed','api','redirect_only')),
  redirect_code       INT NOT NULL DEFAULT 301
                        CHECK (redirect_code IN (301,302,307,308)),
  status              TEXT NOT NULL DEFAULT 'mapped'
                        CHECK (status IN ('mapped','verified','migrated','failed','skipped')),
  schema_preserved    BOOLEAN NOT NULL DEFAULT false,
  verified_at         TIMESTAMPTZ,
  migrated_at         TIMESTAMPTZ,
  notes               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_migration_plan_status    ON public.migration_plan (status);
CREATE INDEX IF NOT EXISTS idx_migration_plan_url_type  ON public.migration_plan (url_type);

DROP TRIGGER IF EXISTS set_updated_at_migration_plan ON public.migration_plan;
CREATE TRIGGER set_updated_at_migration_plan BEFORE UPDATE ON public.migration_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.migration_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages migration_plan" ON public.migration_plan;
CREATE POLICY "Service role manages migration_plan" ON public.migration_plan
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 12. llm_citations — AI Search Optimisation Agent #17 probe results
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.llm_citations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  llm_provider      TEXT NOT NULL
                      CHECK (llm_provider IN ('chatgpt','claude','gemini','perplexity','copilot','grok','other')),
  query             TEXT NOT NULL,
  cited             BOOLEAN NOT NULL DEFAULT false,
  citation_url      TEXT,
  citation_excerpt  TEXT,
  rank_position     INT,
  probe_run_id      UUID,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  probed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_citations_provider  ON public.llm_citations (llm_provider);
CREATE INDEX IF NOT EXISTS idx_llm_citations_cited     ON public.llm_citations (cited);
CREATE INDEX IF NOT EXISTS idx_llm_citations_probe_run ON public.llm_citations (probe_run_id);
CREATE INDEX IF NOT EXISTS idx_llm_citations_probed_at ON public.llm_citations (probed_at DESC);

ALTER TABLE public.llm_citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages llm_citations" ON public.llm_citations;
CREATE POLICY "Service role manages llm_citations" ON public.llm_citations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 13. editorial_articles — editorial pipeline tracker
--    (Tier 1 pillar, Tier 2 cluster, Tier 3 programmatic)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.editorial_articles (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier                    INT NOT NULL CHECK (tier IN (1,2,3)),
  title                   TEXT NOT NULL,
  slug                    TEXT,
  status                  TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','in_review','scheduled','published','retired')),
  author_name             TEXT,
  byline                  TEXT,
  target_publish_date     DATE,
  published_at            TIMESTAMPTZ,
  published_article_slug  TEXT,  -- points at public.articles.slug once published
  brief                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata                JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_status        ON public.editorial_articles (status);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_tier          ON public.editorial_articles (tier);
CREATE INDEX IF NOT EXISTS idx_editorial_articles_target_date   ON public.editorial_articles (target_publish_date) WHERE target_publish_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_editorial_articles_created_at    ON public.editorial_articles (created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_editorial_articles ON public.editorial_articles;
CREATE TRIGGER set_updated_at_editorial_articles BEFORE UPDATE ON public.editorial_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.editorial_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages editorial_articles" ON public.editorial_articles;
CREATE POLICY "Service role manages editorial_articles" ON public.editorial_articles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 14. api_customers — API product customers (post-launch)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_customers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name             TEXT NOT NULL,
  contact_email            TEXT NOT NULL,
  api_key_hash             TEXT NOT NULL UNIQUE,
  tier                     TEXT NOT NULL DEFAULT 'free'
                             CHECK (tier IN ('free','pro','enterprise')),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','suspended','cancelled')),
  plan_aud_monthly         NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_limit_per_min       INT NOT NULL DEFAULT 60,
  stripe_subscription_id   TEXT,
  metadata                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_customers_status  ON public.api_customers (status);
CREATE INDEX IF NOT EXISTS idx_api_customers_tier    ON public.api_customers (tier);
CREATE INDEX IF NOT EXISTS idx_api_customers_email   ON public.api_customers (contact_email);

DROP TRIGGER IF EXISTS set_updated_at_api_customers ON public.api_customers;
CREATE TRIGGER set_updated_at_api_customers BEFORE UPDATE ON public.api_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.api_customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages api_customers" ON public.api_customers;
CREATE POLICY "Service role manages api_customers" ON public.api_customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 15. founder_bandwidth — calendar sync (Master Overseer #00)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.founder_bandwidth (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder            TEXT NOT NULL
                       CHECK (founder IN ('fin','cofounder')),
  period_start       TIMESTAMPTZ NOT NULL,
  period_end         TIMESTAMPTZ NOT NULL,
  bandwidth_level    TEXT NOT NULL
                       CHECK (bandwidth_level IN ('high','normal','low','unavailable')),
  reason             TEXT,
  notes              TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (founder, period_start)
);
CREATE INDEX IF NOT EXISTS idx_founder_bandwidth_founder    ON public.founder_bandwidth (founder);
CREATE INDEX IF NOT EXISTS idx_founder_bandwidth_period     ON public.founder_bandwidth (period_start, period_end);

DROP TRIGGER IF EXISTS set_updated_at_founder_bandwidth ON public.founder_bandwidth;
CREATE TRIGGER set_updated_at_founder_bandwidth BEFORE UPDATE ON public.founder_bandwidth
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.founder_bandwidth ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages founder_bandwidth" ON public.founder_bandwidth;
CREATE POLICY "Service role manages founder_bandwidth" ON public.founder_bandwidth
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 16. cobranded_products — Product Layer Agent #18 (post-AFSL)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cobranded_products (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type           TEXT NOT NULL
                           CHECK (product_type IN ('savings','brokerage','credit_card','etf','super','life_insurance','home_loan')),
  partner_name           TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'planning'
                           CHECK (status IN ('planning','in_development','launched','paused','retired')),
  launch_target_date     DATE,
  launched_at            TIMESTAMPTZ,
  revenue_aud_monthly    NUMERIC(14,2),
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cobranded_products_status ON public.cobranded_products (status);
CREATE INDEX IF NOT EXISTS idx_cobranded_products_type   ON public.cobranded_products (product_type);

DROP TRIGGER IF EXISTS set_updated_at_cobranded_products ON public.cobranded_products;
CREATE TRIGGER set_updated_at_cobranded_products BEFORE UPDATE ON public.cobranded_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.cobranded_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages cobranded_products" ON public.cobranded_products;
CREATE POLICY "Service role manages cobranded_products" ON public.cobranded_products
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 17. partner_integrations — Growth / Partnership Agent #14
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_integrations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name           TEXT NOT NULL,
  partner_type           TEXT NOT NULL
                           CHECK (partner_type IN ('broker','advisor','publisher','data','affiliate','platform','other')),
  status                 TEXT NOT NULL DEFAULT 'prospecting'
                           CHECK (status IN ('prospecting','negotiating','contracted','live','paused','terminated')),
  contract_start         DATE,
  contract_end           DATE,
  monthly_revenue_aud    NUMERIC(14,2),
  contact_email          TEXT,
  metadata               JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_integrations_status  ON public.partner_integrations (status);
CREATE INDEX IF NOT EXISTS idx_partner_integrations_type    ON public.partner_integrations (partner_type);

DROP TRIGGER IF EXISTS set_updated_at_partner_integrations ON public.partner_integrations;
CREATE TRIGGER set_updated_at_partner_integrations BEFORE UPDATE ON public.partner_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.partner_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages partner_integrations" ON public.partner_integrations;
CREATE POLICY "Service role manages partner_integrations" ON public.partner_integrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 18. authorised_representatives — ARs under our AFSL (post-AFSL)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.authorised_representatives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  ar_number           TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','suspended','terminated')),
  appointed_at        TIMESTAMPTZ,
  terminated_at       TIMESTAMPTZ,
  contact_email       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_authorised_representatives_status ON public.authorised_representatives (status);

DROP TRIGGER IF EXISTS set_updated_at_authorised_representatives ON public.authorised_representatives;
CREATE TRIGGER set_updated_at_authorised_representatives BEFORE UPDATE ON public.authorised_representatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.authorised_representatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages authorised_representatives" ON public.authorised_representatives;
CREATE POLICY "Service role manages authorised_representatives" ON public.authorised_representatives
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 19. credit_representatives — CRs under our ACL (post-ACL)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_representatives (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name          TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  cr_number           TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','suspended','terminated')),
  appointed_at        TIMESTAMPTZ,
  terminated_at       TIMESTAMPTZ,
  contact_email       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_representatives_status ON public.credit_representatives (status);

DROP TRIGGER IF EXISTS set_updated_at_credit_representatives ON public.credit_representatives;
CREATE TRIGGER set_updated_at_credit_representatives BEFORE UPDATE ON public.credit_representatives
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_agent_infra();

ALTER TABLE public.credit_representatives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages credit_representatives" ON public.credit_representatives;
CREATE POLICY "Service role manages credit_representatives" ON public.credit_representatives
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- End of migration.
