---
description: Run one scout fire — re-audit the codebase, append new queue items for findings not yet tracked.
---

# /audit-remediation-scout

A dedicated **discovery** fire. Doesn't ship code; only updates the queue.

The scout is the loop's eyes. Where `/audit-remediation-iteration` *consumes* the queue, the scout *extends* it — by re-running the audit toolkit and appending new items for anything the existing queue doesn't already cover.

**Cadence (updated 2026-05-09):** primary path is now **on-demand** — the founder runs `/audit-remediation-scout` from any session when discovery is wanted (after a stream completes, after a quiet ship-rate stretch, or after suspicious gaps are noticed). The daily cloud routine has been **downgraded to every 3 days at 02:00 UTC** (was daily) to drop one fixed-cost ~50k token baseline per day. Fully on-demand was considered but kept as a backstop in case the founder forgets to fire it manually.

**On-demand triggers worth knowing:**
- After a stream is marked `_complete_` in the queue — fresh discovery may find adjacent gaps that the stream's tunnel-vision missed.
- After 48h with ship-rate < 5 merged PRs/day — the loop may be starving for unblocked items; a scout fire might surface a quick win.
- After a major schema change or migration lands — the per-iteration discovery sweep won't catch system-wide drift.

**Sibling to:** the per-iteration discovery sweep (Phase 6.5 of `/audit-remediation-iteration`). The per-iteration sweep catches drift in the area being worked. The scout catches systemic drift across the whole codebase. Both are needed — the per-iteration sweep is a tiny audit per iteration, the scout is a full audit per day.

---

## Inputs

- `docs/audits/REMEDIATION_QUEUE.md` — what's already tracked
- `npm run audit:*` scripts — automated checks for known classes of drift
- `lib/database.types.ts` vs `supabase/migrations/*.sql` — schema-drift detection
- `docs/audits/metrics-latest.json` — score per metric, falling-behind detection
- `app/api/` — untested route detection
- `supabase/migrations/` — RLS coverage gaps

## Output

Either:

1. **Forward progress:** a single `chore(audit): scout fire <date> — <N> new items` commit on main. Queue's pending sections grow by N items. Print:
```
SCOUT FIRE COMPLETE
- New items added: <count>
- Findings already tracked: <count>
- Findings surfaced as needs-user: <count>
- Commit: <sha>
```

2. **No new findings:** print:
```
SCOUT FIRE COMPLETE
- No new findings; queue is current vs current state of code.
```

Either way, the scout commits no source code. Queue-only.

---

## Phases

### Phase 0 — Lock + sync

```bash
LOCK=.git/audit-remediation-scout.lock
if [ -f "$LOCK" ]; then
  AGE_SECONDS=$(( $(date +%s) - $(stat -c %Y "$LOCK") ))
  if [ "$AGE_SECONDS" -lt 1800 ]; then
    echo "STATUS: LOCKED · scout already running (lock age ${AGE_SECONDS}s)"
    exit 0
  fi
fi
date -u +%FT%TZ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

git fetch origin main
git checkout main && git pull --ff-only origin main
```

The scout's lock is **separate** from the iteration lock — they can run concurrently. The scout is read-mostly except for one queue commit at the end.

### Phase 1 — Run audit scripts

Capture findings from each:

