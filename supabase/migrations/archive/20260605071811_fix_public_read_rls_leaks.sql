-- Fix public-read RLS leaks on advisor_billing, fee_alert_subscriptions, price_drop_notifications
--
-- Found by the multi-role IDOR/authorization bot sweep (2026-06-05; see
-- docs/audits/IDOR-SWEEP-2026-06-05.md). Three tables carried permissive policies that
-- exposed privileged data to the *public* role (anyone with the embedded anon key,
-- including unauthenticated visitors):
--
--   * advisor_billing          — "Anyone can read billing"  SELECT public USING (true)
--                                → anon read of amount_cents, invoice_number,
--                                  stripe_invoice_id, stripe_payment_intent_id (12 rows).
--   * fee_alert_subscriptions  — "Anyone can read fee alerts" SELECT public USING (true)
--                                → anon read of email + verify_token + unsubscribe_token.
--   * price_drop_notifications — "Service manage price drops" ALL public USING (true)
--                                → public read/update/delete (latent; empty today).
--
-- Root cause: admin dashboards (app/admin/finance, /revenue, /email-performance) read
-- these tables via the *browser* Supabase client; the permissive policies were the
-- over-broad enabler. Admin identity is the ADMIN_EMAILS allow-list, surfaced in the DB
-- by public.is_admin() (auth.jwt()->>'email' LIKE '%@invest.com.au' OR founder). Re-scoping
-- the reads to is_admin() keeps the dashboards working while denying anon/regular users.
-- Verified post-apply: anon=0, non-admin authenticated=0, admin authenticated=12.
--
-- Idempotent (drops both legacy and new policy names before create). Rollback: re-create
-- the dropped policies with USING (true) — NOT recommended (re-opens the leak).

-- advisor_billing: admin reads all; advisors keep their existing own-row policy.
drop policy if exists "Anyone can read billing" on public.advisor_billing;
drop policy if exists "Admins read all billing" on public.advisor_billing;
create policy "Admins read all billing"
  on public.advisor_billing for select to public
  using (public.is_admin());

-- fee_alert_subscriptions: admin reads all; cron/server paths use the service-role
-- client (RLS-exempt). The anon INSERT policy is unchanged.
drop policy if exists "Anyone can read fee alerts" on public.fee_alert_subscriptions;
drop policy if exists "Admins read all fee alerts" on public.fee_alert_subscriptions;
create policy "Admins read all fee alerts"
  on public.fee_alert_subscriptions for select to public
  using (public.is_admin());

-- price_drop_notifications: was public/USING(true); scope to service_role
-- (matches broker_notifications).
drop policy if exists "Service manage price drops" on public.price_drop_notifications;
create policy "Service manage price drops"
  on public.price_drop_notifications for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
