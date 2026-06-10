-- Powers M04_rls_tables_with_policies on the weekly code-quality dashboard.
--
-- Why: pg_policies is a Postgres system view; PostgREST doesn't expose it
-- by default, so the prior collector's direct `sb.from("pg_policies")` call
-- returned 0 rows and the metric stayed null. A SECURITY DEFINER function
-- with EXECUTE granted to service_role lets the CI collector read the
-- count without exposing the underlying view to authenticated/anon.
--
-- Returns: integer count of DISTINCT (schemaname, tablename) pairs with at
-- least one row in pg_policies, filtered to the `public` schema.
--
-- Rollback: DROP FUNCTION IF EXISTS public.metric_rls_tables_with_policies();

CREATE OR REPLACE FUNCTION public.metric_rls_tables_with_policies()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COUNT(DISTINCT tablename)::integer
  FROM pg_policies
  WHERE schemaname = 'public';
$$;

REVOKE ALL ON FUNCTION public.metric_rls_tables_with_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.metric_rls_tables_with_policies() TO service_role;
