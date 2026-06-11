# Get Matched — Showcase upgrade (v1, founder vision 2026-06-11)

**Vision (founder):** /get-matched is the platform's first impression — it should be a
*showcase of the platform's intelligence*: smart, slick, multi-featured, covering every
investor intent, visibly reacting to the user's answers, and converting that "wow" into
saved plans, leads and platform clicks.

**Why it underwhelms today (honest audit, 2026-06-11):**
The P1–P9 engine is genuinely smart — multi-lane resolver, real advisor scoring, listing
matching, outcome learning — but almost all of that intelligence is **invisible**:

1. The result hero is a static dark banner with template text. The engine's reasoning
   (lanes, weights, reasons) renders below the fold as plain text.
2. The "Analyzing" screen is a fake 1.5 s spinner — the single best "magic moment" slot
   in the funnel shows nothing real.
3. **No numbers anywhere.** The platform owns 25 calculators, live fee data,
   `quiz_weights`, cost scenarios — and the result page shows zero dollar figures.
4. Answers are frozen at resolve. The user can't flex budget/timeline and watch the
   engine re-rank — the #1 device for *demonstrating* an engine is letting people poke it.
5. No identity moment. We have `/persona/[type]` pages but the quiz never tells the user
   *what kind of investor their answers describe* — the single most shareable output.
6. The question phase has no momentum mechanics (no live supply narrowing, no visible
   reaction to each answer beyond the new route-preview chip).
7. The checklist is a flat to-do list, not a plan that feels generated for *them*.

**Compliance frame (unchanged, hard):** everything below is factual/calculator output or
"based on your stated answers" framing. No personal advice, no quality endorsements, no
"you should". Ratings respect licence-mode gates. REGULATORY-AVOID-LIST untouched.

---

## The showcase phases (G1–G9, each independently shippable)

### G1 — Real analyzing moment (effort S, impact ★★★)
Replace the fake spinner with a staged reveal of the *actual work*, fed by the resolve
response as it lands: "Scored 32 platforms on 8 signals → Ranked 14 verified advisors →
Checked listing supply in NSW → Building your plan". Counts come from the real payload
(`top_matches`, `listing_matches`, lane weights). End on an animated match-score count-up.
*Files:* `AnalyzingScreen.tsx` (rewrite), resolve already returns everything needed.

### G2 — Investor Profile hero (effort M, impact ★★★)
The result hero becomes an identity card: "Your stated profile: **Early-stage crypto
accumulator**" — derived by mapping intent × experience × timeline × budget onto the
existing persona registry (`app/persona/[type]`), plus a 4-bar "what you told us"
visual (urgency / certainty / budget band / DIY-vs-help) and the match-score dial.
Share/save CTA on the card. Strictly "based on your answers" framing.
*Files:* new `lib/getmatched/investor-profile.ts` (pure, tested), result hero rework.

### G3 — Numbers on the cards (effort M, impact ★★★)
Compare-lane results get real dollars: "On a $50k portfolio with ~12 trades/yr:
Platform A ≈ $118/yr · Platform B ≈ $204/yr — gap $86/yr" — computed from the existing
fee engine (`lib/cost-scenarios.ts` / fee-impact calculators) using the user's stated
budget band. Advisor cards get "typical engagement: from $X" where `fee_description`
parses. Factual calculator output only.
*Files:* new `lib/getmatched/fee-projection.ts` reusing cost-scenarios; card slots in
`TopMatchCarousel` + `LaneResults`.

### G4 — What-if controls / live re-ranking (effort M, impact ★★★)
Result-page controls (budget slider, timeline toggle, DIY↔help switch) that re-call
`/api/get-matched/resolve` (already stateless with `plan_id: 0` + answers) and animate
the re-rank: cards reorder, score updates, lanes swap. This is the "play with the
engine" feature — nothing demonstrates intelligence better than watching it react.
*Files:* `ActionPlanScreen` controls + FLIP animation; zero server change.

### G5 — Live narrowing in the question phase (effort M, impact ★★)
Left rail counter that narrows with each answer: "147 platforms · 89 advisors ·
1,240 listings → 12 platforms match so far". Needs one cached supply endpoint
(`/api/get-matched/supply?vertical=&type=`) over `brokers` / `professionals` /
`investment_listings` counts. Pairs with the shipped route-preview chip.

### G6 — Plan-as-roadmap (effort S, impact ★★)
Checklist becomes a visual timeline — **Today / This week / This month** lanes with
icons, the user's stated timeline stamped on it, progress persistence (already exists
via checklist toggles). Same data, generated feel.

### G7 — "Sharpen my match" confidence loop (effort S, impact ★★)
`match_explainer.score` < threshold → "Answer 2 more questions to sharpen your match"
chip → asks the highest-information unanswered questions (state, budget detail), then
re-resolves inline. Shows the engine knows what it doesn't know.

### G8 — Free-text AI intake (effort M, impact ★★, flag-gated)
"Or just describe it in your own words" box on step 1 → `lib/getmatched/ai-engine.ts`
(exists, flag-gated) parses to intent + prefill, skipping answered questions. The
conversational front door for the engine.

### G9 — Stack + alerts endgame (effort M, impact ★★)
After the plan: "Your full wealth stack" (reuse `buildStackResults` from
`lib/quiz-scoring.ts` — platform + super + robo in one view) and "Tell me when my match
changes" (rides `fee_alert_subscriptions` + the drip infra) — the retention loop.

---

## UX/UI polish wave (rides along every phase)
- Match-score count-up + card stagger-in on result reveal (`iv-reveal` exists).
- Sticky bottom bar holding `My options (N)` + primary CTA on mobile (StickyCTABar pattern).
- Named progress stages in the quiz ("About you → Your goal → Fine-tuning → Your plan")
  instead of bare step numbers.
- Skeletons over spinners everywhere; AA contrast; ≥44 px targets (house rules).

## Sequencing recommendation
**Wave 1 (this week): G1 + G2 + G3** — the result page transforms from "template text"
to "identity + numbers + visible reasoning" with no schema changes.
**Wave 2: G4 + G6 + G7** — interactivity and the play-with-it moment.
**Wave 3: G5 + G8 + G9** — question-phase momentum + AI intake + retention.

## Measurement
Existing funnel events cover start/step/resolve. Add: `whatif_used`, `profile_shared`,
`sharpen_answered`, `stack_viewed`. Success = resolve→CTA click-through, plan-save rate,
and lead conversion per lane (PostHog dashboards already wired).
