# Live URL inventory — for the design audit to fetch

> **Use this for claude.ai/design.** The audit can fetch live HTML/CSS from these URLs and inspect rendered behaviour, complementing screenshots and code. Paste this list into the chat (or alongside the master brief) and tell the audit *"feel free to fetch any of these — they are live."*
>
> **Live base URL:** `https://invest-com-au.vercel.app`
>
> ⚠️ **Important.** The custom domain `invest.com.au` is **not yet pointed at this codebase** — it currently serves a placeholder ("Investment Quotient Pty Ltd"). DNS cutover is part of launch. **Do not fetch `https://invest.com.au` — it returns a different, unrelated site.** Until the cutover, all URLs below use `invest-com-au.vercel.app`. The brand identity in the design (logo, footer, copy, OG cards) still says "invest.com.au" because that's what users will see post-cutover.

---

## How to use this with the audit

1. After uploading `DESIGN_SYSTEM.md`, screenshots, and the codebase tarball, paste this URL list into the chat alongside the master brief.
2. Add this kickoff line: *"All URLs below are live and fetchable. Use them to verify rendered behaviour, A/B variants, copy length, dark-mode parity, mobile responsiveness, and SEO/JSON-LD/manifest. Cross-reference with the screenshots and code."*
3. The audit can fetch any URL with WebFetch / browser tools — A/B-tested pages may render different variants on each fetch, which is *good signal* (let the audit see the variants).

---

## A — Front door / brand surfaces

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/` | Homepage. **A/B-tested hero** (Variants A / B / C — cookie-based). Fetch 2–3 times to see different variants. |
| `https://invest-com-au.vercel.app/about` | Founder + mission + team. Currently uses "weighted ratings" framing — contradicts methodology. |
| `https://invest-com-au.vercel.app/methodology` | Data sources, verification cadence, "no rankings" claim. **Read against /about — they contradict.** |
| `https://invest-com-au.vercel.app/how-we-earn` | Affiliate / sponsorship transparency page. |
| `https://invest-com-au.vercel.app/editorial-policy` | Editorial integrity, conflict-of-interest rules, 48h corrections SLA. |
| `https://invest-com-au.vercel.app/fsg` | Financial Services Guide — opens with five negations (defensive). |
| `https://invest-com-au.vercel.app/complaints` | AFCA complaints procedure. *Best-written trust page; use as voice template.* |
| `https://invest-com-au.vercel.app/privacy` | Privacy Act + GDPR posture. |
| `https://invest-com-au.vercel.app/terms` | Terms of use. |
| `https://invest-com-au.vercel.app/cookies` | Cookie policy. |

## B — Comparison engine (highest revenue surfaces)

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/compare` | Universal comparison engine (default ASX share trading). **40%+ of revenue flows through this surface.** |
| `https://invest-com-au.vercel.app/compare/super` | Super-funds comparison (different columns) |
| `https://invest-com-au.vercel.app/compare/etfs` | ETF comparison |
| `https://invest-com-au.vercel.app/compare/insurance` | Insurance comparison |
| `https://invest-com-au.vercel.app/compare/non-residents` | **Filter for platforms accepting international clients** — international thesis surface |
| `https://invest-com-au.vercel.app/best/beginners` | "Best for beginners" subcategory page (one example of many) |
| `https://invest-com-au.vercel.app/best/us-shares` | "Best for US shares" |
| `https://invest-com-au.vercel.app/best/chess-sponsored` | "Best CHESS-sponsored brokers" |
| `https://invest-com-au.vercel.app/best/smsf` | "Best for SMSF" |
| `https://invest-com-au.vercel.app/versus` | Head-to-head broker matchups (dynamically generated pairs) |
| `https://invest-com-au.vercel.app/broker/commsec` | Individual broker review (or substitute any broker slug) |
| `https://invest-com-au.vercel.app/broker/stake` | Another broker review for comparison |

## C — Vertical pillar pages (all 9 — they share the `VerticalPillarPage` template)

