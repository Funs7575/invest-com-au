# Runbook: reconcile the migration ledger (baseline-squash)

**Status:** procedure — destructive prod steps are gated and marked
🛑 (founder-supervised) / ⚖️ (founder + legal). Nothing here runs in CI.
**Project ref:** `guggzyqceattncjwvgyc` (invest-com-au, eu-west-1).
**Authoritative state:** `docs/audits/DB-STATE-2026-06-07.md`.

## Why this replaces `MIGRATION_DEPLOY_BACKLOG.md`

That runbook says "prod is 118 migrations behind; run `supabase db push`." That
model is wrong and the action is **destructive**. The local tree and the prod
ledger have forked: only **5 of 250** local versions are tracked in prod, so
`supabase db push` would attempt **~245** migrations — re-creating tables that
already exist and **re-running ~35 non-idempotent data backfills**, plus the
CSF/Tier-E startup-portal migration. Do not run `db push` against this project
until the steps below are complete.

The schema *content* is ~98% already in prod and RLS is comprehensive (414/415).
So we do **not** rebuild the schema — we **re-baseline the history** so the tree,
the ledger, and the types describe the same thing, then resume a normal pipeline.

## Strategy: Path A — baseline-squash (chosen)

Treat **live prod as the source of truth** (it is what serves traffic). Collapse
the 404 legacy files into one baseline migration equal to the current prod
schema, mark that baseline as already-applied in the prod ledger, archive the
legacy files, and go forward normally from there.

Rejected — **Path B (incremental `migration repair` of all 404 files)**: with 50
colliding date-only versions, 3 incompatible version formats, and 434 prod-only
ledger rows, per-file repair is thousands of ambiguous operations and does not
fix the structural naming mess. Not viable at this divergence.

## Pre-flight (read-only — safe to run now)

```bash
# Local divergence snapshot (no DB needed):
npm run audit:ledger-drift                 # tree stats + collisions
node scripts/check-migration-filenames.mjs --all

# Dump the prod ledger (service-role; Supabase MCP execute_sql or psql):
#   SELECT json_agg(json_build_object('version',version,'name',name) ORDER BY version)
#   FROM supabase_migrations.schema_migrations;
# Save as ledger.json, then diff the tree against the real ledger:
SUPABASE_MIGRATIONS_JSON=ledger.json npm run audit:ledger-drift
# Expect (today): local-only ~245, ledger-only ~434. After this runbook: ~0 / ~0.
```

## Procedure

### 0. 🛑 Snapshot prod — non-negotiable
Supabase Dashboard → Database → Backups → take a fresh snapshot (or
`pg_dump`/PITR confirmed). 35 ledger entries are data backfills; this is the
rollback floor for everything below.

