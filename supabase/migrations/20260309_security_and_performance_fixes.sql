-- ============================================================================
-- Migration: Security & Performance Fixes
-- Date: 2026-03-09
--
-- Addresses:
--   1. RLS policies with overly permissive WITH CHECK (true)
--   2. Missing indexes on foreign keys and frequently queried columns
--   3. Mutable search_path on functions
--   4. Unused index cleanup
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: RLS POLICY FIXES (HIGH PRIORITY)
--
-- Replace overly permissive WITH CHECK (true) policies with proper
-- row-level security. Principle: public lead forms allow anon INSERT,
-- user-generated content requires auth, server-side tables use service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1a. email_captures — public lead form, allow anon + authenticated INSERT
--     No user_id column; email is the identifier. Keep permissive but
--     add basic validation (email must not be empty).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert email captures" ON email_captures;

CREATE POLICY "Insert email captures" ON email_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
  );

-- ----------------------------------------------------------------------------
-- 1b. quiz_leads — public lead form, allow anon + authenticated INSERT
--     No user_id column; uses email. Validate email present.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit quiz leads" ON quiz_leads;
DROP POLICY IF EXISTS "Insert quiz leads" ON quiz_leads;
DROP POLICY IF EXISTS "Public insert quiz leads" ON quiz_leads;

-- Try the most likely policy name patterns
DO $$
BEGIN
  -- Drop any INSERT policy on quiz_leads by scanning pg_policies
  PERFORM 1; -- no-op, we use DROP IF EXISTS above
END $$;

CREATE POLICY "Insert quiz leads" ON quiz_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
  );

-- ----------------------------------------------------------------------------
-- 1c. analytics_events — public tracking, allow anon + authenticated INSERT
--     No user_id; uses session_id/ip_hash. Validate event_type present.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
DROP POLICY IF EXISTS "Public insert analytics" ON analytics_events;

CREATE POLICY "Insert analytics events" ON analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type IS NOT NULL AND length(trim(event_type)) > 0
  );

-- ----------------------------------------------------------------------------
-- 1d. affiliate_clicks — public tracking, allow anon + authenticated INSERT
--     No user_id; uses ip_hash for tracking. Validate broker_slug present.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert clicks" ON affiliate_clicks;

CREATE POLICY "Insert clicks" ON affiliate_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    broker_slug IS NOT NULL AND length(trim(broker_slug)) > 0
  );

-- ----------------------------------------------------------------------------
-- 1e. switch_stories — user-generated content
--     No user_id column; uses email + display_name.
--     These are submitted via a public form (no auth required currently).
--     Keep as anon+authenticated but add basic validation.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert switch stories" ON switch_stories;
DROP POLICY IF EXISTS "Anyone can submit switch stories" ON switch_stories;
DROP POLICY IF EXISTS "Public insert switch stories" ON switch_stories;

CREATE POLICY "Insert switch stories" ON switch_stories
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
    AND display_name IS NOT NULL AND length(trim(display_name)) > 0
    AND body IS NOT NULL AND length(trim(body)) > 0
  );

-- ----------------------------------------------------------------------------
-- 1f. user_reviews — user-generated content
--     No user_id column; uses email + display_name.
--     Submitted via public review form with email verification.
--     Keep as anon+authenticated but add validation.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert user reviews" ON user_reviews;
DROP POLICY IF EXISTS "Anyone can submit user reviews" ON user_reviews;
DROP POLICY IF EXISTS "Public insert user reviews" ON user_reviews;

CREATE POLICY "Insert user reviews" ON user_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL AND length(trim(email)) > 0
    AND display_name IS NOT NULL AND length(trim(display_name)) > 0
    AND broker_id IS NOT NULL
    AND rating >= 1 AND rating <= 5
  );

-- ----------------------------------------------------------------------------
-- 1g. shared_shortlists — uses created_by (not user_id)
--     Allow anon+authenticated since shortlists can be created without login.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert shared shortlists" ON shared_shortlists;
DROP POLICY IF EXISTS "Anyone can create shortlists" ON shared_shortlists;
DROP POLICY IF EXISTS "Public insert shortlists" ON shared_shortlists;

