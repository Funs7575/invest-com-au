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

## Parking lot (raw ideas, not yet evaluated)

_(empty — drop new ideas here as they come up, evaluate when time permits)_

---

## Resolved / shipped

_(empty — move items here once they ship or are formally killed)_
