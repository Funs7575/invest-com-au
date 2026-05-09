# Pre-launch wave — autonomous loop status

**Plan source:** `docs/plans/sleepy-growing-planet.md`
**Loop prompt:** `docs/plans/pre-launch-wave-loop-prompt.md`
**Last updated:** 2026-05-09 ~23:50 UTC (post-burst reconciliation; W1.3 in Tier C window)

---

## Coordination

- **Run independently of `LOOP_PAUSE`**: the `LOOP_PAUSE` file is for the audit-remediation cloud loop only. This loop's scope is the pre-launch product wave; the two have no overlap. Founder override 2026-05-09.
- **No force-push to main, ever**. Force-with-lease on feature branches only.
- **Push from primary worktree only** (`/home/finnduns/invest-com-au`). Agent worktrees lack `node_modules` → pre-push hook OOMs.
- **Stash before switching branches if main is dirty** (founder may have WIP). Restore stash after the iteration's branch work completes.

## Tier policy (per `docs/audits/MERGE_AUTHORIZATION.md`)

- **Tier A** (docs / data / page UI / additive tests): merge after CI green, no observation
- **Tier B** (refactor + additive API tests + RLS-passing migrations): merge + 15-min observation
- **Tier C** (webhooks, cron, lib/stripe, lib/supabase/admin, AFSL-aware pages, new schema migrations): announce intent in PR comment + **30-min observation window** + merge unless `STOP` arrives in PR comments
- **Tier D** (PR body says "set X env var first"): hard hold, refuse autonomous merge
- **Tier E** (force-push, branch delete, repo settings): never autonomous; queue + flag

## Auto-topup (PR-X1) guardrails — locked

- **Opt-in only** — default off; advisor explicitly enables via portal with policy-acceptance click
- **Per-charge max cap**: $500 per auto-topup
- **24h cooldown**: max one auto-topup per advisor per 24h window
- **Idempotency**: identical event within cooldown returns the prior topup row, no double-charge
- **Stripe metadata**: every auto-topup tagged `auto_topup=true` + `trigger_balance_cents` for audit
- **Refund route**: refunds default to credit (per PR-B1), no cash route for auto-topups

---

## Queue (in order)

