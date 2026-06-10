# TASK 1 AUDIT: Find-Advisor Quiz Elevation

**Audit Date:** 2026-06-10  
**Auditor:** Claude (comprehensive codebase audit)  
**Scope:** Quiz UX, routing, matching, all user flows, a11y, mobile, data persistence  
**Mandate:** Elevate to world-class advisor-matching quiz; every screen, transition, word, edge state considered.

---

## 1. EXISTING STRENGTHS (Keep & Build On)

### Architecture
✅ **7-outcome resolver** (`lib/quiz-outcome.ts`) — post-job, advisor-match, advisor-browse, calculator-first, education-first, diy-broker, bundle-stack  
✅ **Weighted scoring engine** (`lib/quiz-scoring.ts`) — 8 dimensions (beginner, low_fee, us_shares, smsf, crypto, advanced, property, robo) + amount multipliers  
✅ **Structured question definitions** (`lib/quiz-questions.ts`) — ~19 question types, codified, testable against schemas  
✅ **Server-side weights** — `POST /api/quiz/score` — weights never sent to browser; CPA/commercial fields stay hidden  
✅ **Dynamic advisor-type filtering** — options curated to goal (property → mortgage-broker, conveyancer, insurance-broker; super → SMSF, financial-planner, tax-agent)  
✅ **International track** — location → investor_country → visa_status → investor_goal_intl; proper cross-border routing  
✅ **Resume/persistence** — localStorage key `invest-quiz-v2-progress`; loadSavedProgress / saveProgress / clearProgress; restores currentId + answers + history  

### Components
✅ **Result cards** — advisor name, specialism, location/remote, rating, verified badge, fee description  
✅ **Multi-select for needs** — toggle on/off; "I'm not sure" mutually exclusive with concrete needs  
✅ **Progress indicator** — tracks user through quiz steps  

### Data
✅ **quiz_leads** table — structured `investor_details` (JSON), `quiz_weights` query params preserved, drip templates gated by feature flag  
✅ **user_quiz_history** — auth + anon session tracking; `resumed_from` timestamp  

---

## 2. CRITICAL GAPS & FINDINGS

### 2.1 — Intent Coverage Matrix: IS EVERY INTENT ROUTED?

**Mandate test:** "First-time property investor · existing property investor · SMSF investor · expat AU→home · non-resident foreign buyer · UK→AU · India→AU · China→AU · HNW · needs mortgage/broker · needs tax/accounting · needs financial planning · needs buyer's agent · needs legal/conveyancing · comparing suburbs · negative gearing · capital growth · rental yield · commercial property · **doesn't know what they need** · **only wants education/content** · **ready to book now**."

