# Merge Authorization Policy

The decision tree Claude (and any other automated agent) follows when deciding to merge a PR to `main`. The goal is to bias toward action on routine work while preserving redundancy on anything that could brick production.

**Authoritative for:** the audit-remediation loop, on-demand Claude sessions, the auto-merge GitHub workflow at `.github/workflows/auto-merge*.yml`. Hand-edits to this file take effect on the next iteration / next PR — no rebuild needed.

**Founder-authored PRs are out of scope.** This policy is for agent-authored PRs only. Anything the founder pushes goes through whatever review pattern the founder has set up for themselves.

---

## Why this exists

Without an explicit policy, every merge becomes a per-PR judgment call. The cost of "ask first" is high: the loop stalls, work piles up unmerged, the founder context-switches into a thousand small decisions. The cost of "merge anything" is also high: one bad merge to a webhook handler can break revenue silently for hours.

The fix is a **tiered policy** with **layered safeguards** so the policy can be permissive on the wide majority of changes (tests, docs, UI, RLS migrations passing the isolation gate, etc.) without exposing the small minority of high-blast-radius surfaces.

---

## Tiers

### Tier A — Auto-merge after CI green

**Examples:** tests, docs, content, route-level UI page changes, loop PRs already labelled `auto-merge-safe` by `.github/workflows/auto-merge-labeling.yml`, `__tests__/**` additions, `docs/**`, `content/**/*.md`, `scripts/seed-*.ts`, `app/**/page.tsx` (page-only, not `app/api/**`), `components/Hub*.tsx`, `public/**` (assets), `lib/verticals.ts` (registry data only), `.quality-targets.yml` (metrics targets, not workflow).

**Required gates:**

- All required CI checks green (`Lint · Type-check · Test · Build`, dated-stats, RLS isolation, Stripe idempotency, secret scan, dependency vulnerabilities, bundle size).
- `mergeStateStatus = CLEAN` per GitHub.
- Diff ≤ 1500 LOC.
- No `STOP` comment on the PR.
- Not the first-of-pattern under `.github/auto-merge-state.json`.

**Action:** merge with `gh pr merge <N> --squash --delete-branch=false`. No confirmation required. No countdown.

### Tier B — Auto-merge after CI green + 15-min observation

**Examples:** refactors that pass all gates, additive API tests for new routes, RLS migrations that pass the V-NEW-04 isolation gate, dependency lockfile bumps from Dependabot for non-major versions.

**Required gates:** all of Tier A's gates, plus:

- The `Lint · Type-check · Test · Build` job ran the **full** suite (not the path-skipped variant).
- Bundle size delta < 5% of base.

**Action:** merge after a 15-minute quiet window during which any failing post-merge CI on `main` is treated as a regression and triggers a `git revert` PR. The 15 min is the time window for the audit loop to catch a bad change before the next iteration picks it up.

### Tier C — Announce intent + merge unless STOPped

**Examples:** anything touching the high-blast-radius paths:

- `app/api/webhooks/**`, `app/api/cron/**` (revenue / scheduled paths)
- `middleware.ts`, `proxy.ts` (auth gate)
- `lib/supabase/admin.ts`, `lib/auth/**`, `lib/stripe/**`, `lib/compliance.ts`
- `.github/workflows/**` (the safety system itself)
- `*.env*`, `*rls*`, `*policy*` patterns
- Stream prefixes BB (calculators with regulatory math), CC (AI features), DD (Stripe / marketplace), EE (distribution / embeds)
- New `supabase/migrations/**` SQL files
- ESLint / Prettier / TypeScript config changes

**Required gates:** all of Tier B's gates, plus:

- Rollback section in the PR body or commit message ("revert this commit + restore via [path]").
- Explicit pre-merge announcement to the founder ("about to merge #N — does X, rollback is Y, CI is green").
- 1-sentence wait. If the founder replies with `STOP` or any "hold" / "wait" / "no" within the wait, abort. Anything else (including silence followed by the next message being unrelated) counts as confirmation — don't re-ask.

**Action:** announce, then merge with `gh pr merge <N> --squash --delete-branch=false`.

### Tier D — Hard hold (don't merge regardless of tier)

**Triggers:**

- PR body contains a "REQUIRES" / "must be set" / "before merging" / "blocks merge" callout for an external precondition (env var in Vercel, secret in GH Actions, manual migration to live DB, etc.) that the founder hasn't confirmed satisfied.
- PR is in the security-review-pending list at `docs/audits/SECURITY_REVIEW_PENDING.md` (not yet created).
- PR has the label `do-not-merge` or `needs-founder-decision`.

