# How to run the claude.ai/design audit

> **For Fin.** Step-by-step guide to filling claude.ai/design's four context slots — Design System, Add screenshot, Attach codebase, and the chat — with the right artifact in the right slot. Total setup time: ~15 minutes (most of it screenshotting).

---

## TL;DR — what goes in each slot

| claude.ai/design slot | Drop in | Why |
|---|---|---|
| **Design System** | (skip — folded into brief §10) | The master brief now contains the full design-system reference (tokens with hex codes, 173-component inventory, motion library, voice rules, accessibility constraints, PWA posture, weaknesses). One doc, easier to keep synced. |
| **Add screenshot** | 14 screenshots — see §2 below | Visual ground truth. The audit can't fully understand the comparison-row layout from code; it needs to see it. |
| **Attach codebase** | A 25-file curated subset (see §3) — *not* the whole repo | Whole repo is 2,275 files; signal-to-noise is bad. The 25 files cover all the components the audit will touch. |
| **Chat (paste in)** | `docs/launch/design-audit-brief.md` + `docs/launch/LIVE_URL_INVENTORY.md` | The strategic brief (now ~17k words, includes everything: strategy, goals, per-vertical revenue priority, philosophy, UX/UI per surface, design system, voice, mockups, questions) + 100+ live URLs the audit can fetch. |

There's also a Figma slot — skip it; we don't have a Figma file.