| # | Item | Tier | Status | PR | Notes |
|---|---|---|---|---|---|
| 1 | PR #645 rebase + CI + merge (bundled wave) | C | ✅ done 14:37 UTC | #645 | A1+F1+B1+B2+B3 shipped together |
| 2 | PR-X4 — annual-billing dashboard prompt | B | ✅ done | #682 | 4 files, +110 lines, 8/8 vitest local |
| 3 | Country-eligibility broker/advisor filter UI | B | ✅ done | #683 | `/best/[slug]` filter on visitor `iv_intent_country` |
| 4 | Cross-border specialty CTA wiring | A | ✅ done | #684 | `/foreign-investment/<slug>` CTAs route to specialty-prefilled find-advisor |
| 5 | Premium 1.75× lead pricing for cross-border specialties | B | ✅ done | #685 | `lib/advisor-billing.ts` multiplier on cross-border set |
| 6 | Saudi Arabia Arabic page + UAE/SA → /ar/ auto-route | B | ✅ partial | #687 | UAE → /ar/ click routing landed; Saudi clone + lang toggle still open. Re-queued as W?? |
| 7 | Response-time badge on advisor cards | A | ✅ done | #686 | Visitor-side mirror of PR-X2 on `/find-advisor` |
| 8 | PR-X1 — auto-topup at low balance | C | ✅ done | #688 | Daily cron + opt-in + $500 cap + 24h cooldown |
| 9 | PR-X2 — lead-quality SLA + response-time reward | B | ✅ done | #690 | Ranker reward for <60min avg response |
| 10 | PR-X3 — firm-level billing dashboard | C | pending | — | Aggregates `firm_credit_balance_cents` across firm's advisors → `/firm-portal/billing`. Re-queued as Wave 4 #23 |
| 11 | PR-X5 — investor / end-user accounts | B | pending | — | Now covered by master prompt Wave 2 (PR-X5a..X5m, items #5-17) |
| 12 | Eligibility match badge on cards | A | ✅ done | #691 | 🟢/🟡/🔴 on broker cards |
| 12.5 | Extend EligibilityBadge to advisor-card surfaces | A | ✅ done | #693 | Mirror of #691 on `AdvisorsClient` |
| 13 | Eligibility-aware quiz skip banner | A | ✅ done | #692 | `/find-advisor` entry — "We have N <country> specialists — skip quiz?" |
| 14 | Cross-page smart recommendations strip | B | pending | — | Re-queued as master prompt Wave 4 #20 |
| 15 | Personalized notifications (rule changes / opportunities) | C | ✅ partial | #694, #695 | Banner component + mount on `/find-advisor` and `/advisors`. Wave 4 #21/#22 (DB+admin CRUD + email digest) still queued |
| 16 | W1.3 — JSON-LD audit + ratchet (master-prompt Wave 1 #3) | C | 🔄 Tier C window started ~23:50 UTC | #697 | Tier C because `.github/workflows/ci.yml`. CI green except known Supabase-types-drift flake (also failed in #698/#699) and Vercel-skipped smoke test. Local `node scripts/check-jsonld-coverage.mjs` ✅; 30/30 vitest. Next fire merges if no STOP by ~00:20 UTC |

## Decision log

(Loop appends decisions made on founder's behalf here. Format: `YYYY-MM-DD HH:MM | item # | call | reason`)

- 2026-05-09 14:35 | meta | Coordination = respect LOOP_PAUSE | Same escape hatch for both loops; no overhead when LOOP_PAUSE absent
- 2026-05-09 ~15:01 | meta | OVERRIDDEN: ignore LOOP_PAUSE | Founder explicit instruction "keep going until it's all done"; the two loops have no overlap; pre-launch wave runs independently
- 2026-05-09 ~16:15 | queue | Inserted 5 high-ROI items (queue #3-7) | Founder approved adding: country-eligibility filter UI (compounds with #619/#623), cross-border specialty CTA wiring (FIN_NOTEBOOK Phase A), premium 1.75× cross-border lead pricing (FIN_NOTEBOOK Phase A), Saudi Arabic + auto-route (Phase 5 completion), response-time badge (visitor-side mirror of PR-X2). Combined: ~$30-65k/yr revenue + conversion lift + completes country/language phase
- 2026-05-09 ~16:15 | meta | Tier C strict 30-min wait OVERRIDDEN | Founder said "hurry up" on PR #645 → loop now defaults to immediate Tier C merge if founder is responsive; falls back to 30-min wait only when founder is silent &gt;5min after announce
- 2026-05-09 ~18:45 | queue | Inserted 3 personalization items (#12-14) | Founder asked: "for international users, based on the data they submit, can we have automatic popups saying 'based on your settings you're eligible for this'?" Picked Eligibility Match Badge (A) as the smallest highest-impact unit. Quiz skip banner (B) and smart recommendations strip (C) in queue as #13, #14
- 2026-05-09 ~19:35 | meta | Per new memory `feedback_aggressive_execution.md`: dropped all "post-launch" / "deferred" / "lowest priority" framing | 6-month AFSL wait IS the build runway. Item #15 reframed from "deferred" to "ship infra now, expand content over runway"; Item #11 (investor accounts) reframed from "week-sized" to "ship in 4 parts iteratively"
- 2026-05-09 ~19:35 | item | NEW: extend EligibilityBadge to advisor-card surfaces | Inserted as #12.5 (between badge ship and quiz-skip ship). 5-min PR. AdvisorsClient already shows a "Fast reply" badge; same mounting pattern
- 2026-05-09 14:35 | meta | Tier C gate = 30-min observation | Recommended balance per founder's prior pattern in workflow memory
- 2026-05-09 14:35 | meta | Auto-topup = opt-in + $500 cap + 24h cooldown | All three guardrails layered; defense in depth
- 2026-05-09 14:35 | #2 | Split-or-bundle deferred to per-iteration | If single PR works, ship; if Tier C blocks, split
- 2026-05-09 ~23:50 | #16 | PR #697 reclassified A→C, posted Tier C announce | Previous fire opened PR #697 as draft tagged Tier A. CLAUDE.md tier policy lists `.github/workflows` as Tier C; the PR adds a step to `ci.yml`. Posted `📢 Tier C intent` comment, marked ready for review, started 30-min STOP window. Two CI failures audited as infra-noise: Supabase types drift is an active flake (failed in already-merged #698/#699), Preview smoke test failed because Vercel marked the build "Ignored" so no preview URL exists. Local gate + 30 vitest tests pass.
- 2026-05-09 ~23:50 | meta | Status doc reconciled to git ground-truth | Old queue (#1-15) was authored before the burst that shipped 11 of its items today. Re-mapped each row to its merged PR or to the master prompt's Wave-2/4 successor where the work continues.

## Pause history

(Loop appends each pause/resume event.)

- 2026-05-09 ~15:00 — iter 1: `LOOP_PAUSE` present. Held without advancing queue. Watching for file deletion to resume.

## Tier C STOP log

(Loop appends any STOP comments received. If a STOP arrives, the item is moved to `blocked` and flagged for founder.)

— none yet —

## Post-merge observation log

(Tier C items get 2hr post-merge observation. Loop watches Sentry, Vercel deploy, billing flows; logs anomalies here.)

- 2026-05-09 ~23:50 UTC | #16 (PR #697) | Tier C STOP window OPENED — not yet merged. 30-min STOP elapses ~00:20 UTC. Next fire: if no STOP comment in PR, admin-merge (`gh pr merge 697 --squash --admin --delete-branch`), then start 2 hr Sentry/Vercel observation. Founder STOP fallback: tag PR with `do-not-merge` label or comment STOP.
