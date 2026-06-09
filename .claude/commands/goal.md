---
description: invest.com.au product-upgrade goal — audit, elevate, and ship the highest-leverage conversion work (find-advisor quiz first) to a world-class bar, grounded in the real codebase and its hard constraints. One task at a time; audit → plan → implement → test → fix → summarise.
---

You are the senior product owner **and** the build team for invest.com.au (an Australian investor/advisor marketplace, Next.js App Router + Supabase). Your job is to take the highest-leverage product upgrades below and drive each one to the highest achievable standard — not a demo, a genuinely best-in-class shipped feature.

Hold every one of these lenses at once and let them argue internally before you write code:

- **Product strategist** — commercial logic, conversion impact, single-lead economics, lifetime value.
- **UX designer** — flow, friction, intent coverage, step order, abandonment risk, "not sure" paths.
- **UI designer** — hierarchy, spacing, type, CTA primacy, mobile-first responsiveness, trust signals.
- **Frontend engineer** — clean, typed, maintainable, reuses the single-source helpers.
- **Backend/data engineer** — does this *actually* need a DB change? (Almost always no — see constraints.)
- **QA lead** — edge cases, empty/invalid/error states, refresh, abandoned flow, localStorage, mobile + desktop.
- **Accessibility reviewer** — keyboard, contrast, labels, focus, screen-reader clarity.
- **SEO/GEO strategist** — scenario hubs, intent-driven pages, answer-first structure, schema.

Do not do shallow work. Do not remove features because it is easier. Do not cut scope silently. Do not fake completion. Do not stop at a plan — implement as much as is safely possible. When genuinely blocked, say exactly what's missing and continue with safe adjacent work.

---

## 0. Read first (this repo's real context)

Before touching anything, ground yourself in the actual codebase — the brief below may be stale, so **grep before you scope**:

- `CLAUDE.md` — working notes, the **Single sources of truth** table, conventions, gotchas. Obey it; it overrides defaults.
- `COMPANY.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md` — entity/compliance/migration discipline, request lifecycle, commit convention.
- `docs/strategy/FIN_NOTEBOOK.md` — strategy + what's already built. Append (don't delete) when you make a strategic decision.
- `docs/strategy/REGULATORY-AVOID-LIST.md` — never-autonomous escalators. **Read before any payments/advice/capital-raising/credit/bank-data/cross-border work.**
- `docs/audits/MERGE_AUTHORIZATION.md` — merge tiers. `docs/plans/DIRECTORY_UX_UNIFICATION.md` + `docs/architecture/country-mode.md` for Tasks 3–4.

---

## 1. Hard constraints (non-negotiable in THIS repo)

1. **The database is frozen.** The local migration tree has forked from prod (FIN_NOTEBOOK 2026-06-07); the baseline-squash is a founder-gated **Tier-E** item. **Do NOT author new migrations.** Build frontend-first against the tables that already exist (`quiz_leads`, `user_quiz_history`, `quiz_weights`, `professionals`, `anonymous_saves`, `advisor_sessions`). If a task *genuinely* needs a new column/table, STOP, state the blocker, and do the adjacent non-DB work instead — never silently write a migration.
2. **Compliance.** AFSL is not granted (≈ late 2027). Never build, un-draft, or enable a REGULATORY-AVOID-LIST escalator (personal advice, client money, product issuing, CSF/securities, credit assistance, CDR ingestion, FIRB *legal* advice). Wire general-advice warnings via `lib/compliance.ts`. The funnel **guides users to a professional — it never replaces one.** Careful wording + disclaimers on every advice-adjacent surface.
3. **Single-lead allocation.** One lead → **one** advisor/broker (not up to three). The ranker already resolves a single top pick (specialty+corridor → specialty → corridor → top); verify `lib/getmatched/`, the submit-lead path, and `advisor-ranker`, and remove any surface that fans one lead out to multiple recipients.
4. **Reuse the single sources of truth** (see the CLAUDE.md table): `lib/tracking.ts` (affiliate links, CTAs, stars), `lib/seo.ts`, `lib/compliance.ts`, `lib/verticals.ts`, `lib/country-mode/` + `lib/intent-context.ts`, `lib/page-recommendations.ts`, `lib/schema-markup.ts`, `lib/logger.ts` (never `console.*`), `lib/rate-limit.ts`, `components/directory/*`, `components/foreign-investment/DirectoryBanners`. Reaching for a hardcoded disclaimer / new affiliate URL builder / fresh JSON-LD object means you missed a helper — search `lib/` first.
5. **Conventions.** Strict TS + `noUncheckedIndexedAccess` (CI fails on TS errors — no escape hatch). Zod on every API body (`withValidatedBody` / the `invest/no-unvalidated-req-json` rule is an error). `export const revalidate = N` (ISR). Conventional Commits (single-line subject, blank line, *why* body). **No model identifiers** in commits/PRs/code/docs.
6. **Workflow.** Develop on `claude/epic-newton-g5ml7l`. Before shipping: `npm run type-check`, focused `npm test -- <files>`, `npm run lint`, and for UI **actually click the flow on mobile + desktop in `npm run dev`** — type-checks verify correctness, not feature correctness. Open a **draft PR**; respect the merge tiers.
7. **Elevate, don't rebuild.** Much of this is already built. Audit the real implementation first; preserve working behaviour; improve deliberately. Don't reintroduce what exists.

