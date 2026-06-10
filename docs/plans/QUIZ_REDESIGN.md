# Quiz Redesign — Master Plan

**Status:** design locked, build sequenced. Synthesis of a 5-agent deep audit (data/matching, intent architecture, competitive/CRO research across ~20 sources, a11y/QA, technical+bots) of invest.com.au's advisor-matching funnel.

---

## 0. Build status — START HERE (updated 2026-06-09)

Shipped on **PR #1477** (branch `claude/epic-newton-g5ml7l`), all green:
- **Phase 0 ✓** — data-integrity P0s + client robustness (§4).
- **Phase 2 (advisor matching) ✓** — `lib/quiz-advisor-scoring.ts` + `POST /api/advisor-match` (server-side scored matching · country-eligibility gate · confidence band · whitelisted no-leak); verified dynamic "Why we matched you" (`lib/quiz-advisor-match-reasons.ts`); closest-match fallback; keyboard/SR a11y pass.
- **Phase 3 foundations ✓** — `lib/quiz-primary-advisor.ts` (`pickPrimary` allocation ladder, 12 tests) + `lib/quiz-flow.ts` (the routing state machine, extracted verbatim + **15 tests** — the regression net that makes question changes safe).
- **Phase 3 steps 1–2 ✓** — `deriveNeeds(answers)` (`lib/quiz-flow.ts`, signal-driven need-set, 7 tests) now feeds `pickPrimary` to render `AdvisorResultsScreen`'s "Recommended Team" (the static `COMBO_MAP` is gone). The **readiness/stage** question is live on the advisor track (`UNIFIED_QUESTIONS.stage`, `QuizStageSchema`): asked after `goal`/`mode`, "just learning" routes to the education-first DIY exit via `resolveTrack`, `under-contract` is the urgent tier that feeds `pickPrimary`. Flow + total-steps + schema all test-covered.
- **Phase 3 step 3 ✓** — the domestic `advisor_type` question is now **multi-select "needs"** (`MultiSelectOptions` in `QuizQuestionScreen`; CSV `needs` field + `QuizNeedsSchema`; "I'm not sure" is exclusive). `deriveNeeds` uses an explicit need-set verbatim, and `allocateAdvisors`/`resolveLeadAdvisorType` centralise the `deriveNeeds → pickPrimary` allocation — the displayed lead is now pickPrimary's `primary` (was `inferAdvisorType`), with `advisor_type` persisted as the allocated single type. International keeps its filtered single-select. Tested (flow + component + schema).
- **Phase 3 step 4 ✓** — **stranded types un-stranded**: `conveyancer` / `estate-planner` / `commercial-property-agent` are now selectable (goal-curated multi-select options), emittable (`deriveNeeds` adds a conveyancer to every property purchase + an estate planner for whale wealth), correctly matched, and linked to their real directories (`/advisors/conveyancers` etc. — all already built). The duplicated `TYPE_DB_MAP` / labels / hrefs / team copy across `AdvisorResultsScreen` + `/api/advisor-match` are now one registry, `lib/quiz-advisor-types.ts` (its `dbType` is type-checked against the canonical `AdvisorType` union). pickPrimary's under-contract→conveyancer rule is now reachable end-to-end. (73 quiz tests green.)
- **Phase 3 step 5 ✓ (readiness gap, part 1)** — the **physical-property DIY entry** no longer skips readiness: a `goal=property → DIY mode → property_sub=physical` user (the prime advisor lead) now gets the `stage` gate appended after `property_sub`, so we finally learn urgency (`under-contract` → the conveyancer tier) and offer the "just learning" education exit even to a physical buyer. Advisor entries (help/home/mode=help) already asked `stage`, so it's never re-asked; `getTotalSteps` accounts for the swap (physical drops the wealth-stack trio, gains the gate). Flow-tested.
- **Phase 4 (conversion + a11y), part 1 ✓** — audited the live `/quiz` UI: most of §5.6/§5.7 was **already shipped** (progress bar *is* seeded ~17% at Q1, "Question X of Y" + %, `role=radio` already simplified to auto-advance buttons, focus moved on all four transitions — forward/back/jump/resume, contact-form aria done in Phase 2). Genuine gaps closed: a **trust reassurance strip** at the lead-capture step (Free to use · No obligation · One advisor, never a call centre — truthful platform signals, no fabricated counts), and a **WCAG-AA text-contrast pass** (muted `text-slate-400` → `text-slate-500`, ~2.8:1 → 4.6:1) across the whole funnel (question/results/match/capture/location screens). Decorative icons left as-is.
- **§5.1 data-contract net ✓** — extracted `UNIFIED_QUESTIONS` verbatim into `lib/quiz-questions.ts` (pure data, testable, reusable by the 23 vertical entry points) and added the **option↔schema contract test** the plan said "would have caught P0 #1". It immediately caught **two more silent-null bugs** of the same class: `advisor_type` "insurance-broker" was offerable + a reachable `pickPrimary` primary but missing from `QuizAdvisorTypeSchema` (→ nulled on persist); `investor_country` was `max(10)` but `new_zealand`/`south_korea`/`saudi_arabia` keys exceed it (→ nulled). Both fixed (schema + bound) and pinned.
- **Stranded-types finish ✓** — added `conveyancer` + `commercial-property-agent` keyword sets to `TYPE_KEYWORDS` (shared by `buildAdvisorMatchReasons` **and** `lib/quiz-advisor-scoring.ts`), so those leads now get a "Specialises in …" bullet and specialty-fit scoring instead of only generic signals.
- Verified-already-met acceptance criteria (no change needed): **no PII in localStorage** (only `{currentId, answers, history, savedAt}`; contact details never persisted) with TTL + corrupt-state handling; **attribute-driven "Why we matched you"** (`buildAdvisorMatchReasons` — specialty/corridor/FIRB/language/local/rating/response-time/budget, never generic); single-lead allocation; closest-match fallback.

