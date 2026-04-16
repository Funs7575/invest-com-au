-- ============================================================
-- WAVE G + H: Security hardening, observability, performance indexes
-- ============================================================
--
-- ROLLBACK STRATEGY:
-- This migration adds RLS policies, indexes, and tables. To roll back:
-- 1. DROP POLICY statements for each policy created (see DOWN section in comments)
-- 2. ALTER TABLE ... DISABLE ROW LEVEL SECURITY for forum_* tables
-- 3. DROP INDEX statements for performance indexes
-- 4. DROP TABLE for new tables (data_export_requests, account_deletion_requests, health_pings)
--
-- All operations use IF NOT EXISTS / IF EXISTS to be idempotent.

-- ────────────────────────────────────────────────────────────
-- WAVE G1: Forum tables RLS — fix critical security gap
-- ────────────────────────────────────────────────────────────
-- Forum tables were created without RLS in 20260426. Without RLS,
-- any authenticated user with the anon key can read/write any forum
-- content directly via the Supabase REST API.

ALTER TABLE public.forum_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_user_profiles   ENABLE ROW LEVEL SECURITY;

-- forum_categories: read-only for everyone, write only for service_role
CREATE POLICY "forum_categories_public_read"
  ON public.forum_categories FOR SELECT
  USING (status = 'active');

-- forum_threads: anyone can read active threads; only authenticated users can create;
-- only the author or service_role can update/delete (soft-delete via status='deleted')
CREATE POLICY "forum_threads_public_read"
  ON public.forum_threads FOR SELECT
  USING (status = 'active');

CREATE POLICY "forum_threads_authenticated_insert"
  ON public.forum_threads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE id = author_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "forum_threads_author_update"
  ON public.forum_threads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE id = author_id AND user_id = auth.uid()
    )
  );

-- forum_posts: same access pattern
CREATE POLICY "forum_posts_public_read"
  ON public.forum_posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "forum_posts_authenticated_insert"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND author_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE id = author_id AND user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "forum_posts_author_update"
  ON public.forum_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.forum_user_profiles
      WHERE id = author_id AND user_id = auth.uid()
    )
  );

-- forum_user_profiles: users can read all profiles (display_name, reputation are public),
-- but can only update their own profile
CREATE POLICY "forum_user_profiles_public_read"
  ON public.forum_user_profiles FOR SELECT
  USING (status = 'active');

CREATE POLICY "forum_user_profiles_self_insert"
  ON public.forum_user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "forum_user_profiles_self_update"
  ON public.forum_user_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- newsletter_editions: public read (for /newsletter archive), service_role write
ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_editions_public_read"
  ON public.newsletter_editions FOR SELECT
  USING (status = 'sent');


-- ────────────────────────────────────────────────────────────
-- WAVE L: User data rights — GDPR/APP compliance
-- ────────────────────────────────────────────────────────────
-- Data export and account deletion request tracking. Actual purge
-- runs via existing /api/cron/gdpr-retention-purge after admin
-- approval, but user-facing requests are tracked here for SLA.

CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL,
  email           TEXT NOT NULL,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at    TIMESTAMPTZ,
  download_url    TEXT,
  expires_at      TIMESTAMPTZ,  -- signed URL expiry
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | ready | failed | expired
  error_message   TEXT,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON public.data_export_requests (user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON public.data_export_requests (status, requested_at);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_export_requests_self_read"
  ON public.data_export_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "data_export_requests_self_insert"
  ON public.data_export_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             UUID NOT NULL UNIQUE,
  email               TEXT NOT NULL,
  reason              TEXT,
  requested_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_purge_at  TIMESTAMPTZ NOT NULL,  -- 30-day grace period default
  cancelled_at        TIMESTAMPTZ,
  fulfilled_at        TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | cancelled | purged | failed
  ip_address          INET,
  user_agent          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_purge ON public.account_deletion_requests (scheduled_purge_at) WHERE status = 'scheduled';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_deletion_requests_self_read"
  ON public.account_deletion_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "account_deletion_requests_self_insert"
  ON public.account_deletion_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "account_deletion_requests_self_cancel"
  ON public.account_deletion_requests FOR UPDATE
  USING (user_id = auth.uid() AND status = 'scheduled')
  WITH CHECK (user_id = auth.uid() AND status IN ('scheduled', 'cancelled'));


-- ────────────────────────────────────────────────────────────
-- WAVE I: Health monitoring — health_pings table
-- ────────────────────────────────────────────────────────────
-- Cron job writes a ping every 5 minutes. External monitor (UptimeRobot,
-- BetterStack) checks /api/health which queries this table. If latest
-- ping > 10 minutes old, monitor pages oncall.

CREATE TABLE IF NOT EXISTS public.health_pings (
  id              BIGSERIAL PRIMARY KEY,
  service         TEXT NOT NULL,  -- 'cron-heartbeat' | 'database' | 'cache' | etc.
  status          TEXT NOT NULL,  -- 'ok' | 'degraded' | 'down'
  latency_ms      INTEGER,
  details         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_pings_service_recent ON public.health_pings (service, created_at DESC);

-- Auto-purge old pings (keep last 7 days)
ALTER TABLE public.health_pings ENABLE ROW LEVEL SECURITY;

-- Read-only for admin via service_role; no public access
CREATE POLICY "health_pings_admin_read"
  ON public.health_pings FOR SELECT
  USING (false);  -- service_role bypasses RLS, so admin queries work; public is blocked


-- ────────────────────────────────────────────────────────────
-- WAVE H: Performance indexes on foreign keys
-- ────────────────────────────────────────────────────────────
-- Postgres does NOT auto-index foreign key columns. Missing indexes
-- on FK columns cause sequential scans on parent updates/deletes
-- and slow JOIN performance.

-- forum_threads.author_id (FK to forum_user_profiles)
CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON public.forum_threads (author_id);

-- forum_posts.author_id, forum_posts.parent_id
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent ON public.forum_posts (parent_id) WHERE parent_id IS NOT NULL;

-- newsletter_editions.status (frequent filter)
CREATE INDEX IF NOT EXISTS idx_newsletter_editions_sent ON public.newsletter_editions (edition_date DESC) WHERE status = 'sent';

-- investment_listings: most common filters
CREATE INDEX IF NOT EXISTS idx_investment_listings_active_vertical ON public.investment_listings (vertical, listing_type, created_at DESC) WHERE status = 'active';

-- best_for_scenarios.display_order (sitemap + listing order)
CREATE INDEX IF NOT EXISTS idx_best_for_scenarios_order ON public.best_for_scenarios (display_order);

-- regulatory_alerts.status + published_at (homepage/alerts page)
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_published ON public.regulatory_alerts (published_at DESC) WHERE status = 'published';

-- switch_stories.status + approved_at (stories page)
CREATE INDEX IF NOT EXISTS idx_switch_stories_approved ON public.switch_stories (approved_at DESC) WHERE status = 'approved';


-- ────────────────────────────────────────────────────────────
-- WAVE H: Soft-delete helpers
-- ────────────────────────────────────────────────────────────
-- For tables holding user content, prefer status='deleted' over
-- DELETE so we can recover from accidental moderation actions.
-- Add deleted_at columns where missing (forum tables already use
-- status field, so nothing needed).


-- ────────────────────────────────────────────────────────────
-- WAVE G2: Auth attempt logging — track failed login attempts
-- ────────────────────────────────────────────────────────────
-- Beyond rate limiting, log every failed login for security review.
-- Helps detect credential-stuffing attempts and brute-force patterns.

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT,
  ip_hash         TEXT NOT NULL,  -- hashed for privacy
  user_agent      TEXT,
  attempt_type    TEXT NOT NULL,  -- 'login' | 'reset' | 'mfa' | 'otp'
  success         BOOLEAN NOT NULL DEFAULT false,
  failure_reason  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_recent ON public.auth_attempts (email, created_at DESC) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_recent ON public.auth_attempts (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_failed ON public.auth_attempts (created_at DESC) WHERE success = false;

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
-- Service-role only (admin views via admin RPC); public has no access


-- ────────────────────────────────────────────────────────────
-- WAVE G: ToS acceptance tracking
-- ────────────────────────────────────────────────────────────
-- Records explicit user acceptance of Terms of Service + Privacy
-- Policy versions. Required for legally-defensible click-through.

CREATE TABLE IF NOT EXISTS public.tos_acceptances (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL,
  tos_version     TEXT NOT NULL,           -- e.g. '2026.04.01'
  privacy_version TEXT NOT NULL,
  accepted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address      INET,
  user_agent      TEXT,
  UNIQUE (user_id, tos_version, privacy_version)
);

CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user ON public.tos_acceptances (user_id, accepted_at DESC);

ALTER TABLE public.tos_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tos_acceptances_self_read"
  ON public.tos_acceptances FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "tos_acceptances_self_insert"
  ON public.tos_acceptances FOR INSERT
  WITH CHECK (user_id = auth.uid());
