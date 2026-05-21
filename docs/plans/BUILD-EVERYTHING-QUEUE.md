# Build-Everything queue — source of truth

**Status:** active · **Created:** 2026-05-21 · **Driver:** `build-everything` cloud loop (see `BUILD-EVERYTHING-WAVE.md`)

Everything proposed in the 2026-05-21 strategy session, ordered for a self-continuing loop to build **surgically, to the highest quality, until complete.** Each iteration picks the lowest-numbered unblocked item, builds it, opens a PR, and ticks it here. **Read `docs/strategy/REGULATORY-AVOID-LIST.md` before every item — never build a HOLD/escalator item.**

Legend: `[ ]` todo · `[~]` in-progress (PR open) · `[x]` done (merged) · `[!]` blocked

---

## Phase 0 — Compliance floor (do FIRST; AFSL-irrelevant; cheap)
- [ ] **C1** Quiz CPC-campaign winner: render a "Sponsored"/"Ad" chip (paid placement currently unlabelled) — `app/quiz/`, `lib/quiz-scoring.ts`
- [ ] **C2** Advisor directory: disclose "Featured = paid placement"; rename badge — `app/advisors/AdvisorsClient.tsx`, `app/find/[advisor-type]/[city]`
- [ ] **C3** Quiz sponsor-boost disclosure: inline one-liner (RG 234 "clear & prominent"; currently collapsed) — `QuizResultsScreen.tsx`
- [ ] **C4** RLS: `site_ab_tests` `USING(true)` → `TO service_role` (anon can write today)
- [ ] **C5** RLS: `affiliate_monthly_reports` → scope off anon (anon can read revenue + write today)
- [ ] **C6** RLS: webhook `signing_secret` column grant; `startup_profiles.esic_verified_by`; `startup_rounds` financial terms; `firm_credit_balance_summary` view → service_role
- [ ] **C7** Flag OFF the `createPaymentForBrief` 10% clip (#859) until licensed — `lib/stripe-connect/index.ts`
- [ ] **C8** Startup equity-raise listings: wholesale (s708) gate on view + enquiry, or unpublish — `app/invest/startups/listings/*`
- [ ] **C9** Tidy: wealth-stack `GENERAL_ADVICE_WARNING` + flag; disable dead `/api/tax-optimizer` + `/api/portfolio-xray`; x-ray switch-CTA disclaimer; commodity-listing enquiry gate; advisor lead-auction framing disclosure

## Phase 1 — Wire up built-but-unplaced infrastructure (near-zero effort)
- [ ] **F1** Place `BookmarkButton` on broker / `/best` / advisor cards (imported nowhere today)
- [ ] **F2** Render `ExitIntentBrokerMatch` / `ExitIntentCapture` (built, never rendered)
- [ ] **F3** Fix quiz "Share result" URL to encode the result (shares blank quiz today)
- [ ] **F4** Fee-change alert capture on `/broker/[slug]` + `/compare`
- [ ] **F5** `SocialProofCounter` + `CohortInsights` on `/best/[slug]` + quiz results
- [ ] **F6** Post-signup notification-preference onboarding step
- [ ] **F7** `StickyCTABar` on `/best/[slug]`; save-shortlist + alert prompt on the compare bar
- [ ] **F8** "Verified AFSL/ACL" trust chip on advisor directory cards

## Phase 2 — Surface buried pages (cheap SEO + UX)
- [ ] **P1** Add `/tax` + `/insurance` hubs to nav; link `/tax-return` (seasonal) from `/tax`
- [ ] **P2** Surface `/just/[life-event]` + `/score` (nav/footer/home)
- [ ] **P3** Discovery surface for 25 `/investing-for/[occupation]` + `/marketplace` pages
- [ ] **P4** Surface `/wealth-stack` + `/concierge` (with the C9 warning)
- [ ] **P5** Link orphan sub-pages: `/super/*`, `/community/*`, thin `/global-investing/*`

## Phase 3 — UX polish (high-traffic surfaces)
- [ ] **U1** Migrate `/compare` to `components/directory/*` primitives
- [ ] **U2** Mobile compare: "show more columns" affordance
- [ ] **U3** First-run dashboard zero-state + wire `GettingStartedChecklist`
- [ ] **U4** Fix `UserOnboarding` modal (focus trap / `role=dialog`; fix "don't show again")
- [ ] **U5** Loading/empty/error states (`CommunityVote`, `find-advisor`)
- [ ] **U6** Inline validation + a11y on goals/profile forms + `AdvisorReviewForm` stars

## Phase 4 — New lean-lane consumer features
- [ ] **N1** Fee-impact visualiser, reusable across every fee/compare page (finish PR #1096)
- [ ] **N2** App-screenshot galleries on broker/crypto/savings listings (finish PR #1106)

## Phase 5 — Data products (low-effort moats; schema mostly built)
- [ ] **D1** "AU Brokerage Fee Index" — cron + index page + gated report (uses `broker_price_snapshots`)
- [ ] **D2** Public AFSL/AR lookup tool (expand `/afsl/[number]` to fuzzy search)
- [ ] **D3** Tiered Data API billing (wire Stripe to `api_keys.tier`)
- [ ] **D4** Fee-change monitoring API + broker-health feed (B2B)
- [ ] **D5** Cross-border tax reference API (`fi_*` tables → `/api/v1`)
- [ ] **D6** Embeddable rate/fee widget licensing (white-label tiers + rate-change webhook)
- [ ] **D7** Investor-intent cohort report pipeline (matures at ~6mo data)

## Phase 6 — B2B / supply-side
- [ ] **B1** Verification-as-a-Service (expose KYC/AFSL/ABN pipeline + trust mark)
- [ ] **B2** Firm branded-profile subscription (`/firm/[slug]` enhanced tier)
- [ ] **B3** Advisor lead-management CRM add-on (pipeline stages on briefs inbox)
- [ ] **B4** Advisor careers / recruiter marketplace (job board; no reg risk)
- [ ] **B5** B2B analytics / lead-quality benchmark dashboard

## Phase 7 — New consumer hubs (bigger; loop-friendly)
- [ ] **H1** Family-Office hub (directory + diagnostic quiz — highest revenue/effort)
- [ ] **H2** Retirement + Aged-Care hub (annuity + reverse-mortgage affiliate + facility listings)
- [ ] **H3** Alt-assets vertical (whisky/wine/watches/art)
- [ ] **H4** Outbound global-investing hub buildout (shares/etfs/lics/currency/bonds + tax sub-hub + calculators) — large, parallelizable
- [ ] **H5** Insurance comparison + lead funnel (VerticalConfig/HubConfig + quiz routing + lead wiring)
- [ ] **H6** Mortgage/home-loan hub — **referral-only** (ACL escalator: no credit assistance)

## Phase 8 — Distribution (stream EE)
- [ ] **E1** Embeddable widget marketplace (finish `app/embed`); WhatsApp/Telegram alerts bot
- [ ] **E2** Chrome extension (rate compare on competitor pages) — security-review-gated

## Phase 9 — Lifecycle-funnel moat
- [ ] **L1** Cross-hub lifecycle routing graph (founder→sell-business→SMSF→private; retiree→aged-care→estate) — intent-routing + cross-links across hubs

---

## HOLD — never-autonomous escalators (per `REGULATORY-AVOID-LIST.md`)
The loop **must NOT** build these — they need founder + legal sign-off (Tier E-equivalent). Surface, don't build:
- [!] Switching-as-a-service execution (arranging — lawyer line first)
- [!] Startup Portal completion SP-07..13 (securities / CSF / wholesale)
- [!] Pre-IPO / private secondaries marketplace (securities; post-AFSL)
- [!] Open-Banking / CDR net-worth (CDR accreditation)
- [!] Own/co-branded financial product (issuer/DDO; Y5+)
- [!] Any new consumer→adviser payment clip / DD-03 (client money + RG 246)

## Maintenance
Append items as discovered; don't delete — tick to `[x]` and move resolved blockers to the bottom. When all non-HOLD phases are `[x]`, the goal is complete.
