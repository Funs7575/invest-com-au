# Master prompt for claude.ai/design

> **How to use.** Paste `design-audit-brief.md` into the chat first (~20k words). Paste `LIVE_URL_INVENTORY.md` after it. Then send the message below as the kickoff. Don't shorten — every paragraph is load-bearing for the audit.

---

You are doing a launch-blocking visual + UX/UI design audit for **invest.com.au** — an Australian financial comparison platform built solo over 4 months by founder Fin Duns. Your output will land in production. Soft commercial launch is on Vercel this week; **the public custom-domain cutover happens when this audit's mockups for Tier-A surfaces ship**, so this is on the cutover-blocking critical path, not cosmetic polish.

## What you've been given

1. **The strategic brief** (~20k words, pasted above) — self-contained. Strategy, four moats, founder/authorship chain, three-stage business plan, revenue mix, customer segments, **goals + numerical targets (§6A)**, **per-vertical revenue priority — which 3 of 9 verticals earn 70% (§6B)**, **strategic philosophy — the 10 principles to self-check against (§6C)**, **UX/UI playbook per surface (§6D)**, **ideas considered, what's been rejected, open optionality, founder-visibility positions (§6E)**, competitive landscape (Finder · Canstar · RateCity · Mozo · MoneySmart vs Stripe · Wise · Vanguard · IG · StashAway · Saxo), product surface (~800 routes), data model, **full design system reference (§10) — tokens with hex codes, motion library, 173-component inventory, accessibility, PWA, performance, 12 weaknesses, 5 missing component patterns**, brand voice audit, the `LICENCE_MODE` feature flag, trust architecture, the 19-agent system, international positioning, decisions already made, the 10 priority mockups, the 13 strategic questions.

2. **`LIVE_URL_INVENTORY.md`** — 100+ live URLs at `https://invest-com-au.vercel.app/*`. **Do not fetch `https://invest.com.au` — that domain is currently parked under Dad's "Investment Quotient" site and not yet repointed.** Use the URLs to verify rendered behaviour, A/B variants, copy length, locale switching (EN/ZH/KO), JSON-LD, manifest, sitemap. A/B-tested heroes return different variants on each fetch — that's good signal.

3. **14 screenshots** — current state of the surfaces being mocked, desktop + mobile.

4. **A 42-file codebase tarball** — `globals.css` (tokens), `layout.tsx` (font/theme), homepage, share-trading + foreign-investment + advisors + advertise/packages + methodology + about + how-we-earn pages, `lib/compliance.ts` (430-line single-source disclosure library), `lib/verticals.ts`, `lib/sponsorship.ts`, `lib/tracking.ts`, `lib/i18n/locales.ts`, ~20 key components (HomeHero · VerticalPillarPage · BrokerComparisonTable · AdvisorDirectory · AdvisorMatchCTA · AuthorByline · SponsorBadge · FeeVerifiedPill · MobileStickyAdvisorCta · ComplianceFooter · Icon · IntentPicker · Skeletons · ui/Button · ui/Card · ui/Badge · layout/Navigation · layout/SiteFooter), `manifest.json`, `next.config.ts`, `package.json`, `tsconfig.json`.

## Read order (if pressed for time)