| URL | Vertical | Accent |
|---|---|---|
| `https://invest-com-au.vercel.app/share-trading` | Share Trading | amber |
| `https://invest-com-au.vercel.app/crypto` | Crypto | orange |
| `https://invest-com-au.vercel.app/savings` | Savings | sky |
| `https://invest-com-au.vercel.app/super` | Superannuation | emerald |
| `https://invest-com-au.vercel.app/cfd` | CFD & Forex | rose |
| `https://invest-com-au.vercel.app/term-deposits` | Term Deposits | slate |
| `https://invest-com-au.vercel.app/robo-advisors` | Robo-Advisors | indigo |
| `https://invest-com-au.vercel.app/property-platforms` | Property Platforms | teal |
| `https://invest-com-au.vercel.app/research-tools` | Research Tools | violet |

**Note for the audit:** all 9 use one template. Mockup 2 in the brief redesigns the template — every vertical inherits the redesign.

## D — Advisor surfaces

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/advisors` | Advisor directory hub — type pills, filters, card grid |
| `https://invest-com-au.vercel.app/advisors/financial-planners` | One advisor type listing |
| `https://invest-com-au.vercel.app/advisors/smsf-accountants` | SMSF specialists (high-LTV niche) |
| `https://invest-com-au.vercel.app/advisors/crypto-advisors` | Niche specialty |
| `https://invest-com-au.vercel.app/advisors/firb-specialists` | **International specialty — the moat** |
| `https://invest-com-au.vercel.app/advisors/international-tax-specialists` | International specialty |
| `https://invest-com-au.vercel.app/advisors/migration-agents` | SIV-pathway specialists |
| `https://invest-com-au.vercel.app/advisor/[any-real-slug]` | Individual advisor profile. **Pick a profile with photo + AFSL # populated for a fair audit.** Browse the directory and copy a real slug. |
| `https://invest-com-au.vercel.app/advisors/compare` | Side-by-side advisor compare |

## E — International / foreign-investment hub (Moat 2)

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/foreign-investment` | **Flagship international hub** — strongest voice on the site |
| `https://invest-com-au.vercel.app/zh/foreign-investment` | Simplified-Chinese full translation |
| `https://invest-com-au.vercel.app/ko/foreign-investment` | Korean full translation |
| `https://invest-com-au.vercel.app/foreign-investment/property` | FIRB rules, 2025–27 established-dwelling ban |
| `https://invest-com-au.vercel.app/foreign-investment/siv` | $5M complying-investment migration pathway |
| `https://invest-com-au.vercel.app/foreign-investment/tax` | Withholding tax + DTA explainer |
| `https://invest-com-au.vercel.app/foreign-investment/singapore` | Country-specific page |
| `https://invest-com-au.vercel.app/foreign-investment/hong-kong` | Country-specific page |
| `https://invest-com-au.vercel.app/foreign-investment/china` | Country-specific page |
| `https://invest-com-au.vercel.app/foreign-investment/uae` | Dubai investors |
| `https://invest-com-au.vercel.app/foreign-investment/us` | US dual-citizens |
| `https://invest-com-au.vercel.app/foreign-investment/uk` | UK expats |
| `https://invest-com-au.vercel.app/zh/foreign-investment/property` | ZH property page (verify translation depth) |
| `https://invest-com-au.vercel.app/ko/foreign-investment/property` | KO property page |

## F — Calculators (sample of 24 — these are unique product surfaces)

