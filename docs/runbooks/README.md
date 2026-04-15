# Runbooks

Playbooks for the on-call engineer. One markdown file per alert or
critical service. When you get paged, open the runbook with the
matching name in the alert title and follow the steps.

## Naming convention

```
docs/runbooks/<service>-<problem>.md
```

Every runbook MUST have these sections (the template helps):

1. **What just fired** — one sentence describing the alert
2. **Impact** — who sees what when this is broken
3. **Diagnosis** — ordered steps to identify the root cause
4. **Mitigations** — the fastest way to stop the bleeding,
   even if the root cause is unclear
5. **Rollback** — how to undo if a deploy caused the incident
6. **Recovery** — how to restore full service once mitigated
7. **Post-incident** — what to write up, what to schedule, who
   to notify

## Current runbooks

- [`cron-stuck.md`](./cron-stuck.md) — a scheduled job hasn't
  run or hasn't completed successfully within its expected window
- [`stripe-webhook-stuck.md`](./stripe-webhook-stuck.md) —
  Stripe events aren't being processed (`processing` rows piling
  up in `stripe_webhook_events`)
- [`resend-rate-limited.md`](./resend-rate-limited.md) — Resend
  is returning 429s and drip / transactional emails are failing
- [`supabase-slow.md`](./supabase-slow.md) — database latency
  p95 above SLO and admin pages are timing out
- [`slo-breach.md`](./slo-breach.md) — the SLO monitor opened
  a new incident; use this as a starting point then branch to
  the service-specific runbook

## Template

Copy `TEMPLATE.md` when adding a new runbook:

```bash
cp docs/runbooks/TEMPLATE.md docs/runbooks/my-service-issue.md
```

## Principles

- **Mitigate first, diagnose second** — stop the bleeding
  before you understand everything
- **Kill switches are a mitigation, not a fix** — flipping one
  buys you time, it doesn't close the ticket
- **Annotate what you tried** — add a note to the incident row
  (`slo_incidents.notes`) so post-incident review has the data
- **Escalate early** — if you're 15 minutes in with no
  progress, page the next person in the rotation
