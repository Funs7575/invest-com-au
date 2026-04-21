# COMPANY.md

> invest.com.au — organisational brief
> Last updated: 2026-04-21
> Owner: Fin Duns (CEO). See Update protocol at end of file.

This file is the single source of truth for organisational context: legal
entity, team, compliance constraints, agent system, escalation tiers, domain
history, and product roadmap. Developer-facing guidance lives in `CLAUDE.md`,
`ARCHITECTURE.md`, and `CONTRIBUTING.md`.

## Platform overview

- **Legal entity:** Pty Ltd, ACN 093 882 421. Founded 1996/97 by Dad —
  continuous registration since.
- **Domain:** invest.com.au (~30 years aged, `.com.au` exact-match, restricted
  ccTLD, geo-targeted AU).
- **Business:** Australian financial comparison + advisory + product platform.
- **Stack:** Next.js 16.2.4 · React 19.2.5 · Supabase (Postgres 17) · Vercel ·
  Stripe · Resend · Sentry 9.47.1.

### Infrastructure IDs

| System   | Identifier                                                      |
|----------|-----------------------------------------------------------------|
| Supabase | `guggzyqceattncjwvgyc` (region: eu-west-1)                      |
| Vercel   | project `prj_miPLXyjwXbqNnGLOFijBHbjXWESY`                      |
| Vercel   | team `team_B2xJT8ZXX4ItHwOiQBp1tOyl`                            |
| GitHub   | `Funs7575/invest-com-au`                                        |
| Stripe   | `acct_1TChUWPHuq84hGCT`                                         |
| Live URL | `invest-com-au.vercel.app` (pre-launch) → `invest.com.au` (post-launch Nov 2026) |

## The team (4 humans + 19 agents)

- **Fin Duns** — CEO / Operator. 15 min/day from phone. Travelling Asia
  May 2026 → Dec 2028.
- **Best Friend** — Co-Founder / COO / Head of Distribution. Full-time,
  Australia-based. 20–25% equity, 4-year vesting with 1-year cliff.
- **Dad** — Responsible Manager. ACL/AFSL holder once granted. ~5 hrs/month
  post-licence.
- **Friend's Dad** — Editorial Collaborator. Tier 1 pillar article author.
  ~5 hrs/week. Person schema byline.
- **Compliance firm** — Sophie Grace / AFSL House. Both licence applications +
  ongoing compliance.
- **19 AI agents** — 24/7 autonomous operation (see Agents section).

## Brand identity

- **Palette:** Institutional Gold `#EAB308` · Crisp White · Light Gray
  `#F9FAFB` · Navy Slate `#0F172A`.
- **Tone:** factual, expert, calm, never salesy.
- **Audience:** Australian retail investors + post-AFSL advisors (B2B).

## Compliance constraints (ABSOLUTE)

- Currently operating under **s766B(6)/(7) factual carve-out** (pre-AFSL).
- **ASIC general-advice warnings are MANDATORY** on all financial content.
- **Forbidden language without warning:** "we recommend", "best for you",
  "you should".
- **Crypto warnings** required on all crypto content.
- **AFSL status disclosure** on every page.
- **Post-AFSL:** RG175 disclosure, RG244 quality-of-advice obligations.
- **Post-ACL:** NCCP responsible lending, RG209 obligations.

Compliance copy lives in `lib/compliance.ts` — never hardcode disclaimers.

## The 19 agents

Specs will live in `.claude/agents/` (directory to be created).

| #  | Name                          | Cadence / trigger                  | Purpose |
|----|-------------------------------|-------------------------------------|---------|
| 00 | Master Overseer               | Daily 05:00 AEST                    | Monitors all 19 agents; detects failures/anomalies |
| 01 | CEO Agent                     | Monday 06:00 weekly                 | Strategic brief |
| 02 | CTO Agent                     | Continuous (via Claude Code)        | spec → architect → implementer |
| 03 | CMO / Content Agent           | Daily 07:00                         | 20 Tier 2 articles/week; byline "invest.com.au Research Team" |
| 04 | Editorial Agent               | Ongoing                             | Manages Friend's Dad collaboration on Tier 1 pillars (10–15/quarter) |
| 05 | SMB Sales Agent               | Continuous                          | Cold outbound via Apollo + Clay + Lemlist + Northlight; 600 prospects/month |
| 06 | BD / Enterprise Agent         | Continuous                          | Supports Co-Founder's enterprise pipeline ($50k–$5M deals) |
| 07 | Revenue Agent                 | Continuous                          | Lead routing (<60s response); Stripe anomaly monitoring |
| 08 | Security Agent                | Daily 03:00                         | ASIC compliance + dependency vulnerability scans |
| 09 | CI / Improvement Agent        | Sunday 06:00                        | 3–5 improvement hypotheses/week; 14-day measurement |
| 10 | Analytics Agent               | Daily 02:00                         | Single source of truth via `platform_snapshots` |
| 11 | Email / Lifecycle Agent       | Event-driven                        | Loops + Resend; customer lifecycle |
| 12 | Ops / Admin Agent             | Continuous                          | Broker/advisor onboarding + routine correspondence |
| 13 | Licensing Agent               | Continuous                          | ACL + AFSL management; ASIC monitoring; Dad's CPD generation |
| 14 | Growth / Partnership Agent    | Wednesday 09:00                     | Competitor intel + partnership pipeline |
| 15 | Revenue Optimisation Agent    | Sunday 20:00                        | 6 parallel analyses; 3–5 opportunities/week |
| 16 | **Domain Migration Agent**    | **October–December 2026 ONLY**      | Protects 28-yr aged domain authority during `.vercel.app` → `invest.com.au` cutover |
| 17 | AI Search Optimisation Agent  | Continuous                          | 500+ probe queries/week across LLMs for citation patterns |
| 18 | Product Layer Agent           | Activates post-AFSL                 | Co-branded products (savings / super / ETF / card) |

