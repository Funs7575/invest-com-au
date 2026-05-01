-- ============================================================
-- O-iter8 RLS — observability + anti-abuse (8 tables)
--
-- Eighth pass through the Stream-O backlog of "RLS-enabled-but-
-- zero-policies" tables (O-01 in docs/audits/REMEDIATION_QUEUE.md).
-- Iters 1-7 cleared 45 tables. This migration covers the next
-- coherent batch: 8 telemetry / anti-abuse tables that are written
-- by crons (or middleware) and read only by admin pages or other
-- crons. None has a user-facing read path.
--
-- All eight had RLS enabled at create time but no CREATE POLICY
-- — meaning Postgres denies-by-default to every role except
-- service_role (which bypasses RLS). That posture is correct, but
-- it leaves zero rows in pg_policies which (a) makes the intended
-- access model invisible to auditors and (b) means a future
-- policy add-on lands without an explicit baseline to delta from.
-- This migration encodes the intent — service_role full access,
-- everything else denied — by adding the canonical
-- `service_role full access` policy on each table.
--
-- Verification (per REMEDIATION_DEFAULTS §"Verification gates"):
--   - Confirmed via grep across supabase/migrations/ that none of
--     the eight tables already has a CREATE POLICY statement.
--   - Confirmed via grep across app/ + lib/ that every read/write
--     site uses createAdminClient() (service-role). No anon or
--     authenticated cookie-client touches these tables today, so
--     the migration is a zero-runtime-change clarity pass.
--
-- Tables in scope, with original-creating migration:
--
--   1. web_vitals_daily_rollup    — observability rollup of web_vitals_samples.
--                                    Source: 20260422_wave_18_observability.sql
--                                    Touched by: lib/web-vitals.ts (admin),
--                                    app/admin/analytics/perf/page.tsx (admin).
--   2. health_pings               — cron-heartbeat / DB / cache health log.
--                                    Source: 20260427_wave_security_observability.sql
--                                    Touched by: app/api/cron/heartbeat/route.ts,
--                                    app/api/health/route.ts (both admin).
--   3. automation_verdict_daily   — daily rollup of agent verdicts.
--                                    Source: 20260413_automation_wave_2.sql
--                                    Touched by: app/api/cron/automation-verdict-rollup/route.ts,
--                                    app/admin/automation/listings/page.tsx (admin).
--   4. form_events                — per-step form-funnel beacon.
--                                    Source: 20260415_wave_6_conversion_intelligence.sql
--                                    Touched by: app/api/form-event/route.ts (admin),
--                                    app/api/cron/abandoned-form-drip/route.ts (admin),
--                                    app/api/cron/data-integrity-audit/route.ts (admin),
--                                    app/admin/automation/forms/page.tsx (admin).
--   5. search_queries             — search-bar query log for analytics.
--                                    Source: 20260422_wave_18_observability.sql
--                                    Touched by: lib/search-analytics.ts (admin).
--   6. search_embeddings          — pgvector semantic-search embeddings.
--                                    Source: 20260415_wave_6_conversion_intelligence.sql
--                                    Touched by: app/api/cron/embeddings-refresh/route.ts (admin),
--                                    app/api/search-semantic/route.ts (admin),
--                                    lib/chatbot.ts (admin).
--   7. auth_attempts              — login / reset / mfa / otp attempt audit.
--                                    Source: 20260427_wave_security_observability.sql
--                                    Touched by: admin paths only (no current
--                                    callers under app/ or lib/ — written by
--                                    auth-related routes via service-role).
--   8. rate_limit_buckets         — DB-backed token-bucket rate limiter.
--                                    Source: 20260414_wave_3_trust_compliance.sql
--                                    Touched by: lib/rate-limit-db.ts (admin).
--
-- Why service-role-only is the right shape (and not e.g. anon
-- INSERT for form_events / search_queries):
--   - Today every writer goes through a server-side route handler
--     that uses createAdminClient(). Granting anon INSERT would
--     widen the attack surface (direct PostgREST writes from
--     malicious clients bypassing route validation / rate limits)
--     for zero runtime benefit.
--   - If a future feature ever needs a direct browser writer it
--     can land its own additive policy (RLS policies stack); this
--     migration deliberately doesn't pre-grant that capability.
--   - rate_limit_buckets MUST stay service-role-only — granting any
--     other role write would let a client mutate its own bucket and
--     defeat the limiter.
--   - search_embeddings MUST stay service-role-only — embeddings
--     leak document semantics; the public path is the
--     /api/search-semantic route which performs scoped queries
--     server-side using the admin client.
--
-- Policy-shape choices (mirror O-iter6/iter7):
--   - `service_role full access` `FOR ALL TO service_role USING (true)
--     WITH CHECK (true)` — explicit allow even though service_role
--     bypasses RLS, so pg_policies surfaces intent for auditors.
--   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` is a no-op on
--     already-enabled tables (all eight are already enabled).
--   - `ALTER TABLE ... FORCE ROW LEVEL SECURITY` upgrades these to
--     paranoid mode — even table-owner queries respect RLS. Matches
--     iter6/iter7 posture for service-role-only telemetry.
--   - Each CREATE POLICY is preceded by `DROP POLICY IF EXISTS` so
--     reruns succeed.
--
-- Idempotent: yes (DROP-then-CREATE pattern; ENABLE/FORCE are no-ops
-- when already applied).
--
-- Rollback (operator-only — execute against the target DB):
--
--   -- 1. web_vitals_daily_rollup
--   DROP POLICY IF EXISTS "service_role full access" ON public.web_vitals_daily_rollup;
--   ALTER TABLE public.web_vitals_daily_rollup NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.web_vitals_daily_rollup DISABLE ROW LEVEL SECURITY;
--   -- 2. health_pings
--   DROP POLICY IF EXISTS "service_role full access" ON public.health_pings;
--   ALTER TABLE public.health_pings NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.health_pings DISABLE ROW LEVEL SECURITY;
--   -- 3. automation_verdict_daily
--   DROP POLICY IF EXISTS "service_role full access" ON public.automation_verdict_daily;
--   ALTER TABLE public.automation_verdict_daily NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.automation_verdict_daily DISABLE ROW LEVEL SECURITY;
--   -- 4. form_events
--   DROP POLICY IF EXISTS "service_role full access" ON public.form_events;
--   ALTER TABLE public.form_events NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.form_events DISABLE ROW LEVEL SECURITY;
--   -- 5. search_queries
--   DROP POLICY IF EXISTS "service_role full access" ON public.search_queries;
--   ALTER TABLE public.search_queries NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.search_queries DISABLE ROW LEVEL SECURITY;
--   -- 6. search_embeddings
--   DROP POLICY IF EXISTS "service_role full access" ON public.search_embeddings;
--   ALTER TABLE public.search_embeddings NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.search_embeddings DISABLE ROW LEVEL SECURITY;
--   -- 7. auth_attempts
--   DROP POLICY IF EXISTS "service_role full access" ON public.auth_attempts;
--   ALTER TABLE public.auth_attempts NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.auth_attempts DISABLE ROW LEVEL SECURITY;
--   -- 8. rate_limit_buckets
--   DROP POLICY IF EXISTS "service_role full access" ON public.rate_limit_buckets;
--   ALTER TABLE public.rate_limit_buckets NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.rate_limit_buckets DISABLE ROW LEVEL SECURITY;
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. web_vitals_daily_rollup — observability rollup
--   Written by the nightly web-vitals rollup cron via admin client.
--   Read by app/admin/analytics/perf/page.tsx via admin client.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.web_vitals_daily_rollup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_vitals_daily_rollup FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.web_vitals_daily_rollup;
CREATE POLICY "service_role full access" ON public.web_vitals_daily_rollup
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 2. health_pings — cron-heartbeat / DB / cache health log
--   Written by /api/cron/heartbeat + /api/health via admin client.
--   No public read path; admin reads via service-role.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.health_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_pings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.health_pings;
CREATE POLICY "service_role full access" ON public.health_pings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 3. automation_verdict_daily — agent-verdict rollup
--   Written by /api/cron/automation-verdict-rollup via admin.
--   Read by app/admin/automation/listings/page.tsx via admin.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.automation_verdict_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_verdict_daily FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.automation_verdict_daily;
CREATE POLICY "service_role full access" ON public.automation_verdict_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 4. form_events — per-step form-funnel beacon
--   Written by /api/form-event via admin (the route validates
--   shape + rate-limits before insert). Read by abandoned-form
--   drip cron + admin/automation/forms dashboard, both admin.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.form_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.form_events;
CREATE POLICY "service_role full access" ON public.form_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 5. search_queries — search-bar query analytics log
--   Written by lib/search-analytics.ts (called from server-side
--   search routes) via admin. No user-facing read.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_queries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.search_queries;
CREATE POLICY "service_role full access" ON public.search_queries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 6. search_embeddings — pgvector semantic-search embeddings
--   MUST stay service-role-only. The public surface is the
--   /api/search-semantic route which queries this table via the
--   admin client and returns only sanitised hit metadata. Direct
--   anon SELECT would leak full embeddings + body excerpts.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.search_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_embeddings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.search_embeddings;
CREATE POLICY "service_role full access" ON public.search_embeddings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 7. auth_attempts — login/reset/mfa/otp attempt audit
--   Security telemetry. ip_hash + email + user_agent are PII-
--   adjacent. Service-role only; admin views via admin RPC.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.auth_attempts;
CREATE POLICY "service_role full access" ON public.auth_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- 8. rate_limit_buckets — DB-backed token-bucket limiter
--   MUST stay service-role-only. Granting any other role write
--   access would let a client mutate its own bucket and defeat
--   the limiter. lib/rate-limit-db.ts uses the admin client.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.rate_limit_buckets;
CREATE POLICY "service_role full access" ON public.rate_limit_buckets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