### 1. Freeze the apply paths
- Confirm **`SUPABASE_PROJECT_REF` / `SUPABASE_DB_PASSWORD` remain unset** in
  GitHub Actions secrets, so `supabase-migrate.yml` cannot fire. (Land PR #1463
  first so a no-op can't masquerade as success.)
- Pause ad-hoc `apply_migration` (Supabase MCP) except the steps in this runbook.

### 2. Capture the true prod schema as the baseline
```bash
supabase link --project-ref guggzyqceattncjwvgyc
# Schema only (no data), public schema, as the baseline body:
supabase db dump --linked --schema public -f /tmp/prod_public.sql
# (Repeat for any non-public app schemas you own, if applicable.)
```
Create the baseline migration with a single fresh 14-digit timestamp:
```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p supabase/migrations/archive
git mv supabase/migrations/*.sql supabase/migrations/archive/   # preserve history, out of the active set
# Assemble the baseline from the dump (review it — strip owner/grant noise,
# ensure RLS + policies are included, idempotent CREATEs):
cp /tmp/prod_public.sql "supabase/migrations/${TS}_baseline_schema.sql"
```
> The archive dir is intentionally **not** scanned by the migration gates, so
> the legacy files stop counting the moment they move there.

### 3. 🛑 Reconcile the ledger to the baseline (prod)
Mark every currently-applied prod version as applied for the new file set, then
make the baseline the floor. With the CLI:
```bash
# Pull the remote ledger and reconcile. `migration repair` writes
# supabase_migrations.schema_migrations WITHOUT running SQL.
supabase migration list --linked            # inspect remote vs local
supabase migration repair --status applied "${TS}"   # baseline = applied
# Then mark the archived legacy versions as reverted/untracked so the CLI does
# not consider them pending (they are superseded by the baseline):
#   supabase migration repair --status reverted <legacy_version> ...
```
**Goal state:** `supabase migration list` shows the baseline as the single
applied floor and **no pending migrations**. Re-run the pre-flight diff — both
`local-only` and `ledger-only` should collapse to ~0.

> If you prefer to keep the full prod ledger rows intact and only add the
> baseline, that also works (the baseline is idempotent `CREATE … IF NOT
> EXISTS`); the essential invariant is **`supabase db push` reports nothing
> pending** afterwards.

### 4. Regenerate types from prod (clears the standing warning)
```bash
npm run db:types        # supabase gen types typescript --project-id … > lib/database.types.ts
git add lib/database.types.ts
```
Use the repo's canonical script (not MCP) so the output is byte-consistent with
what the next `db:types` produces. Run `npm run type-check` and fix any errors
the truthful types surface (e.g. `professionals.specialties` jsonb vs text[]).

### 5. Drain the real backlog as forward migrations (NOT via MCP)
Through the now-trusted pipeline, each a unique 14-digit file:
- **Apply** `versus_votes` (live bug), then `api_consumer_webhooks` +
  `consumer_webhook_deliveries`, `api_key_subscriptions`, `ipo_watchlist` +
  `ipo_alert_sends`, `investment_loan_rates`.
- **Fix** the naming-mismatch `.from()` refs in code (`user_profiles`→`profiles`,
  etc.) and burn down `.schemarefallowlist`.
- ⚖️ **HOLD** `startup_*`, `esic_verifications`, `wholesale_investor_certifications`
  (CSF / s708) — founder + legal only. They stay out of the active set.

### 6. Retire the zombies (verify first, then drop)
For each candidate (`trading_*`, `sentiment_signals`, `article_moderation_log`,
`investor_journey_touchpoints`, `foreign_investment_flags`,
`data_license_subscribers`; investigate `migration_plan`):
```sql
SELECT count(*) FROM public.<table>;   -- confirm empty / dead
```
and confirm zero `.from("<table>")` refs, then ship one
`DROP TABLE IF EXISTS public.<table>;` migration. Remove the corresponding lines
from `lib/database.types.ts` (via `db:types`) and `.driftallowlist`.

### 7. 🛑 Re-enable the pipeline (only after steps 2–4)
Now that "pending" == the real forward set, set `SUPABASE_PROJECT_REF` +
`SUPABASE_DB_PASSWORD` in Actions secrets so `supabase-migrate.yml` applies on
merge. **Permanently fence the CSF migration**: keep it in `archive/` (or a
separate, dispatch-only path) so `db push --include-all` can never sweep it in.

### 8. Verify reproducibility (the proof the job is done)
```bash
supabase branches create reconcile-verify    # builds a fresh DB from the tree
# Point a staging build at the branch; smoke-test search / cert / webhook /
# billing / advisor. A fresh env from the baseline must equal prod.
supabase branches delete reconcile-verify
```

## Done when
- `supabase db push --dry-run` reports **nothing pending**.
- `SUPABASE_MIGRATIONS_JSON=… npm run audit:ledger-drift` → local-only 0, ledger-only 0.
- `lib/database.types.ts` matches live (the `supabase-types-drift` job is clean).
- A preview branch built from the tree matches prod.
- CSF/wholesale tables remain held; auto-apply enabled with the CSF fence in place.

## Rollback
- Steps 2–6 are file/branch changes on a PR — revert the PR.
- Step 3 (ledger repair) only rewrites `schema_migrations` rows; restore them
  from the step-0 snapshot if needed. No table data is touched by repair.
- Step 6 (drops) is the only data-destructive step — the step-0 snapshot is the
  floor; do drops in a separate, clearly-labelled PR after the rest is verified.
