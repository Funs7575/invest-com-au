# Stream MM — Investment Listings Marketplace Expansion

**Source:** Founder directive 2026-05-09 — "build everything we can think of to highest quality standards"; 6-month pre-launch window; ignore current supply/demand fill state and focus on coverage + quality of the surface.
**Drafted:** 2026-05-09. **Owner:** audit-remediation cloud loop.
**Branch convention:** `claude/audit-remediation/mm-<phase>-<slug>` per `REMEDIATION_DEFAULTS.md`.
**Tier classifications:** mostly Tier B (additive form fields, content pages, sitemap rows). Schema migrations + AFSL-gated verticals are Tier C.

## Goal

Expand the existing investment-listings marketplace from 9 verticals to comprehensive coverage of every Australian investable asset class that fits the lead-gen-platform compliance pattern (no AFSL upgrade required pre-launch). Build top-level verticals for genuinely new asset classes; expand `sub_category` taxonomy under existing verticals; ship a proper content page per vertical and sub-vertical; harden the marketplace UX (filtering, faceted search, comparison, saved searches, listing-specific intent capture).

## Pre-existing surface (do NOT rebuild)

- 9 top-level verticals: `business`, `commercial_property`, `farmland`, `mining`, `energy`, `franchise`, `fund`, `startup`, `pre_ipo`
- Schema: `investment_listings`, `listing_claims`, `listing_enquiries`, `listing_plans`, `listing_fee_cents` (column on listings); `sub_category` column already exists
- Submission flow: `app/invest/list/page.tsx` (266 LOC) + `ListingSubmitForm.tsx` (695 LOC)
- API routes: `/api/listings/{submit, checkout, enquire, renew, my-listings, [id]}`
- Pricing: $99/30d Standard, $249/60d Featured (live)
- Discovery: header + footer links; homepage queries `investment_listings`; `app/invest/page.tsx` (587 LOC) is the marketplace front door; sitemap dynamic-row generation already wired
- AFSL workaround: pre-IPO gated to s708 sophisticated investors. **Reuse this gate for any new vertical that touches managed-investment-scheme territory.**

## Phase 1 — Coverage audit (1 iteration; ships first)

**Stream code:** `MM-AUDIT`. **Done-when:** `docs/audits/MM-01-marketplace-coverage-audit.md` merged.

Scope:
1. Enumerate every `/invest/<slug>` content page that exists today (by reading `app/invest/`). Cross-reference against the 9 listing verticals. Identify content pages without a listing vertical (e.g., royalties, infrastructure, alternatives).
2. Read `lib/invest-categories.ts` and `ListingSubmitForm.tsx` VERTICALS array — map: vertical → form copy → content page → sitemap row → `lib/verticals.ts` config (if applicable).
3. Query `investment_listings` schema for all columns; document `sub_category` values currently in use (`SELECT vertical, sub_category, count(*) FROM investment_listings GROUP BY 1,2`).
4. Catalogue `app/invest/[slug]/listings/page.tsx` filter + URL parameter behaviour — what filters work today, what's stub.
5. Identify the touch-points that need updating to add a new vertical: form options + schema enum constraints + sitemap + listing index + content page + breadcrumbs + JSON-LD + chatbot category-mapping if present.
6. **Skip** any quantitative fill-rate analysis — supply is not the question this iteration.

Output is the reference doc that Phase 2 + 3 streams read at the top of every iteration.

## Phase 2 — New top-level verticals (~3–4 weeks cloud loop)

**Stream code:** `MM-V`. Each sub-stream MM-V0X ships independently — own form option, own sub_category list, own content page, own sitemap row, own listing index page, own breadcrumb config.

### MM-V01 — Digital Infrastructure

**Why:** AU data-centre market is one of the highest-growth investable categories — NEXTDC ASX-listed at ~$3–4B mkt cap, AirTrunk sold to Blackstone for $24B (2024), Macquarie DC, Equinix AU, Global Switch, DigitalBridge holdings. AI-compute demand is forcing a build cycle. Currently zero coverage on invest.com.au.

**Sub-categories (this is the granularity that captures intent):**
- Data centres (hyperscale, retail colocation, edge facility)
- Fibre / metro networks
- Subsea cables
- 5G / 6G tower co-investment
- Edge computing facilities
- AI compute farms / GPU cluster financing
- Telco infrastructure trusts

