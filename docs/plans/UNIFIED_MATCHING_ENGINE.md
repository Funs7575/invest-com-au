# The Decision Engine — universal outcome router (v2, founder vision 2026-06-10)

**Vision (founder):** not a quiz, not a directory — a **smart decision engine**. It resolves the *right destination(s)* for each user: matched **advisors** when a professional is the answer, **specific scored listings** when browsing is, **both lanes at once** when both apply — handling multiple matches, shortlists, mixed goals, urgency and uncertainty gracefully, with transparency ("why this?"), side-by-side comparison, saving/managing, and journeys that resume without losing context.

**Surface:** `/get-matched` is the one funnel (decided). `/find-advisor` folds in at parity (P8).

---

## 1. Core architecture — lanes, not a single route

Today `inferRoute()` picks ONE `RouteType`. The engine becomes a **multi-lane resolver**:

```
answers ─► actionPlanToUnified() ─► UnifiedAnswers          (P1 ✅ shipped)
                 │
                 ▼
        resolveLanes(unified) ─► RankedLane[]                (P2/P5)
        lane = { kind, weight 0–100, reasons[], urgency, confidence }
```

**Lane kinds** (each has a scorer, a result block, and a "why"):

| Lane | Engine | Status |
|---|---|---|
| `advisor` | `deriveNeeds → pickPrimary` (ONE lead) + `scoreQuizAdvisors` ranking real `professionals` + `buildAdvisorMatchReasons` | ✅ built + translator shipped |
| `listings` | **NEW `lib/listings/match-listings.ts`** — score `investment_listings`: vertical fit, ticket size vs budget band, state/location, `listing_type` quality, recency. Pattern: `lib/home-listing-curation.ts` (pure+tested) | 🔨 P4 |
| `platforms` | `computeTopMatches` (brokers via `quiz_weights`) | ✅ exists |
| `brief` | Brief Studio `/briefs/new` — when supply is thin or needs are bespoke ("describe it, pros respond") | ✅ exists |
| `education` | learning exit → guides/courses/calculators (never a lead push) | ✅ exists |

**Lane weighting logic** (`resolveLanes`, pure + exhaustively tested):
- *Intent* sets base weights (property+physical → advisor high, listings med; browse/alt-assets → listings high; help_sub named → advisor very high).
- *Urgency* (`timeline`): `now` boosts advisor (and conveyancer rule), damps education; `researching` inverts — education/listings lead, advisor becomes a quiet secondary.
- *Certainty* (`help_preference`, count of "not sure" answers): low certainty → composite result + brief lane raised; high certainty → single dominant hero.
- *Supply check*: each lane reports real result counts; an empty lane (no matching listings / thin advisor supply) is demoted with an honest note and the brief lane backfills. **Never render an empty hero.**
- **Composite rule:** top lane is the hero; any lane within 25 weight-points ALSO renders as a full secondary block (not a link) — "both paths, side by side."

**Single-lead integrity is untouched:** multiple *lanes* ≠ multiple advisor leads. The advisor lane allocates ONE primary (team as directory links); shortlisting ≠ contacting; a lead only exists at explicit confirm.

## 2. Result surface — the match moment (UX redesign)

Adaptive hero by top lane; qualifying secondary lanes stacked below; workspace strip persistent.

- **Advisor hero:** photo · specialism · location/remote · trust signal · confidence band · 3 attribute-driven reasons · `Connect` (preview→contact-at-confirm, the §5.6 pattern) · `Save to my options` · rematch ("show me another").
- **Listings hero/block:** 3–6 *specific* matched listings (cards with the real criteria they matched: "NSW · $50k ticket · agriculture"), each `Save` + `View`; "see all N matching" deep-links the filtered directory (`categoryListingsHref` + params). Factual criteria matching only (see §6).
- **Platforms block:** existing TopMatch carousel.
- **Composite:** "Your situation points two ways" framing + a compare rail.
- **Every block:** its own "Why this is here" line from the lane's `reasons[]` — full transparency, never generic.
- Design system: existing tokens (slate/amber, directory primitives, AA contrast, ≥44px, focus management). Mobile-first; sticky bottom action bar (`StickyCTABar` pattern) holding `My options (N)`.

## 3. The workspace — "My Options" (manage multiple, resume, follow up)

The thing that makes it feel like a product, not a quiz. **Built on existing plumbing:**
- `action_plans` row (exists: persisted answers, `share_token`, email-save) = the journey spine. Add `saved_items jsonb` (P5 migration, RLS) holding `{kind: advisor|listing|platform, id, saved_at, note?}`.
- `anonymous_saves` + `claimAnonymousSaves` (exist) = anonymous→account continuity.
- Surfaces: results-page rail + `/plans/[share_token]` page (exists, extend) as the durable hub: matched advisor + status (previewed/connected/responded), shortlisted listings, platform picks, checklist, "what changed since you left" (new listings matching saved criteria — feeds the rate-alerts/drip infra).
- Resume: partial-plan recall (exists) + funnel events already instrumented.
- Follow-ups: drip templates (exist, flag-gated) get lane-aware variants; advisor `lead_outcome` events close the loop into `applyOutcomesRanking` so **the engine learns from real outcomes per lane**.

## 4. Comparison tools

- **Advisors:** extend the shortlist → side-by-side table (fees, specialties, response time, rating, corridor) — reuse `QuizComparisonTable`/directory `CompareBar` patterns. Compare ≠ contact; single-lead holds at confirm.
- **Listings:** `ListingCompareBar` (exists) wired into saved items.
- **Cross-lane "options board" (P7):** one screen — your advisor vs your listings vs DIY platform — with an honest "these aren't substitutes; here's how they fit together" explainer (general-advice framing).

