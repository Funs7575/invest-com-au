# Read replica failure

## What just fired

The Supabase read replica is unreachable, returning stale data, or
lagging too far behind the primary. Symptoms: slow read queries on
analytics and listing pages, connection pool exhaustion, or the
Supabase dashboard showing replica lag > 30 seconds.

## Impact

- **Who:** All visitors hitting cached or real-time listing reads.
- **What breaks:** `createClient()` server reads that route to the
  replica (if configured). Admin queries using `createAdminClient()`
  fall back to the primary — no impact there.
- **Revenue exposure:** Stale reads may serve outdated broker/advisor
  listings, pricing, or review scores. Unlikely to cause direct
  revenue loss but can degrade user trust.

## Diagnosis

1. Check Supabase dashboard → **Monitoring** → **Replication** for
   replica lag. Lag > 30 s or status "disconnected" confirms the
   issue.
2. Check [Supabase status](https://status.supabase.com) — confirm
   this is project-specific, not a platform outage.
3. Attempt a direct query against the replica connection string in
   Supabase SQL editor. If it times out, the replica host is down.
4. Look at Vercel function logs for `getaddrinfo ENOTFOUND` or
   `connection refused` errors pointing to the replica host.
5. Check `cron_run_log` — if cron jobs that touch the replica are
   erroring, they'll log the DB error there.

## Mitigations

### Replica lag (behind but reachable)

Replica lag usually resolves within minutes after a write burst.
No action needed unless lag exceeds 5 minutes.

If it exceeds 5 minutes:

1. In Supabase dashboard → **Replication** → **Replicas**, click the
   replica and check the WAL sender status.
2. If WAL streaming is paused, click **Resume** (Supabase Pro).
3. If a long-running query on the primary is blocking WAL progress,
   identify and cancel it:

   ```sql
   SELECT pid, query, now() - pg_stat_activity.query_start AS duration
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '1 minute'
   ORDER BY duration DESC;

   -- Cancel the blocking query:
   SELECT pg_cancel_backend(<pid>);
   ```

### Replica unreachable / connection errors

1. Route all reads back to the primary immediately — update the
   `SUPABASE_URL` env var in Vercel to the primary URL (remove any
   replica-specific URL override).
2. Trigger a Vercel redeploy to pick up the env change.
3. Monitor `/api/health` — it should return 200 within 2 minutes
   of the redeploy completing.
4. Open a Supabase support ticket if the replica has not recovered
   within 30 minutes.

### Connection pool exhaustion (pgBouncer full)

1. Check Supabase dashboard → **Database** → **Connection pooling**
   for active connections vs. pool size.
2. If pool is saturated, identify which Vercel functions hold
   long-lived connections (usually async functions that `await`
   after the Supabase call):

   ```sql
   SELECT client_addr, count(*) AS conns
   FROM pg_stat_activity
   GROUP BY client_addr ORDER BY conns DESC;
   ```

3. Increase pool size in Supabase dashboard (requires plan upgrade)
   or add `?pgbouncer=true` to the connection string and reduce
   `max_connections` in the client config.

## Recovery

1. Confirm replica lag is back to < 5 s in Supabase monitoring.
2. If the primary URL was substituted in step 2 above, restore the
   replica URL in Vercel and redeploy.
3. Run a few read queries in the SQL editor against the replica to
   confirm data is current.
4. Check `cron_run_log` — any cron jobs that errored during the
   outage may need manual re-runs (see `cron-stuck.md`).

## Post-incident

- Record the incident duration and lag peak in `slo_incidents`.
- If lag exceeded 5 minutes, file a follow-up to add a Supabase
  metric alert for replica_lag > 60 s (OBS-03 tracker).
- Review whether any queries routed through the replica that should
  use the primary (e.g., writes immediately followed by a read of
  the same row — use a transaction on the primary instead).
- Update `docs/runbooks/secret-rotation.md` if any connection
  strings were changed.