**Listing types eligible:** new build co-investment, operating asset acquisition, fibre rollout participation, tower portfolio sale. Wholesale-investor gating where applicable.

### MM-V02 — Public & Social Infrastructure

**Why:** Distinct asset class from private commercial property. PPP / availability-payment / regulated-asset-base structures. Real AU pipeline (transport, water, health, education, defence). Unlisted infrastructure trusts and funds dominate this space and aren't well-covered by retail-facing comparison sites.

**Sub-categories:**
- Transport (toll roads, rail, port, airport)
- Water (desalination, recycling, irrigation)
- Health (hospitals, medical centres, aged care, NDIS-specific)
- Education (universities, vocational, childcare)
- Social housing / specialist disability accommodation (SDA)
- Telecommunications (NBN-related, regulated assets)
- Defence (selective — wholesale-only)
- Recycling / waste / circular-economy facilities
- Smart city / IoT infrastructure

### MM-V03 — Carbon & Environmental Markets

**Why:** Australian Carbon Credit Units (ACCUs), Safeguard Mechanism Credits, biodiversity offsets, voluntary-market projects. ERF auction market is $3B+ cumulative. Genuinely new asset class with retail-investor intent rising. Compliance note: ACCUs as financial products may trigger MIS rules — gate to wholesale or treat as lead-gen for project developers.

**Sub-categories:**
- ACCUs (compliance market)
- Voluntary carbon credits (ACR, Verra, Gold Standard projects in AU)
- Biodiversity offsets / nature-positive credits
- Carbon farming projects (HIR, soil carbon, vegetation, blue carbon)
- Reforestation / afforestation projects
- Carbon capture and storage (CCS) projects
- Methane abatement (landfill gas, dairy, coal mine ventilation)
- Direct air capture (DAC)
- Land restoration / regeneration projects

### MM-V04 — Royalties & IP

**Why:** Content page exists at `/invest/royalties` (482 LOC) but no listing vertical. Music royalties (Royalty Exchange equivalent), patent/IP royalties, mining royalties, film/TV royalties. Wholesale-gating defaults required for ongoing-income-stream sales.

**Sub-categories:**
- Music royalties (master recording / publishing / mechanical)
- Mining royalties (gross, net, NPI)
- Patent / IP royalties
- Film / TV / streaming residuals
- Software / SaaS revenue share
- Pharmaceutical royalties
- Brand licensing royalties

### MM-V05 — Alternative Collectibles

**Why:** Notebook idea #6 (P1, 4–6 wks per sub-vertical, 0% built, no AU competitor). Distinct buyer behaviour (passion + investment) vs other verticals.

**Sub-categories:**
- Whisky cask investment (Cask 88, WhiskyInvestDirect, Lakes Distillery)
- Wine investment (Cult Wines, Vinovest, Liv-ex secondary)
- Fine art (Masterworks-style fractional, Yieldstreet art)
- Watches (Chrono24, Watch Pilot, mechanical secondary)
- Rare books / manuscripts
- Sneakers / streetwear (Rally Rd-style)
- Trading cards (PWCC equivalent for AU)
- Comics / pop-culture memorabilia
- Vintage cars / classic vehicles
- Numismatics / philately

### MM-V06 — Wholesale-Only Asset Classes (s708)

**Why:** Several real AU markets sit behind sophisticated-investor gating today and have no comparison surface. Reuse the existing pre-IPO s708 gate.

**Sub-categories:**
- Litigation funding (LCM, Omni Bridgeway, IMF wholesale)
- Hedge funds (long-short, market-neutral, global macro)
- Private credit funds (consumer, real estate debt, distressed)
- Private equity funds (growth, buyout, secondaries)
- Distressed debt funds
- Venture capital funds
- Insurance-linked securities / catastrophe bonds
- Trade finance / invoice finance (Octet, MarketInvoice equivalents)
- Royalty financing funds
- SAFE / convertible-note vehicles

### MM-V07 — Aquaculture & Marine

**Why:** Distinct from farmland. Salmon (Tassal, Huon — though these are listed), oysters, abalone, prawns. AU industry growing.

