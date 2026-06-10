-- Date: 2026-05-01
-- Audit ref: docs/audits/codebase-health-2026-04-24.md §O
-- Queue item: O-03
-- Why: refresh_advisor_cohort_metrics() is declared SECURITY DEFINER without a pinned
--      search_path. An attacker who can create objects in a schema that appears before
--      'public' in the caller's search_path could shadow built-ins or table names,
--      causing the SECURITY DEFINER body to execute under elevated privilege using
--      attacker-supplied objects. Pinning search_path = public, pg_catalog closes
--      that injection vector.
-- Idempotency: CREATE OR REPLACE FUNCTION is idempotent — re-running simply
--              overwrites the function definition with identical content. No-op on
--              subsequent applies.
-- Rollback (restores pre-patch definition — removes SET search_path):
--   CREATE OR REPLACE FUNCTION public.refresh_advisor_cohort_metrics()
--    RETURNS void LANGUAGE plpgsql SECURITY DEFINER
--   AS $function$
--   BEGIN
--     REFRESH MATERIALIZED VIEW public.advisor_cohort_metrics;
--   END;
--   $function$;
--
-- Callers verified: lib/job-queue.ts:161 (service-role RPC, admin context only).
-- No anon-key callers; function is never exposed to unauthenticated paths.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_advisor_cohort_metrics()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.advisor_cohort_metrics;
END;
$function$;

COMMIT;
