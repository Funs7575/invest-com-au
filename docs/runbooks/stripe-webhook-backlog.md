# Stripe webhook backlog

## What just fired

The Stripe webhook endpoint (`/api/webhooks/stripe`) has been
returning 4xx/5xx errors, causing Stripe to queue a backlog of
undelivered events. Stripe retries failed events for up to **72 hours**
on an exponential back-off schedule. After that, events are lost
from automatic delivery.

## Impact

- **Who:** Customers mid-checkout or on subscription plans.
- **What breaks:** Subscription activations, cancellations, invoice
  payments, and payout events not processed. New advisors who paid
  won't be activated until the backlog clears.
- **Revenue exposure:** Subscriptions stuck in "pending" state;
  payouts not triggered; failed-payment dunning not sent. Disputes
  not auto-resolved. Each event type has its own downstream
  consequence — see the handler registry in
  `lib/stripe-webhook/registry.ts`.

## Diagnosis

1. In Stripe dashboard → **Developers** → **Webhooks** → click your
   endpoint → **Webhook attempts** tab. Look for events with
   "Failed" status.
2. Note the failure window: when did the first failure occur? When
   did deliveries resume?
3. Check the failure response codes:
   - `401` / `403` — `STRIPE_WEBHOOK_SECRET` mismatch or revoked.
   - `500` — application error (check Vercel function logs / Sentry).
   - `503` / timeout — Vercel function was cold-starting or over
     the 60-second `maxDuration`.
4. Check Vercel function logs for `/api/webhooks/stripe` in the
   failure window — look for the root cause.

## Mitigations

### Endpoint now healthy — replay the backlog

Stripe's retry schedule covers most events automatically, but for
events older than 72 hours (or if you want to clear the backlog
immediately):

**Option A — Stripe dashboard replay (UI, up to ~100 events)**

1. In Stripe dashboard → Developers → Webhooks → Webhook attempts.
2. Filter by "Failed". Click each event → "Resend".
3. Watch the real-time attempt response to confirm 200.

**Option B — Stripe CLI batch replay**

```bash
# List failed events in a window (replace timestamps as needed)
stripe events list \
  --created[gte]=<unix-timestamp-start> \
  --created[lte]=<unix-timestamp-end> \
  --limit 100

# Resend a specific event
stripe events resend <evt_xxx>

# Batch resend (requires jq):
stripe events list --limit 100 -D created[gte]=<ts> | \
  jq -r '.data[].id' | \
  xargs -I{} stripe events resend {}
```

**Option C — Stripe webhook log query (compensate in-app)**

If the window exceeds 72 hours and events are permanently lost,
query `stripe_webhook_events` table to find the gap, then use the
Stripe API to fetch the current subscription/payment state and
reconcile:

```sql
-- Find the gap in processed events
SELECT created_at, event_type, stripe_event_id
FROM stripe_webhook_events
WHERE created_at > now() - interval '4 days'
ORDER BY created_at;
```

Then for each affected customer, call `stripe.subscriptions.retrieve`
or `stripe.charges.retrieve` and compare against `subscriptions` /
`orders` in your DB. Update to match.

### Webhook secret mismatch

If the root cause is a rotated `STRIPE_WEBHOOK_SECRET`:

1. In Stripe dashboard → Developers → Webhooks → endpoint →
   **Signing secret** → click "Roll".
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel env → redeploy.
3. See `secret-rotation.md` for the zero-downtime rotation pattern
   (accept both old and new secrets during the transition window).

### Endpoint returning 500 (app error)

1. Identify the error from Vercel logs or Sentry.
2. Deploy a fix. The fix must be idempotent — webhook handlers
   already run in the `job_queue` with at-least-once semantics.
3. After the fix is deployed, replay the backlog using Option A/B
   above. Duplicate events are safe — the idempotency key
   (`stripe_event_id`) in `stripe_webhook_events` prevents double
   processing.

## Recovery

1. Confirm the endpoint returns 200 for a test event:
   `stripe trigger payment_intent.succeeded`
2. In Stripe dashboard → Webhook attempts — all recent attempts
   should show 200.
3. Query `stripe_webhook_events` and compare against Stripe's event
   list for the failure window to confirm no events were permanently
   lost.
4. For any permanently lost subscription events (> 72 h old),
   manually reconcile affected subscriptions using the Stripe API.
5. Notify any affected customers of delays if subscriptions were
   stuck for > 24 h.

## Post-incident

- Add or update the Stripe webhook 95% success rate alert (OBS-04
  tracker item) so this fires earlier next time.
- Review `maxDuration = 60` on the webhook handler — if timeouts
  caused the failure, consider offloading heavy processing to the
  `job_queue` worker instead of running synchronously.
- Document any compensating queries run in the `slo_incidents`
  table with `event_type = 'webhook-backlog'`.