---

## Priority order (work ONE at a time, top-down)

1. **Find-advisor quiz → match explainer** — core conversion funnel. Go *far* deeper here than anything else.
2. **Advisor portal onboarding wizard** — biggest advisor-activation gap.
3. **Public advisor profile** — fast conversion/trust wins.
4. **Cross-border investor funnel** — high-LTV opportunity.
5. **WCAG colour-contrast sweep.**

For each task: **Audit → Plan → Implement → Test → Fix → Summarise.** Begin with Task 1 and do not move on until it is genuinely excellent end-to-end.

---

## ★ TASK 1 — THE QUIZ: make it the best advisor-matching quiz on the internet ★

This is the centerpiece. Treat it as a **complete, ground-up redesign-grade elevation** of the find-advisor quiz into an amazing piece of software — intelligent, trustworthy, efficient, tailored, and conversion-sharp across **every** user flow. It is the single most important thing you will touch. Spend disproportionate effort here.

### What already exists (audit it; do NOT blindly rebuild)

The quiz was rebuilt in PR #434 and is substantial. Real surface:

- **Entry + driver:** `app/quiz/page.tsx` (`UNIFIED_QUESTIONS`, ~19 question types; phases: questions → analyzing → diy-results/advisor-results) plus **23 vertical entry points** (`app/<vertical>/quiz/page.tsx`) and `app/foreign-investment/quiz/page.tsx` (`HubOnboardingShell`).
- **Components:** `app/quiz/_components/*` — `QuizQuestionScreen`, `QuizResultsScreen`, `AdvisorResultsScreen`, `QuizAnalyzingScreen`, `QuizTopMatch`, `QuizRunnerUps`, `AdvisorContactStep`, `AdvisorLocationStep`, `AdvisorMatchedScreen`, `QuizComparisonTable`, `QuizInlineEmailCapture`.
- **Resume ALREADY WORKS:** localStorage key `invest-quiz-v2-progress`; `loadSavedProgress` / `saveProgress` / `clearProgress`; a "continue where you left off" resume prompt restoring `currentId` + `answers` + `history`. *The brief's "answers are lost on refresh" is FALSE — your job is to harden and polish this, not build it.*
- **"Why we matched you" ALREADY EXISTS:** `getMatchReasons(answers, broker)` → 3–4 dynamic bullets rendered in `QuizTopMatch.tsx`. *The brief's "no match explanation" is FALSE — your job is to make it genuinely intelligent and advisor-attribute-driven, not generic.*
- **Scoring/matching:** `lib/quiz-scoring.ts` (8 weight dims: `beginner, low_fee, us_shares, smsf, crypto, advanced, property, robo` + amount multipliers + per-vertical `scoreVertical`), `lib/quiz-outcome.ts` (7-outcome resolver: `post-job, advisor-match, advisor-browse, calculator-first, education-first, diy-broker, bundle-stack`), `lib/quiz-vertical-router.ts`, `lib/quiz-profile.ts`, `lib/quiz-answer-schemas.ts`, `lib/quiz-history.ts`, `lib/getmatched/top-match.ts`.
- **APIs:** `POST /api/quiz/score` (server-side weights, never sent to browser), `GET /api/quiz/data` (broker display metadata, commercial fields stripped), `POST /api/quiz/submit` (embeds → `quiz_leads`).
- **Data (no new migrations):** `quiz_leads` (structured cols + drip), `user_quiz_history` (auth user + anon session, `resumed_from`), `quiz_weights` (commercially sensitive — server-only). Follow-up drips: 27 vertical templates, gated by `isFeatureDisabled('abandoned_quiz_drip')`.

### The mandate

Keep the strong bones (7-outcome resolver, weighted scoring, resume, match reasons, vertical routing) and **elevate the whole experience to world-class.** Every screen, transition, word, and edge state should feel considered. This is "complete redesign" in *quality and coverage*, not "throw away the engine."

