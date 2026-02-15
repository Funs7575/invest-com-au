-- Phase 0: Schema additions for feature parity

-- Add layer column to affiliate_clicks for tracking click source context
ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS layer TEXT;

-- Add benefit_cta to brokers for context-aware CTA text
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS benefit_cta TEXT;

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id BIGSERIAL PRIMARY KEY,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create calculator_config table
CREATE TABLE IF NOT EXISTS calculator_config (
  id BIGSERIAL PRIMARY KEY,
  calc_type TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_captures table
CREATE TABLE IF NOT EXISTS email_captures (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_captures ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Public read quiz questions" ON quiz_questions FOR SELECT USING (active = TRUE);
CREATE POLICY "Public read calculator config" ON calculator_config FOR SELECT USING (TRUE);
CREATE POLICY "Insert email captures" ON email_captures FOR INSERT WITH CHECK (TRUE);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(order_index);
CREATE INDEX IF NOT EXISTS idx_calculator_config_type ON calculator_config(calc_type);
CREATE INDEX IF NOT EXISTS idx_email_captures_source ON email_captures(source);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_layer ON affiliate_clicks(layer);

-- Seed quiz questions (from HTML reference)
INSERT INTO quiz_questions (order_index, question_text, options) VALUES
(1, 'What is your main investing goal?', '[{"label":"Buy Crypto","key":"crypto"},{"label":"Active Trading","key":"trade"},{"label":"Dividend Income","key":"income"},{"label":"Long-Term Growth","key":"grow"}]'),
(2, 'How experienced are you with investing?', '[{"label":"Complete Beginner","key":"beginner"},{"label":"Some Experience","key":"intermediate"},{"label":"Advanced / Professional","key":"pro"}]'),
(3, 'How much are you looking to invest?', '[{"label":"Under $5,000","key":"small"},{"label":"$5,000 - $50,000","key":"medium"},{"label":"$50,000 - $100,000","key":"large"},{"label":"$100,000+","key":"whale"}]'),
(4, 'What matters most to you?', '[{"label":"Lowest Fees","key":"fees"},{"label":"Safety (CHESS)","key":"safety"},{"label":"Best Tools & Research","key":"tools"},{"label":"Simplicity","key":"simple"}]');

-- Seed calculator config defaults
INSERT INTO calculator_config (calc_type, config) VALUES
('franking', '{"corpTaxRate": 30, "defaultYield": 4, "defaultFranking": 100, "defaultTaxRate": 30}'),
('switching', '{"transferFee": 54, "defaultTrades": 4}'),
('fx', '{"defaultAmount": 5000}'),
('cgt', '{"defaultGain": 5000, "defaultTaxRate": 30, "brackets": [{"min": 0, "max": 18200, "rate": 0, "label": "Tax-free threshold"}, {"min": 18201, "max": 45000, "rate": 16, "label": "Lowest bracket"}, {"min": 45001, "max": 135000, "rate": 30, "label": "Middle bracket"}, {"min": 135001, "max": 190000, "rate": 37, "label": "Upper bracket"}, {"min": 190001, "max": null, "rate": 45, "label": "Top bracket"}, {"min": 0, "max": null, "rate": 15, "label": "SMSF Accumulation"}, {"min": 0, "max": null, "rate": 0, "label": "SMSF Pension"}]}'),
('chess', '{"description": "Check if your broker is CHESS sponsored or uses a custodial model."}');

-- Seed default site settings
INSERT INTO site_settings (key, value) VALUES
('site_title', 'Invest.com.au — Australia''s Independent Broker Comparison'),
('meta_description', 'Compare Australia''s best share trading platforms. Honest reviews, fee calculators, and CHESS-sponsored broker comparisons.'),
('abn', '[To be inserted]'),
('email', 'hello@invest.com.au'),
('social_proof_visitors', '52,000+'),
('social_proof_rating', '4.8/5'),
('social_proof_independence', '100%'),
('hero_headline', 'Stop <em>Overpaying</em> Your Broker.'),
('hero_subtitle', 'Compare 10+ Australian share trading platforms. Real fees, real data, no bank bias. Find the broker that actually fits your situation.'),
('media_logos', 'AFR,News.com.au')
ON CONFLICT (key) DO NOTHING;