1. §1 (60-second pitch) — orient.
2. §11 (the "Best X" vs "factual data only" contradiction) — **the single biggest design-blocking decision**. You must commit to a position.
3. §17 (decisions already made — don't re-litigate).
4. §6D (UX/UI playbook per surface) — the operational logic per page type.
5. §18 (the 10 priority mockups) — the actual ask.
6. §19 (the 13 strategic questions) — what I want positions on.
7. Everything else as context.

## Deliverables

1. **8–10 high-fidelity mockups** addressing §18, with **desktop (1440) + mobile (390) for every user-facing surface** (B2B desktop-first), and **light + dark mode for everything**. Order: 
   1. Comparison row (the 40%+ revenue surface — start here)
   2. Vertical pillar page hero + comparison block (Share Trading + Super)
   3. Quiz results screen
   4. Advisor profile + "Get matched" flow
   5. `/advertise/packages` self-serve sponsorship marketplace
   6. International / non-resident hub
   7. Trust-architecture pattern (verified badge + author byline + methodology card)
   8. Homepage
   9. System-health / transparency widget + `/transparency` page
   10. Calculator pattern (applies to 24 calculators)

2. **Direct positions on all 13 strategic questions in §19.** Not "options A/B/C — your call". Pick one for each, justify in 2–3 sentences. The 13 cover: the Best-X-vs-factual fork · ASIC compliance legibility · CTA hierarchy across three revenue paths · sponsored-placement visual treatment · international thesis on the AU homepage · verified-advisor badge architecture · comparison-row mobile UX (swipe / expand / scroll-snap) · country-page IA · "city stays" launch state · wordmark question · 19-agent transparency posture · 1996-domain heritage framing · founder visibility (A fully visible / B semi-visible / C near-anonymous).

3. **`DESIGN_TOKENS.md`** — formalise what's already in the `globals.css` `@theme` block. Color (full scales: amber, emerald, blue, slate), typography (Inter scale + weights + letter-spacing), spacing rule, radius, shadow, breakpoints, motion (30+ named keyframes with durations).

4. **8 component-extension proposals:**
   - `VerifiedAdvisorBadge` (new — wraps existing `verified` boolean; supports today's manual verification + tomorrow's ASIC-API integration without redesign)
   - `AuthorByline` **upgrade** (component exists but thin — add credential chips, photo, LinkedIn link, 1-line bio)
   - `MethodologyCard` (new — embeddable above any data; ~50-word disclosure pattern)
   - `InternationalPersonaPicker` (new — extends the existing foreign-investment selector)
   - `SponsorTierCard` (new — for `/advertise/packages`)
   - `CalculatorPattern` (new — 3-zone: inputs / live result / context; applies to all 24 calculators)
   - `EmptyState` (new — currently ad-hoc per surface)
   - `Modal/Dialog` primitive (refactor — currently bespoke per modal, no unified primitive)

5. **5 voice rewrites** — hero subhead, comparison-table intro, advisor-profile credentials line, sponsorship-tier description, compliance footer microcopy. **Use the foreign-investment hub's current voice as the template** (it's the strongest on the site).

6. **A short "what we deliberately did not change and why."** Preserves what's already working; helps me triage.

## Hard constraints (do not violate)

- **`LICENCE_MODE` feature flag.** Every component must degrade gracefully between `factual_only` (current launch posture — no AFSL — disables ranking language, "match you to" copy, "Best X" framing, star ratings) and `general_advice` (post-AFSL — enables them). Show both states for components where the difference matters.
- **Amber-500 `#f59e0b` is the brand accent.** Don't change the hue. Refine usage if needed.
- **Sponsored placements always labelled.** Never propose treatments where sponsored = visually identical to organic.
- **User-controlled sort.** No algorithmic "Top Pick" gimmickry.
- **Three locales only.** EN / ZH / KO. Translation quality > coverage.
- **Mobile-first; desktop converts.** Comparison tables desktop-first; mobile gets a redesigned card stack with swipe affordance — not a shrunk table.
- **Compliance disclaimers as components, not free text.** Use `lib/compliance.ts` constants: `GENERAL_ADVICE_WARNING`, `RISK_WARNING_CTA`, `CFD_WARNING`, `AFSL_STATUS_DISCLOSURE`, etc.
- **Heritage framing is inheritance/relaunch.** The domain has been in Fin's family since 1996 (Dad held it for 30 years; transferring to Fin); the new platform is being relaunched on it. **Never frame as "continuously operating financial-comparison platform since 1996" — that's not true.**
- **Anti-goals (§20):** no award rosettes, no aggressive pop-ups (one exit-intent max), no stock photography of smiling couples, no "AI-powered" framing, no testimonials until earned + attributed, no hidden sponsor labels, no Finder-orange brand drift.

## Output format

For each mockup:
- Clear title + which §18 mockup it addresses.
- Desktop (1440) + mobile (390), light + dark.
- Annotations indicating which moat(s) the mockup serves (1 = comprehensiveness, 2 = international, 3 = ASIC compliance, 4 = domain heritage + operational maturity).
- Annotations for `factual_only` vs `general_advice` variants where they differ.
- A short rationale (3–5 sentences) — what changed, why.
- The components used and any new components proposed.

For each strategic question:
- The question (1 line).
- Your committed position (1 line).
- Justification (2–3 sentences).
- Implications across the design (1–2 sentences).

## Success criteria

The mockups land if:
- They visibly express **at least one of the four moats** per mockup.
- They respect **every hard constraint** above.
- They give Fin a defensible **committed position** on each of the 13 questions — coherent with each other (a methodology decision implies a hero copy decision implies a comparison-row decision).
- They commit to **one brand voice** — converging toward the foreign-investment hub's current voice.
- Every component handles `LICENCE_MODE` gracefully where it matters.

## Start here

Begin with **Mockup 1 (the comparison row)** — it earns 40%+ of launch revenue. Then work through 2 → 10 in order.

Push back on anything in the brief that seems wrong. The brief is the founder's current thinking; the audit's job is to **challenge and deliver**, not to flatter.
