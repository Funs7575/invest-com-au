-- G-04 M6 forward-fix: applied via Supabase MCP on 2026-05-08 against project
-- guggzyqceattncjwvgyc. This file checked in for repo parity.
--
-- Background: 20260411_features_11_12_14_15_16_18.sql never applied to live —
-- verified 2026-05-08 via MCP that all 7 new tables and all column ALTERs were
-- missing. 11 prod code paths were silently broken (lib/api-auth.ts,
-- app/api/saved-comparisons/*, app/api/v1/api-keys/*, app/api/cron/price-drop-
-- alerts/*, app/api/cron/abandoned-shortlist-drip/*, app/api/answers/[id]/vote/*,
-- app/api/questions/[id]/vote/*, app/api/sync-shortlist/*, app/api/admin/
-- regulatory-impacts/*, app/alerts/[slug]/*).
--
-- All blocks idempotent (CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, DROP POLICY IF EXISTS before each CREATE POLICY).
-- Safe to re-run.
--
-- ROLLBACK STRATEGY: see lines 11-32 of supabase/migrations/20260411_features_
-- 11_12_14_15_16_18.sql for full table-drop + column-drop scripts. Risk: the
-- 11 prod paths above return to "relation does not exist" 500s.

CREATE TABLE IF NOT EXISTS user_saved_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Comparison',
  broker_slugs TEXT[] NOT NULL DEFAULT '{}',
  quiz_results JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_saved_comparisons_user ON user_saved_comparisons(user_id);
ALTER TABLE user_saved_comparisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own comparisons" ON user_saved_comparisons;
CREATE POLICY "Users read own comparisons" ON user_saved_comparisons FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own comparisons" ON user_saved_comparisons;
CREATE POLICY "Users insert own comparisons" ON user_saved_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own comparisons" ON user_saved_comparisons;
CREATE POLICY "Users update own comparisons" ON user_saved_comparisons FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own comparisons" ON user_saved_comparisons;
CREATE POLICY "Users delete own comparisons" ON user_saved_comparisons FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS user_shortlisted_brokers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_slug TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker_slug)
);
CREATE INDEX IF NOT EXISTS idx_user_shortlisted_user ON user_shortlisted_brokers(user_id);
ALTER TABLE user_shortlisted_brokers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own shortlist" ON user_shortlisted_brokers;
CREATE POLICY "Users read own shortlist" ON user_shortlisted_brokers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own shortlist" ON user_shortlisted_brokers;
CREATE POLICY "Users insert own shortlist" ON user_shortlisted_brokers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own shortlist" ON user_shortlisted_brokers;
CREATE POLICY "Users delete own shortlist" ON user_shortlisted_brokers FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS price_threshold NUMERIC(10,2);
ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;
ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS price_drop_notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id BIGINT REFERENCES fee_alert_subscriptions(id) ON DELETE CASCADE,
  broker_slug TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT NOT NULL,
  new_value TEXT NOT NULL,
  change_percent NUMERIC(5,2),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_drop_broker ON price_drop_notifications(broker_slug, sent_at DESC);
ALTER TABLE price_drop_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage price drops" ON price_drop_notifications;
CREATE POLICY "Service manage price drops" ON price_drop_notifications FOR ALL USING (true);

ALTER TABLE broker_questions ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE broker_answers ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE broker_answers ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS qa_votes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
  target_id BIGINT NOT NULL,
  voter_identifier TEXT NOT NULL,
  vote_value INTEGER NOT NULL DEFAULT 1 CHECK (vote_value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, voter_identifier)
);
CREATE INDEX IF NOT EXISTS idx_qa_votes_target ON qa_votes(target_type, target_id);
ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert votes" ON qa_votes;
CREATE POLICY "Public insert votes" ON qa_votes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public read votes" ON qa_votes;
CREATE POLICY "Public read votes" ON qa_votes FOR SELECT USING (true);

ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS is_verified_client BOOLEAN DEFAULT false;
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS verified_via TEXT CHECK (verified_via IN ('enquiry_match', 'manual', 'signup_match'));
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS verified_client_at TIMESTAMPTZ;

ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS is_verified_client BOOLEAN DEFAULT false;
ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS lead_id BIGINT;
ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS verified_client_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  company_name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro', 'enterprise')),
  rate_limit_per_minute INTEGER DEFAULT 30,
  rate_limit_per_day INTEGER DEFAULT 1000,
  allowed_endpoints TEXT[] DEFAULT '{"/api/v1/brokers","/api/v1/brokers/:slug"}',
  is_active BOOLEAN DEFAULT true,
  requests_today INTEGER DEFAULT 0,
  requests_total BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage api keys" ON api_keys;
CREATE POLICY "Service manage api keys" ON api_keys FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS api_request_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON api_request_log(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_date ON api_request_log(created_at DESC);
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service manage api logs" ON api_request_log;
CREATE POLICY "Service manage api logs" ON api_request_log FOR ALL USING (true);

ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS affected_broker_slugs TEXT[] DEFAULT '{}';
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS affected_platform_types TEXT[] DEFAULT '{}';
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS change_category TEXT CHECK (change_category IN ('fee_structure', 'licensing', 'reporting', 'consumer_protection', 'product_intervention', 'tax', 'super', 'other'));
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS user_action_required BOOLEAN DEFAULT false;
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS compliance_deadline TIMESTAMPTZ;
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS regulatory_broker_impacts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id BIGINT NOT NULL,
  broker_slug TEXT NOT NULL,
  impact_level TEXT NOT NULL CHECK (impact_level IN ('none', 'low', 'medium', 'high', 'critical')),
  impact_description TEXT NOT NULL,
  estimated_fee_change NUMERIC(10,2),
  broker_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(alert_id, broker_slug)
);
CREATE INDEX IF NOT EXISTS idx_reg_broker_impacts_alert ON regulatory_broker_impacts(alert_id);
CREATE INDEX IF NOT EXISTS idx_reg_broker_impacts_broker ON regulatory_broker_impacts(broker_slug);
ALTER TABLE regulatory_broker_impacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read regulatory impacts" ON regulatory_broker_impacts;
CREATE POLICY "Public read regulatory impacts" ON regulatory_broker_impacts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service write regulatory impacts" ON regulatory_broker_impacts;
CREATE POLICY "Service write regulatory impacts" ON regulatory_broker_impacts FOR ALL USING (true);