## 5. Decision logic — explicit edge cases (each gets a test)

| Case | Behaviour |
|---|---|
| Conflicting signals (help_sub named + "browse" preference) | Named professional wins the advisor lane; listings still render as secondary (composite) |
| Total uncertainty (everything "not sure") | Guided composite: education hero + brief + "talk to someone" tertiary; NO hard lead push |
| Urgent + uncertain | Advisor hero (under-contract rule) + reassurance copy, education demoted not hidden |
| No listing supply in vertical/state | Lane demoted + honest note + brief backfill + "save criteria → alert me" |
| Thin advisor supply | Closest-match fallback (exists) + brief lane raised |
| Equity-raise / CSF verticals | **Excluded from listing lane** until the s708 wholesale gate exists (REGULATORY-AVOID-LIST §A; same rule as homepage teaser) |
| International user | Corridor-aware advisors (exists); listings filtered to `available to overseas buyers` flags only — never FIRB-blind suggestions; FIRB *explainer* links, never advice |
| Returning user / changed answers | Re-resolve lanes; diff badge ("your matches changed because you changed budget"); saved items persist |
| Anonymous vs auth | Everything works anonymous (plan token); account claim merges saves |
| Refresh / multi-device | Plan token is the source of truth; localStorage only caches position; no PII in localStorage |

## 6. Compliance redlines (general advice, AFSL ≈ late 2027)

Listing "recommendations" are **factual criteria matches** ("matches your stated budget/state/vertical") — never quality endorsements, performance claims, or "you should invest". Copy reviewed against `lib/compliance.ts`; disclaimer on every lane block; licence-mode gates respected (no rating renders in factual_only). Advisor lane = introduction service framing (exists). Brief lane never auto-shares contact details. **Anything touching capital-raising/CSF/credit stays out without founder+legal sign-off.**

## 7. Data & measurement

- New events on the existing typed schema: `lane_resolved` (kinds+weights), `lane_engaged`, `option_saved`, `options_compared`, `plan_revisited`. Funnel dashboards per lane; outcome loop per lane.
- No new tables except the `saved_items` column (P5) — everything else rides existing schema.

## 8. Build phases (each shippable, tested, flag-gated where live)

- **P1 ✅** Translator + single-lead allocation from get-matched answers (17 tests).
- **P2 ✅** Advisor lane live in `resolve` behind `advisor_match_v2_get_matched`: load candidates (reuse `/api/advisor-match` SELECT), `scoreQuizAdvisors`, return `TopMatch{kind:"advisor"}` + reasons + confidence (carousel already renders advisors). Flag off = zero change.
- **P3 ✅** Ladder rule 0 (user-named type wins) + missing-signal questions — shipped CODE-SIDE in FALLBACK_QUESTIONS (prod runs on fallbacks + ephemeral plans; the get_matched_questions DB seed rides the #1479 ledger repair). Original scope: missing-signal questions (AU state; country+visa for overseas/expat; advisor-type confirm) — one migration, sharpens P2 (engine already degrades gracefully). **DB seed now staged in gm08 (`20260611160000_gm08_questions_intents_seed.sql`) — mirrors FALLBACK_QUESTIONS + FALLBACK_INTENTS one-for-one incl. the new grow/income/trade/automate/royalties step-3 sub-questions; pending founder-approved apply.**
- **P4 ✅** `lib/listings/match-listings.ts` — pure, 8 tests; CSF equity_raise hard-excluded; FIRB gate for non-residents; factual-criteria reasons only. **Wired end-to-end post-P9:** `lib/getmatched/listing-top-match.ts` loads the active pool (anon client — public-read RLS), ranks via the scorer, and resolve returns `listing_matches` whenever the lanes surface listings; LaneResults renders the specific cards (save-able, canonical `listingUrl` hrefs, "not a recommendation" framing, no Connect — leads stay advisor-only).
- **P5 ✅** `resolveLanes` composite resolver (COMPOSITE_BAND 25, education-first researching inversion) + `saved_items` (gm05) + share-token save API + LaneResults multi-lane surface with My Options rail. Device QA pass still owed once a deploy target is restored.
- **P6 ✅** In-funnel lead capture: ConnectAdvisorModal (contact → OTP verify → submit-lead confirm fast-path), TopMatch.ref_id, Connect-primary on advisor cards with single-lead UI lockout, /plans/[id]/connected stamp for P9's outcome join.
- **P7a ✅** Advisor comparison table in LaneResults — display-safe fields (location/fees/specialties) ride TopMatch; comparing never contacts anyone. Cross-lane board + lane-aware drips remain backlog (§4).
- **P8 ✅** `/find-advisor` 301 → /get-matched at lead-capture parity. Cross-border deep-links (`?specialty=` / `?country=`) keep the dedicated flow until get-matched consumes those params; sitemap + quiz not-sure hrefs repointed to the one funnel.
- **P9 ✅** Outcome learning in the advisor lane: `fetchAdvisorOutcomeStats` + the shared `rankByOutcomes` blended into `computeTopAdvisors` ordering — fail-soft, empty history preserves pure engine order. Ranking-weight review cadence: revisit blend weighting once `/plans/[id]/connected` accumulates real outcome rows (~3 months).

**QA bar per phase:** unit tests on every pure module; contract tests on answer→lane mapping; bot-smoke on the funnel; device pass before any visual phase ships; merge tiers respected.

---
*P1 artifacts: `lib/getmatched/advisor-allocation.ts`, `__tests__/lib/getmatched-advisor-allocation.test.ts`. The §6 port-list in QUIZ_REDESIGN.md is absorbed into P2–P6 here.*