| URL | Calculator | International? |
|---|---|---|
| `https://invest-com-au.vercel.app/firb-fee-estimator` | FIRB fee calculator | ✅ |
| `https://invest-com-au.vercel.app/non-resident-cgt-checker` | Non-resident CGT | ✅ |
| `https://invest-com-au.vercel.app/non-resident-dividend-calculator` | Dividend WHT for non-residents | ✅ |
| `https://invest-com-au.vercel.app/fee-impact` | Brokerage fee impact over time | |
| `https://invest-com-au.vercel.app/savings-calculator` | Compound savings | |
| `https://invest-com-au.vercel.app/super-contributions-calculator` | Super contributions optimiser | |
| `https://invest-com-au.vercel.app/fire-calculator` | FIRE / financial-independence | |
| `https://invest-com-au.vercel.app/retirement-calculator` | Retirement projection | |
| `https://invest-com-au.vercel.app/cgt-calculator` | Capital gains tax | |
| `https://invest-com-au.vercel.app/debt-calculator` | Debt payoff | |
| `https://invest-com-au.vercel.app/property-yield-calculator` | Property yield | |
| `https://invest-com-au.vercel.app/switching-calculator` | Broker switching savings | |
| `https://invest-com-au.vercel.app/fee-simulator` | Multi-broker fee simulator | |

**For the audit:** all 24 are bespoke (no shared pattern). Mockup 10 in the brief proposes a `CalculatorPattern` (3-zone: inputs / live result / context). Compare 2–3 calculator URLs to see the inconsistency.

## G — Quiz funnel (highest-converting surface)

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/quiz` | Quiz entry — 10-step matcher |
| (Quiz progression and results screen) | Stateful — needs screenshots, not URL fetch |

**Note:** The quiz results screen is post-completion and requires actually filling out the quiz. Audit should rely on screenshot #8 (from the orchestration guide) for this.

## H — B2B / advertise / advisor onboarding

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/advertise/packages` | **Self-serve sponsorship marketplace** — Mockup 5 anchor |
| `https://invest-com-au.vercel.app/advertise/marketplace` | Marketplace overview |
| `https://invest-com-au.vercel.app/for-advisors` | Why-work-with-us page for advisors |
| `https://invest-com-au.vercel.app/for-brokers` | Why-list-with-us page for brokers |
| `https://invest-com-au.vercel.app/advisor-apply` | Advisor onboarding form |
| `https://invest-com-au.vercel.app/broker-apply` | Broker onboarding form |
| `https://invest-com-au.vercel.app/advisor-portal` | Auth-gated. Audit will see login page only. |
| `https://invest-com-au.vercel.app/broker-portal` | Auth-gated. Audit will see login page only. |

## I — Content / education hubs

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/articles` | Article hub |
| `https://invest-com-au.vercel.app/articles/[any-recent-slug]` | Tier 1 pillar article — **Friend's Dad bylined.** Fetch a recent one to inspect AuthorByline thinness. |
| `https://invest-com-au.vercel.app/learn` | Learn hub |
| `https://invest-com-au.vercel.app/how-to` | How-to hub |
| `https://invest-com-au.vercel.app/glossary` | Glossary |
| `https://invest-com-au.vercel.app/news` | News page |
| `https://invest-com-au.vercel.app/research` | Research / sector reports |
| `https://invest-com-au.vercel.app/scenarios` | Life-stage scenario modeller |
| `https://invest-com-au.vercel.app/benchmark` | Benchmark / health-check |
| `https://invest-com-au.vercel.app/health-scores` | Portfolio health scoring |

## J — Account / auth (audit will see public state only)

| URL | What the audit will see |
|---|---|
| `https://invest-com-au.vercel.app/login` | Login page |
| `https://invest-com-au.vercel.app/signup` | Signup page |
| `https://invest-com-au.vercel.app/account` | Auth-gated; redirects to /login |
| `https://invest-com-au.vercel.app/shortlist` | Saved comparisons (auth-gated) |

## K — SEO / PWA / special endpoints

