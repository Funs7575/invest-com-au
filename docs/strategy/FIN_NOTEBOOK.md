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

### 2026-06-10 — Homepage cleanup: 24 sections → 13; paid-placement policy for the marketplace teaser

Founder call ("way too long and bloated") + expert review. Decisions:

1. **Cut/merge, don't redesign.** Removed `HomeCompareDeepDive` (278-line
   client re-implementation of /compare), `HomeCPDCourses` (B2B content on
   a consumer surface), `HomeActivitySection` (third "welcome back" surface
   — `HomepagePersonalisedStrip` is the one canonical returning-user strip)
   and the inline tool chips. Merged the three market strips
   (rate-of-the-day + Invest Score gauge + rate changes) into one
   `HomeMarketToday` band. Squad-of-the-month shrunk from a full-bleed
   violet band to a one-row spotlight strip docked under the experts grid
   (ranking logic unchanged); events shrunk to a 3-row strip; post-a-request
   shrunk to a one-row CTA strip. Net: 24 sections → 13 modules.
2. **Marketplace teaser paid-placement policy:** hybrid. Diversity
   round-robin (max 2/vertical) + image-first ranking stays; paid
   (`listing_type` featured/premium) capped at **3 of the 6 visible
   cards**, always labelled (SponsorChip + `ADVERTISER_DISCLOSURE_SHORT`).
   Placement stays a **flat-fee tier upgrade — no bidding** (RG 246
   conflicted-remuneration + adverse-selection risk). Logic is pure +
   unit-tested in `lib/home-listing-curation.ts`.
3. **Equity raises excluded from the homepage teaser** while
   /invest/startups has no s708 wholesale gate (CSF escalator,
   REGULATORY-AVOID-LIST §A). Re-include only behind the wholesale gate.
4. **Bug found during the work:** homepage teaser cards hand-rolled
   `/invest/<vertical>/<slug>` — a 404 for every vertical (canonical shape
   is `/invest/<category>/listings/<slug>` via `lib/listing-url`). Fixed +
   pinned by test. Also: `lib/listing-url` + `formatListingPrice` widened
   to accept drifted string verticals; teaser chips now humanise unknown
   verticals (`carbon-environmental-markets` was rendering raw).
5. **Data drift noted, not migrated:** `vertical='fund'` (60 collectibles),
   `commercial_property` underscore variant (4 rows). Handled in code via
   existing VERTICAL_ALIASES; root-cause normalisation migration stays a
   separate queue item (URL/SEO impact needs its own review).

Revisit: when listing supply grows past ~300 or a homepage-placement SKU is
actually sold, revisit the 3-of-6 cap and whether the teaser needs an admin
curation override.

### 2026-06-10 — Licence-mode gates wired into money surfaces; hero claims reworded; compare default changed (PR #1489)

Skeptical-first-time-investor funnel audit (full report:
`bots/reports/ai-journey-2026-06-10.md`) found the licence-mode framework
(`lib/compliance-config.ts`) wasn't consumed by the surfaces it exists to
gate — a factual_only (no-AFSL) build still rendered star ratings,
"Editor's Choice", /best rankings and match language. Three founder
decisions taken in-session:

1. **Wire the gates through** (chosen over "hold for legal" / "mirror is
   exempt"): compare table rating column/stars/sort, editorial badges,
   match-language CTAs and "ASIC-verified" claims now consume the flags.
   **Operational consequence: any deploy without
   `NEXT_PUBLIC_LICENCE_MODE=general_advice` now genuinely strips those
   features.** Set the env on the Netlify mirror if current visuals should
   stay. Remaining un-gated star renders (BrokerCard, DealCard, advisor
   cards, quiz results, RecentlyViewed…) queued as DISC-20260610 follow-up.
2. **Hero trust strip**: "ASIC-registered · No commission incentive"
   replaced with "Independent · Est. 1996 · Commissions never change our
   rankings" (old wording falsifiable via /how-we-earn + RG 234
   implied-endorsement risk). Same claim aligned in homepage JSON-LD.
3. **/compare default**: cold organic landings open on share-trading
   (mixed "All" view led with three same-rated affiliate rows); missing
   fee data now renders "Fee data incomplete" instead of a fabricated $0,
   sinks in cost sorts, and earns a neutral (not perfect) cost score.

Also shipped on #1489: fabricated social-proof counter disabled (sine-curve
"X investors compared today" — ACL s18 exposure), compare freshness claims
made data-driven ("rechecked weekly" only when true; raw ISO timestamps and
"Admin/source note not public" removed from the freshness column), mobile
chat FAB un-overlapped from the Get Matched tab, /quiz→/get-matched rename
completed (37 files), QROPS/UK copy genericized in country-mode banner,
quiz-outcome dead link to phantom /advisors/accountants repointed.

