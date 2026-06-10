# Unified Matching Engine — "one engine to be jealous of"

**Goal:** `/get-matched` becomes the single matching funnel, powered by the rebuilt advisor-matching brain, covering every user intent with world-class intelligence + UX. Decided 2026-06-10 (founder). Supersedes the dual-funnel state; folds in `/find-advisor`.

## The moat (what makes it world-class — ✅ exists / 🔨 build)

- ✅ **Single-lead integrity.** One lead → one advisor (`pickPrimary`), never resold to a panel. Most marketplaces spam 5 advisors; we don't. Compliance-aligned *and* the advisor-trust differentiator.
- ✅ **Multi-signal scored matching** — specialty/goal · budget · location · cross-border corridor · quality · availability · country-eligibility (`lib/quiz-advisor-scoring.ts`).
- ✅ **Explainable matches** — attribute-driven "why we matched you," never generic (`buildAdvisorMatchReasons`).
- ✅ **Corridor intelligence** — UK pension / FATCA / DASP / FIRB first-class (`corridorKeywordsFor`).
- ✅ **Confidence honesty** — qualitative bands, no fake-precise %.
- ✅ **Outcome-learning re-rank** — `applyOutcomesRanking` already re-ranks providers by real lead outcomes. Extend to advisors.
- 🔨 **Total intent coverage** — every situation in the matrix routes to a real outcome (below).
- 🔨 **Lead capture in-funnel** — get-matched writes no advisor lead today; port the preview→connect→OTP→confirm flow.
- 🔨 **Redesigned result UX** — the match moment, not an "action-plan checklist."

## Architecture — one engine, two front-ends, a thin translator

```
/get-matched questions (DB)  ─┐
                              ├─►  actionPlanToUnified()  ─►  UnifiedAnswers ─► [ deriveNeeds → pickPrimary ]  ─► one lead
quiz UNIFIED_QUESTIONS (code) ─┘     (lib/getmatched/             (canonical)      scoreQuizAdvisors (rank real
                                      advisor-allocation.ts)                       professionals) + buildAdvisorMatchReasons
```

The engine never forks. Each surface only owns its question model + result presentation; the brain is shared. `/find-advisor` becomes a thin entry that hands off to the same engine, then 301s.

## Phased build (each phase: shippable, flag-gated where it touches the live funnel, tested)

- **P1 — Translator + allocation (THIS PR).** `lib/getmatched/advisor-allocation.ts`: map every get-matched answer → `UnifiedAnswers`, reuse `allocateAdvisors`/`resolveLeadAdvisorType`, emit the `QuizAdvisorScoringContext`. Pure, exhaustively tested per intent. No live-funnel change. *This is the keystone — proves one engine drives get-matched's data.*
- **P2 — Match core extraction + wire into resolve (flag: `advisor_match_v2_get_matched`).** Extract the candidate-load+score core (shared by `/api/advisor-match`), call it in `resolve` for advisor-shaped routes (`individual`/`firm`/`expert_team`/`investor_brief`), return real ranked advisors in the existing `TopMatch{kind:"advisor"}` shape (carousel already renders them). Falls back to today's path when the flag is off.
- **P3 — Collect the missing signals.** Migration adds the questions the engine needs but get-matched lacks: **AU state** (domestic), **investor country + visa** (overseas/expat branch), and a clean **advisor-type** confirm. Improves match precision; engine already degrades gracefully without them (location-neutral).
- **P4 — Result-UX redesign + lead capture.** Redesign the advisor outcome as a *match* moment (advisor card · why-matched · confidence · single primary CTA), preview-before-contact, then `/api/get-matched/plans/[id]/submit-lead` writes `professional_leads`. **Needs device QA.**
- **P5 — Fold in `/find-advisor`.** Once get-matched captures advisor leads at parity, 301 `/find-advisor` → `/get-matched`. One funnel.

## Intent coverage matrix → route (the bar: every row has a real home)

| Intent | get-matched signal | Engine advisor type | Outcome |
|---|---|---|---|
| First-time / existing property | intent=property, property_sub | buyers-agent (+ mortgage, conveyancer, tax team) | advisor match |
| Ready to settle now | timeline=now → stage=under-contract | **conveyancer** (settlement clock) | advisor match (urgent) |
| SMSF | intent=super, super_sub=smsf* | smsf-accountant | advisor match |
| Home loan | intent=home | mortgage-broker | advisor match |
| Tax / accounting | help_sub=tax_agent | tax-agent | advisor match |
| Financial planning / HNW | intent=grow + budget whale | financial-planner (+ estate) | advisor match |
| Expat AU investing home | starting_point=expat | corridor-aware (DASP/au_expat) | advisor match (intl) |
| Non-resident foreign buyer | starting_point=overseas + property | buyers-agent + FIRB corridor | advisor match (intl) |
| UK/India/China→AU | country_of_residence | corridor specialty (pension/FATCA) | advisor match (intl) |
| Commercial property | (new option) | commercial-property-agent | advisor match |
| Don't know what I need | help_preference=not_sure / "not-sure" | pickPrimary fallback / post-job | guided / brief |
| Just learning | timeline=researching → stage=learning | — | education-first outcome (no lead push) |
| Just browsing | intent=browse | — | browse opportunities (current action-plan UX) |

## UI/UX redesign principles (P4 spec — build to these, sign off on mirror)

- **Match moment, not a form.** Result leads with the matched advisor (photo · specialism · location/remote · trust signal · confidence band · 3 attribute-driven reasons), one hero CTA. Action-plan checklist demoted to the DIY/browse outcomes.
- **Value before the wall.** Show the match before asking for contact (the §5.6 win — already shipped on /find-advisor).
- **Adaptive + minimal.** ≤6–8 steps; "I'm not sure" everywhere; readiness gate offers a first-class *education* exit.
- **Trust-forward.** "Free · No obligation · One advisor, never a call centre." Verified/licensed signals. No fabricated stats.
- **Mobile-first, AA contrast, full keyboard/SR.** Focus moves to the result on every transition.

## Honesty / guardrails
- Compliance: general-advice only; guide to a professional, never advise. No REGULATORY-AVOID-LIST escalators.
- Single-lead is non-negotiable — verify at every seam.
- Visual redesign (P4) requires device QA; the headless build env can verify logic/tests, not pixels.