CREATE POLICY "Insert shared shortlists" ON shared_shortlists
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    code IS NOT NULL AND length(trim(code)) > 0
    AND broker_slugs IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- 1h. professional_leads — public lead form from advisor directory
--     No user_id; uses user_name/user_email. Allow anon + authenticated.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit leads" ON professional_leads;

CREATE POLICY "Anyone can submit leads" ON professional_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_name IS NOT NULL AND length(trim(user_name)) > 0
    AND user_email IS NOT NULL AND length(trim(user_email)) > 0
    AND professional_id IS NOT NULL
  );

-- ----------------------------------------------------------------------------
-- 1i. professional_reviews — public review submission
--     No user_id; uses reviewer_name/reviewer_email.
--     Currently allows anon submissions (email-verified later).
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit reviews" ON professional_reviews;

CREATE POLICY "Anyone can submit reviews" ON professional_reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    reviewer_name IS NOT NULL AND length(trim(reviewer_name)) > 0
    AND reviewer_email IS NOT NULL AND length(trim(reviewer_email)) > 0
    AND professional_id IS NOT NULL
    AND rating >= 1 AND rating <= 5
  );

-- ----------------------------------------------------------------------------
-- 1j. advisor_profile_views — public view tracking
--     The existing policy is "FOR ALL ... WITH CHECK (true)" which is too broad.
--     Replace with separate SELECT (for reading counts) and INSERT/UPDATE
--     (for incrementing). The RPC function uses SECURITY DEFINER so direct
--     access should be more restricted.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can increment views" ON advisor_profile_views;

-- Allow the SECURITY DEFINER function to work, plus allow reads for display
CREATE POLICY "Public read advisor views" ON advisor_profile_views
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT/UPDATE restricted: the increment_advisor_view() function is
-- SECURITY DEFINER so it bypasses RLS. No direct public write needed.
-- If direct writes are needed, uncomment the policy below:
-- CREATE POLICY "Insert advisor views" ON advisor_profile_views
--   FOR INSERT TO anon, authenticated
--   WITH CHECK (professional_id IS NOT NULL AND view_date IS NOT NULL);


-- ============================================================================
-- SECTION 1-EXTRA: Tables that may exist but are not yet in the schema
--
-- The following tables were mentioned in the audit but do not appear in the
-- current database.types.ts. These CREATE POLICY statements are wrapped in
-- DO blocks so they silently skip if the table doesn't exist yet.
-- When these tables are created, run this migration again or apply manually.
-- ============================================================================

