# n8n Phase 3 — batch 4 agents (ops-admin · licensing · ceo · growth)

Four workflows shipped in one PR. All `active: false` on import. None burn Anthropic credits on empty-data days (`ops_admin` + `licensing` never call Claude; `ceo` + `growth` take a bypass path when no input data is present).

## Summary table

| Workflow | Agent | Schedule (Sydney) | Reads | Writes | Claude | Tables touched |
|---|---|---|---|---|---|---|
| `ops_admin_daily` | #12 Ops/Admin | daily 04:00 | `cron_run_log`, `agent_logs` (errors 24h), `professionals` (unresponded_leads ≥ 5) | `agent_logs`, `compliance_tasks` (auto-pause recs) | No | read 3 / write 2 |
| `licensing_daily` | #13 Licensing | daily 04:30 | `authorised_representatives`, `credit_representatives`, `compliance_tasks` (open) | `agent_logs` | No | read 3 / write 1 |
| `ceo_daily` | #01 CEO | daily 06:00 | `platform_snapshots` (14d), `revenue_opportunities`, `compliance_tasks` (high/critical) | `agent_logs` (digest row) | Yes (on data) | read 3 / write 1 |
| `growth_weekly` | #14 Growth | Wed 09:00 | `posthog_daily_funnel` (28d), `competitor_watch` (7d), `partner_integrations` (open) | `agent_logs` (weekly digest) | Yes (on data) | read 3 / write 1 |

