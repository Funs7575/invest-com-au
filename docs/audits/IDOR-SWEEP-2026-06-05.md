# Multi-role authorization / IDOR sweep — 2026-06-05

Defensive security pass against the live Supabase project (`guggzyqceattncjwvgyc`),
driven by 6 captured authenticated role sessions plus direct PostgREST probing with
the public anon key. Method: static RLS-policy analysis (catches empty-table leaks) +
live `HEAD count=exact` probes (counts only — no PII pulled). Two correctly-scoped
tables that hold data (`professional_leads` 9 rows, `broker_notifications` 45 rows)
returned 0 to anon/individual, validating the probe.

## 🔴 Confirmed live leaks (exploitable now via the public anon key)

| Table | Policy | Exposure | Rows | Verified |
|---|---|---|---:|---|
| `advisor_billing` | `"Anyone can read billing"` SELECT public `USING(true)` | `amount_cents, invoice_number, **stripe_invoice_id, stripe_payment_intent_id**, status, paid_at` | 12 | anon HEAD → `200`, count 12 |
| `fee_alert_subscriptions` | `"Anyone can read fee alerts"` SELECT public `USING(true)` | `email, broker_slugs, verify_token, unsubscribe_token` (PII + action tokens) | 3 | anon HEAD → `200`, count 3 |

`advisor_billing` is the headline: **unauthenticated** read of advisor financial
records incl. Stripe IDs — same class as the original P0, on a table the code-audit missed.

## 🟠 Latent (empty today, dangerous policy)

| Table | Policy | Risk |
|---|---|---|
| `price_drop_notifications` | `"Service manage price drops"` **ALL** public `USING(true)` | public read **and update/delete** of all rows |

## 🟡 By design / needs your call

- `quiz_weights` — public-readable (53 rows). **Intentional and documented**
  (`lib/getmatched/top-match.ts:16` notes `anon SELECT USING(TRUE)`; the quiz reads it).
  Exposes per-broker ranking weights. Left as-is — flag only if you consider the
  weighting methodology commercially sensitive.

## ✅ Confirmed FIXED (prior P0s — no longer leaking)

`broker_wallets`, `wallet_transactions`, `marketplace_invoices` now use
`broker_slug IN (SELECT … WHERE auth_user_id = auth.uid())` scoping (not `USING(true)`).
anon/individual probes returned 0. The earlier wallet/invoice leak is closed.

## Root cause (systemic, worth noting)

Three admin dashboards read privileged tables via the **browser** Supabase client:
- `app/admin/finance/page.tsx` → `advisor_billing`
- `app/admin/revenue/page.tsx` → `advisor_billing`, `broker_wallets`, `professionals.stripe_customer_id`
- `app/admin/email-performance/page.tsx` → `fee_alert_subscriptions`, `quiz_leads`

Because admin identity is the `ADMIN_EMAILS` allow-list (not a JWT role), the quick way
to make browser-client admin reads "work" was permissive `USING(true)` RLS — which also
exposes the data to the whole internet. Note `app/admin/revenue` reads `broker_wallets`
via the browser client, so the #1409 broker-scope fix likely **already returns 0 there** —
the admin revenue page's wallet figures may be silently empty. The durable fix is to move
these admin reads server-side (service-role API routes); the migration below is the
minimal, non-breaking stopgap.

## Remediation

`supabase/migrations/20260831000000_fix_public_read_rls_leaks.sql` — replaces the two
`USING(true)` public SELECT policies with `USING(public.is_admin())` (closes anon access,
keeps admin dashboards working, advisors keep their own-row policy), and re-scopes
`price_drop_notifications` to `service_role`. Reversible; passes the RLS-isolation intent.

**Follow-up (not in this migration):** move the three admin dashboard reads to server-side
service-role routes, then audit `app/admin/*` for any other browser-client reads of
privileged tables.
