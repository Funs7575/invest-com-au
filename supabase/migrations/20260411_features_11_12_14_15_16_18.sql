-- ============================================================
-- Features 11, 12, 14, 15, 16, 18 Migration
-- User Accounts, Price Drop Notifications, Q&A Upvoting,
-- Review Verification, Financial Planner API, Regulatory Assessments
-- ============================================================

-- ── Feature 11: User Saved Comparisons ────────────────────────

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
CREATE POLICY "Users read own comparisons" ON user_saved_comparisons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own comparisons" ON user_saved_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comparisons" ON user_saved_comparisons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comparisons" ON user_saved_comparisons FOR DELETE USING (auth.uid() = user_id);

-- User shortlisted brokers (persistent version of localStorage shortlist)
CREATE TABLE IF NOT EXISTS user_shortlisted_brokers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_slug TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, broker_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_shortlisted_user ON user_shortlisted_brokers(user_id);

ALTER TABLE user_shortlisted_brokers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own shortlist" ON user_shortlisted_brokers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own shortlist" ON user_shortlisted_brokers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own shortlist" ON user_shortlisted_brokers FOR DELETE USING (auth.uid() = user_id);

-- ── Feature 12: Broker Price Drop Notifications ───────────────

-- Extend fee_alert_subscriptions with price-drop specific fields
ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS price_threshold NUMERIC(10,2);
ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;
ALTER TABLE fee_alert_subscriptions ADD COLUMN IF NOT EXISTS notification_count INTEGER DEFAULT 0;

-- Price drop notification log
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
CREATE POLICY "Service manage price drops" ON price_drop_notifications FOR ALL USING (true);

-- ── Feature 14: Q&A Upvoting ──────────────────────────────────

-- Add vote counts to existing tables
ALTER TABLE broker_questions ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE broker_answers ADD COLUMN IF NOT EXISTS vote_count INTEGER DEFAULT 0;
ALTER TABLE broker_answers ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- Vote tracking table (prevents duplicate votes)
CREATE TABLE IF NOT EXISTS qa_votes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('question', 'answer')),
  target_id BIGINT NOT NULL,
  voter_identifier TEXT NOT NULL, -- IP hash or user_id
  vote_value INTEGER NOT NULL DEFAULT 1 CHECK (vote_value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, voter_identifier)
);

CREATE INDEX IF NOT EXISTS idx_qa_votes_target ON qa_votes(target_type, target_id);

ALTER TABLE qa_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert votes" ON qa_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read votes" ON qa_votes FOR SELECT USING (true);

-- ── Feature 15: Review Verification Badges ────────────────────

-- Add verified_client flag to user_reviews
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS is_verified_client BOOLEAN DEFAULT false;
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS verified_via TEXT CHECK (verified_via IN ('enquiry_match', 'manual', 'signup_match'));
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS verified_client_at TIMESTAMPTZ;

-- Add verified_client flag to professional_reviews
ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS is_verified_client BOOLEAN DEFAULT false;
ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS lead_id BIGINT;
ALTER TABLE professional_reviews ADD COLUMN IF NOT EXISTS verified_client_at TIMESTAMPTZ;

-- ── Feature 16: API for Financial Planners ────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL, -- First 8 chars for identification (e.g. "ica_xxxx")
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
CREATE POLICY "Service manage api keys" ON api_keys FOR ALL USING (true);

-- API request log for analytics
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
CREATE POLICY "Service manage api logs" ON api_request_log FOR ALL USING (true);

-- ── Feature 18: Regulatory Change Impact Assessments ──────────

-- Extend regulatory_alerts with impact assessment fields
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS affected_broker_slugs TEXT[] DEFAULT '{}';
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS affected_platform_types TEXT[] DEFAULT '{}';
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS change_category TEXT CHECK (change_category IN ('fee_structure', 'licensing', 'reporting', 'consumer_protection', 'product_intervention', 'tax', 'super', 'other'));
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS user_action_required BOOLEAN DEFAULT false;
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS compliance_deadline TIMESTAMPTZ;
ALTER TABLE regulatory_alerts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Broker impact assessment per regulatory change
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
CREATE POLICY "Public read regulatory impacts" ON regulatory_broker_impacts FOR SELECT USING (true);
CREATE POLICY "Service write regulatory impacts" ON regulatory_broker_impacts FOR ALL USING (true);

-- ── Reset daily API counters (handled by cleanup cron) ────────
-- Add comment for reference: the existing /api/cron/cleanup route
-- should be extended to reset api_keys.requests_today daily.
