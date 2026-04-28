# Master Strategic Design-Audit Brief — invest.com.au

> **Purpose.** Self-contained context document for an external visual / UX design audit (claude.ai/design). Paste this into the audit tool — it is the brief, not a pointer to a brief.
>
> **Audience.** A senior product designer who has never seen the codebase and needs to produce **8–10 high-impact mockups** in the next session, plus **explicit positions on 12 strategic questions**.
>
> **Goal.** Mockups that move the right metrics — affiliate conversion, advisor-lead capture, B2B sponsorship sale-through — and that *visibly* express the four positioning moats: comprehensiveness, international focus, ASIC compliance posture, and a domain that has been in the Duns family since 1996 (inheritance + relaunch story) — a brand-name age that no AU fintech competitor has.
>
> **Length warning.** This is long. The first ~3,000 words are strategy / context; the heart of the brief (the 10 priority mockups + 12 strategic questions) starts in §17.
>
> **Author.** Fin Duns, founder/CEO. Codebase synthesised by Claude Code from 2,275 source files, 170+ Supabase migrations, 19 agent specs, and the launch-readiness audit on 2026-04-28.

---

## Table of contents

0. How to read this document
1. Headline at-a-glance — what invest.com.au is in 60 seconds
2. The grand plan — three-stage business
3. The four moats (the lens for every design decision)
4. The founder / authorship chain — and the domain-since-1996 inheritance story
5. Revenue mix and the surfaces that earn it
6. Customer segments and LTV priority
**6A. Goals — numerical, qualitative, and non-goals (NEW)**
**6B. Per-vertical revenue priority (NEW)**
**6C. Strategic philosophy — the 10 things this platform believes (NEW)**
**6D. UX/UI philosophy — conversion-maximising principles per surface (NEW — the operational playbook)**
**6E. Ideas considered, optionality space, and founder-visibility question (NEW)**
7. Competitive landscape — incumbents and aspirational comparators
8. Product surface synthesis — 800+ routes condensed
9. Data model the design can lean on
10. Existing design system — tokens, components, patterns, gaps **(consolidated; replaces separate DESIGN_SYSTEM.md)**
11. Brand voice audit — and the single biggest brand-positioning fork
12. The `LICENCE_MODE` feature flag (the constraint that gates everything)
13. Trust architecture moat — visible and invisible
14. The 19-agent system as a brand asset
15. International positioning — depth + the Year 2+ "city stays" play
16. Performance, accessibility, PWA — the technical envelope
17. Design decisions already made (don't re-litigate)
18. **The 10 priority mockups** ← the actual design ask
19. **The 13 strategic questions** the audit must answer (not propose options for)
20. Anti-goals
21. Deliverables expected
22. Appendices — verticals, advisor types, locales, calculators, sponsorship tiers, escalation tiers, A/B tests, cron, components, copy library

---

# 0. How to read this document

If you are a designer with limited time, read in this order:

1. §1 (60-second pitch) — gets you oriented.
2. §11 (brand voice + the "Best X" vs "factual only" contradiction) — this is the single most important design-blocking decision in the document.
3. §17 (decisions already made) — boundary conditions.
4. §18 (the 10 priority mockups) — the actual ask.
5. §19 (12 strategic questions) — what we want positions on.

§§2–10 are background that informs §§17–19. §§12–16 are the moats and constraints to weave into the mockups. The appendices are reference material.

---

# 1. Headline at-a-glance

invest.com.au is an Australian financial comparison platform — built solo by founder Fin Duns over four months on Next.js 16 + Supabase + Tailwind v4. **Soft commercial launch** is happening this week (late April 2026) on `invest-com-au.vercel.app`. The custom `invest.com.au` domain (held in Fin's family since 1996, currently running Dad's basic Investment Quotient site) will be **repointed at this codebase when the build meets enterprise-grade quality** — that's the public-facing launch event. So the launch is staged: Vercel-soft now → custom-domain when ready.

The platform ships with:

- **9 investment verticals** (Share Trading, Crypto, Savings, Super, CFD/Forex, Term Deposits, Robo-Advisors, Property Platforms, Research Tools)
- **100+ broker / platform listings** with verified-fee data, deal feeds, sponsor placements
- **8 canonical advisor types + 3+ international specialists** (financial planner, wealth manager, SMSF accountant, crypto advisor, tax agent, debt counsellor, real estate agent, property advisor; **FIRB specialist, international tax specialist, migration agent**) — making roughly **13 effective advisor types** at launch
- **24 calculators** (FIRB fee, non-resident CGT, fee impact, fire/retirement, switching, debt, property yield, savings, super-contributions, dividend WHT, scenario, etc.)
- **3 fully-translated locales** (en-AU, zh-CN, ko-KR) and ~12 country-specific landing pages under `/foreign-investment/[country]/`
- **6 live A/B tests** managed at `/admin/ab-tests`
- **A real PWA** (standalone display, maskable icons, service workers, push notifications)
- **170+ Supabase tables** across 8 domains: content, advisors, leads, users, reviews, tracking, sponsorship, compliance, billing
- **800+ routes** including 50+ admin dashboards and 77 scheduled crons
- **A 19-agent autonomous operating system** with 5-tier human escalation that produces the editorial, sales, BD, revenue-ops, compliance, and remediation work — under one human (Fin)

The legal entity for the new platform is **Invest.com.au Pty Ltd, ACN 093 882 421, ABN 90 093 882 421**, operating under the **s766B(6)/(7) factual-information carve-outs** of the Corporations Act 2001 — explicitly **not licensed under an AFSL**, by deliberate choice.

**The domain story.** The `invest.com.au` domain was registered in **1996 by Fin's father** (Dad), who has run a basic site (Investment Quotient Pty Ltd) on it for 30 years. **Dad is transferring the domain to Fin** for the enterprise-grade relaunch. The new platform is currently being built on Vercel (`invest-com-au.vercel.app`); the custom domain will be repointed at this codebase **when the build meets enterprise quality** — that's the launch event. So the launch is *staged*: a soft commercial launch on Vercel this week, then the public domain cutover when ready. The 30-year domain age + family-continuity story is real and unique in AU fintech — but should be framed as **inheritance and relaunch**, never as "continuously operating financial-comparison platform since 1996" (that's not true).

The strategic thesis is a three-stage business with a $15.6M revenue target at maturity, an acquisition window targeting 2029–2031, and a competitive positioning that takes head-on aim at Finder and Canstar by being **more comprehensive, more international, more transparent, and more clearly factual** than either.

---

# 2. The grand plan — three-stage business

| Stage | Window | Revenue model | Mature run-rate |
|---|---|---|---|
| **1 — Comparison + advisor leads + sponsorship** | Apr 2026 → Q4 2026 (commercial launch this week, AFSL-track ramp through October) | Affiliate commissions, advisor lead capture (AUD $39/lead base, dynamic-pricing uplift), sponsored placements ($300–$2,000/mo tiers via self-serve Stripe checkout), gated sector reports, newsletter sponsorships | **AUD $20k–$110k/mo** |
| **2 — Diversified B2B + international BD** | 2027 | Add: API tier (free / $99/mo / enterprise), premium advisor subscriptions ($199 / $399 / $999/mo), expanded sponsor tiers, **immersive city stays** (Fin spends 2–4 weeks/year in Singapore, Dubai, Hong Kong building partner relationships with brokers, family offices, migration agencies, Asian-Australian wealth networks) | **AUD ~$1.3M/yr ramp** |
| **3 — Co-branded products post-AFSL/ACL** | 2028–2030 | Co-branded savings (Judo / ING / Macquarie), brokerage (Pearler / Stake / SelfWealth), ETFs (Vanguard / BetaShares / VanEck), super, life insurance, credit card, home loans — revenue share on AUM and origination | **AUD $15.6M/yr at maturity** |

**Exit thesis.** Acquisition window 2029–2031 by a media group, big-4 bank digital-strategy team, or international fintech wanting Australian distribution. Brand legibility — *looking like a credible regulated platform rather than a comparison blog* — is part of the asset being sold.

**What the design we ship at launch must enable.** Stages 2 and 3 do not exist in product yet. The launch design must (a) not foreclose them, (b) be visible enough at launch that the international BD pitch in 2027 is credible (when Fin walks into a Singaporean broker's office, the international hub is the artefact), and (c) carry trust architecture that scales from "factual comparison site" to "regulated financial product issuer" without redesigning.

---

# 3. The four moats — the lens for every design decision

Every mockup the audit produces must serve at least one moat. A mockup that just polishes a screen is not high-impact.

### Moat 1 — Comprehensiveness
**Claim.** *"Every investment, every advisor, every country, in one place."*

**Evidence in code.** 9 verticals, 100+ platforms, 13 effective advisor types, 24 calculators, 12 country landing pages, 3 fully-translated locales, comparison engine that handles brokers / super funds / advisors / property listings under one component. Routes like `/versus` (head-to-head broker matchups) and `/scenarios` (life-stage modelling) extend breadth further.

**Competitor gap.** Finder is broad but shallow on SMSF, property, and international. Canstar is narrow (banking + super, modest broker breadth, no advisor directory). RateCity is rates-only. Mozo is mid-tier. Nobody covers FIRB / SIV / non-resident tax with first-party calculators in three languages.

**Design implication.** The homepage and information architecture must *visibly* convey breadth without devolving into a directory wall. The challenge is **wide AND legible**.

### Moat 2 — International investor focus
**Claim.** *"The Australian platform that takes seriously the Singaporean, Hong Kong, Dubai, mainland-Chinese, and migrant investor — not as a footer link, but as a second front door."*

**Evidence.** 3 fully-translated locales (en-AU, zh-CN, ko-KR — chosen because partial translations destroy trust). Country-specific landing pages under `/foreign-investment/[country]/` covering Singapore, Hong Kong, China, South Korea, Japan, UAE/Dubai, US, UK, India, Indonesia, Malaysia, New Zealand. Dedicated routes: `/compare/non-residents`, `/firb-fee-estimator`, `/non-resident-cgt-checker`, `/non-resident-dividend-calculator`, `/foreign-investment/siv` ($5M complying-investment migration pathway), `/foreign-investment/property` (FIRB rules + 2025–27 established-dwelling ban). DTA treaty rates table searchable by country of residence.

Advisor specialisations include FIRB specialist, international tax specialist, migration agent. The advisor schema has `accepts_international_clients`, `firb_specialist`, `international_tax_specialist` boolean flags; the directory has an "International only" filter.

**Year 2+ play — "immersive city stays".** Currently exists only in `COMPANY.md`, not in code. Fin spends 2–4 weeks per year in Singapore / Dubai / Hong Kong building in-person BD relationships with brokers, family offices, migration agencies, and Asian-Australian wealth networks. This becomes a relationship moat that pure-content competitors cannot match.

**Competitor gap.** Finder has minor expat content. Canstar is purely AU-domestic. Nobody has a translated, calculator-backed international hub with a persona selector.

**Design implication.** International should not be a buried subdirectory. It should be an **alt-IA** — a second front door for users searching from Singapore / Dubai / Hong Kong who don't care about the Australian retail-investor framing.

### Moat 3 — ASIC compliance as a moat (not a tax)
**Claim.** *"We're not licensed because we don't need to be — and that makes us **more** trustworthy than the AFSL-holding sites whose conflicts of interest force them to disclaim everything."*

**Architecture.** Operating under s766B(6)/(7) factual-information carve-outs. Single-source compliance copy in `lib/compliance.ts` (430 lines) rendered via `ComplianceFooter` on every financial page. Vertical-specific risk warnings (CFD per ASIC RG227 with 62–81% retail-loss-rate citation, crypto, super, property, FIRB, loans). Full FSG, methodology, editorial-policy, complaints, privacy, terms, "how we earn" pages exist. AFCA reference + 30-day complaints SLA. Financial audit log (`financial_audit_log` table — every money movement with actor + reason + before/after, satisfying AFSL s912D-equivalent audit standards even though we don't need them).

**Design tension.** Compliance is **architecturally strong but visually invisible**. The moat exists in code; users see disclaimers as fine-print. Verified-advisor claims have *no visual proof* on profile cards. Author credentials don't surface on articles. The methodology page contradicts the About page (see §11 — this is the single biggest brand-positioning fork in the document).

**Design implication.** The single biggest design win at launch is making compliance *legible as a feature* — a visible, defensible trust architecture that competitors with AFSL conflicts can't easily copy. **This is design-as-moat, not design-as-decoration.**

### Moat 4 — Domain inheritance and operating maturity
**Claim.** *"invest.com.au has been in the Duns family since 1996. Fin's father Dad held the domain for 30 years; Fin is now relaunching it as a serious comparison platform — built on Vercel, gated by 19 specialist AI agents and 5-tier human escalation, ready to honour the name."*

**Evidence — domain.** The `.com.au` domain was registered in 1996 by Fin's father, who has run a basic site (Investment Quotient Pty Ltd) on it ever since. Dad is transferring the domain to Fin for the relaunch. The new platform sits on Vercel today; the cutover happens when the build meets enterprise-grade quality. **30 years of domain age + family-continuity = a real SEO / brand-name moat**, but the audit must not frame it as "continuously operating comparison platform since 1996" — it's an inheritance/relaunch, and that's a *better* story than fake continuity.

**Evidence — operating maturity.** The 19-agent autonomous operating system runs editorial, sales, BD, revenue ops, compliance scanning, and audit remediation continuously, gated by 5 human-approval tiers (T1 auto → T5 co-founder joint approval). Codebase velocity ~85 commits/week sustained; 75% agent-generated, 25% founder. **No incidents in production.** The first-party data-freshness machinery (per-broker `last_verified_at`, daily cron-driven refresh, `FeeVerifiedPill`) is what Wise's transparency design does for FX rates.

**Competitor gap.** Vanguard (1975) leads with age. So can we, honestly — *"This domain has been in our family since 1996. We are relaunching it now, properly."* Finder (2006), RateCity (2007), Mozo (2008) — all younger than the domain. Canstar (1992) is older but uses an "awards" lens, not a heritage lens. **Nobody in AU fintech surfaces 30-year domain heritage.**

**Design implication.** The 1996 inheritance story is one of the cheapest, most differentiating signals available — *if framed honestly*. It's currently invisible. Possible surfacings: a quiet "Held since 1996. Relaunched in 2026." footer line; an About-page timeline; a founder's-note hero on the about page. Vanguard does the quiet-footer pattern. The audit can take a position on how loud or quiet to make it (Strategic Question 12).

---

# 4. The founder / authorship chain — and why this matters for design

The platform has **four named human figures** that the design can lean on. None are surfaced strongly in the current UI. All four are unique vs Finder / Canstar (which surface either anonymous staff teams or "Canstar Research" as a corporate voice).

| Figure | Role | Visible-in-UI today? | What design should do |
|---|---|---|---|
| **Fin Duns** (founder, CEO) | Architect, builder, founder voice. Operates the 19-agent system; founder-front the platform. | Footer / about page only. | Make Fin legible as the founder — author bios on About, editorial-policy page, possibly a bylined "founder's note" intro on the homepage. Visible founder = trust, especially for a non-AFSL platform. |
| **Fin's father (Dad)** | Original `.com.au` domain holder since 1996; ran a basic site (Investment Quotient Pty Ltd) on it for 30 years. **Now transferring the domain to Fin** for the enterprise-grade relaunch. | Not surfaced. | Subtle *"Held in our family since 1996. Relaunched in 2026."* footer line. About-page timeline: **1996** (domain registered by Dad) → **2026** (Fin inherits + relaunches as a comparison platform on Vercel; domain cutover when build is enterprise-grade) → **2028+** (co-branded products post-AFSL). Honest inheritance story is more interesting than fake continuity. |
| **"Friend's Dad"** (Tier 1 pillar author) | Named expert (CFA / CFP / similar). Authored Tier 1 pillar articles (10–15/quarter). LinkedIn-linked. | Author-attribution exists in DB, not visually surfaced on article pages. | First-class author byline component on every article: photo, name, credential chips (CFA · RG146 · ASIC #), 1-line bio, "More articles by this author" link. This is core trust architecture — humanises the platform. |
| **Co-Founder** (Year 2+) | Post-AFSL, becomes the face of B2B partnerships and enterprise BD. | Not yet on site. | Place-holder for now. Once active, the BD landing page gets a face; the about-page team grows from 1 to 2+ humans. |

**Why this matters for design.** The most credible thing this platform can say is *"a real person built this with care, and there are real experts behind every article."* Finder cannot say this; their content is staff-assigned and rotates. Canstar can't say this; "Canstar Research" is the corporate voice. The founder + father + Friend's Dad chain is a unique, defensible brand asset and **the design should surface it.**

---

# 5. Revenue mix and the surfaces that earn it

The audit should know which surfaces make the money. **Roughly 70% of launch revenue flows through three surfaces.** The remaining 30% is a long tail of newsletter sponsorships, sector reports, B2B subscription tiers, and (later) API access.

### Stage 1 (launch) revenue breakdown — estimated

| Rank | Stream | Mechanic | Primary surfaces | Est. % of launch revenue |
|---|---|---|---|---|
| **1** | **Affiliate commissions** | User clicks broker / platform CTA → CPA or revenue-share. Tracked via `navigator.sendBeacon` for reliability across page navigations. Idempotent click logging. | `/compare`, `/best/[category]`, vertical pillar pages, `/broker/[slug]` review pages, **quiz results screen** (12–18% convert-to-account vs 2–4% on cold compare), `/versus` head-to-head pages | **40–45%** |
| **2** | **Sponsored placements** | $300/mo Deal of the Month → $500/mo Category Sponsor → $2,000/mo Featured Partner. Stripe subscription. 1/3/6/12-month commitment with 10–30% discount. | `/advertise/packages` self-serve checkout, sponsor badges across comparison surfaces, homepage deals carousel, newsletter slot 2, sector-report sponsor logos | **20–25%** |
| **3** | **Advisor lead capture** | $39/lead base, free tier 3 leads, then per-lead billing. Dynamic-pricing multipliers (SMSF accountant 1.5×, debt counsellor 0.7×, super vertical 1.3×, time-of-day surge ±0.2×, lead-quality score ±0.2×, new-advisor 30-day discount 0.6×). Subscription tiers planned: Standard $199/mo, Premium $399/mo, Featured $999/mo. | Advisor profile page, advisor directory `/advisors/[type]`, "Get matched" modal, advisor-match CTA on vertical pages, `MobileStickyAdvisorCta` | **15–20%** |
| 4 | Newsletter sponsorships | $200–$500 per send. | Email template (out of scope for web design audit but relevant: sponsor slot-2 in homepage exit-intent capture). | ~5% |
| 5 | Sector report sponsorships | $800–$1,500 per series, gated download → developer leads. | `/research`, sector report listings, gated download modal. | ~5% |
| 6 | Quiz funnel (drives #1) | High-intent CTAs converting 2.5–3× baseline. | `/quiz` 10-step flow + results screen. | (counts inside #1) |

**B2B vs consumer split.** The B2B-facing surfaces (`/advertise/packages`, advisor onboarding via `/advisor-apply`, broker partnership via `/for-brokers`, broker portal, advisor portal) are the highest-LTV revenue and currently the weakest design surfaces. The audit should weight at least 2 of the 10 mockups toward B2B.

---

# 6. Customer segments and LTV priority

The platform has **two distinct customer types** who must be visually addressed differently. This duality is core to the design.

### Users (free; the demand side — they don't pay us, but their actions monetise via #1, #3 in §5)

| # | Segment | Why they matter | Design hooks |
|---|---|---|---|
| 1 | **Australian retail investor** | Primary persona; broker comparison, super consolidation, ETFs. Largest cohort by volume. | Comparison engine, vertical pillar pages, quiz funnel. |
| 2 | **Cross-vertical Australian (SMSF + property + crypto + super)** | 2.5–3.2× the referral revenue of single-vertical users. Highest revenue per user. | Cross-vertical discovery: related verticals strip, "Also compare" cards, scenarios page (`/scenarios`). |
| 3 | **Non-resident / international investor** (Singaporean, HK, mainland China, Dubai expat, US-AU dual citizen) | Smaller cohort by volume, **3–5× the revenue per click** (FIRB property leads, SIV migration leads, international-tax advisor leads). The international thesis exists for this cohort. | Foreign-investment hub, locale switcher, persona selector, country-specific pages. |
| 4 | **Migrant / new-arrival Australian** | High-intent, low-knowledge; super, savings, FIRB, DASP. | Foreign-investment hub, super-consolidation guide, calculators (DASP withholding, fee-impact). |

### Buyers (paying; the supply side — these are the customers who actually transfer money to us)

| # | Segment | LTV | How they buy | Current design state |
|---|---|---|---|---|
| 1 | **Enterprise broker / platform partner** | $30k–$500k/year potential. ~15–25 deals/year. | Personal BD via Fin / Co-Founder; arrives at `/advertise/packages` or BD landing page; needs to be impressed in 30 seconds. | Weak. The `/advertise/packages` page is functional but doesn't sell at the enterprise price point. |
| 2 | **SMB broker / platform** | $2k/mo Featured Partner (= $24k ACV) or $500/mo Category. | Self-serve Stripe checkout via `/advertise/packages`. ~600 prospect cold outreach/month via Apollo + Clay + Lemlist. Conversion ~2–4%. | Functional. Visual differentiation (annual discounts, sponsor badges across surfaces) needed to lift conversion. |
| 3 | **Premium advisor** ($199–$999/mo subscription, planned post-launch) | $2.4k–$12k ACV. | Wants leads, lead-quality, premium features (homepage pin, quiz boost, content access). | Onboarding stub. Subscription tier UX is the planned post-launch work. |
| 4 | **SMB advisor** ($39+/lead base) | Variable. Per-lead, free-tier 3 leads. | Self-serve onboarding via `/advisor-apply`. Stripe-backed billing planned. | Functional. Lead-quality and dynamic pricing display are the next surfaces. |

**Design-implication takeaway.** The current site is mostly user-facing. The B2B surfaces that sell the highest-LTV deals (Enterprise broker, Featured Partner, Premium advisor subscription) are the weakest. **The 10 priority mockups must include 2–3 B2B surfaces.**

---

# 6A. Goals — numerical, qualitative, and non-goals

### Numerical revenue goals
| Year | Stage | Run-rate | Source |
|---|---|---|---|
| 2026 (Y1) | Soft launch on Vercel → custom-domain cutover when enterprise-grade | $20k–$110k/mo | Affiliate commissions (40–45%) + sponsored placements (20–25%) + advisor leads (15–20%) + newsletter / sector reports (10%) |
| 2027 (Y2) | Diversified B2B + immersive city stays | $1.3M/yr ramp | Add: API tier ($99/mo–enterprise), premium advisor subs ($199 / $399 / $999), expanded sponsor tiers, partnership closes from Singapore / Dubai / Hong Kong BD trips |
| 2028+ (Y3+) | Co-branded products post-AFSL/ACL | **$15.6M/yr at maturity** | Co-branded savings, brokerage, ETF, super, life insurance, credit card, home loans |
| 2029–2031 | Acquisition window | 8-figure exit | Australian media group / big-4 bank digital strategy / international fintech wanting AU distribution |

### Leading indicators (the metrics the design is actually optimising)
| Metric | Current (est.) | Target | Surface most affected |
|---|---|---|---|
| Affiliate CTR on comparison rows | ~5% | **8%+** | Mockup 1 (comparison row) |
| Quiz completion → broker signup | ~12% | **18%+** | Mockup 3 (quiz results) |
| Featured Partner closes | ~5/year | **15–25/year @ $24k ACV** | Mockup 5 (`/advertise/packages`) |
| Advisor lead-to-bill conversion | unknown | **60%+** | Mockup 4 (advisor profile + match) |
| International cohort revenue per click | ~baseline | **3–5× AU baseline** | Mockup 6 (international hub) |
| Cross-vertical user revenue lift | ~baseline | **2.5–3.2×** | Cross-vertical discovery in pillar pages + homepage |
| "Compare brokers australia" SERP rank | n/a | **Top 3 in 18 months** | Pillar pages, methodology, schema markup |
| Mobile vs desktop revenue split | ~30/70 | hold or shift to ~40/60 | All mobile mockups |

### Qualitative goals
- Become the reflexive answer to *"where do I compare X in Australia?"* — not the cheapest, the most trusted.
- Get cited in financial journalism (AFR, SMH, *Guardian Australia*) as the **independent comparison source** — earned media, not paid press.
- Set a new bar for **compliance-by-design** in AU fintech.
- Build a brand acquirable for 8 figures, not a content site acquirable for 7.
- **Honour the 30-year domain.** Build something Dad would be proud to hand over.

### Non-goals (deliberately not optimising)
- Daily traffic / pageview maximisation. Quality of intent > quantity of clicks.
- *"Largest"* anything. Not chasing Finder-scale.
- Direct-to-consumer subscription revenue. **Free for users, ever.**
- VC funding round. Bootstrap to acquisition. **Founder dilution stays at 0%.**
- Twitter/X audience-building. LinkedIn + earned media only.
- Daily-newsletter race. Weekly digest only.
- Founder-personality cult. Calm authority ≠ Twitter-famous.
- Awards / *"Best Broker 2026"* theatre. Canstar's territory.
- Native iOS / Android app. PWA is sufficient (and is real).

### What "enterprise-grade" means for the domain cutover
The custom domain is repointed at this codebase **when** these criteria are met:
- Lighthouse ≥ 90 across performance / a11y / SEO / best-practices on all key pages
- 0 P0 / P1 issues open in the audit-remediation queue
- All 9 vertical pillars have verified-fee data < 30 days old
- Advisor directory has ≥ 100 verified profiles with photos
- All 24 calculators tested in EN + ZH + KO
- All trust pages reviewed by Friend's Dad (or external counsel)
- This design audit's mockups for Tier-A surfaces (Mockups 1, 2, 7) are shipped
- 30 days of zero production incidents
- AFCA complaints workflow tested end-to-end

The design audit's deliverables are **on the cutover-blocking critical path** — not cosmetic.

---

# 6B. Per-vertical revenue priority

Of the 9 verticals, **3 generate ~70% of launch revenue** and deserve disproportionate design attention. The other 6 are coverage / SEO / cross-sell.

### Tier A — Highest revenue per click (design these first)
| Vertical | Est. share of launch revenue | Why | Design implication |
|---|---|---|---|
| **Share Trading** | ~30% | Affiliate yield highest (15–30% per signup CPA). 20+ platforms compete for top placement. $2k/mo Featured Partner most desirable here (CommSec, Stake, Pearler, Superhero, Moomoo, IG, Interactive Brokers all want top slot). Cross-sells well into super, ETFs, US shares. | Comparison row (Mockup 1) must be **perfect** for share-trading first. Vertical pillar (Mockup 2) prototyped on `/share-trading`. |
| **Superannuation** | ~20% | Advisor lead monetisation strongest here (1.3× multiplier on $39 base = ~$50/lead for SMSF accountants). High intent. Aging-Australia demographic = secular tailwind. SMSF cohort is willing to pay for advice. | Advisor profile + match (Mockup 4) should be tested on SMSF accountants first. |
| **Crypto** | ~15% | Deal-of-month placements ($300/mo + 15+ platforms). Volatile but high-margin when active. International overlap (FIRB ≠ relevant; tax + WHT = relevant). | Sponsor badge treatment (within Mockup 1) tested first on crypto comparison — most sponsors there. |

### Tier B — Medium revenue, strategic importance
4. **Property Platforms** (~10%) — Newest vertical (April 2026 schema additions). Fund listings + gated sector reports = sponsorship + lead capture. Property advisor leads. **Highest international leverage** (FIRB property non-residents = $$$).
5. **CFD & Forex** (~8%) — Sponsored-deal heavy ($2k–5k/mo tiers). Volatile affiliate yield. Pre-built ASIC RG227 compliance is a competitive advantage (most CFD brokers can't match the disclosure quality).
6. **Savings** (~7%) — Lower margin per click but **stickiest**. Deposit-rate comparison drives repeat traffic + low churn. Foundation for newsletter audience build.

### Tier C — Long-tail / strategic optionality
7. **Term Deposits** (~5%) — Minimal affiliate; sponsor + institutional leads. Pairs with savings.
8. **Robo-Advisors** (~3%) — Mid-tier. **B2B integration testing ground** for the future API tier.
9. **Research Tools** (~2%) — Low direct revenue but strong SEO + cross-sell into other verticals.

### The cross-vertical insight (most important)
Users who interact with **3+ verticals** generate **2.5–3.2× the revenue per user** vs single-vertical users (e.g., an SMSF investor who also explores property + crypto). **Cross-sell discovery is the highest-leverage UX win the audit can deliver.**

Design implications:
- Every vertical pillar page must show **2 related verticals** in a strip near the bottom ("Also compare: ETFs · property · super").
- The homepage should feature a **vertical mosaic** that signals breadth without forcing a choice.
- The advisor profile should suggest cross-vertical specialists ("This SMSF accountant also handles crypto CGT").
- The quiz should ask about **multiple verticals** in early questions ("Which of these do you hold? [super] [shares] [property] [crypto]") to bucket users into multi-vertical paths.

### Per-vertical international leverage (which verticals get the foreign-investment treatment)
- **Property** — FIRB calculator + 2025–27 ban explainer → **highest** international uplift. Non-resident property buyers are a top-3 lead category by value.
- **CFD** — international clients common; 24/7 retail demand → high.
- **Share Trading + Crypto** — non-resident filter (`/compare/non-residents`) → moderate uplift.
- **Super** — DASP withholding for departing-AU expats → moderate, but specific audience.
- **Savings, Term Deposits, Robo, Research Tools** — limited international leverage.

---

# 6C. Strategic philosophy — the 10 things this platform believes that competitors don't

Every design decision should be defensible against these 10 principles. **The audit can use these as a self-check** — *"does this mockup violate any of the 10?"*

1. **Factual is more trustworthy than "best".** No algorithmic ranking. User-controlled sort. The methodology is the product.
2. **No AFSL is a feature, not a bug.** Without AFSL conflicts, we can be more honest about every product than competitors who hold AFSL and have paid relationships skewing what they recommend.
3. **Compliance is design, not paperwork.** Disclaimers should be legible, not hidden. Verified should be visible. The trust architecture is the moat.
4. **International is a front door, not a footer.** Singapore / HK / Dubai / mainland-China investors are 3–5× more valuable per click. They deserve a dedicated experience, not a bolt-on.
5. **Specialised advisors > generalist matching.** SMSF accountants, FIRB specialists, migration agents — niche specialty is high-LTV and trust-building. Generalist *"find an advisor"* is a Finder-shape race to the bottom.
6. **Calm authority > marketing-loud.** Stripe / Wise / Vanguard register. Amber accent, not Finder orange. Restraint > volume.
7. **Family + heritage > corporate brand.** Domain held by Dad since 1996; Fin relaunching as inheritance. Anonymous *"research team"* voice can't compete with a real family story.
8. **Transparency = product feature.** Per-broker `last_verified_at` shown on every row. Sponsorship clearly badged. Author credentials chip-displayed. Editorial pipeline disclosed. Stripe-status-page-style transparency widget possible.
9. **Agents augment one founder, not replace humans entirely.** 19-agent autonomous system + 5-tier human escalation. AI work is checked by humans where it matters. Honest about how the work gets done.
10. **Long-term horizon, not quarterly thinking.** Acquisition window is 2029–2031. Decisions optimise for the brand we want to sell, not next month's traffic. Domain cutover happens when the build deserves it — not when an artificial date demands.

---

# 6D. UX/UI philosophy — conversion-maximising principles per surface

This is the operational playbook. Every page type the audit mocks up has a different conversion-maximisation logic. Below is the principle-set per surface.

### Universal principles (apply to every surface)

1. **F-pattern + Z-pattern eye-tracking awareness.** Logo top-left, primary CTA top-right or end-of-content. Don't bury CTAs in left sidebars.
2. **One primary CTA per surface, one secondary. No more.** Choice paradox kills conversion above three options.
3. **Sticky CTA on mobile after 420px scroll.** Existing `MobileStickyAdvisorCta` pattern. Keep it.
4. **Skeleton loading, never spinners.** Layout shift kills perceived performance and CLS scores.
5. **Empty states have a "remove last filter" or "broaden criteria" CTA.** Never dead-ends.
6. **Trust signals near every CTA.** Verified badges, fee-freshness pills, sponsor disclosure.
7. **Mobile is 60–70% of traffic; desktop is where conversion completes.** Design mobile for triage + interest-capture; design desktop for completion.
8. **A/B test everything that touches money.** Hero copy, CTA text, sort defaults, modal field counts. Use the existing `/admin/ab-tests` infrastructure.
9. **Compliance copy is non-negotiable but is a *component*, not free text.** Lay out, don't rewrite. Use existing constants from `lib/compliance.ts`.
10. **Above-the-fold determines bounce.** First scroll = headline + 1 CTA + 1 trust signal. No more.
11. **Form fields > 4 = 5–10% drop-off per field.** Minimise. Two-step modals beat long single-page forms.
12. **Speed is conversion.** Every 100ms LCP delay is ~1% conversion lost. Stay disciplined on image optimisation, code-splitting, font-display: swap.

### Homepage UX/UI logic

- **First scroll = brand + breadth + trust.** Headline + 2 CTAs + 3-pillar value strip + "verified data" microsignal. No more above the fold.
- **Featured-broker strip = social proof, not advertising.** Top 6 by rating. No sponsor placement here — it dilutes trust.
- **Comparison snapshot (5 rows) = sample of the product.** Use the row component from Mockup 1; don't reinvent.
- **Three-pillar value strip** must communicate Moats 1, 2, 3 in <8 words each: *"100+ platforms across 9 verticals" / "12 country pathways including FIRB & SIV" / "Factual data, no AFSL conflicts"*.
- **International on-ramp visible** but not dominant. A "Investing from outside Australia? →" callout pre-footer.
- **Heritage quiet line** in footer or above-fold strip: *"Held in our family since 1996. Relaunched in 2026."*
- **De-clutter aggressively.** If a section can't justify itself in 5 words, cut it.
- **A/B variants A/B/C currently fight each other.** Pick a primary; let the other two remain test variants but commit one as default.

### Comparison-row + comparison-table logic (the 40%+ revenue surface)

- **Information hierarchy follows eye path:** logo → name → 2–3 key fees → 1–2 feature flags → rating → CTA. Left-to-right.
- **One CTA per row.** Amber. Right-aligned (Western reading-pattern terminus).
- **Sponsor badge top-right corner of row, never on the CTA.** Disclosure inline below the row, not in a tooltip.
- **Fee-freshness pill near the fees, not floating elsewhere.** Green / amber / grey tied to `last_verified_at`.
- **Mobile: scroll-snap card stack, persistent CTA at bottom of each card.** Drop the desktop horizontal-scroll-the-table pattern — it's the weakest mobile surface.
- **60-row threshold = paginate.** Beyond 60 rows, decision fatigue dominates. Better: filter UI + 60 results.
- **Sticky filter bar on desktop scroll.** Below ~600px scroll, filters become invisible without sticky.
- **Sort default in `factual_only` mode = price low-to-high.** Sort default in `general_advice` mode = rating. Never random.
- **Hover state on row = subtle elevation + border accent.** No flashy animations.
- **Saved / shortlisted state must be visually obvious.** Filled-bookmark icon, tooltip "saved to shortlist".

### Filter and sort UX (the discovery layer)

- **Filter pills > dropdowns where possible.** One click to apply, lower friction.
- **Filters apply on click, not on a "Submit" button.** "Apply filter" buttons are anti-pattern.
- **Filter state persists in URL.** Shareable links lift social-discovery + SEO long-tail.
- **Active filters visible above results as removable chips.** Click chip = remove filter.
- **"Clear all filters" button** appears only when ≥2 filters active.
- **Empty state** ("no brokers match these filters") = "Remove last filter" + "Reset all filters" buttons. Never dead-ends.
- **Filter category limits:** show top 5 options, "Show more" expands. Never dump 20+ options in one panel.
- **International toggle** ("accepts international clients") visible at the top of every advisor + broker filter set — high-leverage filter, $3–5× revenue per click.

### Quiz funnel (the 12–18% conversion surface)

- **One question per screen.** Progress bar at top, percentage visible.
- **First-option-default-selected.** Tested for completion lift; users override if needed.
- **"Skip this question" or "I don't know"** option visible — avoids dropout, defaults to average inputs.
- **Question copy in user voice:** *"I want to..."* or *"My priority is..."* — not *"Do you want to..."*.
- **Answer options ≤ 5.** More than 5 = decision fatigue.
- **Result screen: top 3 only** (Hick's law). Number them. **Echo back the inputs** ("You said: < $5k portfolio, ASX-only, monthly trades — this matches…") to reinforce data-drivenness.
- **"Why this?" expandable** per result — cite the 2–3 features that matched.
- **Capture email even on click-through.** "Email me these results" microaction → newsletter list.
- **Time-to-result < 90 seconds** for completion >70%. The current 10-step quiz is at the edge — consider shortening to 7.
- **Sponsorship influence on quiz disclosed inline.** *"Includes a paid placement boost — see methodology."*
- **Tasteful celebration on result reveal.** Existing `confettiBurst` is fine. No more.

### Advisor directory ("find advisors") UX

- **Hero search bar at top, not just sidebar filters.** High-intent searchers convert 3× browsers.
- **Filter chips above grid: type · location · language · international-clients-yes · rating ≥ 4 · verified-only.**
- **Card grid: photo (square 80–96px) → name → firm → rating → location → 2 specialty tags → CTA.** Card height consistent.
- **9–12 cards per page.** Skeleton on load.
- **Geo-detect prompt on mobile** ("Find advisors near you?") — opt-in, not auto-applied.
- **Verified badge on every card visible at thumbnail scale.** Not buried in a tooltip.
- **Cross-vertical discovery strip** below results: *"Looking for SMSF advice? See: SMSF accountants · super specialists · tax agents."*
- **Empty state copy:** *"No advisors match these criteria. [Remove last filter] [Reset]"*.
- **Map view toggle (desktop)** — useful but not critical for v1; defer.

### Advisor profile page UX

- **Header zone (above fold):** photo + name + verified badge (clickable) + 1-line credentials chip-row + 2 CTAs (primary "Get matched", secondary "Save"). Trust microcopy: *"Verified against ASIC register on [date]"*.
- **Tabs:** About / Experience / Reviews / FAQ / Pricing — not all on one long page. Tab content lazy-loads.
- **Reviews count + average visible above fold.** Full reviews accessible via tab.
- **Sticky right-rail (desktop) or sticky bottom-bar (mobile)** with the Match CTA. Visible after first scroll.
- **"Why we verified" expandable** on the badge: cites ASIC Financial Adviser Register / TPB / ABN registry / verification date.
- **Cross-sell: "Other [advisor type] near [location]" carousel** at the bottom — captures users who don't convert on this profile.
- **Languages-spoken flag chips** 🇦🇺 🇨🇳 🇰🇷 — schema supports `languages_spoken[]`.
- **International-client / FIRB / migration-agent badges** if applicable — visible at thumbnail and on profile.
- **Author bio mention if advisor has authored articles** — links to article list.

### Advisor "Get matched" modal (the conversion-critical lead form)

- **2 steps maximum.** Step 1 = email + first name + 2 qualifying questions (vertical of interest, asset range). Step 2 = confirmation: *"We'll send 2–3 advisor matches by tomorrow."*
- **4 fields max per step.** > 4 = 5–10% drop-off per added field.
- **CTA copy: action-driven.** *"Get matched"*, never *"Submit"*.
- **Trust microcopy below form:** *"We won't sell your data. Free for you. We're paid by advisors when matched."*
- **Show *how* we match** — lightweight transparency callout: *"We match based on your inputs + advisor specialty + verified-status — no black box."*
- **Field-level validation** on blur, not on submit. Inline error messages.
- **Success state:** confirmation + estimated turnaround + "What's next?" + cross-sell back to comparison.
- **Mobile: bottom-sheet pattern**, not centered modal. Larger tap targets.

### Calculator pattern UX (24 calculators, one consistent system)

- **3-zone layout:** inputs (left, ~30% width) → live result (centre, ~40%, hero zone) → context / methodology / next-action (right, ~30%). Mobile: stack inputs → result → context.
- **Result is the hero.** Big number, contextualised: *"$1,847/year saved by switching from Broker A to Broker B"*.
- **Wise-style breakdown:** *"ASX brokerage saved: $X · FX saved: $Y · Inactivity fees avoided: $Z"*.
- **Live update on input change** — no "Calculate" button.
- **Sensible defaults** so users see a meaningful result before any input.
- **Save / email-me-this CTA** captures session_id-keyed leads → newsletter-magnet-as-tool.
- **Compliance footer per vertical** (CFD calc → CFD warning, FIRB calc → FIRB disclaimer).
- **Result-share** for social distribution: pre-filled tweet / LinkedIn share.
- **Cross-promote**: every calculator end-state suggests 1 article + 1 broker + 1 advisor.

### Vertical pillar page UX (9 of these — they share the template)

- **Hero is brief.** 3-stat strip + 1 headline + 2 CTAs. Don't oversell.
- **Comparison table is the page's purpose.** Hero exists to set context, not steal attention. Hero shouldn't be more than 25% of above-the-fold.
- **One sponsored callout above the table** (Featured Partner). Never multiple — that's Finder territory.
- **`MethodologyCard` above the comparison table.** *"Fees sourced from broker disclosure, last verified < date >. No algorithmic ranking. [How we work →]"*
- **FAQ at bottom**, schema-marked-up for SERP-snippet capture.
- **Cross-vertical link strip near footer**: *"Also compare: ETFs · super · property"* — drives the 2.5–3.2× cross-vertical revenue lift.
- **Foreign-investor callout** if vertical has international leverage (property, super, share-trading).

### B2B / `/advertise/packages` page UX

- **B2B audience reads differently.** More text, more rationale, more trust signals than user-facing.
- **Three tier cards with surface preview.** Show *where* the placement appears: *"Featured Partner appears at top of `/share-trading`, badge on every comparison row, homepage deal slot."*
- **Annual discount toggle prominent.** 1mo / 3mo / 6mo / 12mo with "save 30%" highlight. Sticky-revenue win.
- **Audience-size strip:** *"~80k mo unique investors · ~45% mobile · 18% non-resident · Median portfolio $25k–$250k"*. Quantify; B2B buyers want numbers.
- **Two CTAs:** primary self-serve checkout (Featured / Category / Deal — Stripe), secondary *"Talk to BD for enterprise"* (captures $50k+ deals to Agent #06 BD or Co-Founder).
- **Trust strip:** *"100+ platforms already featured · Audited monthly impression reports · ASIC-aware sponsorship boundary: you cannot buy a higher rating."*
- **Case-study slot** (post-launch) — quote from a Featured Partner about results.
- **No Stripe pricing page until tier is selected** — reduces decision fatigue. Click tier → see plan + checkout.

### International / foreign-investment hub UX

- **Persona selector replaces hero.** *"What kind of investor are you? — I want to buy shares · I want to buy property · I'm leaving Australia · Find your situation."* Each persona routes a curated path.
- **Currency toggle (AUD ↔ USD ↔ SGD ↔ HKD ↔ AED).** Wise-pattern. Lift trust for SG/HK/Dubai readers.
- **Locale switcher prominent** (top-right, flag chips). Not buried in footer.
- **DTA rates table searchable by country.** Show off the unique data — this is genuinely first-party content nobody else has.
- **SIV pathway timeline visualised.** Provisional visa → 4 years → permanent. Cost callouts. Specific.
- **2025–27 established-dwelling ban callout** — leads non-resident property questions; the most-asked-about regulation.
- **"Where we'll be next" module** — invisible at launch, populated with upcoming city-stay visits by 2027.

### Trust architecture pattern UX

- **Verified badge clickable → "How we verified" overlay.** Cites ASIC register / TPB / ABN registry / date.
- **Author byline** = photo + name + credential chips (CFA · CFP · RG146 · ASIC #) + 1-line bio + LinkedIn link. Used on every article.
- **`MethodologyCard` embeddable above any data.** 50-word disclosure pattern.
- **Compliance disclaimers tooltip-style on freshness pills + CTAs**, not inline-dense paragraphs.
- **Single `/compliance-hub` page** linked from every compliance footer. Replace the 10×-repeated 81-word general-advice warning with a tight inline + link pattern.
- **Trust microcopy near every form CTA:** *"We won't sell your data."* *"Free for you. Paid by advisors / brokers."* *"You can unsubscribe at any time."*

### Email capture / newsletter UX

- **One pop-up max.** Exit-intent only. Never first-scroll.
- **Lead magnet:** PDF / checklist / weekly digest. **Pick one and test;** don't offer all three at once.
- **2 fields max:** email + first name. Sometimes just email.
- **Microcopy:** *"Weekly only. No spam. Unsubscribe in one click."*
- **Confirmation email visually consistent** with the brand — no Mailchimp default templates.

### Mobile-app PWA experience UX

- **Install prompt on second-visit return.** Never first visit. Use the existing manifest's standalone display.
- **Bottom-nav (Home / Compare / Advisors / Saved / Account)** — app-like, replaces hamburger on installed PWA.
- **Push notifications opt-in after second meaningful action** (saved a broker, completed quiz). Never first visit.
- **Offline mode for shortlist / saved comparisons.** The existing service worker handles this.
- **Sticky quick-CTA persistent across all pages.** `MobileStickyAdvisorCta` pattern extends.
- **Pull-to-refresh on listings** (advisor directory, comparison results). Native-feeling.

### Search / glossary / education hubs UX

- **Search bar prominent, instant-results on type.** Not "press enter to search". Results as you type.
- **Search results categorised:** Brokers · Advisors · Articles · Glossary terms · Calculators. One result per category until "see all".
- **Article cards:** cover (16:9) → title → author byline → reading time → vertical tag.
- **Glossary:** alpha-nav top + search top. Each term card-sized with 3-line definition + "deeper guide →" link.
- **Cross-promote:** every glossary term page suggests 2 articles + 1 calculator + 1 broker.
- **Reading time on every article** — sets expectation, lifts completion.

### What this UX/UI philosophy is *not*

- **Not** a complete UI specification. It's a principles set. The audit must apply judgment, not check off rules.
- **Not** a substitute for testing. Every principle here is a default; the A/B testing infrastructure exists to challenge them.
- **Not** universal. Some surfaces (admin dashboards, broker portal) are out of scope for this audit; their UX is allowed to be more utilitarian.

---

# 6E. Ideas considered, optionality space, and the founder-visibility question

### Ideas already decided ("yes, doing")
- 19-agent autonomous system + 5-tier escalation (live).
- 3-locale strategy: en-AU + zh-CN + ko-KR (full translation, not partial).
- Self-serve sponsorship marketplace (live, Stripe checkout).
- 24 calculators as lead-capture surfaces (live; design pattern needed — Mockup 10).
- Vercel-soft launch → custom-domain-on-quality cutover (staged launch).
- $39 base advisor lead pricing + dynamic-pricing multipliers.
- Co-branded product roadmap post-AFSL (savings, brokerage, ETF, super, life, card, home loan).
- Immersive city stays Year 2+ BD model.
- Friend's Dad as named Tier-1 author + *"invest.com.au Research Team"* Tier-2 byline.
- PWA (real, not aspirational) — install-to-home-screen viable.

### Ideas decided ("no, not doing")
- VC funding round. Bootstrap.
- Native iOS / Android app. PWA suffices.
- Twitter/X audience-building. LinkedIn + earned-media only.
- Daily-newsletter race. Weekly digest only.
- Affiliate-influencer programme. Compliance risk too high pre-AFSL.
- Buying competitors. Organic build only.
- Awards / *"Best Broker 2026"* theatre. Canstar's space.
- Founder-personality cult. Calm authority ≠ Twitter-famous founder.
- Direct-to-consumer subscription revenue. Free for users, ever.
- *"AI broker matching"* — would require AFSL + breaks principle 1 (factual not algorithmic).
- Unmoderated user reviews of advisors — defamation risk. Moderation queue exists instead.
- Content syndication to Finder / Canstar. Gives away the moat.
- Sponsored content placement on third-party sites. Short-term traffic, long-term trust erosion.

### Ideas open ("considering, not committed" — flag in design where they could land later)
- **Browser extension** — overlays comparison data when a user is on a broker site. Year 2 candidate.
- **White-label comparison engine** — license to neobanks (Up, 86 400) for embedded comparison. High-margin B2B. Year 3.
- **Primary-research subscription tier** — paid sector reports beyond the gated free tier. Year 2.
- **Live video / webinar series** — quarterly with named experts. Possibly Year 2 if Friend's Dad scales.
- **API tier for journalists / analysts** — free with attribution. Builds earned media.
- **Co-branded ETF launch** — most aggressive Year 3 play. Requires AFSL + AUM partner.
- **Sister brand for HK / Singapore** — `invest.sg`, `invest.hk`. Long-term optionality.
- **Founder podcast / Substack** — depends on the founder-visibility decision (below).

### The founder-visibility question (Strategic Question 13 — to be added)

How visible should Fin be on the platform? Three coherent positions:

| Position | Pattern | Pros | Cons |
|---|---|---|---|
| **A. Fully visible** (DHH-at-Basecamp, Patrick Collison-light) | Founder photo on About; named bylines; LinkedIn-active; occasional press; possible founder's-note hero | Trust signal, differentiates from anonymous staff teams, acquirer story stronger with known founder, aligned with Dad + Friend's Dad humanisation | Personal exposure; founder-bus-risk perception; sustained social-media tax; harder to scale brand beyond founder |
| **B. Semi-visible** (Stripe-style Patrick Collison; named but not loud) | Founder named in legal entity + about page + footer; occasional editorial-policy bylines; minimal social media | Trusts the brand to do the work; founder-cult avoided; allows scaling; honest about authorship without amplifying | Weaker individual-trust signal; press has less to grab onto |
| **C. Near-anonymous** (Vanguard-founder-style; brand carries it alone) | Founder mentioned only in legal entity disclosures + FSG; no founder photo / byline / bio on user-facing surfaces | Platform speaks for itself; lowest founder bus-risk; matches AU regulatory aesthetic (MoneySmart-grade impersonality) | Loses the *"real person built this"* trust story competitors can't match; weaker acquirer narrative |

**Current lean (Fin's preference, audit can override):** **B — semi-visible.** Founder bylined on about + footer signature line + occasional LinkedIn posts (not a personality brand). Friend's Dad gets the editorial stage (Tier-1 articles); Co-Founder gets the BD stage (post-AFSL); Fin is the architect/operator who's named but not loud. **The audit should take a position on this with implications for: about-page treatment, editorial-policy attribution, footer signature lines, possible founder's-note hero, LinkedIn-link surfacing.**

---

# 7. Competitive landscape

Before the audit prescribes solutions, it should know what *not* to copy and what to aspire to.

### Australian incumbents — what they do (and what we deliberately reject)

| Competitor | Founded | Strengths | What we deliberately reject |
|---|---|---|---|
| **Finder** | 2006 | Broad coverage, strong SEO, recognisable orange brand, large content team | Heavy ad-tech feel. Aggressive lead-capture pop-ups. AFSL-licensed, which forces conflict-disclaimer-heavy footer. Anonymous "Finder Research Team" voice. Brand reads "comparison blog with offers", not "regulated platform". Sponsored badges are subtle (small text label, top-left of card). |
| **Canstar** | 1992 | Trusted star-rating brand, banking depth, "Outstanding Value" / award badges | Outdated UI. Narrow vertical coverage (banking + super). No advisor directory. Heavy on print/legacy aesthetic. Award-rosette theatre that obscures the data. Badges are large (~15% of card visual real estate) — feels like an ad-of-an-ad. Purely AU-domestic (no international layer). |
| **RateCity** | 2007 | Banking comparison, deal listings, **colour-coded rate cells (green for low, orange/red for high)** — a strong visual pattern. | Same shape as Canstar — banking-focused, no advisor directory, no international. Teal/turquoise primary (`#00A0A3`-ish) — distinct but not authority-signalling. |
| **Mozo** | 2008 | "Independent adviser" positioning. Expert author bios. | Slightly dated visual style. Orange / coral accent (`#E87D2E`-ish) — close to Finder's orange. Limited advisor directory. |
| **MoneySmart** (ASIC's consumer site) | 2011 | **The ASIC-implicit standard.** Austere. Government blue (`#003DA5`). Georgia serif body text (signals "official document"). Zero photography. WCAG AAA contrast. Persistent "general advice" disclaimer on every page. Methodology transparency on every tool. | The unspoken design mandate: **MoneySmart is maximally boring by design.** Boring = trustworthy in regulated FS. Every fintech that colours up, adds photography, or softens disclaimers risks being seen as less regulatory-careful. |

### Aspirational comparators — what we should learn from

| Aspirational | Lesson |
|---|---|
| **Stripe** | *Restraint as authority.* Navy/white/light-grey. One bright accent (`#635BFF`) used sparingly. One-sentence leads ("Payments infrastructure for the internet"). Tiny credentials section ("Trusted by Slack, Google, Amazon..."). The implicit message: *we're boring because we handle your money*. |
| **Wise** | *Transparency as design.* The fee breakdown — *You send / We deduct / You receive* — is the hero element, with real-time rates updated every 10s. Colour coding: green for "you receive", neutral for rates, red for "we deduct". Tooltips explain mid-market rate vs Wise rate. **The implicit message: transparency is our main feature, so we make the breakdown a hero element.** Direct analogue for our fee-verified pill + per-broker freshness data. |
| **Vanguard.com.au** | *Quiet authority.* Navy + white + light-blue accent. Serif headlines, sans-serif body. **No reviews, no testimonials.** Trust built via AUM figures, regulatory badges, and a footer line on every page: *"Founded 1975. Australian-managed."* Cold, clinical fund pages with no star ratings. The implicit message: *we don't need to convince you. Here's the data. Read it.* |
| **IG Markets (regulated AU retail FX/CFD)** | *Regulated retail when it has to compete on UX.* Dark blue (`#003D7A`), white, accent green. **AFSL #220440 always visible top-right** (clickable → ASIC register). Persistent risk-warning banner below header, colour-coded yellow (attention but not alarming). Built-in fee calculator on every product page (live rates, real examples). Sidebar educational videos (3–5 min). |
| **StashAway / Saxo (Singapore)** | *Asian-fintech aesthetics.* Regulator badges are LARGE and always visible (MAS bigger in SG mental model than ASIC in AU). Multi-currency awareness. Language switchers (English ↔ 中文). Trust over marketing — educational content outweighs lifestyle photography. |

### Our brand register

**Calm authority.** Closer to Stripe / Wise / Vanguard / IG / StashAway than to Finder's loud-orange or Canstar's awards-rosette legacy look. Users should feel they've arrived at a regulated, considered place — even though the legal moat is *not* being licensed. Asian-investor visual cues are part of the moat: the international hub cannot feel like a Google-translated bolt-on.

---

# 8. Product surface synthesis — 800+ routes condensed

A full route walk found **~800 distinct routes** (pages + API endpoints), 24 calculators, 6 multi-step forms, 6 live A/B tests, 50+ admin dashboards, and 77 scheduled crons. The audit doesn't need every path, but should know the breadth.

### Marketing / comparison (≈45 routes)
`/`, `/compare`, `/compare/super`, `/compare/etfs`, `/compare/insurance`, `/compare/non-residents`, `/best/[category]` (10+ subcategories per vertical), `/versus` (head-to-head broker matchups, dynamically generated pairs), `/broker/[slug]` (individual broker reviews), `/share-trading`, `/crypto`, `/savings`, `/super`, `/cfd`, `/term-deposits`, `/robo-advisors`, `/property-platforms`, `/research-tools`. Each pillar uses the `VerticalPillarPage` template — **change the template, change every vertical**.

### Calculators / tools (≈24)
`/fee-impact`, `/savings-calculator`, `/super-contributions-calculator`, `/fire-calculator`, `/retirement-calculator`, `/cgt-calculator`, `/debt-calculator`, `/property-yield-calculator`, `/switching-calculator`, `/fee-simulator`, `/firb-fee-estimator`, `/non-resident-cgt-checker`, `/non-resident-dividend-calculator`, etc. Each calculator: inputs → outputs → optional lead-capture step → compliance disclaimer. **Calculators are unique product surfaces and lead-magnet hybrids.** Currently each has its own UX; there is no shared "Calculator" component pattern.

### Advisor surfaces (≈30 routes)
`/advisors` (directory hub), `/advisors/[type]` (financial-planners, wealth-managers, smsf-accountants, crypto-advisors, tax-agents, debt-counsellors, real-estate-agents, property-advisors, **firb-specialists, international-tax-specialists, migration-agents**), `/advisor/[slug]` (individual profile), `/advisors/compare` (side-by-side), `/advisor-apply`, `/advisor-portal/*` (logged-in advisor dashboard, leads, analytics, profile, billing, settings, team — 7 tabs).

### Foreign investment (≈25 routes)
`/foreign-investment` (hub), `/foreign-investment/property`, `/foreign-investment/siv` ($5M complying-investment migration), `/foreign-investment/tax`, `/foreign-investment/[country]/` (Singapore, Hong Kong, China, South Korea, Japan, UAE / Dubai, US, UK, India, Indonesia, Malaysia, NZ — ~12 country pages), `/zh/foreign-investment/*`, `/ko/foreign-investment/*` (full ZH and KO translations).

### Content / education hubs
`/articles`, `/learn`, `/how-to`, `/glossary`, `/news`, `/research`, `/scenarios`, `/benchmark`, `/health-scores`. Article pages use Article schema.org markup with author bylines (data exists, UI thin).

### B2B / advertise
`/advertise/packages` (self-serve sponsorship checkout — Stripe), `/advertise/marketplace`, `/for-advisors`, `/for-brokers`, `/advisor-apply`, `/broker-apply`, `/broker-portal/*` (logged-in broker dashboard).

### Admin (≈50 dashboards)
Under `/admin/*` — revenue, marketplace funnel, dynamic-pricing rules, A/B test results (`/admin/ab-tests`), advisor verification, broker management, content (article publishing), compliance / audit log, GDPR data requests, complaints, sponsorship campaigns, newsletter sponsors, sector reports, financial audit log. **The founder uses these daily.**

### Trust pages (legal + transparency)
`/about`, `/methodology`, `/how-we-earn`, `/editorial-policy`, `/fsg`, `/complaints`, `/privacy`, `/terms`, `/cookies`. See §11 for content / voice analysis.

### Account / auth
Standard Supabase auth. Routes: shortlist (saved comparisons), saved searches, account settings. **Authenticated users are a small slice; most traffic is anonymous.**

### Cron / scheduled work (77 jobs)
Under `/app/api/cron/*` — fee-data refresh, leaderboard rotation, advisor billing run, dunning, abandoned-quiz drip emails, GDPR purge, compliance audit, sponsor impression accounting, leads SLA enforcement, etc. **Data-freshness pills are tied to these crons** — when crons stop, the pills stale.

### A/B testing infrastructure (6 live tests)
Cookie-based variant assignment. Admin dashboard at `/admin/ab-tests`. Conversion attribution via `session_id` stitching. Current live tests include 3 homepage hero variants (A control / B quiz-first / C value-first — see §11) plus advisor-match form, comparison-table sort default, sponsored-placement treatment.

---

# 9. Data model the design can lean on

The Supabase schema spans **170+ tables across 8 domains**, evolved in discrete waves from March → April 2026. RLS is enabled on all user-data tables; `lib/supabase/admin.ts` is the service-role escape hatch for admin / webhook / cron contexts only.

### What design can leverage (per-entity)

**Per broker / platform:** logo URL, name, slug, sponsor tier (`featured_partner` | `editors_pick` | `deal_of_month` | none), ASX fee, US fee, FX rate, brokerage min, monthly fee, withdrawal fee, features (CHESS, SMSF, fractional, US shares, mobile app, demo account, MT4/MT5 — boolean flags), star rating, review count, `last_verified_at` (timestamp; `FeeVerifiedPill` colour-codes from this), deal text, deal expiry, affiliate URL.

**Per advisor (`professionals` table):** photo, name, firm, advisor type, location (state + suburb), rating, review count, `verified` boolean (admin-toggled), AFSL number, TPB registration, ABN, specialty tags, languages spoken (array — design can show 🇨🇳 🇰🇷 flag chips), accepts-international-clients flag, FIRB-specialist flag, international-tax-specialist flag, fee transparency, years of experience, status (`active` | `inactive` | `pending`).

**Per article:** title, slug, body (markdown), author (FK → team_members or professionals), cover image, tags, vertical, published_at, view_count, reading time. **Author has photo, name, credentials chips (CFA / CFP / RG146 / ASIC #), bio, LinkedIn URL.**

**Per lead (multiple tables — `professional_leads`, `broker_leads`, `developer_leads`, `quiz_completions`, `contact_form_submissions`):** session_id stitches the journey. Stored fields include vertical, asset range, location, urgency, qualification score, source page, referrer, UTM, AB-test variant assigned, advisor matched, billing status.

**Per quiz completion:** all 10 question answers stored (allows the results screen to echo back "you said: < $5k portfolio, ASX-only, monthly trades — this matches…" — important UX trust pattern), recommended brokers (top 3), conversion (whether user clicked through).

**Per click event:** `session_id`, `ab_test_id`, `source`, `campaign_id`, `placement_id`, `ref_url`, broker slug, timestamp. Logged via `navigator.sendBeacon` for reliability across page navigations. Idempotent.

**Storage buckets:** `advisor-photos` (5MB max, JPEG/PNG/WebP), `broker-logos`, `article-covers`, `sector-reports`, `listings-images`. Public read.

### What design must know is *missing*
- **No public ASIC register lookup** — verification is admin-toggled; design should treat the verified badge as "we verified manually on this date" not "live ASIC sync".
- **No `last_login_at` on professionals** — can't display "last active" on advisor profiles.
- **No per-field `last_updated` on broker rows** — only the row-level `last_verified_at`. Can't display "interest rate updated yesterday, fees verified last week" (yet).
- **Reviews are user-submitted with admin moderation** — moderator queue exists; user-visible review counts are post-moderation.

### Type safety
Supabase types regenerated continuously; the codebase is TypeScript-strict with `noUncheckedIndexedAccess`. **The schema is the contract** — design components should reference real columns.

---

# 10. Existing design system — tokens, components, patterns, gaps

The codebase has a **mid-maturity** design system. The audit should remix it, not reinvent it. **This section is the design-system reference; everything below is also pasted at the end of this document as Appendix M for quick lookup.**

### 10.1 Stack

Next.js 16 · React 19 · Tailwind v4 (PostCSS `@theme` declared in `app/globals.css`; **no separate `tailwind.config.ts`**) · Inter (`next/font/local`, 5 weights, `display: swap`) · Lucide-style custom inline-SVG `Icon` component (110+ icons; not Heroicons; not external) · Supabase. No CSS-in-JS.

### 10.2 Color tokens (declared in `app/globals.css` `@theme` block)

**Primary palette:**

| Role | Token | Hex | Use |
|---|---|---|---|
| Brand text | `slate-900` | `#0f172a` | Body text, headings, default neutral |
| **Action / CTA** | `amber-500` | `#f59e0b` | Every primary CTA. **Non-negotiable.** |
| Trust / link | `blue-500` | `#3b82f6` | Nav, links, active states, focus rings |
| Trust active | `blue-700` | `#1d4ed8` | Active states, focus-visible outline |
| Success / verified | `emerald-500` | `#10b981` | Verified badges, success microcopy, checkmarks |
| Surface 1 | white | `#ffffff` | Card surfaces, hero backgrounds |
| Surface 2 | `slate-50` | `#f8fafc` | Section backgrounds, subtle separators |

**Full amber scale (action / brand):** `50 #fffbeb · 100 #fef3c7 · 200 #fde68a · 300 #fcd34d · 400 #fbbf24 · 500 #f59e0b · 600 #d97706 · 700 #b45309 · 800 #92400e · 900 #78350f`.

**Full emerald scale (success):** `50 #ecfdf5 · 100 #d1fae5 · 200 #a7f3d0 · 500 #10b981 · 600 #059669 · 700 #047857 · 800 #065f46 · 900 #064e3b · 950 #022c22`.

**Full blue scale (trust):** `50 #eff6ff · 100 #dbeafe · 200 #bfdbfe · 500 #3b82f6 · 600 #2563eb · 700 #1d4ed8 · 800 #1e40af · 900 #1e3a8a`.

**Sponsorship tier palette (fixed; do not redesign):**

| Tier | Bg | Border | Text | Disclosure text |
|---|---|---|---|---|
| Featured Partner | `bg-blue-50` | `border-blue-200` | `text-blue-700` | `text-blue-500` |
| Editor's Pick | `bg-slate-50` | `border-slate-200` | `text-slate-700` | `text-slate-500` |
| Deal of the Month | `bg-amber-50` | `border-amber-200` | `text-amber-700` | `text-amber-500` |

**Vertical accent colors (per `lib/verticals.ts` — used as accents on pillar pages, never as floods):** Share Trading amber · Crypto orange · Savings sky · Super emerald · CFD rose · Term Deposits slate · Robo-Advisors indigo · Property Platforms teal · Research Tools violet.

**Dark mode** — fully implemented via CSS custom properties on `html.dark`. Inline anti-flash script in `app/layout.tsx` reads `localStorage.theme` (light / dark / system) before React hydrates. **Every component must work in both modes.**

```
html.dark {
  --bg-primary:    #0f172a   (light: #ffffff)
  --bg-secondary:  #1e293b   (light: #f8fafc)
  --bg-card:       #1e293b   (light: #ffffff)
  --text-primary:  #f1f5f9   (light: #0f172a)
  --text-secondary:#94a3b8   (light: #475569)
  --border-primary:#334155   (light: #e2e8f0)
}
```

### 10.3 Typography

- **Family:** Inter (self-hosted via `next/font/local`, WOFF2, 5 weights: 400 / 500 / 600 / 700 / 800).
- **Display:** `swap` (no FOUT).
- **Fallback:** `system-ui, -apple-system, Arial, sans-serif`.
- **Subset:** Full Unicode (Mandarin / Korean glyphs render via fallback when Inter lacks coverage).

**Scale (responsive):**

| Use | Mobile | Desktop | Weight |
|---|---|---|---|
| Hero h1 | `text-3xl` (30px) | `text-6xl` (60px) | 800 |
| Page h1 | `text-2xl` | `text-4xl` | 700 |
| Section h2 | `text-xl` | `text-3xl` | 700 |
| Card h3 | `text-lg` | `text-xl` | 600 |
| Body | 16px | 16px | 400 |
| Body small | 14px | 14px | 400–500 |
| Microtype | 12px | 12px | 500 |
| Disclaimer | `text-[0.69rem]`–`text-[0.65rem]` | same | 400, slate-500 |

Hero letter-spacing: `-0.02em` to `-0.03em`. Body: default. Hero line-height: `leading-tight`. Body: Tailwind default (1.5).

### 10.4 Spacing, radius, shadow, breakpoints

- **Spacing:** Tailwind defaults (4px increments). **Inconsistency to fix:** `p-3`, `p-4`, `p-6` mixed without rule. Suggested: cards `p-4 md:p-6`, hero `p-6 md:p-10`, microcomponents `p-2 md:p-3`.
- **Container:** `.container-custom` — `max-width: 1200px; padding: 0 1rem;` Used as the page-content wrapper everywhere.
- **Radius:** `rounded-xl` (12px) cards/buttons · `rounded-2xl` (16px) heroes · `rounded-full` pills/badges/avatars · `rounded-lg` (8px) inputs.
- **Shadow:** `shadow-sm` cards-at-rest · `shadow-md` hover lift · `shadow-lg` modals/sticky · `shadow-[0_-4px_20px_rgba(0,0,0,0.10)]` upward-cast for sticky bottom bar.
- **Breakpoints:** `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Mobile-first cascade. `md:hidden` / `lg:hidden` for responsive hiding.

### 10.5 Motion library

**Principles:**
1. Event-triggered, not auto-playing.
2. Short — 0.2–0.6s for micro-interactions; 1.2–2s only for celebratory moments.
3. `prefers-reduced-motion: reduce` respected globally — animations collapse to 0.01ms.
4. `.js-ready` class added after hydration so no invisible content if JS fails. Safety fallback at 2.5s.

**Named keyframes (defined in `globals.css`):** `shimmer` (1.5s infinite — skeletons) · `fadeInUp` / `fadeIn` (0.6s — scroll reveals) · `slideInRight` / `slideOutLeft` (0.35s — quiz transitions) · `resultCardIn` (0.5s, staggered 0.12–0.6s — quiz top-3 reveal) · `confettiBurst` (1.4s cubic-bezier — quiz completion) · `topCardGlow` / `winnerPulse` (1.2–2s — quiz winner) · `badgePulse` (1.8s × 3 — top-match attention) · `toastIn` / `toastOut` (0.25 / 0.2s) · `marquee` (continuous — market ticker) · `staggerFadeIn` (0.4s — list items) · `checkPop` (0.3s cubic-bezier — answer checkmark) · `bounce-in-up` (0.4s — sticky bar appearance) · `analyzingRingSpin` (1s linear infinite — loading) · `analyzingDot` (1.2s, staggered — bouncing dots) · `revealScreenIn` (0.4s — analyzing screen) · `revealTextIn` (0.4s, staggered — text reveal) · `tabFadeIn` (0.3s — tab cross-fade) · `shineMove` (2s — shine effect) · `topCardGlow` (1.2s — winner emphasis) · `highlightFlash` · `celebrateEmoji` (0.6s cubic-bezier — quiz emoji pop) · `revealScreenIn`.

**Hover / active microinteractions:** `.card-hover` translateY(-2px) + shadow-md (200ms). `.cta-primary` scale(0.97) on active (80ms). Button icon nudge translateX(3px) on hover.

### 10.6 Iconography

- **Custom `Icon` component** (`components/Icon.tsx`) — 110+ icons in a hardcoded SVG-path registry. 24×24 viewBox, 2px stroke, `strokeLinecap: round`, `strokeLinejoin: round`. **Lucide-style line icons.** Server-safe (no React hooks). Fallback: help-circle on unknown name. Default `aria-hidden="true"` on decorative use.
- **Common icons:** `sprout · lightbulb · target · flame · coins · dollar-sign · calculator · star · shield-check · lock · building · search · users · briefcase · key · bitcoin · trophy · trending-up · trending-down · alert-triangle · heart · rocket · gift · award · smartphone · help-circle · layout-dashboard · user-check · user-plus · check · x · arrow-right · external-link · clock · map-pin`.
- **Brand mark:** "Invest.com.au" set in Inter 700/800 with `letter-spacing: -0.02em`. **No standalone wordmark file** (a Strategic Question; Q10).
- **Symbol:** Kangaroo SVG (`/public/favicon.svg`, `/public/kangaroo-icon.svg`).
- **OG badge:** 44×44 rounded-[10px] gradient (emerald `#15803d` → amber `#f59e0b`) with white `$` symbol (24px, 800). Used in `app/opengraph-image.tsx` (1200×630 social cards).
- **Favicon / PWA:** `favicon.ico`, `favicon.svg`, `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png` (maskable).
- **Illustration style:** 6 vertical-guide SVGs (`/public/images/guides/`) — flat + line + subtle gradient fills, 800×160 viewBox, 2–2.5px strokes, 3–4 hues per illustration, geometric primitives. **No photorealism, no isometric depth, no hand-drawn marks.**

### 10.7 Component inventory (173 files in `components/`)

**Primitives (`components/ui/`):** `Button` (primary/secondary/ghost/danger × sm/md/lg, with default/hover/active scale-97/loading/disabled states) · `Card` (4 variants) · `Badge` (gold/amber/green/blue/red/slate tints) · `Input` (default/focus/error/success/disabled states) · `Select` · `ProgressBar`.

**Layout (`components/layout/`):** `Navigation` (mega-menu, search overlay, mobile hamburger) · `TopBar` (info strip with broker count + compliance microcopy) · `SiteFooter` (multi-column footer + newsletter) · `AccountButton` (auth dropdown).

**Composite — broker / platform:** `BrokerCard` · `BrokerComparisonTable` (desktop horizontal-scroll table with sticky-left column) · `VerticalBrokerTable` (vertical card-stack, mobile + pillar pages) · `HomepageComparisonTable` (homepage snapshot — 5 brokers) · `BrokerLogo` · `DealCard` (homepage carousel).

**Composite — advisor:** `AdvisorDirectory` (hub listing) · `AdvisorCard` · `AdvisorCompareMatrix` · `AdvisorMatchCTA` · `AdvisorAppointmentsWidget` · `AdvisorReviewForm` · `AuthorByline` (**EXISTS but currently thin** — needs the credential-chips + photo treatment from Mockup 7) · `AdvisorPhotoUpload` (admin).

**Composite — lead capture / forms:** `HeroLeadCapture` · `LeadMagnet` · `ContextualLeadMagnet` · `PillarExitIntent` · `NewsletterExitIntentModal` (feature-flagged, default on) · `AskQuestionForm` · `ListingEnquiryForm` · `FormStepper` · `ABTestCTA`.

**Composite — trust / verification:** `SponsorBadge` (Featured Partner blue / Editor's Pick slate / Deal of Month amber; always renders disclosure label) · `FeeVerifiedPill` (3 variants — pill / inline / compact; colour-coded by freshness: green fresh <30d / amber recent 30–90d / grey stale >90d) · `VerifiedClientBadge` · `StarRating` (amber-only; only renders if `LICENCE_MODE !== "factual_only"`) · `DatedStatBadge` · `LeadScoreBadge` (admin) · `ComplianceFooter` (variants: default / cfd / crypto / property / firb / super / loan) · `RiskWarningInline` · `DisclosureBanner`.

**Composite — content / education:** `ArticleCover` · `ArticleSidebar` · `ArticleSearchInput` · `ArticleCategoryFilter` · `ArticleComments` · `ArticleBrokerTable` · `BookmarkButton`.

**Composite — calculator:** 24 calculators are currently bespoke — **no shared component pattern**. Mockup 10 proposes the unifying `CalculatorPattern`.

**Composite — vertical / pillar:** `VerticalPillarPage` (single template used by all 9 verticals — change the template, change every vertical) · `IntentPicker` (quiz-entry component).

**Mobile-specific:** `MobileStickyAdvisorCta` (bottom-bar CTA, `md:hidden`, fires after 420px scroll, dismissible, `pb-safe`) · `MobileFloatingCTA` · `BottomSheet`.

**Modal / dialog:** **bespoke** (no unified primitive — `NewsletterExitIntentModal`, `PillarExitIntent`, `AdvisorMatchCTA` modal, `ConfirmDialog`, `AdSlot` sticky-footer). Audit should propose unified `Modal` / `Dialog`.

**Toast / notification:** `Toast` — **split API** (imperative `useToast()` hook for admin; declarative `<Toast>` for user-facing). Audit should unify.

**Loading / empty / error:** `Skeletons` (4 variants — `ListingSkeleton`, `ComparisonTableSkeleton`, `AdvisorCardSkeleton`, `RouteLoadingSkeleton`). `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx` (branded but minimal).

**Cookie / PWA / push:** `CookieBanner` (granular preferences, `localStorage`-persisted) · `ServiceWorkerRegistrar` · `PushNotificationOptIn` (lazy-loaded in layout).

### 10.8 PWA (real, well-implemented)

`manifest.json` declares `display: standalone`, `theme_color: #0f172a`, `background_color: #ffffff`, maskable 192/512 icons, `scope: /`, `lang: en-AU`, `categories: [finance, business]`. Service workers (`/public/sw.js`, `/public/sw-push.js`) for offline + push. Push opt-in lazy-loaded. **Install-to-home-screen viable.** The audit can legitimately design app-like patterns (bottom nav, gesture-driven, full-screen flows) for mobile.

### 10.9 Accessibility (foundational, no automated CI)

Global `:focus-visible` ring (2px `blue-700`, 2px offset) · `prefers-reduced-motion` respected on every animation · ARIA labels on all icon-only buttons / dismiss / close · tap targets ≥ 44px (`min-h-11 min-w-11`) · iOS input-zoom fix (16px font on inputs ≤767px) · semantic HTML (h1/h2/h3 hierarchy, `<table>` not divs, `<nav>`, `<article>`).

**Gaps the audit can address:** no automated jest-axe / axe-core tests (Playwright a11y job exists but doesn't run axe); no skip-to-content link; star-rating needs aria-label review; image alt-text relies on contributor discipline.

### 10.10 Performance constraints

AVIF/WebP image generation · responsive srcsets (640–1920) · `loading="lazy"` on article images · `dynamic()` code-splitting (advisor portal tabs, calculators) · `next/font/local` `display: swap` · `optimizePackageImports` for Sentry/Supabase (~100KB savings) · Vercel Speed Insights · `<link rel="preconnect">` to Supabase storage. **Gaps:** no Lighthouse CI, no committed CWV budgets. **Implication:** any new heavy media (video heroes, 3D illustrations, complex SVG animations) must justify their LCP/CLS impact.

### 10.11 Known weaknesses the audit can address

1. **No design-token export.** Tokens live across `globals.css`, Tailwind `@theme`, and inline classes. Audit should produce `DESIGN_TOKENS.md` as a side-deliverable.
2. **Spacing inconsistency.** `p-3` / `p-4` / `p-6` mixed without rule.
3. **No unified Modal / Dialog primitive.** Bespoke per modal — different z-indexes, different backdrops.
4. **Verified-advisor badge missing.** Database has `verified` boolean; UI has no visual badge differentiating verified from pending. Compliance moat invisible.
5. **`AuthorByline` exists but thin.** Articles render author name as plain text. Needs the credential-chips + photo + LinkedIn treatment from Mockup 7.
6. **Methodology / About contradiction.** *"weighted ratings"* (about) vs *"factual data, no ratings"* (methodology). **Single biggest brand-positioning fork — see §11.**
7. **Branded error / 404 / empty states absent.** Generic browser defaults.
8. **No standalone wordmark file.** Inter extrabold + kangaroo + `$` gradient badge. Strategic Question 10.
9. **Comparison-table mobile UX.** Horizontal scroll, no swipe affordance. Mockup 1's main fix target.
10. **Toast system split.** Imperative + declarative APIs for the same primitive.
11. **No shared `EmptyState` component.** Ad-hoc per surface.
12. **No `CalculatorPattern`.** 24 bespoke calculators.

The audit should propose 5 missing component patterns: `Modal/Dialog` · `EmptyState` · `CalculatorPattern` · `VerifiedAdvisorBadge` · `MethodologyCard`. Plus the `AuthorByline` upgrade.

---

# 11. Brand voice audit — and the single biggest brand-positioning fork

A direct copy audit of trust pages, hero variants, pillar pages, the foreign-investment hub, and the compliance library found one consistency issue that **must be resolved before launch** because it directly contradicts itself in user-visible copy.

### The "Best X" vs "factual data, no rankings" contradiction (CRITICAL)

| Surface | What it says |
|---|---|
| `/methodology` | *"Invest.com.au is a factual comparison and directory service. We do not rate, rank, or recommend any platform."* |
| `/about` | *"Our ratings are data-driven."* (with "weighted ratings" implied — 30% fees, etc.) |
| Pillar page H1s | *"Best Share Trading Platforms in Australia"*, *"Best Cryptocurrency Exchanges in Australia"*, *"Best Super Funds in Australia"* |
| Homepage hero Variant C | *"The best Australian brokers, ranked by what you save"* |
| Homepage hero Variant B | *"Find your broker in 60 seconds. We'll match you to the cheapest Australian broker for your trading style."* |

These cannot all be true. The codebase exposes a feature flag — `NEXT_PUBLIC_LICENCE_MODE` (values: `factual_only` | `general_advice`) — that gates ranking and "match" language (`SHOW_RATINGS = LICENCE_MODE !== "factual_only"`, `SHOW_MATCH_LANGUAGE = LICENCE_MODE !== "factual_only"`). **In `factual_only` mode (the launch posture, since we don't hold an AFSL), Variants B and C and the "Best X" H1s are non-compliant.** In `general_advice` mode (post-AFSL), they're allowed.

The audit must take a position. There are three coherent options:

| Option | Stance | Implications |
|---|---|---|
| **A — "Compare X" not "Best X"** | Stay strictly factual. Rename pillar H1s from *"Best Super Funds"* → *"Compare Super Funds"*. Drop hero Variants B and C. Resolve the About page to remove "ratings" framing. **Lean into the moat: "factual data, you decide".** | Honest. Differentiates us *against* Finder ("we don't rank — they do, with conflicts"). Visually more austere. Aligns with MoneySmart implicit standard. |
| **B — "Best X" with disclosed methodology** | Embrace ratings. Use star ratings, "Best for beginners" badges. Rewrite methodology to acknowledge ratings as *transparent multi-attribute scoring* (not personal advice). Requires AFSL eventually. | Sharper marketing. Aligns with Variant C ("ranked by what you save"). But requires LICENCE_MODE = `general_advice`, which without an AFSL is a regulatory grey zone. |
| **C — Split brain: factual hub + opinionated content** | Comparison tables stay strictly factual ("Compare X"). Editorial articles ("Our pick: 5 best brokers for SMSFs in 2026") use opinion under the General Information carve-out. Two voices, separated explicitly. | Workable but complex. Users have to learn the difference between table-mode and article-mode. Most fragile. |

**My recommendation as founder:** Option A (factual-only) for launch — it's the safer and more differentiated position, and the moat is clearer. Post-AFSL we can revisit. The audit can propose differently but **must take a position; the design cannot ship with both stances active.**

### Voice pattern findings

**Strongest voice on the site: the foreign-investment hub.** The hero copy ("Investing in Australia from Overseas"), persona selector ("I want to buy Australian shares →" / "I'm leaving Australia — super & tax help →"), DTA search table, and FAQ ("Yes. Non-residents can invest in Australian shares, crypto, savings accounts, and some property — but specific rules, taxes, and eligibility restrictions apply…") feel **specific, user-first, and confident**. **Use this as the template for re-voicing the rest of the site.**

**Strong specific surfaces:**
- **Privacy policy** — technical, transparent, thorough. Trustworthy without being cold.
- **Complaints page** — proactive. "We are committed to transparency and fair treatment." Clear 3-step process. AFCA contact details. 48-hour corrections SLA. *This page should be the template for trust pages.*
- **Editorial policy procedures** ("Fee data sourced directly from broker pricing pages. 4-step verification process… 48-hour SLA for fix-it cycles").
- **Use of specific numbers** — "62–81% of CFD accounts lose money", "30% withholding tax", "60-second quiz". Specificity builds credibility.

**Weak / fragile patterns:**
- **Negation overload.** "We do not hold an AFSL", "do not provide financial advice", "do not assess suitability", "do not recommend", "do not rank" — appears 40+ times across trust pages. *FSG opens with five consecutive negations.* This trains users to distrust ("Why are they denying so much?").
- **Compliance fatigue.** `GENERAL_ADVICE_WARNING` (81 words) repeated 10+ times across the site. `SPONSORED_DISCLOSURE` (16 words) repeated 20+ times. Users tune out — the opposite of intent. **Recommended fix: a single `/compliance-hub` page with all warnings, then a tight inline disclosure that links to it. Like Stripe's policy page architecture.**
- **Affiliate revenue framed three different ways.** *"We earn affiliate commissions"* (about), *"Advertising and referral fees may be received"* (how-we-earn), *"Our revenue comes from advertising"* (FSG). Same fact, three emotional registers. **Standardise.**
- **Three hero variants = three different brand positions.** Variant A is institutional / Vanguard-adjacent. Variant B is fintech-startup / Finder-adjacent. Variant C is value-led / NerdWallet-adjacent. Worth A/B testing variants but the launch design must commit to a primary brand voice; otherwise users encounter a different brand depending on which variant they hit.
- **CTA copy generic.** ~80% of CTAs are procedural ("Browse", "View All", "Compare Platforms"). The strongest CTAs ("See how much you'd save", "Take the 60-second quiz", "I want to buy Australian shares →") are first-person / value-driven. Lift the average.

### Brand spectrum placement

| Axis | Current placement | Where we should be |
|---|---|---|
| Wise/Stripe ↔ Finder/NerdWallet | Mid-right (lean Finder); retreats to Stripe-adjacent in compliance pages | Mid-left (lean Stripe). Calm authority. |
| Vanguard ↔ Up neobank | Midpoint, leaning Vanguard | Lean Vanguard. Confident, restrained, factual. |
| Confident ↔ Defensive | **Defensive** (40+ negations) | Confident (positive framings, single compliance hub). |
| Specific ↔ Generic | Specific where useful (DTA rates, fee freshness, percentages); generic in CTAs | Specific everywhere. |

**One-sentence brand voice direction:** *Calm, specific, confident — the way Wise writes about FX rates, Vanguard writes about funds, and IG writes about risk. Australian, but not larrikin. Regulatory-careful, but not panicked.*

---

# 12. The `LICENCE_MODE` feature flag — the constraint behind every mockup

The codebase has a feature flag `NEXT_PUBLIC_LICENCE_MODE` with two values:

- **`factual_only`** (current launch posture) — disables ranking language, "we recommend", "match you to", and any subjective qualifier. Pillar pages, hero, comparison tables, CTAs all suppress ranking copy. Compliant with s766B(6)/(7) carve-outs without an AFSL.
- **`general_advice`** (post-AFSL, late 2026 / 2027) — enables star ratings, "Best X" framing, "we'll match you", weighted-attribute scoring. Compliant under General Advice authorisation.

**Every mockup the audit produces must function in both modes.** A "Best Super Funds" headline that's central to a hero must have a `factual_only` fallback ("Compare Super Funds"). A "We'll match you" CTA must have a `factual_only` fallback ("Take the comparison quiz"). Star ratings must have a `factual_only` fallback (sortable factual columns only).

This is annoying but unavoidable. The audit should design **components that gracefully degrade** between the two modes, not two parallel designs. The verified-advisor badge, the fee-freshness pill, the compliance footer — all already do this; the rest of the design should follow.

---

# 13. Trust architecture moat — visible and invisible

### What's strong (architecturally) but invisible (visually)

| Asset | In code | Surfaced in UI? | Design opportunity |
|---|---|---|---|
| `lib/compliance.ts` (430-line single source of truth) | ✅ | Disclaimers as fine print | Make compliance copy a *component* (with tooltip / expandable methodology) rather than dense paragraphs |
| Per-broker `last_verified_at` | ✅ | Renders in `FeeVerifiedPill` (green/amber/grey) | **Strong** — extend pattern to advisor profiles ("Verified against ASIC register on…") and articles ("Last reviewed by [author] on…") |
| `financial_audit_log` (every money movement) | ✅ | Not surfaced | Could feed a "we audit ourselves" footer line: *"Every transaction logged. Audit trail available on request."* |
| `verified` boolean on professionals | ✅ | **No badge** — claim "verified against ASIC register" appears in copy without visual proof | Build the `VerifiedAdvisorBadge` component (see §18 mockup 4 / 7) |
| Author credentials on team_members table (CFA, CFP, RG146 chips) | ✅ | Not on article pages | Build the `AuthorByline` component (see §18 mockup 7) |
| `editorial_policy.md`, `methodology.md`, `complaints` flow with 48h SLA | ✅ | Standalone pages | Surface in-context via a `MethodologyCard` component (see §18 mockup 7) |
| AFSL non-status as a *positive* moat | ✅ (in compliance copy) | Currently framed defensively ("we do not hold") | Reframe positively: *"No AFSL means no conflict-of-interest pressure to recommend particular products. We surface factual data; you decide."* |
| Domain held in Duns family since 1996 (Dad → Fin) | ✅ (in COMPANY.md) | Not surfaced anywhere | Subtle *"Held in our family since 1996. Relaunched in 2026."* footer + about-page timeline (1996 → 2026 → 2028+) |
| 19-agent system + 5-tier human escalation | ✅ (in `.claude/agents/`) | Not surfaced | "System health" widget — see §18 mockup 9 |

### The pattern to design (one component, used everywhere)

A reusable **`MethodologyCard`** that can be embedded above any comparison table, advisor card, or article — saying:

*Fees sourced from broker disclosure, last verified < date >. No algorithmic ranking; user-controlled sort. Sponsorships clearly labelled. [How we work →]*

Under 50 words, slate-600, embeddable. This is the pattern that makes compliance *legible as a feature*. It is the most leveraged win in the brief.

---

# 14. The 19-agent system as a brand asset

The platform is operated by a **19-agent autonomous system** under one human (Fin), with a 5-tier human-approval gate. This is unique in AU fintech and **could be a visible brand asset** rather than an internal-ops detail.

### The 19 agents (one-line summary each)

`#01 Operations` · `#02 Engineering / DevOps` · `#03 CMO / Brand` · `#04 Editorial` (writes Tier 1 pillar articles under named author byline; Tier 2 under "invest.com.au Research Team") · `#05 SMB Sales` · `#06 BD / Enterprise` · `#07 Revenue` (lead routing, reconciliation) · `#08 Compliance` (continuous ASIC scan) · `#09 CI / Improvement` (A/B test design) · `#10 Analytics` (daily `platform_snapshots`) · `#11 Email / Lifecycle` · `#12 Customer Support` · `#13 Partnerships` · `#14 Growth` · `#15 Revenue Optimisation` (dynamic pricing, opportunities) · `#16 Legal` · `#17 Finance` · `#18 Product Layer` (post-AFSL co-branded products) · `#19 People / Hiring`.

### The 5 escalation tiers (this matters for design constraints)

| Tier | Trigger | Auto-proceed? | Founder approval? | Examples |
|---|---|---|---|---|
| **T1 (auto)** | Routine | Yes, instant | No | Content drafts filed, security scans logged, lead routing |
| **T2 (notify + proceed)** | Significant decision, <$500 | Yes, after 4h if unrejected | No | Broker onboarding, deployments, A/B test launches, pricing drift <10% |
| **T3 (approval gate)** | Money >$500, legal, ASIC, compliance copy, hiring, partnerships, pricing >25% | No | **YES — Fin mandatory** | Refunds, vendor contracts, AFSL comms, new editorial standards, compliance copy changes |
| **T4 (urgent wake-up)** | Production down, security breach, payment >$1k, legal enforcement | No — immediate escalation | **YES — phone push** | Cron silence, auth outage, Stripe suspended, ASIC enforcement |
| **T5 (co-founder route)** | Enterprise deals >$50k/yr, ASIC-adjacent, co-branded product launches | No — escalates to Co-Founder | **YES — joint Fin + Co-Founder** | Enterprise BD, post-AFSL product activation |

**Design implications.** Some surfaces cannot ship autonomously. Compliance copy changes are T3 (founder approval). Sponsor placement design changes are T3 (could affect pricing). Refund UX is T3 (each refund is a founder approval). The audit's mockups land as T1/T2 (UI / content); design changes *of* compliance components are also T1/T2.

### Why this is a brand asset (and how to surface it)

No competitor in AU fintech operates like this. Finder has hundreds of staff. Canstar has dozens. invest.com.au runs at 85 commits/week with one founder + 19 agents — and (importantly) **with discipline**: no production incidents, K-stream security complete, audit-remediation queue running daily, methodology rigour.

**Possible design surfaces** (audit can position):
- **System Health Widget** — a small footer-corner or about-page module showing "19 agents · 0 compliance flags · Last data refresh: 2h ago · Audit queue: 12 open items". Updated live. Like Stripe's status page but for editorial / compliance / data freshness. **Nobody else in AU fintech does this.**
- **Provenance badges** on articles and tables — "Reviewed by [author], cross-checked by Agent #08 Compliance." Honest about how the work gets done.
- **About-page timeline** — 1996 (domain registered by Dad; Investment Quotient runs a basic site on it for 30 years) → 2026 (Fin inherits the domain; relaunches as enterprise-grade comparison platform on Vercel; domain cutover when build is ready) → 2028+ (co-branded products post-AFSL) — signals long horizon + considered cadence + honest inheritance story.

This is the kind of move a designer either embraces or rejects. **The audit should take a clear position.**

---

# 15. International positioning — depth + the Year 2+ "city stays" play

The international thesis is the most defensible long-term differentiator. The current implementation is solid in the foreign-investment hub but invisible elsewhere.

### What's in code today

- **3 fully-translated locales** — en-AU, zh-CN, ko-KR. Translations live in `lib/i18n/dictionaries.ts`. The choice was deliberate: *"The cost of a poorly translated page is higher than the cost of not translating it."*
- **Country-specific pages** under `/foreign-investment/[country]/` for Singapore, Hong Kong, China, South Korea, Japan, UAE/Dubai, US, UK, India, Indonesia, Malaysia, NZ (~12 countries).
- **Foreign-investment hub** (`/foreign-investment`) with hero, persona selector ("I want to buy Australian shares →" / "I want to buy property →" / "I'm leaving Australia — super & tax help →" / "Find your situation →"), DTA rates table searchable by country, FAQ, calculator strip.
- **Calculators** — `firb-fee-estimator`, `non-resident-cgt-checker`, `non-resident-dividend-calculator`, DASP withholding calculator.
- **Specialist advisor routes** — `/advisors/firb-specialists`, `/advisors/international-tax-specialists`, `/advisors/migration-agents`.
- **Comparison filter** — `/compare/non-residents` filters platforms accepting international clients. Advisor directory has an "International only" toggle.
- **Schema** — `accepts_international_clients`, `firb_specialist`, `international_tax_specialist`, `languages_spoken[]` columns on `professionals`. Design can show 🇨🇳 🇰🇷 🇸🇬 flag chips on advisor cards.
- **Regulatory content** — FIRB rules, 2025–27 established-dwelling ban for non-residents, SIV ($5M complying-investment migration pathway), DTA treaty reductions of withholding tax from 30% to typically 15%, "40 days/year physical presence in Australia" SIV rule (attractive to Asia-based investors), DASP for departing-AU super, non-resident CGT at full rate (no 50% discount), withholding tax on dividends and interest.

### What's *not* in code (Year 2+ play)

- **Immersive city stays** — Fin spends 2–4 weeks per year in Singapore / Dubai / Hong Kong building partner relationships. Currently in COMPANY.md only. *Can become a credible BD asset by 2027 if seeded in design now.*
- **Currency selector** — site is AUD-only. SG / HK / Dubai investors are AUD-pricing-aware but a currency-aware breakdown (Wise-style) would strengthen the international hub.
- **Live FX rate widget** — current pages cite static DTA rates; live mid-market rates (like Wise) would lift trust in the regulator-cited copy.
- **Singapore-style MAS-equivalent badge** — ASIC badges are not as visible in our UI as MAS badges are on StashAway / Saxo. This is a gap (and a moat opportunity).

### Design implications
- The international hub deserves bespoke treatment — not the generic `VerticalPillarPage` template (see §18 mockup 6).
- The persona selector is a strong UX pattern that could extend elsewhere (homepage "what kind of investor are you?" entry).
- The DTA table is unique data — show it off, don't bury it.
- A "Where we'll be next" module (Year 2+) — empty at launch, populated with travel dates by 2027 — is a relationship-building artefact for BD pitches.

---

# 16. Performance, accessibility, PWA — the technical envelope

Constraints the audit must respect.

### Performance (architecture strong, instrumentation thin)
- AVIF / WebP image generation, responsive srcsets (640–1920px), `loading="lazy"` on article images, `next/image` everywhere.
- `display: swap` on Inter font (no FOUT). 5 self-hosted weights (no Google Fonts CDN dependency).
- Code-splitting via `dynamic()` on heavy components (advisor portal tabs, calculators).
- `optimizePackageImports` for Sentry / Supabase (~100KB savings).
- Vercel Speed Insights + Web Vitals component (RUM), Sentry for errors.
- `<link rel="preconnect">` to Supabase storage host.
- Cache headers: fonts 1y immutable; logos 30d + 7d stale-while-revalidate; images 1d + 7d SWR.
- **Gaps:** no Lighthouse CI, no committed CWV budgets, no per-PR perf regression checks. Risk of regression as design adds richness.

### Accessibility (foundational, no automated CI)
- Global `:focus-visible` ring (2px blue-700, 2px offset).
- `prefers-reduced-motion` respected on all 30+ animations.
- ARIA labels on icon buttons / dismiss / close.
- Tap targets ≥ 44px (`min-h-11 min-w-11` utility).
- iOS input-zoom fix (16px font-size on inputs ≤767px).
- **Gaps:** no jest-axe / axe-core tests; Playwright a11y job is configured but doesn't run axe; no skip-to-content link; star-rating component uses emoji stars (potential screen-reader noise — needs check); image alt-text relies on contributor discipline.

### PWA (real, well-implemented)
- `manifest.json` with `display: standalone`, `theme_color: #0f172a`, `background_color: #ffffff`, maskable icons (192px, 512px), `scope: /`, `lang: en-AU`, `categories: [finance, business]`.
- Service workers (`/public/sw.js`, `/public/sw-push.js`) for offline + push notifications.
- Push notification opt-in (component lazy-loaded in layout).
- **Install-to-home-screen viable.** This is a real PWA, not a tagged-on manifest. Implications: the audit could legitimately design app-like patterns (bottom nav, gesture-driven, full-screen flows) for the mobile experience.

### Mobile-first reality
- Breakpoints: sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536.
- 8+ mobile-only components (`MobileStickyAdvisorCta`, mobile-nav drawer, snap-x-proximity carousel, bottom-sheet ad slot, sticky compare bar, etc.).
- The single weakest mobile surface: **comparison-table horizontal scroll** with no swipe affordance / scroll indicator. Fixing this is a top mockup priority.

### What design must respect
- **Tailwind v4 PostCSS / @theme block.** No CSS-in-JS.
- **`prefers-reduced-motion`.** All animation must respect it.
- **44px tap targets.** No exceptions on mobile.
- **iOS safe-area** (`pb-safe`) on bottom-fixed elements.
- **Light + dark mode** on every component.
- **`LICENCE_MODE` flag.** Every mockup degrades gracefully (see §12).

---

# 17. Design decisions already made (don't re-litigate)

These are deliberate. The audit should accept them as constraints and focus energy elsewhere.

1. **Amber-500 `#f59e0b` is the brand accent**, not green or blue or red. Differentiates from Finder (orange — close enough but a different hue), Canstar (gold/blue), RateCity (teal), neobank green. Amber reads "attention" without "warning".
2. **Inter, not a custom typeface.** Performance, multilingual support (Mandarin / Korean glyphs render via fallbacks), licence cost.
3. **No AFSL at launch** (s766B factual carve-out). Design must support "factual comparison + advisor directory", not "we recommend".
4. **Sponsored placements always labelled** with a coloured badge + disclosure text. Non-negotiable. Audit must not propose treatments where sponsored = visually identical to organic.
5. **User-controlled sort** in comparison tables (rating / fee / etc.), not algorithmic "Top Pick" gimmickry.
6. **Three locales only** (en-AU, zh-CN, ko-KR), not twelve. Translation quality > coverage. Country pages exist in English with localised regulatory content; ZH / KO are full translations of the international hub only.
7. **Mobile-first, but desktop is the conversion surface.** Australian financial decisions skew desktop research → mobile completion. Comparison tables are designed desktop-first; mobile gets a redesigned card stack, not a shrunk table.
8. **Compliance disclaimers via single-source helpers**, never inline. `ComplianceFooter`, `RiskWarningInline`, `DisclosureBanner` consume `lib/compliance.ts`. Audit treats compliance copy as a component to lay out, not free text to write. *Reduce repetition by introducing a `/compliance-hub` page + tight inline tooltip-or-link pattern.*
9. **No Awards / Star-of-the-Year theatre.** Canstar's territory.
10. **Founder + father + Friend's Dad authorship chain is real** and should be visible. We are not anonymous comparison content.
11. **Domain has been in the Duns family since 1996** (Dad held it, ran a basic site on it; transferring to Fin for the relaunch). Frame as inheritance / relaunch — not "continuously operating since 1996". Domain cutover happens when the new build meets enterprise quality (the launch event).
12. **PWA is real** — the design can lean into install-to-home-screen patterns on mobile.
13. **The 19-agent system is real** — design can surface or not, but does not need to hide.

---

# 18. The 10 priority mockups (this is the actual ask)

Each mockup has: **surface · business case · current state · what to design · state variants needed**. Ordered by expected revenue / strategic impact.

---

## Mockup 1 — The comparison row (the one component that earns 40%+ of revenue)

- **Surface.** A single broker / platform / super-fund / advisor *row* and *card* in the comparison table (`/compare`, vertical pillar pages, `/best/[category]`, `/versus` head-to-head).
- **Business case.** Every affiliate click flows through this component. A 5% lift in CTR is meaningful revenue. This is also where Moats 3 (compliance) and 4 (data) become visible.
- **Current state.** Functional 5-column desktop table; mobile is a card stack with horizontal scroll and no swipe affordance. Sponsor badges, fee-verified pills, star ratings, and CTAs all coexist but lack hierarchy.
- **What to design.**
  - **Desktop row.** Logo + name, 2–3 numeric columns (fees), 2–3 feature flags (CHESS, SMSF, US shares), star rating + review count *(only in `general_advice` mode; sortable factual fields in `factual_only` mode)*, **fee-freshness pill** (green/amber/grey), **sponsor badge** (visibly distinct, never erodes trust), shortlist secondary action, primary CTA (amber).
  - **Mobile card.** Redesigned card with **swipe-to-reveal-metrics** or scroll-snap chip carousel. Persistent CTA. Sponsor badge top-right corner.
  - **Trust microcopy.** "Fees verified 5 days ago · sourced from broker disclosure" as a tooltip on the freshness pill. Inline `MethodologyCard` link.
- **State variants needed:**
  - Organic / Featured Partner / Editor's Pick / Deal of the Month
  - `factual_only` vs `general_advice` (rating display gating)
  - Has-active-deal vs no deal
  - Verified-fee vs stale-fee (>90 days)
  - Affiliate-CTA vs informational-CTA (depending on partner status)
  - Light + dark mode
- **Constraint.** Must work for the 4 row types — broker, super fund, advisor, property listing. They share 80% of layout but differ in primary metric (fees vs admin fee vs hourly rate vs yield).

---

## Mockup 2 — Vertical pillar page hero + comparison block (Share Trading + Super)

- **Surface.** `/share-trading` and `/super` — the highest-traffic SEO landing pages.
- **Business case.** First impression for organic search traffic. Must convey breadth (Moat 1), data freshness (Moat 4), and compliance posture (Moat 3) above the fold without becoming a wall.
- **Current state.** Templated `VerticalPillarPage` component renders hero → top pick → deals → comparison table → articles → advisors → expert articles → FAQ → compliance footer. Hero is text-heavy and undifferentiated by vertical.
- **What to design.**
  - **Hero.** Vertical-specific headline (in `factual_only` mode: "Compare 27 share-trading platforms in Australia"; in `general_advice` mode: "Best share-trading platforms in Australia"). 3-stat strip ("27 platforms compared · fees verified this week · 4.6★ avg user review"). One primary CTA ("Compare 27 platforms") + one secondary ("Take the 60-second quiz"). Calm, authoritative, not loud.
  - **Vertical colour signature.** Each vertical has a colour in `lib/verticals.ts` (Share Trading amber, Crypto orange, Super emerald, etc.). Use as a tasteful accent, not a flood.
  - **Compliance treatment.** Show how the ASIC general-advice warning sits *visibly* without dominating — slate-600 microtype, indented, with a "Why we say this" expandable that links to methodology. Compliance becomes a feature, not a footer.
  - **Foreign-investor callout.** Small contextual banner ("Visa holder or non-resident? See FIRB / DASP rules →") because cross-vertical international users are 3–5× per-click value.
  - **`MethodologyCard`** above the comparison table: "Fees sourced from broker disclosure, last verified < date >. No algorithmic ranking. [How we work →]"
- **State variants needed:** `factual_only` vs `general_advice`, light + dark, mobile + desktop, with-deal vs no-deal hero.

---

## Mockup 3 — Quiz results screen

- **Surface.** End of `/quiz` (10-step matcher → top-3 broker recommendation).
- **Business case.** Quiz completers convert to broker accounts at ~12–18% (vs 2–4% on cold comparison). This is the highest-intent surface on the site. Currently designed as a list, not a product.
- **Current state.** Three result cards stacked. Sponsor influence permitted but A/B-tested + disclosed. Animations exist (`resultCardIn` staggered 0.12s–0.6s, `confettiBurst`, `topCardGlow`, `winnerPulse`).
- **What to design.**
  - **Top-3 result layout.** Clear ranking badges (1, 2, 3) with reason ("Best for low-fee ASX trading", "Best for US shares", "Best free-brokerage starter") *(in `general_advice` mode; in `factual_only` mode: "Matches: $0 ASX brokerage · CHESS · SMSF" — feature-list framing)*. Each result echoes back the user's quiz answers ("You said: < $5k portfolio, ASX-only, monthly trades — this matches…") to reinforce that the recommendation is data-driven.
  - **"Why this?" expandable** per result, citing the 2–3 features that matched, plus a direct link to the broker's data row.
  - **Sponsor disclosure.** If sponsorship influenced ranking, an inline "Includes a paid placement boost — see methodology" line that doesn't undermine trust.
  - **Save / email-me-the-results CTA** — captures email even if the user doesn't click out (lead magnet for newsletter monetisation).
  - **Tasteful celebration.** The `confettiBurst` animation exists and is good for the moment of result reveal but should not feel gamified.
- **State variants needed:** `factual_only` vs `general_advice`, with-sponsor-influence vs none, fewer-than-3-matches edge case, light + dark, mobile + desktop.

---

## Mockup 4 — Advisor profile + "Get matched" flow

- **Surface.** `/advisor/[slug]` profile page + the "Get matched" modal that captures the lead.
- **Business case.** Advisor leads are $39+ each (with dynamic-pricing uplift to ~$60 for SMSF / property / international specialists). Form drop-off is the single biggest lead-revenue lever. This is also where Moat 3 trust architecture becomes most concrete — "verified" must be **visible**.
- **Current state.** Profile shows name, firm, location, rating, AFSL/registration numbers as plain text. **No verification badge.** Match modal exists, no consolidated treatment.
- **What to design.**
  - **Profile header.** Photo, name, firm, **prominent verified-advisor badge** (clickable → "How we verify" overlay citing ASIC Financial Adviser Register / TPB / ABN registry / verification date). Specialty tags. Location. Rating + review count *(in `general_advice` mode; in `factual_only` mode: review count + specialty list only)*. "Get matched" primary CTA. **Author / advisor credentials list** (AFSL #, RG146, FPA member, CFP, CFA, etc. — these are trust currency). **Languages-spoken flag chips** 🇦🇺 🇨🇳 🇰🇷 (data exists in schema). **International-client / FIRB / migration-agent badges** if applicable.
  - **Match flow.** 2-step modal. Step 1 = email + first name + 2 qualifying questions (vertical of interest, asset range). Step 2 = "We'll send you 2–3 advisor matches by tomorrow." Show **how** we match (lightweight transparency), not just a black-box "Submit". Every extra field above 4 = 5–10% drop-off.
  - **Mobile.** Sticky bottom-bar CTA always visible (existing `MobileStickyAdvisorCta` pattern is good — refine the visual).
- **State variants needed:** Verified vs pending advisor, with-photo vs no-photo (avatar fallback), with-international-flags vs domestic-only, modal step-1 / step-2 / submitted, light + dark, mobile + desktop.

---

## Mockup 5 — `/advertise/packages` self-serve sponsorship marketplace

- **Surface.** B2B-facing landing + checkout for the $300 / $500 / $2,000/mo sponsorship tiers.
- **Business case.** Featured Partner at $2,000/mo is **annual recurring revenue with $24k ACV per sponsor**. Self-serve marketplace removes a sales bottleneck. Page must look like a regulated B2B SaaS (Stripe-tier), not a comparison page.
- **Current state.** Functional Stripe checkout exists; presentation is undifferentiated from the rest of the site.
- **What to design.**
  - **Tier cards.** Three tiers side-by-side, with **surface placement preview** ("Featured Partner: top of `/share-trading`, badge on every comparison row, homepage deal slot"), included impressions, audience size ("~80k mo unique investors, ~45% mobile, 18% non-resident"), **case-study quote slot** (post-launch).
  - **Trust strip.** "100+ platforms already featured", "Audited monthly impression reports", "ASIC-aware sponsorship boundary: you cannot buy a higher rating".
  - **Annual discount UX.** 1/3/6/12-month toggle with "save 30%" highlight; sticky-revenue win.
  - **CTA hierarchy.** "Start with Featured Partner" (primary) vs "Talk to BD for enterprise" (secondary, captures the $50k+ deals routed to Agent #06 BD or Co-Founder).
  - **Compliance-aware copy.** Position the sponsorship boundary positively: "We sell visibility, not editorial influence. Sponsored placements are clearly badged. Rankings stay user-controlled." This is the difference vs Finder.
- **State variants needed:** 1mo / 3mo / 6mo / 12mo pricing toggle, hover / selected state on tier cards, mobile + desktop.

---

## Mockup 6 — International / non-resident hub homepage

- **Surface.** `/foreign-investment` — currently a vertical pillar page, deserves bespoke treatment as the international moat surface. Plus its `/zh/foreign-investment` and `/ko/foreign-investment` localised siblings.
- **Business case.** Non-resident leads are 3–5× more valuable than retail Australian leads (FIRB property, SIV migration, international tax advisors). This is also the page that makes the Year 2+ "immersive city stays" BD pitch credible.
- **Current state.** Templated pillar page in EN, fully translated to ZH and KO. Persona selector exists ("I want to buy Australian shares →" / "I want to buy property →" / "I'm leaving Australia — super & tax help →") — currently the strongest UX pattern on the site. DTA rates table searchable by country. Calculators (FIRB fee, non-resident CGT, DASP, dividend WHT) exist as separate routes. Doesn't currently *feel* like a flagship.
- **What to design.**
  - **Hero in three locales.** Show EN, ZH, KO side-by-side as design exploration. **Locale switcher prominent**, not buried in footer.
  - **"What kind of investor are you?" entry** — the persona selector is the strongest UX pattern in the codebase. Polish it. Each persona routes to a curated path (relevant calculators + advisor specialists + relevant verticals).
  - **DTA rates table.** Searchable by country of residence. **Show off** — this is unique data. Live mid-market rates (Wise-style) would lift trust further (later enhancement).
  - **SIV pathway explainer.** Visual timeline (provisional visa → 4 years → permanent), $5M complying-investment minimum, "40 days/year physical presence" rule callout.
  - **2025–27 established-dwelling ban callout.** Non-residents can't buy existing homes; the page must lead on this — the single most-asked-about regulation.
  - **Future-proofing for "city stays".** A small "Where we'll be next" module — invisible if empty at launch, becomes a relationship-building artefact when populated by 2027 (e.g., "Singapore Q3 2027 · Dubai Q1 2028 · Hong Kong Q2 2028").
  - **Currency awareness.** Optional currency display toggle (AUD ↔ SGD ↔ HKD ↔ AED) — Wise / Saxo pattern, lifts trust for SG/HK/Dubai readers.
  - **Voice template.** This is currently the best-written page on the site. **Apply this voice to the rest.**
- **State variants needed:** EN / ZH / KO, persona-selector states (initial / hover / selected), DTA-table empty / filtered, mobile + desktop, light + dark.

---

## Mockup 7 — The trust-architecture pattern (verified-advisor + author-credential + methodology-card)

- **Surface.** A *pattern*, not a single page. Applies to every advisor card, every advisor profile, every article byline, every comparison-table header. Three components: `VerifiedAdvisorBadge`, `AuthorByline`, `MethodologyCard`.
- **Business case.** **The single highest-leverage compliance-moat win.** The architecture is already there (ABN/ACN/AFSL-status disclosed in `lib/compliance.ts`, advisor `verified` boolean in DB, team-member credentials in admin, per-broker `last_verified_at` timestamps). It's invisible to users today. Making it visible turns "we don't have an AFSL" from a defensive footer into a positive trust claim.
- **Current state.** Compliance footer renders disclaimers. No verified badge. No author-credential display on articles. Methodology page contradicts About page (see §11).
- **What to design.**
  - **`VerifiedAdvisorBadge`.** Small, scannable, blue or emerald; click expands to "Identity verified against ASIC Financial Adviser Register / TPB / ABN registry on [date]. See methodology." Component must support today's manual verification and tomorrow's live ASIC API integration without redesign.
  - **`AuthorByline`.** Photo, name, **credential chips (CFA · CFP · RG146 · ASIC #)**, "10 years in private wealth · ex-Macquarie", linked to author bio page. Used on every article. Make Friend's Dad legible.
  - **`MethodologyCard`.** Reusable component embeddable above any comparison table or advisor card: "Fees sourced from broker disclosure, last verified < date >, no algorithmic ranking, sponsorship clearly labelled. [How we work →]". Under 50 words.
  - **"How we earn" inline disclosure.** Wherever a CTA is affiliate-tracked, a hover-tip "We may earn a referral fee — see how we earn" links to `/how-we-earn`. Light, non-intrusive, omnipresent.
  - **Resolve the methodology contradiction** (see §11 — pick Option A, B, or C). My recommendation: Option A — drop "Best", embrace "factual data, you decide".
- **State variants needed:** Verified / pending / unverified advisor, full-credentials / minimal-credentials byline (some articles have a single author with only one cert), with-methodology-card / without (some surfaces don't need it).

---

## Mockup 8 — Homepage (the front door)

- **Surface.** `/` (English; ZH and KO have their own foreign-investment-led homepages).
- **Business case.** The homepage right now is *generic* — A/B-tested hero, comparison strip, deals, articles, advisor promo. Doesn't tell the strategic story (Moats 1–4) and doesn't differentiate visually from Finder. **The homepage is also the first asset acquirers will land on.**
- **Current state.** A/B-tested hero (3 variants — see §11), top-6 broker strip, comparison-table snapshot, deals, articles, advisor promo, sector reports, mobile sticky CTA, compliance footer. Three variants tell three different brand stories.
- **What to design.**
  - **Hero.** One strong headline that signals comprehensiveness + international + regulated + heritage. Working draft: *"The Australian investing platform — for residents, expats, and the world's investors looking at Australia."* (Audit can disagree; the brief is to convey four things at once: AU-strong, internationally aware, regulator-clear, durable.) One primary CTA (compare) + one secondary (browse advisors or take the quiz).
  - **Three-pillar value strip.** Moats 1, 2, 3 made concrete — *"100+ platforms across 9 verticals" / "12 country pathways including FIRB & SIV" / "Factual data, no AFSL conflicts, methodology in plain English"*.
  - **Heritage quiet line.** *"Held in our family since 1996. Relaunched in 2026."* Footer of hero or above-fold strip. Vanguard-quiet; not loud. **Honest inheritance framing — not "continuously operating since 1996".**
  - **Comparison snapshot.** 5-row table preview using the row component from Mockup 1, with a "Compare all 100+" CTA.
  - **Advisor strip.** 4–6 verified advisors with photos and the verified badge from Mockup 7.
  - **International on-ramp.** A visible (not buried) callout to the international hub for non-resident visitors. IP-aware later, but at minimum a visible "Investing from outside Australia? →" entry.
  - **De-clutter.** Drop or merge sections that aren't earning their place. Sector reports might belong on a dedicated `/research` hub, not on the homepage.
  - **Brand voice.** Pick one of Variants A/B/C as the primary; the others remain as tested A/B variants but the design language commits.
- **State variants needed:** Variant A / B / C (3 hero variants), with-deal / without, mobile + desktop, light + dark.

---

## Mockup 9 — System health / transparency widget (the "we run differently" surface)

- **Surface.** A small footer-corner module + an expanded `/transparency` page. Optional: an inline strip on the about page.
- **Business case.** **Unique in AU fintech.** Stripe / GitHub / Cloudflare have status pages. AU financial comparison sites do not. A "system health" widget that shows live signals (fee data freshness, compliance-flag status, audit-queue progress, moderation latency, 19-agent health) signals operational maturity that Finder / Canstar can't match without re-building their ops.
- **Current state.** Doesn't exist. Data is all in the codebase (cron-run logs, `platform_snapshots`, audit-queue items in `docs/audits/REMEDIATION_QUEUE.md`).
- **What to design.**
  - **Footer-corner widget.** Small, slate-600. Live: "Data freshness: 6h ago · Compliance flags: 0 · Last review: today". Click → expands to full `/transparency` page.
  - **`/transparency` page.** Shows: data refresh schedule (which crons run when), recent audit-queue resolutions ("Stream K complete · Stream J in flight"), compliance scan status (Agent #08 last scan), editorial review pipeline ("3 articles published this week, all reviewed by [author]"), CWV score, uptime.
  - **Honesty about agents.** "Editorial reviewed by Friend's Dad and Agent #04 Editorial. Compliance scanned daily by Agent #08. All money movements logged in `financial_audit_log` per AFSL s912D-equivalent standard." Tasteful disclosure of how the work gets done.
  - **About-page integration.** A "How invest.com.au runs" section linking to `/transparency` and explaining the founder + agents + escalation tiers in plain English.
- **State variants needed:** Compact footer widget (slate-600, link-style), expanded `/transparency` page (full layout), about-page section variant.
- **Risk.** This must not feel like ops-flexing or marketing of a marketing channel. Stripe-restraint, not loud-fintech.

---

## Mockup 10 — The calculator pattern (24 calculators, one design system)

- **Surface.** A pattern, applied to all 24 calculators (`/fee-impact`, `/firb-fee-estimator`, `/non-resident-cgt-checker`, `/savings-calculator`, `/super-contributions-calculator`, `/fire-calculator`, `/retirement-calculator`, `/cgt-calculator`, `/debt-calculator`, `/property-yield-calculator`, `/switching-calculator`, `/fee-simulator`, etc.).
- **Business case.** Calculators are unique product surfaces and lead-magnet hybrids. They are the **single biggest under-leveraged differentiation** vs Finder (which has only basic calculators) and Canstar (which has none). 24 calculators with a consistent design pattern signals depth Finder cannot match. Each calculator is also a SEO landing page (high search-intent traffic) and a lead-capture surface.
- **Current state.** Each calculator is bespoke. Inputs, outputs, layouts, lead-capture flows differ. No shared design pattern.
- **What to design.**
  - **Three-zone layout.** Inputs (left) → live result (centre, updates as user types) → context / methodology / next-action (right). On mobile: stack vertically.
  - **Input column.** Clear labels, helper text, sensible defaults, validation, mobile-friendly (16px font, no zoom). Consider sliders for ranges.
  - **Result zone.** **The hero of the calculator.** Big number, contextualised ("$1,847/year saved by switching from Broker A to Broker B"). Wise-style breakdown ("ASX brokerage saved: $X · FX saved: $Y · Inactivity fees avoided: $Z"). Live update on input change.
  - **Context column.** *Why this matters* + methodology link + relevant compliance disclaimer + next-action CTA ("See top brokers matching your scenario →" or "Email me this scenario →" — lead-capture without forcing).
  - **Result-share / save.** "Save this scenario" or "Email me the breakdown" — captures session_id-keyed leads. Newsletter-magnet-as-tool.
  - **Compliance footer per vertical.** CFD calculator → CFD warning. FIRB calculator → FIRB / foreign-buyer disclaimer. Use existing `ComplianceFooter` variants.
- **State variants needed:** Inputs-only state (loading), partial-input state, complete-result state, lead-capture state, lead-captured state, error state, mobile + desktop.

---

# 19. The 13 strategic questions the audit must answer

These are the open design questions the audit should *answer*, not just propose options for. If the audit comes back with a position on each, we ship it as the launch direction.

1. **The "Best X" vs "factual data only" fork (§11).** Choose: Option A (factual-only — drop "Best" everywhere); Option B ("Best X" with disclosed methodology — requires AFSL eventually); Option C (split brain — tables factual, articles opinionated). My push is A; the audit can disagree but **must commit**.
2. **How do we make ASIC compliance legible as a feature?** Right now disclaimers read as fine-print. What's the visual treatment that turns "no AFSL" from a cautious footer into a trust *claim* — without overstating it?
3. **What's the right CTA hierarchy when one page serves three revenue paths?** A vertical pillar page can earn money via (a) affiliate click on a broker row, (b) advisor-match modal submission, (c) sponsor-tier upsell. How do we visually rank these without cannibalising each other?
4. **How should sponsored placements look such that they're (a) ASIC-clearly-labelled, (b) attractive enough to charge $2k/mo for, (c) not so prominent they erode user trust?** This is the central UX paradox.
5. **How should the international thesis show up on the AU homepage?** A dedicated callout? An IP-aware variant? A small flag-strip? Or is the international hub a separate brand surface accessed via locale switcher only?
6. **What should the verified-advisor badge actually look like — and where does it draw authority from?** ASIC Financial Adviser Register lookup as a future integration; manual admin verification today. Design the badge such that today's claim and tomorrow's lookup integration use the same component.
7. **Comparison-row mobile UX — swipe-stack, expanded card, or scroll-snap chips?** Pick one and commit. Current horizontal-scroll-the-table approach is the weakest surface on mobile.
8. **Where do the 12 country pages live in the IA?** Currently country-specific content sits under `/foreign-investment/[country]/`. Should they have first-class navigation entries? Should the homepage have a "for investors from…" picker?
9. **Year 2+ "immersive city stays" — does it appear at launch, or stay invisible?** A "Where we'll be next" module on the international hub becomes a BD asset; an empty one looks half-built. What's the minimum credible launch state?
10. **Does invest.com.au need a real wordmark / logo, or is "Inter extrabold + kangaroo favicon" sufficient for launch?** If a wordmark is recommended, propose direction (calm authority, not Finder-loud).
11. **The 19-agent system — surface or hide?** A `/transparency` page with a system-health widget is unique in AU fintech and could be a moat; alternatively, keep it invisible and lean only on author bylines + methodology. **Pick one.**
12. **The 1996 inheritance story — front-and-centre, footer-quiet, or absent?** Honest framing: domain has been in the Duns family since 1996 (Dad → Fin), now being relaunched. Vanguard's "Founded 1975" model says front-and-centre. Stripe says invisible (they're 12 years old). Pick a posture and apply consistently. **The audit must commit to the honest framing — never "continuously operating financial-comparison platform since 1996" (that's not true).**

13. **How visible should Fin be?** (See §6E for the three positions in detail.) **A — fully visible** (founder photo on About, named bylines, LinkedIn-active, occasional press, possible founder's-note hero) — DHH-at-Basecamp / Patrick Collison-light. **B — semi-visible** (named in legal entity + about + footer, occasional editorial-policy bylines, minimal social media) — Stripe-style. **C — near-anonymous** (founder mentioned only in legal entity disclosures + FSG; brand carries the platform alone) — Vanguard-style. Founder's lean is B; audit must commit. The position cascades into: about-page treatment, editorial-policy attribution, footer signature lines, possible founder's-note hero, LinkedIn-link surfacing, whether Mockup 8 includes a "Built by Fin" microsignal.

---

# 20. Anti-goals (do NOT design these)

- **A "rate-my-broker" star-spam UI.** Star ratings exist but are amber-restrained, not gamified.
- **Pop-up modal on first scroll.** Exit-intent only, and only one. Aggressive lead-capture poisons the regulated-platform positioning.
- **Animated-illustration-heavy heroes.** Calm authority, not motion design. Reduce-motion respect non-negotiable.
- **Award-rosette / "Best Broker 2026" awards theatre.** Canstar's space.
- **"AI-powered" framing.** We use AI internally (this brief is AI-synthesised), but the user-facing positioning is *factual data + human-verified advisors + named expert authors*.
- **Bright-orange brand variants.** Amber stays distinct from Finder orange. Don't drift.
- **Heavy stock photography.** Especially "smiling diverse couples on a couch holding tablets" — synonymous with retail-bank marketing and erodes the regulated-platform feel.
- **Cross-sells / upsells inside compliance disclosure copy.** Disclaimers stay clean.
- **Hiding sponsor labels under hover or behind icons.** Always visible, always labelled.
- **"As seen in The Australian Financial Review" press strips.** We haven't earned them yet; faking trust is worse than no trust.
- **Customer testimonials.** Until we have real, attributed reviews from real advisors / users with permission, no testimonials. Vanguard doesn't use them; we don't need them.

---

# 21. Deliverables expected from the audit

1. **8–10 high-fidelity mockups** addressing the priorities in §18. Desktop + mobile for any user-facing surface; B2B mockups (sponsorship marketplace) desktop-first. Light + dark for everything.
2. **Direct positions on the §19 strategic questions** — not "options A/B/C", but "we recommend X because Y".
3. **One side-deliverable: `DESIGN_TOKENS.md`** — a token export that formalises the existing palette, spacing, typography, radius, shadow, and component-state matrix. The codebase doesn't have this and needs it.
4. **Component-extension proposals** for: `VerifiedAdvisorBadge`, `AuthorByline`, `MethodologyCard`, `InternationalEntryPicker`, `SponsorTierCard`, `CalculatorPattern`, `EmptyState`, `Modal`. These eight are the components the §18 mockups will keep reusing.
5. **A short "what we deliberately did not change and why"** — the audit's reasoning on which existing patterns to preserve. Helps me pattern-match what to ship vs what to revisit later.
6. **Brand-voice rewrite samples** — 5 short rewrites: hero subhead, comparison-table intro, advisor-profile credentials line, sponsorship-tier description, compliance footer microcopy. Pick the strongest direction (probably foreign-investment-hub voice) and demonstrate it.

---

# 22. Appendices — reference data

## A. The 9 verticals (with brand colour, slug, advisor cross-references)

| Vertical | Slug | Accent | Advisor cross-refs |
|---|---|---|---|
| Share Trading | `share-trading` | amber | Financial Planner, Wealth Manager |
| Crypto | `crypto` | orange | Crypto Advisor, Tax Agent (CGT) |
| Savings | `savings` | sky | Financial Planner, Debt Counsellor, Real Estate Agent |
| Superannuation | `super` | emerald | SMSF Accountant, Financial Planner |
| CFD & Forex | `cfd` | rose | Financial Planner, Wealth Manager |
| Term Deposits | `term-deposits` | slate | Financial Planner |
| Robo-Advisors | `robo-advisors` | indigo | Financial Planner |
| Property Platforms | `property-platforms` | teal | Financial Planner, Property Advisor |
| Research Tools | `research-tools` | violet | Financial Planner |

## B. Advisor types (8 canonical + 3 international = ~13 effective; revenue-agent specs reference 31 specialist segments — many are subdivisions)

Financial Planner · Wealth Manager · Crypto Advisor · Tax Agent · SMSF Accountant · Debt Counsellor · Real Estate Agent · Property Advisor · **FIRB Specialist · International Tax Specialist · Migration Agent** · Stockbroker (planned) · Insurance Broker (planned).

## C. Locales and country reach

- **Locales:** en-AU, zh-CN, ko-KR (full translations).
- **Country-specific pages under `/foreign-investment/[country]/`:** Singapore, Hong Kong, China (mainland), South Korea, Japan, UAE / Dubai, US, UK, India, Indonesia, Malaysia, New Zealand. (Approximately 12; the exact set is config-driven.)

## D. Sponsorship pricing tiers

| Tier | Monthly AUD | Surfaces |
|---|---|---|
| Featured Partner | $2,000 | Top of page + every comparison row, badge, quiz boost, dedicated AM, homepage deal slot |
| Category Sponsor | $500 | Single vertical, sponsor badge, category analytics |
| Deal of the Month | $300 | Homepage deals carousel, newsletter mention |

Annual discounts: 10–30% on 3 / 6 / 12-month commitments.

## E. Advisor monetisation

- Free tier: 3 leads, then $39/lead base.
- Dynamic-pricing multipliers: SMSF accountant 1.5×, debt counsellor 0.7×, super vertical 1.3×, time-of-day surge ±0.2×, lead-quality score ±0.2×, new-advisor 30-day discount 0.6×, floor/cap to prevent erosion below cost.
- Planned subscription tiers: Standard $199/mo (10 leads), Premium $399/mo (30 leads + content access), Featured $999/mo (unlimited + homepage pin).

## F. The 24 calculators (representative inventory)

`/fee-impact` · `/savings-calculator` · `/super-contributions-calculator` · `/fire-calculator` · `/retirement-calculator` · `/cgt-calculator` · `/debt-calculator` · `/property-yield-calculator` · `/switching-calculator` · `/fee-simulator` · `/firb-fee-estimator` · `/non-resident-cgt-checker` · `/non-resident-dividend-calculator` · `/dasp-withholding-calculator` · `/dividend-imputation-calculator` · `/portfolio-allocation-calculator` · `/tax-bracket-calculator` · `/loan-comparison-calculator` · `/savings-vs-debt-calculator` · `/etf-cost-calculator` · `/super-fund-comparison` · `/insurance-premium-calculator` · `/health-score` · `/scenario-modeller`. (Exact 24 may differ; this is the shape.)

## G. Existing trust components (audit can extend)

`ComplianceFooter` (variants: default, cfd, crypto, property, firb, super, loan) · `RiskWarningInline` · `DisclosureBanner` · `SponsorBadge` (Featured Partner / Editor's Pick / Deal — colour-coded blue / slate / amber) · `FeeVerifiedPill` (fresh / recent / stale — green / amber / grey) · `VerifiedClientBadge` · `StarRating` (amber-only, restrained) · `DatedStatBadge` · `Skeletons` (4 variants, proportional).

## H. Compliance copy library (single source of truth)

Located in `lib/compliance.ts`. Key constants the audit needs to know exist (so they can be laid out, not rewritten):

| Constant | Length | Use |
|---|---|---|
| `GENERAL_ADVICE_WARNING` | 81 words | Footer of every financial page. **Currently repeated 10+ times site-wide → compliance fatigue. Recommend single hub + link pattern.** |
| `RISK_WARNING_CTA` | 12 words | Near every "Sign Up" / "Visit Platform" button |
| `CFD_WARNING` | 57 words | CFD/forex pages — cites 62–81% retail loss rate, ASIC RG227 |
| `CRYPTO_WARNING` | 35 words | Crypto pages — "highly speculative, not legal tender" |
| `SUPER_WARNING` | — | Superannuation pages |
| `PROPERTY_GENERAL_DISCLAIMER` | — | Property pages |
| `FIRB_DISCLAIMER` | — | Foreign investment / property |
| `LOAN_COMPARISON_DISCLAIMER` | — | Loans |
| `SPONSORED_DISCLOSURE` | — | Every sponsored placement |
| `SPONSORED_DISCLOSURE_SHORT` | 16 words | Inline on cards. **Currently repeated 20+ times → fatigue.** |
| `ADVERTISER_DISCLOSURE_SHORT` | — | Header banner |
| `AFSL_STATUS_DISCLOSURE` | 87 words | FSG and About — five consecutive negations; consider rewriting positively |
| `PDS_CONSIDERATION` | — | Near product CTAs |
| `AFCA_REFERENCE` | — | Complaints page |
| `EDITORIAL_ACCURACY_COMMITMENT` | — | Corrections workflow |

## I. The 5 escalation tiers (recap from §14)

| Tier | Threshold | Founder approval? | Examples |
|---|---|---|---|
| T1 (auto) | Routine | No | Content drafts, security scans, lead routing |
| T2 (notify+proceed) | <$500 impact | No | Broker onboarding, deployments, A/B tests |
| T3 (approval gate) | >$500, legal, compliance | **Yes — Fin** | Refunds, AFSL comms, compliance copy changes |
| T4 (urgent wake-up) | Production down, security, payment >$1k | **Yes — phone push** | Cron silence, auth outage |
| T5 (co-founder route) | Enterprise >$50k, post-AFSL product | **Yes — joint** | Enterprise BD, co-branded launches |

## J. Live A/B tests at launch (managed at `/admin/ab-tests`)

1. Homepage hero — Variant A (control) / B (quiz-first) / C (value-first)
2. Comparison-table default sort (rating / fee / freshness)
3. Advisor-match modal field count (4 fields / 6 fields)
4. Sponsored-placement treatment (subtle badge / prominent badge)
5. Quiz CTA copy ("Take the 60-second quiz" / "Find my broker now" / "Match me to a broker")
6. Newsletter exit-intent value prop (lead-magnet PDF / weekly newsletter / monthly digest)

## K. Cron jobs that affect user-visible state (representative)

- `fees-refresh` (daily) — updates broker fee data; drives `last_verified_at` and `FeeVerifiedPill` colour
- `leaderboard-rotation` (weekly) — top brokers by traffic per vertical
- `advisor-billing-run` (monthly) — invoice generation
- `compliance-scan` (daily, Agent #08) — ASIC enforcement / changes
- `editorial-publish` (continuous, Agent #04) — Tier 1 + Tier 2 article publishing
- `dunning-cycle` (daily) — sponsor invoice dunning
- `gdpr-purge` (weekly) — privacy data request fulfillment
- `sponsor-impression-accounting` (hourly) — placement counts
- `lead-sla-enforcement` (hourly) — advisor lead routing < 60s SLA
- `metrics-snapshot` (daily) — platform_snapshots row for #15 Revenue Optimisation

## L. Things explicitly excluded from this brief (out of scope for the audit)

- Email template design (newsletter, transactional) — separate later engagement.
- Push notification copy / targeting logic.
- Admin dashboard redesign — internal tools, lower priority.
- Advisor portal redesign — high-LTV but post-launch revisit.
- Broker portal redesign — small audience, internal tool feel acceptable.
- Editorial content production (Agent #04's job).
- Post-AFSL co-branded product UX (Stage 3, 2028+).

---

# Closing

This brief covers ~15,000 words of context to support 8–10 mockups. The shape of a successful audit deliverable is:

- Mockups that visibly express the four moats — comprehensiveness, international focus, ASIC compliance posture, domain-since-1996 inheritance + 19-agent operational maturity — without re-litigating the things in §17.
- Decisive positions on §19's twelve questions.
- Components that degrade gracefully between `LICENCE_MODE` modes.
- Voice that pulls the rest of the site toward the foreign-investment hub's clarity.
- A `DESIGN_TOKENS.md` deliverable that formalises what the codebase already has.

If the audit comes back saying *"calm, considered, factual; founder-fronted; transparent; ASIC-aware; international-aware; durable"* — and shows it in pixels — we ship it.

— Fin

*End of brief. v2 — comprehensive deep-dive.*
