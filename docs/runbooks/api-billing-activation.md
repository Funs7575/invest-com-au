# API billing — activation runbook

> Status as verified against prod on **2026-06-11**: the schema is **applied**
> (ledger versions `20260610155721/155736/155745/155755` from PR #1529 are in
> `supabase_migrations.schema_migrations`; `api_key_subscriptions` exists and
> `api_keys` has all four billing columns). Zero API keys / webhooks exist yet.
> The remaining activation steps are Stripe-side + env vars — **no DB work**.

The revenue line: tiered public API (`/api/v1/*`) with self-serve Stripe
upgrade (free → basic A$49/mo → pro A$149/mo) and signed consumer webhooks.
FIN_NOTEBOOK 2026-06-10 ("API billing is half-shipped") tracks the history.

## Activation steps (founder)

1. **Create the two Stripe Prices** (live mode, account `acct_1TChUWPHuq84hGCT`):
   one product "invest.com.au API", two recurring monthly AUD prices —
   A$49 (basic) and A$149 (pro).
2. **Set env vars on the deploy host** (Netlify mirror today; Vercel post-unpark):
   - `STRIPE_API_BASIC_PRICE_ID=price_…`
   - `STRIPE_API_PRO_PRICE_ID=price_…`
   - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (already set if consumer Pro billing works)
3. **Confirm the Stripe webhook endpoint** subscribes to
   `customer.subscription.created/updated/deleted` (handler:
   `lib/stripe-webhook/handlers/api-key-subscription.ts`, dispatched from the
   existing `/api/stripe/webhook` route).
4. **Run the preflight** (read-only, exits 0 when ready):
   ```bash
   npx tsx --env-file=.env.local scripts/api-billing-preflight.ts
   ```
5. **Smoke test**: mint a key (`POST /api/v1/api-keys`), create a checkout
   session (`POST /api/v1/billing/checkout` with `{"plan":"api_basic"}`),
   complete it with a Stripe test card, then `GET /api/v1/usage` and confirm
   `tier: "basic"`.

## Kill switch

`automation_kill_switches` row `feature='api_billing', disabled=true` makes
`POST /api/v1/billing/checkout` return 503 immediately (30s cache) — no
redeploy. Existing subscriptions and webhook processing are unaffected.
Absent row = live (fail-open).

## Standing jobs

- `/api/cron/reset-api-monthly-usage` (monthly-1-3 group) zeroes
  `api_keys.requests_this_month` and stamps `billing_period_start` on the 1st.
  Without it the usage endpoint's monthly figure never resets.
- `/api/cron/retry-consumer-webhooks` (every-30m) re-attempts failed
  deliveries. It now **fails loudly** (cron_run_log status=error) when the
  delivery table can't be read — the previous silent all-zero stats hid the
  unapplied-schema state for weeks.
- Both depend on the cron fleet actually firing — see the cron-fleet
  restoration note in `docs/runbooks/cutover.md` §monitoring and the
  external `cron-watchdog.yml` workflow.

## Known limitations (accepted at activation)

- `api_key_subscriptions.status` never transitions to `past_due` —
  `invoice.payment_failed` is not wired; Stripe dunning emails are the
  safety net until it is.
- Webhooks registered before migration `20260610155755` would have a NULL
  `signing_secret` and are skipped at dispatch (logged). Prod has zero
  pre-migration rows, so this is moot unless rows are hand-inserted.
