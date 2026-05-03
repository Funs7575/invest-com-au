-- =============================================================================
-- Migration: A-06 batch 2 — RLS on 6 broker marketplace tables
-- Date:       2026-07-05
-- Audit ref:  docs/audits/codebase-health-2026-04-24.md § "Tables missing RLS"
-- Queue item: A-06 batch 2
-- Why:        Six broker-marketplace tables (broker_health_scores,
--             broker_data_changes, broker_packages, broker_review_stats,
--             broker_review_invites, broker_activity_log) were created without
--             ENABLE ROW LEVEL SECURITY. With Supabase's default deny-nothing
--             model, any anon key request can enumerate or mutate these rows.
--             broker_review_invites contains PII (email addresses + secure
--             tokens); broker_data_changes and broker_health_scores are read by
--             public pages via the anon client.
-- Idempotency: All TABLE + POLICY statements use IF NOT EXISTS / DROP…IF EXISTS.
--              Safe to re-run on an already-migrated database.
-- Rollback:    See header block below.
--
-- Rollback strategy (run in psql if migration must be reversed):
--   ALTER TABLE public.broker_health_scores  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.broker_data_changes   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.broker_packages       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.broker_review_stats   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.broker_review_invites DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.broker_activity_log   DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "anon can read health scores"     ON public.broker_health_scores;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_health_scores;
--   DROP POLICY IF EXISTS "anon can read data changes"      ON public.broker_data_changes;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_data_changes;
--   DROP POLICY IF EXISTS "anon can read packages"          ON public.broker_packages;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_packages;
--   DROP POLICY IF EXISTS "anon can read review stats"      ON public.broker_review_stats;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_review_stats;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_review_invites;
--   DROP POLICY IF EXISTS "broker reads own activity"       ON public.broker_activity_log;
--   DROP POLICY IF EXISTS "service_role full access"        ON public.broker_activity_log;
--
-- IMPORTANT — prior policy state: None of these tables have any prior
--   CREATE POLICY in the migration tree. Confirmed via:
--   grep -n "POLICY.*broker_health_scores\|POLICY.*broker_data_changes\|
--            POLICY.*broker_packages\|POLICY.*broker_review_stats\|
--            POLICY.*broker_review_invites\|POLICY.*broker_activity_log"
--            supabase/migrations/*.sql   → (no output)
-- =============================================================================

BEGIN;

-- ============================================================================
-- 1. broker_health_scores
-- ============================================================================
-- Purpose: Per-broker safety/regulatory scoring shown on the public
--   /health-scores page (app/health-scores/page.tsx — createClient() anon key)
--   and the admin health-scores dashboard (createClient() browser, authenticated).
--   Writes are admin-only via service-role.
-- Callers:
--   app/health-scores/page.tsx         — server createClient() (anon SELECT)
--   app/admin/health-scores/page.tsx   — browser createClient() (authenticated SELECT + INSERT/UPDATE)
-- TODO: human review of policy semantics — no auth.uid() linkage; all rows
--   are broker-keyed reference data with no user ownership.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_health_scores (
  id                          integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_slug                 text         NOT NULL UNIQUE,
  afsl_number                 text,
  afsl_status                 text,
  overall_score               numeric      NOT NULL DEFAULT 0,
  regulatory_score            numeric,
  regulatory_notes            text,
  financial_stability_score   numeric,
  financial_stability_notes   text,
  client_money_score          numeric,
  client_money_notes          text,
  insurance_score             numeric,
  insurance_notes             text,
  platform_reliability_score  numeric,
  platform_reliability_notes  text,
  last_reviewed_at            timestamptz,
  created_at                  timestamptz  NOT NULL DEFAULT now(),
  updated_at                  timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_health_scores FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read health scores" ON public.broker_health_scores;
CREATE POLICY "anon can read health scores"
  ON public.broker_health_scores
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_health_scores;
CREATE POLICY "service_role full access"
  ON public.broker_health_scores
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_broker_health_scores_slug
  ON public.broker_health_scores (broker_slug);

-- ============================================================================
-- 2. broker_data_changes
-- ============================================================================
-- Purpose: Public audit trail of fee and data changes, shown on:
--   /whats-new (server createClient() anon), /fee-alerts (browser createClient()),
--   /api/v1/brokers/[slug] (public API). Writes are from admin routes and cron
--   (check-fees, fee-queue) which use admin client (service-role).
-- Callers:
--   app/whats-new/page.tsx                    — server createClient() (anon SELECT)
--   app/fee-alerts/page.tsx                   — browser createClient() (anon SELECT)
--   app/api/v1/brokers/[slug]/route.ts        — server createClient() (anon SELECT)
--   app/api/cron/check-fees/route.ts          — admin INSERT
--   app/api/admin/fee-queue/route.ts          — admin INSERT
--   app/admin/automation/broker-changes/page.tsx — browser createClient() (authenticated SELECT)
-- TODO: human review of policy semantics — all rows are public-facing fee
--   changes; no user ownership column.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_data_changes (
  id               bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_id        integer,
  broker_slug      text         NOT NULL,
  field_name       text         NOT NULL,
  old_value        text,
  new_value        text,
  change_type      text         NOT NULL DEFAULT 'update',
  changed_by       text,
  changed_at       timestamptz  NOT NULL DEFAULT now(),
  source           text,
  auto_applied_at  timestamptz,
  auto_applied_tier text
);

ALTER TABLE public.broker_data_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_data_changes FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read data changes" ON public.broker_data_changes;
CREATE POLICY "anon can read data changes"
  ON public.broker_data_changes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_data_changes;
CREATE POLICY "service_role full access"
  ON public.broker_data_changes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_broker_data_changes_slug
  ON public.broker_data_changes (broker_slug, changed_at DESC);

-- ============================================================================
-- 3. broker_packages
-- ============================================================================
-- Purpose: Catalog of paid marketplace packages brokers can subscribe to.
--   Read by the broker portal (/broker-portal/packages) and admin marketplace
--   pages, both via browser createClient() (authenticated). Written by admin
--   via service-role. This is a catalog / pricing table — all active packages
--   are public information shown to prospective broker partners.
-- Callers:
--   app/admin/marketplace/packages/page.tsx  — browser createClient() (authenticated SELECT + UPDATE)
--   app/broker-portal/packages/page.tsx      — browser createClient() (authenticated SELECT)
--   lib/marketplace/packages.ts              — server createClient() (anon/authenticated SELECT)
-- TODO: human review of policy semantics — catalog table; no user ownership.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_packages (
  id                      integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                    text         NOT NULL UNIQUE,
  name                    text         NOT NULL,
  tier                    text         NOT NULL,
  monthly_fee_cents       integer      NOT NULL DEFAULT 0,
  cpc_rate_discount_pct   numeric      NOT NULL DEFAULT 0,
  featured_slots_included integer      NOT NULL DEFAULT 0,
  share_of_voice_pct      numeric,
  included_placements     jsonb        NOT NULL DEFAULT '[]',
  description             text,
  support_level           text,
  is_active               boolean      NOT NULL DEFAULT true,
  sort_order              integer      NOT NULL DEFAULT 0,
  created_at              timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_packages FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read packages" ON public.broker_packages;
CREATE POLICY "anon can read packages"
  ON public.broker_packages
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_packages;
CREATE POLICY "service_role full access"
  ON public.broker_packages
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. broker_review_stats
-- ============================================================================
-- Purpose: Aggregated review metrics per broker shown on public broker profile
--   pages (app/broker/[slug]/page.tsx — createClient() anon key) and via
--   lib/cached-data.ts (anon key). Written by a cron/admin aggregation job.
-- Callers:
--   app/broker/[slug]/page.tsx  — server createClient() (anon SELECT)
--   lib/cached-data.ts          — custom anon createClient() (SELECT)
-- TODO: human review of policy semantics — aggregated stats per broker_id;
--   no user ownership column.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_review_stats (
  broker_id         integer      NOT NULL PRIMARY KEY,
  average_rating    numeric      NOT NULL DEFAULT 0,
  avg_fees_rating   numeric,
  avg_speed_rating  numeric,
  avg_platform_rating numeric,
  avg_support_rating  numeric,
  review_count      integer      NOT NULL DEFAULT 0,
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_review_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_review_stats FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read review stats" ON public.broker_review_stats;
CREATE POLICY "anon can read review stats"
  ON public.broker_review_stats
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role full access" ON public.broker_review_stats;
CREATE POLICY "service_role full access"
  ON public.broker_review_stats
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. broker_review_invites
-- ============================================================================
-- Purpose: Tracks review-request emails sent to broker customers (token, email,
--   status, expiry). Contains PII (email addresses) and secure tokens.
--   All access is via admin client or cron (service-role). No public reads.
-- Callers:
--   app/api/broker-review-invite/route.ts      — admin INSERT + UPDATE
--   app/api/cron/broker-review-invites/route.ts — admin SELECT + INSERT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_review_invites (
  id             integer      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_id      integer,
  broker_slug    text         NOT NULL,
  email          text         NOT NULL,
  token          text         NOT NULL UNIQUE,
  status         text         NOT NULL DEFAULT 'pending',
  sent_at        timestamptz  NOT NULL DEFAULT now(),
  opened_at      timestamptz,
  completed_at   timestamptz,
  expires_at     timestamptz  NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  user_review_id integer
);

ALTER TABLE public.broker_review_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_review_invites FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.broker_review_invites;
CREATE POLICY "service_role full access"
  ON public.broker_review_invites
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_broker_review_invites_slug
  ON public.broker_review_invites (broker_slug);
CREATE INDEX IF NOT EXISTS idx_broker_review_invites_token
  ON public.broker_review_invites (token);

-- ============================================================================
-- 6. broker_activity_log
-- ============================================================================
-- Purpose: Records per-broker portal actions (campaign created, package changed,
--   etc). The broker portal reads its own rows via browser createClient()
--   (authenticated); scope is enforced via a broker_accounts subquery that
--   resolves auth.uid() → broker_slug (same pattern as campaign_daily_stats
--   in 20260607130000_a03_batch4_marketplace_accounts.sql).
--   Admin intelligence page (app/admin/marketplace/intelligence/page.tsx)
--   currently uses browser createClient(), which under this policy will only
--   return the admin's own activity (empty — admins have no broker_accounts
--   row). That page should be refactored to createAdminClient() — tracked as
--   an X-stream follow-up discovery item (X-DISC-20260502-01).
-- Callers:
--   app/broker-portal/page.tsx                       — browser createClient() (authenticated SELECT own)
--   app/admin/marketplace/intelligence/page.tsx       — browser createClient() (needs admin refactor)
-- TODO: human review of policy semantics — broker_slug subquery pattern;
--   admin intelligence page refactor tracked separately.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broker_activity_log (
  id           bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  broker_slug  text         NOT NULL,
  action       text         NOT NULL,
  entity_type  text,
  entity_id    text,
  detail       text,
  created_at   timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.broker_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_activity_log FORCE  ROW LEVEL SECURITY;

-- Brokers read their own activity via the portal; auth.uid() resolves to a
-- broker_accounts row whose broker_slug gates the visible rows.
-- Same subquery pattern used in 20260607130000_a03_batch4_marketplace_accounts.sql
-- for campaign_daily_stats and campaign_events.
DROP POLICY IF EXISTS "broker reads own activity" ON public.broker_activity_log;
CREATE POLICY "broker reads own activity"
  ON public.broker_activity_log
  FOR SELECT TO authenticated
  USING (
    broker_slug = (
      SELECT broker_slug FROM public.broker_accounts
      WHERE auth_user_id = auth.uid()
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "service_role full access" ON public.broker_activity_log;
CREATE POLICY "service_role full access"
  ON public.broker_activity_log
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_broker_activity_log_slug_time
  ON public.broker_activity_log (broker_slug, created_at DESC);

COMMIT;
