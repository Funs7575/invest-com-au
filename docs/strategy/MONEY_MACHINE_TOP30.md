# Money-Machine Top 30 — full-platform commercial analysis

**Date:** 2026-06-12 · **Status:** analysis for founder review — no decisions taken
**Method:** three full codebase mapping passes (route/journey surface, monetisation wiring, data model + advisor side) reconciled against `COMPANY.md`, `FIN_NOTEBOOK.md` (incl. the 2026-04-30 24-idea backlog), and `REGULATORY-AVOID-LIST.md`. Every claim about "what exists" below is grounded in a real file, table, or flag.

> Honesty note on numbers: all revenue figures are scenario maths in AUD, not forecasts. The dominant variable is post-cutover organic traffic on the aged domain (Nov 2026). Pre-cutover, the mirror has ~no traffic, so the 90-day plan optimises for *being ready to monetise traffic the day it arrives*, plus the few lines (B2B SaaS, partner BD, API) that don't need consumer traffic.

---

## 1. Diagnosis — the biggest missed commercial opportunities

**1. The machine is built; the ignition is off.** Six revenue channels are live in code (affiliate with click-id attribution, CPC marketplace with Stripe wallet settlement, self-serve sponsorship at $300–$2,000/mo, advisor leads at $39–68, consumer Pro at $9/mo, transactional email). Three more are *finished and dark*: advisor Pro subscriptions ($29–249/mo, `pro_subscriptions_billing` OFF), API billing ($49–149/mo, two missing env vars), advisor referral bonuses (legal-gated). On top of that: 27 drip-email templates dormant behind `email_drip_send`, the rate-alert mailer blocked on an unpushed migration, the cron fleet recently dark 19 days, and Vercel blocked. **The single highest-ROI item on this list is operational, not product.**

**2. Lead pricing ignores the data the platform already collects.** Every lead gets a 0–100 quality score, a money band, urgency and intent signals (`lib/advisor-lead-scoring.ts`) — and then gets sold at a flat $39. A hot $1M+ SMSF lead and a cold "just researching" lead are the same price. The `dynamic_pricing_rules` table already exists. This is a 2–4× ARPU lever sitting in shipped code.

**3. Five separate B2B billing silos, no internal economy.** Advisor credit ledger, broker wallets, sponsorship checkout, consumer Pro, API billing — five Stripe surfaces that never cross-sell each other. A broker buying CPC never sees sponsorship; an advisor hitting their lead cap sees a tier upsell but not credits, briefs, or badges. There are even **two competing advisor tier systems** (`lib/advisor-tiers.ts` Free/Growth/Pro/Elite vs `lib/pro-subscription/` free/starter/growth/scale).

**4. The brief/RFQ reverse marketplace is the most defensible asset and the least pushed.** Briefs + advisor bids + squads + private team threads + the engagement registry (30/90/365-day outcome check-ins) form a transactional loop that AI answer engines cannot summarise away and Finder/Canstar cannot copy without advisor supply. Its liquidity mechanics (paid responses, response guarantees, brief quality scoring) exist as tables and flags — `brief_credit_prices`, `response_guarantee`, `ai_brief_quality_scoring` — all dark.

**5. The domain is the unfair advantage and it's barely productised.** ~30 years of registration, exact-match `.com.au`, the GEO/AI-citation strategy already in motion. What's missing: brand products — "Verified on invest.com.au" badges advisors embed on *their* sites (distribution + backlinks + tracked referrals), the invest.com.au demand index media flywheel, awards/methodology licensing. The brand can sell trust at price points a no-name comparison site cannot.

**6. High-LTV verticals are monetised at commodity rates.** Cross-border (5–15× domestic LTV) has 1.75× pricing live but the affiliate panel (`CrossBorderPartnerPanel`) ships empty pending BD. SMSF, business exit/succession, estate planning, insurance — the highest-CPL categories in AU finance — are content-served but not lead-productised.

**7. Retention surfaces exist but aren't wired to money moments.** Watchlists, alerts, goals, holdings, fee monitor, streaks — built. The loop "alert fires → user returns → high-intent moment → monetised action (lead / `/go/` click / switch)" only just got its first mailer. EOFY — the Black Friday of Australian finance — has no campaign engine.

**8. One live regulatory tripwire.** `/invest/startups` remains retail-exposed with no s708 wholesale gate (REGULATORY-AVOID-LIST §A, tripwire table). This is a fix-first item regardless of revenue.

---

## 2. The ranked top 30

Category key: **[IMM]** immediate low-compliance money-maker · **[LIQ]** marketplace liquidity/retention · **[ADV]** advisor-side monetisation · **[USR]** investor/user retention · **[BIZ]** business/founder/capital-raising · **[CMP]** comparison/referral verticals · **[BET]** compliance-heavy future bet · **[INF]** technical/data infrastructure.

---

### #1 — Revenue Activation Sprint ("turn the ignition") [IMM]
**What:** Not a feature — a 2-week ops program that flips every dark, already-reviewed switch: set `STRIPE_API_BASIC_PRICE_ID`/`STRIPE_API_PRO_PRICE_ID` (API billing), flip `pro_subscriptions_billing` (advisor SaaS $29–249/mo), enable `email_drip_send` (27 dormant drip templates, est. +1–2% sitewide conversion), push the rate-alert + winback migrations, set `CRON_BRIDGE_ENABLED=true`, resolve the deploy target (Vercel unblock or formal Netlify migration), publish the first premium research editions for the *live* $9/mo consumer Pro.
**Why money:** every other idea compounds on a running engine. This alone plausibly opens $5–25k/mo at modest scale with ~zero new code.
**Serves:** all sides. **Model:** existing subscriptions + leads + drips. **Compliance:** Low (all previously reviewed). **Build:** Low (env vars, flags, one founder-run `db push` after ledger reconciliation).
**Unfair advantage:** none needed — it's already built.
**Deepens:** everything downstream assumes live billing, live crons, live lifecycle email.
**MVP:** the checklist above, executed. **World-class:** an `/admin/revenue-switches` panel showing every monetisation flag/env/cron with live status so a line can never silently go dark again (the cron fleet was dark 19 days and nobody noticed).
**Priority: 10/10.**