**Sub-categories:**
- Salmon farming (operating + new builds)
- Oyster leases
- Abalone farming
- Prawn farming
- Mussel cultivation
- Land-based RAS (recirculating aquaculture)
- Seaweed / kelp farming (carbon co-benefit)
- Fishing licences / quota

### MM-V08 — Livestock & Equine Syndication

**Why:** Real AU market. Magic Millions, Inglis sales drive $400M+ throughput annually. Cattle/sheep breeding programs are a separate intent from grazing land.

**Sub-categories:**
- Race-horse syndication (thoroughbred, harness)
- Cattle herd investment (Wagyu, Angus, Brahman)
- Sheep / wool programs
- Stud / breeding rights
- Genetic programs (semen, embryo)

### MM-V09 — Startup vertical expansion (deepen existing)

**Why:** The existing `/invest/startups/page.tsx` is ~226 LOC — about half the depth of `/invest/private-credit/page.tsx` (505 LOC) and the new `/invest/digital-infrastructure/page.tsx` (440 LOC). AU has no clear AngelList equivalent. Startup raises happen on Equitise / Birchal / OnMarket (CSF) plus AngelList AU plus direct LinkedIn outreach, fragmented and undiscoverable. This vertical *exists* in the form + SSOT + investment_verticals row but the surface is undercooked.

**Scope (this is content + listings only — the founder portal is a separate stream `SP`):**
- Lift `/invest/startups/page.tsx` to ~500 LOC, mirror private-credit / digital-infrastructure patterns
- Add 4 sector pages: `/invest/startups/saas`, `/invest/startups/climate-tech`, `/invest/startups/biotech`, `/invest/startups/fintech`
- Round-instrument explainer pages: `/invest/startups/safe`, `/invest/startups/convertible-note`, `/invest/startups/priced-equity`
- ESIC tax explainer with worked CGT examples (matches the depth of FATCA / DASP / pension-transfer explainers in cross-border)
- 12+ seed listings via migration covering: ESIC-eligible AU startups, CSF raises (aggregated from Equitise/Birchal/OnMarket public data), wholesale Series A–C placements, Antler/Startmate/Y Combinator AU alumni
- Pitch event aggregation page (links to AngelList AU, Stone & Chalk events, Antler demo days)
- Sub-categories already drafted in MM-S06 (CSF / angel / pre-seed / seed / Series A–C / SAFE / SAFE-T / convertible note + sector tags) — wire into form + filter UI

**Sub-task split:**
- MM-V09-01: lift main `/invest/startups/page.tsx` to private-credit depth + 4 sector pages
- MM-V09-02: round-instrument explainer pages (3 pages)
- MM-V09-03: ESIC tax explainer + worked examples
- MM-V09-04: seed migration with 12+ listings
- MM-V09-05: pitch event aggregation page

**Done-when:** all 5 sub-tasks merged; `/invest/startups` and 4 sector pages render; sitemap updated; sub-category filters working on `/invest/startups/listings`.

## Phase 3 — Sub-category expansion under existing verticals (~2–3 weeks cloud loop)

**Stream code:** `MM-S`. Add `sub_category` taxonomy + filter UI on listing index pages + faceted SEO landing pages (`/invest/<vertical>/<sub-category>` ISR pages).

### MM-S01 — Energy sub-categories (current vertical text: "Solar, wind, battery, hydrogen")

Expand to:
- Utility-scale solar
- Rooftop / commercial solar
- Agrivoltaics
- Onshore wind
- Offshore wind (fixed-bottom)
- Floating offshore wind
- Lithium-ion battery storage (BESS)
- Flow battery storage
- Sodium-ion / next-gen storage
- Pumped hydro storage (Snowy 2.0, Borumba, etc.)
- Long-duration storage (compressed air, thermal)
- Green hydrogen production
- Electrolyser facilities
- Hydrogen export terminals
- Green ammonia
- Green steel / green concrete
- Geothermal
- Biomass / biogas
- Waste-to-energy
- EV charging infrastructure (motorway, urban, depot)
- Microgrids / community batteries
- Wave / tidal
- Grid interconnects / transmission
- Distribution upgrades

### MM-S02 — Commercial Property sub-categories

