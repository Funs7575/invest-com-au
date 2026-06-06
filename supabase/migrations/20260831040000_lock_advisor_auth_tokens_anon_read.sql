-- Lock advisor_auth_tokens anon read — APPLIED TO PROD 2026-06-05.
--
-- "Anyone can read auth tokens" SELECT public USING(true) made magic-link auth
-- tokens anon-readable (0 rows at probe time, but account takeover the moment a
-- token exists). All readers now use the service-role client:
--   * app/api/advisor-auth/verify — switched to createAdminClient (it's a
--     server-side auth op for an unauthenticated caller; also inserts into
--     advisor_sessions which is deny-all by design).
--   * admin/advisor-applications, cron/cleanup — already service-role.
-- Deny anon; service-role bypasses RLS. Idempotent. Rollback: recreate USING(true).
drop policy if exists "Anyone can read auth tokens" on public.advisor_auth_tokens;
drop policy if exists "Service manage auth tokens" on public.advisor_auth_tokens;
create policy "Service manage auth tokens" on public.advisor_auth_tokens
  for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
