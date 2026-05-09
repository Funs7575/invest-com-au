# supabase-slow — Database latency above SLO

## What just fired

Supabase database latency p95 is above the SLO threshold (200 ms for
admin queries, 500 ms for user-facing queries), or admin pages are
timing out.

## Impact

- Admin panel: timeouts on `/admin/*` pages (advisor moderation, review
  queue, feature flags)
- User-facing: slow broker listing pages (ISR serves cached content, so
  direct user impact is usually lower unless cache is cold)
- Cron jobs: risk of timeout if queries inside cron exceed statement
  timeout

## Diagnosis

### 1. Check the Supabase dashboard

```
Supabase → Project → Reports → Database
```

Look at: query latency p95, connection count, CPU %, disk I/O.

### 2. Identify slow queries

```sql
-- Top queries by total time in the last 5 minutes
SELECT
  query,
  calls,
  total_exec_time / calls AS avg_ms,
  total_exec_time,
  rows
FROM pg_stat_statements
WHERE total_exec_time / calls > 100  -- avg > 100ms
ORDER BY total_exec_time DESC
LIMIT 20;
```

### 3. Check active connections

```sql
SELECT
  state,
  wait_event_type,
  wait_event,
  count(*)
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY 1, 2, 3
ORDER BY count DESC;
```

A large number of `idle in transaction` connections indicates a
connection leak. `Lock` wait events indicate lock contention.

### 4. Check for lock contention

```sql
SELECT
  blocked.pid,
  blocked_activity.query AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked.pid
JOIN pg_catalog.pg_locks blocking ON blocking.relation = blocked.relation
  AND blocking.locktype = blocked.locktype
  AND NOT blocking.granted = blocked.granted
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking.pid
WHERE NOT blocked.granted;
```

## Mitigations

### Kill a runaway query

```sql
SELECT pg_terminate_backend(<pid>);
```

Find the pid from `pg_stat_activity` — look for long-running queries
with `query_start` > 60 s ago.

### Kill all idle-in-transaction connections

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND state_change < NOW() - INTERVAL '5 minutes';
```

### Enable connection pooling (if pool is exhausted)

Supabase → Settings → Database → Connection pooling. Switch to
**Transaction mode** (port 6543) for stateless route handlers if
not already enabled. Session mode (port 5432) reserves a connection
for the session lifetime.

## Rollback

If a recent deploy introduced a slow query:

1. Check `git log --oneline -5` on `main` for recent migrations.
2. A slow new query usually means a missing index. Add it with
   `CREATE INDEX CONCURRENTLY` (non-blocking).
3. If the migration is the cause and cannot be mitigated with an
   index, see [`database-rollback.md`](./database-rollback.md).

## Recovery

1. Once the slow query is terminated / index added, verify p95 drops
   below threshold in Supabase Reports.
2. Check the admin panel is responding within 2 s.
3. Monitor for 15 minutes before closing the incident.

## Post-incident

- [ ] Add `EXPLAIN ANALYZE` output to the post-mortem
- [ ] Consider adding the query to `pg_stat_statements` monitoring
      in SLO definitions (`slo_incidents`)
- [ ] If a missing index was the cause, add a migration to create it
      permanently

## See also

- [`database-rollback.md`](./database-rollback.md)
- [`read-replica-failure.md`](./read-replica-failure.md)
- [`slo-breach.md`](./slo-breach.md)
