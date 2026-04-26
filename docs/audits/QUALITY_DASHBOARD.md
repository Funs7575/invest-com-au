# Code-Quality Dashboard — operator guide

The 12 quality metrics from the [04-26 audit](2026-04-26-comprehensive-audit.md) tracked weekly through CI, with per-PR delta comments and a single A+..F grade.

## Files

| File | Role |
|---|---|
| `.quality-targets.yml` | Source of truth: 14 metrics (M01 has 3 sub-metrics), targets, weights, direction |
| `scripts/collect-quality-metrics.ts` | Runs the collectors, computes scores, writes JSON snapshot |
| `.github/workflows/code-quality.yml` | Sundays 23:00 UTC — full snapshot + auto-PR if metrics changed |
| `.github/workflows/code-quality-pr.yml` | Per-PR — collects HEAD metrics, posts comparison comment vs `metrics-latest.json` |
| `app/admin/code-quality/page.tsx` | Read-only dashboard at `/admin/code-quality` |
| `docs/audits/metrics-week-0.json` | Hand-authored baseline snapshot (frozen) |
| `docs/audits/metrics-latest.json` | Latest snapshot (overwritten by weekly job) |
| `docs/audits/metrics-history/<YYYY-MM-DD>.json` | Per-week archive |

## Reading the dashboard

`/admin/code-quality` shows:

1. **Overall grade** (A+..F) with weighted score 0–1.
2. **One card per metric** — current value, target, baseline, score %, weight, delta arrow.

Grade scale:

| Weighted score | Grade |
|---|---|
| ≥ 0.95 | A+ |
| ≥ 0.90 | A |
| ≥ 0.80 | B |
| ≥ 0.70 | C |
| ≥ 0.60 | D |
| < 0.60 | F |

Week 0 baseline is **F (0.385)**. Sprint 1 alone is expected to lift it to C/D (M07 plummets from 261 → ~20 after pg_graphql revoke; M09 restores to ~99% once cron silence is fixed). End of 4-month plan target: A.

## Per-PR delta comment

Every PR (unless titled `[skip-quality]`) gets a sticky comment showing:

- `Grade: B → A ⬆️` and weighted-score delta
- Per-metric table: baseline, current on PR head, delta, score%

Comments are upserted (one comment per PR, updated on each push) via `marocchino/sticky-pull-request-comment`.

## Editing targets

When you want to ratchet a target (e.g. M02 from 200 → 230 after Sprint 5 ships some D-stream tests):

1. Edit `.quality-targets.yml`.
2. Commit on a regular feature branch.
3. Next workflow run picks up the new target; PR comment shows the new `target` column.

When you want to add a new metric:

1. Add a `M99_my_new_metric:` block to `.quality-targets.yml` with `label`, `direction`, `unit`, `baseline`, `target`, `weight`.
2. Add a collector in `scripts/collect-quality-metrics.ts` that returns its current value.
3. Update `docs/audits/metrics-week-0.json` to include the new metric so the per-PR baseline diff has something to compare against.

## Manual run

```bash
# Locally — uses Supabase keys from your shell env if set; falls back to
# baseline values for any metric whose collector can't reach the DB.
npx tsx scripts/collect-quality-metrics.ts

# CI — trigger weekly workflow manually
gh workflow run code-quality.yml
```

## Caveats

- **First weekly run depends on secrets.** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set as GitHub Actions secrets for M04, M09, M10, M12 to populate from live data. Without them, those metrics fall through to the baseline values — script doesn't fail.
- **Lighthouse stub.** `LIGHTHOUSE_TOP5` env is currently a placeholder; replace with an actual `treosh/lighthouse-ci-action` step against the Vercel preview URL once Sprint 5 (UI/UX) baseline is captured.
- **Supabase advisor RPC.** M07/M08 currently fall through to baseline. A small `/api/admin/supabase-advisors` route that proxies the management API will close this — track as a follow-up.
- **Migration drift (M05).** Current implementation reports the count of `CREATE TABLE` statements in `supabase/migrations/`, not the precise drift count. Stream A's reconciliation script will produce the exact figure.

## See also

- [`docs/audits/2026-04-26-comprehensive-audit.md`](2026-04-26-comprehensive-audit.md) — origin of the 12 metrics.
- [`REMEDIATION_QUEUE.md`](REMEDIATION_QUEUE.md) — work items that move metrics.
- [`REMEDIATION_DEFAULTS.md`](REMEDIATION_DEFAULTS.md) — loop conventions.
