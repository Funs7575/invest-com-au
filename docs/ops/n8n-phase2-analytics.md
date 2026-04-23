# n8n Phase 2 — `analytics_daily` (workflow #10)

## Purpose

Roll up the previous day's rows from `agent_logs` into per-agent daily
aggregates in `agent_analytics`. One row per `(agent_name, date)`, upserted
idempotently so the job is safe to re-run.

Each row captures:

- `total_logs` / `error_count` / `warn_count` / `info_count`
- `success_rate` — `(total_logs - error_count) / total_logs * 100`
- `avg_runtime_ms` — mean of `metadata.runtime_ms` across logs with that field
- `estimated_cost_usd` — `input_tokens * $3/M + output_tokens * $15/M`
  (claude-opus-4-7 pricing)
- `metadata.raw_log_ids` — the log IDs that fed the row, for traceability

If `agent_logs` has no rows for the target day, the workflow still writes one
sentinel row: `agent_name='system'`, `success_rate=100`,
`metadata.note='no_logs_for_day'`. This keeps the heartbeat signal alive so a
silent day is distinguishable from a failed workflow run.

## Schedule + timezone

- Cron: `0 0 6 * * *` (six-field: second minute hour dom month dow)
- Timezone: `Australia/Sydney`
- Fires daily at 06:00 Sydney — aggregates the previous Sydney day
  (00:00 → 24:00 Sydney local time)

The date-range node computes `startOfDay` / `endOfDay` as ISO strings with the
correct Sydney UTC offset for that date (AEST +10 or AEDT +11), so DST
transitions don't cause off-by-one-day bugs at the boundary.

## Import instructions

This workflow is held in source control and imported manually — we do not sync
n8n workflows from git. To install:

1. In the n8n UI (https://n8n-production-efab.up.railway.app), go to
   **Workflows → Import from File**.
2. Upload `infra/n8n/analytics_daily.json`.
3. Open the workflow and replace the `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]`
   placeholder in **four** locations:
   - **Read agent_logs** node → `apikey` header
   - **Read agent_logs** node → `Authorization` header (paste as
     `Bearer <key>`)
   - **Upsert to agent_analytics** node → `apikey` header
   - **Upsert to agent_analytics** node → `Authorization` header (paste as
     `Bearer <key>`)

   The key is the Supabase **service role** key for project
   `guggzyqceattncjwvgyc` (eu-west-1). It's in 1Password under
   `Supabase / invest-com-au / service_role`.
4. In the workflow **Settings** sidebar, confirm:
   - **Timezone**: `Australia/Sydney`
   - **Error workflow**: `agent_error_logger`
5. Leave **Active** OFF until the smoke tests pass.

## Smoke test plan

### Test 1 — manual execution with real data

1. Temporarily replace the **Schedule Trigger** node with a **Manual Trigger**
   (same swap we did for `overseer_hourly`). Don't delete the schedule config
   — just add a manual trigger and rewire the edge to `Compute Date Range`.
2. Click **Execute workflow**.
3. Expected flow:
   - `Compute Date Range` emits one item with `startOfDay`, `endOfDay`,
     `dateString` all pointing at yesterday (Sydney).
   - `Read agent_logs` returns the logs from yesterday (should be ~1–5 rows
     from `overseer_hourly`).
   - `Compute Analytics` emits one row per distinct `agent_name`.
   - `Upsert to agent_analytics` returns HTTP 201 with the inserted rows.
4. Verify in Supabase:
   ```sql
   select agent_name, date, total_logs, error_count, success_rate,
          estimated_cost_usd
   from agent_analytics
   where date = current_date - interval '1 day'
   order by agent_name;
   ```
   Expect at least one row with `agent_name='overseer'` if overseer ran
   yesterday.

### Test 2 — empty-data path

1. Pick a date with no `agent_logs` (e.g. before overseer was deployed).
   Temporarily hardcode the `dateString` in `Compute Date Range` to that date
   (and matching `startOfDay` / `endOfDay`).
2. Execute the workflow.
3. Expected: one row written with `agent_name='system'`, `success_rate=100`,
   `metadata.note='no_logs_for_day'`.
4. **Revert** the hardcoded date before continuing.

### Test 3 — scheduled run

1. Swap the Manual Trigger back out for the Schedule Trigger. Confirm the
   cron expression is `0 0 6 * * *` (six fields).
2. Click **Active** to enable.
3. Wait until the next 06:00 Sydney.
4. Check n8n **Executions** tab — should show one successful run at ~06:00.
5. Check `agent_analytics` has a fresh row for the just-ended Sydney day.

## Gotchas

1. **Six-field cron, not five.** n8n v2.17+ uses
   `second minute hour day-of-month month day-of-week`. The workflow JSON
   declares `0 0 6 * * *`. A five-field expression will either be rejected or
   silently interpreted with wrong field positions.
2. **Hardcoded API keys.** This n8n instance does not expand
   `{{ $env.VAR_NAME }}` inside HTTP Request node headers. Keys must be pasted
   literally into the node config (same workaround as `overseer_hourly`). The
   shipped JSON holds the placeholder `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]`
   — never commit a real key to git; replace it only after import.
3. **Upsert via `Prefer` header.** The `Upsert to agent_analytics` node relies
   on `Prefer: resolution=merge-duplicates,return=representation` plus the
   `UNIQUE(agent_name, date)` constraint to make re-runs idempotent. If the
   unique index is dropped, the workflow will start inserting duplicates.
4. **Cost pricing is model-specific.** The `Compute Analytics` node bakes in
   claude-opus-4-7 pricing (`$3/M input`, `$15/M output`). If agents migrate
   to a different model, update the constants `INPUT_PRICE` and `OUTPUT_PRICE`
   in that node's JS before historical comparisons become meaningful.
5. **Service-role bypasses RLS.** `agent_analytics` has RLS enabled; the
   n8n writes succeed only because we use the service-role key. No end-user
   session token will satisfy these policies — don't swap in the anon key.
6. **Log volume cap.** `Read agent_logs` is capped at `limit=1000`. If a day
   ever generates more than 1000 logs, the aggregates will be under-counted
   silently. Add pagination before we ship more than a handful of agents.
7. **Empty PostgREST response silently kills the chain.** n8n's HTTP Request
   node splits a `[]` response into zero output items, and downstream nodes
   never run. The execution is marked `success` with no visible error. To
   keep the empty-day sentinel path alive we set `alwaysOutputData: true` on
   `Read agent_logs`, and `Compute Analytics` filters out the resulting dummy
   `{}` item via `row.agent_name` guards. If you add a new HTTP GET node to
   this workflow, apply the same pattern — or the chain will silently
   short-circuit on any day the upstream table is empty.
