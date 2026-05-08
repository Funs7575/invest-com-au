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

## Runbook inventory

### Infrastructure & database

- [`supabase-slow.md`](./supabase-slow.md) — database latency p95
  above SLO; admin pages timing out
- [`read-replica-failure.md`](./read-replica-failure.md) — read
  replica is lagging or unavailable
- [`database-rollback.md`](./database-rollback.md) — how to roll back
  a migration or restore from a snapshot
- [`pitr-restore-drill.md`](./pitr-restore-drill.md) — point-in-time
  recovery drill and validation steps

### Scheduled jobs (cron)

- [`cron-stuck.md`](./cron-stuck.md) — a scheduled job hasn't
  run or hasn't completed successfully within its expected window
- [`cron-silence-alert.md`](./cron-silence-alert.md) — the cron
  heartbeat went silent; no run recorded in the expected window

### Payments & Stripe

- [`stripe-webhook-stuck.md`](./stripe-webhook-stuck.md) —
  Stripe events aren't being processed (`processing` rows piling
  up in `stripe_webhook_events`)
- [`stripe-webhook-backlog.md`](./stripe-webhook-backlog.md) —
  webhook queue depth is above threshold; events are queued but
  processing is slower than ingest
- [`stripe-account-recovery.md`](./stripe-account-recovery.md) —
  Stripe account is restricted or suspended; payouts paused

### Email

- [`resend-rate-limited.md`](./resend-rate-limited.md) — Resend
  is returning 429s and drip / transactional emails are failing
- [`resend-account-recovery.md`](./resend-account-recovery.md) —
  Resend account suspended or domain reputation damaged
- [`email-deliverability.md`](./email-deliverability.md) — elevated
  bounce / spam rates; SPF / DKIM / DMARC failures
- [`notification-inbox-empty.md`](./notification-inbox-empty.md) —
  notification inbox shows no items when items are expected

### Security & compliance

- [`breach-notification.md`](./breach-notification.md) — suspected or
  confirmed data breach; NDB/GDPR notification obligations and
  30-day assessment clock
- [`security-breach-git.md`](./security-breach-git.md) — secrets
  committed to git; credential rotation and audit steps
- [`acl-revocation.md`](./acl-revocation.md) — revoking access for a
  departing team member or compromised credential
- [`secret-rotation.md`](./secret-rotation.md) — rotating API keys
  and secrets across services (Supabase, Stripe, Resend, Vercel)
- [`secret-rotation-log.md`](./secret-rotation-log.md) — permanent
  log of completed secret rotations (append-only)
- [`regulatory-data-request.md`](./regulatory-data-request.md) —
  responding to a regulator (ASIC, OAIC, ATO) data request
- [`dsar.md`](./dsar.md) — Data Subject Access Request (APP 12 /
  GDPR Article 15) — what to provide and by when
- [`tmd-coverage-gap.md`](./tmd-coverage-gap.md) — Target Market
  Determination gap identified in a compliance review

### SLO & observability

- [`slo-breach.md`](./slo-breach.md) — the SLO monitor opened
  a new incident; use this as a starting point then branch to
  the service-specific runbook

### Advisors & marketplace

- [`advisor-kyc-stuck.md`](./advisor-kyc-stuck.md) — an advisor's
  KYC verification is stuck in pending or failed state

### Content & editorial

- [`article-cover-image-backfill.md`](./article-cover-image-backfill.md)
  — batch-backfilling missing cover images on articles
- [`calculator-reference-tests.md`](./calculator-reference-tests.md) —
  calculator reference test suite: how to run and interpret failures
- [`commodity-news-brief-stuck-draft.md`](./commodity-news-brief-stuck-draft.md)
  — commodity news brief is stuck in draft; manual unblock steps

### Launch operations

- [`launch-day.md`](./launch-day.md) — go-live day checklist and
  order of operations
- [`launch-rollback.md`](./launch-rollback.md) — rolling back the
  launch if a critical issue is found within the first 24 hours

### Month-end & finance ops

- [`month-end-close-failed.md`](./month-end-close-failed.md) —
  month-end close cron failed; manual reconciliation steps

### Vercel & hosting

- [`vercel-team-recovery.md`](./vercel-team-recovery.md) — Vercel
  team account is locked or billing has lapsed

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

## Gap register (OOO-01 audit — 2026-05-08)

The following runbooks are planned but not yet written.
Each becomes a queue item in the OOO stream.

| Missing | Why needed | Queue item |
|---------|-----------|------------|
| `incident-severity.md` | No general severity matrix; only breach-notification.md has one (P0-P3, breach-specific). On-call needs a single source of truth for triage. | OOO-02 |
| `on-call-rotation.md` | breach-notification.md instructs "page the on-call engineer" but no runbook defines who that is, the rotation schedule, or the escalation path. | OOO-03 |