```bash
# Untested API routes
comm -23 \
  <(find app/api -name route.ts -o -name route.tsx | sort) \
  <(find __tests__ -name "*.test.ts" | xargs grep -lE "app/api" 2>/dev/null | sort) \
  > /tmp/scout-untested-routes.txt

# Migrations missing RLS
grep -L "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql > /tmp/scout-no-rls.txt

# Tables in types.ts not in any migration (schema drift)
node -e "const t=require('./lib/database.types').Database.public.Tables; console.log(Object.keys(t).join('\n'))" 2>/dev/null | sort > /tmp/scout-types-tables.txt
grep -hE '^CREATE TABLE [a-zA-Z_.]+\b' supabase/migrations/*.sql | sed -E 's/.*CREATE TABLE (IF NOT EXISTS )?([a-zA-Z_.]+).*/\2/' | sort -u > /tmp/scout-migration-tables.txt
comm -23 /tmp/scout-types-tables.txt /tmp/scout-migration-tables.txt > /tmp/scout-drift-tables.txt

# admin.ts importers in user paths (tier-C escalation)
grep -rn "from ['\"]@/lib/supabase/admin['\"]" --include="*.ts" --include="*.tsx" app/ \
  | grep -vE "(api/admin|api/cron|api/webhooks|/admin/)" \
  > /tmp/scout-admin-leaks.txt

# Routes without Zod
for f in $(find app/api -name route.ts); do
  if ! grep -q "from ['\"]zod['\"]" "$f"; then echo "$f"; fi
done > /tmp/scout-no-zod.txt

# npm-script audits (each emits its own findings)
npm run audit:rate-limits 2>&1 | tee /tmp/scout-rate-limits.txt
npm run audit:dated-strings 2>&1 | tee /tmp/scout-dated-strings.txt
npm run audit:stripe-idempotency 2>&1 | tee /tmp/scout-stripe-idempotency.txt
npm run audit:console-calls 2>&1 | tee /tmp/scout-console-calls.txt
npm run audit:duplicate-functions 2>&1 | tee /tmp/scout-duplicate-functions.txt
npm run audit:stale-branches 2>&1 | tee /tmp/scout-stale-branches.txt
```

If any audit script fails, log the failure and continue — one missing audit doesn't kill the scout fire.

### Phase 2 — Diff against queue

For each finding, dedupe in **two passes** (added 2026-05-09 after the AA-01..05 / BB-01..05 false-positive sweep — 10/10 scout-generated DISC items were rejected by iteration agents because they overlapped already-tracked stream coverage):

**Pass 1 — Stream-section dedupe (NEW, runs first).** Map the finding to its stream-letter (table below). Check if `## <Stream> ` or `| <Stream> |` exists in `REMEDIATION_QUEUE.md`. If the stream is documented AND has any unmerged items, only proceed to Pass 2 when the finding is a **specific gap not implied by the stream description**. Examples:

- ❌ Skip: stream BB exists ("calculator farm — borrowing power, CGT, mortgage stress…") and the finding is `components/calculators/CGTCalculator.tsx has no test`. The stream description already covers calculator work; the iteration agent will catch this as part of the BB-* item that ships the calculator. Adding a BB-DISC row creates a false-positive sweep.
- ✅ Proceed to Pass 2: stream BB exists and the finding is `lib/financial-math.ts has 24% test coverage`. Lib-level coverage is not implied by the stream's per-calculator scope; this is a specific gap.
- ✅ Proceed to Pass 2: stream X is documented as "clear createAdminClient from 17 RSC pages" but the finding is `app/api/internal-only/route.ts uses createAdminClient + has no auth gate`. The route handler is API-side, not RSC; explicitly outside the stream's scope.

If unsure whether the finding is "implied by the stream description," **skip it** — the per-iteration discovery sweep (Phase 6.5 of `/audit-remediation-iteration`) will surface it when an iteration touches the area. Missed findings are recoverable; FP sweeps cost ~5k tokens each.

**Pass 2 — Literal-symbol dedupe (existing).** Grep `REMEDIATION_QUEUE.md` for the file path or symbol. If found, skip — already tracked. If not, prepare an append.

Stream-letter mapping (so new items go to the right queue section):