**Audit findings:**
| Intent | Current Route | Outcome Type | Advisor Type | Status |
|---|---|---|---|---|
| First-time property investor | goal=property → property_sub=physical → advisor_type=mortgage-broker/buyers-agent | advisor-match | mortgage-broker | ✅ Covered |
| Existing property investor | goal=property + experience=intermediate/pro | advisor-match | buyers-agent, tax-agent | ✅ Covered |
| SMSF investor | goal=super | advisor-match | SMSF-accountant, financial-planner | ✅ Covered |
| Expat AU investing back home | location=expat → goal (any domestic) | advisor-match | (goal-dependent) | ✅ Covered |
| Non-resident foreign buyer | location=international + investor_goal_intl=property + visa_status=non_resident | advisor-match | mortgage-broker, FIRB-specialist | ⚠️ FIRB routing? Check crossborder-specialties |
| UK→AU migrant | investor_country=uk + investor_goal_intl=property | advisor-match | mortgage-broker, FIRB | ⚠️ Need "UK Pension Transfer" specialty routing |
| India→AU migrant | investor_country=india + investor_goal_intl=property | advisor-match | mortgage-broker, FIRB, tax-agent | ✅ Covered |
| China→AU investor | investor_country=china + investor_goal_intl=property | advisor-match | FIRB-specialist, lawyer | ⚠️ Need "FIRB Property (Non-Resident)" link |
| HNW complex situation | complexity=complex + amount=whale | post-job or bundle-stack | (multi-advisor) | ⚠️ Verify post-job vs bundle-stack logic |
| Needs mortgage/broker | goal=home OR property_sub=physical → advisor_type=mortgage-broker | advisor-match | mortgage-broker | ✅ Covered |
| Needs tax/accounting | goal=super OR goal=crypto → advisor_type=tax-agent | advisor-match | tax-agent | ✅ Covered |
| Needs financial planning | goal=help → advisor_type=financial-planner | advisor-match | financial-planner | ✅ Covered |
| Needs buyer's agent | goal=property + property_sub=physical → advisor_type=buyers-agent | advisor-match | buyers-agent | ✅ Covered |
| Needs legal/conveyancing | goal=property + property_sub=physical → advisor_type=conveyancer | advisor-match | conveyancer | ✅ Covered |
| Comparing suburbs | goal=property + stage=exploring | diy-broker (calculators) OR advisor-browse | (any property advisor) | ⚠️ No suburb-comparison calculator link |
| Negative gearing | goal=property + experience=intermediate/pro | advisor-match | tax-agent, financial-planner | ✅ Covered (tax-heavy) |
| Capital growth focus | goal=grow + priority=simple | diy-broker (robo) | (robo-advisor) | ✅ Covered |
| Rental yield focus | goal=property + priority=income | advisor-match | financial-planner, tax-agent | ✅ Covered |
| Commercial property | goal=property + complexity=complex | advisor-match | commercial-property-agent | ✅ Covered |
| **Doesn't know what they need** | goal=help OR advisor_type=not-sure | post-job ("post a brief") | (none — quote funnel) | ✅ Covered |
| **Only wants education** | stage=learning | education-first (pillar articles, Q&A) | (none) | ✅ Covered |
| **Ready to book now** | stage=under-contract | advisor-match + urgency signal | (goal-dependent) | ✅ Covered |

**Action items:**
- [ ] Cross-border specialties (`lib/advisor-specialties.ts`) — verify all 5 specialties are live and routing correctly
- [ ] Property comparison intent — add calculator link to results ("Compare suburb values" → `/calculators/property-comparison`)
- [ ] HNW post-job vs bundle-stack — audit logic in `lib/quiz-outcome.ts`; ensure complexity=complex + amount=whale → bundle-stack is the primary outcome

### 2.2 — Question Language Clarity (Audit each of ~19 questions)

**Audit table:** Is the question clear? Do options make sense? Is there a valid "I'm not sure" path?

| Question | Clarity | Options | "Not Sure" Path | Issues |
|---|---|---|---|---|
| location | ✅ Clear | ✅ Australia / International / Expat | ✅ No (binary) | None |
| goal | ✅ Clear | ⚠️ 13 options; some overlapping (grow vs. automate vs. property) | ✅ "Something else" option (captures it) | Consider "pre-ipo" clarity — is it obvious to retail users? |
| stage | ✅ Clear | ✅ Under-contract / Ready / Exploring / Learning | ✅ "Just learning" is the escape | None |
| mode | ✅ Clear | ✅ DIY / Help / Unsure | ✅ "Unsure" is valid path | None |
| experience | ✅ Clear | ✅ Beginner / Intermediate / Pro | ❌ No "not sure" | Add "I'm not sure" option |
| complexity | ✅ Clear | ✅ Simple / Moderate / Complex | ❌ No "not sure" | Add "I'm not sure" option |
| amount | ✅ Clear | ✅ Under $10k / $10–100k / $100–500k / $500k+ | ❌ No "I'm not sure" | **CRITICAL** — large budgets are anxiety-inducing; "I'm not sure how much" is valid path |
| priority | ✅ Clear | ⚠️ 4 options; "safety (CHESS)" might confuse non-traders | ⚠️ Partial — "I'm not sure" not explicit | Add "I'm not sure / multiple priorities" option |
| advisor_type | ⚠️ Jargon | ⚠️ "SMSF accountant", "conveyancer", "estate-planner" — users might not know what these are | ✅ "I'm not sure" present | Add 1-line microcopy to each advisor type (see `/advisor/[slug]` for patterns) |
| property_sub | ✅ Clear | ✅ Physical / REITs / SMSF | ❌ No "I'm not sure" | Add option |
| investor_country | ✅ Clear | ✅ 13 countries | ❌ No "other" fallback above "other" | Ok as-is |
| visa_status | ✅ Clear | ✅ Non-resident / Temp visa / PR / Expat | ❌ No "I'm not sure" | Add option |
| investor_goal_intl | ✅ Clear | ✅ Property / Shares / Savings / Business | ❌ No "I'm not sure" | Add option |

