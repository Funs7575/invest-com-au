# Stripe webhook stuck

## What just fired

Stripe webhook events are piling up in the `processing` state in
`stripe_webhook_events`. Either the handler is failing, Stripe is
retrying a bad event, or the idempotency loop has a bug.

## Impact

Live. Advisor credit top-ups may be missing, Pro welcome emails
undelivered, dispute refunds in limbo. Revenue-critical.

## Diagnosis

```sql
-- Rows stuck in 'processing' older than 5 minutes
SELECT event_id, event_type, started_at, status
FROM stripe_webhook_events
WHERE status = 'processing' AND started_at < now() - interval '5 minutes'
ORDER BY started_at ASC
LIMIT 20;

-- Most recent errors
SELECT event_id, event_type, started_at
FROM stripe_webhook_events
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 20;
```

Then:

1. Check Sentry for the webhook handler — look for recent
   uncaught errors tagged `stripe-webhook`.
2. Open Stripe dashboard → Webhooks → the endpoint → see the
   failed delivery queue. Compare event IDs against the rows.
3. If one specific event is poisoning the queue, note the
   event_id and skip it explicitly.

## Mitigations

- **Re-drive stale rows**: the handler already re-takes any
  processing row older than 5 minutes on Stripe's retry. If
  Stripe stopped retrying, you can nudge it from the Stripe
  dashboard → "Resend" on the event.
- **Skip a poison event**: mark the row as error so the rest of
  the queue proceeds.
  ```sql
  UPDATE stripe_webhook_events
  SET status = 'error', completed_at = now()
  WHERE event_id = '<evt_id>';
  ```
- **Never** delete rows from `stripe_webhook_events` — the PK
  uniqueness is what keeps idempotency working.

## Rollback

If a recent deploy broke the webhook handler, `vercel rollback`.
The handler is append-only so rolling back is safe.

## Recovery

- Stripe will retry the failed events automatically for up to
  3 days (standard exponential backoff)
- For anything outside that window, re-drive from the Stripe
  dashboard
- Run the monthly AFSL report to confirm refunds landed

## Post-incident

- Timeline in `slo_incidents.notes`
- If the root cause was a schema mismatch, add a test that
  constructs the specific event type with a fixture
- If the idempotency loop was at fault, update the test in
  `__tests__/api/stripe-webhook.test.ts`