> ⚠️ **Domain is not yet pointed.** The custom domain `invest.com.au` is **held by Fin's father** (Dad), who has run a basic Investment Quotient site on it since 1996. Dad is transferring the domain to Fin for the enterprise-grade relaunch; the cutover happens **when the new build meets enterprise quality** (the public-facing launch event). Until then, the audit must fetch from `https://invest-com-au.vercel.app`. The brand identity in the design still says "invest.com.au" — that's the post-cutover destination. The URL inventory in `LIVE_URL_INVENTORY.md` is correctly pointed at the Vercel URL. **When framing the heritage story in mockups: inheritance / relaunch — never "continuously operating since 1996" (it's not, it's been Dad's basic site).**

---

## 1. Design System slot — skip

The master brief (`design-audit-brief.md`) now contains the full design-system reference at §10:
- Color tokens with hex codes (full amber / emerald / blue scales)
- Typography (Inter, 5 weights, responsive scale)
- Spacing, radius, shadow, breakpoints
- Motion library (30+ named animations + durations)
- Iconography (110+ Lucide-style, brand mark, illustration style)
- Component inventory (173 files, grouped by purpose, state matrices)
- PWA posture, accessibility constraints, performance constraints
- The `LICENCE_MODE` feature flag (every component must degrade between `factual_only` and `general_advice`)
- Known weaknesses + 5 missing component patterns the audit should propose

One source of truth, single doc — easier to keep synced. If claude.ai/design *requires* the slot to be filled, paste the §10 section as a standalone snippet; otherwise leave it empty and the audit will read §10 in the chat-pasted brief.

---

## 2. Add screenshot — capture this list

Take these screenshots at the breakpoints listed and upload them. **Annotate sparingly** — a one-line caption ("Homepage hero variant A — control") is enough; the audit should see, not read.

### Critical (must have — 8 screenshots)

| # | URL | Breakpoint | What to capture | Why |
|---|---|---|---|---|
| 1 | `/` | desktop 1440 | Full above-fold homepage hero (Variant A) | Anchor for Mockup 8 (homepage redesign) |
| 2 | `/` | mobile 390 (iPhone 12/13) | Full above-fold + the sticky `MobileStickyAdvisorCta` if visible (scroll to 420px+) | Mobile homepage starting point |
| 3 | `/share-trading` | desktop 1440 | Hero + first 5–10 rows of comparison table | Anchor for Mockup 1 (comparison row) and Mockup 2 (vertical pillar) |
| 4 | `/share-trading` | mobile 390 | Hero + the broker-card stack (the horizontal-scroll table problem) | The single weakest mobile surface — Mockup 1's main fix target |
| 5 | `/foreign-investment` | desktop 1440 | Hero + persona selector + DTA table area | Anchor for Mockup 6 (international hub) — also the strongest voice on the site, used as voice template |
| 6 | `/advisor/[any-slug]` | desktop 1440 | Full advisor profile page | Anchor for Mockup 4 (advisor profile + match flow). Pick a real advisor with a photo + AFSL number populated. |
| 7 | `/advertise/packages` | desktop 1440 | The full sponsor-tier landing page | Anchor for Mockup 5 (sponsorship marketplace) |
| 8 | `/quiz` (results screen) | desktop 1440 | Reach the end of the quiz; capture the top-3-results screen | Anchor for Mockup 3 (quiz results) — the highest-intent surface |

### Important (should have — 6 screenshots)

| # | URL | Breakpoint | What to capture | Why |
|---|---|---|---|---|
| 9 | `/about` | desktop 1440 | The full About page including disclaimers | Voice-audit reference; shows current "weighted ratings" claim that contradicts methodology |
| 10 | `/methodology` | desktop 1440 | Full methodology page | Same — shows the "no rankings" claim that contradicts About |
| 11 | `/articles/[any-recent-pillar-article]` | desktop 1440 | Article with author byline visible | Shows current `AuthorByline` thinness — anchor for Mockup 7 (trust architecture) |
| 12 | `/compare` | desktop 1440 | The universal comparison engine with filter bar | Shows the comparison-table affordances |
| 13 | `/firb-fee-estimator` | desktop 1440 | A representative calculator | Anchor for Mockup 10 (calculator pattern) — pick a calculator with input + output + lead-capture |
| 14 | Any sponsored broker card with `SponsorBadge` visible | desktop 1440 (close crop) | Tight crop of a single sponsored broker row + its badge | Shows current sponsor visual treatment |

### Nice to have (if time)

- `/admin/ab-tests` (or any admin dashboard) — shows the founder's operator view, in case the audit wants to comment on internal tools
- `/zh/foreign-investment` or `/ko/foreign-investment` — the localised hubs, to compare voice/treatment in non-English
- A full-page screenshot of the homepage at desktop (not just above-fold) — shows the section flow and where things lose energy
- Dark mode versions of #1 and #3 — the audit can verify the dark-mode parity claim

### Capture method
- **Browser:** Chrome DevTools device toolbar — set viewport to 1440×900 for desktop, 390×844 for mobile (iPhone 12/13 default). Take full-page screenshots via DevTools' "Capture full-size screenshot" command (Cmd+Shift+P → "screenshot").
- **Naming:** `01-home-desktop.png`, `02-home-mobile.png`, etc. Sequential numbering keeps them in the same order as the table above so the audit can correlate.
- **Optional but useful:** annotate with a short caption layer ("Mockup 1 anchor — comparison row, current state"). Markup tools work; don't over-annotate.

### Time estimate
~30–45 minutes for the 14 critical+important screenshots.

---

## 3. Attach codebase — curated subset (recommended) vs full repo

The repo has 2,275 files. The audit doesn't need most of them. Two options:

### Option A — Curated subset (recommended; ~25 files, ~150KB)

Run this to bundle only the files the audit will actually use:

```bash
cd /home/finnduns/invest-com-au

tar -czf design-context.tar.gz \
  docs/launch/design-audit-brief.md \
  docs/launch/LIVE_URL_INVENTORY.md \
  docs/launch/CLAUDE_DESIGN_AUDIT_GUIDE.md \
  app/globals.css \
  app/layout.tsx \
  app/page.tsx \
  app/opengraph-image.tsx \
  app/manifest.ts \
  app/share-trading/page.tsx \
  app/foreign-investment/page.tsx \
  app/advisors/page.tsx \
  app/advertise/packages/page.tsx \
  app/methodology/page.tsx \
  app/about/page.tsx \
  app/how-we-earn/page.tsx \
  lib/compliance.ts \
  lib/verticals.ts \
  lib/sponsorship.ts \
  lib/tracking.ts \
  lib/i18n/locales.ts \
  components/HomeHero.tsx \
  components/VerticalPillarPage.tsx \
  components/BrokerComparisonTable.tsx \
  components/VerticalBrokerTable.tsx \
  components/AdvisorDirectory.tsx \
  components/AdvisorMatchCTA.tsx \
  components/AuthorByline.tsx \
  components/SponsorBadge.tsx \
  components/FeeVerifiedPill.tsx \
  components/MobileStickyAdvisorCta.tsx \
  components/ComplianceFooter.tsx \
  components/Icon.tsx \
  components/IntentPicker.tsx \
  components/Skeletons.tsx \
  components/ui/Button.tsx \
  components/ui/Card.tsx \
  components/ui/Badge.tsx \
  components/layout/Navigation.tsx \
  components/layout/SiteFooter.tsx \
  public/manifest.json \
  next.config.ts \
  package.json \
  tsconfig.json
```

Drag `design-context.tar.gz` into the codebase slot. **This is what I recommend.**

### Option B — Whole repo

If claude.ai/design accepts the whole repo and processes it intelligently, drag the whole `/home/finnduns/invest-com-au/` folder. Expect ~10–20× the upload time and noisier responses (the audit may comment on test files, cron logic, internal admin code that's out of scope).

If you do this, mention in the chat: *"The whole repo is attached. The strategically important files are listed in `docs/launch/CLAUDE_DESIGN_AUDIT_GUIDE.md` — start there."*

---

## 4. Chat — paste the strategic brief

Once the three slots are filled, open the chat and paste the contents of:

`/home/finnduns/invest-com-au/docs/launch/design-audit-brief.md`

It's ~13,650 words. That's long, but every section earns its place. The brief is structured so the audit can read in priority order if pressed for time:

1. §1 (60-second pitch)
2. §11 (the "Best X" vs "factual data" contradiction — single biggest design-blocking decision)
3. §17 (decisions already made)
4. §18 (the 10 priority mockups)
5. §19 (the 12 strategic questions to answer)

After pasting, send a short kickoff message:

> *"You have:*
> *— Design System slot: tokens, components, patterns, voice rules*
> *— 14 screenshots: current state of the surfaces I want re-mocked*
> *— Codebase tarball: ~25 strategically-important files*
> *— Strategic brief above (master context)*
>
> *Please produce the 8–10 mockups in §18 of the brief, take direct positions on the 12 strategic questions in §19, and deliver a `DESIGN_TOKENS.md` formalising what's already in `globals.css`. Start with Mockup 1 (the comparison row) — it earns 40%+ of revenue.*
>
> *Annotate where each mockup serves which moat (§3 of the brief)."*

---

## 5. Order of operations (15-minute setup)

1. **Now (you):** Read §11 and §18 of the master brief if you haven't. The audit will produce a position on §11 — make sure my recommendation (Option A: drop "Best", embrace factual) matches your gut. If not, override it before pasting.
2. **+2 min:** Bundle the codebase tarball (`tar -czf …` from §3 above).
3. **+2 min:** Open claude.ai/design. Drop `DESIGN_SYSTEM.md` into the Design System slot. Drop the tarball into the codebase slot.
4. **+30–40 min:** Take the 14 screenshots from §2. Drop them into the screenshot slot in the order listed.
5. **+1 min:** Paste the master brief into the chat. Send the kickoff message from §4.
6. **Watch the audit run.** Push back when it deviates from the brief — particularly on the moats, the LICENCE_MODE constraint, or the 12 strategic questions.

---

## 6. What to push back on

The audit is good but not infallible. Likely failure modes to watch for:

- **It'll want to redesign the colour palette.** Push back: amber-500 is the brand accent (decision #1 in §17 of the brief). It can refine usage but not change the hue.
- **It'll propose a Figma component library as a deliverable.** Politely redirect to the actual deliverables in §21 of the brief — mockups, position-on-questions, `DESIGN_TOKENS.md`, component proposals, voice rewrites.
- **It'll forget the LICENCE_MODE constraint.** Watch for "Best X" framing in `factual_only` mockups. If you see it, link it back to §11 + §12 of the brief.
- **It'll soften the international thesis.** If it tries to make `/foreign-investment` feel like a generic "for international users" page, link it to §15 (Year 2+ city stays) and Mockup 6 — the international hub is a flagship, not a footer link.
- **It'll add testimonials / lifestyle photography.** Anti-goal #6 + #10 in §20 of the brief.
- **It might propose hiding the 19-agent system.** That's a valid position (see Strategic Question 11) — but it should *say* it's a position, not omit by default.

---

## 7. After the audit lands

Expected output:
- 8–10 mockups, each with desktop + mobile + light + dark
- `DESIGN_TOKENS.md`
- 5 voice rewrites
- 8 component proposals (`VerifiedAdvisorBadge`, `AuthorByline` upgrade, `MethodologyCard`, `InternationalPersonaPicker`, `SponsorTierCard`, `CalculatorPattern`, `EmptyState`, `Modal`)
- Direct positions on the 12 strategic questions
- "What I deliberately did not change and why" — preserves what's already working

What I'd do next:
1. Review with fresh eyes; check that the 12 strategic-question answers are coherent with each other (a methodology decision implies a hero copy decision implies a comparison-row decision).
2. Pick the top 3 mockups to ship at launch (probably 1, 2, 7 — comparison row, vertical pillar, trust architecture pattern). Triage the rest into post-launch.
3. Add the `DESIGN_TOKENS.md` to the codebase under `docs/design/`.
4. If the wordmark question (Strategic Question 10) returns "yes, redesign", that's a separate workstream — don't block launch on it.

---

*Built by Claude Code, 2026-04-28. Pair with `design-audit-brief.md` (strategy) and `DESIGN_SYSTEM.md` (system).*
