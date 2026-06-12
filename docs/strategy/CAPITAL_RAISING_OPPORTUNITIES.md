# Capital-raising & business-funding opportunities — staged strategy

**Status:** exploration for founder review · **Owner:** Fin (founder) · **Created:** 2026-06-12
**Companions:** `REGULATORY-AVOID-LIST.md` · `AFSL-LAWYER-BRIEF.md` (Q2) · `LISTINGS_S708_LEGAL_BRIEF.md` ·
`docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md` · `FIN_NOTEBOOK.md` (2026-04-30 backlog, 2026-06-07/08 entries)

> Not legal advice. This is a strategy/engineering gate input, same posture as the avoid-list.
> Every item marked **[E]** matches a REGULATORY-AVOID-LIST escalator and is **never-autonomous**:
> no build, merge, un-draft, or flag-flip without founder + legal sign-off recorded in this repo.
> Regulatory parameters below are research-grade, not counsel-confirmed — items marked *(verify)*
> go to Sophie Grace / AFSL House before anything load-bearing ships.

---

## 1. Thesis

invest.com.au already has an **investment-opportunities side** (the `/invest` marketplace,
20+ verticals) and an **investor side** (comparison, quiz, advisor matching). What no one in
Australia owns — and what we are unusually well-positioned to own — is the **capital-demand
side**: the journey a business takes *before* it can raise. Roughly 2.7M actively trading
Australian businesses sit upstream of a fragmented funding industry (CSF platforms, business
lenders, angel groups, VCs, grant programs, brokers, advisors) that is **starved of qualified
deal flow and pays for it**.

The regulated core of capital raising — hosting offers, matching investors to deals, handling
money — is licence-heavy (CSF intermediary authorisation, market licence, MIS). But the
**pre-raise layer is not regulated**: educating a business about pathway options, scoring its
readiness, preparing its documents, matching it with accountants/lawyers/CFOs, comparing the
licensed platforms, and referring it onward are consulting, software, publishing and referral —
all inside the existing lean lane. The investors-side equivalents (education, platform
comparison, *generic* intent capture) are likewise lean-lane.

**Positioning:** be the Zillow of Australian business funding — the discovery, readiness and
referral layer — and let licensed intermediaries stay the conveyancer. Monetise both sides of
everyone else's regulated marketplace without becoming one, while keeping a clean option to
license up later (s708 wholesale under our planned AFSL; CSF intermediary as a 2027+ bet).

**Where the money actually is (2026 reality-check, researched 2026-06-12):** the equity-CSF
lane is strategically important but commercially small — FY25 CSF volume **halved to ~$33M
across 63 successful offers** (FY24 ~$64.5M), Equitise entered voluntary administration in
late 2024, and Birchal now carries ~70%+ of volume. The big funnels are: **2.73M actively
trading businesses** (ABS, June 2025), **~$80B/yr across ~2,000 Commonwealth grant programs**,
**$22.7B of commercial loans settled by brokers in just six months** (MFAA Apr–Sep 2024), and
**$5.4B/390 announced startup deals in CY2025**. So the strategy weights grants, SME debt
referral and raise-prep professional services as the revenue engines, with CSF/equity as the
positioning + data layer — and a contracting CSF market makes intermediaries *more* willing to
pay for qualified deal flow, not less.

Why us: the 30-year domain + GEO machine wins the "how do I raise money for my business
Australia" query class; the advisor marketplace (briefs, credits, auctions, squads) is exactly
the engagement engine raise-prep needs; the grants hub, startup vertical, hub blueprint with
`startup`/`angel`/`wholesale`/`business_for_sale`/`private_markets` lead queues, and the
`WholesaleAttestationGate` component already exist. Most of Stage 0 is **activation, not
greenfield**.

---

## 2. The regulatory corridor (what's open at each stage)

### 2.1 Bright lines that define the corridor