**Action items:**
- [ ] Add "I'm not sure" paths to: experience, complexity, amount, priority, property_sub, visa_status, investor_goal_intl
- [ ] Microcopy for advisor types (especially jargon: SMSF, conveyancer, estate-planner)
- [ ] Clarify "CHESS sponsored" wording in priority question

### 2.3 — localStorage Security

**Current:** `localStorage.setItem('invest-quiz-v2-progress', JSON.stringify({ currentId, answers, history }))`

**Audit findings:**
- ✅ Email NOT stored in localStorage (captured inline during results, not persisted)
- ✅ Phone NOT stored in localStorage
- ✅ Name NOT stored in localStorage
- ✅ Only answers + currentId + history stored
- ⚠️ **Potential risk:** `answers` contains budget (small/medium/large/whale) — could infer wealth class. Not PII, but could be sensitive. **Action:** Document as low-risk; consider age-out TTL if localStorage is inspected maliciously. Currently no TTL.

**Action items:**
- [ ] Add localStorage expiry — 30-day TTL on saved progress (auto-clear if stale)
- [ ] Verify no email/phone/name in localStorage on actual page
- [ ] Add comment in code documenting what IS and ISN'T stored, and why

### 2.4 — Mobile Responsiveness

**Audit findings:**
- ✅ Quiz components use `md:` breakpoints (Tailwind)
- ✅ QuizQuestionScreen uses responsive spacing (`px-4 md:px-5`)
- ✅ MultiSelectOptions has responsive option heights (`min-h-13`)
- ⚠️ **Not yet tested on actual mobile** — type-check says responsive, but UX on iPhone SE / Android small-screen not verified

**Action items:**
- [ ] Start `npm run dev` and test on iPhone 12 / small Android emulator (Chrome DevTools)
- [ ] Check: question text wrapping, option button height/touch target (min 44px), back/next button placement, progress indicator visibility, results card layout

### 2.5 — Accessibility (a11y)

**Audit findings:**
- ✅ MultiSelectOptions uses `role="group"` + `role="checkbox"` + `aria-checked`
- ✅ Options use semantic button structure with icons
- ⚠️ Focus management — no explicit focus-trap or focus-on-next-question
- ⚠️ Contrast — using `text-slate-400` (3.5:1) on helper text; fails AA for small text
- ⚠️ Screen reader — no explicit aria-labels on result cards (name, rating, distance, fee are visually clear but may not be announced)

**Action items:**
- [ ] Add focus management: when a question mounts, focus the first radio/checkbox/button (auto-advance focus after submit)
- [ ] Upgrade text-slate-400 helper text to text-slate-500 or text-slate-600 (4.5:1+)
- [ ] Add aria-labels to result cards: `<div aria-label="Advisor: Alice Smith, Financial Planner, 5 stars, Sydney, Negotiable fee">`
- [ ] Test with keyboard-only (tab through all questions, answer via spacebar/enter)
- [ ] Test with screen reader (VoiceOver macOS or NVDA Windows)

### 2.6 — "Why We Matched You" — Verify Dynamic, Attribute-Driven

**Current implementation:** `getMatchReasons(answers, broker)` in `lib/quiz-advisor-match-reasons.ts`

**Audit findings:**
- ✅ File exists and is called
- ⚠️ Need to verify it's truly dynamic (not hardcoded templates)
- Need to see actual matching logic

