# <Runbook title>

## What just fired

One sentence. The user-visible symptom, not the mechanism.

## Impact

- Who: which user segment is affected
- What they see: the specific broken experience
- Revenue/compliance impact: any $/regulatory exposure

## Diagnosis

Ordered checks. Each one should be a one-liner you can run.

1. `git log -5 --oneline main` — was there a recent deploy?
2. Open `/admin/automation` — which feature tile is red?
3. `select * from cron_run_log where name = 'X' order by started_at desc limit 5` — are recent runs ok?
4. ...

## Mitigations

Fastest way to stop the bleeding, even if diagnosis is incomplete.

- Flip the kill switch: `/admin/automation/kill-switch` → toggle `<feature>`
- Increase the rate limit for `<endpoint>` in `rate_limit_buckets`
- Roll back the most recent deploy (see below)

## Rollback

```bash
# Find the last known good deploy
git log --oneline main
# Revert
git revert <sha>
git push origin main
# OR via Vercel CLI
vercel rollback
```

## Recovery

Once mitigated, restore full service:

1. Remove kill switch / rate limit override
2. Backfill any work that was skipped (see the specific cron
   docs for idempotency guarantees)
3. Verify in the admin dashboard

## Post-incident

- Update `slo_incidents.notes` with a short timeline
- Mark `slo_incidents.resolved_at`
- Schedule a post-mortem if:
  - Customer-visible impact > 10 minutes
  - Revenue impact > $1k
  - Any compliance-affecting event
- File a follow-up ticket for any underlying cause the fix didn't address
