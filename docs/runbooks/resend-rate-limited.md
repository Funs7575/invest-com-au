# Resend rate-limited

## What just fired

Resend is returning 429s and outbound email isn't sending. This
usually shows up as:

- Drip crons logging `resend send failed` in Sentry
- Privacy verification links not reaching users
- Stripe welcome emails missing

## Impact

No critical outbound email is delivered. User-visible workflows
(password reset, privacy verify) are broken. Medium-severe —
users can still browse the site but lose trust.

## Diagnosis

1. Check Resend dashboard — hit the status page + account-level
   sending limits
2. `select count(*) from cron_run_log where name ilike '%drip%' and status = 'error' and started_at > now() - interval '1 hour';`
3. Any recent spike in outbound volume (e.g. a broadcast cron
   firing at the same time as the usual drips)?

## Mitigations

- **Slow everything down**: enable the `email_throttle` feature
  flag (Wave 7) to reduce drip fan-out to 10% rollout while you
  investigate
- **Kill switch drips**: flip `abandoned_form_drip`, `winback_drip`,
  `advisor_dormant_nudge` at `/admin/automation/kill-switch` —
  these are non-critical and can resume tomorrow
- **Leave transactional emails on**: Stripe webhook, privacy
  verify, and password reset should stay enabled. If they're also
  429'ing, escalate to Resend support

## Rollback

No deploy usually — this is an upstream / quota issue. If a
recent change added a new drip or email volume, revert that PR.

## Recovery

- Once Resend recovers, un-flip the kill switches in the reverse
  order (most important first)
- Back-fill is unnecessary for the one-dose drips — users who
  didn't get the 2-day abandoned-quiz email will see the 7-day
  one instead

## Post-incident

- Note the peak 429 rate in the incident log
- Consider whether to raise the Resend tier or spread the drip
  cron schedules to avoid bursts at the top of the hour
