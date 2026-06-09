-- ============================================================
-- Admin/observability bulk RLS policies (O-01, iter 4)
--
-- Source: 04-26 audit §4.4.1 — `rls_enabled_no_policy` advisor
-- finding. Iter 4 of the user-data class. This is the bulk
-- admin/observability batch — 14 tables that all share the
-- same access pattern (no legitimate user-facing read), bundled
-- into one migration to avoid 14 trivial PRs.
--
-- Tables in scope:
--
--   Observability (read by admin dashboards, written by crons):
--     1. cron_run_log
--     2. data_integrity_issues
--     3. slo_definitions
--     4. slo_incidents
--     5. web_vitals_samples
--
--   Automation control (admin-only config):
--     6. automation_kill_switches
--     7. feature_flags
--
--   Compliance / financial bookkeeping:
--     8. financial_periods
--     9. revenue_attribution_daily
--    10. revenue_reconciliation_runs
--
--   Anti-abuse (admin-only signals):
--    11. email_suppression_list
--    12. fraud_signals
--
--   Analytics (admin-only):
--    13. attribution_touches
--
--   Aggregate ML metadata (NEEDS public SELECT — different shape):
--    14. lead_quality_weights
--
-- All 14 were RLS-enabled at creation but no policies were
-- added, so non-service-role reads/writes were silently denied.
-- All current non-admin callers route through admin-mediated APIs
-- with the exception of one find-advisor SSR page that reads
-- `lead_quality_weights` via the cookie client — handled with a
-- dedicated public-SELECT policy on that single table.
--
-- Verification gate (per REMEDIATION_DEFAULTS §"Verification
-- gates" — added after iter-7 B-05 stack-up):
--
--   1. Prior policies: grep'd `POLICY.*<table>` against every
--      migration; ZERO existing policies on any of the 14
--      targets. Clean ground for new policies.
--
--   2. Caller scan: grep'd `from("<table>")` across `lib/` +
--      `app/`. For each non-admin caller, traced the import
--      chain to the originating client. Findings:
--         - lib/attribution.ts is client-agnostic but the only
--           external caller (`/api/attribution/touch`) supplies
--           a service-role admin client. SAFE.
--         - lib/fraud-detection.ts only mentions fraud_signals
--           in a docstring; no code path actually queries it
--           today (the table is populated by a yet-to-be-built
--           cron). SAFE.
--         - lib/advisor-ranker.ts is client-agnostic; the
--           find-advisor SSR page passes the cookie client.
--           NOT safe with strict service-role-only — handled by
--           adding `anon, authenticated SELECT USING (true)` on
--           lead_quality_weights below. The data is aggregate
--           ML metadata (signal_name, weight, sample_size,
--           hit_rate) — no PII, no user identifiers, public
--           reading is fine.
--
-- Tested via the Supabase advisor: after this migration the
-- `rls_enabled_no_policy` finding count drops from 48 (post iter
-- 1+2+3) → 34.
--
-- Idempotent (DROP POLICY IF EXISTS + CREATE POLICY). Safe to
-- re-apply on the live DB.
--
-- Rollback (operator-only): for each table, the inverse of the
-- CREATE POLICY block. Tables remain RLS-enabled with no
-- policies — same default-deny state they were in before this
-- migration.
-- ============================================================

-- ── Observability ────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.cron_run_log;
CREATE POLICY "service_role full access" ON public.cron_run_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.data_integrity_issues;
CREATE POLICY "service_role full access" ON public.data_integrity_issues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.slo_definitions;
CREATE POLICY "service_role full access" ON public.slo_definitions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.slo_incidents;
CREATE POLICY "service_role full access" ON public.slo_incidents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.web_vitals_samples;
CREATE POLICY "service_role full access" ON public.web_vitals_samples
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Automation control ───────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.automation_kill_switches;
CREATE POLICY "service_role full access" ON public.automation_kill_switches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.feature_flags;
CREATE POLICY "service_role full access" ON public.feature_flags
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Compliance / financial bookkeeping ───────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.financial_periods;
CREATE POLICY "service_role full access" ON public.financial_periods
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.revenue_attribution_daily;
CREATE POLICY "service_role full access" ON public.revenue_attribution_daily
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.revenue_reconciliation_runs;
CREATE POLICY "service_role full access" ON public.revenue_reconciliation_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Anti-abuse signals ───────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.email_suppression_list;
CREATE POLICY "service_role full access" ON public.email_suppression_list
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role full access" ON public.fraud_signals;
CREATE POLICY "service_role full access" ON public.fraud_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Analytics ────────────────────────────────────────────────
DROP POLICY IF EXISTS "service_role full access" ON public.attribution_touches;
CREATE POLICY "service_role full access" ON public.attribution_touches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Aggregate ML metadata (special case — public SELECT) ─────
-- lead_quality_weights is read by app/find-advisor/[location]/page.tsx
-- via the cookie client. Data is non-PII aggregate (signal_name,
-- weight, sample_size, hit_rate, model_version) — public read is
-- fine. Writes (the nightly cron that recomputes weights) stay
-- service-role-only.
DROP POLICY IF EXISTS "service_role full access" ON public.lead_quality_weights;
CREATE POLICY "service_role full access" ON public.lead_quality_weights
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public can read" ON public.lead_quality_weights;
CREATE POLICY "public can read" ON public.lead_quality_weights
  FOR SELECT TO anon, authenticated USING (true);
