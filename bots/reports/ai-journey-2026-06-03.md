# AI Journey — Launch-readiness validation (2026-06-03)

**Target:** live Netlify production mirror (`https://lambent-sawine-17c3dd.netlify.app`).
**Goal:** map every key persona's end-to-end flow + confirm users can actually DO the
core actions (browse → compare → broker, book a consult, submit a lead, get quotes,
credit a wallet) with **no errors/bugs** — i.e. is it launch-ready.

**Method:** two complementary passes, because the link-crawler follows *links* but
can't drive live form-submits in this sandbox (the TLS-MITM proxy drops the async
fetches, and the Vercel deploy that would work is billing-blocked):
1. **Navigation** — AI-journey link-crawlers (13 personas this session) on the live site.
2. **Submit-logic** — the transaction handlers' own test suites (run deterministically).

The side-effect firewall (`bots/safety/money-paths.ts`) **mocks** payment / affiliate
`/go/` / lead / email / account writes on the live (protected) target — 0 real postbacks.

---

## Persona flow map

| Persona | Flow | Navigation (bots, live) | Notes |
|---|---|---|---|
| Beginner investor | home → compare/best → broker → "open account" (`/go/`) | ✅ 0 dead-ends | affiliate links firewall-mocked |
| Advice-seeker | `/find-advisor` → advisor → book consult / request quote | ✅ 0 dead-ends | fee + risk disclosures present on 15 pages |
| Marketplace lead | `/marketplace` → post job / get quotes | ✅ 0 dead-ends | — |
| Quiz / get-matched | `/quiz` → answer → result → act | ✅ 0 dead-ends | (live multi-step form submit not driveable in sandbox — see caveat) |
| Foreign investor | `/foreign-investment` → country → advisor/broker CTA | ✅ 0 dead-ends | — |
| Super / ETF / savings switcher | `/super` `/etfs` → compare → switch | ✅ 0 dead-ends | — |
| Tax tools | `/tax` → calculators/guides | ✅ 0 dead-ends | — |
| Account / dashboard (logged-out) | `/account` → login redirect | ✅ graceful redirect | auth-gated, by design |
| Broker portal (logged-out) | `/broker-portal` → login | ✅ graceful, no 500 | auth-gated |

**Bugs found during the sweep — all FIXED + merged this session:**
- `/invest/[…]/listings/[…]` + `/compare/[versus]` returned **500** on `notFound()` (missing co-located `not-found.tsx` on the Netlify runtime) → **#1315** (graceful boundaries).
- `/sitemap.xml` shards served **empty** (Netlify passes shard `id` as a string → `default: []`) → **#1316** (`Number(id)` + robots → shards).
- `/_vercel/speed-insights/script.js` **404** on every page (Vercel-only script) → **#1315** (gated to Vercel).

## Submit-logic (deterministic — the part bots can't drive live)

Ran every transaction handler's test suite: **58 files, 654 tests, ALL PASS.** Covers:
- **Lead:** `submit-lead` (+confirm), `advisor-lead`, `advisor-enquiry`, `quiz-lead`.
- **Booking:** `advisor-booking`, `bookings` (cancel/confirm), `consultation-book`/`-bookings`.
- **Brief (the core marketplace flow):** `briefs` + accept, book-slot, payment, messages,
  disputes, shortlist, intake-answers, status, withdraw, preview, ai-copilot.
- **Quotes:** `quotes` + accept, review, qa, reopen, v2, advisor-notify.
- **Auction:** `advisor-auction` + bid, public-bids.
- **Wallet credit:** `marketplace-wallet` (creditWallet/debitWallet/refund/adjust) + topup,
  adjust, webhook.

There is also dedicated **E2E** coverage in CI (`critical-path-get-matched-to-brief`,
`critical-flows`, `wave-12-flows`, `wealth-stack`, `cross-border-funnel`, `pre-launch-qa`).

---

## Verdict

**Flow-integrity: launch-ready.** Every persona's navigation path is reachable + error-free
on the live site (the 3 real bugs the sweep found were fixed + merged), and every
transaction handler (book / lead / credit / quote / brief / wallet) passes its tests (654).

**Caveats before calling it done:**
1. **Live form-submit not bot-confirmed in this sandbox** (proxy drops async fetches). The
   submit *logic* is proven by the 654 handler tests + E2E specs; the final "click submit on
   the deployed site and watch the lead land" confirmation needs the **Vercel deploy** (or
   running the Playwright E2E suite against a live target). → do this once Vercel billing is
   cleared.
2. **Post-auth portal flows** (advisor/broker wallet top-up, campaign create) need a logged-in
   session the logged-out bot can't establish — validated via the handler tests instead.
3. **Founder-gated launch blockers remain:** Vercel billing (→ canonical site), apply `#1273`
   (clears ~175 DB advisories), leaked-password toggle.

_No new bugs found in this pass — the 3 navigation bugs were already fixed + merged. Report
generated in-session (Claude as judgment brain, no API bill); firewall kept all writes mocked._
