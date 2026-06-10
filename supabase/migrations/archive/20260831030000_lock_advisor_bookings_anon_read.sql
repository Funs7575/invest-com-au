-- Lock advisor_bookings anon read — APPLIED TO PROD 2026-06-05.
--
-- "Public can read bookings" USING(true) exposed investor PII (investor_name,
-- investor_email, investor_phone) + confirmation_token to anyone with the anon
-- key — confirmed active (5 rows visible to anon). Its only readers — the
-- public booking route (availability/dedup/insert) and the advisor dashboard
-- (count) — were switched to the service-role client in the same change, so
-- anon no longer needs to read this table.
--
-- Deny anon; admins read via is_admin(); service-role bypasses RLS.
-- Idempotent. Rollback: recreate the USING(true) policy (re-opens the leak).
drop policy if exists "Public can read bookings" on public.advisor_bookings;
drop policy if exists "Admins read bookings" on public.advisor_bookings;
create policy "Admins read bookings" on public.advisor_bookings
  for select to public using (public.is_admin());
