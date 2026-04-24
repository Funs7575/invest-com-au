# n8n Phase 3 — `data_aggregator_daily` (agent #10 / contract v1)

## Purpose

Once-a-day roll-up of platform state into one row in `platform_snapshots`. Implements a **Supabase-only subset** of the `metrics` contract defined in `.claude/agents/10-analytics.md` §"`metrics` contract — version 1". Unavailable sources (Stripe, Vercel Analytics, Google Search Console) are emitted as `null` and listed in `data_quality.source_missing` per the spec's own missing-data policy.

This is the **single source of truth** table the CEO digest (#01), Overseer (#00), and downstream readers will query. It's append-one-per-day, idempotent via `UNIQUE(snapshot_date)` + PostgREST `Prefer: resolution=merge-duplicates`.

## Schedule + timezone

- Cron: `0 0 2 * * *` (six-field: second minute hour dom month dow)
- Timezone: `Australia/Sydney`
- Fires 02:00 Sydney daily — before the 06:00 digest slot so `cto_daily` / weekly `ceo_digest` can read today's snapshot.

## What's populated vs `null`

| Contract v1 key | Populated? | Source |
|---|---|---|
| `version`, `snapshot_date`, `generated_at` | ✅ | local |
| `generated_at_source_ages` | partial | `supabase`, `agent_runtime` |
| `content.tier{1,2,3}_published_d7`, `drafts_in_review`, `drafts_awaiting_fin_objection`, `cumulative_published` | ✅ | `articles` + `editorial_articles` |
| `sales.prospects_added_d7`, `prospects_active`, `advisor_trials_active`, `advisor_paid_active` | ✅ | `prospects` + `professionals` |
| `sales.bd_pipeline_open_value_aud`, `trial_to_paid_d7_pct`, `api_customers_*` | `null` | needs Stripe + more modelling |
| `agents.{active_count, degraded_count, failed_count, cost_aud_mtd, by_agent, total_runs_d1}` | ✅ | `agent_analytics` |
| `revenue`, `traffic`, `product_health`, `ai_search`, `migration` | `null` | blocked on Stripe / Vercel / GSC |
| `data_quality.source_missing` | `['stripe', 'vercel_analytics', 'google_search_console']` | — |

When Stripe/Vercel/GSC MCPs are wired, extend `Build metrics payload` to fetch those and shift the corresponding keys out of `source_missing`.

## Node shape (10 nodes)

```
Schedule Trigger
  → Compute Snapshot Date                 (Code: Sydney-local date + d1/d7/d28 ISO windows)
  → Read articles (d28)                   (GET articles, alwaysOutputData)
  → Read editorial_articles               (GET editorial_articles, alwaysOutputData)
  → Read professionals                    (GET professionals, alwaysOutputData)
  → Read prospects                        (GET prospects, alwaysOutputData)
  → Read agent_analytics (d1)             (GET agent_analytics, alwaysOutputData)
  → Build metrics payload                 (Code: assembles contract v1, filters dummies)
  → Upsert platform_snapshots             (POST with Prefer: resolution=merge-duplicates)
  → Write summary log                     (POST agent_logs, level='info')
```

## Import instructions

1. n8n UI → **Workflows → Import from File** → `infra/n8n/data_aggregator_daily.json`.
2. Replace the **14 `[HARDCODE_SUPABASE_SERVICE_ROLE_KEY_HERE]`** placeholders across 7 HTTP nodes (2 each). **No Anthropic key needed** — this workflow makes no Claude calls.
3. Settings → **Timezone**: `Australia/Sydney`, **Error workflow**: `agent_error_logger`.
4. Leave **Active** OFF for dry-run. No Anthropic spend to block activation — can be turned on any time after smoke test.

## Smoke test plan

### Test 1 — single run

1. Swap Schedule Trigger for Manual Trigger.
2. Execute.
3. Expect:
   - All 5 Read nodes return 1+ items (tables have data).
   - `Build metrics payload` emits one item with `snapshot_date` = yesterday Sydney, `metrics.version=1`, `metrics.data_quality.source_missing=['stripe','vercel_analytics','google_search_console']`.
   - `Upsert` returns HTTP 201.
   - `platform_snapshots` gains one row; `agent_logs` gains one `agent_name='analytics'` row.
4. Re-run — `platform_snapshots` still has the same row (upsert merged), `updated_at` advances. No duplicate rows.

### Test 2 — scheduled

Restore Schedule Trigger, activate, wait for next 02:00 Sydney.

## Gotchas

1. **Supabase-only subset.** Most of the revenue/traffic/product_health/ai_search contract keys emit `null` until the relevant MCPs are wired. Downstream readers (CEO digest, etc.) must use the `data_quality.source_missing` array to distinguish "null because missing source" from "null because zero".
2. **`UNIQUE(snapshot_date)` + `Prefer: resolution=merge-duplicates`** make re-runs idempotent. If the unique index is dropped, re-runs will duplicate.
3. **Empty-array chain survival** on all 5 Read nodes — `alwaysOutputData: true` plus `row.id` filters in `Build metrics payload`. On a fresh environment where some table is empty, the chain still completes.
4. **d28 window on `articles`** reads up to 5000 rows. If `articles` balloons beyond that, switch the endpoint to a SQL RPC with `COUNT(*)` + `SUM(...)` to avoid payload size issues.
5. **Cost approximation** in `agents.cost_aud_mtd` uses `estimated_cost_usd × 1.5`. Replace with live FX when we ship multi-currency support.
6. **Contract bump requires T3.** Per spec line 42: `version` is always `1` until bumped via T3. If you change the `metrics` shape, bump `version`, file a `ceo_approvals` row, and update `agent_memory:analytics:contract_v<N>`.