- Office (CBD A-grade, suburban, business park, fringe)
- Retail (shopping centre, large format, neighbourhood, strip)
- Industrial (logistics, manufacturing, cold storage, last-mile)
- Hospitality (hotel, motel, resort, pub, serviced apartments)
- Healthcare (medical centres, aged care, day hospitals)
- Mixed-use
- Self-storage facilities
- Childcare centres
- Service stations + convenience retail
- Specialised (telco towers as RE, billboards, carparks)
- Build-to-rent (BTR)
- Student accommodation (PBSA)
- Caravan parks / leisure
- Marina berths
- Heritage / restoration projects

### MM-S03 — Mining sub-categories

- Battery metals (lithium, cobalt, nickel, graphite, manganese)
- Critical minerals (rare earths, vanadium, tungsten)
- Precious metals (gold, silver, platinum, PGMs)
- Industrial (iron ore, copper, zinc, bauxite, alumina)
- Energy minerals (uranium, thorium)
- Mineral sands (rutile, ilmenite, zircon)
- Construction materials (lithium feedstock, sand, gravel)
- Tenement-stage vs operating mine
- JV vs sole-funder structures

### MM-S04 — Farmland sub-categories

- Cropping (broadacre — wheat, barley, canola)
- Horticulture (almond, citrus, avocado, macadamia, mango)
- Viticulture (wine grapes, table grapes)
- Grazing (cattle, sheep, goat, deer, dairy)
- Cotton
- Sugar
- Specialty (truffle, hemp, native botanicals)
- Permaculture / regenerative agriculture
- Carbon farming (HIR, soil-carbon, vegetation projects — overlap with MM-V03)
- Mixed enterprise

### MM-S05 — Fund sub-categories

- Equities (long-only, long-short, sector-specific, factor)
- Fixed income (government, corporate, hybrid, syndicated loan)
- Multi-asset (balanced, growth, conservative, target-date)
- Property (listed REIT, unlisted property, BTR fund)
- Infrastructure (listed, unlisted, OECD, emerging-market)
- Alternative (PE, PD, hedge, distressed)
- Impact / ESG / SRI
- ETF (passive, smart-beta, thematic)
- Index unit trust
- Wholesale vs retail

### MM-S06 — Startup sub-categories

- Equity crowdfunding (CSF — Equitise, Birchal, OnMarket)
- Angel raise (sophisticated investors)
- Pre-seed / seed
- Series A / B / C
- Convertible note / SAFE
- Sector: SaaS, fintech, climate-tech, biotech, deep-tech, marketplace, hardware

## Phase 4 — Content page expansion (~2–3 weeks editorial-bound)

**Stream code:** `MM-CONTENT`. For every new vertical from Phase 2 and faceted sub-category from Phase 3, ship a `/invest/<slug>` or `/invest/<vertical>/<sub-category>` content page following the pattern of `app/invest/private-credit/page.tsx` (505 LOC reference quality):

- Market overview + AU context
- Regulatory frame (AFSL/MIS treatment, wholesale gating where applicable)
- Top platforms / operators / fund managers
- Typical structures + minimum investment
- Returns + risks
- How to invest (step-by-step)
- Tax considerations (CGT, depreciation, structure choice)
- FAQ section
- Related listings via the `investment_listings` query pattern already shown on the marketplace page
- Cross-link to relevant `/find-advisor?specialty=...` if applicable
- ISR `revalidate = 3600`, FAQPage JSON-LD, breadcrumb, canonical

