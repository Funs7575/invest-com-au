-- Round 2 anon-read RLS remediation — APPLIED TO PROD 2026-06-05.
--
-- A second multi-role IDOR sweep (live `set role anon` row-count probe) found
-- one CONFIRMED active anon leak and several permissive `public`/`USING(true)`
-- policies on sensitive/secret tables that the first sweep (#1410) didn't cover:
--
--   * advisor_applications   — anon saw 2 rows of applicant PII (name/email/
--                              phone/AFSL). CONFIRMED ACTIVE. P0.
--   * api_keys               — "Service manage api keys" ALL public USING(true)
--                              on API secrets (0 rows now; catastrophic latent).
--   * user_portfolios        — "Read own portfolio" USING(true) public on
--                              email-keyed financial data (broken own-row policy).
--   * data_license_subscribers — ALL public USING(true) on subscriber PII.
--   * lead_disputes          — "Anyone can read disputes" public USING(true).
--
-- Readers verified server-side (service-role / admin routes / authed-own via
-- /api/portfolio, /api/admin/*, crons), so denying anon does not break the app.
-- Verified post-apply: anon row-count = 0 on all five.
--
-- Idempotent. Rollback: recreate the dropped USING(true) policies (NOT
-- recommended — re-opens the leak).
--
-- ⚠️ DELIBERATELY EXCLUDED (need a code change FIRST, else they break):
--   * advisor_auth_tokens — app/api/advisor-auth/verify reads it via the
--     anon-context server client (magic-link clicker has no session). Must
--     switch that read to createAdminClient BEFORE locking, or login breaks.
--   * advisor_bookings — ACTIVE leak (5 rows: investor_name/email/phone +
--     confirmation_token). app/api/advisor-booking reads it via anon to compute
--     slot availability/dedup. Must switch those reads to createAdminClient
--     (service-role) BEFORE locking, or public booking breaks. URGENT follow-up.

drop policy if exists "Anyone can read applications" on public.advisor_applications;
drop policy if exists "Admins read applications" on public.advisor_applications;
create policy "Admins read applications" on public.advisor_applications
  for select to public using (public.is_admin());

drop policy if exists "Service manage api keys" on public.api_keys;
create policy "Service manage api keys" on public.api_keys
  for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "Read own portfolio" on public.user_portfolios;
create policy "Service manage portfolios" on public.user_portfolios
  for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "Service role manages data subs" on public.data_license_subscribers;
create policy "Service role manages data subs" on public.data_license_subscribers
  for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "Anyone can read disputes" on public.lead_disputes;
drop policy if exists "Admins read disputes" on public.lead_disputes;
create policy "Admins read disputes" on public.lead_disputes
  for select to public using (public.is_admin());
