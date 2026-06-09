-- ============================================================================
-- Migration: marketplace v2 extensions (15-feature build)
-- Date: 2026-04-29
-- Branch: claude/advisor-platform-comparison-5vAIE
--
-- Why: Adds the data plane for the second iteration of the public quote
-- marketplace. New surfaces:
--
--   #1 Post-engagement review flow         → quote_reviews + advisor_auctions.review_request_sent_at
--   #2 Job re-open                         → advisor_auctions.reopened_count
--   #4 Quote expiry countdown email        → advisor_auctions.expiry_reminder_sent_at
--   #5 Bid retract reason                  → advisor_auction_bids.retract_reason
--   #7 Advisor availability signal         → professionals.accepts_new_clients (existing)
--   #8 Verified response time              → derived (no schema change; index for perf)
--   #9 Public Q&A on jobs                  → quote_qa
--  #12 Referral link for advisors          → advisor_auctions.referrer_advisor_id, professionals.referral_credit_cents
--  #13 Bid message templates               → professionals.bid_templates
--  #15 Job alert preferences               → professionals.alert_preferences
--
-- Idempotent: all DDL uses IF NOT EXISTS / safe-add patterns.
--
-- Rollback:
--   DROP TABLE IF EXISTS quote_reviews;
--   DROP TABLE IF EXISTS quote_qa;
--   ALTER TABLE advisor_auctions
--     DROP COLUMN IF EXISTS review_request_sent_at,
--     DROP COLUMN IF EXISTS expiry_reminder_sent_at,
--     DROP COLUMN IF EXISTS reopened_count,
--     DROP COLUMN IF EXISTS referrer_advisor_id;
--   ALTER TABLE advisor_auction_bids DROP COLUMN IF EXISTS retract_reason;
--   ALTER TABLE professionals
--     DROP COLUMN IF EXISTS referral_credit_cents,
--     DROP COLUMN IF EXISTS bid_templates,
--     DROP COLUMN IF EXISTS alert_preferences;
-- ============================================================================

-- ─── advisor_auctions extensions ───────────────────────────────────────────

ALTER TABLE advisor_auctions
  ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS expiry_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_advisor_id integer REFERENCES professionals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS advisor_auctions_status_ends_at_idx
  ON advisor_auctions (status, ends_at) WHERE source = 'public_job';

CREATE INDEX IF NOT EXISTS advisor_auctions_referrer_idx
  ON advisor_auctions (referrer_advisor_id) WHERE referrer_advisor_id IS NOT NULL;

-- ─── advisor_auction_bids extensions ──────────────────────────────────────

ALTER TABLE advisor_auction_bids
  ADD COLUMN IF NOT EXISTS retract_reason text;

-- ─── professionals extensions ─────────────────────────────────────────────

-- accepts_new_clients already exists on professionals (used by #7).
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS referral_credit_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bid_templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS alert_preferences jsonb NOT NULL DEFAULT '{
    "advisor_types": [],
    "states": [],
    "budget_bands": []
  }'::jsonb;

-- ─── quote_qa: public Q&A on a posted job (StackOverflow-style) ───────────

CREATE TABLE IF NOT EXISTS quote_qa (
  id bigserial PRIMARY KEY,
  auction_id bigint NOT NULL REFERENCES advisor_auctions(id) ON DELETE CASCADE,
  -- Either an advisor (advisor_id set) or the job owner (advisor_id null,
  -- author_email matches auction.contact_email).
  advisor_id integer REFERENCES professionals(id) ON DELETE SET NULL,
  author_email text,
  author_display_name text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 4 AND 2000),
  is_question boolean NOT NULL DEFAULT false,
  parent_id bigint REFERENCES quote_qa(id) ON DELETE CASCADE,
  is_removed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_qa_auction_idx
  ON quote_qa (auction_id, created_at) WHERE is_removed = false;

ALTER TABLE quote_qa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_qa_public_read ON quote_qa;
CREATE POLICY quote_qa_public_read ON quote_qa
  FOR SELECT USING (is_removed = false);

-- Writes go through service role only (admin client). No anon insert.
DROP POLICY IF EXISTS quote_qa_service_write ON quote_qa;
CREATE POLICY quote_qa_service_write ON quote_qa
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── quote_reviews: post-engagement reviews from accepted-bid consumers ──

CREATE TABLE IF NOT EXISTS quote_reviews (
  id bigserial PRIMARY KEY,
  auction_id bigint NOT NULL REFERENCES advisor_auctions(id) ON DELETE CASCADE,
  advisor_id integer NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  reviewer_email text NOT NULL,
  reviewer_display_name text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text CHECK (body IS NULL OR char_length(body) BETWEEN 0 AND 2000),
  verified boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, reviewer_email)
);

CREATE INDEX IF NOT EXISTS quote_reviews_advisor_idx
  ON quote_reviews (advisor_id, created_at DESC);

ALTER TABLE quote_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quote_reviews_public_read ON quote_reviews;
CREATE POLICY quote_reviews_public_read ON quote_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS quote_reviews_service_write ON quote_reviews;
CREATE POLICY quote_reviews_service_write ON quote_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