**Ops follow-ups**: fee-recheck pipeline stale since 2026-05-23 (the
"weekly" claim was false for 17 days); Vercel account still blocked
(deploy status red on every PR); unknown `[type]`/`[subcategory]` slugs
soft-404 (HTTP 200 + React #419) instead of clean 404s.

A bot sprawl + review of `/invest/list` (2026-06-07) surfaced that we ran **two
parallel post-a-listing products** plus a real regulatory hole: `/invest/list →
investment_listings` accepted **anonymous, unverified-email** submissions across
10 verticals **including capital-markets** (`startup`/`fund`/`pre_ipo`). The full
consolidation plan + founder decisions live in
`docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md` (D1–D7) and the wholesale
sign-off brief in `docs/strategy/LISTINGS_S708_LEGAL_BRIEF.md`.

PR #1459 bundled the safe build increments **with** a Tier-E prod migration
(`20260907040000_investment_listings_ownership.sql`, adds `owner_user_id` + RLS),
which can't land until the migration-ledger baseline-squash is done
(`docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md`). That coupling blocked the
whole PR.

**This session — shipped the schema-free carve-out (new PR, no DB):**
- **Phase 0 (Tier-A):** `/invest/[slug]` unknown slug now **404s** (was a soft-500
  via the segment error boundary — bad for users + SEO); `/invest/my-listings`
  dead link `/invest/submit` → `/invest/list`; hero "8"→"10" categories.
- **Phase 1 increment 1 (the compliance win):** `/api/listings/submit` now
  **requires an authenticated session (401 for anon)** and best-effort provisions
  the `listing_owner_accounts` workspace (a table that **already exists in prod**,
  so no migration needed). `ListingSubmitForm` gates client-side (no part-filled
  form lost to a 401) via the shared `useUser()` hook. **D5 honesty:** Standard
  shown as **Free** (it's never actually charged today).
- This **removes the anonymous capital-markets submission path** — a real de-risk
  even before the s708 gate.

**Deliberately EXCLUDED from the carve-out (stay blocked):**
- The `owner_user_id` migration + everything that writes that column. It does
  **not** exist in prod; writing it pre-apply would 500 the live submit. Stays
  fenced per `MIGRATION_LEDGER_RECONCILIATION.md`.
- **Increment 2** (owner-scoped RLS portal, `listings`→`investment_listings`
  data-migration, `/listings/new` 308, authed my-listings rewrite) — depends on
  that migration. Not started.
- **D4 / s708 capital-markets gate** — ⚠️ founder direction set (wholesale-only),
  but **unbuilt pending legal sign-off** recorded in repo (§5 of the s708 brief).

**Revisit:** 2026-07-07 — has the migration-ledger baseline-squash been scheduled
(it's the blocker for increment 2) and has legal ruled on D4?

### 2026-06-07 — Database migration ledger: forked, not "behind"; decision = baseline-squash

Deep-dive of the standing "database backlog" (was framed as "118 migrations
behind main; run `db push`"). That framing is **wrong and dangerous**. Measured
against live prod:

- The local migration tree and the prod `schema_migrations` **ledger have
  forked**: only **5 of 250** local versions are tracked in prod; **245** local
  versions are untracked; **434** prod ledger rows have no local file. A
  `supabase db push` would attempt ~245 migrations (re-creating existing tables,
  re-running ~35 non-idempotent backfills, sweeping in the CSF migration).
- **Root cause:** `supabase-migrate.yml` silently no-op'd for **months** (its
  `PROJECT_REF`/`DB_PASSWORD` secrets were unset → green-but-applied-nothing; see
  PR #1463). Every prod migration was applied **out-of-band via MCP**, each with
  a fresh timestamp, so the ledger never matched the files.
- **Good news:** schema *content* is ~98% converged (397/412 local tables live)
  and RLS is comprehensive (414/415). So this is **history reconciliation +
  pipeline repair**, not a schema rebuild.

**Decision — Path A: baseline-squash.** Treat live prod as source of truth; dump
it to one baseline migration; archive the 404 legacy files; `migration repair`
the ledger so the tree == ledger == types; then resume a normal pipeline.
Rejected Path B (per-file `migration repair`) — infeasible against 50 colliding
date-only versions + 3 version formats. Full procedure:
`docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md`; state of record:
`docs/audits/DB-STATE-2026-06-07.md`.

**Shipped this session (safe, repo-only):** corrected runbook + DB-state doc;
deprecated the dangerous `MIGRATION_DEPLOY_BACKLOG.md`; `audit:migration-filenames`
gate (blocks new non-14-digit / colliding versions) + `audit:ledger-drift` audit;
CONTRIBUTING migration discipline (14-digit timestamps; apply via pipeline, not
MCP; never `db push` pre-reconciliation).

**Founder-gated (Tier E — not done autonomously):** the prod baseline-squash +
ledger repair, the zombie-table drops, and **enabling auto-apply** (adding the
two secrets) — all must wait until *after* the baseline, else `db push
--include-all` replays the backlog. **⚖️ Legal-gated:** the startup-portal (CSF)
and wholesale-cert (s708) tables stay held per `REGULATORY-AVOID-LIST.md`.

**Revisit:** 2026-06-21 — has the baseline-squash been scheduled? Until it is,
every new feature needing a table keeps hitting the same wall (PR #1459, in-app
charts). This is now the #1 infrastructure blocker.

### 2026-06-07 — Sign-off: factual "Listed Securities (ASX)" category

Founder signed off on adding a **Listed Securities (ASX)** browse category to
the /invest marketplace. ~32 ASX-listed securities (uranium / hydrogen /
oil-gas / digital-infrastructure themes) were previously mis-bucketed into
"Funds" via the `categoryForListing` fallback; `categoryForListing` is now
keyed on `listing_kind="listed_security"` so they group correctly, with a
dedicated `/invest/listed-securities/listings` page.

**Regulatory posture (lean lane, per `REGULATORY-AVOID-LIST.md`):** this is a
**factual listing of already-public securities + referral** ("buy via your own
broker"), explicitly the sanctioned lean alternative — *not* an escalator. It
does **not** issue, sell, arrange, facilitate an offer, run a market, or give
personal advice. `GENERAL_ADVICE_WARNING` + a "general information only, not an
offer/recommendation" notice are wired onto the page. If legal wants to review
the securities framing, the category can be flag-gated. (Sign-off recorded here
per the avoid-list's "founder + legal sign-off recorded in this repo" rule;
legal review still open if desired.)

### 2026-06-03 — Bot-QA system: ranked roadmap for the next big projects

Context: the AI-Journey bot found a real P1 in one run (`/api/versus/vote` 500s
site-wide — `versus_votes` table was never migrated in; held draft PR #1317).
That proved the value but also exposed the bots' structural limits. Today they
are **one-off, browse-only, anon-only**, with a side-effect firewall. Ranked
roadmap by leverage:

1. **Funnel-completion runner (do first).** The bots cover *browsing* but never
   *converting* — the quiz→match, lead, and account-signup flows are untested.
   The blocker is **this Claude Code sandbox's TLS-MITM proxy** dropping async
   fetches — **NOT** Netlify. Fix: run `ai-form.cjs` / the journey from a
   **clean-network environment (GitHub Actions job or small cloud runner)
   against the live Netlify mirror**, firewall still mocking the terminal money
   action. Available now; conversion is where the revenue and the worst bugs
   live. **Constraint: do NOT make this depend on the Vercel deploy** — Vercel is
   launch-gated (build needs ~14 GB; only Vercel Pro ever compiled it; reserved
   for cutover). Targeting Vercel is a *post-launch* nice-to-have, not the plan.
2. **Cross-run regression baseline + diffing.** Fingerprint each route (status /
   key content / JSON-LD present / console-clean / disclosures present), diff
   every run vs last green. Would have caught BOTH the CSP/ISR outage and the
   versus_votes 500 as regressions the moment they shipped. Backbone for the
   post-merge-smoke cadence.
3. **Systematic API-surface probing.** versus_votes was caught by luck. Enumerate
   `app/api/**`, probe each read endpoint with valid inputs against live, flag
   consistent 500s — a whole surface the UI crawler can't see.
4. **Bots as a compliance + GEO gate.** Promote soft "fees/risk present"
   observations into hard assertions: required `lib/compliance.ts` disclosures on
   every advice/comparison/payment surface + avoid-list surfaces stay gated
   (AFSL, Nov 2026); AND valid JSON-LD / answer-first / canonical (the GEO
   citability thesis — see 2026-05-21 + 2026-05-29 entries).
5. **Migration/cutover guardian.** During the Oct–Dec 2026 domain move: verify
   the prior-host redirect map, canonicals→new domain, sitemap parity, zero
   orphans, continuously. Pairs with the `CO-01` legacy-redirect-map queue item.

Honorable mention: **authenticated/portal coverage** (seeded test account) — the
advisor/startup-portal work is entirely untested by bots (anon-only today).

**If only one gets funded: #1**, then #2. Together they turn the fleet from
"is the page up?" into "does the money path still work?".

**Revisit:** 2026-07-15 — has the clean-network funnel runner been stood up? If
yes, layer #2 (regression baseline) on top.

### 2026-05-29 — GEO measurement built; GEO "supply floor" found already-shipped

Picked up the GEO thread to build the **measurement** side (the one piece the
2026-05-21 GEO entry left unbuilt). Grounding the codebase first changed the
picture twice — logging both as corrections so future sessions don't re-scope
from stale notes:

**Correction 1 — the GEO "to-do" list is mostly already shipped.** Contrary to
the 2026-05-21 open items: `public/llms.txt` + `public/llms-full.txt` exist
(served, curated, compliance-aware); `public/robots.txt` was dropped so
`app/robots.ts` is the single robots source (caveat (a) resolved); `Speakable`
+ answer-first schema now extend to articles, `/questions/[slug]`, and versus
(not just glossary); articles emit a real `dateModified` from `updated_at`; FAQ
schema is on the calculators (commit `c918cd7` "answer-engine v2"). The cheap
structural GEO floor is **done** — don't rebuild it.

**Correction 2 — golden-flow E2E already exists.** `T-TESTS-02` was tracked as
"`__tests__/e2e/` doesn't exist". True about that path but misleading: the
suite lives in `e2e/` (15 specs incl. `critical-path-get-matched-to-brief`,
`smoke`, `pre-launch-qa`). Golden flows are covered; don't duplicate.

**What was genuinely missing → built (PR #1274, branch `claude/sleepy-dirac-gTZXz`):**
measurement — there was zero AI-referrer/crawler instrumentation.
- `lib/geo/ai-referrer.ts` — pure, tested classifier for AI referrers
  (ChatGPT/Perplexity/Gemini/Claude/Copilot/…) + AI crawlers
  (GPTBot/ClaudeBot/PerplexityBot/…). google.com/bing.com excluded on purpose
  (AI Overviews / Bing chat share the search host — that's a GSC signal).
- `ai_referral` PostHog event, fired once/session, consent-gated.
- `/admin/geo` page: live detection coverage + a ready-to-paste HogQL insight.

**Decision — schema-markup.ts / seo.ts consolidation: NOT doing it.** The
2026-05-21 deep-dive item #1 mused about merging the two JSON-LD modules.
Rejected: `CLAUDE.md` documents `breadcrumbJsonLd` + SEO helpers as living in
`seo.ts` and schema.org builders in `schema-markup.ts`, so "one module"
contradicts documented ownership; it's hundreds of import sites for low payoff;
bundling a big refactor with a feature hurts reviewability. The only real smell
is `qaPageJsonLd` + `howToJsonLd` being defined in **both** files — worth a
small, separate dedup PR if/when someone touches them.

**Flagged next steps (deliberately deferred):** server-side crawler capture in
`proxy.ts` (Tier C); Search Console ingestion for the AI-Overview
impressions-vs-clicks gap (the part referrers can't see); optional Supabase
table for in-app charts (deferred until the pre-existing "Supabase types drift"
CI check is green, to avoid compounding it).

**Revisit:** 2026-06-29 — are `ai_referral` events actually landing in PostHog,
and which AI sources dominate? If volume is real, do crawler capture + the GSC
gap next.

### 2026-05-21 — Platform Expansion (PX stream) shipped

Seven features that turn the platform from comparison directory into practice management tool for advisors and financial dashboard for investors.

**Shipped in one session (branch `claude/sweet-gates-izLBx`):**
- **PX-01: Slack lead alerts** — `slack_webhook_url` column on professionals, Slack Block Kit formatter (`lib/slack-lead-notify.ts`), internal Node route (`/api/internal/lead-webhooks`), advisor Settings tab UI. Advisors paste a Slack Incoming Webhook URL → get a structured Slack ping on every matched lead.
- **PX-02: CRM/Zapier webhook sync** — `lead.received` added to outbound webhook ALLOWED_EVENTS; `sendOutboundWebhook` now accepts optional owner filter (prevents cross-advisor event leakage); wired from `submit-lead` via fire-and-forget internal route (edge runtime compatibility).
- **PX-03: Firm shared lead inbox** — `Mine/Team` toggle in LeadsTab when `is_firm_admin=true`; `/api/advisor-portal/firm-leads` (GET + PATCH) returns all firm member leads with assignment dropdown. Firm admins can now see and reassign all leads across their team.
- **PX-04: Fee impact visualiser** — `components/FeeImpactVisualiser.tsx` (pure SVG, no deps, interactive amount/horizon selectors, animated area chart, AUD callout). Embedded in `/broker/[slug]/` Fee Audit section for ETF/managed fund contexts.
- **PX-05: Referral programme migration** — `referral_codes` + `referral_claims` tables (with RLS) that wire up the already-built `/api/referrals` route and `/account/referrals` UI which were orphaned without a DB backing.
- **PX-06: Calendar booking on advisor profile** — already done (booking_link + BookingWidget already on advisor/[slug] profile page). No work needed.
- **PX-07: Annual Financial MOT email** — daily cron (`/api/cron/annual-mot`) finds users whose account anniversary is today, queries their bookmarks, sends personalised re-engagement email. `mot_sent_at` column on `investor_profiles` prevents duplicate sends. Uses `auth.admin.listUsers()` pagination pattern.

**Key architectural decision:** outbound webhooks (CRM/Zapier) and Slack notifications share one internal Node runtime route (`/api/internal/lead-webhooks`) called fire-and-forget from the edge `submit-lead` route. This sidesteps the `node:crypto` / edge runtime incompatibility without breaking the edge performance budget.

**Docs:** `docs/plans/PLATFORM_EXPANSION_BRIEF.md` has full spec for each item.

**Revisit:** 2026-06-21 — check Slack adoption rate in settings (query `SELECT COUNT(*) FROM professionals WHERE slack_webhook_url IS NOT NULL`), lead response time improvement in LeadsTab analytics, fee visualiser engagement (PostHog).

---

### 2026-05-21 — GEO pivot: optimise to be *cited* by AI, not to *rank*

**Trigger:** Google I/O 2026 (May 19–20) — the largest search overhaul in 25 years.
Ten-blue-links increasingly replaced by AI-synthesised answers (Gemini 3.5 Flash).
Founder's framing of the numbers: zero-click ~58.5% of queries; position-1 organic
CTR on AI-impacted queries fell 27% → 11%; brands cited inside AI Overviews see ~35%
more organic / ~91% more paid clicks than uncited competitors. *(I can't verify the
exact I/O figures — knowledge cutoff Jan 2026 — but the direction, zero-click rising +
AI Overviews reshaping CTR, was already the established trend; the strategy holds
regardless of the precise percentages.)*

**Decision: SEO → GEO (Generative Engine Optimization).** The goal shifts from ranking
to *being the source Google's AI cites when Australians ask financial questions*. This
is a lens applied to existing work, not a new build — most of the moats already exist.

**Moats that matter in this world (all already real assets):**
- 30-year domain (registered 1996) — strongest AU-finance authority signal for citation.
  See [[project_invest_domain_lineage]].
- `/quotes` reverse marketplace — transactional, not summarisable → structurally AI-proof.
- Listing depth across 8+ verticals — AI prefers comprehensive structured sources.
- Schema markup everywhere — `lib/schema-markup.ts` (single source of truth) is how AI
  parses and surfaces us.

**Grounded codebase state (checked 2026-05-21):**
- **Glossary: 122 terms today** (`lib/glossary.ts` + DB-backed `lib/glossary-db.ts`,
  migration `20260419_glossary_terms.sql`). Target 200 → **78 to add.** Definitional AU
  finance content is prime citation material → this is the highest-leverage near-term GEO
  lever and cheapest to ship.
- **Schema gap:** `lib/schema-markup.ts` has article / FAQ / broker-FinancialProduct /
  advisor / ItemList / listing-Product / versus / calculator / governmentService builders,
  but **no `DefinedTerm` / `DefinedTermSet`** (the glossary-citation schema) and **no
  `Speakable`**. Adding those two is the most direct "make us machine-citable" code change.
- **AI Q&A capture (#7 / stream QQ)** is already in-flight and squarely on-strategy —
  public Q&A landing pages with answer-first structure are exactly what GEO wants. Don't
  treat GEO as greenfield; it largely re-prioritises QQ + glossary + schema.

**Operating rules for all content work this session forward:**
1. Schema markup non-negotiable on every listing, broker/advisor profile, and article.
2. Every article/glossary term leads with a direct answer in the first 2–3 sentences
   (extraction-ready), before any preamble.
3. Glossary → 200 terms is now **high priority** (was untracked).
4. Restructure informational content for AI extraction, not just keyword density.
5. Competitive read: Finder/Canstar bleed *informational* traffic first → window to
   become the cited AU-finance source on definitional/explanatory queries.

**Concrete next actions (smallest-first):**
- [x] **SHIPPED 2026-05-21** — `definedTermJsonLd` / `definedTermSetJsonLd` /
  `definedTermPageJsonLd` / `speakableSpecification` added to `lib/schema-markup.ts`
  (single source of truth; canonical `GLOSSARY_TERM_SET` shared so term page + index
  can't drift). Glossary term page now emits a `WebPage` → `speakable` (answer-first
  heading `#glossary-term-name` + lead definition `#glossary-term-definition`) →
  `mainEntity: DefinedTerm`, replacing the hand-rolled inline node; index uses
  `definedTermSetJsonLd`. 41 schema tests green, tsc clean. **This is the GEO schema floor.**
- [ ] Audit existing articles/glossary entries for answer-first opening sentences.
- [x] **Glossary "→200" was ALREADY met — corrected 2026-05-21.** The live glossary is
  DB-backed (`public.glossary_terms`, seeded by migration `20260419` with **203 terms**);
  `lib/glossary.ts` (122) is only the `JargonTooltip` source + build-time fallback and had
  drifted behind. Real gap was static/DB parity, not new content. First attempt synced all
  81 into `lib/glossary.ts` — but that file is **client-bundled** (JargonTooltip imports
  `GLOSSARY`), so it tipped the shared client chunk +49.5 kB over the 12 MB bundle budget
  (CI caught it). **Final shape (#1156):** keep `lib/glossary.ts` lean at 122 (client tooltip
  set, == main, zero bundle change); put the 81 specialised terms in a **server-only**
  `lib/glossary-extended.ts` (`FULL_GLOSSARY_ENTRIES` = 203) that powers the sitemap (was
  missing 81 live term pages → now complete), internal-link targets, and the DB fallback.
  Net: a GEO win (all 203 term pages in the sitemap + more internal-link targets) with no
  client cost. Lesson (again): grep the runtime source before scoping from a tracker count,
  and watch what's client- vs server-bundled. *Net-new terms beyond 203 = separate
  new-content task; route through the content loop for accuracy.*
- [ ] Confirm QQ public Q&A pages emit FAQ + (where apt) Speakable schema.

**Deeper GEO dive (2026-05-21) — what else to add/adjust, grounded in the codebase:**
1. **Schema is broad but split across two modules.** `lib/schema-markup.ts` AND `lib/seo.ts`
   both emit Article/FAQ schema (`articleAuthorJsonLd`/`articleFaqJsonLd` live in seo.ts;
   `/best/[slug]` uses schema-markup's `articleJsonLd`). Not a bug, but consolidate to one
   so GEO changes (Speakable, dateModified discipline) land everywhere at once.
2. **`Speakable` should extend beyond glossary** — add it to article TL;DRs, `/questions/[slug]`
   answers, and the versus `tldr` (which already exists as answer-first copy in
   `lib/versus-content.ts`). The answer copy is written; it just isn't marked machine-readable.
3. **`dateModified` is the cheapest authority signal for AI** — AI engines prefer fresh,
   dated sources. Ensure every Article/DefinedTerm emits a real `dateModified` (glossary
   currently shows only `CURRENT_YEAR` in visible copy, no per-term date in schema).
4. **FAQPage is on 27 pages — extend to listings + calculators** ("How much is FIRB fee for
   a $2m property?" is exactly an AI-Overview query; calculator pages should emit the Q&A).
5. **Author/E-E-A-T entities — already strong (verified 2026-05-21).** `articleAuthorJsonLd`
   in `lib/seo.ts` already emits `Person` with `sameAs` (LinkedIn/Twitter), `jobTitle`,
   `worksFor`, and `/authors/[slug]`, plus a separate reviewer Person block. Low-priority;
   the win here is just ensuring every published article actually has an author assigned.
6. **Citable stats/data**: AI cites concrete numbers. Fee tables, return figures, and
   comparison data should sit in extractable `Table`/`Dataset`-friendly markup, not images.
7. **Crawler policy — verified 2026-05-21.** AI crawlers (GPTBot/Google-Extended/Perplexity)
   are currently **allowed** (only a `User-agent: *` block disallowing admin/api/auth/account
   paths). Good for a citation strategy — don't add AI-bot disallows. TWO caveats: (a) there
   are **two robots sources** — `app/robots.ts` AND `public/robots.txt` — and in Next.js the
   static `public/robots.txt` wins, so `app/robots.ts` is dead/confusing → consolidate to one;
   (b) **no `llms.txt`** exists — cheap, on-strategy add (curated map of our best citable pages).
8. **Measurement is the hard part** — AI-Overview citations aren't in GSC cleanly. Proxy via
   impressions-up/clicks-flat divergence + referrer strings from AI engines in PostHog.

**Revisit:** 2026-06-21 — did cited-rate / referral mix actually move once QQ + the schema
additions ship? (Hard to measure directly; proxy via GSC impressions-vs-clicks gap and any
AI-Overview-attributed referrers PostHog can see.)

### 2026-05-20 — Cross-border #24 Phase A finished + Phase B engineering shipped

Closed out the remaining cross-border engineering in one session. Most of it
turned out to be already built by earlier loop iterations — the work was
finding the dangling wires and connecting them.

**Phase A — DONE.**
- Premium pricing helper (`getLeadPriceCents` / `crossBorderLeadMultiplier`,
  1.75×) and the on-site advisor-enquiry path were already wired. The one gap
  was the **partner bulk-lead API** (`/api/partner/leads`) — it billed every
  lead at the flat base price. Now stacks the 1.75× premium, so partner-sourced
  cross-border leads price the same as on-site ones.
- Country-page → advisor CTA `?specialty=` wiring already live for UK/US/India.
  Did **not** add specialty params to the other corridors (China/HK/SG/…):
  they have no clean mapping to the four cross-border specialties, and their
  CTAs target the tax-specialist directory — forcing a FIRB-lawyer specialty
  there would filter to zero advisors. The new country-match boost (below)
  routes those corridors via `?country=` instead.

**Phase B — engineering shipped (was estimated 4–6 wks; most pre-existed).**
- `available_in_countries TEXT[]` column + GIN index: already existed
  (migration 20260515). Advisor portal self-selection UI (`CountriesServedField`
  in `ProfileTab.tsx`): already existed and persists via the profile PATCH
  allowlist. **No new migration / UI needed.**
- **Ranker country-match boost — built.** `available_in_countries` was being
  collected but never consulted. Now `advisor-ranker` takes a `countryMatch`
  option (per-advisor +15 default, normalised like specialtyMatchBoost) and
  the submit-lead matcher prefers, in order: specialty+corridor → specialty →
  corridor → top pick. `/find-advisor/[location]` passes the resolved intent
  country. Soft preference, not a hard filter (country_eligibility already
  hard-filters), so AU-only advisors aren't hidden.
- **Affiliate panel — capability built, dormant.** Typed `CrossBorderPartner` +
  `CountryConfig.crossBorderPartners` + `CrossBorderPartnerPanel` component
  (affiliate `rel` + advertiser disclosure baked in) + template section. Left
  **unpopulated**: listing a provider asserts a real referral relationship on
  an AFSL page — that needs a signed agreement + disclosure review, which is
  Phase C BD, not a code change. Activation is now a one-config-block change:
  see `docs/plans/CROSS_BORDER_PARTNER_PANEL.md`.

**What's left for revenue to actually land:** the affiliate panel needs signed
FX / remittance / non-resident-mortgage / FIRB-legal referral deals (Phase C),
and the persona selector + DASP calculator + homepage rewrite remain
design/copy work, not engineering.

### 2026-05-01 — Cross-border audit (deep)

The homepage v4 redesign exposed that the cross-border surface (`/foreign-investment` hub + 12 country pages) is **rich content with dumb monetization**. Bespoke deep guides (UK 2-audience, US FATCA/PFIC warnings, India NRI/ROR/DASP, SIV/188 pathways) already capture high-intent traffic. But every monetization signal — visa class, country of origin, journey direction — gets dropped at the funnel entrance. Lead lands in the same flat `$39/lead` advisor pool as a Brisbane share-trader.

**Decision: cross-border becomes a separate revenue product line**, not a content arm. Pricing, taxonomy, affiliate stack, funnel design, and reporting all split out.

**The LTV asymmetry that justifies the work:** a UK-arrival lead consumes ~$5–20k of professional fees over 18 months across pension transfer + non-resident mortgage + FX + FIRB lawyer + ongoing planner + insurance + recurring tax. **5–15× a domestic share-broker lead.** Same pattern (different intensities) for US-AU dual citizens, India-AU migrants, and non-resident investors.

**Audience segmentation** (the homepage section is muddled because it tries to serve all 4 from one card grid):
- **A. Inbound migrants** (UK / India / China → AU) — biggest absolute LTV, longest cycle, most complex
- **B. US-AU dual citizens in AU** — small audience, ~100% experience FATCA pain, recurring spend
- **C. Non-resident foreign investors** investing INTO AU without moving — high volume, lower per-lead value
- **D. Outbound Australians** (DASP, breaking residency) — moderate, time-limited

**Phase A (ship now, this session):** specialty taxonomy + premium pricing + CTA wiring + homepage section rewrite around audience A. Estimated $15–40k/yr realistic.

**Phase B (4–6 weeks, separate session):** `countries_served TEXT[]` schema migration + advisor portal self-selection UI + ranker country-match boost + remittance / FX / non-resident-mortgage / FIRB-lawyer affiliate panel. Estimated $30–80k/yr + Featured-partner sponsorship slots ($50–100k/yr if 3 slots filled).

**Phase C (Q2–Q3, BD-heavy):** visa advisor partner network (SIV / 188C premium CPL), pension-transfer specialist desk, US-AU tax desk, distinct cross-border reverse-marketplace flow. Estimated $65–200k/yr.

**Why this matters strategically:** the audit (2026-04-30) ranked 23 revenue ideas and surfaced ZERO cross-border items. That was a blind spot. Cross-border is now backlog item #24 and gets its own swim lane in the ship-now table below.

---

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
| 7 | AI Q&A capture layer | 2–3 wks | 80% built — `lib/chatbot.ts` (RAG, Claude+OpenAI), `lib/embeddings.ts`, `lib/ai-cost-caps.ts` | **🟡 IN-FLIGHT 2026-05-09 — queued as audit-remediation stream QQ. Brief at `docs/audits/qq-ai-qa-capture-brief.md`. 10 sub-tasks (QQ-01..QQ-10), compliance gate at QQ-08. Cloud loop picks up on next fire.** Production-ready chatbot is admin-only today. Just needs public Q&A landing pages + question-capture form. |
| 5 | Hybrid auction self-serve | 4–6 wks | 90% built — `lib/marketplace/auto-bid.ts`, `app/admin/marketplace/` | Auction already running. Need: partner self-serve onboarding, quality multiplier (CTR/CR → bid rank), reserve prices, eligibility gate. **Needs legal sign-off before code.** |
| 10 | Premium research subscription | content only | 90% built — full Stripe (`lib/stripe.ts`), Pro tier (`app/pro/`) | Plumbing complete. Just write the premium content. |
| **24** | **Cross-border revenue line** (Phase A) | **~1 day remaining** | **Specialty taxonomy SHIPPED 2026-05-02 in `lib/advisor-specialties.ts:122–138` — UK Pension Transfer, FATCA-Aware US Expat Planning, DASP Processing, FIRB Property (Non-Resident); SIV/188C covered via `immigration_investment_lawyer` type. Wired into `financial_planner`, `tax_agent`, `migration_agent` advisor types. Country pages exist with deep content.** | **Remaining: premium 1.75× lead pricing in `lib/advisor-billing.ts` (~half day), filtered advisor-CTA wiring on country pages so /foreign-investment/uk routes /find-advisor with `?specialty=UK+Pension+Transfer` (~half day), persona selector + DASP calc + homepage rewrite (design/copy work, not engineering). $15–40k/yr realistic. See decision log entry 2026-05-01.** |

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

## Saved for later — full deferred backlog

Everything not in the ship-now tier, captured here with priority, trigger, and revisit date. Scan this list at month-end. Priority scale: **P1** = pursue as soon as ship-now wave clears · **P2** = next quarter · **P3** = next year · **P4** = revisit only if something changes · **P5** = never unless the world changes.

### P1 — pursue Q2 (after ship-now wave clears)

- **#3 Lead generation (CPL replaces CPA on hot categories)**
  - Effort: 3–4 wks tech + 4–6 wks BD
  - Status: 80% built (`app/api/{quiz-lead,advisor-lead,submit-lead,email-capture}/`, Resend webhooks)
  - Why P1: 10× revenue per user vs current affiliate model. Bottleneck is commercial agreements, not engineering.
  - Trigger to start: BD has 2+ partners willing to pay $80–250/lead in writing.
  - Revisit: 2026-06-01

- **#2 Switching-as-a-service (super first, then savings, then broker HIN)**
  - Effort: 4–6 wks per vertical
  - Status: 40% built — calculators done, partner integrations missing
  - Why P1: Turns existing calculator output into transactions. $80–250 per completed switch.
  - Trigger to start: Concierge stack (#1) live, so we have routed traffic to convert.
  - Revisit: 2026-06-01

- **#9 Awards / badges / methodology licensing**
  - Effort: 6–8 wks (mostly editorial + legal, light engineering)
  - Status: 35% built — methodology page + best-of categories live, no badge SKU
  - Why P1: Recurring revenue, near-zero marginal cost per badge sold, drives SEO traffic.
  - Trigger to start: Methodology defensibility audit signed off by legal.
  - Risk: collapses into paid-badge scheme if methodology isn't genuinely defensible.
  - Revisit: 2026-06-01

- **#6 Alt-asset comparison vertical (whisky → wine → watches → art)**
  - Effort: 4–6 wks per sub-vertical
  - Status: 0% — greenfield, but pattern from existing 9 verticals is replicable
  - Why P1: New SEO surface area with zero AU competitors. CPLs $200–500.
  - Trigger to start: 1+ partner BD conversation booked (Cask 88, WhiskyInvestDirect, Vinovest equivalent).
  - Revisit: 2026-06-30

- **#13 Sponsored editorial / content studio**
  - Effort: 4 wks ops setup
  - Status: 40% built — AI drafting infra exists (`app/api/admin/content/generate-draft/`)
  - Why P1: Higher margin than display, sticky retention.
  - Trigger to start: spare editorial capacity OR a partner asking unsolicited.
  - Risk: editorial independence must be visibly protected (disclosure rules).
  - Revisit: 2026-06-30

### P2 — pursue Q3 (year-1 stretch)

- **#8 White-label comparison widgets (B2B SaaS)**
  - Effort: 4–6 wks tech + 12+ wks sales
  - Status: 50% built — `app/embed/` + `EmbedBuilder.tsx` exists
  - Why P2: Recurring SaaS revenue. Same content, 5× the surface area.
  - Trigger: 1 anchor B2B customer signed (bank, news site, or accountant network).
  - Bottleneck: B2B sales motion (new muscle).
  - Revisit: 2026-09-01

- **#15 Calculators-as-a-service / public API**
  - Effort: 4–6 wks
  - Status: 35% built — calculators exist, no API gateway
  - Why P2: Adjacent SaaS revenue, low engineering cost.
  - Trigger: 1+ fintech / accountant SaaS willing to pay metered.
  - Bottleneck: small market, free competitors.
  - Revisit: 2026-09-01

- **#11 Market-intelligence data product**
  - Effort: 8–12 wks technical + ongoing enterprise sales motion
  - Status: 40% built — PostHog event collection wired, no DW layer
  - Why P2: Becomes a moat once AI Q&A (#7) accumulates 6 months of question dataset.
  - Trigger: #7 has 6 months of data in production.
  - Risk: enterprise sales cycles are long; needs dedicated ICs.
  - Revisit: 2026-10-01

### P3 — year-2 candidates (validate before committing)

- **#14 Off-market property syndicate matchmaking**
  - Effort: 6–9 mo
  - Status: 0% — greenfield
  - Why P3: Real market (currently happens in dodgy FB groups). Big lift — KYC, deal vetting, standard syndicate paperwork.
  - Trigger: someone actively asks us to broker a syndicate match (organic demand signal).
  - Revisit: 2027-01-01

### P4 — revisit only if circumstances change

- **#12 Pre-IPO / private company secondaries marketplace (wholesale only)**
  - Effort: 6–9 mo + AFSL upgrade work
  - Status: 5% — only wholesale-classification mentions in CFD content
  - Why P4: Genuinely big upside ($50k–500k deals × 3–5% take). But standalone-company-sized bet, not a feature. **Spin-out candidate, not a roadmap item.**
  - Trigger: AFSL granted (late 2027), AND no AU competitor has emerged.
  - Revisit: 2026-10-01 (competitor scan), 2027-01-01 (AFSL milestone check)

- **Quote-auction pattern extension** (uses existing `app/quotes/` infra)
  - Idea: extend B2C advisor quote auction to other service verticals — accountants bidding for SMSF setups, brokers bidding for refi business, conveyancers bidding for property settlements.
  - Effort: 2–4 wks per vertical (infra exists)
  - Status: parent infra at `app/quotes/` is production
  - Why P4: Real revenue but each new vertical needs its own partner pool. Validate one extension before committing.
  - Trigger: 1 specific service vertical has 3+ providers asking to be on the platform.
  - Revisit: 2026-06-30 (with the alt-asset BD scan)

- **#10 Premium research subscription content programme**
  - Effort: ongoing content motion (Stripe + Pro tier infra is 90% built)
  - Status: plumbing complete (`lib/stripe.ts`, `app/pro/`); content is the gap
  - Why P4 (was higher): infrastructure means *anyone can flip the switch* but content production requires editorial bandwidth. Don't block on this; ship when capacity exists.
  - Trigger: editorial calendar has a clear premium-tier slot for 6+ consecutive months.
  - Revisit: 2026-07-01

### P5 — NEVER (unless the regulatory or market world changes)

These are explicitly **don't build** decisions. Captured so future Claude sessions don't waste time re-relitigating them.

- **#16 P2P "post your investment for bids" marketplace (AirTasker for assets)**
  - Why never: securities law (prospectus/PDS triggers, AFSL requirement); adverse selection (worst stuff lists fastest); listed-share version has no real market (broker sale takes 30 seconds at same price).
  - The narrower version that works is #12 (wholesale secondaries) — see P4.
  - Reactivation trigger: only if AU regulator carved out a specific safe harbour for P2P investment-asset marketplaces. Not on the horizon.

- **#17 Whisky / wine / art *auction house* (you running the auction)**
  - Why never: Langton's owns AU wine, Chrono24 owns global watches, Cask 88 owns whisky. Custody, settlement, fraud, dispute resolution = different business with thin margins.
  - The version that works is #6 (be the comparison + lead-gen layer) — see P1.

- **#18 Pure auction for placement (no editorial filter)**
  - Why never: ASIC RG 246 conflicted-remuneration risk; adverse selection (worst products bid hardest); premium partners walk.
  - The version that works is #5 hybrid auction — already in ship-now.

- **#19 Own financial product (co-branded ETF / savings / super)**
  - Why never (for now): become a financial product issuer with capital requirements + AFSL upgrade + board obligations + liability. Different company, not a feature.
  - Reactivation trigger: AFSL granted + 3+ years operating history + clear retail-investor demand for an own-brand product. Y5+ at earliest.
  - Revisit: 2027-12-01

- **#20 Crypto-aggressive affiliate plays (high-CPA leverage products, offshore deals)**
  - Why never: ASIC enforcement appetite on finance-site reputation. Asymmetric downside.
  - Existing crypto vertical at compliant CPA terms is fine; pushing harder is the trap.

- **#21 Display ads / programmatic**
  - Why never: kills UX, regulator dislikes them on financial-product sites, race-to-bottom revenue, hurts the brand asset.

- **#22 Events / annual conference**
  - Why never (for now): real money but operationally a separate business; one COVID-style disruption from disaster.
  - Reactivation trigger: core revenue >$10M ARR AND someone on the team wants to run events as a P&L.

- **#23 Robo-advice referrals at scale without disclosure rigour**
  - Why never: same RG 246 risk as pure auction. Existing robo vertical at compliant disclosure terms is fine.

---

## Parking lot (raw ideas, not yet evaluated)

Drop new ideas here as they come up. Evaluate when time permits — assign a priority (P1–P5) and move into the appropriate section above.

### 2026-05-09 — Visual content / rich-media upgrades to listings

Captured during conversation with Claude. Re-evaluate against the 6-month pre-launch window — most should ship.

- **App screenshot galleries** on `/broker/[slug]`, `/crypto/[slug]`, `/savings/[slug]`. 3–5 real screenshots per platform (login, trade, portfolio, fees, mobile/desktop). ~1–2 wks build (gallery component + admin upload + `ImageObject` schema). Quarterly maintenance ~30 min/platform. Real moat vs Canstar/Finder. **Provisional P1.**
- **Custom OG images per `/best/[slug]`** — extend existing `/api/og` to render category-specific imagery (top 3 platform logos + key stat). Almost free; existing infra. Drives social CTR. **Provisional P1, smallest build.**
- **Animated fee-impact visualisation component.** "$50k at 0.10% vs 0.30% over 10 years" — pure SVG/Canvas, no media production. Reusable across every fee page. Big trust signal. **Provisional P1.**
- **Annotated screenshots calling out fees / hidden costs / UX friction.** ~1–2 days/platform editorial. Highly shareable on Twitter/Reddit. Worth doing for top-10 platforms per vertical. **Provisional P2, editorial-bandwidth-bound.**
- **60–90s video walkthroughs.** Self-shot screencast + voiceover. Evergreen SEO + YouTube discovery. ~3–4h per video. **Provisional P2, depends on whether anyone will actually shoot them.**
- **3D scans of commercial property syndicate assets** (BrickX, DomaCom etc). Underlying platforms don't have these themselves. $500–1500/property × syndicate-property-churns-quarterly = negative ROI. **Provisional P5 — skip.**
- **Advisor video bios on profile pages.** 5–15% advisor uptake (supply problem). Selection bias toward camera-ready advisors. **Provisional P4 — defer until 1000+ active advisors.**
- **Office tour 360° photos for firm pages.** Same supply problem. **Provisional P5 — skip.**
- **Drone/aerial property shots, interactive floor plans.** You're not the source — platform is. Doesn't scale. **Provisional P5 — skip.**

**Next action:** stand up "OG" stream brief for the custom-OG-images sub-idea (smallest, highest cost-leverage, ~3–5 days cloud loop work). The screenshot gallery + fee-impact component are larger streams; brief them after OG ships.

### 2026-05-09 — Recruitment marketplace (firm ↔ advisor matching)

Evaluated in conversation. Reframe: not "recruiter search" but "firm-to-advisor lead-gen", reusing `marketplace_placements` + `advisor_credit_ledger` + `advisor_firm_invitations`. Two-sided cold start is the constraint (advisors didn't opt in to be recruited; needs explicit "open to roles" toggle). Sized at $500k–$2M ARR ceiling. **Provisional P3 — sit until QQ ships and at least one inbound from a firm asking to hire. Don't build founder-pushed.**

The narrower, cheaper variant: a "Careers" tab on `/firm/[slug]` profiles. ~half day. Reveals demand without a marketplace build. **Provisional P2 sub-task — bundle into a future firm-profile-improvements stream.**

---

## Open commitments / revisit-by dates

Time-bound items that need a check-in at a specific date. Don't delete — strike through and timestamp when resolved so we keep the trail.

- **2026-05-16 — Quiz funnel post-deploy review.** PR #434 (quiz outcome resolver, post-results email capture, vertical drips, sponsor-boost vertical-aware) shipped 2026-05-02. Estimated +35–50% end-to-end conversion lift; ground truth requires 14 days of PostHog data on `quiz_outcome_primary_cta` distribution + `quiz_lead_capture` rate + drip open/CTR. Compare actuals vs estimate in this notebook on revisit. Remote-trigger scheduled.
- **2026-05-09 — Test-posture readiness call.** Currently B-grade: ~71% lib coverage, ~14% API-route line coverage, ~~38 TypeScript errors in test files~~ **TS errors closed by audit-remediation loop — `tsc --noEmit` exits 0 on main as of 2026-05-02 PM (verified)**, 228 untested API routes. Realistic enterprise-grade timeline ~4–6 focused weeks; pre-launch must-do is now just **golden-flow Playwright E2E lockdown** (T-TESTS-02, ~1 week — `__tests__/e2e/` directory currently doesn't exist). Decide on a Friday whether to dedicate a sprint to it.
- **Drip cron kill-switch.** `abandoned_quiz_drip` is gated by `isFeatureDisabled('abandoned_quiz_drip')` (per `lib/admin/classifier-config`). The 27 vertical drip templates shipped in PR #434 sit dormant until flipped. Estimated +1–2% sitewide conversion uplift when enabled. No revisit date — flip when you're ready for the lead volume.

---

## Resolved / shipped

Move items here once they ship OR are formally killed. Don't delete — keep the trail so we can see what we built and what we walked away from.

- **2026-06-06 — Batch security + feature merges (mega-session continuation).**
  Six PRs merged in a single pass during the `/goal do all to high quality` session:
  - **#1409 P0 security** — owner-scope RLS on `broker_wallets`, `wallet_transactions`, `marketplace_invoices`. `USING (true)` gave every authenticated user all broker Stripe/PII data via PostgREST; replaced with per-broker-slug + is_admin() guard. 6 regression tests.
  - **#1411 quiz server-side scoring** — moved all `quiz_weights` reads server-side (service-role); stripped `select("*")` on `/api/quiz/data` that was leaking `cpa_value`/`affiliate_priority` etc. to every quiz visitor. New `/api/quiz/score` endpoint.
  - **#1413 wealth-stack fields** — stripped commercial broker columns (`cpa_value`, `monthly_sponsorship_fee`, `affiliate_priority`) from `/api/wealth-stack` public response. Followed #1408's lead.
  - **#1414 versus_votes table** — created the missing `versus_votes` table (every `/versus/*` vote widget was 500ing). Closed the HELD #1317.
  - **#1415 revenue-summary + schema-drift** — admin revenue summary made resilient to missing `broker_campaigns`; schema-drift audit of 31 phantom tables documented.
  - **#1416 cron-health docs** — documents the ~13-day Vercel account blockage that left the cron fleet dark.
  - **#1422 NF-20 SMS consent** — OPEN, CI running. Superseded conflicting #1180.
  - **#1421 credit-ledger CAS fix** — OPEN, CI running. Fixes optimistic-lock retry dead predicate.
  - **#1412 quiz_weights lock** — waiting for #1411 Netlify deploy to complete before merge.

- **2026-06-06 — Bot fleet infrastructure: full suite shipped.** Completed in mega-session (context ~2 windows). All of the following are on `main`:
  - **Performance baseline** (`bots/checks/perf.ts`): Navigation Timing + FCP + JS heap captured after every `visit()`, written to `perf-baseline.json` per run.
  - **JSON-LD schema drift detection** (`bots/checks/schema-markup.ts`): every `<script type="application/ld+json">` block validated against required fields per type — critical for GEO/AI citability.
  - **Startup ecosystem flow** + **Advisor portal flow** (`bots/flows/startup-portal.ts`, `bots/flows/advisor-portal.ts`): 5-step scripted regressions for each.
  - **CI smoke gate** (`.github/workflows/bots-pr-smoke.yml`): runs advisor/startup flows on PRs touching those paths, posts advisory comment, never blocks merge.
  - **Auto GitHub issue filer** (`scripts/bots-file-issues.ts`): deduplicates open issues, files one per Critical/High finding; opt-in nightly via `BOTS_AUTO_FILE_ISSUES=1`.
  - **Cross-run regression diff** (`scripts/bots-diff-baseline.ts`, `npm run bots:diff`): compares any two `findings.json` using stable ID hashes; surfaces new/resolved/stable/occurrence-change; exits 1 on critical/high regressions; 16 unit tests.
  - **API surface probe** (`scripts/bots-probe-api.ts`, `npm run bots:probe-api`): enumerates 403 GET handlers, probes 186 non-admin/non-cron static routes against the mirror; found 5 server errors on first run (see DISC-20260606 in REMEDIATION_QUEUE); writes `bots/.runs/latest-api-probe.json`.
  - Live runs: two full mirror runs executed. First probe found React hydration error #418 on every page (cross-cutting Netlify mirror issue), advisor portal login form missing inputs, and 5 API 500s. Diff script confirmed 12 new findings, 16 resolved between runs.

- **2026-05-02 — Quiz funnel rebuilt.** PR #434 shipped: 7-outcome resolver (post-job, advisor-match, advisor-browse, calculator-first, education-first, diy-broker, bundle-stack) replaces binary DIY-vs-advisor track; email gate moved post-results (warm capture); 12 structured columns added to `quiz_leads`; 9 vertical drip-template variants × 3 steps = 27 drip templates; `applyQuizSponsorBoost` is vertical-aware (no crypto-sponsor over super result); `/quotes/post` prefills from quiz handoff. Migration applied to prod (project `guggzyqceattncjwvgyc`), 125 tests passing, all 25 CI gates green. Squash commit `f1d2017c` on main. Co-author Claude Opus 4.7.

- **2026-05-02 — Tracker reality-audit findings.** Two queue items I was about to scope as fresh work were already done:
  - **T-TESTS-01 (38 TypeScript errors in test files):** closed by the audit-remediation loop. `tsc --noEmit` exits 0 on a fresh main pull. The project gotcha note in `MEMORY.md project_test_typescript_drift` is stale and should be cleared. Pre-launch must-do is now just **T-TESTS-02 (golden-flow Playwright lockdown)** since `__tests__/e2e/` doesn't exist yet.
  - **Cross-border specialty taxonomy (FIN_NOTEBOOK 2026-05-01 backlog #24):** shipped in `lib/advisor-specialties.ts` lines 122–138 with all 5 specialties wired into the relevant advisor types. Phase A's remaining engineering scope is just (a) premium 1.75× pricing in `lib/advisor-billing.ts` and (b) country-page CTA filter wiring. Persona selector + DASP calc + homepage rewrite are design/copy, not engineering.
  Lesson — don't scope from queue/notebook entries without grepping the code. Two parallel agents (audit-remediation loop + a-stream backfill PRs) close items faster than the trackers update.