| URL | What it provides |
|---|---|
| `https://invest-com-au.vercel.app/sitemap.xml` | Full sitemap. **Useful for the audit to verify route coverage and IA.** |
| `https://invest-com-au.vercel.app/robots.txt` | Crawl rules — confirms admin / portal routes are blocked |
| `https://invest-com-au.vercel.app/manifest.json` | **PWA manifest** — confirms standalone display, theme colour, maskable icons |
| `https://invest-com-au.vercel.app/opengraph-image` | **Default OG image** — slate bg + emerald-amber gradient + `$` badge + "Invest.com.au" wordmark |
| `https://invest-com-au.vercel.app/sw.js` | Service worker (offline + push) |
| `https://invest-com-au.vercel.app/sw-push.js` | Push-notification service worker |
| `https://invest-com-au.vercel.app/favicon.svg` | Vector favicon (kangaroo + wordmark) |

## L — Locale / hreflang verification

The site has 3 locales (en-AU default, zh-CN at `/zh/*`, ko-KR at `/ko/*`). To verify locale switching + hreflang:

| URL | Locale |
|---|---|
| `https://invest-com-au.vercel.app/zh/foreign-investment` | ZH translated |
| `https://invest-com-au.vercel.app/zh/foreign-investment/property` | ZH translated |
| `https://invest-com-au.vercel.app/zh/foreign-investment/siv` | ZH translated |
| `https://invest-com-au.vercel.app/zh/foreign-investment/tax` | ZH translated |
| `https://invest-com-au.vercel.app/ko/foreign-investment` | KO translated |
| `https://invest-com-au.vercel.app/ko/foreign-investment/property` | KO translated |
| `https://invest-com-au.vercel.app/ko/foreign-investment/siv` | KO translated |
| `https://invest-com-au.vercel.app/ko/foreign-investment/tax` | KO translated |

Inspect the `<link rel="alternate" hreflang="…">` tags to see how Google is told about the locales.

## M — Out of scope (skip)

The audit should **not** fetch:
- `https://invest-com-au.vercel.app/admin/*` — internal operator surfaces; out of scope for this audit
- `https://invest-com-au.vercel.app/api/*` — JSON endpoints; not a design surface
- `https://invest-com-au.vercel.app/api/cron/*` — scheduled jobs; require auth bearer
- Any preview deploy (`*-prj-*.vercel.app`) — these may diverge from production

---

## Total URL count

- **Group A (trust pages):** 10
- **Group B (comparison):** 12
- **Group C (vertical pillars):** 9
- **Group D (advisor):** 8
- **Group E (international):** 14
- **Group F (calculators):** 13
- **Group G (quiz):** 1
- **Group H (B2B):** 7
- **Group I (content hubs):** 10
- **Group J (account):** 4
- **Group K (PWA / SEO):** 7
- **Group L (locale verification):** 8

= **103 high-value URLs**, all live, all fetchable.

---

## What the audit can do with these

| Capability | Use |
|---|---|
| Fetch HTML | Inspect actual rendered DOM, JSON-LD, hreflang, OG meta |
| Compare two URLs | E.g., `/about` vs `/methodology` to see the "ratings" contradiction in actual rendered copy |
| Sample voice | Read 3–5 articles, the international hub, the trust pages, and confirm the voice-template proposal |
| Verify A/B variants | Fetch `/` 2–3 times to see different hero variants |
| Check mobile rendering | Most fetch tools render desktop; pair with mobile screenshots from the orchestration guide |
| Inspect localisation depth | Compare `/foreign-investment` vs `/zh/foreign-investment` — is the ZH translation full? Or partial? |
| PWA verification | Fetch `/manifest.json` directly to confirm the standalone display, theme colour, maskable icons claims |
| Identify SEO gaps | Cross-reference sitemap entries with on-page schema |

---

## A note on freshness

The site updates continuously (~85 commits/week). URLs above are stable but content may evolve between when this brief was written (2026-04-28) and when the audit runs. **If the audit finds something that contradicts the brief, the URL is the source of truth — not the brief.** Please flag any contradictions in the audit output so the brief can be corrected.

---

*End of URL inventory. Pair with `design-audit-brief.md` (strategy), `DESIGN_SYSTEM.md` (system), `CLAUDE_DESIGN_AUDIT_GUIDE.md` (orchestration).*