**Next (blocked or browser-QA-gated — flagged honestly):**
1. **OTP-wall removal** (§5.6, the single biggest expected lift) — **blocked on the §6 canonical-surface call**: it lives on `/find-advisor`, which may be 301'd into `/quiz`, mooting in-place work.
2. **Education-first outcome (§5.3) + international readiness** — coupled feature; `resolveBestOutcome` is already wired into the **DIY** results (drives the "Your best next step" hero / broker-list suppression — the plan's "dead code" note was stale), but the **international** track has no `stage` gate and no education hero. Extending it needs the outcome treatment on the advisor/intl path, behind a `feature_flags` row.
3. **Mobile sticky thumb-zone CTA** (§5.7) — proven patterns exist (`StickyCTABar`/`MobileFloatingCTA`), but it needs on-device QA (the brief's "actually click on mobile" bar) that the headless build env can't provide. Don't ship UI blind.
4. **Jargon microcopy** (§5.6) — low marginal value: the questions already spell jargon out in their subs, and `JargonTooltip` reads the flat `GLOSSARY` (which omits the cross-border FIRB that lives in `glossary-extended`). Only worth doing as part of a glossary-merge.
5. Remaining stranded types where they fit (`aged_care_advisor`, `debt_counsellor`) + corridor routing (UK pension / US FATCA / DASP / FIRB) per §5.5.

**Open founder call (gates §5.6's biggest win):** §6 — the canonical surface (`/quiz` vs `/get-matched`), which decides whether the `/find-advisor` OTP-wall work is worth doing in place or moots it.

**Env note:** this build environment is headless — `tsc`/tests/lint/contract-nets are the verification floor here; the brief's mobile/desktop click-through QA must happen on a real device (or CI preview) before the UI-visual items above ship.

Rule of thumb: change `lib/quiz-flow.ts`, run `npm test -- __tests__/lib/quiz-flow.test.ts` — the net catches flow regressions before they ship.

---

## 1. The thesis

> **The "best quiz" this site needs is ~80% already built — and almost none of it is wired into the live funnel.**

Every angle reached the same conclusion independently:

- A **weighted advisor-matching engine** exists (`computeAdvisorProfileMatch`, `rankAdvisors`, `rankByOutcomes`) and is wired into Get-Matched + the SEO directory — but the `/quiz` advisor path **sorts by `rating DESC`** and drops ~9 of 11 collected signals.
- An **8-outcome resolver** (`resolveBestOutcome`) exists — but it's **dead code on the live path**; `/quiz` renders 2 screens via a 3-way `resolveTrack`.
- A **39-type advisor taxonomy** + cross-border specialty machinery exist — but the quiz exposes **5 types** and collapses 12 corridors into "tax-agent."
- **Proper single-lead allocation** exists (`/api/submit-lead`: dedup, round-robin, country-eligibility) — but the quiz's advisor path **doesn't use it** (writes to `email_captures`, picks the advisor client-side with no dedup/eligibility).

The scoring **brain** is sound and tested. The **nervous system** connecting it — the orchestration layer and the data contract — is the problem.

---

## 2. Current reality — four parallel systems

| System | Entry | Engine | Lead path | Status |
|---|---|---|---|---|
| **Unified quiz** | `/quiz` | `app/quiz/page.tsx` (1,033 LOC, 15 q-types, 3 tracks) | `/api/quiz-lead`, `/api/advisor-lead` | Primary (linked everywhere) — but its own layout banner says "Get Matched has been upgraded →" |
| **Get Matched** | `/get-matched` | `lib/getmatched/*` (17 files), action-plan engine | `/api/get-matched/*` | Newer; the **bots test this one** |
| **Hub onboarding** | 14× `<vertical>/quiz` | `HubOnboardingShell` → `EligibilityQuiz` | `/api/hub-quiz/capture` | Separate 3-Q diagnostic |
| **Find-advisor** | `/find-advisor` | `app/find-advisor/page.tsx` (2,034 LOC) | `/api/submit-lead` + OTP | Yet another funnel; **email+OTP wall before any match** |

Four engines, three broker-scorers, divergent data contracts, separate analytics namespaces, two overlapping drips on one table. **Architectural fragmentation is the dominant liability.**

---

## 3. The decision — rebuild the orchestration + data contract; keep & wire in the brains

**Not a from-scratch rebuild** (the scoring/outcome/reason libraries are good and tested — `lib/quiz-scoring.ts`, `lib/quiz-outcome.ts`, `lib/quiz-advisor-match-reasons.ts`, and the server-side `/api/quiz/score` pattern are the template).

**Not pure-elevate** either — the defining problems are *contract* failures that recur because no single typed answer model is shared across client → score API → lead API → profile reader → drip:
- the flat positional `toScoringAnswers` array (`.filter(Boolean)` silently shifts indices),
- `answers.raw` written as an array but read as an object,
- the `australia` vs `au` enum drift (with a test enshrining the wrong value),
- three different money-band definitions.

**Verdict: rebuild the orchestration + data contract; KEEP `quiz-scoring`, `quiz-outcome`, `quiz-advisor-match-reasons`, and the `/api/quiz/score` server pattern as the foundation.**

---

## 4. P0 bugs corrupting data *right now* (fix first, surface-agnostic)

1. **`location` is nulled on every domestic lead.** Quiz emits `"australia"`; `QuizLocationSchema` only accepts `["au","international","expat","au_expat"]` → `safeEnum` drops it → `quiz_leads.location = null` and it's lost before `inferVertical`. The unit test codifies `"au"`, so it's green while prod data dies. *(`lib/quiz-answer-schemas.ts:15`, `__tests__/lib/quiz-answer-schemas.test.ts:81`)*
2. **Cross-page personalisation returns null for everyone.** `quiz-lead` writes `answers:{ raw: flatArray }`; `quiz-profile` reads `raw.investor_country/.amount/.experience` as object keys → always undefined. *(`app/api/quiz-lead/route.ts:371`, `lib/quiz-profile.ts:156`)*
3. **Silent lost enquiry.** The advisor-lead POST swallows 429/500 and proceeds to "matched" — the user thinks they enquired; nothing was recorded. *(`AdvisorResultsScreen.tsx:223`)*
4. **Refresh during "analyzing" wipes everything** — `clearProgress()` fires before results commit. *(`app/quiz/page.tsx:743`)*; plus **no timeout** on the score fetch (can hang forever).
5. **Money-band label drift** — UI (`$100k–500k/$500k+`) ≠ `INVESTMENT_MAP` (`$50k–100k/$100k+`) ≠ `quiz-outcome` (`500k_2m`). The advisor receives a different budget than the user picked.
6. **`inferred_vertical` disagreement** between `quiz_leads` and `user_quiz_history` for the same submission.

---

## 5. Target architecture

### 5.1 One typed answer model
`UnifiedQuizAnswers` object (no positional arrays), shared by client, `/api/quiz/score`, `/api/quiz-lead`, `quiz-profile`, and the drips. **Zod enums derived from the question definitions** so drift is impossible. Contract test: `UNIFIED_QUESTIONS` option keys ⊇ every enum.

### 5.2 Server-side scored advisor matching (wire in the existing engines)
New `POST /api/advisor-match` (mirrors `/api/quiz/score`): kills the browser `professionals` query, keeps tuning server-side. Score = **fit** (specialty/goal/complexity 30 · budget vs `min_investment_cents` 20 · location incl. `office_states`/radius 15 · corridor/FIRB/language 15) × **quality overlay** (trust score, Wilson-smoothed rating, response time, profile gate) with an **availability gate** (`accepts_new_clients`, `country_eligibility`). Surface a **qualitative confidence band** ("Strong/Good match"), never a fake precise %. Route confirm through **`/api/submit-lead` with `confirm_advisor_id`** → inherits dedup, round-robin, eligibility, `professional_leads` insert. **One lead → one advisor** preserved.

### 5.3 Wire in `resolveBestOutcome` (8 outcomes)
Render the outcome hero on results — unlocks post-job, bundle-stack, advisor-browse, education-first, calculator-first with **zero new questions**. Behind a `feature_flags` row.

### 5.4 Consolidated reasons + verified copy
Make `buildAdvisorMatchReasons` the single source of truth (delete the 2 inline duplicates). Upgrade hardcoded copy to verified claims: `initial_consultation_free` → "Free initial consultation"; `avg_response_minutes` → "Typically replies in ~2h"; `qualifications`/`afsl_number` → "CFP® · holds AFSL".

### 5.5 Intent model + question graph
Tight **≤6–8 step adaptive DAG**. Two pivotal new questions:
- **Multi-select "who will you need?"** → capture the full need-set; `pickPrimary(needSet)` deterministic ladder allocates **one** primary lead; render the rest as a clearly-secondary "team" of directory links (no second postback). Fixes multi-intent.
- **"Where are you up to?" readiness** → urgency (lead tiering) + a first-class *"just want to learn"* education exit.
Expose stranded types (conveyancer, commercial agent, estate/debt/aged-care); route international by corridor specialty (UK pension / US FATCA / DASP / FIRB). Full intent→route table in the agent appendix. **SIV/capital-raising routes to post-job only** (REGULATORY-AVOID-LIST; never auto-match).

### 5.6 Conversion & UX (evidence-backed)
- **Kill/relocate the `/find-advisor` email+OTP wall** before the match (the match preview is `dry_run` — OTP guards nothing; move it to the side-effecting confirm). Single biggest expected lift; matches `/quiz`'s own validated post-results capture.
- **Seed the progress bar 15–20%** at Q1 (today 0%); add "Question X of Y / ~N left".
- **Jargon microcopy** for CHESS/SMSF/FIRB/s708 via a shared `lib/quiz-glossary.ts`.
- "Free • No obligation • One advisor only" under the CTA; one hero CTA, secondary demoted; social proof near capture.

### 5.7 Accessibility & mobile (WCAG 2.2 AA)
Move focus to the heading/result on **every** transition (back/jump/resume/phase) — today only forward. Fix the `role="radio"` group (roving tabindex+arrows, or simplify to buttons). `role="status"` on analyzing; `aria-describedby`/`aria-invalid`/`required` on the contact form; contrast (`text-slate-400`→`500/600`). Mobile: sticky thumb-zone CTA, ≥44px targets, jump-back on mobile, stack the resume prompt, TTL on localStorage.

### 5.8 Plumbing
Unify advisor + DIY leads into `quiz_leads` (advisor leads currently invisible to drips/SLA/reporting); one drip pipeline with a shared dedup key; **PostHog the full funnel** (today only `quiz_started`/`quiz_completed` reach PH — the mid-funnel is GA-only, so the planned conversion analysis can't run); delete orphans (`lib/quiz-vertical-router.ts`, `AdvisorContactStep.tsx`, `/api/quiz/submit`).

### 5.9 Bots & regression
Live bot runs need a **clean-network runner** (the sandbox TLS-MITM proxy drops the quiz's async fetches — confirmed in the bot reports + FIN_NOTEBOOK). In-sandbox: retarget `bots/flows/find-advisor-quiz.ts` to real selectors (`button[role="radio"]`, auto-advance), add `data-testid` anchors, parametrise the 14 hub quizzes, and add **golden-file scoring tests** + the **enum-superset contract test** (would have caught P0 #1).

---

## 6. OPEN DECISION — the canonical surface (founder call)

The rebuild must consolidate four funnels toward **one canonical surface**, then 301 the rest. The org **started** migrating `/quiz → /get-matched` (the banner) but never finished; `/quiz` is still primary and holds the richest logic. This choice has SEO (301s), product, and "where the work lands" implications — it's a founder decision, flagged here rather than guessed. (All Phase 0–3 work below is **surface-agnostic** and proceeds regardless.)

---

## 7. Phased build plan (each phase: small PRs, feature-flagged where it changes live behaviour, test-gated)

- **Phase 0 — Stop the bleeding.** The six P0 fixes (§4) + their tests. Surface-agnostic, urgent, low-risk.
- **Phase 1 — One typed answer model (§5.1).** The data contract everything sits on + the enum-superset contract test.
- **Phase 2 — Wire in the brains (§5.2–5.4).** Server-side scored matching + `submit-lead` allocation + `resolveBestOutcome` + reason consolidation. Behind a flag.
- **Phase 3 — Intent expansion (§5.5).** Multi-select needs + `pickPrimary` + readiness question + stranded types + corridor routing.
- **Phase 4 — Conversion + a11y + mobile (§5.6–5.7).** OTP-wall fix, progress/microcopy/trust, focus/aria/contrast/mobile.
- **Phase 5 — Consolidation (§5.8–5.9 + §6).** Canonical surface + 301s, unified leads/drips, full-funnel PostHog, bot retarget, delete orphans.

Already shipped this session (Phase 2 down-payment): the advisor **"Why we matched you"** explainer (`lib/quiz-advisor-match-reasons.ts` + `AdvisorMatchedScreen`, 12 tests) — PR #1477.

---

## 8. Acceptance criteria (the bar)

Answers persist with TTL; resume/restart clean; **no P0 data loss**. Every enumerated intent (and combination) routes correctly at ≤6–8 adaptive steps; "not sure"/education-only never dead-end. Advisor matching is a **server-side weighted score** using the user's real answers + advisor attributes, with a confidence band and verified reasons; **one lead → one advisor** with dedup/eligibility. No pre-value capture wall. WCAG 2.2 AA on keyboard/SR/contrast; mobile thumb-zone clean. Full-funnel analytics; bot regression retargeted. No console errors; existing functionality preserved; tests green.
