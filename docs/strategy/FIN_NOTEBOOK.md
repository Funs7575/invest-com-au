# Fin's Notebook

**Purpose:** persistent memory for strategic ideas, decisions, and "come back to this later" items. Survives across Claude sessions — point any new chat at this file and it picks up the thread.

**How to use:**
- New idea or decision worth remembering? Add it under the right section with today's date.
- Set a `Revisit:` date on anything you want to look at again.
- At month-end, scan the `Revisit in 1 month` and `Revisit in 2 months` sections.
- Don't delete anything — move resolved items to the bottom (`Resolved / shipped`).

**To resume in a new chat:** just say *"read docs/strategy/FIN_NOTEBOOK.md"* and Claude will load the context.

---

## Active strategic decisions log

### 2026-05-01 — Cross-border audit (deep)

The homepage v4 redesign exposed that the cross-border surface (`/foreign-investment` hub + 12 country pages) is **rich content with dumb monetization**. Bespoke deep guides (UK 2-audience, US FATCA/PFIC warnings, India NRI/ROR/DASP, SIV/188 pathways) already capture high-intent traffic. But every monetization signal — visa class, country of origin, journey direction — gets dropped at the funnel entrance. Lead lands in the same flat `$39/lead` advisor pool as a Brisbane share-trader.

**Decision: cross-border becomes a separate revenue product line**, not a content arm. Pricing, taxonomy, affiliate stack, funnel design, and reporting all split out.

**The LTV asymmetry that justifies the work:** a UK-arrival lead consumes ~$5–20k of professional fees over 18 months across pension transfer + non-resident mortgage + FX + FIRB lawyer + ongoing planner + insurance + recurring tax. **5–15× a domestic share-broker lead.** Same pattern (different intensities) for US-AU dual citizens, India-AU migrants, and non-resident investors.

**Audience segmentation** (the homepage section is muddled because it tries to serve all 4 from one card grid):
- **A. Inbound migrants** (UK / India / China → AU) — biggest absolute LTV, longest cycle, most complex
- **B. US-AU dual citizens in AU** — small audience, ~100% experience FATCA pain, recurring spend
- **C. Non-resident foreign investors** investing INTO AU without moving — high volume, lower per-lead value
- **D. Outbound Australians** (DASP, breaking residency) — moderate, time-limited

**Phase A (ship now, this session):** specialty taxonomy + premium pricing + CTA wiring + homepage section rewrite around audience A. Estimated $15–40k/yr realistic.

**Phase B (4–6 weeks, separate session):** `countries_served TEXT[]` schema migration + advisor portal self-selection UI + ranker country-match boost + remittance / FX / non-resident-mortgage / FIRB-lawyer affiliate panel. Estimated $30–80k/yr + Featured-partner sponsorship slots ($50–100k/yr if 3 slots filled).

**Phase C (Q2–Q3, BD-heavy):** visa advisor partner network (SIV / 188C premium CPL), pension-transfer specialist desk, US-AU tax desk, distinct cross-border reverse-marketplace flow. Estimated $65–200k/yr.

**Why this matters strategically:** the audit (2026-04-30) ranked 23 revenue ideas and surfaced ZERO cross-border items. That was a blind spot. Cross-border is now backlog item #24 and gets its own swim lane in the ship-now table below.

---

### 2026-04-30 — Revenue strategy review (this is the conversation that started this file)

Audited 23 candidate revenue ideas against the actual codebase. Big finding: a lot of infrastructure is already built but not commercialised. Four ideas dropped from "Q2/Q3 build" to "ship now" after audit. Full backlog and audit sit in this notebook below.

**Decisions made:**
- Pure marketplace placement auction: **NO**. Compliance risk too high (ASIC RG 246 conflicted remuneration), adverse selection (worst products bid hardest), thin AU market.
- Hybrid auction (editorial filter + bid + quality multiplier): **YES**. 90% already built in `lib/marketplace/auto-bid.ts`. Promote from Q3 → ship-now.
- Peer-to-peer asset auction (AirTasker for investments): **NO**. Securities law triggers, custody/settlement nightmare, adverse selection.
- Whisky/wine/art auction *house*: **NO**. Be the comparison + lead-gen layer above existing platforms instead.
- Own financial product (co-branded ETF/super): **NO** (for now). Different company, AFSL upgrade required, Y5+ spin-out only.

---

## Revenue backlog — full ranking (snapshot 2026-04-30)

### 🟢 Ship now (post-audit)