Editorial drafts can be AI-generated via `app/api/admin/content/generate-draft/` (40% built per notebook idea #13) — speeds this up substantially.

## Phase 5 — Marketplace UX hardening (~2 weeks cloud loop)

**Stream code:** `MM-UX`. Quality-of-life improvements that compound across all verticals.

- Faceted search on `/invest/<vertical>/listings` — vertical × sub_category × state × price band × yield band
- Map view for property / farmland / mining / energy listings (geographic coords)
- "Compare these listings" feature (use existing `/saved-comparisons` infra)
- Saved searches with email alerts (reuse `app/api/cron/` + Resend pipeline from `lib/notifications.ts` — also overlaps notebook idea #4 rate alerts)
- Investor profile / wishlist (link to `account/profile`)
- Featured-listing rotation cron (refresh top placement weekly)
- Sponsorship slots in vertical hub pages (extend `lib/sponsorship.ts`)
- Rich JSON-LD per listing type (`Service`, `RealEstateListing`, `Product`, `FinancialProduct` as appropriate)
- Listing-specific Q&A capture (when QQ ships, link from each listing → "ask a question about this opportunity")
- Listing → advisor-match handoff (e.g., a pre-IPO listing surfaces an SMSF / wholesale-lawyer specialty filter)

## Phase 6 — Cross-platform integrations (~1 week)

**Stream code:** `MM-INTEG`. Wire listings into the rest of the platform's revenue rails.

- `lib/quiz-scoring.ts` quiz outcome → relevant listings (concierge stack overlap, notebook idea #1)
- `/find-advisor` results page → "advisors who specialise in this listing type"
- Cross-border / `/foreign-investment/<country>` pages → FIRB-eligible listings filter
- AI Q&A surface (when QQ ships) → "ask the listings desk" specific to the listing
- Email subscribers in `notification_preferences` → vertical-specific drip with new listings
- Calculator outputs → "matching listings for your strategy"
- Embed widgets (notebook idea #8) → embed a vertical's listings index on partner sites

## Compliance / out-of-scope

- **No AFSL upgrade.** Pre-launch we are a lead-gen + comparison platform, not an AFSL-licensed intermediary. Every new vertical follows the existing pattern: connect buyer + seller, do not facilitate the trade.
- **Wholesale gating** (s708) reused for: pre-IPO (existing), MM-V06 wholesale-only, MM-V03 carbon (where ACCUs are sold as financial products), MM-V04 royalties (ongoing-income-stream sales), MM-S05 wholesale fund variants. Pattern is already in `app/invest/list/ListingSubmitForm.tsx` for pre-IPO — replicate.
- **No own product issuance.** Notebook idea #19 — different company, post-AFSL, Y5+. Don't drift into being an issuer.
- **No P2P securities trade.** Notebook idea #16 NEVER. Keep listings in the "introduce qualified parties" pattern, never "post asset for bids."
- **Regulatory disclaimer block from `lib/compliance.ts` on every new content page + listing page** (single source of truth — don't duplicate copy). For wholesale-gated verticals, add the s708 sophisticated-investor block.

## Estimated cadence

Per `REMEDIATION_DEFAULTS.md` (≤2500 LOC/iter, file-targeted `tsc`):

| Phase | Streams | Iterations | Calendar (cloud loop) |
|---|---|---|---|
| 1 — audit | MM-AUDIT | 1 | day 1 |
| 2 — new + deepened verticals (V01–V09) | MM-V01..V09 | ~18–28 | weeks 1–4 |
| 3 — sub-categories (S01–S06) | MM-S01..S06 | ~12–18 | weeks 4–7 |
| 4 — content pages | MM-CONTENT | ~10–15 | weeks 7–10 (parallel with Phase 5) |
| 5 — UX hardening | MM-UX | ~8–10 | weeks 8–10 |
| 6 — integrations | MM-INTEG | ~5–6 | weeks 10–12 |

Total: ~12 weeks of cloud-loop work, comfortably inside the 6-month pre-launch window. Phases 2–4 are heavily parallelisable across MM-V0X / MM-S0X sub-streams since they don't share files.

## Pickup procedure

1. Add `MM-AUDIT` row to `docs/audits/REMEDIATION_QUEUE.md` "In-flight" table — done in same commit as this plan.
2. Cloud loop's next fire reads queue, picks `MM-AUDIT-01` as highest-priority unblocked stream, ships `MM-01-marketplace-coverage-audit.md`.
3. After audit lands, founder reviews, then queue MM-V01 (Digital Infrastructure — first new vertical to ship; data centres are top-of-mind per founder directive 2026-05-09) by adding the row to the queue.
4. Subsequent MM-V0X sub-streams queue as MM-V01 demonstrates the pattern.

## Why this doc exists

Every cloud-loop iteration in the MM stream reads this plan at start. Founder edits the plan to reorder phases / drop sub-streams / add new sub-streams; the loop never invents scope outside this doc. Quality bar = the existing 9 verticals + `app/invest/private-credit/page.tsx` (505-LOC reference for content depth).
