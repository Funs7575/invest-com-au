<!--
  LAUNCH HOTFIX TEMPLATE
  Use this template when you are fixing a single bug during the launch
  window (T-24h to T+4 weeks per docs/runbooks/launch-day.md).

  How to use:
    gh pr create --template launch-hotfix.md
    or open the PR in the browser and pick "launch-hotfix" from the
    template dropdown.

  Hard rules:
  - One bug per PR. No unrelated cleanups, refactors, or feature work.
  - Add the severity label (P0 / P1 / P2 / P3) per docs/ops/severity-matrix.md.
  - Add the `launch-hotfix` label.
  - Merge tier follows the severity (P0 → Tier C; P1 → Tier B; P2/P3 → Tier A
    unless inside the launch freeze window per launch-day.md).
-->

## Bug

<!-- One sentence: what's broken, and the smallest reproducible example. -->

## Severity

<!-- Pick one and delete the rest. Justify if it's not the obvious choice. -->

- [ ] **P0** — Site down / data loss / payment broken / security incident
- [ ] **P1** — Major feature broken for many users, no data loss, workaround exists
- [ ] **P2** — Minor feature broken or visibly off
- [ ] **P3** — Cosmetic / edge-case / content correction

Reference: `docs/ops/severity-matrix.md`

## Root cause

<!-- One paragraph. Why did this happen? What did we miss? Don't summarise the
     diff — explain what was wrong about the previous behaviour. -->

## Fix

<!-- One paragraph. What did you change, and why is this the smallest
     viable fix? If you considered a wider change, say what and why you
     rejected it. -->

## Rollback

<!-- REQUIRED. How do we undo this if the fix makes things worse? -->

- [ ] Vercel rollback by deployment ID is sufficient (default for code-only changes)
- [ ] Migration rollback steps documented in the migration file header
- [ ] Feature flag flip — flag name: `<flag>` (set to `false` via `/admin/automation/flags`)
- [ ] Other (describe): <!-- e.g. cron pause, env var unset, manual DB row edit -->

Cross-ref: `docs/runbooks/launch-rollback.md`

## Test plan

<!-- What did you actually run / click / curl to verify the fix? Not
     "tests pass" — what specifically? -->

- [ ] `npm run type-check`
- [ ] `npm test -- <changed files>`
- [ ] Manual reproduction confirmed broken before, fixed after
- [ ] Vercel preview verified (URL: <!-- paste -->)
- [ ] (P0/P1 only) Smoke checked the affected user flow on preview

## Hotfix discipline checklist

- [ ] One bug per PR — no piggy-backed changes
- [ ] No new features, no refactors, no formatting churn
- [ ] Diff fits on one screen (target: < 100 lines changed)
- [ ] Severity label added
- [ ] `launch-hotfix` label added
- [ ] Linked to the bug-report row / Sentry issue / runbook (if applicable)

## Comms

<!-- Only required for P0 / P1 with public visibility. -->

- [ ] Status page updated — link: <!-- paste -->
- [ ] Reply sent to bug reporter using `docs/ops/launch-canned-responses.md` (3a fixed-now)
- [ ] N/A — internal-only or no public-facing impact
