-- ============================================================================
-- Migration: 20260801001800_identity_analytics_views.sql
-- Purpose: Ideas #7 + #8 — read-only identity/workspace analytics as SQL
--          views (cheaper + correct vs in-memory aggregation).
--
--   multi_kind_cohort_stats — how many principals hold N kinds (the
--     retention signal: do multi-hat users churn less?). Derived from
--     account_kind_membership.
--   workspace_switch_stats  — switch volume per kind/source over
--     account_kind_switch_log (which workspaces get used / abandoned).
--
-- Audit ref: docs/audits/identity-platform-expansion-2026-05-20.md (Wave 3, #7/#8)
-- Risk: low — views only; service_role + authenticated read (admin-gated
--             app-side). No data writes.
-- Rollback:
--   BEGIN;
--     DROP VIEW IF EXISTS public.workspace_switch_stats;
--     DROP VIEW IF EXISTS public.multi_kind_cohort_stats;
--   COMMIT;
-- ============================================================================

BEGIN;

-- Cohort: principal_id (via the kind tables) → number of distinct kinds held.
-- account_kind_membership has one row per (auth_user_id, kind[, team]); we
-- count DISTINCT kind per auth_user_id, then bucket.
CREATE OR REPLACE VIEW public.multi_kind_cohort_stats AS
WITH per_user AS (
  SELECT auth_user_id, COUNT(DISTINCT kind) AS kinds_held
  FROM public.account_kind_membership
  WHERE auth_user_id IS NOT NULL
  GROUP BY auth_user_id
)
SELECT kinds_held, COUNT(*)::bigint AS principal_count
FROM per_user
GROUP BY kinds_held
ORDER BY kinds_held;

CREATE OR REPLACE VIEW public.workspace_switch_stats AS
SELECT
  to_kind        AS kind,
  source,
  COUNT(*)::bigint                         AS switch_count,
  COUNT(DISTINCT principal_id)::bigint     AS distinct_principals,
  MAX(switched_at)                         AS last_switch_at
FROM public.account_kind_switch_log
GROUP BY to_kind, source
ORDER BY switch_count DESC;

REVOKE ALL ON public.multi_kind_cohort_stats FROM anon, authenticated, service_role;
REVOKE ALL ON public.workspace_switch_stats FROM anon, authenticated, service_role;
-- service_role only: these are cross-user AGGREGATE views read by the
-- admin dashboard via the service client. Granting authenticated would let
-- any logged-in session read site-wide aggregates (a plain view bypasses
-- base-table RLS), so it's deliberately withheld.
GRANT SELECT ON public.multi_kind_cohort_stats TO service_role;
GRANT SELECT ON public.workspace_switch_stats TO service_role;

COMMIT;