**Action items:**
- [ ] Read `lib/quiz-advisor-match-reasons.ts` and verify it drives matches from real advisor attributes (specialties, available_in_countries, location, rating, years_experience, initial_consultation_free, etc.)
- [ ] If hardcoded, refactor to be attribute-driven
- [ ] Ensure match reasons reflect quiz answers (if user selected "needs mortgage broker", reason includes "mortgage expertise")

### 2.7 — Empty State / Closest Matches Fallback

**Expected behavior:** If no strong matches, show honest empty state + "closest matches" + clear "what to do next"

**Audit findings:**
- Need to verify code path handles zero results
- Need to check what message is shown

**Action items:**
- [ ] Trigger zero-match scenario (e.g. very niche combination) and verify fallback
- [ ] Check error message is honest ("No perfect match yet, but here are closest")
- [ ] Verify "what to do next" CTA exists (post-a-job? email list?)

### 2.8 — Edit-Answer Re-scoring

**Expected behavior:** User can click "edit answer" on a previous question; their answer updates; all downstream matches re-resolve

**Audit findings:**
- Need to verify this works end-to-end

**Action items:**
- [ ] Test: on results screen, click back to edit an earlier answer (e.g. "complexity: simple" → "complexity: complex")
- [ ] Verify: advisor matches change based on the new answer
- [ ] Verify: matches are re-fetched from API (not cached stale)

### 2.9 — Error Handling & Graceful Degradation

**Expected behavior:** API timeout / network error → graceful fallback (client-side fallback scores in `page.tsx` line 104–150)

**Audit findings:**
- ✅ Fallback scores exist for 30+ brokers
- ⚠️ Need to test actual timeout behavior

**Action items:**
- [ ] Simulate API timeout and verify fallback kicks in (no console error)
- [ ] Verify score results still render (even if stale)
- [ ] Check Sentry logs for graceful error handling

### 2.10 — Double-Submit & Rate-Limiting

**Expected behavior:** User submits quiz → lead recorded once (not duplicated on multiple rapid clicks)

**Audit findings:**
- Need to verify rate-limit on `POST /api/quiz/submit`

**Action items:**
- [ ] Check `app/api/quiz/submit/route.ts` for rate-limit logic
- [ ] Test: rapid-click submit button; verify only one lead recorded
- [ ] Check Sentry for duplicate-submit signals

---

## 3. INTENT COVERAGE — DETAILED MAPPING

See Section 2.1 above for full matrix.

---

## 4. ACCEPTANCE CRITERIA CHECKLIST

- [ ] Answers persist across refresh/close; resume **or** restart both clean; no sensitive PII in localStorage
- [ ] Questions/options improved where audit found weakness; every listed intent has a real route; "not sure" is a valid path throughout
- [ ] Each result card shows a dynamic, attribute-driven 3-bullet "Why we matched you"; matching reflects both quiz answers and real advisor data; edit-answers re-resolves matches
- [ ] Empty + closest-matches fallbacks exist with clear next steps; primary + secondary CTAs present; single-advisor allocation honoured
- [ ] Clean on mobile + desktop; no major a11y issues; **no console errors; no broken routes; no schema change required** (matching/scoring run on existing tables); existing quiz behaviour preserved; tests/QA done
- [ ] All 19 questions have clear language; all options make sense; all intents have a route

---

## 5. NEXT STEPS (IMPLEMENT PHASE)

1. Start `npm run dev` and manually test all flows (mobile + desktop)
2. Fix localStorage TTL
3. Add "I'm not sure" paths where missing
4. Fix a11y issues (contrast, focus, aria-labels)
5. Read `lib/quiz-advisor-match-reasons.ts` and verify dynamic matching
6. Test empty state / closest matches fallback
7. Test edit-answer re-scoring
8. Simulate API timeout and verify graceful degradation
9. Run tests: `npm test -- __tests__/lib/quiz-* __tests__/api/quiz-*`
10. Verify no console errors on all flows
11. Create PR with all improvements

---

