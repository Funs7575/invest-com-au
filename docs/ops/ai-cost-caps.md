# AI cost caps (V-NEW-06)

Date: 2026-04-27 · Owner: founder · Audit ref: V-NEW-06 in `docs/audits/REMEDIATION_QUEUE.md`

## What changed

Two AI surfaces — public concierge (`/api/concierge`) and admin
agent (`/api/admin/ai-chat`) — now enforce daily token-cost caps
**before** every Anthropic call:

- **Per-subject** cap (per IP for concierge, per admin email for
  the admin agent).
- **Global per-route** cap so a coordinated abuse pool can't run
  the global budget into the ground.

Cap math is dollar-rough by design. The pre-check is a single
indexed lookup; the post-record is a fire-and-forget upsert. A
single subject can race past its own cap by the size of one
max-tokens response under heavy parallel load — accepted, since
the goal is to bound the blast radius, not enforce penny-perfect
accounting.

When usage crosses **80% of the per-subject cap** for the first
time today, an `OPS_ALERT_EMAIL` warning fires (rate-limited via
`alerted_80_at` so it only sends once per row per day).

When usage hits **100% of any cap**, the route returns **HTTP 429**
with a friendly body and a `Retry-After` header pointing at
00:00 UTC. Daily reset is implicit — rows are keyed on
`day = current UTC date`.

## Required env vars

| Var | Purpose | Default |
| --- | --- | --- |
| `AI_USER_DAILY_USD` | Per-IP cap on the public concierge. | `5` |
| `AI_ADMIN_USER_DAILY_USD` | Per-admin-email cap on the admin agent. | `50` |
| `AI_GLOBAL_PUBLIC_USD` | Whole-public-concierge cap for one UTC day. | `200` |
| `AI_GLOBAL_ADMIN_USD` | Whole-admin-agent cap for one UTC day. | `100` |
| `OPS_ALERT_EMAIL` | Recipient of the 80%-of-cap warning email. Falls back to `SUPPORT_EMAIL`. | (none — alerts skipped) |

Empty / non-numeric / non-positive values are treated as unset and
the default applies (parsed by `dollarsEnvToMicros` in
`lib/ai-cost-caps.ts`).

## Pricing constants

`lib/ai-cost-caps.ts` keeps a per-model pricing table. As of
2026-04-27:

| Model | $/MTok in | $/MTok out |
| --- | --- | --- |
| `claude-sonnet-4-20250514` (concierge) | 3 | 15 |
| `claude-sonnet-4-5` / `4-6` | 3 | 15 |
| `claude-opus-4-5` / `4-6` / `4-7` (admin agent) | 15 | 75 |
| `claude-haiku-4-5-20251001` | 0.80 | 4 |

When Anthropic changes pricing, update the constants. Historical
ledger rows keep their recorded cost — we store cost at write time,
not at read time, so the change doesn't retroactively shift today's
accounting.

## Emergency override

Flip `site_settings.ai_cost_caps_disabled = 'true'` to bypass both
caps for every subject on every surface. Cache TTL is 30s, so the
override takes effect within half a minute.

```sql
INSERT INTO site_settings (key, value, updated_at)
VALUES ('ai_cost_caps_disabled', 'true', now())
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now();
```

To re-enable caps:

```sql
UPDATE site_settings
SET value = 'false', updated_at = now()
WHERE key = 'ai_cost_caps_disabled';
```

This is a single boolean — no time-bound auto-reset. Toggle it back
manually when the incident is over. Every flip should also create
an `audit_log` row with the reason; the AI agent can do that for
you via `manage_subscriber`-style tooling, or run the SQL directly
from the Supabase console.

## Schema

`supabase/migrations/20260523_ai_token_usage.sql`:

```
ai_token_usage (
  id, subject_id, subject_type, route, day,
  tokens_in, tokens_out, cost_usd_micros, request_count,
  alerted_80_at, created_at, updated_at,
  UNIQUE (subject_id, subject_type, route, day)
)
```

- `subject_type ∈ {'public_session', 'admin_user'}`
- `route ∈ {'concierge', 'admin_agent'}`
- `cost_usd_micros` — 1 micro = $0.000001, integer-typed for exact
  arithmetic on the DB side.
- RLS enabled, service-role-only — no anon/authenticated reads.
- Pruning: rows older than 90 days can be deleted by a cron;
  no automatic prune yet, follow up if the table gets large.

## How to inspect

```sql
-- Today's spend by subject on the concierge:
SELECT subject_id, cost_usd_micros / 1000000.0 AS usd
FROM ai_token_usage
WHERE route = 'concierge' AND day = current_date
ORDER BY cost_usd_micros DESC
LIMIT 20;

-- Today's global by route:
SELECT route, SUM(cost_usd_micros) / 1000000.0 AS usd_today
FROM ai_token_usage
WHERE day = current_date
GROUP BY route;

-- Any subjects ever crossing 80% in the last 7 days:
SELECT subject_id, subject_type, route, day, cost_usd_micros / 1000000.0 AS usd
FROM ai_token_usage
WHERE alerted_80_at IS NOT NULL
  AND day > current_date - 7
ORDER BY day DESC;
```

## Rollout

1. Set `AI_USER_DAILY_USD` etc. in Vercel production + preview if
   you want non-default values. Skipping this is fine — the
   defaults are the launch values.
2. Set `OPS_ALERT_EMAIL` so 80% warnings reach the right inbox.
   Without it, warnings are silently dropped (logged at warn level).
3. Apply the migration via Supabase MCP `apply_migration`.
4. Merge the V-NEW-06 PR.
5. Manual smoke: hit `/api/concierge` ~10 times, watch
   `ai_token_usage` accumulate, then bump `AI_USER_DAILY_USD` low
   to confirm 429.

## Pre-launch checks

- [ ] `AI_USER_DAILY_USD`, `AI_ADMIN_USER_DAILY_USD`,
      `AI_GLOBAL_PUBLIC_USD`, `AI_GLOBAL_ADMIN_USD` confirmed in
      Vercel (or accept defaults — document the choice).
- [ ] `OPS_ALERT_EMAIL` set in Vercel.
- [ ] Migration `20260523_ai_token_usage.sql` applied to
      production via `apply_migration`.
- [ ] `__tests__/lib/ai-cost-caps.test.ts` green
      (22 tests).
- [ ] `__tests__/lib/ai-cost-alerts.test.ts` green
      (5 tests).
- [ ] Manual: temporarily set `AI_USER_DAILY_USD=0.10`, hit
      `/api/concierge` until 429, verify the friendly response
      and `Retry-After` header. Reset when done.