**Action:** never merge until the precondition is satisfied. Surface the blocker to the founder; ask them to confirm before unblocking. Don't proceed even if the founder says "merge everything" — Tier D is the "I trust you, but the PR itself says wait" case.

### Tier E — Never autonomous

**Triggers:**

- Force-push to any branch
- Branch deletion (other than auto-cleanup of merged stream branches if explicitly opt-in)
- GitHub repo Settings change
- Disabling, removing, or relaxing any `.github/workflows/*.yml`
- Any operation that `git revert HEAD` on `main` cannot undo (e.g., `git filter-branch`, `git reset --hard origin/main` on a shared branch)

**Action:** require explicit founder consent every time. Don't memorise the consent — fresh consent each time, even if the same operation was approved earlier in the session.

---

## Layered safeguards

The tiers are the policy. The safeguards are the redundancies that catch a bad call regardless of which tier was applied.

| # | Layer | What it catches |
|---|---|---|
| 1 | **Required CI gates** | Type errors, lint failures, broken tests, missing RLS, Stripe webhook regression, secrets in commits, dependency CVEs, oversized bundles |
| 2 | **Auto-merge path denylist** (`.github/workflows/auto-merge-labeling.yml`) | Anything in the Tier C path list automatically gets `needs-human-review` label, blocking the auto-merge job from squash-merging it without an explicit promotion |
| 3 | **`STOP` comment escape hatch** | Anyone with write access can post `STOP` on any PR. The auto-merge workflow re-checks STOP on every poll, even after the countdown is already running |
| 4 | **Post-merge `main` CI watch** | After every merge, watch the next CI run on `main`. If it goes red within 15 min, open a revert PR and notify the founder. (Implementation pending — track as `I-NEW-02`.) |
| 5 | **Rollback documented in commit body** | Every Tier B/C merge commit body has a "Rollback: revert this commit + restore via [path]" line. Searchable via `git log --grep=Rollback`. Reduces "what does this change do?" panic during incidents |
| 6 | **First-of-pattern force-flag** | The first PR introducing each new component / template / handler pattern is force-flagged `needs-human-review` even if it would otherwise be Tier A. Subsequent PRs of the same pattern flow normally |
| 7 | **Branch protection on `main`** *(currently OFF — recommended ON)* | If enabled with required checks, layer 1's gates become merge-blocking at GitHub's level, not just at the auto-merge workflow's level |

If any one layer fails, the others catch it. Layer 1 (CI gates) is the most reliable and the most thorough; layer 4 (post-merge watch) is the cheapest backstop.

---

## What the agent does each merge

```
1. Identify tier from path / stream / PR body
2. Verify all required gates green (CI, mergeStateStatus, diff size, no STOP comment)
3. If Tier A:    merge immediately
   If Tier B:    merge, then watch main CI for 15 min
   If Tier C:    announce in chat, merge unless STOP within 1 sentence
   If Tier D:    refuse; surface blocker; do not merge
   If Tier E:    refuse; require explicit fresh consent
4. After merge: verify the merge commit landed; verify next main CI run is healthy
5. If main breaks within 15 min: open a revert PR, notify founder, do not merge anything else until resolved
```

---

## Counter-pressure rules (anti-patterns to avoid)

- **Don't re-ask the same question.** If the founder said "merge everything routine", don't re-confirm on the next routine PR. Apply the policy.
- **Don't use Tier C announcement as a stalling tactic.** Announcement is a 1-sentence heads-up, not a request for permission. Default to `merge` after the wait, not to `hold`.
- **Don't downgrade tier under pressure.** If a PR is Tier C, it stays Tier C even if the founder says "go faster". The policy is the policy. The founder can update the policy by editing this file; until then, follow it.
- **Don't bundle Tier C work into Tier A PRs.** Splitting the work into separate PRs by tier is cheap and preserves the policy's leverage.

---

## When this policy changes

Edit this file. The next merge picks up the change. There's no separate enforcement to update — the agent reads this file directly each iteration.

If a tier needs to be tightened (e.g. Tier B → Tier C): add a line in the relevant tier's "Examples" section. The policy is permissive by enumeration, so adding rules tightens.

If a tier needs to be loosened (e.g. Tier C → Tier B): take more care. The cost of a misclassified merge is much higher than the cost of an extra-cautious merge. Loosen incrementally; revert on the first incident.

---

## See also

- `.github/workflows/auto-merge-labeling.yml` — the path-based labeller
- `.github/workflows/auto-merge.yml` — the squash-merge runner with countdown + STOP
- `docs/audits/REMEDIATION_DEFAULTS.md` § "Auto-merge policy" — the loop's reference to this file
- `CLAUDE.md` § "Merge authorization" — one-line pointer here
