-- ─── Broker Portal Feature Gaps ───
-- 1. Self-registration onboarding
-- 2. Enhanced analytics (uses existing tables)
-- 3. Broker creatives / asset management
-- 4. A/B test variants
-- 5. Notification system
-- 6. Support tickets / messaging

-- ─── 3. Broker Creatives ───
CREATE TABLE IF NOT EXISTS broker_creatives (
  id SERIAL PRIMARY KEY,
  broker_slug TEXT NOT NULL REFERENCES brokers(slug) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('logo', 'banner', 'icon', 'screenshot')),
  label TEXT,
  url TEXT NOT NULL,
  width INT,
  height INT,
  file_size_bytes INT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broker_creatives_slug ON broker_creatives(broker_slug);

-- ─── 4. A/B Test Variants ───
CREATE TABLE IF NOT EXISTS ab_tests (
  id SERIAL PRIMARY KEY,
  broker_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cta_text', 'deal_text', 'banner', 'landing_page')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed')),
  variant_a JSONB NOT NULL DEFAULT '{}',
  variant_b JSONB NOT NULL DEFAULT '{}',
  traffic_split INT DEFAULT 50 CHECK (traffic_split >= 10 AND traffic_split <= 90),
  impressions_a INT DEFAULT 0,
  impressions_b INT DEFAULT 0,
  clicks_a INT DEFAULT 0,
  clicks_b INT DEFAULT 0,
  conversions_a INT DEFAULT 0,
  conversions_b INT DEFAULT 0,
  winner TEXT CHECK (winner IN ('a', 'b', NULL)),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ab_tests_slug ON ab_tests(broker_slug);
CREATE INDEX idx_ab_tests_status ON ab_tests(status);

-- ─── 5. Notifications ───
CREATE TABLE IF NOT EXISTS broker_notifications (
  id SERIAL PRIMARY KEY,
  broker_slug TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('low_balance', 'campaign_approved', 'campaign_rejected', 'campaign_paused', 'budget_exhausted', 'payment_received', 'system', 'support_reply')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_broker_notifications_slug ON broker_notifications(broker_slug);
CREATE INDEX idx_broker_notifications_unread ON broker_notifications(broker_slug, is_read) WHERE is_read = false;

-- ─── 6. Support Tickets ───
CREATE TABLE IF NOT EXISTS support_tickets (
  id SERIAL PRIMARY KEY,
  broker_slug TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('billing', 'campaigns', 'technical', 'general', 'account')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_reply', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('broker', 'admin')),
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_slug ON support_tickets(broker_slug);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id);
