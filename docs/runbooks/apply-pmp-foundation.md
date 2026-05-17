# Runbook: Apply Pro Marketplace foundation migration to prod

**Status:** Pending — blocks Expert Teams visibility on `/advisors`.
**Owner:** anyone with Supabase MCP access OR direct Supabase dashboard access.
**Risk:** medium (touches `advisor_auctions`).
**Time:** ~30 min including verification.

## Why this exists

The `/advisors` page reads from `expert_teams` and `expert_team_members` to populate
the "Expert Teams" tab. Those tables don't exist in production yet. The migration that
creates them (`supabase/migrations/20260723_pmp01_provider_marketplace_foundation.sql`)
is in the repo but has never been applied because it depends on `advisor_auctions` —
a table that itself exists in production but was created via the Supabase dashboard
(not via a migration file).

This runbook is the safe path to unblock Expert Teams.

## Pre-flight (read-only)

Open the Supabase SQL Editor for the production project. Run each of these as **read-only**
introspection queries first.

### 1. Confirm `advisor_auctions` exists and its columns

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'advisor_auctions'
ORDER BY ordinal_position;
```

Expected: at least 30 columns including `id`, `flow_type`, `tracker_status`, `accepted_at`,
`accepted_by_professional_id`, `accepted_by_team_id`, `contact_email`, `brief_template`,
`brief_payload`, `status`, `risk_review_status`, `slug`, `job_title`, `created_at`.

If this returns 0 rows → `advisor_auctions` does NOT exist in prod and PMP cannot apply.
Stop and consult the founder.

### 2. Confirm `expert_teams` is absent

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('expert_teams', 'expert_team_members', 'expert_team_invitations');
```

Expected: 0 rows. If any row returns → those tables already exist (probably partial
prior apply); SKIP step 4 below and jump to step 5.

### 3. Check applied migrations

```sql
SELECT version, name, statements
FROM supabase_migrations.schema_migrations
WHERE version >= '20260723_pmp01_provider_marketplace_foundation'
ORDER BY version;
```

Expected: 0 rows (PMP not yet applied) OR PMP-row indicating partial apply.

## Apply (write operations)

### 4. Run the PMP foundation migration

Open `supabase/migrations/20260723_pmp01_provider_marketplace_foundation.sql`
from this repo. Copy the entire content. Paste into Supabase SQL editor. Run as one
transaction.

It's idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
`DROP CONSTRAINT IF EXISTS`). Re-running is safe.

**If it fails** with `ERROR: relation "advisor_auctions" does not exist`:
stop. Don't try to stub the table. Surface to the founder — there's deeper schema
drift to reconcile first.

**If it fails** with a CHECK constraint already exists / column conflict:
the table has been partially extended. Skip the `ALTER TABLE` section and run only
the `CREATE TABLE IF NOT EXISTS` blocks.

### 5. Verify PMP landed

```sql
SELECT count(*) FROM expert_teams;             -- expect 0
SELECT count(*) FROM expert_team_members;      -- expect 0
SELECT count(*) FROM expert_team_invitations;  -- expect 0
```

All three queries should succeed without error (proving the tables exist).

### 6. Apply the seed

Open `supabase/migrations/20260725180100_seed_expert_teams.sql`. Paste into SQL editor.
Run.

This inserts 5 verified expert teams + 15 members.

### 7. Verify the seed

```sql
SELECT name, verification_status, slug FROM expert_teams ORDER BY name;
-- expect 5 rows: AU SMSF Property Squad, Cross-Border Tax Team, Expat Return Planning,
-- CBD Commercial Property Team, SME Acquisition Team

SELECT t.name, count(m.id) as member_count
FROM expert_teams t
LEFT JOIN expert_team_members m ON m.team_id = t.id AND m.status = 'active'
GROUP BY t.name
ORDER BY t.name;
-- expect 5 rows × 3 members each = 15 total
```

### 8. Record the migrations in `schema_migrations`

The Supabase MCP `apply_migration` tool does this automatically. If applying via the SQL
editor manually, also insert the tracking rows so future migrations / db-types-drift CI
don't re-detect these as unapplied:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20260723_pmp01_provider_marketplace_foundation', 'provider_marketplace_foundation',
   ARRAY['-- applied manually via SQL editor 2026-MM-DD']::text[]),
  ('20260725180100_seed_expert_teams', 'seed_expert_teams',
   ARRAY['-- applied manually via SQL editor 2026-MM-DD']::text[])
ON CONFLICT (version) DO NOTHING;
```

### 9. Verify `/advisors`

Visit https://invest.com.au/advisors → click "Expert Teams" tab → expect 5 cards.

If 0 still shows: Vercel's ISR cache may need invalidation. Hit
https://invest.com.au/advisors with `?revalidate=1` or wait up to `revalidate` seconds
(check the page's `export const revalidate = ...`).

## If something goes wrong

### Partial apply

If the migration aborted halfway through, the tables that DID create are still there.
The `IF NOT EXISTS` clauses mean re-running is safe. Just re-run.

### Want to revert

```sql
DROP TABLE IF EXISTS public.expert_team_invitations CASCADE;
DROP TABLE IF EXISTS public.expert_team_members CASCADE;
DROP TABLE IF EXISTS public.expert_teams CASCADE;
DELETE FROM supabase_migrations.schema_migrations
 WHERE version IN ('20260723_pmp01_provider_marketplace_foundation',
                   '20260725180100_seed_expert_teams');
```

This won't undo the `ALTER TABLE advisor_auctions` columns — those are additive and
harmless to leave.

## Related drift

The bigger systemic issue: many repo migrations are not in
`supabase_migrations.schema_migrations`. A separate migration-reconciliation pass
should compare repo vs. applied state and write backfill migrations for prod-only
state, OR apply repo-only migrations. See the broader drift discussion in
`docs/plans/pre-launch-wave-status.md`.

This runbook just unblocks Expert Teams. The full reconcile is its own project.
