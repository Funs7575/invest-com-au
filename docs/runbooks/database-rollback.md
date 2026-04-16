# Database rollback procedure

Migrations apply forward only. We don't ship "down" migrations because
they create false confidence — most schema changes can't be cleanly
reversed in production. Instead, we follow this discipline.

## When something goes wrong, in order of preference

### 1. Forward-fix migration (preferred)

Most issues are recoverable with another migration. Examples:

- Column added with wrong type → ALTER TABLE to fix the type
- Index missing → add a new migration that creates it
- Bad seed data → add a migration that deletes it (with `WHERE` clauses
  scoped to the bad rows)

Ship a new migration. Never edit an applied migration file.

### 2. Disable the new feature in code

If a migration shipped a new column that's broken, deploy code that
ignores that column. Buys time without rolling back schema.

### 3. Manual rollback via the rollback comment

Every migration must include a top-of-file comment documenting how
to manually roll back. Example:

```sql
-- ROLLBACK STRATEGY:
-- 1. DROP POLICY "forum_threads_public_read" ON public.forum_threads;
-- 2. ALTER TABLE public.forum_threads DISABLE ROW LEVEL SECURITY;
-- 3. DROP INDEX IF EXISTS idx_forum_threads_author;
```

Run those statements in the Supabase SQL editor. Always wrap
destructive ops in a transaction:

```sql
BEGIN;
-- rollback statements here
-- verify with a SELECT count(*) or pg_indexes
COMMIT;
-- (or ROLLBACK if anything looks wrong)
```

### 4. Point-in-time restore (last resort)

See [launch-rollback.md](launch-rollback.md) — "Database point-in-time
restore". This wipes all data changes since the restore point, so
only use it for genuine data corruption.

## Idempotency requirements

Every migration must be idempotent. If `npm run db:migrate` is run
twice, the second run must be a no-op. Patterns:

```sql
CREATE TABLE IF NOT EXISTS public.foo (...)
ALTER TABLE public.foo ADD COLUMN IF NOT EXISTS bar TEXT;
CREATE INDEX IF NOT EXISTS idx_foo_bar ON public.foo (bar);

-- For policies, drop+recreate is safer than IF NOT EXISTS
DROP POLICY IF EXISTS "foo_public_read" ON public.foo;
CREATE POLICY "foo_public_read" ON public.foo FOR SELECT USING (true);

-- For seed data, use ON CONFLICT
INSERT INTO public.foo (slug, name) VALUES ('bar', 'Bar')
  ON CONFLICT (slug) DO NOTHING;
```

## Pre-flight checks before applying a migration in production

1. Migration ran successfully on a Supabase branch (PR preview env).
2. Migration is idempotent (re-run on the branch, expect no errors,
   no row count delta).
3. Estimated runtime acceptable for production data volume. Anything
   over 30 seconds needs a maintenance window.
4. ROLLBACK STRATEGY comment present.
5. New tables holding user data have RLS + policies.
6. CI is green on the PR.

## After applying a migration in production

1. Watch `/api/health` for 5 minutes — DB latency should be unchanged.
2. Spot-check a query that touches the changed table.
3. Verify `pg_stat_statements` doesn't show new sequential scans on
   high-traffic tables (often indicates a missing index).
4. If the migration added an index on a hot table, watch
   query latency in Supabase observability for at least 1 hour.

## Automated migration application

Migrations are applied to production via `/api/admin/run-migration`,
triggered by Vercel cron every 6 hours. The endpoint:

1. Reads `supabase/migrations/*.sql` from the deployed bundle.
2. Compares against `applied_migrations` table.
3. Applies new migrations in lexical order.
4. Records each applied migration with timestamp + sha.

If a migration fails, the cron logs the error and stops — subsequent
migrations are not applied. Manual intervention required.
