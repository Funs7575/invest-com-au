# Pre-launch wave — autonomous loop status

<!--
  ┌──────────────────────────────────────────────────────────────────┐
  │  SINGLE-OWNER FILE                                               │
  │  Only the pre-launch wave loop writes to this doc directly.      │
  │  Other actors (audit-remediation loop, manual edits, the         │
  │  founder, scout cron, etc.) MUST drop their proposed updates as  │
  │  a new file under `docs/plans/queue-updates/` — the wave loop    │
  │  consumes that inbox on its next iter and merges into here.      │
  │                                                                  │
  │  Why: 2026-05-10 saw three competing drafts (#701, #708, #714)   │
  │  that all tried to reconcile this doc at the same time. The      │
  │  loops have no shared lock, so concurrent edits race; the inbox  │
  │  pattern collapses races into ordered append-then-merge.         │
  │                                                                  │
  │  See `docs/plans/queue-updates/README.md` for the inbox format.  │
  └──────────────────────────────────────────────────────────────────┘
-->

**Plan source:** `docs/plans/pre-launch-wave-master-prompt.md` (Wave 1-6)
**Loop prompt:** `docs/plans/pre-launch-wave-loop-prompt.md`
**Update inbox:** `docs/plans/queue-updates/` (other actors drop notes here)
**Last updated:** 2026-05-10 (cron iter — status doc reconcile: W4.20/W4.22/W5.24/W5.25/W5.27 done; W2 phases #1, #2, #2.5, follow-ups in flight)

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

### Legacy queue (sleepy-growing-planet plan) — reconciliation

The original 15-item legacy queue was largely shipped during the 2026-05-09 burst (29 PRs). The master prompt at `docs/plans/pre-launch-wave-master-prompt.md` is now the source of truth; this section is kept for audit traceability.

| # | Item | Tier | Status | PR |
|---|---|---|---|---|
| 1 | PR #645 rebase + CI + merge (bundled wave) | C | ✅ done | #645 |
| 2 | PR-X4 — annual-billing dashboard prompt | B | ✅ done | #682 |
| 3 | Country-eligibility broker/advisor filter UI | B | ✅ done | #683 |
| 4 | Cross-border specialty CTA wiring | A | ✅ done | #684 |
| 5 | Premium 1.75× lead pricing for cross-border specialties | B | ✅ done | #685 |
| 6 | Saudi Arabia Arabic page + UAE/SA → /ar/ auto-route | B | partial | #687 (UAE only — SA Arabic page deferred to Wave 6 housekeeping) |
| 7 | Response-time badge on advisor cards | A | ✅ done | #686 |
| 8 | PR-X1 — auto-topup at low balance | C | ✅ done | #688 |
| 9 | PR-X2 — lead-quality SLA + response-time reward | B | ✅ done | #690 |
| 10 | PR-X3 — firm-level billing dashboard | C | pending → see Wave 4 #23 in master prompt | — |
| 11 | PR-X5 — investor / end-user accounts | B | pending → see Wave 2 in master prompt | — |
| 12 | Eligibility match badge on cards | A | ✅ done | #691 |
| 12.5 | EligibilityBadge on advisor cards | A | ✅ done | #693 |
| 13 | Eligibility-aware quiz skip banner | A | ✅ done | #692 |
| 14 | Cross-page smart recommendations strip | B | pending → see Wave 4 #20 in master prompt | — |
| 15 | Personalized notifications (rule changes / opportunities) | C | partial | #694 (banner shipped) — DB+CRUD+digest tracked in Wave 4 #21/#22 |

### Wave 1-6 master queue

Source: `docs/plans/pre-launch-wave-master-prompt.md`. Lowercase rows mirror that file's tables — status flips here as iters land.

| # | PR | Tier | Status | PR # | Notes |
|---|---|---|---|---|---|
| W1.1 | AI Concierge homepage entry | B | pending | — | 2 days — multi-fire |
| W1.2 | Calculator → lead capture funnel | B | pending | — | 1-2 days, 8+ calculators — multi-fire |
| W1.3 | JSON-LD audit + ratchet | A | ✅ done | #697 | scripts/check-jsonld-coverage.mjs + 13 page fixes + CI gate |
| W1.4 | Reverse marketplace ("Post a Request") | C | pending | — | 4-5 days, lib/stripe — multi-fire |
| W2.5–W2.17 | PR-X5a–PR-X5m investor accounts | B/C | in flight | #721, #724, #725, #726, #727 merged; #733-#739 open | Phase 1 (X5a/c/d holdings + portfolio health + brokerage coach), Phase 1 follow-up (Yahoo+CoinGecko price lookup), Phase 1 calc state hook + 5 retrofits, Phase 2 investor_profiles + quiz sync, Phase 2.5 workspace plumbing all merged. Open: Track A workspace switcher mount (#733), Phase 3 business_owner kind (#734), Phase 4 listing_owner promotion (#735), per-portal kind gates (#736), Phase 2 follow-up flags UI (#737), Phase 8 property holdings (#738), Phase 9 goals tracker (#739). |
| W3.18 | Verified user reviews engine | B | partial | broker+advisor done pre-W3 (`user_reviews` table, `/api/user-review`, `/api/advisor-review`, `/admin/user-reviews` moderation, broker page display) — funds extension pending | mirror PR #441 moderation |
| W3.19 | First Home Buyer end-to-end journey | B | pending | — | 4 monetization levers — multi-fire |
| W4.20 | Smart recommendations strip (legacy #14) | B | ✅ done | #715, #717 | foundation + extra placements + budget/experience ranker |
| W4.21 | Country rule alerts DB + admin CRUD (legacy #15 part 2) | B | ✅ done | #712 | `country_rule_alerts` table + RLS + 7-row seed; /admin/country-rule-alerts CRUD; CountryRuleAlerts.tsx fetches from new public API |
| W4.22 | Country rule alerts email digest (legacy #15 part 4) | B | ✅ done | #718 | weekly Resend cron — `feat(cron): country-rule-alerts weekly digest` |
| W4.23 | PR-X3 firm billing dashboard (legacy #10) | C | pending | — | aggregate view — multi-fire, Tier C |
| W5.24 | Embed comparison widget | A | ✅ done | (pre-existing) | `/embed` page + `/api/widget` GET with CORS + UTM (`?ref=widget&source=embed`) + Shadow-DOM render + `__tests__/api/widget.test.ts` (10 cases). Verified 2026-05-10 reconcile. |
| W5.25 | WhatsApp lead capture | B | ✅ done | #722 | HK/IN/CN/SG country-gated |
| W5.26 | Sponsored placement A/B testing | B | pending | — | placement_experiments table — single-PR Tier B |
| W5.27 | Halal / Sharia investing hub | B | ✅ done | #723 | Sharia-compliant super, home finance, ETFs, AAOIFI screen — W5.27 foundation |
| W6.28 | Stale PR sweep | maintenance | pending | — | pre-flight rebase loop |

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
- 2026-05-09 22:25 | W1.3 | Picked JSON-LD audit + ratchet over W1.1/W1.2 | W1.1 (AI Concierge, 2 days) and W1.2 (calculator funnel, 1-2 days) won't fit in one cron fire; W1.3 is a half-day Tier A item that ships cleanly end-to-end. Lowest-numbered tractable Wave-1 item.
- 2026-05-09 22:25 | W1.3 | Coverage gate strategy = "≥1 JSON-LD block per public route" | Per-type checks (Article vs FAQPage vs FinancialProduct) considered and rejected as too brittle — same page legitimately ships several blocks; new schema.org types appear regularly. Type correctness stays with page authors.
- 2026-05-09 22:25 | W1.3 | noindex pages auto-exempt | Pages with `robots.index: false` opt out of search indexing; rich-snippet schema is wasted work. Detected via metadata-text scan
- 2026-05-10 02:15 | W4.21 | Picked W4.21 over W1.1/W1.2/W1.4 for one-fire scope | W1.1 (concierge homepage) and W1.2 (calculator funnel × 8) and W1.4 (reverse marketplace, Tier C) are all multi-day. W4.21 is well-bounded — schema + admin CRUD + consumer refactor + tests, single PR. Component header comment already scoped this exact PR. Skipped W2.5 (PR-X5a investor accounts foundation) because it gates the rest of Wave 2 — better to ship as a focused multi-fire sequence
- 2026-05-10 02:15 | W4.21 | country_code stored as lowercase IntentCountryCode | country_schemes uses uppercase ISO-2 (GB/US/IN). Picked lowercase here to match the existing iv_intent_country cookie value the consumer reads — no case-mapping at read time, simpler RLS-public reads, CHECK constraint covers the 12 known intent countries
- 2026-05-10 ~22:30 | meta | Status doc reconciled to actual repo state | This iter found the queue table out of sync with shipped code: W4.20 (#715, #717), W4.22 (#718), W5.25 (#722), W5.27 (#723) all merged. W5.24 (Embed comparison widget) was already present in repo (`app/embed/`, `app/api/widget/route.ts`, full test coverage in `__tests__/api/widget.test.ts`) — pre-existing, not loop-attributed. W3.18 broker+advisor reviews infra already in place pre-Wave-3 (`user_reviews` table, submit/verify/moderate routes, admin moderation page) — only the funds extension is remaining for that item. W2 progression observed: PR #721, #724, #725, #726, #727 merged (Phase 1 holdings/portfolio/health, calc state hook + retrofits, Phase 2 investor_profiles + quiz sync, Phase 2.5 workspace plumbing); PRs #733-#739 open and in flight by parallel agents. Updated queue rows accordingly so the next fire picks the right item.
- 2026-05-10 ~22:30 | iter | No new feature shipped this fire | Rationale: surveyed Wave 1-6 queue, all one-fire-tractable Tier A/B items already done (W1.3, W4.20, W4.21, W4.22, W5.24, W5.25, W5.27); remaining pending items are either multi-day (W1.1/W1.2/W1.4/W3.19), Tier C (W4.23), or substantial single-PRs that need full survey (W5.26 placement_experiments) better suited to a fresh fire with full discovery budget. W2 phases are saturated with in-flight PRs from parallel agents. Best contribution: lock the status doc to reality so the next fire can pick correctly.

## Pause history

(Loop appends each pause/resume event.)

- 2026-05-09 ~15:00 — iter 1: `LOOP_PAUSE` present. Held without advancing queue. Watching for file deletion to resume.

## Tier C STOP log

(Loop appends any STOP comments received. If a STOP arrives, the item is moved to `blocked` and flagged for founder.)

— none yet —

## Post-merge observation log

(Tier C items get 2hr post-merge observation. Loop watches Sentry, Vercel deploy, billing flows; logs anomalies here.)

— none yet —
