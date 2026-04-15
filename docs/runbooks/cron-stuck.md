# Cron stuck

## What just fired

A scheduled cron job hasn't successfully run inside its expected
window. Usually fires from SLO name `cron_<name>_freshness` or the
admin automation dashboard shows a red tile.

## Impact

Depends on the cron:

- `auto-resolve-disputes` — new disputes pile up in the pending
  queue, advisors wait longer for refunds (revenue trust)
- `lead-quality-weights` — the ranker is running on yesterday's
  model. Low direct impact for a day.
- `property-suburb-refresh` — suburb data is stale. Low impact.
- `abandoned-form-drip` — recovery emails don't send. One day
  late is fine, multi-day is recoverable.
- `embeddings-refresh` — semantic search results use the last
  indexed version. Low impact short term.
- `slo-monitor` — **self-silencing** — if this is stuck, no
  other alerts will fire. High priority.

## Diagnosis

1. Open `/admin/automation` — find the red tile.
2. Click the cron name → drill-down shows `last_run`,
   `status`, `error_message`, and per-run stats.
3. If `status = running` older than 5 minutes → the run is
   hanging. Check Vercel cron logs for that invocation.
4. If `status = error` with a stack trace → read the error,
   decide whether it's code or data.
5. If `last_run` is > 2× cadence old but no error row → Vercel
   didn't dispatch the cron. Check `vercel.json` schedule and
   the Vercel dashboard cron list.

## Mitigations

- **Manual trigger from the dashboard**: click the "Run now" button
  on the drill-down. This fires the cron with the `x-admin-manual`
  header so the run is tagged separately from scheduled runs.
- **Kill switch**: if the cron is failing on bad data, flip the
  matching feature kill switch at `/admin/automation/kill-switch`
  so new work is skipped while you investigate.
- **Raise max duration**: if the cron is timing out (Vercel logs
  show 5xx), bump `maxDuration` in the route file and redeploy.

## Rollback

If a recent deploy caused it, `vercel rollback` to the last
successful deploy. Confirm the cron rows in `cron_run_log` return
to `status = ok` within one cadence.

## Recovery

- Remove the kill switch
- Run the cron manually once to confirm it's recovering
- Monitor the admin dashboard for one more cadence cycle
- Resolve the SLO incident at `/admin/automation/slo` (or via
  SQL) so on-call isn't paged twice

## Post-incident

Timeline and fix notes in `slo_incidents.notes`. If the root
cause was a schema change that broke a query, file a ticket to
add a migration test that catches the same pattern.
