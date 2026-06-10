-- ============================================================
-- Revoke pg_graphql anonymous + authenticated access
--
-- Closes 241 of 261 Supabase security-advisor findings
-- (`pg_graphql_anon_table_exposed`) in a single statement.
--
-- Rationale: the repository does not use the GraphQL endpoint at
-- /graphql/v1. Verified 2026-04-26 by:
--     grep -rn "/graphql/v1\|pg_graphql\|graphql_public" \
--          app/ components/ lib/ --include="*.ts" --include="*.tsx"
-- → zero matches.
--
-- All client traffic uses PostgREST via the Supabase JS SDK
-- (`.from('table').select(...)`). Removing GraphQL anon access
-- shrinks the attack surface to PostgREST + RLS, which is what
-- our security model assumes.
--
-- Rollback (do not include in this migration — operator step
-- only if a future feature needs GraphQL):
--     GRANT USAGE ON SCHEMA graphql_public TO anon, authenticated;
--     GRANT USAGE ON SCHEMA graphql        TO anon, authenticated;
--     GRANT EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, text)
--         TO anon, authenticated;
--
-- Audit reference: docs/audits/2026-04-26-comprehensive-audit.md
-- §4.4.2 ("F-4.4.2 P1 — Revoke pg_graphql anon access").
-- Maps to metric M07 (Supabase advisor findings — security).
-- ============================================================

-- Belt-and-braces: revoke from both schemas pg_graphql installs
-- (`graphql_public` is the user-facing wrapper; `graphql` holds
-- the internal resolver).
REVOKE USAGE ON SCHEMA graphql_public FROM anon, authenticated;
REVOKE USAGE ON SCHEMA graphql        FROM anon, authenticated;

-- Revoke the wrapper function explicitly. The signature is the
-- standard one shipped by pg_graphql; if it ever changes, this
-- statement becomes a no-op (REVOKE on a non-existent function
-- raises NOTICE only when explicitly named, so we wrap in DO).
DO $$
BEGIN
  EXECUTE 'REVOKE EXECUTE ON FUNCTION graphql_public.graphql(text, text, jsonb, text) FROM anon, authenticated';
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'graphql_public.graphql(...) not present — skipping (extension may have been removed already)';
END $$;

-- Service role retains access (no REVOKE on service_role above).
-- Postgres superuser (`postgres`) is unaffected.