| # | Idea | Real effort | Status in codebase | Why ship-now |
|---|------|-------------|---------------------|--------------|
| 1 | Concierge wealth-stack builder | 3–4 wks | 70% built — extend `app/quiz/` + `lib/quiz-scoring.ts` | Quiz already does multi-product matching for brokers; extend to super/savings/robo. `app/api/concierge/route.ts` exists. |
| 4 | Rate alerts → high-intent email list | 2–3 wks | 30% built | Resend pipeline + cron infra reusable. Smallest build of any idea. |
| 7 | AI Q&A capture layer | 2–3 wks | 80% built — `lib/chatbot.ts` (RAG, Claude+OpenAI), `lib/embeddings.ts`, `lib/ai-cost-caps.ts` | Production-ready chatbot is admin-only today. Just needs public Q&A landing pages + question-capture form. |
| 5 | Hybrid auction self-serve | 4–6 wks | 90% built — `lib/marketplace/auto-bid.ts`, `app/admin/marketplace/` | Auction already running. Need: partner self-serve onboarding, quality multiplier (CTR/CR → bid rank), reserve prices, eligibility gate. **Needs legal sign-off before code.** |
| 10 | Premium research subscription | content only | 90% built — full Stripe (`lib/stripe.ts`), Pro tier (`app/pro/`) | Plumbing complete. Just write the premium content. |
| **24** | **Cross-border revenue line** (Phase A) | **1–2 days** | **95% built — `lib/advisor-billing.ts` flat-rate today, `email_captures.context.is_international` flag exists** | **Premium 1.75× lead price for cross-border leads + 5 new specialties (UK Pension Transfer, FATCA-Aware US Expat, FIRB Property Non-Resident, SIV/188C, DASP Processing) + filtered CTA wiring on country pages + persona selector + DASP calc + homepage section rewrite around audience A (inbound migrants). $15–40k/yr realistic. See decision log entry 2026-05-01.** |

### 🟡 Q2 / year-1

| # | Idea | Real effort | Status |
|---|------|-------------|--------|
| 3 | Lead generation (CPL replaces CPA) | 3–4 wks tech + 4–6 wks BD | 80% built — `app/api/{quiz-lead,advisor-lead,submit-lead,email-capture}/`, Resend webhooks |
| 2 | Switching-as-a-service (super, savings, broker HIN) | 4–6 wks per vertical | 40% built — calculators done, partner integrations missing |
| 9 | Awards / badges / methodology licensing | 6–8 wks (mostly editorial+legal) | 35% built — methodology page + best-of categories live |
| 6 | Alt-asset comparison vertical (whisky/wine/watches/art) | 4–6 wks per sub-vertical | 0% — greenfield, but pattern from existing 9 verticals replicable |
| 13 | Sponsored editorial / content studio | 4 wks ops setup | 40% built — AI drafting infra exists |

### 🟠 Q3 / harder

| # | Idea | Real effort | Status |
|---|------|-------------|--------|
| 8 | White-label comparison widgets (B2B SaaS) | 4–6 wks tech + 12+ wks sales | 50% built — `app/embed/` exists |
| 15 | Calculators-as-a-service / public API | 4–6 wks | 35% built |
| 11 | Market-intelligence data product | 8–12 wks | 40% built — PostHog wired, no DW yet |

### 🔴 Year-2+ / spin-out / never

| # | Idea | Verdict | Why |
|---|------|---------|-----|
| 14 | Off-market property syndicate matchmaking | Y2+ | Real market but 6–9mo build, KYC + deal vetting heavy |
| 12 | Pre-IPO secondaries marketplace (wholesale) | Spin-out | Standalone-company-sized bet, AFSL upgrade |
| 16 | P2P "post your investment for bids" | NEVER | Securities law trigger, adverse selection, no real market |
| 17 | Whisky/wine/art *auction house* | NEVER | Be comparison layer, not auctioneer |
| 18 | Pure auction (no editorial filter) | NEVER | RG 246 risk, premium partners walk |
| 19 | Own financial product (co-branded ETF/super) | Y5+ spin-out | Become a product issuer, capital + AFSL upgrade |
| 20 | Crypto-aggressive affiliate plays | NEVER | Reputation cost > revenue |
| 21 | Display ads / programmatic | NEVER | Kills UX, regulator hates them |
| 22 | Events / annual conference | Later | Different business |
| 23 | Robo-advice referrals without disclosure rigour | NEVER | Same RG 246 risk |

---

## Audit findings — capability inventory (2026-04-30)

