# n8n Phase 2 — `cto_daily` (agent #02)

## Purpose

Once-a-day operational digest from the CTO agent. Reads the last 24 hours of
`agent_logs` (errors/warnings) and `agent_tasks` (failed/blocked), asks Claude
to classify severity + suggest up to 3 follow-ups, and writes a single
`agent_logs` row tagged `agent_name='cto'`.

This is a **digest-only** scaffold. The full intent of the CTO agent per
`.claude/agents/02-cto.md` — 4-hourly cycle, event-driven wake, draft PRs via
GitHub MCP, incident register in `agent_memory`, `ceo_approvals` for T3
changes — is deferred until the dependencies exist (GitHub MCP, incident
schema, `ceo_approvals` dashboard). This workflow covers the daily-summary
output line of the spec.

Empty-day path (no errors, warns, failed or blocked tasks in the window)
skips Claude entirely and writes a sentinel row with `metadata.note =
'no_issues_in_last_24h'` / `metadata.success_rate = 100`. This keeps the
heartbeat visible on quiet days without burning Anthropic credits.

## Schedule + timezone

- Cron: `0 0 6 * * *` (six-field: second minute hour dom month dow)
- Timezone: `Australia/Sydney`
- Fires at 06:00 Sydney daily, same slot as `analytics_daily` so the daily
  trio runs tightly: `overseer_hourly` (hourly, 00–23) → `cto_daily` 06:00 →
  `analytics_daily` 06:00 (latter reads overseer + CTO logs from the
  previous Sydney day).

## Node shape (10 nodes)

```
Schedule Trigger
  → Compute Date Range            (24h window in Sydney local tz)
  → Read errors and warns 24h     (GET agent_logs, alwaysOutputData)
  → Read broken tasks 24h         (GET agent_tasks, alwaysOutputData)
  → Build CTO prompt              (Code: filter dummies, snapshot, bypass flag)
  → If empty day                  (IF node on snapshot.bypass_claude)
      ├── true  → Write sentinel log      (POST agent_logs, no Claude)
      └── false → Call Claude              (POST api.anthropic.com/v1/messages)
                → Parse Claude response   (Code: extract JSON, derive level)
                → Write CTO log           (POST agent_logs, message + metadata)
```

## Import instructions

1. n8n UI → **Workflows → Import from File** → pick
   `infra/n8n/cto_daily.json`.
2. Replace placeholders (9 locations total):
   - `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — **8 locations**, two each
     on the four Supabase HTTP nodes (`Read errors and warns 24h`,
     `Read broken tasks 24h`, `Write sentinel log`, `Write CTO log`).
   - `[HARDCODE_ANTHROPIC_API_KEY_HERE]` — **1 location**, the `x-api-key`
     header on `Call Claude`.
3. In the workflow **Settings** sidebar, confirm:
   - **Timezone**: `Australia/Sydney`
   - **Error workflow**: `agent_error_logger`
4. Leave **Active** OFF until after smoke tests (and the Anthropic credit
   balance is topped up — see the 2026-04-23 incident, where `overseer_hourly`
   hit a `credit balance too low` error at `Call Claude`).

Keys live in 1Password: `Supabase / invest-com-au / service_role` and
`Anthropic / invest-com-au`.

## Smoke test plan

**Run in this order once credits are available.**

### Test 1 — empty-day path (no credits burned)

1. Temporarily swap `Schedule Trigger` for a `Manual Trigger`.
2. Verify the SQL-level state:
   ```sql
   select count(*) from agent_logs
   where created_at > now() - interval '24 hours'
     and level in ('error','fatal','warn');
   select count(*) from agent_tasks
   where updated_at > now() - interval '24 hours'
     and status in ('failed','blocked');
   ```
   Both should be zero for this test (as of 2026-04-23 they are).
3. Click **Execute workflow**.
4. Expected:
   - `If empty day` takes the `true` branch.
   - `Call Claude` is **not called** (no Anthropic charge).
   - `Write sentinel log` writes one `agent_logs` row with
     `agent_name='cto'`, `level='info'`,
     `message='CTO daily digest — no issues in last 24h'`,
     `metadata.note='no_issues_in_last_24h'`,
     `metadata.success_rate=100`.

### Test 2 — populated path (burns ~AUD$0.01 of Claude credits)

1. Seed a fake error:
   ```sql
   insert into agent_logs (agent_name, level, message, metadata)
   values ('cto_smoke', 'error', 'synthetic error for smoke test',
           '{"smoke": true}'::jsonb);
   ```
2. Execute the workflow.
3. Expected:
   - `If empty day` takes the `false` branch.
   - `Call Claude` returns a JSON block with `severity`, `headline`,
     `recommendations`.
   - `Parse Claude response` derives `level='error'` (because
     `snapshot.errors_24h > 0`).
   - `Write CTO log` writes one `agent_logs` row.
4. Clean up: `delete from agent_logs where metadata->>'smoke' = 'true';`

### Test 3 — scheduled

1. Restore the Schedule Trigger; confirm cron `0 0 6 * * *` (6-field).
2. Activate the workflow.
3. After next 06:00 Sydney, check the digest row landed and
   `metadata.snapshot` matches what manual SQL would compute.

## Gotchas

1. **Empty PostgREST response kills the chain without `alwaysOutputData`.**
   Same pattern as `analytics_daily` and `overseer_hourly` — both Read
   nodes here have `alwaysOutputData: true`. `Build CTO prompt` filters the
   resulting dummy pass-through items via `.filter(x => x && x.id &&
   x.agent_name)`. Don't remove either; they're the reason this workflow
   survives a quiet day.
2. **Six-field cron.** `0 0 6 * * *` on n8n v2.17+. A five-field `0 6 * * *`
   will either be rejected or silently misfire.
3. **Hardcoded API keys.** This n8n instance does not expand
   `{{ $env.VAR_NAME }}` inside HTTP Request node headers. All 9 key-bearing
   locations must hold the literal key. Any `$env` reference will 401
   (Supabase) or 401 (Anthropic).
4. **Cost ceiling.** `Call Claude` uses `claude-opus-4-7`, `max_tokens=2048`.
   Typical cost per populated-day run: ~AUD$0.01–0.03. Empty-day runs cost
   zero (bypass path). If CTO spec §Success-criteria cost ceiling becomes
   binding, batch via `claude-haiku-4-5` first.
5. **Severity is deterministic, not Claude's.** `Parse Claude response`
   computes `level` from the deterministic snapshot counters, not from
   Claude's `severity` field. Claude's severity is kept in `metadata.claude`
   for diagnostic review but doesn't flow into the `agent_logs.level`
   column — avoids agent-authored severity drift affecting alerts.
6. **No new tables.** This workflow writes only to existing
   `agent_logs` and reads only from existing `agent_logs` +
   `agent_tasks`. No migration required for this PR.
