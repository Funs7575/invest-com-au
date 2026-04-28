# Cron silence alert — runbook + Sentry config

Triggered when `cron_run_log` receives **zero rows in the last hour**. That's the failure mode behind the 04-16 → 04-26 audit P0-1: dispatcher returns 200, individual handlers don't run, no rows land, no alert fires — for 10 days.

This runbook tells you (a) how to set the Sentry rule that emits the alert, and (b) what to do when it fires.

## What fires the alert

`app/api/cron/cron-freshness/route.ts` runs every 20 minutes (per `vercel.json`'s `hourly-20` schedule). At the top of every run it checks:

```sql
SELECT count(*) FROM cron_run_log
WHERE started_at > now() - interval '1 hour';
```

If the count is **0**, the handler emits:

```js
log.error("CRON_GLOBAL_SILENCE: zero rows in cron_run_log for 1h", {
  cron_global_silence: true,
  last_hour_rows: 0,
  check_ran_at: <iso>,
  runbook: "docs/runbooks/cron-silence-alert.md",
});
```

`log.error` from `lib/logger.ts` calls `Sentry.captureMessage(...)` with `level: 'error'`. That's the event the alert rule keys on.

## Sentry alert rule — one-time setup

In Sentry → **Alerts → Create Alert → Issues**:

| Field | Value |
|---|---|
| **When** | An issue is first seen |
| **Filter (any)** | Issue's `message` contains `CRON_GLOBAL_SILENCE` |
| **Action** | Send a notification to → `#alerts-prod` (Slack) |
| **Action** | Send to PagerDuty service `invest-com-au-prod` (escalation: oncall) |
| **Frequency** | Trigger this rule **once every 15 minutes** (avoid pager fatigue while still surfacing each hour the silence persists) |
| **Environment** | `production` |
| **Owner** | Eng lead |

Save with name: **"Cron global silence (P0)"**.

Optional: also create a "warning" tier alert for the per-cron `stale crons detected` warn-level message (existing — fires on individual cron staleness; lower-priority Slack-only).

## When the alert fires

### 1. Confirm the silence is real

Open Supabase SQL editor, run:

```sql
SELECT max(started_at) AS last_run,
       count(*) FILTER (WHERE started_at > now() - interval '1 hour') AS last_hour
FROM cron_run_log;
```

If `last_hour = 0`, silence is real. If it's >0, the alert was a noise burst — close the Sentry issue and move on.

### 2. Check Vercel cron schedule

```
https://vercel.com/finns-projects-2deaa68c/invest-com-au/crons
```

Look for:
- ✅ Schedule entries are present (39 expected per `vercel.json`).
- ✅ Recent invocations under each entry (within the last hour).
- ❌ "Disabled by quota" / "Failed schedule" / "Project paused" badges.

If Vercel shows the schedule paused or disabled — that's an **infra/billing issue** (this exact scenario hit us 04-16 → 04-26). Resolve at the project level (re-enable, settle invoice) and the alert will self-clear within ~20 min as crons resume.

### 3. If Vercel schedule looks healthy but rows still aren't landing

Pull recent runtime logs filtered to `/api/cron/dispatch/*`:

```
https://vercel.com/finns-projects-2deaa68c/invest-com-au/logs?source=serverless&search=/api/cron
```

Expected: 200 every 5 min (every-5m schedule). If you see:
- **401s** → `CRON_SECRET` env var mismatch. Check Vercel project env vs the `proxy.ts` Bearer check.
- **500s** → dispatcher itself crashing. Open a Sentry issue search for `cron-dispatch` ctx.
- **200s but no DB rows** → check `cron_run_log` CHECK constraints (the 04-26 incident traced to `status='success'` violating the constraint). Try a direct INSERT via Supabase MCP:

  ```sql
  INSERT INTO cron_run_log (name, started_at, status, triggered_by)
  VALUES ('runbook-test', now(), 'running', 'admin_manual')
  RETURNING id, status;
  ```

  If that fails, the table is broken (constraint, permissions, RLS) — investigate. If it succeeds, the dispatcher's INSERT path is broken specifically — read the dispatcher source for the latest schema mismatch.

### 4. If individual cron handlers are running but writes fail

Check Sentry for events under the `cron-dispatch` or `cron-run-log` contexts since the silence began. The 04-26 fix (`f0325e8a` on main) added explicit `log.error` on every insert/update failure, so the underlying error message will be in Sentry.

### 5. Mitigation while debugging

If the silence persists >2 hours and the cause isn't obvious, mitigate by:

- **Disable PagerDuty escalation** (not the alert itself) so oncall can sleep — Sentry → Alerts → snooze for 12h.
- **Manually invoke the heartbeat cron** to confirm at least the auth chain works:

  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" \
    https://invest.com.au/api/cron/heartbeat
  ```

  Expect 200 + a row in `cron_run_log` from `triggered_by='cron'`. If that lands but the dispatcher still doesn't, the dispatcher route specifically is broken (per-handler routes work).

### 6. Postmortem

Required if the silence exceeded 4 hours:

- Add the root cause + repro to `docs/audits/2026-04-26-comprehensive-audit.md` close-out log.
- Update this runbook's "When the alert fires" section with the new failure mode.
- Open a P0 follow-up to add a guardrail preventing recurrence (CHECK constraint, integration test, etc.).

## Related

- [`launch-day.md`](launch-day.md) — pre-launch cron health check.
- [`cron-stuck.md`](cron-stuck.md) — single-cron stoppage troubleshooting.
- [`docs/audits/2026-04-26-comprehensive-audit.md`](../audits/2026-04-26-comprehensive-audit.md) §9.1 — original P0-1 finding.
- `app/api/cron/cron-freshness/route.ts` — alert source.
- `app/api/cron/dispatch/[group]/route.ts` — fan-out dispatcher (the part that broke 04-16 → 04-26).