### Deep audit — interrogate every question and option

For each of the ~19 question types and their options, answer in writing: Is it necessary? Does it improve advisor routing? Is it clear to a normal user (no unexplained jargon — add microcopy where a term is unavoidable)? Does it cover enough intent? Are options mutually exclusive where they should be, multi-select where they should be? Is there a valid **"I'm not sure"** path? Too many steps? Does it build confidence vs. feel like a lead form? Mobile-friendly? Are progress / back / next / save-resume / edit-answer behaviours clean and answer-preserving?

### Intent coverage matrix — the quiz must route ALL of these to the right professional

First-time property investor · existing property investor · SMSF investor · expat Australian investing back home · non-resident foreign buyer · UK→AU · India→AU · China→AU · high-net-worth · needs mortgage/broker · needs tax/accounting · needs financial planning · needs buyer's agent · needs legal/conveyancing · comparing suburbs/locations · negative gearing · capital growth · rental yield · commercial property · **doesn't yet know what they need** · **only wants education/content (not a call yet)** · **ready to book now**.

Map each to a real outcome (`lib/quiz-outcome.ts`), advisor type, and where relevant a cross-border specialty (`lib/advisor-specialties.ts`: UK Pension Transfer, FATCA US Expat, DASP, FIRB Property Non-Resident) + corridor (`available_in_countries`). Flag and fill any intent with no clean route.

### Dimensions to cover (map to existing question types; fill real gaps)

Location/country · buying status · investment goal · property type · budget range · financing status · residency/tax status · SMSF interest · timeline · risk appetite · preferred advisor type · pre-approval status · needs mortgage broker · needs tax/legal · "call now vs. just guidance" · preferred contact method · comfort sharing contact details now.

### ALL user flows must be first-class (this is the bar)

Design, build, and QA every one of these explicitly:

- **Entry:** cold `/quiz`, each of the 23 vertical entry points, country-page handoff (`?country=&intent=` prefilling `investor_country`/`investor_goal_intl` via `lib/intent-context.ts`), and embed/landing → `/api/quiz/submit`.
- **In-flow:** focused single-step screens; clear progress indicator; plain English + microcopy; back nav that preserves answers; edit-an-answer that re-resolves matches; multi-select where apt; "I'm not sure" everywhere it's plausible.
- **Resume/persistence:** harden the existing localStorage flow — sensible expiry, a clean "continue where you left off" vs. "start again" choice, **no unnecessary/sensitive PII in localStorage** (no email/phone — keep it to answers + position), and graceful handling of corrupt/old saved state.
- **Results:** DIY outcome (platforms/robo/super/savings) and advisor outcome (matched advisors). Each advisor card: name · core specialism · location *or* remote availability · review/trust signal if present · **primary CTA** ("Book a call" when `booking_link` exists, else "Request introduction") · a 3-bullet **"Why we matched you"** panel driven by *real advisor attributes* (specialties, `available_in_countries`, location/remote, rating, accepting-clients, budget fit, stated timeline, pre-approval/mortgage need) — dynamic, never hardcoded generic.
- **Edge/empty/error:** no strong matches → honest empty state + **"closest matches"** fallback + clear "what to do next"; API/scoring failure → graceful degradation (client fallback scores already exist) with no console errors; abandoned quiz → resume + (when enabled) the drip; double-submit, rate-limit (`/api/quiz/submit` 3/10min), and slow-network states.
- **Post-result:** warm email capture *after* results (not a gate before), secondary CTA for "not ready to book," and trust reassurance (privacy, no-obligation introduction). Respect `applyQuizSponsorBoost` vertical-awareness — never surface an off-vertical sponsor.
- **Cross-cutting:** mobile + desktop polish; full keyboard + screen-reader support; focus management between steps; AA contrast (don't introduce `text-slate-400` on body text — see Task 5).

### Acceptance criteria (Task 1)

- Answers persist across refresh/close; resume **or** restart, both clean; no sensitive PII in localStorage.
- Questions/options improved where the audit found weakness; every listed intent has a real route; "not sure" is a valid path throughout.
- Each result card shows a dynamic, attribute-driven 3-bullet "Why we matched you"; matching reflects both quiz answers and real advisor data; edit-answers re-resolves matches.
- Empty + closest-matches fallbacks exist with clear next steps; primary + secondary CTAs present; single-advisor allocation honoured.
- Clean on mobile + desktop; no major a11y issues; **no console errors; no broken routes; no new DB migration**; existing quiz behaviour preserved; tests/QA done (extend the existing `__tests__/lib/quiz-*` + `__tests__/api/quiz-*` suites).

> Strategic tie-in: the **concierge wealth-stack builder** (FIN_NOTEBOOK ship-now #1) extends this exact quiz to super/savings/robo — design with that headroom in mind. Keep it answer-first for GEO/scenario-hub citability.

---

## TASK 2 — Advisor portal onboarding wizard (the real gap)

Today there's a 3-step **signup** form (`app/advisor-signup/page.tsx`) and a firm portal (`app/firm-portal/*`) — but **no guided onboarding, no profile-completeness indicator, no "next best action."** New advisors land on blank tabs. Build a guided 5-step wizard: **(1) photo · (2) bio · (3) specialties · (4) fees · (5) availability.**

- Sticky progress banner + completion %; always-obvious next action ("40% complete — add your bio →"); save progress; allow skipping but surface what's incomplete; empty-state guidance on blank tabs; frame completeness as a commercial benefit (better matching/conversion).
- **No DB migration:** there is no `profile_completeness` column and you can't add one — **derive** completeness client/server-side from existing `professionals` fields (`photo_url`, `bio`, `specialties`, `fee_*`, availability/`booking_link`).
- **Acceptance:** guided path exists; completeness visible; next action obvious; blank tabs no longer feel abandoned; data saves via the existing profile PATCH allowlist; mobile + desktop clean.

---

## TASK 3 — Public advisor profile (correct the brief: most of it already exists)

Route: `app/advisor/[slug]/page.tsx` + `AdvisorProfileClient.tsx`. Already present: **sticky anchor nav, BookingWidget, similar-advisors, trust score, reviews, expert articles, endorsements.** So the real, narrower work:

- **Reviews load-more:** today hard-capped at `REVIEWS_LIMIT = 20` — add "Load more" beyond 20.
- **CTA primacy:** when `booking_link` exists, make **"Book a call"** the unmistakable primary CTA (incl. the mobile sticky bar) over "Request introduction."
- Tighten trust hierarchy and mobile layout; keep "similar advisors" genuinely useful, not filler. **Preserve all existing content, routing, and SEO metadata** (ISR `revalidate = 1800`).
- **Acceptance:** load-more works; booking is primary where present; mobile + desktop polished; **no regression** to routing or schema/metadata.

---

## TASK 4 — Cross-border investor funnel (elevate the existing infra)

Already built: `lib/country-mode/` (5-level resolve), `lib/intent-context.ts` (cookie `iv_intent_country`, 90-day), `lib/foreign-investment-country-data.ts` (12 country hubs, DTA/FIRB/migration content), the foreign-investment quiz path, cross-border specialties + the 1.75× premium pricing, and the ranker country-match boost. Real gaps to fill:

- A **FIRB eligibility *explainer*** (not legal advice — wording + disclaimers; honour REGULATORY-AVOID-LIST) and a **non-resident mortgage** referral path. Persona-led homepage sections for UK/India/China→AU and expat/non-resident. Strong CTAs that route into advisor/broker matching via **single-broker allocation**. Country-specific trust/compliance notes.
- Use the helpers: `lib/page-recommendations.ts` for recommendation copy (add a row, don't edit the component), `<DirectoryBanners surface=…>` for the banner stack, the quiz `?country=&intent=` handoff. Never invent legal advice — guide to the right professional.
- **Acceptance:** a cross-border user sees a relevant path; the quiz recognises country/residency; the funnel routes into matching; pages are commercially useful + SEO/GEO-ready; **no false or risky compliance claims.**

---

## TASK 5 — WCAG colour-contrast sweep

Reality check: there are **~936 `text-slate-400` occurrences** across ~250 files (`#94a3b8` ≈ 3.5:1 on white — fails AA for body text). Fix **at the token/component level**, not with one-off hacks:

- Audit systematically; replace low-contrast body text with `text-slate-500`+ (or a darker token) where it fails AA; keep large-text exceptions where legitimately ≥18pt. Centralise via the tokens in `app/globals.css` where possible.
- Visual-QA the high-density surfaces: directory filters, form labels/helper text, cards, nav, footers, hover + disabled states, mobile. Keep the design premium — readable, not heavy.
- **Acceptance:** AA violations substantially reduced/eliminated; no visual regressions; systematic + maintainable.

---

## Per-task loop & final output

For each task: **Audit → Plan → Implement → Test → Fix → Summarise.** Run type-check + focused tests + lint + build; manually click the key flows (mobile especially); fix issues as you find them; commit in Conventional-Commit increments; open a draft PR.

After the work, report: **summary of changes · files changed · key product improvements · remaining risks/gaps · tests/checks run · recommended next task.** No closing fluff in the PR body — the diff is the summary.

**Begin now with Task 1. Deep-dive the quiz harder than everything else.**
