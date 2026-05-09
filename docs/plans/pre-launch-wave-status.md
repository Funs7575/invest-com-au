# Pre-launch wave — autonomous loop status

**Plan source:** `docs/plans/sleepy-growing-planet.md`
**Loop prompt:** `docs/plans/pre-launch-wave-loop-prompt.md`
**Last updated:** 2026-05-09 (initial design)

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
| 2 | PR-X4 — annual-billing dashboard prompt | B | 🔄 PR open, CI in flight | #682 | 4 files, +110 lines, 8/8 vitest local |
| 3 | **NEW: Country-eligibility broker/advisor filter UI** | B | pending | — | Schema (PR #619+#623) is wasted until UI reads it. Half day. ~$5-10k MRR uplift. Filter `/best/[slug]` + `/find-advisor` by visitor's `iv_intent_country` against `country_eligibility.allowed_countries`/`blocked_countries` |
| 4 | **NEW: Cross-border specialty CTA wiring** | A | pending | — | FIN_NOTEBOOK 2026-05-01 Phase A remaining. Half day. ~$15k+/yr. Each `/foreign-investment/<slug>` page's "Find specialist" CTA → `/find-advisor?specialty=UK+Pension+Transfer` (mapped per country) |
| 5 | **NEW: Premium 1.75× lead pricing for cross-border specialties** | B | pending | — | FIN_NOTEBOOK Phase A remaining. Half day. ~$15-40k/yr direct margin. Edit `lib/advisor-billing.ts` to apply multiplier when lead specialty matches the cross-border set |
| 6 | **NEW: Saudi Arabia Arabic page + UAE/SA → /ar/ auto-route** | B | pending | — | Completes Phase 5d+5e+5g. ~1 day. Clone UAE Arabic structure for SA; modify LocationFlagButton click handler to route UAE/SA → /ar/...; language toggle |
| 7 | **NEW: Response-time badge on advisor cards** | A | pending | — | Mirror PR-X2 on visitor side. Half day. Badge advisors with `avg_response_minutes < 60` on `/find-advisor` cards. Lifts conversion |
| 8 | PR-X1 — auto-topup at low balance | **C** | pending | — | Highest-stakes; opt-in + $500 cap + 24h cooldown. Tier C announce + 30-min wait + 2hr post-merge observation |
| 9 | PR-X2 — lead-quality SLA + response-time reward (advisor side) | B | pending | — | Pairs with item #7. "Respond in 60 min, next lead at 25% off". Affects ranker; 15-min observation |
| 10 | PR-X3 — firm-level billing dashboard | **C** | pending | — | Aggregates `firm_credit_balance_cents` view across firm's advisors. New `/firm-portal/billing` route |
| 11 | PR-X5 — investor / end-user accounts | B | pending | — | Depends on PR-A1 foundation (in #645). New `investor_profiles` table; auth flows; saved searches/comparisons. Ship in 4 parts: migration → auth scaffold → portal shell → saved-comparisons feature. **NOT** week-sized — pre-launch window has runway, ship parts iteratively |
| 12 | **NEW: Eligibility match badge on cards** | A | pending | — | Visible signal on every broker/advisor/fund card based on visitor's iv_intent_country + country_eligibility column (PR #619). 🟢 accepts / 🟡 visa-required / 🔴 not available. Compounds with PR #683 filter (filter hides incompatible; badge highlights matches). ~half day |
| 13 | **NEW: Eligibility-aware quiz skip banner** | A | pending | — | On /find-advisor entry: "🇺🇰 We have 4 UK-AU specialists — skip quiz?" Reduces quiz friction for users who've already declared country. ~1 day. Item #12 must ship first |
| 14 | **NEW: Cross-page smart recommendations strip** | B | pending | — | After find-advisor quiz, save answers + cookie. On subsequent pages render "Based on your profile: [matched advisors / brokers / opportunities]". Ranker uses quiz intent + country + budget. ~2-3 days |
| 15 | **NEW: Personalized notifications (rule changes / opportunities)** | C | pending | — | In-app banners or email pushes for country-relevant rule changes ("FIRB threshold changes Mar 2026 — affects UK residents"). Per founder 2026-05-09 "no post-launch deferral": ship infra now (table + admin CRUD + banner component), seed with 2-3 real notifications, expand content over the runway |

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

## Pause history

(Loop appends each pause/resume event.)

- 2026-05-09 ~15:00 — iter 1: `LOOP_PAUSE` present. Held without advancing queue. Watching for file deletion to resume.

## Tier C STOP log

(Loop appends any STOP comments received. If a STOP arrives, the item is moved to `blocked` and flagged for founder.)

— none yet —

## Post-merge observation log

(Tier C items get 2hr post-merge observation. Loop watches Sentry, Vercel deploy, billing flows; logs anomalies here.)

— none yet —