| Finding kind | Stream | Item-ID prefix |
|---|---|---|
| Untested API route | D | `D-DISC-<YYYYMMDD>-NN` |
| Migration missing RLS | B | `B-DISC-<YYYYMMDD>-NN` |
| Schema drift (table in types but no migration) | A | `A-DISC-<YYYYMMDD>-NN` |
| `admin.ts` import in user path | C | `C-DISC-<YYYYMMDD>-NN` |
| Route without Zod | E | `E-DISC-<YYYYMMDD>-NN` |
| Rate-limit gap | I | `I-DISC-<YYYYMMDD>-NN` |
| Dated string without badge | V | `V-DISC-<YYYYMMDD>-NN` |
| Stripe handler missing idempotency replay | J | `J-DISC-<YYYYMMDD>-NN` |
| Lib coverage <60% | R | `R-DISC-<YYYYMMDD>-NN` |
| Raw `console.*` call in app/lib/components/hooks | F | `F-DISC-<YYYYMMDD>-NN` |
| Lib export shadowed by local redefinition | F | `F-DISC-<YYYYMMDD>-NN` |
| Stale unmerged remote branch (≥7 days) | I | `I-DISC-<YYYYMMDD>-NN` (status `needs-user`) |

### Phase 3 — Append + push

- Cap at **50 new items per fire**. If more, take the top 50 by stream priority order in `REMEDIATION_DEFAULTS.md`.
- Append each new item to its stream's section in `REMEDIATION_QUEUE.md`. Status `pending`. Notes column: `Surfaced by scout fire <date>. <one-line description of the finding>.`
- For findings that need a decision (e.g. "this admin.ts import — refactor or document?"), surface as `needs-user` with a 2-3 option decision matrix in the queue's "Blocked — needs human input" section.
- Single commit: `chore(audit): scout fire <date> — <N> new items`. Body lists the per-stream counts.
- Push direct to main (Tier A — queue update only, same pattern as `/audit-remediation-iteration` Phase 7).

### Phase 4 — Exit

Print the summary lines from the Output section above. Done.

---

## Hard rules

- **Never** modify or remove existing queue entries. Only append.
- **Never** ship source code. Scout = queue updates only.
- **Skip findings already in `done` or `false-positive` status** — verified-resolved items shouldn't reappear.
- **Cap at 50 new items per fire.** Bulk discovery should surface as a `SCOUT-BACKLOG` summary entry, not as 200 individual rows.
- **Confidence floor:** only append findings you'd bet the founder would also flag. Aspirational discovery is noise; missed real issues are recoverable on the next fire. **Test:** if you cannot quote the exact failing audit-script line / file path / table name that proves the gap exists, the finding is below the floor — drop it. Do not append findings derived from "the codebase ought to have X."
- **Stream-section dedupe is mandatory** (Phase 2, Pass 1) — adding a `<STREAM>-DISC-NN` for work already implied by the stream's description is the most common scout failure mode (10/10 false positives in the 2026-05-08 fire). When in doubt, skip and let the per-iteration discovery sweep catch it.
- **FP rate gate:** if the most recent scout fire produced ≥3 items that subsequent iterations swept as false-positive, the next scout fire opens a `[ACTION REQUIRED]` issue instead of writing items, asking the founder to review the dedupe rules.
- **Lock is separate** from the iteration lock — scout can run concurrently with iterations.
- **No live-DB queries.** If the scout would need live DB access (e.g. row counts, advisor findings), surface as `needs-user` with a SQL snippet for the founder to run via Supabase MCP.

---

## Why this exists

Without the scout, the only way new items enter the queue is human-driven discovery. Every issue you don't notice slips through until the next quarterly audit (or the next incident). The scout closes that loop:

- **Per-iteration discovery sweep** (Phase 6.5 of `/audit-remediation-iteration`) catches issues in the area being actively worked.
- **Daily scout fire** catches issues anywhere in the codebase, regardless of whether anyone touched them today.

Together: each day the queue moves forward by ~50-100 items consumed and ~5-30 items appended (mostly tiny things). The queue stays coherent with the codebase's real state instead of drifting out of date.

---

## When to STOP the scout

Disable the cloud routine when the queue is genuinely complete (every audit script passes clean for ≥2 consecutive fires). Until then, the scout runs daily.