| Activity | Regime | Who can do it |
|---|---|---|
| Educating/comparing funding *pathways* (CSF vs debt vs grants vs angels) generically | factual information / publishing | **Us, today** (same footing as existing comparisons) |
| Consulting/software for an issuer about its own readiness (scores, checklists, doc prep) | unregulated B2B services | **Us, today** — advising a company about its own capital structure is not financial product advice to investors *(verify framing)* |
| Factual directory of funding **providers** (CSF platforms, business lenders, grant writers, angel networks) + referral with disclosed benefit | Corps Reg 7.6.01(1)(e)/(ea) "mere referral" exemption — inform + contact details only, **benefits disclosed at referral time**; no advice, no application-filling, no negotiating (that's arranging, s766C) | **Us, today**, with benefit disclosure and no advice about specific products. Birchal's own FSG already contemplates paying issuer- and investor-referral fees to third parties |
| Matching businesses with **professional-services providers** (accountants, lawyers, CFOs, pitch coaches) | unregulated (professional services are not financial products) | **Us, today** — identical legal shape to the existing advisor marketplace |
| Business-purpose **loan** comparison/referral | outside NCCP — predominantly-business-purpose credit is unregulated; no ACL to lend, broke or refer it (confirmed vs ASIC guidance; commercial brokers routinely operate unlicensed under CAFBA self-regulation) | **Us, today** mechanically — but **credit appears on the avoid-list**, so still legal-memo + founder sign-off first; traps are sole-trader personal-purpose leakage + mixed-purpose loans |
| Grants discovery + grant-writer referral | not financial products at all | **Us, today** (already live at `/grants`) |
| *Generic* investor intent capture ("alert me to early-stage AU opportunities") not tied to a specific offer | marketing/lead-gen; opted-in email/alerts don't engage anti-hawking (s992A covers unsolicited *real-time* contact only) | **Us, today**, with care on framing |
| Publishing content about a **specific live or intended CSF offer** | s738ZG binds *everyone* (strict liability, max 30 penalty units). **Safe harbour s738ZG(6):** the ad/publication is permitted — pre- and post-offer-doc — if it carries the prescribed statement (consider the CSF offer document + general risk warning before applying). The "independent third-party report" exception is **lost the moment we take any fee**; paid content rests on the prescribed statement alone and must stay rigorously factual (INFO 269) | Possible for us **with the prescribed statement on every such item** — but gate behind legal sign-off + a compliance-copy helper before any deal-level content ships |
| EOI / waitlist / matching on a **specific non-CSF private offer** | s734 advertising ban + s708(1) "personal offer" requirement is incompatible with public listing; the historic business-introduction relief is **fully dead** (CO 02/273 lineage: securities relief lapsed 1 Oct 2022; MIS remnant expired 1 Apr 2025 — ASIC declined to remake both, pointing at the CSF regime) | **No lawful unlicensed model exists in 2026.** Licensed channels only → [E] |
| Hosting CSF offers, gatekeeping issuers | CSF intermediary authorisation (RG 261/262) | [E] — separate authorisation |
| Matching wholesale (s708) investors to specific raises | AFSL with dealing/arranging; possibly market-licence questions at scale | Post-AFSL **and** post-`LISTINGS_S708_LEGAL_BRIEF` sign-off only |
| Running a venue where offers are regularly made/matched | Australian Market Licence (s791A); the low-volume exemption (Instrument 2016/888) caps at ≤100 transactions / ≤$1.5M per year + ASIC register — too small to matter | [E] — never on the roadmap as principal |
| Promoting/distributing property syndicates & funds (MIS interests) | AFSL general advice + distribution; retail schemes need a registered RE | Post-AFSL, factual/general-advice only; never operate a scheme |
| Touching investor money, escrow, nominee/custody | client money (s981A+), custody, AML/CTF | [E] — permanent avoid per D7 guardrails |

### 2.2 Regime parameters that shape product design
*(web-verified 2026-06-12 against ASIC RG 261/RG 38, ASIC instruments/media releases, the
Feb-2025 PJC wholesale report, ABS/MFAA/Cut Through Venture data — see §11 sources; counsel
still confirms before anything load-bearing ships)*

- **CSF (Part 6D.3A):** eligible issuers < $25M consolidated gross assets **and** < $25M
  consolidated revenue, unlisted, fully-paid ordinary shares only (s738H); issuer cap **$5M per
  12 months**; retail cap **$10k per company per 12 months** (policed by the intermediary);
  **5-business-day unconditional cooling-off** (s738ZD); offers hosted by a **single licensed
  CSF intermediary** (s738C/738L). **Market state:** FY24 ~$64.5M → **FY25 ~$33.1M across 63
  successful offers**; cumulative ~$347M across 489 offers since 2018. Active intermediaries:
  **Birchal** (dominant — ~70% of FY25, 97.5% of Q4 FY25 retail volume; cut its own valuation
  87%), **OnMarket**, **Swarmer**, **VentureCrowd** (multi-asset retail+wholesale); **Equitise
  is in voluntary administration (late 2024)**. Birchal economics: **$7k fixed + tiered success
  fee 8% (<$500k) / 6% ($500k–$1M) / 5% (>$1M)** — and its **FSG expressly contemplates paying
  referral fees to third parties who introduce issuers or investors**. The Stage-1 referral
  channel is standard practice, not a novel ask; a contracting market makes deal flow scarcer
  and our funnel more valuable — but revenue expectations for this lane must be modest.
- **s708(1) small-scale ("20/12/2"):** personal offers only — 20 investors, $2M, 12 months —
  offerees must have prior connection/indicated interest, and s734 bans public advertising.
  "Post your raise publicly" is structurally impossible for unlicensed retail surfaces — which
  is why the existing startup vertical must be wholesale-gated or off, and why the **lapse of
  the business-introduction relief (securities 2022, MIS 1 Apr 2025)** closed the loophole
  competitors might otherwise use.
- **s708(8)/(10)/(11) wholesale:** **$250k gross income (each of last 2 FYs) or $2.5M net
  assets**, evidenced by a **qualified accountant's certificate ≤ 2 years old**; professional
  investors $10M+. **PJC final report (Feb 2025): thresholds stay — no increase, no indexation**
  (only a periodic-review mechanism + possible objective criteria for s708(10)). Stage-2
  planning can rely on the current gate; the accountant-certificate flow (CR-10) is stable.
- **Referral exemption (Reg 7.6.01(1)(e)/(ea)):** inform that a licensee can provide the
  service + give contact details, **disclosing any benefit at the time of referral**; anything
  more (recommending, filling applications, negotiating, transmitting acceptances) is advice
  (s766B) or arranging/dealing (s766C). Our referral SKUs: flat per-referral fees, disclosed
  on-page, clean hand-off — consistent with RG 246 hygiene even though Birchal's FSG offers
  %-of-raise structures.
- **INFO 269 line (enforcement escalating — ASIC 26-081MR finfluencer crackdown):** factual
  information isn't advice; presentation that conveys a recommendation is; **being paid makes
  the advice characterisation more likely**, and "not financial advice" disclaimers don't cure
  substance. Pathway education and criteria-based provider comparison are the safe template;
  paid deal-level content is the danger zone.
- **Market-operation perimeter (s767A/s791A):** offers regularly made/accepted *through our
  facility* = financial market. The low-volume exemption (ASIC Instrument 2016/888) is tiny —
  ≤100 transactions and ≤$1.5M per 12 months, ASIC register required — one decent CSF round.
  Architecture stays "content + referral out", never on-site transacting.
- **MIS / property syndicates:** interests are financial products; retail schemes need a
  registered scheme + licensed RE; promoting/listing third-party MIS = general advice and/or
  arranging → **AFSL minimum**, plus **DDO distributor duties** (TMDs) which ASIC actively
  enforces. CSF shares (fully paid ordinary) sit **outside DDO** — the CSF lane is cleaner than
  the funds lane even post-AFSL.
- **Anti-hawking (s992A / RG 38):** covers unsolicited **real-time** contact only — opted-in
  emails/alerts are outside it (Spam Act hygiene applies). A phone-based concierge to retail
  *investors* would need positive consent (six-week validity); the business-side concierge
  (CR-06/Stage 1) talks to companies about their own raise, not to retail about products.
- **Business-purpose credit:** NCCP applies only to predominantly personal/domestic/household
  or residential-investment credit to natural persons — **business-purpose lending and broking
  need no ACL** (ASIC FAQ-confirmed; CAFBA-self-regulated industry norm). Traps: mixed-purpose
  predominance, reg-68 business-purpose declarations are not conclusive, sole traders borrowing
  for personal needs. Small-business responsible-lending exemption runs to 3 Oct 2026 (lender-
  side detail, not ours).
- **AML/CTF Tranche 2 (from ~1 July 2026):** captures the *professionals we refer to*
  (lawyers/accountants in deal work), not a referral/comparison layer — raising our partners'
  onboarding friction and making verification/data-room-prep **more** valuable to them
  *(scope verify — the one §2.2 item not confirmed by this round of research)*.

### 2.3 Safe-language pack (apply to every Stage-0 surface)

Add to `lib/compliance.ts` as a `capital_raising` compliance key (don't hardcode):

- Never: "invest in X", "investment opportunity" (for a specific business), "expected returns",
  "back this company", "don't miss out". Never show instrument/valuation/terms of an unlisted raise
  to retail.
- Always: "funding pathways", "explore whether your business is ready", "licensed crowd-sourced
  funding intermediaries", "we don't host offers or handle investments", "general information
  only" + `GENERAL_ADVICE_WARNING` on anything investor-facing.
- Business-side tools speak to the **company about itself** (readiness, documents, options) —
  never to investors about the company.
- Investor-side intent capture is **thematic only** ("early-stage", "AgTech", "$1–10k cheques"),
  never per-deal pre-offer; per-deal alerts fire only for offers live/announced on a licensed
  platform and carry the s738ZG(6) prescribed statement *(gate on legal sign-off)*.
- Wire `filterFactualOutput()` + the bots' compliance assertions over all of it.

---

## 3. What already exists (build on, don't rebuild)

| Asset | State | Reuse for |
|---|---|---|
| `/grants` hub: eligibility quiz, state directories, R&D/EMDG guides, `GRANTS_WARNING`, `LeadQueueRoute{kind:"grants"}` | **Live** | CR-04 monetisation (grant-writer marketplace, alerts) |
| Hub blueprint (`lib/verticals.ts` `HubConfig`, 12 monetisation levers) with `startup`/`angel`/`wholesale`/`business_for_sale`/`private_markets`/`family_office` queues already typed | Built | CR-01/02 "Raise" hub ships as config + content, not architecture |
| Quiz engine (get-matched pattern + standalone grants-eligibility precedent) | Live | CR-01 Funding Pathway Finder |
| Advisor marketplace: `professionals`, briefs + credit-debited accepts, quote auctions (`advisor_auctions`), squads, tiers $0–$499, dynamic lead pricing, firm accounts | Live | CR-06 Raise Squad, CR-07 readiness remediation referrals, internal bidding |
| Listings marketplace (`investment_listings`, 10 verticals incl. `startup`/`pre_ipo`/`fund`), auth-gated submission (PR #1459), one consolidation plan (D1–D7) | Live, capital verticals awaiting s708 ruling | CR-09 business profiles; Stage-2 wholesale listings |
| `WholesaleAttestationGate.tsx` + `lib/listing-match.ts` wholesale flags + `startupRaisesEnabled()` gate (off) + `getAfslStatus()` | Built, gated | Stage 2 |
| Directory primitives, `lib/sponsorship.ts` tiers, `lib/tracking.ts` `/go/` affiliate layer, partner CPL API (`api_customers`), Stripe (consumer Pro, API plans, advisor billing) | Live | CR-03/05 directories, referral monetisation, CR-13 placement |
| Verification rails: ABN/AFSL cross-checks on advisors, `advisor_verification_log`, OTP infra | Live (advisor-side) | CR-08 business verification |
| Intent/retention rails: `anonymous_saves` (now supports listings), alerts (`country_rule_alerts` pattern), notifications, drips, PostHog | Live | CR-10 investor circle, CR-11 follow/alerts |
| Cross-border / Country Mode (5 personas, 1.75× premium leads) | Live | foreign-investor demand for AU private markets (Stage 2+, geo-scope per avoid-list §C) |
| Document vault (consumer), `brief_messages` realtime chat | Live | CR-12 data-room-prep (issuer-side only) |

Prior rulings that stand (do not re-litigate): no P2P offer bidding (#16 NEVER), no auction house
(#17), no pure placement auction (#18), no success fees / % of raise / escrow / client money
(D5/D7), pre-IPO secondaries = spin-out-sized P4 (#12), property syndicate matchmaking = P3
trigger-based (#14). Everything below is designed around those.

---

## 4. The product ideas

IDs `CR-xx`. Effort: S ≤ 1 wk · M ≤ 3 wks · L ≤ 6 wks, grounded in §3 reuse. Compliance:
🟢 lean-lane now · 🟡 lean-lane with legal confirmation on one point · 🔴 [E] escalator (staged).

### Stage 0 — pre-licence, ship-now corridor (demand + data + retention)

**CR-01 · Funding Pathway Finder (flagship quiz)** — 🟢 · Effort M
"How should my business raise?" 8–10 questions (stage, revenue, amount sought, timeline, equity
vs debt tolerance, R&D spend, export activity, security/assets) → ranked *pathway types*: CSF /
angel-wholesale / VC / SME debt / grants / bootstrap-revenue / sale. Each result card: factual
explainer, eligibility facts (e.g. "CSF: < $25M assets+revenue, ≤ $5M/yr"), and the matching
next step (grants quiz, lender directory, CSF platform comparison, Raise Squad). Recommends
**categories, never products or deals** — calculator-grade logic, INFO 269-clean. Reuses the
quiz engine + grants-quiz precedent; routes to the already-typed lead queues.
*Monetises:* every downstream referral SKU; captures the business's profile (the demand-side
"Money Profile").
*Why flagship:* it is the funnel mouth for everything else, the GEO answer to the highest-value
query class ("how to fund a business in Australia"), and structurally un-copyable by Birchal
(they can't recommend debt) or lenders (can't recommend equity) — **neutrality is the moat**.

**CR-02 · "Raise" pillar + funding-pathway encyclopedia** — 🟢 · Effort M (content motion)
`/raise` hub: pathway-vs-pathway pages ("CSF vs angel round", "grant vs loan"), cost-of-capital
calculator (dilution vs interest vs grant co-contribution), stage guides, EOFY/R&D deadlines on
the data-news calendar. Pure GEO play on the existing editorial machine; answer-first + FAQ
schema. Feeds CR-01.

**CR-03 · CSF platform comparison + referral** — 🟢 (referral disclosure required) · Effort S–M
The comparison muscle applied to the licensed CSF intermediaries — **Birchal, OnMarket,
Swarmer, VentureCrowd** (note Equitise's 2024 administration; show only live platforms): fees
(e.g. Birchal $7k + 8/6/5% tiered success fee), minimums, sectors, track record, investor base —
factual table, same template as brokers. Outbound via `/go/` with `AFFILIATE_REL` + advertiser
disclosure; referral deals per **introduced issuer** (flat per-qualified-referral — we decline
the %-of-raise structures Birchal's FSG offers, per RG 246 hygiene and D5/D7) and per investor
sign-up where offered. Nobody runs this comparison in AU; it's the cheapest credible entry into
the space and the BD wedge for Stage 1 — but size expectations to a ~$33M/63-offer FY25 market:
this SKU is **positioning + partner leverage**, not a headline revenue line. Same treatment for
angel groups/syndicates and VC directories (factual, no matching).

**CR-04 · Grants monetisation expansion** — 🟢 · Effort M
The `/grants` hub is live but under-monetised. Add: (a) **grant-writer/consultant marketplace**
— a new professional type on the existing advisor rails (briefs, credits, quote auctions —
grant writers *bid* on a business's grant brief); (b) **premium grant alerts** (new programs +
closing-date warnings by industry/state — Stripe consumer/business sub, the `country_rule_alerts`
pattern); (c) R&D-claim-size estimator feeding accountant referrals. Zero financial-services
licensing anywhere in this lane; SEO volume is large and evergreen.
*This is the highest certainty/effort ratio in the whole document.*

**CR-05 · SME finance directory (business-purpose lending)** — 🟡 (avoid-list "credit" row ⇒
founder + legal memo precondition, even though research confirms the carve-out) · Effort M
Factual comparison of business lenders (unsecured working capital, invoice/asset finance,
commercial property) + referral to lenders/commercial brokers. **Research-confirmed:**
predominantly-business-purpose credit is outside the NCCP — no ACL to lend, broke or refer it
(commercial brokers routinely operate unlicensed; CAFBA self-regulation). The research agent's
verdict: *the lowest-regulatory-friction capital-raising-adjacent feature available.* It is also
the **largest near-term money** in this document — brokers settled **$22.7B of commercial loans
in six months** (MFAA), and lender referral fees are among the richest in the sector. Ships only
as **pure referral** (no loan recommendations, no application assistance), with intake screening
that excludes personal-purpose/sole-trader-consumer borrowers, and the legal memo on file per
the avoid-list. Pathway fit with CR-01 is perfect ("you're not equity-ready — here are debt
options").

**CR-06 · Raise Squad — professional-services matching for companies preparing to raise** — 🟢 · Effort M
The user-asked-for "advisor/accountant/legal matching for companies preparing to raise", built as
a brief template + squad bundle on existing rails: a business posts a **raise-prep brief**
(pathway from CR-01, stage, timeline) → accountants (s708 certificates, forecasts), lawyers
(term sheets, ESS, CSF offer docs), fractional CFOs, pitch/valuation coaches **bid via the
existing quote-auction mechanics** (internal bidding, already built) or respond as a pre-formed
**squad** (already built). Monetises through existing credits/tiers — flat B2B fees, RG 246-clean.
New supply side to recruit (the Public Demand Board pattern from RETENTION #23 recruits it
automatically: "41 businesses preparing to raise this month").

**CR-07 · RaiseReady Score (capital-readiness scoring)** — 🟢 (B2B consulting framing; never
investor-facing pre-legal-review) · Effort M
0–100 readiness score across financials hygiene, structure (share classes, ESS), traction
evidence, data-room completeness, story/deck, compliance basics. Free score + gap list → paid
deep report (Stripe one-off) → each gap links to a Raise Squad brief ("your cap table needs
work → 3 lawyers can fix this"). Advice **to the issuer about itself** = consulting, not
financial product advice *(verify framing with counsel once investor-visible)*. The score is
also future currency: if/when listings get wholesale-gated (Stage 2), "RaiseReady 80+" becomes
the platform's quality badge — and the dataset ("what makes AU raises succeed") becomes a moat.

**CR-08 · Verified Business layer** — 🟢 · Effort S–M
KYB-lite: ABN/ASIC registry match, director cross-check, domain/email control, optionally
accountant attestation. Badge + `verification_log` pattern reused from advisor verification.
Charged as a flat SKU or bundled with profiles (CR-09). No AML obligations (we provide no
designated service) *(verify)*. This is the trust currency every later stage needs — and
post-Tranche-2, pre-verified businesses are *cheaper for our partners to onboard*, which makes
referrals worth more.

**CR-09 · Business funding profiles ("Crunchbase for AU SMEs")** — 🟡 (one design rule does all
the compliance work) · Effort M–L
A company page: team, traction, sector, verification badge (CR-08), RaiseReady tier (CR-07),
and a **funding-intent status**: `building` → `exploring options` → `preparing` →
`raising via <licensed platform>` → `funded`. **The rule: a profile is never an offer.** No
instrument, valuation, terms, or "invest" CTA — pre-raise it is a business directory entry
(LinkedIn/Crunchbase precedent); when status = raising, the profile renders a factual notice +
link to the licensed intermediary **carrying the s738ZG(6) prescribed statement** ("consider
the CSF offer document and the general risk warning…") — the statutory safe harbour exists and
covers intended offers too, but because any fee we take kills the "independent third party"
exception, that rendering ships only after legal signs the exact copy *(until then, status caps
at "preparing")*. Investors can **follow** a company (CR-11); businesses see follower counts
(CR-14). Extends `investment_listings` + the D1–D7 consolidation rather than a new system.

**CR-10 · Investor education hub + Investor Circle (generic intent capture)** — 🟢 · Effort M
`/private-markets/learn`: risk-first education on CSF, angel investing, wholesale tests, VC
access, with the existing course/certificate rails ("Private-markets readiness" course).
**Investor Circle:** opted-in thematic preferences (stages, sectors, cheque band, wholesale
self-ID) — *never deal-specific pre-offer*. Includes a **s708-certificate explainer** routing to
accountants on the marketplace (they issue the certificates — a clean lead product nobody
aggregates). This is the supply-side counterweight that makes Stage-1 partner deals two-sided.

**CR-11 · Follow + thematic deal alerts** — 🟡 (alert-content rules need the legal memo) · Effort S–M
"Follow this company" (CR-09) and "alert me when AU AgTech offers go live". Statutory path
confirmed: opted-in emails don't engage anti-hawking (s992A is real-time-contact only), and
s738ZG(6) permits referring to live **and intended** offers when every item carries the
prescribed statement. Alert content = factual identification + prescribed statement + link to
the licensed intermediary, nothing promotional (the fee + INFO 269 demand rigorous factuality).
*Gate behind a flag until legal signs the s738ZG copy; interim: alerts link to the platform's
listings page, not a specific offer.* Retention mechanics identical to rate alerts.

**CR-12 · Data-room-prep kit** — 🟢 (issuer/advisor-side only) · Effort M
Checklist + templates + structured upload (extend the existing vault) so a business assembles
its due-diligence pack once: financials, cap table, contracts, IP, ESS docs. Shared **only with
the business's own engaged advisors** (squad members via brief chat) — never browsable by
investors pre-licence (that drift = arranging). Export-to-intermediary on handoff. Raises
switching costs enormously: the company's raise lives here even though the raise itself happens
on Birchal.

**CR-13 · Premium placement + sponsorship for funding providers** — 🟢 · Effort S
`lib/sponsorship.ts` tiers applied to the new directories (CSF platforms, lenders, grant
writers): featured-partner/editors-pick slots at flat monthly fees, labelled with
`ADVERTISER_DISCLOSURE`. Same hybrid-auction guardrails as brokers (editorial filter + quality
multiplier; never pure bidding — #18 NEVER).

**CR-14 · Demand Pulse (campaign analytics + market data)** — 🟢 · Effort M
The internal-economy closer. Businesses (paid tier): profile views, follows, alert subscribers,
pathway-quiz cohort stats ("12 investors following you; 60% wholesale-self-ID"). Partners (via
the existing partner/API billing): anonymised, aggregated demand signal — "retail intent for
AgTech CSF up 40% QoQ", "23 RaiseReady-70+ companies preparing in NSW". **Investor demand
testing without an offer ever existing on our surface.** Aggregated/anonymised only; no
per-investor data sale.

### Stage 1 — partnered referral economy (BD-led, same compliance posture)

- **CSF intermediary partnerships:** flat per-qualified-issuer referral fees (issuer-side),
  per-investor-signup fees (investor-side), co-marketed education. Our CR-07/CR-08 output is
  their pre-vetted deal flow — negotiate accordingly. The avoid-list's "factual listings with no
  offer facilitation" lean alternative is exactly this.
- **Lender + grant-writer CPL** on the existing partner API (`api_customers`) — same plumbing as
  advisor CPL.
- **Accountant s708-certificate referral product** (from CR-10).
- **"Raise Concierge"** — productised triage call by a marketplace professional (their fee,
  our flat referral) for businesses that want a human pathway decision.
- **Exit pathway referrals:** business-sale readiness content + business-broker directory
  (state-licensed brokers; share-sale edge cases need the legal memo *(verify)*) — completes
  CR-01's "sale" outcome.

### Stage 2 — AFSL granted (~Nov 2026 target; everything below stays dark until then) — 🔴 [E]-gated

- **Activate the wholesale (s708) lane** per the already-made D4 decision once
  `LISTINGS_S708_LEGAL_BRIEF.md` §5 is signed: `WholesaleAttestationGate` on lister + enquirer,
  startup/pre-IPO listings visible to attested wholesale only, enquiry = arranging under our
  AFSL *(per legal answers Q1–Q4)*. CR-09 profiles upgrade: wholesale viewers may see terms.
- **General-advice framing unlock** on the comparison layer ("best CSF platform for consumer
  brands") + richer recommendation copy in CR-01 results.
- **Wholesale EOI on specific deals** — the avoid-list's sanctioned "wholesale-only (s708)
  matching" lean alternative; volume guardrails so it never resembles a market venue *(legal:
  market-licence perimeter)*.
- **MIS/property-syndicate factual listings + general-advice distribution** for schemes run by
  licensed REs (the P3 syndicate idea returns in the lean shape: list/refer, never operate).

### Stage 3 — licensed future bets (2027+, each a separate founder decision) — 🔴 [E]

- **Own CSF intermediary authorisation** — build vs **acquire a licensed-but-subscale
  intermediary** (the market has more licences than viable platforms; an acquisition buys the
  authorisation, gatekeeping playbook and track record). Only pursue if Stage 0–2 proves we
  originate enough deal flow that paying Birchal's success fees on *our* funnel hurts. This is
  the "become the conveyancer" decision — gatekeeper duties, comms surveillance, retail caps —
  a different operating company in practice (consistent with #12's spin-out logic).
- **Wholesale secondaries board** — existing P4 spin-out stance unchanged.
- **Nominee/registry or custody services** — permanent avoid unless the company deliberately
  becomes an infrastructure provider (off-thesis).

---

## 5. Marketplace economics (the internal economy)

**The flywheel:** CR-01/02 (SEO/GEO) pulls businesses → CR-07/08 (score + verification) turns
them into structured, trustworthy supply → CR-06/04/05 (squads, grant writers, lenders) monetise
preparation through credits/briefs/auctions → CR-09/11 (profiles + follows) accumulate investor
demand signal → CR-14 sells that signal back to both sides → Stage-1 referrals convert prepared
businesses into partner revenue → partner success stories feed CR-02 content. Each loop deepens
the dataset (readiness benchmarks, demand by sector, advice-fee benchmarks for raise work) that
none of Finder/Canstar/Birchal can assemble — comparison sites lack the marketplace; the
intermediaries lack neutrality.

**Who pays, recurring-first:**

| Payer | SKU | Mechanism (all existing rails) |
|---|---|---|
| Businesses | RaiseReady deep report; Verified badge; profile + Demand Pulse tier; grant-alert sub | Stripe one-off + subscription |
| Professionals (new supply: grant writers, CFOs, ECM lawyers, pitch coaches) | lead credits, brief accepts, auction bids, tier subscriptions | advisor billing + credit ledger |
| Funding providers (CSF platforms, lenders, angel groups) | per-qualified-referral (flat), featured placement, Demand Pulse data, partner API | `/go/` + sponsorship + `api_customers` |
| Investors | free (deliberately) — optionally Investor Pro add-on for private-markets education/alerts | existing Pro |

**Liquidity mechanics:** quote-auction bidding gives instant pricing on raise-prep work; the
Public Demand Board pattern recruits the new professional supply with zero BD; squads bundle
multi-disciplinary engagements; follows/alerts let demand accumulate **before** any deal exists,
which is what makes issuer-side referrals valuable from day one. Retention: the readiness score
(comes back to improve it), grant deadlines (calendar pulls), follows (investor side), the
data room (sunk-cost vault), Demand Pulse (businesses check their numbers).

---

## 6. Prioritised roadmap & ROI

Sequenced around the **Oct–Dec 2026 migration freeze** (no new public surfaces in the window)
and the AFSL timeline ambiguity (Nov 2026 plan vs late-2027 notebook flag — Stage 2 keys off
`getAfslStatus()`, not a date).

| Priority | Items | Window | Revenue logic | Confidence |
|---|---|---|---|---|
| 1 | CR-04 grants monetisation + CR-01 pathway quiz + CR-02 hub | now → Aug 2026 | grant-writer credits + alert subs ship revenue in weeks; quiz builds the funnel asset | High |
| 2 | CR-03 CSF/angel comparison + CR-13 placement + Stage-1 BD opener | Jul–Sep 2026 | referral + sponsorship on new directories; partner conversations start | High |
| 3 | CR-06 Raise Squad + CR-07 RaiseReady + CR-08 verification | Aug–Oct 2026 (code can land in freeze if surfaces stay unlinked) | credits on a new brief category; report + badge SKUs | Medium-high |
| 4 | CR-09 profiles + CR-10/11 investor circle + CR-12 data-room kit + CR-14 Demand Pulse | post-cutover (Q1 2027) | profile/analytics subscriptions; partner data | Medium |
| 5 | Stage 2 wholesale activation | AFSL grant + s708 legal §5 | premium wholesale lead pricing; partner EOI fees | Gated |
| 6 | Stage 3 bets | 2027+ founder decisions | step-change take rates | Optional |

Rough sizing (order-of-magnitude, to pressure-test not to promise): grants lane $5–20k/mo within
two quarters (existing traffic + new SKUs against an ~$80B/yr, ~2,000-program grant pool and a
grant-writing market charging $500–$5k per small application); SME-debt referral is the largest
single lane if CR-05 clears legal (brokers settled $22.7B commercial in 6 months — even trivial
share at 0.3–1% referral economics is material); raise-prep marketplace $10–40k/mo at a few
hundred active briefs/quarter on current credit pricing; CSF/equity referral lane deliberately
small ($1–5k/mo near-term given the ~$33M FY25 market) but strategically priced into Stage-1
partner deals; Demand Pulse + profiles compound later. Collectively a second revenue engine
comparable to the cross-border line (#24), with a much larger licensed upside behind it.

---

## 7. Risks & kill criteria

- **Regulatory drift is the #1 risk** — each surface is safe alone; the *ensemble* (profiles +
  investor follows + alerts) must not quack like a deal platform. Mitigations: the §2.3 language
  pack in `lib/compliance.ts`, bots' hard compliance assertions on every CR surface, the §8
  avoid-list additions, legal memo before CR-05/09/11 nuances ship.
- **Scam/low-quality issuers** on profiles → verification-first (CR-08 mandatory for any
  funding-intent status), moderation queue reuse, no self-serve "raising" status.
- **Partner concentration + sector fragility** — Birchal is ~70%+ of a market that halved in
  FY25 and cut its own valuation 87%; Equitise already failed. A Birchal stumble strands the
  CSF referral lane entirely. → multi-partner from day one (OnMarket/Swarmer/VentureCrowd),
  keep the equity lane a minority of projected revenue (the grants/debt/services lanes carry
  the case), and treat "CSF market < $25M/yr or Birchal distress" as the trigger to re-weight
  toward wholesale/angel education and Stage-2 s708 instead.
- **Supply cold-start** (grant writers, CFOs) → Demand-Board recruitment + seed via existing
  accountant/lawyer base; kill a sub-vertical if < 3 active providers after 2 quarters.
- **Founder bandwidth** — Stage 1 is BD-shaped; route via Co-Founder per COMPANY.md tiers.
- **Kill criteria:** CR-01 completion < 40% or < 200 completions/mo by month 3 → demote to
  content; grant-writer auction fill < 30% → fold into general advisor matching; zero partner
  referral deals signed by Q1 2027 → freeze CR-09/11/14 and keep the content/SEO layer only.

## 8. Proposed REGULATORY-AVOID-LIST additions (append, founder to ratify)

1. §A row — **"Non-CSF private-offer solicitation/matching"**: EOI, waitlists, alerts or
   matching on any specific unlisted non-CSF raise (s734 + s708(1) personal-offer requirement;
   business-introduction relief fully lapsed — securities 2022, MIS 1 Apr 2025; no unlicensed
   model exists). Lean alternative: thematic intent capture only; specific deals live only on
   licensed channels.
2. §A row — **"CSF offer content without the s738ZG(6) prescribed statement"**: any mention of
   a specific live/intended CSF offer (pages, alerts, profiles) must carry the prescribed
   "consider the offer document + general risk warning" statement, stay strictly factual
   (paid content loses the independent-report exception), and is flag-gated until legal signs
   the standard copy. Lean alternative: provider-level comparison; offer-level content only
   via the signed-off helper in `lib/compliance.ts`.
3. Tripwire-table rows for CR-05 (business credit referral — legal memo precondition), CR-09
   funding-intent statuses (caps at "preparing" pre-sign-off), CR-11 alert content rules.

## 9. Questions to add to the legal brief (AFSL-LAWYER-BRIEF Q8, or s708-brief companion)

1. **s738ZG(6) standard copy**: sign off the exact prescribed-statement wording/placement for a
   paid third-party site referencing live/intended CSF offers (pages, profiles, email alerts),
   and confirm our paid-referral status doesn't otherwise taint the safe harbour given INFO 269
   (factual-only presentation, disclosure adjacency). Gates CR-09's "raising" status + CR-11.
2. **Referral-fee mechanics** with CSF intermediaries/lenders under Reg 7.6.01(1)(e)/(ea):
   flat per-qualified-referral fees OK (we decline Birchal's %-of-raise FSG structures)? What
   disclosure copy, where, at what moment of the referral?
3. **RaiseReady/readiness advice to issuers** — confirm consulting (not financial service) and
   any constraints once scores are investor-visible (Stage 2).
4. **Business-purpose credit referral** — confirm no ACL for our exact CR-05 flow incl. the
   sole-trader/mixed-purpose screens; interaction with the ACL contemplated in COMPANY.md.
5. **Business profiles as non-offers** — confirm the CR-09 design rule (no terms/instrument/CTA)
   keeps profiles outside Ch 6D/s734; any "arranging" creep in follow→alert mechanics at scale,
   and where the s767A market-operation perimeter sits for profile+alert ensembles.
6. **AML/CTF Tranche 2** — confirm a referral/comparison layer provides no designated service,
   and whether CR-08 verification or CR-12 data-room features change that.

## 10. Founder decision asks

1. Ratify the staged corridor + §8 avoid-list additions (this doc becomes the gate for CR work).
2. Greenlight Priority-1 build (CR-04 + CR-01 + CR-02) — fully lean-lane, no legal precondition.
3. Commission the §9 legal memo alongside the existing s708 brief (one engagement, both briefs).
4. Approve Stage-1 BD outreach order: Birchal + one challenger CSF platform, 2 SME lenders or an
   aggregator, grant-writer network — Co-Founder-led.
5. Confirm CR-05 (business lending) proceeds to legal review despite the avoid-list credit row
   (referral-only design), or park it.

## 11. Research basis (2026-06-12 web verification)

Primary: ASIC RG 261 (CSF guide for intermediaries — s738ZG analysis at RG 261.91–110), RG 38
(hawking), ASIC 22-267MR + the 2025 expiry notice for business-introduction relief (Instrument
2022/805), ASIC low-volume-markets guidance (Instrument 2016/888), ASIC INFO 269 + 26-081MR
(finfluencer enforcement), ASIC credit-licensing FAQs, PJC wholesale-investor final report
(Feb 2025), Corps Regs 7.6.01. Market: ABS Counts of Australian Businesses (June 2025: 2,729,648),
Birchal FY25 Funded report coverage (SmartCompany/cfotech: FY25 $33.1M/63 offers; FY24 $64.5M;
cumulative $347M/489), Birchal FSG (referral fees; $7k + 8/6/5% fees), Equitise administration
coverage (Startup Daily), Cut Through Venture State of Funding 2025 ($5.4B/390 deals), MFAA
Industry Intelligence 19 ($22.68B broker-settled commercial, Apr–Sep 2024), GrantConnect +
business.gov.au (~2,000 programs / ~$80B p.a., medium confidence). Knowledge-only (flagged
inline): AML/CTF Tranche 2 scope. AustLII blocked automated fetch, so statutory wording was
verified via ASIC's own guidance rather than the raw Act — counsel to confirm exact text.
