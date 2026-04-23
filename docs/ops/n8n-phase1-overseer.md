# n8n Phase 1 — `overseer_hourly` (agent #00)

## Purpose

Hourly heartbeat run of the Master Overseer (agent #00). Reads the current
`agent_tasks` queue plus the last 60 minutes of `agent_logs`, builds a
deterministic snapshot, asks Claude for a <=200-word assessment, and writes
one `agent_logs` row summarising the run.

This is the **only source of data** for `agent_analytics` during Phase 1 —
until more of the 19 agents are live, overseer is the only agent producing
logs. Keep it running or the analytics rollup has nothing to aggregate.

## Schedule + timezone

- Cron: `0 0 * * * *` (six-field: second minute hour dom month dow)
- Fires at the top of every hour, UTC.
- Workflow `settings.timezone` is unset → n8n host default → Railway container
  runs UTC. Hourly fires are UTC-aligned, which is what we want (no DST shift).

## Import instructions

`infra/n8n/overseer_hourly.json` is the sanitised snapshot of the live
workflow. It's held here so the fixes applied during the 2026-04-23 incident
stay reproducible from source control.

To install into a fresh n8n instance (or to restore from this snapshot):

1. n8n UI → **Workflows → Import from File** → pick
   `infra/n8n/overseer_hourly.json`.
2. Replace placeholders:
   - `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — **six** locations, two
     each on `Read active tasks` + `Read recent logs` + `Write overseer log`
     (one `apikey` header + one `Authorization: Bearer …` header per node).
   - `[HARDCODE_ANTHROPIC_API_KEY_HERE]` — **one** location on `Call Claude`
     (`x-api-key` header).
3. Leave **Active** OFF until smoke-tested, then activate from the UI.

Keys live in 1Password (`Supabase / invest-com-au / service_role` and
`Anthropic / invest-com-au`).

## Gotchas

1. **Empty PostgREST response silently kills the chain.** Same pattern as
   `analytics_daily`. `Read active tasks` and `Read recent logs` both have
   `alwaysOutputData: true` set — keep it that way. Without it, a quiet hour
   (zero queued tasks, zero recent logs) terminates the workflow before
   `Write overseer log` ever runs, so we get silent "success" executions with
   no `agent_logs` row written. `Build Overseer prompt` filters the resulting
   dummy pass-through items via `.filter(t => t && t.id)` / `.filter(l => l
   && l.id)` so they don't pollute the snapshot.
2. **Hardcoded API keys (not `$env`).** This n8n version does not expand
   `{{ $env.VAR_NAME }}` inside HTTP Request node headers. All six Supabase
   header fields must hold the literal key; the one Anthropic field takes
   the literal `sk-ant-api…` key. The 2026-04-23 debug session found four
   headers still using `$env` references (evaluating to empty string) — if
   you see `$env.SUPABASE_SERVICE_ROLE_KEY` in any header, replace it with
   the literal or that request will 401.
3. **Six-field cron.** `0 0 * * * *` (6-field) = every hour on the hour. A
   five-field `0 * * * *` expression is either rejected or silently
   misinterpreted on this n8n version.
4. **Cost/model.** `Call Claude` posts to `claude-opus-4-7`. Update the
   model ID + the pricing constants in `analytics_daily`'s Compute Analytics
   node together if the overseer model changes.
5. **`updated_at` trigger unused.** `agent_logs` is append-only — no trigger
   maintains `updated_at`, rows are immutable after insert. Don't add an
   `UPDATE` path unless you migrate in a trigger first.