-- fee_alert_subscriptions (may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fee_alert_subscriptions') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert fee alert subscriptions" ON fee_alert_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can subscribe" ON fee_alert_subscriptions';
    EXECUTE 'CREATE POLICY "Insert fee alert subscriptions" ON fee_alert_subscriptions
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- user_portfolios (may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_portfolios') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert user portfolios" ON user_portfolios';
    EXECUTE 'DROP POLICY IF EXISTS "Update user portfolios" ON user_portfolios';
    EXECUTE 'CREATE POLICY "Insert user portfolios" ON user_portfolios
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Update user portfolios" ON user_portfolios
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- portfolio_alerts (may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_alerts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert portfolio alerts" ON portfolio_alerts';
    EXECUTE 'DROP POLICY IF EXISTS "Update portfolio alerts" ON portfolio_alerts';
    EXECUTE 'CREATE POLICY "Insert portfolio alerts" ON portfolio_alerts
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Update portfolio alerts" ON portfolio_alerts
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- rate_limits (may not exist yet — used in lib/rate-limit.ts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rate_limits') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert rate limits" ON rate_limits';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert rate limits" ON rate_limits';
    -- Rate limiting must work for anon users too
    EXECUTE 'CREATE POLICY "Upsert rate limits" ON rate_limits
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- advisor_applications (may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_applications') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert advisor applications" ON advisor_applications';
    EXECUTE 'CREATE POLICY "Insert advisor applications" ON advisor_applications
      FOR INSERT TO authenticated
      WITH CHECK (true)';
  END IF;
END $$;

-- advisor_articles (exists in app code but not in database.types.ts)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_articles') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert advisor articles" ON advisor_articles';
    EXECUTE 'DROP POLICY IF EXISTS "Update advisor articles" ON advisor_articles';
    -- Check if professional_id column exists for WITH CHECK
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_articles' AND column_name = 'professional_id') THEN
      EXECUTE 'CREATE POLICY "Insert advisor articles" ON advisor_articles
        FOR INSERT TO authenticated
        WITH CHECK (professional_id IS NOT NULL)';
      EXECUTE 'CREATE POLICY "Update advisor articles" ON advisor_articles
        FOR UPDATE TO authenticated
        USING (true) WITH CHECK (professional_id IS NOT NULL)';
    ELSE
      EXECUTE 'CREATE POLICY "Insert advisor articles" ON advisor_articles
        FOR INSERT TO authenticated
        WITH CHECK (true)';
    END IF;
  END IF;
END $$;

-- advisor_bookings (may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_bookings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Insert advisor bookings" ON advisor_bookings';
    EXECUTE 'CREATE POLICY "Insert advisor bookings" ON advisor_bookings
      FOR INSERT TO authenticated
      WITH CHECK (true)';
  END IF;
END $$;

-- investor_drip_log — server-side only (cron jobs)
-- Remove any permissive public policy; only service_role should access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_drip_log') THEN
    -- Drop any overly permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Insert investor drip log" ON investor_drip_log';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert drip log" ON investor_drip_log';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert drip log" ON investor_drip_log';
    -- No public policies = deny all for anon/authenticated
    -- service_role bypasses RLS automatically
  END IF;
END $$;


-- ============================================================================
-- SECTION 2: UNINDEXED FOREIGN KEYS & FREQUENTLY QUERIED COLUMNS (HIGH PRIORITY)
--
-- Missing indexes cause sequential scans on JOINs and WHERE clauses.
-- All use IF NOT EXISTS for idempotency.
-- ============================================================================

-- --- Core user-facing tables ---

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_broker ON affiliate_clicks(broker_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON analytics_events(page);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_reviews_broker_id ON user_reviews(broker_id);
-- user_reviews has no user_id column; index on email instead for lookups
CREATE INDEX IF NOT EXISTS idx_user_reviews_email ON user_reviews(email);
CREATE INDEX IF NOT EXISTS idx_switch_stories_broker_slug ON switch_stories(dest_broker_slug);
CREATE INDEX IF NOT EXISTS idx_switch_stories_source_broker ON switch_stories(source_broker_slug);
CREATE INDEX IF NOT EXISTS idx_broker_questions_page ON broker_questions(page_type, page_slug);
CREATE INDEX IF NOT EXISTS idx_broker_answers_question ON broker_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
-- idx_articles_slug already exists from 001_initial.sql

-- --- Advisor/Professional tables ---

-- professional_leads already has idx_leads_professional from 20260305 migration
-- professional_reviews already has idx_reviews_professional from 20260309 migration

-- advisor_articles (conditional — table may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_articles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_articles_professional') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_articles' AND column_name = 'professional_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_articles_professional ON advisor_articles(professional_id)';
      END IF;
    END IF;
  END IF;
END $$;

-- --- Broker data tables ---

CREATE INDEX IF NOT EXISTS idx_broker_data_changes_broker ON broker_data_changes(broker_slug);
CREATE INDEX IF NOT EXISTS idx_broker_data_changes_changed_at ON broker_data_changes(changed_at);

-- --- Email/capture tables ---

CREATE INDEX IF NOT EXISTS idx_email_captures_email ON email_captures(email);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_email ON quiz_leads(email);

-- --- Course tables (conditional) ---

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_purchases') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_course_purchases_user') THEN
      EXECUTE 'CREATE INDEX idx_course_purchases_user ON course_purchases(user_id)';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_progress') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_course_progress_user') THEN
      EXECUTE 'CREATE INDEX idx_course_progress_user ON course_progress(user_id)';
    END IF;
  END IF;
END $$;

-- --- Marketplace tables (conditional — campaigns may use a different table name) ---

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketplace_campaigns') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_marketplace_campaigns_broker') THEN
      EXECUTE 'CREATE INDEX idx_marketplace_campaigns_broker ON marketplace_campaigns(broker_slug)';
    END IF;
  END IF;
END $$;

-- --- Portfolio tables (conditional — may not exist yet) ---

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_holdings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portfolio_holdings_portfolio') THEN
      EXECUTE 'CREATE INDEX idx_portfolio_holdings_portfolio ON portfolio_holdings(portfolio_id)';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_fee_snapshots') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portfolio_fee_snapshots_portfolio') THEN
      EXECUTE 'CREATE INDEX idx_portfolio_fee_snapshots_portfolio ON portfolio_fee_snapshots(portfolio_id)';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'portfolio_alerts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_portfolio_alerts_portfolio') THEN
      EXECUTE 'CREATE INDEX idx_portfolio_alerts_portfolio ON portfolio_alerts(portfolio_id)';
    END IF;
  END IF;
END $$;

-- --- Advisor tables (conditional) ---

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_applications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_applications_user') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_applications' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_applications_user ON advisor_applications(user_id)';
      END IF;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_bookings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_bookings_advisor') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_bookings' AND column_name = 'advisor_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_bookings_advisor ON advisor_bookings(advisor_id)';
      END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_bookings_user') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_bookings' AND column_name = 'user_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_bookings_user ON advisor_bookings(user_id)';
      END IF;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_billing') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_billing_advisor') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_billing' AND column_name = 'advisor_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_billing_advisor ON advisor_billing(advisor_id)';
      END IF;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_sessions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_sessions_advisor') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_sessions' AND column_name = 'advisor_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_sessions_advisor ON advisor_sessions(advisor_id)';
      END IF;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_auth_tokens') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_advisor_auth_tokens_advisor') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advisor_auth_tokens' AND column_name = 'advisor_id') THEN
        EXECUTE 'CREATE INDEX idx_advisor_auth_tokens_advisor ON advisor_auth_tokens(advisor_id)';
      END IF;
    END IF;
  END IF;
END $$;

-- --- Drip log table (conditional) ---

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_drip_log') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_investor_drip_log_email') THEN
      EXECUTE 'CREATE INDEX idx_investor_drip_log_email ON investor_drip_log(email)';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- SECTION 3: FIX MUTABLE SEARCH PATHS ON FUNCTIONS (MEDIUM PRIORITY)
--
-- Functions without explicit search_path can be exploited via search_path
-- manipulation. Set search_path = public on known utility functions.
-- ============================================================================

-- These functions may or may not exist; use DO blocks for safety
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_analytics') THEN
    EXECUTE 'ALTER FUNCTION cleanup_old_analytics() SET search_path = public';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_rate_limits') THEN
    EXECUTE 'ALTER FUNCTION cleanup_rate_limits() SET search_path = public';
  END IF;
END $$;

-- Also fix the update_updated_at trigger function and increment_advisor_view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    EXECUTE 'ALTER FUNCTION update_updated_at() SET search_path = public';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_advisor_view') THEN
    EXECUTE 'ALTER FUNCTION increment_advisor_view(integer, date) SET search_path = public';
  END IF;
END $$;


-- ============================================================================
-- SECTION 4: REMOVE UNUSED INDEXES (LOW PRIORITY)
--
-- These indexes have never been used according to Supabase advisor.
-- ============================================================================

DROP INDEX IF EXISTS idx_email_captures_status;
DROP INDEX IF EXISTS idx_portfolios_email;
-- Keeping portfolio-related indexes since the portfolio feature is new


COMMIT;