Things already in the codebase that I didn't initially account for:

- **`lib/marketplace/auto-bid.ts` + `app/admin/marketplace/`** — full marketplace auction with auto-bidding (CPC → CPA optimization). Admin-managed today; missing self-serve onboarding.
- **`app/quotes/` + `app/api/quotes/[slug]/`** — existing advisor quote auction (B2C RFQ). The "AirTasker for assets" idea has a working sibling here. Worth examining whether the quote-auction pattern extends to deal sourcing (accountants bidding for SMSF setup, brokers bidding for refi, etc.).
- **Full Stripe + Pro tier** (`lib/stripe.ts`, `app/pro/`, all webhook handlers in `lib/stripe-webhook/handlers/`) — premium subscription technically complete, just not used.
- **`lib/chatbot.ts`** — production RAG chatbot with Claude+OpenAI fallback, prompt-injection classifier, AFSL guardrails, conversation audit logging, cost caps.
- **`lib/quiz-scoring.ts`** — full multi-product weighted scoring engine (broker-only today, structurally extensible).

---

## Revisit in 1 month (check ~2026-05-30)

- [ ] Has the concierge wealth-stack builder been spec'd / started? (idea #1)
- [ ] Did legal sign off on the hybrid auction quality-multiplier model? (idea #5)
- [ ] Did anyone actually pick up rate alerts? Smallest build, most embarrassing if still not done. (idea #4)
- [ ] Status of the four-item ship-now block in `TODO.md` (added 2026-04-30, PR #319).

## Revisit in 2 months (check ~2026-06-30)

- [ ] Re-examine the quote-auction extension idea (accountants/brokers bidding for service work). Does `app/quotes/` pattern make sense for non-advisor verticals?
- [ ] Has the AI Q&A capture (#7) accumulated enough question data to consider the market-intel data product (#11)?
- [ ] Re-evaluate alt-asset vertical (#6) — is there partner BD progress on whisky/wine/watches platforms?

## Revisit in 6 months

- [ ] Pre-IPO secondaries (#12) — has any AU competitor emerged? If still greenfield, reconsider as a serious spin-out.
- [ ] Awards programme (#9) — has Canstar/Finder shifted methodology in any way that creates an opening?

## Revisit at AFSL grant (late 2027)

- [ ] Idea #19 (own financial product) reactivates as a possibility.
- [ ] Anything currently gated by `agent_memory:licensing:afsl_granted_at`.

---

## Saved for later — full deferred backlog

Everything not in the ship-now tier, captured here with priority, trigger, and revisit date. Scan this list at month-end. Priority scale: **P1** = pursue as soon as ship-now wave clears · **P2** = next quarter · **P3** = next year · **P4** = revisit only if something changes · **P5** = never unless the world changes.

### P1 — pursue Q2 (after ship-now wave clears)

- **#3 Lead generation (CPL replaces CPA on hot categories)**
  - Effort: 3–4 wks tech + 4–6 wks BD
  - Status: 80% built (`app/api/{quiz-lead,advisor-lead,submit-lead,email-capture}/`, Resend webhooks)
  - Why P1: 10× revenue per user vs current affiliate model. Bottleneck is commercial agreements, not engineering.
  - Trigger to start: BD has 2+ partners willing to pay $80–250/lead in writing.
  - Revisit: 2026-06-01

- **#2 Switching-as-a-service (super first, then savings, then broker HIN)**
  - Effort: 4–6 wks per vertical
  - Status: 40% built — calculators done, partner integrations missing
  - Why P1: Turns existing calculator output into transactions. $80–250 per completed switch.
  - Trigger to start: Concierge stack (#1) live, so we have routed traffic to convert.
  - Revisit: 2026-06-01

- **#9 Awards / badges / methodology licensing**
  - Effort: 6–8 wks (mostly editorial + legal, light engineering)
  - Status: 35% built — methodology page + best-of categories live, no badge SKU
  - Why P1: Recurring revenue, near-zero marginal cost per badge sold, drives SEO traffic.
  - Trigger to start: Methodology defensibility audit signed off by legal.
  - Risk: collapses into paid-badge scheme if methodology isn't genuinely defensible.
  - Revisit: 2026-06-01

- **#6 Alt-asset comparison vertical (whisky → wine → watches → art)**
  - Effort: 4–6 wks per sub-vertical
  - Status: 0% — greenfield, but pattern from existing 9 verticals is replicable
  - Why P1: New SEO surface area with zero AU competitors. CPLs $200–500.
  - Trigger to start: 1+ partner BD conversation booked (Cask 88, WhiskyInvestDirect, Vinovest equivalent).
  - Revisit: 2026-06-30

- **#13 Sponsored editorial / content studio**
  - Effort: 4 wks ops setup
  - Status: 40% built — AI drafting infra exists (`app/api/admin/content/generate-draft/`)
  - Why P1: Higher margin than display, sticky retention.
  - Trigger to start: spare editorial capacity OR a partner asking unsolicited.
  - Risk: editorial independence must be visibly protected (disclosure rules).
  - Revisit: 2026-06-30

### P2 — pursue Q3 (year-1 stretch)

- **#8 White-label comparison widgets (B2B SaaS)**
  - Effort: 4–6 wks tech + 12+ wks sales
  - Status: 50% built — `app/embed/` + `EmbedBuilder.tsx` exists
  - Why P2: Recurring SaaS revenue. Same content, 5× the surface area.
  - Trigger: 1 anchor B2B customer signed (bank, news site, or accountant network).
  - Bottleneck: B2B sales motion (new muscle).
  - Revisit: 2026-09-01

- **#15 Calculators-as-a-service / public API**
  - Effort: 4–6 wks
  - Status: 35% built — calculators exist, no API gateway
  - Why P2: Adjacent SaaS revenue, low engineering cost.
  - Trigger: 1+ fintech / accountant SaaS willing to pay metered.
  - Bottleneck: small market, free competitors.
  - Revisit: 2026-09-01

- **#11 Market-intelligence data product**
  - Effort: 8–12 wks technical + ongoing enterprise sales motion
  - Status: 40% built — PostHog event collection wired, no DW layer
  - Why P2: Becomes a moat once AI Q&A (#7) accumulates 6 months of question dataset.
  - Trigger: #7 has 6 months of data in production.
  - Risk: enterprise sales cycles are long; needs dedicated ICs.
  - Revisit: 2026-10-01

### P3 — year-2 candidates (validate before committing)

- **#14 Off-market property syndicate matchmaking**
  - Effort: 6–9 mo
  - Status: 0% — greenfield
  - Why P3: Real market (currently happens in dodgy FB groups). Big lift — KYC, deal vetting, standard syndicate paperwork.
  - Trigger: someone actively asks us to broker a syndicate match (organic demand signal).
  - Revisit: 2027-01-01

### P4 — revisit only if circumstances change

- **#12 Pre-IPO / private company secondaries marketplace (wholesale only)**
  - Effort: 6–9 mo + AFSL upgrade work
  - Status: 5% — only wholesale-classification mentions in CFD content
  - Why P4: Genuinely big upside ($50k–500k deals × 3–5% take). But standalone-company-sized bet, not a feature. **Spin-out candidate, not a roadmap item.**
  - Trigger: AFSL granted (late 2027), AND no AU competitor has emerged.
  - Revisit: 2026-10-01 (competitor scan), 2027-01-01 (AFSL milestone check)

- **Quote-auction pattern extension** (uses existing `app/quotes/` infra)
  - Idea: extend B2C advisor quote auction to other service verticals — accountants bidding for SMSF setups, brokers bidding for refi business, conveyancers bidding for property settlements.
  - Effort: 2–4 wks per vertical (infra exists)
  - Status: parent infra at `app/quotes/` is production
  - Why P4: Real revenue but each new vertical needs its own partner pool. Validate one extension before committing.
  - Trigger: 1 specific service vertical has 3+ providers asking to be on the platform.
  - Revisit: 2026-06-30 (with the alt-asset BD scan)

- **#10 Premium research subscription content programme**
  - Effort: ongoing content motion (Stripe + Pro tier infra is 90% built)
  - Status: plumbing complete (`lib/stripe.ts`, `app/pro/`); content is the gap
  - Why P4 (was higher): infrastructure means *anyone can flip the switch* but content production requires editorial bandwidth. Don't block on this; ship when capacity exists.
  - Trigger: editorial calendar has a clear premium-tier slot for 6+ consecutive months.
  - Revisit: 2026-07-01

### P5 — NEVER (unless the regulatory or market world changes)

These are explicitly **don't build** decisions. Captured so future Claude sessions don't waste time re-relitigating them.

- **#16 P2P "post your investment for bids" marketplace (AirTasker for assets)**
  - Why never: securities law (prospectus/PDS triggers, AFSL requirement); adverse selection (worst stuff lists fastest); listed-share version has no real market (broker sale takes 30 seconds at same price).
  - The narrower version that works is #12 (wholesale secondaries) — see P4.
  - Reactivation trigger: only if AU regulator carved out a specific safe harbour for P2P investment-asset marketplaces. Not on the horizon.

- **#17 Whisky / wine / art *auction house* (you running the auction)**
  - Why never: Langton's owns AU wine, Chrono24 owns global watches, Cask 88 owns whisky. Custody, settlement, fraud, dispute resolution = different business with thin margins.
  - The version that works is #6 (be the comparison + lead-gen layer) — see P1.

- **#18 Pure auction for placement (no editorial filter)**
  - Why never: ASIC RG 246 conflicted-remuneration risk; adverse selection (worst products bid hardest); premium partners walk.
  - The version that works is #5 hybrid auction — already in ship-now.

- **#19 Own financial product (co-branded ETF / savings / super)**
  - Why never (for now): become a financial product issuer with capital requirements + AFSL upgrade + board obligations + liability. Different company, not a feature.
  - Reactivation trigger: AFSL granted + 3+ years operating history + clear retail-investor demand for an own-brand product. Y5+ at earliest.
  - Revisit: 2027-12-01

- **#20 Crypto-aggressive affiliate plays (high-CPA leverage products, offshore deals)**
  - Why never: ASIC enforcement appetite on finance-site reputation. Asymmetric downside.
  - Existing crypto vertical at compliant CPA terms is fine; pushing harder is the trap.

- **#21 Display ads / programmatic**
  - Why never: kills UX, regulator dislikes them on financial-product sites, race-to-bottom revenue, hurts the brand asset.

- **#22 Events / annual conference**
  - Why never (for now): real money but operationally a separate business; one COVID-style disruption from disaster.
  - Reactivation trigger: core revenue >$10M ARR AND someone on the team wants to run events as a P&L.

- **#23 Robo-advice referrals at scale without disclosure rigour**
  - Why never: same RG 246 risk as pure auction. Existing robo vertical at compliant disclosure terms is fine.

---

## Parking lot (raw ideas, not yet evaluated)

Drop new ideas here as they come up. Evaluate when time permits — assign a priority (P1–P5) and move into the appropriate section above.

_(empty)_

---

## Open commitments / revisit-by dates

Time-bound items that need a check-in at a specific date. Don't delete — strike through and timestamp when resolved so we keep the trail.

- **2026-05-16 — Quiz funnel post-deploy review.** PR #434 (quiz outcome resolver, post-results email capture, vertical drips, sponsor-boost vertical-aware) shipped 2026-05-02. Estimated +35–50% end-to-end conversion lift; ground truth requires 14 days of PostHog data on `quiz_outcome_primary_cta` distribution + `quiz_lead_capture` rate + drip open/CTR. Compare actuals vs estimate in this notebook on revisit. Remote-trigger scheduled.
- **2026-05-09 — Test-posture readiness call.** Currently B-grade: ~71% lib coverage, ~14% API-route line coverage, 38 TypeScript errors in test files (project gotcha — pre-push fails for non-loop sessions), 228 untested API routes. Realistic enterprise-grade timeline ~4–6 focused weeks; pre-launch must-do is TS errors + golden-flow E2E (1 week). Decide on a Friday whether to dedicate a sprint to it.
- **Drip cron kill-switch.** `abandoned_quiz_drip` is gated by `isFeatureDisabled('abandoned_quiz_drip')` (per `lib/admin/classifier-config`). The 27 vertical drip templates shipped in PR #434 sit dormant until flipped. Estimated +1–2% sitewide conversion uplift when enabled. No revisit date — flip when you're ready for the lead volume.

---

## Resolved / shipped

Move items here once they ship OR are formally killed. Don't delete — keep the trail so we can see what we built and what we walked away from.

- **2026-05-02 — Quiz funnel rebuilt.** PR #434 shipped: 7-outcome resolver (post-job, advisor-match, advisor-browse, calculator-first, education-first, diy-broker, bundle-stack) replaces binary DIY-vs-advisor track; email gate moved post-results (warm capture); 12 structured columns added to `quiz_leads`; 9 vertical drip-template variants × 3 steps = 27 drip templates; `applyQuizSponsorBoost` is vertical-aware (no crypto-sponsor over super result); `/quotes/post` prefills from quiz handoff. Migration applied to prod (project `guggzyqceattncjwvgyc`), 125 tests passing, all 25 CI gates green. Squash commit `f1d2017c` on main. Co-author Claude Opus 4.7.
