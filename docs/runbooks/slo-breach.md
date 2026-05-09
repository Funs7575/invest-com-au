# slo-breach — SLO monitor opened a new incident

## What just fired

The SLO monitoring cron (or Sentry alert) has recorded an SLO breach:
availability, latency p95, or error rate has exceeded the threshold
recorded in `slo_definitions`. A row now exists in `slo_incidents`
with `status = 'open'`.

## Impact

Depends on the SLO that breached. Start here, then jump to the
service-specific runbook for the affected component.

| SLO | Threshold | Branch to |
|-----|-----------|-----------|
| API availability | < 99.9% over 5 min | [`supabase-slow.md`](./supabase-slow.md) or Vercel status |
| Database latency p95 | > 200 ms (admin) / 500 ms (user) | [`supabase-slow.md`](./supabase-slow.md) |
| Stripe webhook processing | > 5 min lag | [`stripe-webhook-stuck.md`](./stripe-webhook-stuck.md) |
| Resend delivery | > 5% bounce rate | [`email-deliverability.md`](./email-deliverability.md) |
| Cron job | missed window | [`cron-stuck.md`](./cron-stuck.md) |

## Diagnosis

### 1. Identify the breaching SLO

```sql
SELECT
  d.name,
  d.metric,
  d.threshold,
  i.started_at,
  i.notes
FROM slo_incidents i
JOIN slo_definitions d ON d.id = i.slo_id
WHERE i.status = 'open'
ORDER BY i.started_at DESC
LIMIT 10;
```

### 2. Check for a recent deploy

```bash
# Was there a deploy in the 30 minutes before the incident?
# Check Vercel dashboard → Deployments
```

A deploy correlating with the breach is the first thing to rule out.
If yes: consider rollback (see [`launch-rollback.md`](./launch-rollback.md)).

### 3. Check external status pages

- **Vercel:** https://www.vercel-status.com
- **Supabase:** https://status.supabase.com
- **Stripe:** https://status.stripe.com
- **Resend:** https://status.resend.com

If a vendor is down, the incident is external. Note it in
`slo_incidents.notes` and escalate to the vendor.

### 4. Check Sentry error volume

Look for a spike in error events in the relevant time window.
A sudden error spike usually means a code regression.

## Mitigations

The mitigation depends entirely on which service breached the SLO.
Jump to the appropriate runbook from the table above.

**Universal first step:** annotate the incident while you investigate
so post-incident review has a timeline:

```sql
UPDATE slo_incidents
SET notes = notes || E'\n' || NOW()::text || ': <what you found>'
WHERE status = 'open'
ORDER BY started_at DESC
LIMIT 1;
```

## Rollback

If a deploy caused the SLO breach:

1. Identify the commit that caused it (correlate deploy timestamp with
   breach start in `slo_incidents`).
2. Roll back in Vercel: Deployments → select the previous good deploy
   → Redeploy.
3. If the regression is in a DB migration, see
   [`database-rollback.md`](./database-rollback.md).

## Recovery

Once the root cause is mitigated and the metric is back within
threshold, close the incident:

```sql
UPDATE slo_incidents
SET
  status = 'resolved',
  resolved_at = NOW(),
  notes = notes || E'\n' || NOW()::text || ': resolved — <one-line summary>'
WHERE status = 'open'
ORDER BY started_at DESC
LIMIT 1;
```

Monitor the metric for 15 minutes after resolution before declaring
the incident closed.

## Post-incident

- [ ] Write a blameless post-mortem in `docs/post-mortems/YYYY-MM-DD.md`
- [ ] Update the relevant service runbook if any step was missing
- [ ] If the SLO threshold is wrong (too tight / too loose), adjust in
      `slo_definitions` with a comment explaining the change
- [ ] File follow-up tickets for any action items

## See also

- [`supabase-slow.md`](./supabase-slow.md)
- [`cron-stuck.md`](./cron-stuck.md)
- [`stripe-webhook-stuck.md`](./stripe-webhook-stuck.md)
- [`email-deliverability.md`](./email-deliverability.md)
