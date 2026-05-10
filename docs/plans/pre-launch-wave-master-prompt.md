# Master Build Prompt — invest.com.au pre-launch sprint

**For:** new Claude Code terminal session
**Created:** 2026-05-09 by prior loop after 29 PRs merged today
**Author of plan:** Claude Opus 4.7 1M-context (pre-launch-wave loop)
**Founder:** Fin (finnduns@gmail.com / finn@invest.com.au)
**Window:** AFSL grant ~2026-11-09 → ~6 months of forced build runway

---

## Mission (the only one — read carefully)

Ship every item below as a complete, production-quality PR. **Nothing half-done. Nothing deferred.** Each PR must include code + tests + types + UI integration + CI green + merged. A feature that ships only the schema with no UI is not "done"; a feature that ships the UI without tests is not "done"; a feature that says "TODO: error handling" is not "done."

The 6-month AFSL pre-launch window is **build runway, not triage time**. Forbidden phrasing: "post-launch", "revisit when X launches", "defer until customer pull", "Tier 3 / skip", "minimum viable for now / polish later." If a Tier-3 reason is genuine (regulatory blocker, supply economics that can't change), state it concretely and ship the parts that don't need that blocker resolved.

Engineering throughput is plentiful (cloud loop ships ~57 commits/day; this loop in burst mode added 29 PRs in one day on 2026-05-09). The bottleneck is **scope discipline** — pick the next concrete thing, ship it end-to-end, move on.

---

## Required reading on first iteration only

Read these once at session start. Re-read on iteration N if anything trips an assumption.

| File | What it tells you |
|---|---|
| `CLAUDE.md` | Codebase conventions, single-source-of-truth helpers, gotchas, test patterns, tier policy |
| `docs/audits/MERGE_AUTHORIZATION.md` | Full Tier A/B/C/D/E definitions |
| `docs/architecture/country-mode.md` | Country-mode infrastructure (already shipped) |
| `docs/plans/sleepy-growing-planet.md` | Original pre-launch plan (PRs #645+X1-X5; mostly done) |
| `docs/plans/investor-account-end-to-end-plan.md` | Full investor-account plan (15 PRs across 5 phases) |
| `docs/plans/pre-launch-wave-status.md` | Live queue + decisions log + observation log |
| `memory:MEMORY.md` | Founder + project memory (loaded automatically each session) |
| `memory:feedback_aggressive_execution.md` | The no-post-launch-deferral rule |
| `memory:feedback_parallel_agent_pattern.md` | How to use parallel Opus agents safely |
| `memory:feedback_pr_workflow.md` | Push from main worktree, never from agent worktrees |
| `memory:cloud_loop_infra.md` | Audit-remediation loop runs concurrently — don't fight it |
| `docs/plans/pre-launch-wave-loop-prompt.md` | Iteration protocol from prior loop (re-use the playbook) |

---

## Working environment

This file works in TWO contexts. Read the right section for yours.

### IF you are a CLOUD AGENT (cron-fired from a RemoteTrigger routine):

You are in a fresh isolated container with a clean git checkout of the repo. No worktree management needed — work directly at the repo root. `npm ci` if `node_modules` is missing. Each cron fire is its own container — there's no cross-fire local state, only what's committed to the repo (status doc + decisions log).

```bash
# First action of every cron fire:
ls node_modules 2>/dev/null || npm ci
git fetch --quiet origin
git checkout main && git reset --hard origin/main
```

### IF you are a LOCAL AGENT (Claude Code on the founder's laptop):

- Primary worktree: the founder's main checkout — has `node_modules` + pre-push hook
- Isolated worktree (REQUIRED for local execution): a separate branch + working dir; symlink `node_modules` from primary on first iter
- Why isolated: 3 concurrent Claude sessions + the audit-remediation cloud loop share the primary worktree. They will switch branches under you and eat your uncommitted changes.

```bash
# First iteration only — local agents:
cd ../pre-launch-wave  # the isolated worktree dir; create with `git worktree add` if missing
ls node_modules 2>/dev/null || ln -sf ../invest-com-au/node_modules ./node_modules
```

---

## Coordination (LOOP_PAUSE policy)

`LOOP_PAUSE` exists in the primary worktree. It pauses the audit-remediation cloud loop only — **NOT this loop**. Per founder override 2026-05-09: this loop runs independently. Do not check for `LOOP_PAUSE`.

If multiple Claude sessions try to push the same branch, the second push will fail with non-fast-forward — fetch + rebase + push again. Don't force-push to recover; investigate first.

---

## Queue (in order — strict dependency-respecting sequencing)

Every item below is **ordered**. Don't skip ahead unless the prerequisite is documented as "none".

### Wave 1 — high-leverage compound items (top of queue, ship first)

| # | PR | Scope | Tier | Effort | Prereq |
|---|---|---|---|---|---|
| 1 | **AI Concierge homepage entry** | Move concierge from `/concierge` to homepage hero. Wire RAG to live broker / advisor / fund data so it returns concrete results, not just text. Add booking handoff CTA. Tests for prompt wiring + result rendering. | B | 2 days | none |
| 2 | **Calculator → lead capture funnel** | After every calculator (CGT, mortgage, super, switching cost, broker fee) result, render a lead-capture box: "Save these results + send to a specialist for free review." Pre-fills find-advisor with calc inputs + result. Advisor receives structured handoff. Apply to all 8+ calculators in `app/*-calculator/`. Tests. | B | 1-2 days | none |
| 3 | **JSON-LD audit + ratchet** | Audit every page route for rich-snippet completeness (Article / FAQPage / FinancialProduct / BreadcrumbList / GovernmentService). Add missing JSON-LD. Add a CI gate `scripts/check-jsonld-coverage.mjs` that fails if a public route is missing required schema. Half day. | A | half day | none |
| 4 | **Reverse marketplace ("Post a Request")** | Users post a request ("need an SMSF accountant in Brisbane, $1.2M, retired"). Matched advisors bid (personal pitch + offered fee). User picks. Auction model. New table `lead_requests` + `lead_bids`. Both portals updated (advisor portal: see open requests, submit bid; investor portal: see bids on request, accept). Tests. **Tier C — touches lib/stripe + payment routing.** | C | 4-5 days | none (independent of investor accounts but pairs with) |

### Wave 2 — investor accounts foundation (per emailed plan)

Source: `docs/plans/investor-account-end-to-end-plan.md`. All 15 PRs.

| # | PR | Scope | Tier |
|---|---|---|---|
| 5 | **PR-X5a** | `investor_profiles` migration + RLS + auth wiring | B |
| 6 | **PR-X5b** | Sign-up + portal shell + watchlists | B |
| 7 | **PR-X5c** | Manual Holdings Tracker | B |
| 8 | **PR-X5d** | Portfolio Health Score + Switching Coach | B |
| 9 | **PR-X5e** | CSV import (CommSec / Stake / Selfwealth / NABTrade / IBKR) | B |
| 10 | **PR-X5f** | Tax-time pre-fill + advisor handoff | B |
| 11 | **PR-X5g** | Sharesight OAuth read | B |
| 12 | **PR-X5h** | Goal Tracker | B |
| 13 | **PR-X5i** | Watchlist email alerts (Resend) | B |
| 14 | **PR-X5j** | AI portfolio analysis (engine, AFSL-flagged off) | B |
| 15 | **PR-X5k engineering** | Open Banking / CDR import (engineering only; CDR application is Fin's lane) | B |
| 16 | **PR-X5l** | Investor Pro tier (Stripe subscription, $99/yr) | C |
| 17 | **PR-X5m** | Premium content gating | B |

### Wave 3 — verified reviews + first-home-buyer journey

| # | PR | Scope | Tier |
|---|---|---|---|
| 18 | **Verified user reviews engine** | Email-verified review submission for brokers + advisors + funds. Editorial moderation pattern (mirror PR #441 broker-question moderation). 4-5 dimension scores. Display on entity pages. Trust + 3-5× conversion. | B |
| 19 | **First Home Buyer end-to-end journey** | Eligibility quiz (income/state/cap) → grant calculator (FHOG / FHSS / state) → savings account match → mortgage broker handoff (FHB-specialty filter) → buyers agent handoff. New `/first-home-buyer` hub. Four monetization levers in one funnel. | B |

### Wave 4 — outstanding queue items from prior loop

| # | PR | Scope | Tier |
|---|---|---|---|
| 20 | **Smart recommendations strip** (queue #14) | After find-advisor quiz, save answers + cookie. On subsequent pages render "Based on your profile: matched advisors / brokers / opportunities." Cross-page personalization. | B |
| 21 | **Country rule alerts DB + admin CRUD** (queue #15 part 2) | `country_rule_alerts` table; migrate hardcoded ALERTS_BY_COUNTRY into seed rows; `/admin/country-rule-alerts` CRUD page. Editorial can update without deploys. | B |
| 22 | **Country rule alerts email digest** (queue #15 part 4) | Cron sweep: weekly digest to opted-in investors. Uses Resend. Per-user opt-in (default off). | B |
| 23 | **PR-X3 firm billing dashboard** (queue #10) | `/firm-portal/billing` route. Aggregate `firm_credit_balance_cents` view across firm's advisors. Per-member breakdown, single firm payment method. Tier C. | C |

### Wave 5 — high-leverage smaller wins

| # | PR | Scope | Tier |
|---|---|---|---|
| 24 | **Embed comparison widget** | Iframe widget partners can drop into their pages (broker compare table). Tracking + UTM attribution. Drives referral traffic. | A |
| 25 | **WhatsApp lead capture** | Official WhatsApp Business API integration. Click-to-chat from advisor pages. Huge for HK / India / China visitors. Per-country gated. | B |
| 26 | **Sponsored placement A/B testing** | Rotate which broker is in position 1 for each `/best/[slug]`; track CTR / CR per variant. New `placement_experiments` table + admin dashboard. Ongoing revenue uplift. | B |
| 27 | **Halal / Sharia investing hub** | New `/halal-investing` vertical. Sharia-compliant broker filter + Sharia-screened ETF list + halal-finance specialist advisor handoff. First-mover content for a fast-growing AU segment. | B |

### Wave 6 — auto-rebase / housekeeping

| # | PR | Scope | Tier |
|---|---|---|---|
| 28 | **Stale PR sweep** | At start of each iter, list open PRs from this loop + the audit-remediation loop, rebase any that are mergeable but stale, merge if Tier A and CI green. Runs as part of pre-flight. | maintenance |

---

## Per-PR playbook (the protocol — strict)

### Step 1 — Pre-flight (always, every iter)

CLOUD agents:
```bash
ls node_modules 2>/dev/null || npm ci
git fetch --quiet origin
git checkout main && git reset --hard origin/main
git checkout -b pre-launch/<short-name>-$(date +%H%M%S)
```

LOCAL agents (founder's laptop, isolated worktree):
```bash
cd ../pre-launch-wave
ls node_modules 2>/dev/null || ln -sf ../invest-com-au/node_modules ./node_modules
git fetch --quiet origin
git checkout -B pre-launch/<short-name>-$(date +%H%M%S) origin/main
```

Branch name format: `pre-launch/<short-descriptive-slug>-<HHMMSS-suffix>` so multiple iters don't collide.

### Step 2 — Read the spec

For Wave 2 items: read the relevant section of `docs/plans/investor-account-end-to-end-plan.md`.
For other items: read this prompt's queue table for scope; if details needed, read the source plan referenced.

### Step 3 — Implement (END TO END)

Every PR MUST include:
- Code (the new feature)
- Tests (unit / integration; vitest local must pass)
- Types (no `any`; no `// @ts-ignore`; `npx tsc --noEmit` clean)
- UI integration (if user-facing — mount into the relevant page; don't ship orphan components)
- Data migrations (if schema change — idempotent; rollback documented in header; RLS enabled if user data)
- Documentation if a new pattern (single-line comment is enough; don't write essay)
- A PR description that states what changed, why, tier, test plan

If the feature has more than one logical concern (e.g. PR-X5b = sign-up + portal + watchlists), it can ship as ONE PR if the parts are coherent and ship together. Don't ship sign-up without watchlists. Don't ship API without UI.

**Forbidden output for any PR:**
- "// TODO" / "// FIXME" comments — fix it now or don't ship it
- "// follow-up PR" without a concrete commitment to that follow-up in the queue
- Stub implementations (`return null;`, `throw new Error("not implemented");`)
- Console.log left in code (use `lib/logger.ts`)
- Tests with `it.skip` or `describe.skip`
- Migrations without RLS on user-data tables

### Step 4 — Verify locally

```bash
NODE_OPTIONS="--max-old-space-size=5120" npx tsc --noEmit
NODE_OPTIONS="--max-old-space-size=5120" npx vitest run <new-test-files>
```

If tsc reports errors, fix them. Do not push with errors. Do not bypass with `// @ts-ignore`.

### Step 5 — Commit + push

```bash
git add <specific-files>  # never `git add -A` — could grab founder WIP from main
git commit -m "feat(<scope>): <subject>"  # Conventional Commits
NODE_OPTIONS="--max-old-space-size=5120" git push -u origin HEAD
```

If pre-push hook fails:
- TS error: fix and re-push (NEVER `--no-verify`)
- OOM: ensure NODE_OPTIONS is set
- Stale `.next/types/`: `rm -rf .next/types .next/dev/types` then re-push

### Step 6 — Open PR

**PRECONDITION — duplicate-PR guard (added 2026-05-10).** Before opening, check
no open PR already covers this queue item. The two loops (audit-remediation +
this one) plus manual edits all share the same repo, and 2026-05-10's cleanup
closed nine duplicates. Search by the queue ID and the feature keyword:

```bash
QUEUE_ID="<W4.NN-or-queue-N>"           # e.g. "W4.20" or "queue #14"
FEATURE_KEY="<one stable keyword>"      # e.g. "country-rule-alerts" or "smart-recommendations"

DUP=$(gh pr list --state open --search "$QUEUE_ID OR $FEATURE_KEY in:title" \
        --json number,title,headRefName,createdAt)
if [ "$(echo "$DUP" | jq 'length')" != "0" ]; then
  echo "DUPLICATE — open PR(s) already cover this work:"
  echo "$DUP" | jq .
  # If existing PR is fresh + on track → mark this item as in-flight referencing it; STOP.
  # If existing PR is stale (>7 days, no recent push) → rebase its branch + push there
  # rather than opening a parallel PR. Surface to founder if approaches diverge meaningfully.
  exit 0
fi
```

```bash
gh pr create --base main --head <branch> --title "<conventional-title>" --body "<markdown body with summary, scope, tier, supersedes, test plan>"
```

PR body template:
```
## Summary
<one sentence — what changed>

## Why
<one sentence — why now / what problem it solves>

## Tier
<A / B / C / D / E with reason from MERGE_AUTHORIZATION.md>

## Files
<bullet list>

## Supersedes
_None._
<!-- or: list of #NNN this PR replaces. The auto-close-superseded workflow
reads this section on merge and closes the named PRs with a pointer comment.
Always include the section, even if empty, so the workflow's grep is reliable. -->

## Test plan
- [x] vitest local: <result>
- [x] type-check: clean
- [ ] CI: <pending until run>
- [ ] Visual: <how to verify in dev / preview>

## Tier C extra (if applicable)
<list webhook / payment / migration touches that trigger Tier C>
```

### Step 7 — Apply tier policy

- **Tier A** (docs / data / page UI / additive tests): merge after CI green, no observation
- **Tier B** (refactor / additive API tests / RLS migrations): merge after CI green, **observe Sentry + Vercel for 15 min**, revert if anomaly
- **Tier C** (webhooks / cron / lib/stripe / lib/supabase/admin / AFSL pages / new schema migrations / BB/CC/DD/EE streams): post a `📢 Tier C intent` comment on the PR + **wait 30 min** for STOP unless founder is responsive in chat (in which case merge immediately) → merge → **2hr post-merge observation** (Sentry + Vercel deploy + Stripe events if applicable)
- **Tier D** (PR body says "set X env var first" / has `do-not-merge` label): refuse autonomous merge; queue for founder
- **Tier E** (force-push / branch delete / repo settings / workflow disablement): never autonomous

### Step 8 — Merge

```bash
gh pr merge <N> --squash --admin --delete-branch
gh pr view <N> --json state,mergedAt -q '"#\(.number) \(.state) \(.mergedAt)"'
```

If merge fails because PR is still draft: `gh pr ready <N>` first, then merge.

### Step 9 — Refresh + advance

```bash
git fetch --quiet origin  # primary worktree's main has advanced
git checkout main && git reset --hard origin/main  # in isolated worktree (safe — no local commits here, all are on feature branches)
```

Then go to Step 1 for the next item.

### Step 10 — Update status doc

**This loop is the SINGLE OWNER** of `docs/plans/pre-launch-wave-status.md`.
Every other actor (audit-remediation loop, manual edits, founder, scout cron)
drops their suggested updates as files in `docs/plans/queue-updates/` —
consume that inbox here, then write the integrated update.

Order of operations:

1. **Drain the inbox.** List `docs/plans/queue-updates/*.md` (skip
   `README.md`). Read each — they're free-form notes from other actors
   suggesting status changes, decision-log entries, or cross-references.
   You're the editor: keep what's useful, summarise, drop noise.
2. **Write the integrated update** to `docs/plans/pre-launch-wave-status.md`:
   - Item row → status `done` (with PR# + merge timestamp)
   - Decision log entry if any judgment call was made
   - Observation log entry for Tier C items
   - Cross-references from inbox notes that landed
3. **Delete consumed inbox files** in the same commit. The deletion is the
   trigger that tells the inbox the update has been integrated.
4. Commit message: `chore(plans): status doc reconcile — iter <N> + drained <K> inbox files`.

---

## Failure modes — how to handle each

| Symptom | Action |
|---|---|
| Pre-push hook OOMs | Retry with `NODE_OPTIONS="--max-old-space-size=5120"`. If still OOMs, real TS error elsewhere — investigate, don't bypass |
| TS passes locally but fails in CI | Likely env-var difference. Check CI's `env:` block; may need `vi.stubEnv("X", "")` per CLAUDE.md |
| `git checkout` reverted my files | LOCAL agents only — multi-Claude collision. Re-do the work in your isolated worktree. Verify with `git status` you're on the expected branch before editing. Cloud agents are container-isolated and don't hit this. |
| PR shows OPEN after merge | GitHub eventual consistency — verify with `gh pr view N --json state` after 60s |
| `git rebase` mid-resolve and confused | `git rebase --abort` and start fresh; never `-Xtheirs` blindly |
| Need to amend after CI fail | NEVER `--amend` after CI failure. Make a NEW commit. Push. Let CI rerun |
| LH CWV fails (chronic) | Per founder memory: noise. Admin-merge after eyeballing diff. ≥3 PRs failing only on LH = definitely runner noise |
| CI workflows don't fire after force-push | Symptom: only Vercel checks visible. Fix: `git commit --allow-empty -m "ci: re-trigger"; git push` |
| Audit-remediation loop merges code that conflicts with mine | Rebase onto fresh main; resolve conflicts based on what landed (their merged version usually wins for shared files; my new files survive) |
| Dated-strings gate flags hardcoded dates | Add `// dated-strings-exempt` at top with documented reason, OR wrap dates in `<DatedStatBadge stalesAt="...">...</DatedStatBadge>` JSX |
| Concurrent push race (non-fast-forward) | `git fetch + git rebase origin/<branch> + git push` — never force-with-lease without verifying commits weren't lost |

---

## Reporting cadence

- **Per iter (one-liner):** `iter <N>: <item> → <outcome> (PR #<X>) | <next item>`
- **Per merge:** brief one-line state in the status file
- **Per Tier C announce:** post the announce text to the PR comment (founder gets GitHub notification)
- **When queue is complete:** full retrospective — total PRs shipped, total CI time, any blocks encountered, recommendations for next sprint
- **If blocked >2 iters on same item:** escalate to founder via the chat (not silently retrying)

---

## Termination

Loop ends when:
- All Wave 1-6 items are merged + observation windows passed (success — write retrospective, queue empty)
- A Tier D / E item blocks progress and no other Wave item can proceed (escalate to founder)
- Founder explicitly stops the loop

**Don't stop early:** if you finish Wave 1 + 2 + 3 in a day, immediately start Wave 4 + 5 + 6. The plan exists to fill the runway, not be a "small batch."

---

## Time-bounded operating notes

- **Pre-push hook is slow** (~3-5 min for full type-check). Use isolated worktree's symlinked node_modules so the hook works there
- **CI takes 5-15 min** per PR. Don't wait sequentially — push PRs back-to-back, let CI run in parallel on GitHub. Single Monitor watches multiple PRs
- **Tier C 30-min wait + 2hr observation** is the longest non-CI wait. Use that time to design / push the next item
- **Use parallel Opus agents** for independent items per `feedback_parallel_agent_pattern.md` — agent does work in its own worktree, you push from main worktree

---

## What "high quality, nothing half-done" means in practice

A PR is **done** when:
- ✅ Code shipped + tests shipped + types clean + CI green + merged
- ✅ User-facing: there's a path from a real user action to using the feature (no "it's there in the API but no UI")
- ✅ Schema changes: RLS enabled if user-data; rollback documented; type definitions updated in `lib/database.types.ts`
- ✅ Stripe / webhook / cron changes: tier C announce + observation done; Sentry clean for the window
- ✅ Founder-visible state-of-the-app didn't break (the one regression in PR #632's RTL fix triggered an auto-revert — don't ship without locally testing the surface)

A PR is **NOT done** when:
- ❌ Code shipped but no tests
- ❌ Schema migration shipped but no UI to use it (PR #619 was an exception with the PR #683 follow-up; don't make that the pattern)
- ❌ "TODO: hook this up to the real API" left in code
- ❌ Test files with `it.skip(`
- ❌ "Follow-up PR" mentioned but not added to the queue

---

## Final word

Ship hard. Ship complete. Don't wait. The 6-month window closes on 2026-11-09 with the AFSL grant — every PR shipped before then compounds. Every PR deferred past then is a missed opportunity.

If you finish this entire queue: re-survey FIN_NOTEBOOK + REMEDIATION_QUEUE + the audit reports for the next-tier ideas and start a new wave. Don't stop at "queue done." There's always more compounding work to do in the runway.

— Pre-launch wave loop, 2026-05-09