All 4 use the proven empty-data-safe pattern — `alwaysOutputData: true` on every Read, plus dummy-item filtering in the downstream Code node. This pattern was established in [PR #204](https://github.com/Funs7575/invest-com-au/pull/204) and has been baked into every Phase 2 + Phase 3 workflow since.

No migrations. Every table referenced already exists in live Supabase.

## Import instructions (same pattern for all 4)

1. n8n UI → **Workflows → Import from File** → upload each `infra/n8n/<name>.json`.
2. Replace `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]` — **placeholder counts per workflow**:
   - `ops_admin_daily`: 10 (5 HTTP nodes × 2 headers)
   - `licensing_daily`: 8 (4 HTTP × 2)
   - `ceo_daily`: 10 (5 HTTP × 2)
   - `growth_weekly`: 10 (5 HTTP × 2)
3. Replace `[HARDCODE_ANTHROPIC_API_KEY_HERE]` in `ceo_daily` + `growth_weekly` (1 each). `ops_admin_daily` and `licensing_daily` do not call Claude.
4. Settings sidebar → confirm **Timezone: Australia/Sydney** + **Error workflow: agent_error_logger**.
5. Leave **Active** OFF until activation day.

Service-role + Anthropic keys: 1Password under `Supabase / invest-com-au / service_role` and `Anthropic / invest-com-au`.

## What each workflow does — plain English

### `ops_admin_daily` (no Claude)

Every morning at 04:00 Sydney. Does three things:

1. **Cron health check** — reads `cron_run_log` for the last 24h, counts failures + stuck-running rows (running > 30min).
2. **Agent error sweep** — reads `agent_logs` where `level IN ('error','fatal')` for last 24h, groups by `agent_name`.
3. **Advisor auto-pause** — finds `professionals` rows where `unresponded_leads ≥ 5` and `auto_paused_at IS NULL` and `accepting_new_clients = true`. For each one, files a `compliance_tasks` row recommending auto-pause (severity=medium). The actual `PATCH auto_paused_at=NOW()` is NOT done by this workflow — it's deferred to the task resolution flow so Fin has a human checkpoint before pausing an advisor.

One `agent_logs` row per run with the summary. Level is `info`/`warn`/`error` depending on what was found.

### `licensing_daily` (no Claude)

Every morning at 04:30 Sydney. Reads the AFSL/ACL registers + open compliance tasks. Flags:

- Active ARs/CRs without `ar_number`/`cr_number` (regulator should have issued one by now)
- Compliance tasks stuck open > 5 days
- Compliance tasks with due_date within 14 days
- Severity `critical` or `high` tasks still open

Writes one `agent_logs` row per run with the summary. Critical counts bump level to `error`.

Doesn't write to the AR/CR registers — that's a T3-gated action per spec line 57. This workflow reads only.

### `ceo_daily` (Claude on data days)

Every morning at 06:00 Sydney. Reads the latest `platform_snapshots` row written by `data_aggregator_daily` (PR #210), top 10 revenue opportunities, and any critical/high open compliance tasks. Builds a short founder brief:

- `headline` (≤120 chars)
- `top_priority` (one string)
- `top_3_opportunities` (array)
- `flags` (array)
- `recommended_actions` (array of 3)

If no `platform_snapshots` exists yet (data_aggregator hasn't run, or never), takes the **no-data bypass** — skips Claude, writes a heartbeat-only log with `metadata.note='no_snapshot_yet'`. Zero Anthropic cost on those days.

Monday runs (detected via `getUTCDay() === 1`) pass an `isMonday` flag to Claude so it knows to produce the longer weekly brief.

### `growth_weekly` (Claude on data days)

Every Wednesday at 09:00 Sydney. Reads:

- `posthog_daily_funnel` for last 28 days (funnel drop-off trends)
- `competitor_watch` events in the last 7 days
- All open `partner_integrations` rows

Claude produces:
- `headline`
- `funnel_observation` (what PostHog shows)
- `top_experiments` (array of 3 growth tests for next week)
- `stale_partnerships_to_nudge` (partner names > 30d without activity)
- `competitor_signals` (up to 5)

Bypasses Claude if all 3 inputs are empty (no funnel data, no competitor events, no partners) — heartbeat row only.

## Smoke tests

### Pre-activation audit (from my side via Supabase MCP)

Already done at import — for each workflow, the structural audit confirmed:
- `active: false`
- Correct node count
- `alwaysOutputData: true` on every Read node
- Correct `true/false` branch wiring on IF nodes
- All key placeholders substituted
- Tags correct (`phase:3` + agent label)

### Per-workflow live smoke (once Anthropic credits are topped up)

Each follows the same 3-step pattern established in prior Phase 2/3 runbooks:

1. **Empty-data path** — manually execute. Confirm Claude is NOT called (for `ceo` + `growth`). Confirm heartbeat row lands with `metadata.note` set.
2. **Populated path** — seed one row in the relevant source table, execute, confirm the digest row lands with level matching the severity of the seeded data. Clean up seed.
3. **Scheduled path** — restore the Schedule Trigger, activate, wait for the next cron tick, verify.

## Gotchas that apply to the whole batch

1. **Six-field cron, not five.** `0 0 4 * * *` (Ops), `0 30 4 * * *` (Licensing), `0 0 6 * * *` (CEO), `0 0 9 * * 3` (Growth Wed). n8n v2.17+ only.
2. **Hardcoded keys, not `$env`.** This n8n version doesn't expand `{{ $env.VAR_NAME }}` in HTTP headers. All 38 Supabase + 2 Anthropic placeholders take literal keys.
3. **Empty-array chain survival.** Every Read node has `alwaysOutputData: true`; every downstream Code node filters dummy items by `row.id` (or `row.day` / `row.snapshot_date` for the view-based reads). Without this, a quiet day kills the chain and no heartbeat row lands.
4. **CEO no-data bypass relies on `data_aggregator_daily` running first.** Until PR #210 (`data_aggregator_daily`) is activated and has written at least one `platform_snapshots` row, `ceo_daily` will write heartbeat-only rows. That's the intended behaviour — don't activate CEO before the aggregator.
5. **Growth weekly reads a view, not a table.** `posthog_daily_funnel` is a view over `posthog_events_mirror`. If the mirror is empty (as of today, 24 April 2026), the view has zero rows and Growth writes a heartbeat. The moment PostHog starts mirroring events, the Wednesday run will have data.
6. **Ops writes `compliance_tasks`, not PATCHes `professionals` directly.** The auto-pause decision is a human T3-gated action. This workflow only recommends.
7. **Licensing never writes to AR/CR registers.** Those inserts/updates are T3 per spec line 57. This workflow only reads + logs gaps.

## What's next after this PR

With this batch shipped, Phase 3 robot count is **10 of 19 buildable-without-external-deps robots** (2 Phase 1 + 5 Phase 2 + 3 Phase 3 already merged + 4 in this PR = 14 workflow files; minus 1 (overseer snapshot) = 13 unique robot workflows).

Still blocked on external systems (noted in each agent spec):
- **#06 SEO** — Google Search Console MCP
- **#09 Growth experiments** — A/B testing infrastructure + PostHog experiments
- **#07 Revenue** — Stripe MCP writes (not just reads)
- **#12 Ops full scope** — Xero MCP for bookkeeping
- **#15 Revenue Optimisation** — pricing experiments infrastructure
- **#16 Domain Migration** — only activates Oct–Dec 2026 per COMPANY.md
- **#17 AI Search Optimisation** — LLM probe-citation infrastructure
- **#18 Product Layer** — post-AFSL only

And for this batch, the manual step before activation is just: top up Anthropic credits, paste keys, flip to Active.