## The 24 agent infrastructure tables (Supabase)

Migration to create these is forthcoming. Planned names:

```
agent_tasks                    platform_snapshots           compliance_tasks
agent_memory                   prospects                    ceo_approvals
agent_logs                     enterprise_pipeline          friend_decisions
                               ab_tests                     advisor_content_subscriptions

revenue_opportunities          editorial_articles           api_customers
competitor_intel               forum_threads                founder_bandwidth
dynamic_pricing                llm_citations                cobranded_products
migration_plan                 partner_integrations         authorised_representatives
                                                            credit_representatives
```

All user-data tables ship with RLS enabled + explicit policies per the
migration discipline in `CLAUDE.md`.

## 5-tier escalation system

| Tier | Behaviour                                 | Examples |
|------|-------------------------------------------|----------|
| 1 | **AUTO** — agent acts, no notify            | Content publication, security scans, lead routing |
| 2 | **NOTIFY + PROCEED** — 4hr auto-proceed unless rejected | Deployments, broker onboarding |
| 3 | **APPROVAL GATE** — waits for Fin's explicit approval   | Money > $500; legal docs; pricing changes > 25% |
| 4 | **URGENT WAKE-UP** — phone notification     | Security breach; production down; payment failure > $1k |
| 5 | **FRIEND ROUTE** — Co-Founder handles directly | Enterprise negotiations; ASIC meetings; industry events |

Founder-bandwidth rules (below) modify tier routing during low-availability
windows.

## FORBIDDEN actions (any agent)

- Direct writes to production database without CTO Agent path
- Force-push to `main` branch
- Stripe refunds without approval
- Send email impersonating any real person other than authorised authors
- Publish content without compliance check
- Modify schema without approval
- Disable security features
- Pause licensing-related agent work
- Co-branded product changes without joint Fin + Co-Founder approval
- ASIC communication without Master Agent review

## Aged domain protection

- ~30 years continuous registration since 1996/97 is a structural moat.
- Google has 28+ years of topical association between the domain and
  financial services.
- `.com.au` is a restricted ccTLD and geo-targets AU exactly.
- **Migration window: October–December 2026.** Highest-stakes period in the
  entire build.
- Domain Migration Agent (#16) handles: URL inventory, 301 mapping, schema
  preservation, ranking monitoring.
- **Risk if mishandled:** 30–50% authority loss; 6–12 months recovery.

## Editorial standards

- **Tier 1 pillar** (10–15/quarter) — Friend's Dad named author + Person
  schema linked to LinkedIn.
- **Tier 2 cluster** (20/week) — "invest.com.au Research Team" byline.
- **Tier 3 programmatic** — data-driven, no individual author.
- **Always** TL;DR in first paragraph (44% of LLM citations originate in
  article intros).
- **Always** FAQ section with `FAQPage` schema.
- **Article + Person + Organization** JSON-LD on every article.

JSON-LD builders live in `lib/schema-markup.ts`.

## Founder-bandwidth awareness

- Master Overseer syncs both Fin's and Co-Founder's Google Calendars.
- **Low-bandwidth periods** (Vipassana retreats, Pamir trek, Annapurna trek):
  downgrade tier-2 escalations.
- **Tier-3 routes more to Co-Founder** during Fin's low-bandwidth windows.
- **Tier-4** always breaks through.
- **Both founders unavailable:** extended deadlines on tier-3 rather than
  auto-action.

## Co-founder structure

- **Fin:** 73–78% equity. Strategic + product decisions.
- **Co-Founder:** 20–25% equity. COO + distribution decisions. 4-year
  vesting, 1-year cliff.
- **Joint approval** required for: acquisitions, capital raise, co-branded
  product launches, major hires.
- **Operational AU-side decisions** (within budget): Co-Founder alone.
- **Product/platform decisions:** Fin alone.
- Decision categories documented in the Founders Agreement.

## Product layer roadmap (post-AFSL, 2028–2030)

| Product                    | Target     | Partner tier |
|----------------------------|------------|--------------|
| Co-branded savings account | Mid 2028   | Judo / ING / Macquarie |
| Co-branded brokerage       | Mid 2028   | Pearler / Stake / SelfWealth |
| Co-branded credit card     | Late 2028  | Mastercard / Visa banking partner |
| Co-branded ETF             | Late 2028  | Vanguard / BetaShares / VanEck |
| Co-branded super fund      | 2029–2030  | Existing trustee with capacity |
| Co-branded life insurance  | 2029       | TAL / AIA / Zurich |
| Co-branded home loan       | Post-ACL   | Strategic distribution lender |

## Revenue trajectory

- **Pre-licence achievable:** AUD $20–110k/month
- **Post-ACL Year 2:** +AUD $173–515k/month
- **Post-AFSL Year 2–3:** +AUD $474–2,180k/month
- **Co-branded products at maturity:** +AUD $5–15M annual revenue
- **Year 5 realistic:** AUD $30–60M ARR
- **Acquisition exit window:** 2029–2031. Valuation AUD $50–300M+.

## Update protocol

- COMPANY.md is the organisational single source of truth.
- Updated as the system evolves (team changes, licence grants, product
  launches).
- **Major updates** require Fin's explicit approval.
- **Minor updates** by CTO Agent with notification to `ceo_approvals` table.
- CLAUDE.md remains developer-focused; it links here in its "Start here"
  section.
