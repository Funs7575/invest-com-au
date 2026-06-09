-- =============================================================================
-- Migration: A-06 batch 3 — RLS on 6 fee/content/user-profile tables
-- Date:       2026-07-06
-- Audit ref:  docs/audits/codebase-health-2026-04-24.md § "Tables missing RLS"
-- Queue item: A-06 batch 3
-- Why:        Six tables (fee_profiles, course_progress, regulatory_alerts,
--             fee_auto_rules, fee_update_queue, legal_documents) were created
--             without ENABLE ROW LEVEL SECURITY. With Supabase's default
--             deny-nothing model, any anon-key request can enumerate or mutate
--             these rows. fee_profiles and course_progress contain user-scoped
--             data (user_id column) that must be self-scoped. regulatory_alerts
--             are public-read (used in sitemap); the others are admin-only.
-- Idempotency: All TABLE + POLICY statements use IF NOT EXISTS / DROP…IF EXISTS.
--              Safe to re-run on an already-migrated database.
-- Rollback:    See header block below.
--
-- Rollback strategy (run in psql if migration must be reversed):
--   ALTER TABLE public.fee_profiles        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.course_progress     DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.regulatory_alerts   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.fee_auto_rules      DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.fee_update_queue    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.legal_documents     DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "user reads own fee profile"      ON public.fee_profiles;
--   DROP POLICY IF EXISTS "user writes own fee profile"     ON public.fee_profiles;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.fee_profiles;
--   DROP POLICY IF EXISTS "user reads own progress"         ON public.course_progress;
--   DROP POLICY IF EXISTS "user writes own progress"        ON public.course_progress;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.course_progress;
--   DROP POLICY IF EXISTS "anon reads published alerts"     ON public.regulatory_alerts;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.regulatory_alerts;
--   DROP POLICY IF EXISTS "authenticated reads fee rules"   ON public.fee_auto_rules;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.fee_auto_rules;
--   DROP POLICY IF EXISTS "authenticated reads fee queue"   ON public.fee_update_queue;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.fee_update_queue;
--   DROP POLICY IF EXISTS "authenticated reads legal docs"  ON public.legal_documents;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.legal_documents;
--
-- IMPORTANT — prior policy state: None of these tables have any prior
--   CREATE POLICY in the migration tree. Confirmed via:
--   grep -n "POLICY.*fee_profiles\|POLICY.*course_progress\|
--            POLICY.*regulatory_alerts\|POLICY.*fee_auto_rules\|
--            POLICY.*fee_update_queue\|POLICY.*legal_documents"
--            supabase/migrations/*.sql   → (no output)
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. fee_profiles
-- ============================================================================
-- Purpose: Per-user trading profile used to compute personalised fee estimates
--   (ASX/US trades per month, average trade size, portfolio value, current
--   broker). Contains user PII-adjacent data. Both reads and writes are
--   performed by the authenticated user via app/api/fee-profile/route.ts
--   (server createClient() + auth.getUser()). Written by the user themselves;
--   admin access via service-role only.
-- Callers:
--   app/api/fee-profile/route.ts  — server createClient() (authenticated
--     GET own profile + POST/upsert own profile; Pro-subscription gate)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_profiles (
  id                    integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               uuid         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  asx_trades_per_month  integer      NOT NULL DEFAULT 0,
  us_trades_per_month   integer      NOT NULL DEFAULT 0,
  avg_trade_size        numeric      NOT NULL DEFAULT 0,
  portfolio_value       numeric,
  current_broker_slug   text,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_profiles FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own fee profile" ON public.fee_profiles;
CREATE POLICY "user reads own fee profile"
  ON public.fee_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user writes own fee profile" ON public.fee_profiles;
CREATE POLICY "user writes own fee profile"
  ON public.fee_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role full access" ON public.fee_profiles;
CREATE POLICY "service_role full access"
  ON public.fee_profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_profiles_user_id
  ON public.fee_profiles (user_id);

-- ============================================================================
-- 2. course_progress
-- ============================================================================
-- Purpose: Tracks per-user lesson completion for paid courses. Contains
--   user_id (auth.uid()) linkage. User reads and upserts their own progress
--   via app/api/course/progress/route.ts (server createClient() + auth check).
--   Lesson progress page (app/courses/[slug]/[lessonSlug]/page.tsx) reads
--   progress via server createClient(). Admin reads via service-role.
-- Callers:
--   app/api/course/progress/route.ts           — server createClient() (authenticated upsert own)
--   app/courses/[slug]/[lessonSlug]/page.tsx   — server createClient() (authenticated SELECT own)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.course_progress (
  id           integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  lesson_id    integer      NOT NULL,
  completed_at timestamptz
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_progress FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own progress" ON public.course_progress;
CREATE POLICY "user reads own progress"
  ON public.course_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user writes own progress" ON public.course_progress;
CREATE POLICY "user writes own progress"
  ON public.course_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role full access" ON public.course_progress;
CREATE POLICY "service_role full access"
  ON public.course_progress
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_course_progress_user_lesson
  ON public.course_progress (user_id, lesson_id);

-- ============================================================================
-- 3. regulatory_alerts
-- ============================================================================
-- Purpose: Published regulatory updates (ASIC, APRA, ATO) shown on public
--   alert pages and included in the sitemap (app/sitemap.ts — server
--   createClient() anon, filtered by status='published'). Admin manages
--   alerts via app/admin/regulatory-alerts/page.tsx (browser createClient(),
--   authenticated). Writes via service-role (admin API or cron).
-- Callers:
--   app/sitemap.ts                       — server createClient() (anon SELECT published)
--   app/admin/regulatory-alerts/page.tsx — browser createClient() (authenticated SELECT all)
-- TODO: human review of policy semantics — authenticated SELECT all rows
--   allows any logged-in user to read unpublished drafts. If draft
--   confidentiality is required, change authenticated policy to
--   USING (status = 'published') and have admin use createAdminClient().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.regulatory_alerts (
  id             integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug           text         NOT NULL UNIQUE,
  alert_type     text         NOT NULL,
  severity       text,
  body           text,
  impact_summary text,
  action_items   jsonb,
  effective_date date,
  published_at   timestamptz,
  status         text         NOT NULL DEFAULT 'draft',
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.regulatory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_alerts FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon reads published alerts" ON public.regulatory_alerts;
CREATE POLICY "anon reads published alerts"
  ON public.regulatory_alerts
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "authenticated reads all alerts" ON public.regulatory_alerts;
CREATE POLICY "authenticated reads all alerts"
  ON public.regulatory_alerts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.regulatory_alerts;
CREATE POLICY "service_role full access"
  ON public.regulatory_alerts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_slug
  ON public.regulatory_alerts (slug);
CREATE INDEX IF NOT EXISTS idx_regulatory_alerts_status_published
  ON public.regulatory_alerts (status, published_at DESC);

-- ============================================================================
-- 4. fee_auto_rules
-- ============================================================================
-- Purpose: Admin-managed automation rules that automatically apply fee updates
--   to broker data (e.g., "if ASX brokerage > $X, mark as expensive"). Read
--   and toggled by app/admin/fee-queue/page.tsx (browser createClient(),
--   authenticated admin). Writes are admin-only.
-- Callers:
--   app/admin/fee-queue/page.tsx — browser createClient() (authenticated SELECT + UPDATE)
-- TODO: human review of policy semantics — authenticated SELECT allows any
--   logged-in user to read automation rules. Admin-only access requires
--   either email-list check or switching to createAdminClient().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_auto_rules (
  id         integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_name  text         NOT NULL,
  field_name text         NOT NULL,
  condition  text         NOT NULL,
  action     text         NOT NULL,
  enabled    boolean      DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_auto_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_auto_rules FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads fee rules" ON public.fee_auto_rules;
CREATE POLICY "authenticated reads fee rules"
  ON public.fee_auto_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.fee_auto_rules;
CREATE POLICY "service_role full access"
  ON public.fee_auto_rules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. fee_update_queue
-- ============================================================================
-- Purpose: Queue of pending fee changes awaiting admin review + approval.
--   Read by app/admin/page.tsx (browser createClient(), authenticated) for
--   count display and by app/api/admin/fee-queue/route.ts (server
--   createClient() for auth check; createAdminClient() for writes). Writes
--   are from admin API (service-role).
-- Callers:
--   app/admin/page.tsx              — browser createClient() (authenticated SELECT count)
--   app/api/admin/fee-queue/route.ts — admin PATCH/DELETE (service-role)
-- TODO: human review of policy semantics — authenticated SELECT allows any
--   logged-in user to count pending fee queue items. Admin-only intended.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fee_update_queue (
  id             bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_id      integer,
  broker_slug    text         NOT NULL,
  field_name     text         NOT NULL,
  current_value  text,
  proposed_value text,
  source         text,
  status         text         NOT NULL DEFAULT 'pending',
  priority       integer      NOT NULL DEFAULT 0,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  reviewed_at    timestamptz,
  reviewed_by    text
);

ALTER TABLE public.fee_update_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_update_queue FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads fee queue" ON public.fee_update_queue;
CREATE POLICY "authenticated reads fee queue"
  ON public.fee_update_queue
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.fee_update_queue;
CREATE POLICY "service_role full access"
  ON public.fee_update_queue
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fee_update_queue_status_priority
  ON public.fee_update_queue (status, priority DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_fee_update_queue_broker_slug
  ON public.fee_update_queue (broker_slug);

-- ============================================================================
-- 6. legal_documents
-- ============================================================================
-- Purpose: Versioned legal text store (ToS, Privacy Policy, AFSL disclosure,
--   etc.) managed by app/admin/legal/page.tsx (browser createClient(),
--   authenticated admin). Read and updated by admin only; anon users are
--   served static copies or rendered from the content tables.
-- Callers:
--   app/admin/legal/page.tsx — browser createClient() (authenticated SELECT + UPDATE)
-- TODO: human review of policy semantics — authenticated SELECT allows any
--   logged-in user to read legal document drafts. Admin-only intended;
--   if draft confidentiality required, switch admin page to createAdminClient().
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category    text         NOT NULL,
  title       text         NOT NULL,
  body        text,
  version     text,
  effective_at date,
  is_current  boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated reads legal docs" ON public.legal_documents;
CREATE POLICY "authenticated reads legal docs"
  ON public.legal_documents
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.legal_documents;
CREATE POLICY "service_role full access"
  ON public.legal_documents
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_legal_documents_category
  ON public.legal_documents (category, effective_at DESC);

COMMIT;