### #2 — Dynamic lead-pricing rate card (price-by-band) [ADV] [IMM]
**What:** Replace flat $39/lead with a published flat-fee rate card keyed on signals already computed: quality band (cold $19 / warm $39 / hot $79), money band (e.g. $500k+ or SMSF $149–249), vertical premium (cross-border 1.75× stays), with the existing free-lead allowance and dispute/refund path unchanged.
**Why money:** 2–4× lead ARPU with zero new demand. The platform already prices cross-border at 1.75× — this generalises the proof. High-band leads are currently a 5–10× underprice.
**Serves:** advisors (fairer pricing), platform. **Model:** per-lead flat fees (published rate card). **Compliance:** Low-Medium — flat published fees per band are advertising/referral charges, not %-of-advice conflicted remuneration; keep the rate card public and never price as % of fees (RG 246 fence). **Build:** Low — `getLeadPriceCents` becomes a rate-card engine reading `dynamic_pricing_rules` (table exists); scoring exists.
**Unfair advantage:** nobody else in AU has per-lead quality scoring wired into an advisor marketplace.
**Deepens:** makes lead quality the economic spine — funds the dispute system, the quality-weights cron, and priority allocation (#5).
**MVP:** 3 bands × 2 value tiers, advisor-facing rate card page, grandfathering note. **World-class:** per-advisor demand-aware pricing within published floors/ceilings, quarterly repricing from conversion outcomes in `engagement_registry`.
**Priority: 9.5/10.**

### #3 — Advisor Growth Suite: one SaaS ladder [ADV]
**What:** Merge the two parallel tier systems (`lib/advisor-tiers.ts` $0/$49/$149/$499 with lead caps/discounts/boosts vs `lib/pro-subscription/` $0/$29/$99/$249 with priority weights/accept caps) into ONE ladder, and bundle the already-built practice tools as tier features: lead CRM (pipeline stages exist), profile analytics (`advisor_profile_views`), booking (live), Slack/Zapier lead sync (live), content publishing + co-authorship (live), monthly performance reports (cron exists), health scorecard (live).
**Why money:** advisor SaaS is the most reliable recurring line in the building. 200 paying advisors × $150 blended = $30k/mo; 1,000 × $150 = $150k/mo. Everything is built except the packaging.
**Serves:** advisors, firms. **Model:** monthly/annual SaaS subscription. **Compliance:** Low. **Build:** Medium (consolidation + migration of tier semantics, not new capability).
**Unfair advantage:** the tools ride on the lead flow — practice software without leads (most adviser CRMs) is a harder sell than leads with software included.
**Deepens:** one ladder means one upsell narrative across leads, briefs, sponsorship and credits.
**MVP:** kill one tier system, map existing advisors, single pricing page. **World-class:** a true advisor OS — pipeline, content, compliance-safe marketing kit, benchmarking against `advisor_metrics_daily` cohort data.
**Priority: 9/10.**

### #4 — Brief marketplace liquidity engine [LIQ]
**What:** Make the brief/RFQ system the centrepiece: (a) responding to a qualified brief costs credits (`brief_credit_prices` table exists); (b) brief quality scoring gates which briefs are chargeable (`ai_brief_quality_scoring` flag exists); (c) consumer promise: "3 qualified responses in 48h" with escalation fan-out (`response_guarantee` flag exists); (d) squads compete on complex briefs (live); (e) outcomes feed verified reviews + the Wilson ranker (live).
**Why money:** marketplace take on every brief without ever touching client money — flat B2B response fees. Briefs monetise *complex* intent (SMSF setup, inheritance, exit planning) that flat lead-gen can't price.
**Serves:** consumers (competing responses), advisors/teams (qualified demand). **Model:** credits per response + SLA features in tiers. **Compliance:** Low-Medium (flat B2B fees; the existing 10%/15% payment-clip features stay OFF — see §8). **Build:** Medium — wiring dark primitives, not building them.
**Unfair advantage:** transactional and personal — structurally immune to AI-answer commoditisation; two-sided supply already seeded.
**Deepens:** turns the decision engine's "brief lane" into the premium path; the engagement registry gives it an outcome data moat.
**MVP:** credit-priced responses on the two highest-value brief types + the 48h guarantee. **World-class:** the default way Australians procure financial professionals — scoped brief, competing teams, verified outcome ratings, repeat engagements.
**Priority: 8.5/10.**

### #5 — Priority allocation auctions, quality-floored [LIQ] [ADV]
**What:** Two halves. (a) Activate the broker hybrid auction commercially — the quality multiplier shipped (PR #1498); remaining blockers are RG 246 legal sign-off + 2–3 pilot brokers. (b) Port the same pattern to advisor leads: advisors set a standing flat priority premium (e.g. +$20/lead) inside their filters; allocation ranks by **fit gate first**, then bid × quality multiplier. Never sell a bad match — priority only breaks ties among qualified advisors.
**Why money:** auction premium on scarce hot leads; 20–50% ARPU lift on contested categories; brokers' CPC budgets are the largest single pool once traffic lands.
**Serves:** brokers, advisors. **Model:** CPC bids (brokers), flat per-lead priority premiums (advisors). **Compliance:** Medium — explicitly the approved "hybrid" shape (editorial floor + bid + quality), auctions confined to *lead routing*, never product trading (market-licence fence). Blocked on the pending RG 246 sign-off — that packet goes to legal in week 1.
**Build:** Medium — `lib/marketplace/auto-bid.ts`, allocation, postbacks, wallets all exist; the advisor port reuses them.
**Unfair advantage:** quality-floored auctions need quality data; we have CTR/CR + lead outcomes, new entrants don't.
**Deepens:** monetises the ranking layer the directories already run on, with one auction brain across brokers and advisors.
**MVP:** broker pilots live; advisor priority premium in one contested category. **World-class:** self-serve budgets, dayparting, per-category reserves, public "how ranking works" page as the trust artifact.
**Priority: 8.5/10 (legal-gated).**

### #6 — "Verified on invest.com.au" badge + embeddable widget [ADV]
**What:** Productise verification: KYC + AFSL register cross-check + credentials (`advisor_kyc_documents`, `afsl_register`, `advisor_badges`, `advisor_certifications` — all live) → an annual paid verification ($199–499/yr) that includes an **embeddable badge/widget for the advisor's own website** showing verified status + live review score, linking back to their profile.
**Why money:** near-pure-margin recurring fee; Adviser Ratings proves AU advisors pay for credibility assets. 500 advisors × $299 = $150k/yr passive.
**Serves:** advisors; consumers get a real trust signal. **Model:** annual verification fee. **Compliance:** Medium — the badge asserts *verified credentials and review integrity*, never endorsement or "top advisor" (RG 234 implied-endorsement care); methodology page required.
**Build:** Low — badge system + embed infrastructure (`app/embed/`) exist; needs the widget route + checkout.
**Unfair advantage:** this only works with a trusted brand — the 30-year domain *is* the product. Side effect: hundreds of advisor sites linking back = backlink flywheel during the post-cutover SEO window.
**Deepens:** verification feeds ranking, briefs, and the badge becomes the top of the SaaS ladder funnel.
**MVP:** paid badge + static embed + verification page. **World-class:** the de facto trust mark for AU advice — consumer awareness campaigns, annual re-verification, dispute transparency.
**Priority: 8.5/10.**

### #7 — Sponsorship inventory expansion [IMM]
**What:** The self-serve sponsorship engine (`/advertise/packages`, $300–$2,000/mo tiers, Stripe checkout) currently sells 3 SKUs. Add labelled flat-fee slots: Morning Brief/newsletter sponsor, calculator sponsorships ("presented by"), country-page Featured Partner slots (component built, dormant), rate-alert email footer, data-news surfaces (`/rates/today`, `/fees/today`).
**Why money:** each surface is a $300–2,000/mo SKU on existing traffic; 10 surfaces at 50% fill ≈ $50–100k/yr, no marginal cost.
**Serves:** brokers, fund managers, FX/mortgage partners. **Model:** flat-fee sponsorship, always disclosed (SponsorChip + `ADVERTISER_DISCLOSURE_SHORT` pattern already standard). **Compliance:** Low-Medium — flat fee, labelled, editorial wall intact; the homepage 3-of-6 cap precedent applies.
**Build:** Low — pattern + checkout exist per surface.
**Unfair advantage:** sponsors buy the domain's authority halo, not just impressions.
**Deepens:** funds the free consumer layer without display ads (which stay banned).
**MVP:** newsletter + 2 calculator sponsors. **World-class:** a self-serve inventory marketplace with audience stats per slot from PostHog.
**Priority: 8/10.**

### #8 — Cross-border line, Phase C: partner activation [IMM] [CMP]
**What:** The 1.75× premium pricing is live end-to-end and `CrossBorderPartnerPanel` is built but ships empty. Sign the referral deals: FX/remittance (OFX/Wise), non-resident mortgage brokers, FIRB lawyers, pension-transfer specialists; populate the per-country config; stand up the SIV/188C premium CPL desk.
**Why money:** cross-border users consume $5–20k of professional fees over 18 months (5–15× domestic LTV); CPLs of $50–200+ are normal. Notebook sizing: $65–200k/yr at Phase C maturity.
**Serves:** migrants, expats, non-resident investors; specialist advisors/partners. **Model:** CPL/CPA referral + featured-partner sponsorship slots. **Compliance:** Low-Medium — referral-only (AML/remittance stays with the licensed provider; no FX service from us), disclosures baked into the panel component.
**Build:** Low (config + BD); the engineering shipped 2026-05-20.
**Unfair advantage:** the corridor content depth (UK/US/India/China/SG guides) already ranks as citable content; competitors have thin pages.
**Deepens:** proves the "premium corridor" model that SMSF/exit/estate verticals (#12, #24) then reuse.
**MVP:** 3 signed partners on 2 corridors. **World-class:** per-corridor concierge journeys with specialist advisor pods + partner stacks.
**Priority: 8/10 (BD-bound, not code-bound).**

### #9 — Portfolio Fee X-Ray (the flagship free tool) [USR] [CMP]
**What:** Upload holdings (CSV import exists; Sharesight read-only sync is built on a held branch) → factual fee decomposition: what you pay vs category medians, fee drag over 10/20/30 years (fee-projection engines exist), rendered as *category alternatives*, never "switch to X". CTA: compare cheaper options (affiliate) / talk to an adviser (lead).
**Why money:** the single best lead-and-affiliate generator a comparison site can run — "Australians overpay $X in fees" is also a PR/GEO machine. Each X-ray ends at a monetised decision moment.
**Serves:** retail investors. **Model:** affiliate clicks + advice leads + Pro upsell (saved X-rays, monitoring). **Compliance:** Medium — must stay factual comparison (general-advice warning, no directive language); note the old `portfolio-xray`/`tax-optimizer` endpoints are avoid-list tripwires to be **disabled** and replaced by this factual build; output copy goes through legal once.
**Build:** Medium — assembly of existing engines (fee projections, category medians, holdings import) into one surface.
**Unfair advantage:** fee data across brokers/funds is already maintained (fee-recheck pipeline, broker changelogs) — the data asset exists.
**Deepens:** gives the holdings tracker a reason to exist and the fee monitor a famous front door.
**MVP:** CSV upload → fee table vs medians → 2 CTAs. **World-class:** annual "Fee Census" report (media moment), saved X-rays with drift alerts, super fund edition.
**Priority: 8/10.**

### #10 — s708 wholesale gate + startup vertical re-gating [BIZ] [BET]
**What:** Build the wholesale-investor (s708) certification gate (legal brief exists: `LISTINGS_S708_LEGAL_BRIEF.md`; founder direction set; table work held), re-gate `/invest/startups` equity raises behind it, then monetise the wholesale lane: flat listing fees from issuers ($500–5k), factual listings only, zero offer facilitation, zero success fees.
**Why money:** secondary to risk reduction — the vertical is currently a live avoid-list tripwire (retail-exposed capital raises). Once gated: clean flat-fee listings revenue and the foundation for any future wholesale product.
**Serves:** founders/issuers (wholesale only), sophisticated investors. **Model:** flat listing fees + featured slots. **Compliance:** **High — explicit escalator; never-autonomous; requires founder + legal sign-off (D4) before any un-gating.** The compliant shape is exactly the avoid-list's lean alternative.
**Build:** Medium (gate + cert verification flow; schema currently held behind the migration-ledger freeze).
**Unfair advantage:** "invest.com.au/startups" is the URL every AU founder would guess; nobody owns compliant wholesale discovery.
**Deepens:** completes the marketplace's 10th vertical safely instead of amputating it.
**MVP:** gate live, equity raises invisible to retail, 10 wholesale-verified investors. **World-class:** the default wholesale deal-discovery layer (always referral/listing, never CSF) with capital-readiness scoring (#24).
**Priority: 7.5/10 — risk-driven urgency, revenue later.**

### #11 — Money-Moments campaign engine (EOFY/RBA/tax-time) [IMM] [USR]
**What:** Productise the Australian financial calendar: EOFY super-contribution deadlines, RBA decision days, tax time, new-FY rate resets. Pre-built campaign surfaces + targeted sends (newsletter/drips/push exist) + seasonal sponsor premiums + countdown modules on relevant pages (market-events calendar already shipped).
**Why money:** finance converts on deadlines. EOFY alone can carry a quarter's affiliate + lead volume; sponsors pay seasonal premiums for guaranteed-attention slots.
**Serves:** consumers, sponsors. **Model:** affiliate + leads + seasonal sponsorship. **Compliance:** Low (factual deadlines + general-advice warnings; no "act now" advice framing).
**Build:** Low-Medium — calendar, cron, email, sponsorship rails all exist; needs the campaign orchestration layer.
**Unfair advantage:** AI assistants cite deadline/factual content heavily — seasonal pages are GEO magnets on an authoritative domain.
**Deepens:** gives every retention surface (alerts, digests, dashboards) a revenue-bearing reason to fire.
**MVP:** EOFY 2027 campaign pack (it's June — EOFY is NOW; a lean 2026 version in 2 weeks is the test run). **World-class:** an always-on seasonal engine with per-segment journeys and sponsor inventory sold a quarter ahead.
**Priority: 7.5/10.**

### #12 — Mortgage + SME-finance referral verticals (referral-only) [CMP] [BIZ]
**What:** Expand the two largest CPL pools in AU finance as *pure referral*: (a) home-loan referral on property surfaces (FHB handoff exists; stays mere-referral, never credit assistance — ACL fence); (b) SME/business finance hub (business-purpose lending sits largely outside NCCP) referring to brokers/lenders at $100–600 CPL.
**Why money:** mortgage referral fees ($300–700/settled) and SME lending CPLs dwarf share-trading affiliate rates; property + business content surfaces already exist to host them.
**Serves:** property buyers, SME owners; mortgage/finance brokers. **Model:** CPL/CPA referral. **Compliance:** Medium — the NCCP referral exemption requires disciplined "introduce only, disclose any fee" mechanics; no loan recommendations ever. Legal reviews the referral flow copy once.
**Build:** Low-Medium (vertical patterns + `/go/` infra exist).
**Unfair advantage:** invest.com.au property-investment intent is exactly the high-LTV borrower mortgage brokers want.
**Deepens:** completes coverage of the full household balance sheet rather than just the investing slice.
**MVP:** referral panels + tracked handoffs on the top 10 property pages and the business-finance hub. **World-class:** named-partner desks with SLA response and outcome postbacks (same postback infra as brokers).
**Priority: 7.5/10.**

### #13 — "Rate Mover" savings/TD switch concierge [USR] [CMP]
**What:** Rate alerts (mailer just shipped) become a switch concierge: alert fires → one-tap factual comparison of current vs best rates → referral to open the better account (bank CPAs $20–100), with TD maturity-date reminders (`user_term_deposits` exists).
**Why money:** deposit switching is the highest-volume, lowest-risk referral conversion in fintech; recurring (rates change monthly).
**Serves:** savers. **Model:** CPA referral + sponsor slots on rate boards. **Compliance:** Low — factual rate comparison + referral under general advice; banks are the least contentious partners.
**Build:** Low-Medium (alerts, rate data, `/go/` exist; needs the journey glue).
**Deepens:** the cleanest expression of "alert → return → money moment" the retention stack was built for.
**MVP:** alert email gains "your switch options" block. **World-class:** maturity-ladder planner with automated re-shop each rollover.
**Priority: 7.5/10.**

### #14 — My Money HQ (the daily-habit dashboard) [USR]
**What:** Assemble the built-but-scattered pieces — holdings, fee monitor, goals, watchlists, alerts, streaks (live but hidden), morning brief, Invest Score — into one default logged-in home with a daily-glance loop.
**Why money:** indirect but multiplicative: returning users are the inventory every other idea sells. North-star metric already proposed (Weekly Decision-Ready Returners).
**Serves:** retail investors. **Model:** none directly; raises conversion of everything. **Compliance:** Low-Medium (manual entry / read-only Sharesight only — **no CDR ingestion**, per avoid-list).
**Build:** Medium (assembly + IA, not new systems).
**Unfair advantage:** the delight layer (journey stages, streaks, celebrations) is already shipped and dark — competitors have static dashboards.
**MVP:** one `/account` home uniting the five strongest widgets. **World-class:** the "OS for investing" — readiness score, next-best-action, life-event journeys.
**Priority: 7/10.**

### #15 — Unified B2B wallet + credit economy [LIQ] [INF]
**What:** One prepaid credit balance per business account spendable on leads, brief responses, priority premiums, sponsorship, API overages — unifying `advisor_credit_ledger` + broker wallets behind one lib; volume discounts on packs (packs + auto-topup + dunning crons already exist).
**Why money:** prepaid float, higher commitment, one cross-sell surface ("you have 40 credits — try a featured slot"), materially higher switching costs.
**Serves:** advisors, brokers, partners. **Model:** credit packs with breakage + volume tiers. **Compliance:** Low (B2B prepaid only; never consumer-facing stored value — that's the client-money fence).
**Build:** Medium (ledger unification behind an interface; both ledgers are well-built).
**Deepens:** this *is* the internal economy — every marketplace mechanic prices in one currency.
**MVP:** advisor credits spendable on briefs + priority. **World-class:** account-level wallet across all SKUs with finance-team invoicing and budgets.
**Priority: 7/10.**

### #16 — Outcome-verified reputation system v2 [LIQ]
**What:** Close the loop the `engagement_registry` (30/90/365-day check-ins, annual ratings) already opens: "verified engagement via invest.com.au" reviews weighted above unverified ones, outcome badges on profiles, and outcome-aware ranking (the Wilson ranker already blends engagement history).
**Why money:** verified outcomes raise consumer conversion (more leads sold) and justify premium lead pricing; reputation data is the moat ASIC-register clones can't fake.
**Serves:** consumers, good advisors. **Model:** indirect (conversion + pricing power); feeds badge SKU (#6). **Compliance:** Low (genuine reviews, moderation pipeline exists; never pay-for-rating).
**Build:** Low-Medium (wiring registry → reviews → ranker; most parts live).
**Deepens:** turns post-match data exhaust into the trust layer everything else sells against.
**Priority: 7/10.**

### #17 — Firm seats + enterprise plans [ADV]
**What:** Sell at the firm level: multi-seat plans (`advisor_firms.max_seats` exists), shared lead inbox (live), team analytics, firm-level verification + careers tab (demand probe shipped). $5–20k/yr ACVs.
**Why money:** one BD conversation = 10 seats; firms churn less than sole practitioners.
**Serves:** advice firms, accounting groups. **Model:** annual enterprise SaaS. **Compliance:** Low. **Build:** Low-Medium.
**Deepens:** the natural top of the advisor SaaS ladder (#3); pairs with squads competing on briefs.
**Priority: 7/10.**

### #18 — Super comparison + advice-lead bridge [CMP]
**What:** The APRA fund performance explorer (shipped, awaiting real extract) becomes a monetised journey: fund comparison → "your fund vs median" → general-advice-safe outcomes (factual comparison + "talk to an adviser about your super" leads — switching directives stay out).
**Why money:** super is the largest pool of AU household wealth and the highest-intent advice trigger; super-related advice leads price at the top of the rate card (#2).
**Serves:** every employed Australian; planners. **Model:** advice leads + sponsor slots (industry funds buy brand placement). **Compliance:** Medium — superannuation has sector-specific rules; stay factual + general advice; no fund switching recommendations.
**Build:** Low-Medium (explorer shipped; needs the lead bridge + data hydration).
**Unfair advantage:** GEO — "best performing super funds" queries are exactly what AI engines answer with cited tables.
**Priority: 7/10.**

### #19 — Insurance (life/income-protection) referral vertical [CMP]
**What:** Factual comparison + referral to licensed insurance brokers for life/IP/TPD — the category where AU comparison incumbents make their highest CPLs ($50–300).
**Why money:** high CPL, high search volume, evergreen.
**Serves:** consumers; insurance brokers. **Model:** CPL referral. **Compliance:** Medium (insurance distribution rules — stay comparison + referral, no personal advice, no arranging pre-AFSL).
**Build:** Medium (new vertical on existing comparison patterns).
**Honest caveat:** crowded SERPs vs Finder/Compare-the-Market; win via the advice-adjacent angle (insurance inside a financial plan) rather than head-on comparison terms.
**Priority: 6.5/10.**

### #20 — "AU Investor Demand Index" data product [INF]
**What:** Aggregate, de-identified demand intelligence from quiz answers, searches, compares, and brief volumes → quarterly public index (PR engine) + paid API/reports for fund managers, brokers, media (`api_customers` + API billing rails exist; `platform_snapshots` aggregates exist).
**Why money:** enterprise data subs ($1–5k/mo each) and an earned-media flywheel ("invest.com.au Demand Index shows...") that compounds domain authority.
**Serves:** product providers, media, institutional. **Model:** data subscription + API metering. **Compliance:** Low-Medium (aggregate + de-identified only; privacy review of methodology).
**Build:** Medium (warehouse views + report pipeline; collection exists).
**Unfair advantage:** proprietary intent data nobody else in AU has at this granularity once traffic scales.
**Deepens:** monetises the exhaust of every funnel without touching the funnels.
**Priority: 6.5/10 (rises with traffic).**

### #21 — Programmatic data-asset SEO engines [INF] [CMP]
**What:** Continue the established pattern (Adviser Register Atlas, Super Explorer, CGT scenarios — all shipped): ASX ghost tickers, postcode wealth atlas, franking encyclopedia, ETF overlap matrix, fee-drag pages. Thousands of factual, GEO-citable pages feeding funnels.
**Why money:** traffic infrastructure — every page links into comparison/lead funnels; near-zero marginal cost via the file-backed pattern.
**Serves:** organic/AI-search users. **Model:** indirect (feeds all). **Compliance:** Low (factual data). **Build:** Low per asset (pattern established; some need founder-run data ingests).
**Priority: 6.5/10 — compounding, not urgent.**

### #22 — Advisor content distribution + Ask-an-Advisor routing [ADV] [LIQ]
**What:** Paid distribution for advisor content: featured slots in newsletter/feed/Q&A pages (credits), and community "Ask an Advisor" questions routed to paying advisors first (expert-answer elevation already built in community Phase 0), with the answer→profile→lead wire.
**Why money:** monetises advisor marketing budgets beyond leads; deepens content supply for GEO.
**Serves:** advisors. **Model:** credits per distribution slot. **Compliance:** Medium (sponsored-content labelling; answers stay general advice; moderation pipeline exists).
**Build:** Low.
**Priority: 6.5/10.**

### #23 — Business exit & succession vertical [BIZ]
**What:** Serve business owners (the highest-net-worth segment): exit-readiness content + brief-based matching to M&A advisors, business brokers, accountants, estate planners. Strictly services matching — share-sale listings stay out (financial product fence); the brief flow (#4) is the engine.
**Why money:** $200–500 CPLs, enormous engagement values; the $3.5T intergenerational wealth transfer is the macro tailwind.
**Serves:** SME owners; M&A/advice professionals. **Model:** premium briefs + leads. **Compliance:** Medium (asset-sale services matching is not AFSL territory; equity transactions are — keep them out; legal confirms the line once).
**Build:** Medium (new vertical on brief rails).
**Priority: 6.5/10.**

### #24 — Capital-readiness score + founder toolkit [BIZ]
**What:** Founder-side education: a factual capital-readiness self-assessment, document checklists, and matching to corporate advisors/accountants/lawyers (paid leads). No investor matching, no offer facilitation, no data rooms for live raises (CSF/market-licence fence).
**Why money:** corporate-advisory leads are high-value; the toolkit can be a paid product.
**Honest take:** founder traffic is a fraction of investor traffic — this is a strategic-positioning play for the domain ("where Australian capital starts") more than a near-term revenue line. Rank accordingly.
**Serves:** founders/SMEs; corporate advisors. **Model:** leads + toolkit subscription. **Compliance:** Medium if strictly educational + services referral; anything touching the raise itself is High and gated.
**Build:** Medium.
**Priority: 6/10.**

### #25 — Consumer "Investor Pro" relaunch [USR]
**What:** Give the live $9/mo subscription real teeth: premium research (pipeline built — needs the editorial motion), advanced alerts, saved Fee X-Rays + monitoring (#9), early tools, annual Wrapped.
**Why money:** honest ceiling: consumer subs on comparison sites are historically weak — this is a $5–20k/mo line at scale, not the engine. Worth doing because the plumbing is 100% done and Pro features double as retention.
**Serves:** engaged retail investors. **Model:** consumer subscription. **Compliance:** Low-Medium (research stays general advice). **Build:** Low-Medium (content + packaging).
**Priority: 6/10.**

### #26 — AI Navigator rails (full power post-AFSL) [BET]
**What:** The production RAG chatbot (`lib/chatbot.ts`: Claude+OpenAI fallback, injection classifier, AFSL guardrails, cost caps — admin-only today) becomes a public *navigation* copilot now (route me to the right tool/comparison/advisor — factual triage only), and a general-advice assistant post-AFSL (Nov 2026) when commentary loosens.
**Why money:** differentiation + funnel efficiency now; post-AFSL it's the interface the next decade of users expects.
**Serves:** everyone. **Model:** indirect now; Pro feature later. **Compliance:** High pre-AFSL if it drifts toward advice — strict triage framing, every output through the existing guardrails; Medium post-AFSL.
**Build:** Medium (surface + rails exist; `ai_generation`/`ai_get_matched_v3` flags already gate the lane).
**Priority: 6/10 now, 8/10 post-AFSL.**

### #27 — Switching-as-a-service depth (post-AFSL "arranging") [BET]
**What:** Today: pre-filled switch kits + referral (compliant). Post-AFSL, "arranging" is in the lean lane — upgrade to guided switches (super consolidation paperwork, broker HIN transfers, savings moves) charged as flat completion fees to the receiving institution.
**Why money:** $80–250 per completed switch; converts calculator traffic into transactions.
**Serves:** consumers; receiving institutions. **Model:** flat B2B completion fees. **Compliance:** High pre-AFSL / Medium post (arranging covered; still no client money, no personal advice on destination choice).
**Build:** Medium-High per vertical.
**Priority: 5.5/10 now — schedule the build to land with the licence.**

### #28 — Advisor practice succession marketplace [ADV] [BIZ]
**What:** Listings + matching for retiring advisers selling client books (asset sales) — flat listing fees, no success-fee % (conflicted-rem optics), buyer demand from the firm network.
**Why money:** books trade at 2–3× recurring revenue; even flat fees ($1–5k/listing) are material; thousands of AU advisers retire this decade.
**Honest take:** two-sided cold start in a niche; validate via the existing careers demand probe before building anything.
**Compliance:** Medium-High (business-sale mechanics + privacy of client books; legal scoping first). **Build:** Medium.
**Priority: 5.5/10 — demand-probe first.**

### #29 — Identity-platform merge (multi-workspace cross-sell) [INF]
**What:** Land the held identity expansion (81 files on `claude/audit-account-architecture-7186H`; `principals` already in prod) so one human can hold investor + advisor + business-owner workspaces — unlocking cross-side journeys (the advisor who invests; the founder who needs an advisor).
**Why money:** indirect — cross-sell surface + cleaner B2B account model for the wallet (#15).
**Compliance:** Low. **Build:** Medium-High (review + land a big held branch safely; gated on the migration-ledger reconciliation).
**Priority: 5.5/10 — sequence after the baseline squash.**

### #30 — Awards / methodology licensing ("invest.com.au Awards") [IMM] [BET]
**What:** Annual category awards on the published methodology (methodology page live), licensed badge usage for winners (flat licensing fee), launched post-cutover on the real domain.
**Why money:** recurring licensing at near-zero marginal cost; Canstar's model proves AU providers pay handsomely.
**Honest take:** only works if the methodology is genuinely defensible — otherwise it collapses into a paid-badge scheme that poisons the trust asset everything else depends on. Legal + editorial sign-off is the gate, and it should wait for the authority moment (post-cutover, post-AFSL).
**Compliance:** Medium-High (RG 234 implied endorsement; methodology audit). **Build:** Low-Medium.
**Priority: 5.5/10 — right idea, later timing (mid-2027).**

---

## 3. Scoring table

Revenue = potential at 12–24mo (1–5) · Compliance = regulatory risk (L/M/H) · Build = engineering lift (L/M/H) · Defens. = moat once live (1–5) · Speed = time to first dollar.

| #  | Idea                                  | Cat  | Rev | Compl. | Build | Defens. | Speed       | Priority |
|----|---------------------------------------|------|-----|--------|-------|---------|-------------|----------|
| 1  | Revenue Activation Sprint             | IMM  | 5   | L      | L     | 2       | days        | 10.0     |
| 2  | Dynamic lead-pricing rate card        | ADV  | 5   | L-M    | L     | 3       | 1–2 wks     | 9.5      |
| 3  | Advisor Growth Suite (one ladder)     | ADV  | 5   | L      | M     | 4       | 2–4 wks     | 9.0      |
| 4  | Brief liquidity engine                | LIQ  | 4   | L-M    | M     | 5       | 3–6 wks     | 8.5      |
| 5  | Priority allocation auctions          | LIQ  | 5   | M      | M     | 4       | legal-gated | 8.5      |
| 6  | Verified badge + embed widget         | ADV  | 4   | M      | L     | 5       | 2–3 wks     | 8.5      |
| 7  | Sponsorship inventory expansion       | IMM  | 4   | L-M    | L     | 3       | 1–2 wks     | 8.0      |
| 8  | Cross-border Phase C (BD)             | IMM  | 4   | L-M    | L     | 4       | BD-gated    | 8.0      |
| 9  | Portfolio Fee X-Ray                   | USR  | 4   | M      | M     | 4       | 3–5 wks     | 8.0      |
| 10 | s708 gate + startups re-gating        | BIZ  | 3   | H      | M     | 4       | legal-gated | 7.5      |
| 11 | Money-Moments campaign engine         | IMM  | 4   | L      | L-M   | 3       | 2 wks       | 7.5      |
| 12 | Mortgage + SME referral verticals     | CMP  | 4   | M      | L-M   | 3       | 3–4 wks     | 7.5      |
| 13 | Rate Mover switch concierge           | USR  | 3   | L      | L-M   | 3       | 2–3 wks     | 7.5      |
| 14 | My Money HQ dashboard                 | USR  | 3*  | L-M    | M     | 4       | 4–6 wks     | 7.0      |
| 15 | Unified B2B wallet/credits            | LIQ  | 3   | L      | M     | 4       | 4–6 wks     | 7.0      |
| 16 | Outcome-verified reputation v2        | LIQ  | 3*  | L      | L-M   | 5       | 2–4 wks     | 7.0      |
| 17 | Firm seats / enterprise               | ADV  | 4   | L      | L-M   | 4       | 3–4 wks     | 7.0      |
| 18 | Super comparison + advice bridge      | CMP  | 4   | M      | L-M   | 4       | 3–4 wks     | 7.0      |
| 19 | Insurance referral vertical           | CMP  | 4   | M      | M     | 2       | 4–6 wks     | 6.5      |
| 20 | AU Investor Demand Index              | INF  | 3   | L-M    | M     | 5       | 6–8 wks     | 6.5      |
| 21 | Programmatic SEO data assets          | INF  | 3*  | L      | L     | 4       | rolling     | 6.5      |
| 22 | Advisor content distribution          | ADV  | 3   | M      | L     | 3       | 2 wks       | 6.5      |
| 23 | Business exit/succession vertical     | BIZ  | 4   | M      | M     | 4       | 5–8 wks     | 6.5      |
| 24 | Capital-readiness score + toolkit     | BIZ  | 2   | M      | M     | 4       | 5–8 wks     | 6.0      |
| 25 | Investor Pro relaunch                 | USR  | 2   | L-M    | L-M   | 2       | 2–4 wks     | 6.0      |
| 26 | AI Navigator rails                    | BET  | 3→5 | H→M    | M     | 4       | post-AFSL   | 6.0      |
| 27 | Switching-as-a-service depth          | BET  | 4   | H→M    | M-H   | 4       | post-AFSL   | 5.5      |
| 28 | Practice succession marketplace       | ADV  | 3   | M-H    | M     | 4       | probe first | 5.5      |
| 29 | Identity-platform merge               | INF  | 2*  | L      | M-H   | 3       | post-squash | 5.5      |
| 30 | Awards / methodology licensing        | BET  | 4   | M-H    | L-M   | 4       | mid-2027    | 5.5      |

\* indirect revenue (multiplier on other lines).

**Explicitly killed / stays dead (re-affirming prior decisions — do not re-litigate):** retail CSF facilitation; the 10% brief-payment clip and 15% booking clip (client money + RG 246 — flags stay OFF); pure placement auctions without editorial floors; P2P "post your asset for bids"; display/programmatic ads; CDR self-ingestion; own product issuance before Y5; running an auction *house* for alt assets; news-tab commodity journalism pre-AFSL.

---

## 4. Top 10 to build first

1. **#1 Revenue Activation Sprint** — everything else compounds on a running engine.
2. **#2 Dynamic lead-pricing rate card** — largest ARPU lever per unit of work in the codebase.
3. **#3 Advisor Growth Suite** — the recurring-revenue spine; mostly packaging.
4. **#7 Sponsorship inventory expansion** — fastest new SKUs on existing rails.
5. **#4 Brief liquidity engine** — the defensible core; primitives are dark, not missing.
6. **#6 Verified badge + embed** — revenue + a backlink flywheel timed for post-cutover SEO.
7. **#8 Cross-border Phase C** — BD motion, engineering done, 5–15× LTV corridor.
8. **#5 Priority allocation auctions** — send the RG 246 packet week 1; build lands when legal clears.
9. **#9 Portfolio Fee X-Ray** — flagship acquisition tool ready for launch-day traffic.
10. **#10 s708 gate** — risk reduction first; do not carry a live escalator into the AFSL application window.

## 5. 90-day execution roadmap (12 Jun → 10 Sep 2026)

This window matters doubly: new public surfaces freeze during the Oct–Dec domain cutover, so what isn't built by mid-September waits until 2027. Sequencing assumes the autonomous loop does the code while founder/Co-Founder handle the five non-code gates (deploy target, `db push`, Stripe price IDs, legal packets, BD).

**Days 0–14 — ignition + legal in flight**
- Execute #1 end-to-end (deploy target decision is the keystone — everything queues at HEAD until it's resolved; then cron bridge env, migration-ledger baseline squash scheduled, Stripe price IDs, `email_drip_send` on, advisor Pro billing flag on, premium research edition 1).
- Send all four legal packets simultaneously: RG 246 (auction + priority allocation), verification-badge methodology, s708 gate (D4), Fee X-Ray output copy. Legal latency is the critical path for #5/#6/#9/#10 — start it before writing more code.
- Lean EOFY money-moments pack (#11) — EOFY is 18 days away; even a minimal version is the live-fire test of drips + sponsorship.

**Days 15–45 — pricing, packaging, inventory**
- Ship #2 rate card (grandfather existing advisors one cycle).
- Ship #3 tier consolidation (one ladder, migration map, new pricing page).
- Ship #7 newsletter + calculator + country-page sponsor slots.
- Launch #8 BD outreach (target: 3 signed cross-border partners by day 60).
- Brief liquidity wave 1 (#4): credit-priced responses + 48h guarantee on two brief types.
- Validation probes: practice-succession interest (#28) via careers tab; demand-index pilot conversations (#20).

**Days 46–90 — flagship surfaces + gated builds landing**
- Ship #9 Fee X-Ray (copy pre-cleared by then) + #13 Rate Mover.
- Build #10 s708 gate as soon as legal clears; re-gate startups.
- #5 auction pilots: 2–3 brokers live; advisor priority premium in one contested category.
- Ship #6 badge + embed (sell at "founding member" pricing pre-cutover).
- #16 reputation wiring + #17 firm plans if capacity allows; #21 programmatic assets keep rolling in background loops.
- **Sep 10 hard stop on new public surfaces** → shift to cutover guardianship, performance, and conversion polish. Post-cutover (Jan 2027): scale winners, start #18/#19/#23, AFSL-unlocked items (#26/#27) when the licence lands.

## 6. The money machine at 12–24 months

One flywheel, five stages:

1. **Authority brings traffic free** — 30-year domain post-cutover + GEO citations + thousands of programmatic factual pages → invest.com.au is what AI engines cite and Australians type.
2. **Traffic becomes structured intent** — the decision engine, briefs, quizzes, alerts and the Money HQ turn visits into scored, banded, corridor-tagged intent (the proprietary asset).
3. **Intent is allocated through priced marketplaces** — rate-carded leads, quality-floored priority auctions, credit-priced brief responses, referral corridors. Flat fees everywhere; no client money; every placement disclosed.
4. **Supply pays to stay** — advisor SaaS ladder, firm seats, verification badges, sponsorships, partner API: recurring B2B revenue that doesn't depend on this week's traffic.
5. **Exhaust compounds the moat** — outcomes (engagement registry) improve matching; demand data becomes the Index; advisor-embedded badges feed authority back to stage 1.

Indicative revenue mix at month 24 (post-AFSL, consistent with COMPANY.md's $173–515k/mo trajectory): ~40% advisor/brief marketplace (leads, priority, responses), ~30% affiliate/CPC/sponsorship, ~20% B2B SaaS + API + data, ~10% consumer. No single channel above half — resilient to any one regulator letter, algorithm change, or partner loss.

## 7. Codebase changes required to support this

1. **Resolve the migration-ledger baseline squash** (founder-gated Tier E) — the #1 blocker; #4/#10/#15/#29 all need new tables eventually.
2. **Restore a deploy target + cron runner** — without them, lifecycle email, alerts, digests and dunning (half the ideas) are dead on arrival.
3. **Consolidate the dual advisor tier systems** (`lib/advisor-tiers.ts` vs `lib/pro-subscription/`) into one module with one Stripe product family (#3).
4. **Generalise `getLeadPriceCents` into a rate-card engine** reading `dynamic_pricing_rules`, keeping the published-flat-fee invariant in types (#2).
5. **Unify `advisor_credit_ledger` + broker wallets behind one `lib/wallet` interface** (#15) — prerequisite for credits-spend-anywhere.
6. **Port `lib/marketplace/auto-bid.ts` + `quality-score.ts` to advisor lead allocation** with the fit-gate-first invariant (#5).
7. **Delete/disable the dead `tax-optimizer` / `portfolio-xray` endpoints** (avoid-list tripwires) before building the factual Fee X-Ray as their replacement (#9).
8. **Build the wholesale-cert gate** and wire it on `/invest/startups` + listing submission (#10) — schema currently held behind item 1.
9. **Revenue attribution warehouse views** joining `affiliate_clicks` → `professional_leads` → `advisor_billing`/`marketplace_conversions` → `subscriptions` so pricing and BD negotiate from data (#20, and the scoreboard for everything).
10. **Finish the `leads` → `professional_leads` phase-out** and wire `engagement_registry` → verified reviews → ranker (#16).
11. **An `/admin/revenue-switches` status panel** — every monetisation flag, env, cron and Stripe price in one place with last-heartbeat (#1's world-class form; prevents the next 19-day dark period).

## 8. Standing compliance fences (unchanged by this analysis)

Per `REGULATORY-AVOID-LIST.md`, every escalator remains never-autonomous: no CSF/retail raise facilitation, no client money (both payment-clip features stay OFF), no credit assistance, no CDR ingestion, no custody, no personal advice, no %-of-advice fees, no product issuing. Ideas #5, #6, #9, #10, #26, #27, #30 each carry an explicit founder + legal sign-off gate noted inline. Auctions stay confined to lead routing. All sponsorship/priority is flat-fee and disclosed.
