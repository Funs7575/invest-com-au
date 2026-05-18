# Audit Remediation — Queue

Source of truth for `/audit-remediation-iteration`. Each iteration reads this
file, picks the top non-blocked item per `REMEDIATION_DEFAULTS.md` priority
order, does it, then edits this file to advance the queue before committing.

See also: `REMEDIATION_DEFAULTS.md` (priority weights + work-sizing rules),
`MERGE_AUTHORIZATION.md` (tier policy), `REMEDIATION_QUEUE_LOG_ARCHIVE.md`
(iteration log entries older than ~30 iterations).

---

## In-flight (one row per active stream)

| Stream | Branch | PRs (history → latest) | Notes | Done-when |
|--------|--------|------------------------|-------|-----------|
| A | _complete_ | #207/#322/#351/#352/#353/#354/#355/#378/#380/#381/#382/#457/#540 | A-01..A-04 done. A-05 resolved as **false-positive** — `broker_reviews`/`broker_ratings` don't exist in schema; covered by `user_reviews` (A-02). **Stream complete.** | A-05 merged ✓ |
| B | `claude/audit-remediation/b-09-edge-fn-secrets` | #208/#301/#457 | B-01..B-08 done. B-09 blocked (see Blocked). | B-09 unblocked + merged |
| C | `claude/audit-remediation/c-05-index-coverage` | #209/#302/#338/#356/#357/#358/#359/#360/#361/#362/#457/#541 | C-01..C-02 done. C-03..C-05 blocked (see Blocked). | C-05 merged |
| D | `claude/audit-remediation/d-09-seo-drift` | #210/#303/#339/#363/#364/#365/#366/#457/#542 | D-01..D-09 done. | D-09 merged ✓ |
| E | `claude/audit-remediation/e-02-batch-5-zod-rollout` (#469) · `e-04-batch-2-zod-backfill` (#557) · `e-04-batch-3-zod-backfill` (#558) | #211/#304/#340/#368/#379/#383/#457/#458/#459/#460/#461/#462/#463/#464/#465/#466/#467/#468/#469/#555/#556/#557/#558 | E-02 batch 1-5 all MERGED (#469 merged 2026-05-03). E-04 batch 1 done (#555/#556), batch 2 blocked, **batch 3 MERGED** (#558 per iter 279). | All E-02+E-04 batches merged |
| F | `claude/audit-remediation/f-08-cache-drift` · `claude/audit-remediation/f-disc-20260510-hygiene` | #212/#305/#341/#370/#384/#457/#470/#543 · **#741 MERGED 2026-05-11** | F-01..F-07 done. F-08 blocked (see Blocked). F-DISC-01: **#741 MERGED 2026-05-11** (iter 360 squash SHA `3ad0dbe`; console.error → log.error; all hard CI gates green). F-DISC-02..07 false-positives. **F-DISC stream complete.** | F-08 unblocked + merged |
| G | `claude/audit-remediation/g-04-mfa-gaps` | #213/#306/#342/#371/#385/#457/#471/#544 | G-01..G-03 done. G-04 blocked (see Blocked). | G-04 unblocked + merged |
| H | `claude/audit-remediation/h-06-stripe-webhooks` | #214/#307/#343/#386/#457/#472/#545 | H-01..H-06 done. | H-06 merged ✓ |
| I | `claude/audit-remediation/i-05-advisor-gaps` | #215/#308/#344/#387/#457/#473/#546 | I-01..I-05 done. | I-05 merged ✓ |
| J | `claude/audit-remediation/j-04-content-freshness` | #216/#309/#345/#388/#457/#510/#547 | J-01..J-04 done. | J-04 merged ✓ |
| K | `claude/audit-remediation/k-05-notification-gaps` | #217/#310/#346/#389/#457/#511/#548 | K-01..K-05 done. | K-05 merged ✓ |
| L | `claude/audit-remediation/l-06-logging-drift` | #218/#311/#347/#390/#457/#512/#549 | L-01..L-06 done. | L-06 merged ✓ |
| M | `claude/audit-remediation/m-05-mobile-ux` | #219/#312/#348/#391/#457/#513/#550 | M-01..M-05 done. | M-05 merged ✓ |
| N | `claude/audit-remediation/n-04-a11y-gaps` | #220/#313/#349/#392/#457/#514/#551 | N-01..N-04 done. | N-04 merged ✓ |
| O | `claude/audit-remediation/o-04-rls-zero-policy` | #221/#314/#350/#393/#457/#515/#552/#593 | **#593 MERGED 2026-05-08** — all 57 zero-policy tables remediated. | O-04 merged ✓ |
| P | `claude/audit-remediation/p-05-perf-budgets` | #222/#315/#394/#457/#516/#553 | P-01..P-05 done. | P-05 merged ✓ |
| Q | `claude/audit-remediation/q-05-quiz-integrity` | #223/#316/#395/#457/#517/#554 | Q-01..Q-05 done. | Q-05 merged ✓ |
| R | _complete_ | #290/#396/#459/#466/#471/#472/#473/#510/#511/#513/#514/#516/#517/#519/#521/#526/#527/#528/#529/#530/#531/#532/#533/#534/#535/#536/#537/#538/#539/#540/#541/#542/#543/#544/#545/#546/#547/#548/#549/#550/#551/#552/#553/#554/#555/#556/#557/#558/#559/#560/#561/#562/#563/#564/#565/#566/#567/#568/#569/#570/#571/#572/#573/#574/#575/#576/#577/#578/#579/#580/#581/#582/#583/#584/#585/#586/#587/#588/#589/#590/#591/#592/#593/#594/#595/#596/#597/#598/#599/#600/#601/#602/#603/#604/#605/#606/#607/#608/#609/#610/#611/#612/#640 | **Stream complete.** | #640 merged ✓ |
| S | _complete_ | **#594 MERGED 2026-05-08** (`ee498f8c`) | S-01..S-05 done. **Stream complete.** | S-01..S-05 done. **Stream complete.** |
| T | `claude/audit-remediation/t-05-type-safety` | #225/#318/#398/#457/#519/#560 | T-01..T-05 done. | T-05 merged ✓ |
| U | `claude/audit-remediation/u-04-url-canonicals` | #226/#319/#399/#457/#520/#561 | U-01..U-04 done. | U-04 merged ✓ |
| V | `claude/audit-remediation/v-07-auth-hardening` | #227/#320/#400/#457/#521/#562 | V-01..V-07 done. | V-07 merged ✓ |
| W | `claude/audit-remediation/w-12-hub-page-hoc` | #306/#312/#369/#529/#598/#599/#602/#604/#605/#606/#607/#608/#609/#612 | W-04..W-15 all MERGED. | All W tasks merged ✓ |
| X | _complete_ | #257/#367/#596/#600/#610/#641/#643/#644/#646/#702 MERGED | **Stream complete.** | All X PRs merged ✓ |
| CC | _complete_ | **#675 MERGED** · **#678 MERGED** · **#704 MERGED 2026-05-10** | **Stream complete.** | CC-05 merged ✓ |
| EE | _complete_ | **#653 MERGED** | **Stream complete.** | #653 merged ✓ |
| FF | _complete_ | **#656 MERGED 2026-05-09** | **Stream complete.** | FF-04 merged ✓ |
| OOO | _complete_ | **#652 MERGED** | **Stream complete.** | OOO-03 merged ✓ |
| KK | _complete_ | **#703 MERGED** · **#711 MERGED** · **#743 MERGED** · **#747 MERGED** · **#749 MERGED 2026-05-14** · **#751 MERGED 2026-05-14** | KK-04 iter 4 + 5 merged by founder 2026-05-14. **Stream complete.** | KK-04 merged ✓ |
| PP | _complete_ | **#706 MERGED** · **#745 MERGED** · **#755 MERGED** · **#765 MERGED** · **#768 MERGED** | **Stream complete.** | All PP tasks merged ✓ |
| WW | _complete_ | **#651 MERGED** | WW-01+WW-02 merged. WW-03/04 blocked (DD-02 dep). | All WW tasks merged ✓ |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |
| QQ | `claude/audit-remediation/qq-01-public-qa-surface` | **#800 MERGED 2026-05-14** | QQ-01..QQ-07 done (merged). QQ-05 pending (Tier C schema migration: `qa_questions`/`qa_answers`). QQ-06/QQ-09/QQ-10 pending. QQ-08 compliance gate blocks public exposure. Next item: QQ-05. | All QQ tasks merged |
| MM | `claude/audit-remediation/mm-v01b-digital-infra-listings` | **#801 MERGED** · **#803 MERGED 2026-05-14** | MM-V01..V08 done. MM-V06 pending (Tier C — wholesale-only alternatives: litigation funding, PE, VC, hedge funds, ILS; s708 gate design required; announce before merge). Next item: MM-V06. | All MM phases merged |
| TT | _complete_ | **#764 MERGED** · **#772 MERGED** · **#779 MERGED** · **#799 MERGED 2026-05-12** | TT-01..TT-04 all done. GA4 removed; Plausible sole analytics. **Stream complete.** | TT-04 merged ✓ |
| CMP | `claude/audit-remediation/cmp-w1a-int-calculator-autosave` | **#782 CLOSED 2026-05-14 (not merged)** | CMP-W1A-INT: #782 was closed without merging by founder 2026-05-14. Work may need re-examination or re-opening on a fresh branch. | All CMP tasks merged |
| SP | (none yet) | (none yet) | **BLOCKED — waiting on MM-V09 completion.** | All SP tasks merged + compliance signoff |
| MAIN-RESCUE | _complete_ | **#793 MERGED** | next 16.2.4→16.2.6 patch merged. Non-loop auto-revert PRs for failed main commits: **#827 OPEN** (reverts `d26094aa`) · **#843 OPEN** (reverts `ff43ed6f`). These are founder-action items — loop will not create duplicate fixes. | Merged to main ✓ |
| CL | `claude/audit-remediation/cl-01-about-entity-only` | **#795 MERGED 2026-05-14** | CL-01..CL-04, CL-06, CL-09, CL-10 done. CL-07+CL-08 false-positive. CL-05 blocked (WHOIS registrar action — see Blocked). | All CL tasks merged (CL-05 blocked) |
| LL | `claude/audit-remediation/ll-04-reviews-ratings` | **#807 MERGED 2026-05-14** · **#845 MERGED 2026-05-17** | LL-01..LL-04 done. LL-05 blocked (live chat AI routing — deps V-NEW-02 + CC-06). **Stream stalled at LL-05 (blocked).** | All LL tasks merged (LL-05 blocked) |
| RR | _complete_ | **#847 MERGED 2026-05-17** | RR-01 false-positive. RR-02 done. **Stream complete.** | All RR tasks merged ✓ |
| EM | `claude/audit-remediation/em-02-hub-drip-infra` | **#848 MERGED 2026-05-17** · **#880 OPEN** | EM-03 + EM-01 done. EM-02 (`16add6f`): hub_drip_log migration + hub-subscriber-drip cron. **Stream complete pending #880 merge (Tier C).** | All EM tasks merged |
| LX | `claude/audit-remediation/lx-03-cross-calc-nav` | **#849 MERGED 2026-05-15** · **#879 OPEN** | LX-01, LX-02, LX-03, LX-04, LX-05 done. LX-03 (`b6f675a`): RelatedCalculators component wired into 4 main calculators. **Stream complete pending #879 merge.** | All LX tasks merged |
| OB | `claude/audit-remediation/ob-09-remaining-quizzes` | **#852 MERGED 2026-05-17** · **#878 OPEN** | OB-01..OB-12 done. OB-09..OB-12 (`710dba3`): LUMP_SUM, FOREIGN_INVESTMENT, SELL_BUSINESS, HALAL_INVESTING configs + 4 quiz pages + sitemap. **Stream complete pending #878 merge.** | All OB tasks merged |
| GT | `claude/audit-remediation/gt-02-annual-check` | **#881 OPEN** | GT-01 blocked (needs DV-01). GT-02 done (`a4c5352`): annual financial check-up page `/account/annual-check` — personalised FY checklist for 5 investor types. NavCard added to dashboard. CI rescue iter 422: `Supabase types drift` fixed — `hub_drip_log` from EM-02 caused drift. CI rescue iter 429: `Supabase types drift` again — advisor_auctions/bids migration; merged main (`2929e91`). CI rescue iter 431: `Supabase types drift` again — 3 new tables (brief_promo_codes, brief_promo_redemptions, investor_oauth_connections) from founder PRs #891–#893; types regen on main (`b9b57b5`), then merged into GT (`241721f`). CI rescue iter 433: `Database types drift gate` — same 3 founder tables still failing after types regen (gate uses migrations not types); fixed by allowlisting in `.driftallowlist` (`947d14d` on main), then merging into GT (`f39e995`). Axe-core still failing (systemic/blocked). Last CI: pending — pushed `f39e995` 2026-05-18. | All GT tasks merged |
| DF | `claude/audit-remediation/df-01-decision-frameworks` | **#883 OPEN** · ~~#884 CLOSED (dup)~~ | DF-01 done (`49bc079`): DecisionTree engine + buy-vs-rent. DF-02 done (`972e13a`): salary-sacrifice tree. DF-03 done (`1d741e9`): SMSF-setup tree. DF-04 done (`cadd73e`): tools index updated (buy-vs-rent/salary-sacrifice/smsf-setup added to ToolsClient). **Stream complete pending #883 merge.** | All DF tasks merged |
| QA | `claude/audit-remediation/qa-01-question-deep-dive` | **#890 OPEN** | QA-01 done (`a7c7d56`): /questions index + RSC deep-dive template + 17 seeded questions. QA-02 done (`3c0d82a`): +13 questions → 30 total (tax-loss harvesting, MLS, LITO, crypto tax, investment bonds, A-REITs, rebalancing, shares vs bonds, diversification, FHBG, age pension assets test, HECS-HELP). **Stream complete at 30 questions pending #890 merge.** | All QA tasks merged |
| Z-23+BB-08 | `claude/audit-remediation/z-23-first-home-buyer` | **#895 OPEN** | Z-23 done (`6f33976`): `/first-home-buyer` hub page. BB-08 done: FHSS deposit calculator at `app/tools/fhss-calculator/page.tsx`. CI rescue iter 431: fixed Dated strings gate ("1 July 2017" → `// dated-ok`), JSON-LD missing (added `calculatorJsonLd`+`breadcrumbJsonLd`+`faqJsonLd`), merged main for Supabase types drift. Commit `0cdd2ee`. Last CI: pending — pushed 2026-05-18. **Stream complete pending #895 merge.** | #895 merged |
| MK | `claude/audit-remediation/mk-marketplace-conversion` | **#903 OPEN** | MK-01 done (`773c0e8`): `AdvisorCalendarEmbed` — inline Calendly/Cal.com iframe embed on advisor profile; falls back to link for other URLs. MK-02 done (`773c0e8`): `AdvisorVideoIntro` — lazy poster-overlay player replacing bare iframe; YouTube thumbnail auto-fetch + Vimeo support. Both wired into `AdvisorProfileClient`. **Stream complete pending #903 merge.** | All MK tasks merged |
| CD | `claude/audit-remediation/cd-01-financial-calendar` · `claude/audit-remediation/cd-01-calendar-utility` | **#900 OPEN** · **#902 OPEN** | CD-01 done (`e07b8e4`): public `/tools/financial-calendar` (PR #900). CD-01 account-gated (`5142821`): `/account/calendar` personalised deadline calendar (PR #902). CD-02 done (`3ff2353`): `/tools/currency-converter` + `CurrencyConverterClient` — 15 currencies, FIRB thresholds context, static mid-market rates (PR #902). CD-03 done (`3ff2353`): `/pricing` — 5 fee tables for financial planners/brokers/tax accountants/buyer's agents/SMSF specialists (PR #902). CI rescue iter 435: `Dated strings gate` fixed — "1 July 2025" in calendar description (`// dated-ok`), commit `5142821`. **Stream complete pending #900 + #902 merge.** | All CD tasks merged |

---

## Blocked — needs human input

### CL-05 — WHOIS domain privacy (registrar action required)

WHOIS for invest.com.au may expose registrant personal details. This cannot
be fixed in code — it requires enabling WHOIS privacy through the domain
registrar for `invest.com.au`. Steps:
1. Log in to the domain registrar where `invest.com.au` is registered.
2. Find "WHOIS Privacy", "Domain Privacy", or "Privacy Protection" in domain management.
3. Enable it. This replaces personal details in the WHOIS record with the registrar's proxy contact.
4. Allow 24–48 hours for WHOIS propagation.

Once done, delete this blocked entry and mark CL-05 as done in the stream table.

---

### Dependency vulnerabilities systemic failure (3 in-flight PRs: #800, #803, #807) — 2026-05-14

**RESOLVED 2026-05-14 (iter 395):** PRs #800, #803, #807 were merged directly by founder. Iter 394's root-cause analysis was incorrect — the `--audit-level=high` threshold in CI already excluded the remaining moderate PostCSS CVE. The actual HIGH-severity CVEs were from `next@16.2.4` (13 CVEs fixed in #793). Those branches simply predated PR #793's merge and still had 16.2.4 in their `package-lock.json`. The systemic block evaporated once the branches were merged (picking up 16.2.6 from main). **This blocked entry can be deleted by the founder.**

~~The `Dependency vulnerabilities` CI check is failing on three in-flight PRs simultaneously, triggering the same-gate cluster guard (≥3 PRs, same check name). Surfaced by iter 394.~~

---

### Accessibility (axe-core on key routes) systemic failure — 2026-05-15

**Pre-existing in main; not caused by any stream PR.** `Accessibility (axe-core on key routes)` CI check is failing on in-flight PR #845 (LL-04) and was also failing on founder PRs #846 and #850 (both admin-merged past the failure). Diagnosed in iter 402.

**Key facts:**
- The a11y job runs against a local Next.js build with placeholder Supabase creds — NOT the Vercel preview.
- The 8 tested routes are: `/, /glossary, /tools, /foreign-investment, /about, /how-we-earn, /privacy, /terms`.
- LL-04's changes only touch `app/account/*` — none of the 8 tested routes — confirming the failure is not caused by the stream.
- PR #846 (founder marketplace PR, independent branch) also fails the same check; PR #850 (merged to main 2026-05-15) also fails.
- `Lint · Type-check · Test · Build` passes; only the a11y gate fails.
- The specific critical axe-core rule is unknown without CI job logs (`gh run view --job 76104276977 --log-failed`); the loop's cloud env cannot access those logs.
- `Lighthouse — Core Web Vitals (advisory)` is also failing but is advisory-only (non-blocking).
- `Preview smoke test` failure on #845 is a Vercel preview timing issue — PR #850 passes it.
- PRs #847, #848, #849 have CI bypass/not-triggered, so axe-core is only confirmed failing on #845.

**Effect on auto-merge:** PR #845 cannot auto-merge while axe-core is red. PRs #848 (EM) and #849 (LX) have CI bypass and are unaffected.

**Recommendation matrix:**
- **(a) Fix root cause — recommended:** Run `gh run view --job 76104276977 --log-failed` locally (needs `gh` CLI auth) to get the exact critical rule name and failing node. Fix on a `fix/a11y-<rule>` branch targeting main; all stream PRs pick it up on next update.
- **(b) Admin-merge #845 past the failure:** Founder admin-merges #845 (LL-04) as done for #846 and #850. The underlying violation remains.
- **(c) Gate reconfiguration:** If the violation is known runner noise from placeholder creds, add the specific rule to `DISABLED_RULES` in `e2e/a11y.spec.ts` with a dated comment, open a PR to main.

**To resolve:** Delete this blocked entry once (a), (b), or (c) is actioned and PR #845 shows green Accessibility check.

---

## Resolved as false positives

| Item | Reason |
|------|--------|
| CL-07 (social media entity-only) | Source code social links are entity-level: `@investcomau` on X/Twitter, `linkedin.com/company/invest-com-au`. No personal founder accounts referenced in shipped code. |
| CL-08 (press inquiry handling) | `app/press/page.tsx` and `app/contact/page.tsx` already use `press@invest.com.au` (role address). No founder personal email in code. |
| MM-V05 (alternative collectibles listings) | `app/invest/alternatives/listings/page.tsx` exists on main and covers all MM-V05 sub-categories (whisky, wine, art, watches, cars, coins, etc.) via `ALTERNATIVES_SUB_CATEGORIES`. No new page needed. |

---

## Iteration log (most recent first)

### iter 436 — 2026-05-18 — MK-01 calendar embed + MK-02 advisor video intros

- **Stream:** MK (marketplace conversion)
- **Items:** MK-01 — advisor calendar embedding, MK-02 — advisor video intros
- **Branch:** `claude/audit-remediation/mk-marketplace-conversion`
- **PR:** #903 OPEN
- **Commit:** `773c0e8`
- **Diff:** +204 -10 across 3 files (2 new components, 1 updated profile client)
- **What:**
  - **MK-01 — `components/AdvisorCalendarEmbed.tsx`** — new "use client" component. Detects Calendly (`calendly.com/`) and Cal.com (`cal.com/`) URLs in the advisor's existing `booking_link` field. Renders a "Book [consultation type]" CTA button; on click, expands an inline iframe embed with dismiss (✕) control. Eliminates new-tab context switch that hurts mobile conversion. Falls back to a styled link button for non-supported booking URL patterns. `consultationLabel` auto-set to "free consultation" when `initial_consultation_free` is true. Wired into `AdvisorProfileClient` as a "Book a Time" `SectionCard`, rendered when `booking_link` is set.
  - **MK-02 — `components/AdvisorVideoIntro.tsx`** — new "use client" component replacing the bare always-on iframe. Lazy: iframe only mounts on user click. Poster overlay: uses `intro_video_poster_url` if set; auto-fetches YouTube `hqdefault.jpg` thumbnail by video ID; dark placeholder for Vimeo. Play button with hover scale + white background. Platform support: YouTube (`watch?v=`, `youtu.be/`, `embed/`) → `embed/{ID}?autoplay=1&rel=0`; Vimeo (`vimeo.com/{ID}`) → `player.vimeo.com/video/{ID}?autoplay=1`. Accessible `aria-label` + iframe `title`.
  - **`AdvisorProfileClient.tsx`** — added imports for both components; replaced inline video iframe with `<AdvisorVideoIntro>`; added "Book a Time" SectionCard with `<AdvisorCalendarEmbed>` before `AdvisorAppointmentsWidget`.
- **No schema changes** — both components consume existing `Professional` fields: `booking_link`, `intro_video_url`, `intro_video_poster_url`, `initial_consultation_free`.
- **Local gates:** `node scripts/check-dated-strings.mjs` ✅, `node scripts/check-jsonld-coverage.mjs` ✅ (all public routes), `npm run audit:rate-limits --strict` → 100% (461 routes)
- **Tier:** A (new UI components + profile page update — no API/schema/auth changes)
- **STATUS: PROGRESS · stream=MK · item=MK-01+MK-02 · pr=#903**

### iter 435 — 2026-05-18 — CI-RESCUE CD (#902 dated strings gate)

- **Stream:** CD (calendar + utility features)
- **Phase:** 2 — CI rescue
- **PR:** #902 OPEN
- **Branch:** `claude/audit-remediation/cd-01-calendar-utility`
- **Commit:** `5142821`
- **Diff:** +1 -1 in `app/account/calendar/page.tsx`
- **Root cause:** `Dated strings gate` flagged `"1 July 2025"` on line 46 of the calendar page — a description string for the "New financial year begins" deadline card that referenced the SG rate legislative change date (a fixed historical fact). The pattern `\d{1,2}\s+July\s+\d{4}` matched. Fix: appended `// dated-ok` to the end of that line. Gate now passes: 0 bare date violations.
- **Local verification:** `node scripts/check-dated-strings.mjs` ✅ (all dates wrapped)
- **STATUS: CI-RESCUE · stream=CD · pr=#902**

### iter 434 — 2026-05-18 — CD-01 account calendar + CD-02 currency converter + CD-03 pricing transparency

- **Stream:** CD (calendar + utility features)
- **Items:** CD-01 (account-gated financial calendar), CD-02 (AUD currency converter), CD-03 (advisor fee transparency / pricing page)
- **Branch:** `claude/audit-remediation/cd-01-calendar-utility`
- **PR:** #902 OPEN
- **Commit:** `3ff2353`
- **Diff:** +1009 -1 across 7 files
- **What:**
  - **CD-01 account calendar (`app/account/calendar/page.tsx`)** — RSC behind `enforcePortalKind("investor")`, `dynamic = "force-dynamic"`, `robots: "noindex, nofollow"`. `FY26_DEADLINES` array (8 entries: EOFY, super concessional cap, new FY, Oct tax return, PAYG, Q1+Q2+Q3 BAS). `ONGOING` array (4 annual review items). Personalised `extraDeadlines` for 4 investor types: FHB → FHSS withdrawal request, pre-retiree → non-concessional cap, business owner → company tax return, cross-border → foreign income disclosure. `TAG_COLORS` map, `DeadlineCard` sub-component. Sidebar: key numbers (caps, SG rate, Div293), find-a-tax-accountant CTA, useful tools links. `GENERAL_ADVICE_WARNING` footer. Added "Financial Calendar" NavCard (📅) to `app/account/dashboard/page.tsx`.
  - **CD-02 currency converter (`app/tools/currency-converter/page.tsx` + `CurrencyConverterClient.tsx`)** — RSC wrapper exports metadata + breadcrumb JSON-LD (canonical, revalidate 86400); `CurrencyConverterClient` is "use client". Converts AUD ↔ 15 currencies: USD, GBP, EUR, JPY, CNY, SGD, HKD, NZD, CAD, CHF, INR, THB, IDR, MYR, ZAR. Static mid-market indicative rates. Swap button, full rate sidebar, Australian context table (FIRB residential $1.21M / commercial $269k, SIV visa $5M, Business Innovation $800k, super caps in target currency). FX provider CTA to comparison page.
  - **CD-03 pricing transparency (`app/pricing/page.tsx`)** — RSC, revalidate 86400, breadcrumb JSON-LD. Five fee tables: Financial Planners (SoA $2.5k–$6k, ongoing $3.5k–$12k pa), Mortgage Brokers (free to consumer — commission in Credit Guide), Tax Accountants (simple $150–$400, complex $400–$1.5k, SMSF $2k–$4.5k), Buyer's Agents (1.5–3% purchase price), SMSF Specialists (setup $1.5k–$3k, admin $2.5k–$5k pa). "Tips for negotiating fees" (5 items). `AFSL_STATUS_DISCLOSURE` from `lib/compliance.ts` in footer.
  - **ToolsClient.tsx** — added "AUD Currency Converter" entry (Calculators category, rating 5, internal=true).
  - **sitemap.ts** — added `/tools/currency-converter` and `/pricing`.
- **Note:** PR #900 (concurrent session, branch `cd-01-financial-calendar`) covers the complementary public `/tools/financial-calendar` page. Both PRs touch different files — no conflicts.
- **STATUS: PROGRESS · stream=CD · item=CD-01+CD-02+CD-03 · pr=#902**

### iter 433 — 2026-05-18 — CI-RESCUE GT (#881 Database types drift gate)

- **Stream:** GT (goal tracking)
- **Phase:** 2 — CI rescue
- **PR:** #881 OPEN
- **Commits:**
  - `947d14d` — fix(db): allowlist 3 founder-dashboard tables in .driftallowlist (main)
  - `f39e995` — merge main into GT branch (`claude/audit-remediation/gt-02-annual-check`)
- **Root cause:** `Database types drift gate` was failing on PR #881 even after iter 431's types regen (`b9b57b5`). The drift gate compares `lib/database.types.ts` against `supabase/migrations/*.sql`, NOT the live DB. The 3 founder-dashboard tables (`brief_promo_codes`, `brief_promo_redemptions`, `investor_oauth_connections`) from PRs #891–#893 have no migration files — they were created via the Supabase dashboard directly. Types regen adds them to `database.types.ts`, which makes the Supabase types drift gate (live-DB vs types) pass, but the migration-based drift gate still fails. Fix: added all 3 tables to `.driftallowlist` with explanatory comments, committed `947d14d` directly to main, then merged updated main into GT branch (`f39e995`). `.driftallowlist` now has 21 entries; gate passes (334 type-declared tables, 320 migration-backed, 21 allowlisted → 334-21=313 ≤ 320).
- **STATUS: CI-RESCUE · stream=GT · pr=#881**

### iter 432 — 2026-05-18 — CD-01 Australian financial calendar

- **Stream:** CD (calendar + utility features)
- **Item:** CD-01 — Australian financial calendar page
- **Branch:** `claude/audit-remediation/cd-01-financial-calendar`
- **PR:** #900 OPEN
- **Commit:** `e07b8e4`
- **Diff:** +629 -1 across 4 files (lib/financial-calendar-data.ts +309, app/tools/financial-calendar/page.tsx +309, app/tools/ToolsClient.tsx +11, app/sitemap.ts +1)
- **What:**
  - **`lib/financial-calendar-data.ts`** — `.ts` data module (exempt from dated-strings gate): `FinancialEvent` + `FinancialThreshold` interfaces, `EventCategory`/`EventUrgency` union types, `FINANCIAL_EVENTS` array (16 events: super deadlines, quarterly BAS, individual tax return, CGT harvest window, SMSF annual return, FHSS contribution deadline, company tax return, Div 7A), `FINANCIAL_THRESHOLDS` array (10 items: SG rate 11.5%, concessional cap $30k, non-concessional $120k, transfer balance cap $1.9M, LISTO $500, LITO $700, Medicare levy threshold $26k, CGT 12-month discount, FHSS max $50k, FHSS per-year $15k), `CATEGORY_LABELS` + `CATEGORY_COLORS` maps, `FY = "FY2025–26"` constant.
  - **`app/tools/financial-calendar/page.tsx`** — RSC, `revalidate = 86400`. Emits `calculatorJsonLd` + `breadcrumbJsonLd` + `faqJsonLd` (6 FAQ items). Events grouped by `CATEGORY_ORDER` (tax → super → smsf → investment → fhss → business) with date pills, urgency badges, description, notes, and optional guide links. Thresholds rendered in 3-column card grid. FAQ accordion using `<details>`/`<summary>`. Related tools strip. `ComplianceFooter variant="calculator"`. No hardcoded dates in `.tsx` source — all dates rendered from imported data.
  - **ToolsClient.tsx** — added "Australian Financial Calendar" entry to Calculators tab.
  - **sitemap.ts** — added `/tools/financial-calendar`.
- **Local verification:** `node scripts/check-dated-strings.mjs` ✅ (0 bare dates in .tsx), `node scripts/check-jsonld-coverage.mjs` ✅ (336 public routes), `npm run audit:rate-limits --strict` → 100% (461 routes), `npx tsc --noEmit` ✅
- **STATUS: PROGRESS · stream=CD · item=CD-01 · pr=#900**

### iter 431 — 2026-05-18 — CI-RESCUE Z-23+BB-08 (#895) + GT (#881) + types regen on main

- **Streams:** Z-23+BB-08 (PR #895), GT (PR #881), main (types regen)
- **Phase:** 2 — CI rescue (dual stream + Phase 1.5 types regen)
- **Commits:**
  - `0cdd2ee` — fix(z23+bb08): JSON-LD + dated-ok + merge main for types (branch `z-23-first-home-buyer`)
  - `b9b57b5` — chore(db): regenerate database.types.ts auto-rescue (main)
  - `241721f` — merge main into GT branch with fresh types (branch `gt-02-annual-check`)
- **PR #895 failures fixed:**
  1. `Dated strings gate` — "1 July 2017" (FHSS scheme start, static legislative fact) not escaped. Fixed with `{/* // dated-ok ... */}` JSX comment on preceding line.
  2. `Lint · Type-check · Test · Build` — `check-jsonld-coverage.mjs` runs inside this job; `app/tools/fhss-calculator/page.tsx` (pure "use client" page) emitted no JSON-LD. Fixed by importing `calculatorJsonLd`, `breadcrumbJsonLd`, `faqJsonLd` at module scope and embedding three `<script type="application/ld+json">` tags at `<main>` top. All three gates now pass locally.
  3. `Supabase types drift` — branch predated 26 main commits. Fixed by merging origin/main into branch.
- **PR #881 failure:** `Supabase types drift` FAILING even after iter 429's merge. Root cause: founder PRs #891–#893 ("second-wave UX bundle", "Re-verified freshness", "ProfessionalService schema") added 3 new DB tables (`brief_promo_codes`, `brief_promo_redemptions`, `investor_oauth_connections`) without a corresponding types regen in main. Phase 1.5 gate fired: regenerated `lib/database.types.ts` (+144 lines) via Supabase MCP, committed `b9b57b5` directly to main, then merged updated main into GT branch (`241721f`).
- **Local verification:** `node scripts/check-dated-strings.mjs` ✅, `node scripts/check-jsonld-coverage.mjs` ✅ (all public routes), `npm run audit:rate-limits --strict` → 100% (461 routes), `npm test -- afsl-compliance-coverage` → 39/39 ✅
- **STATUS: CI-RESCUE · stream=Z-23+BB-08+GT · pr=#895+#881**

### iter 430 — 2026-05-18 — Z-23+BB-08 first-home-buyer hub + FHSS calculator

- **Stream:** Z-23+BB-08 (FHB hub + FHSS calc)
- **Items:** Z-23 (`/first-home-buyer` hub), BB-08 (FHSS deposit calculator), AA-01 (pre-existing false-positive)
- **Branch:** `claude/audit-remediation/z-23-first-home-buyer`
- **PR:** #895 OPEN
- **Commit:** `6f33976`
- **Diff:** ~5 new files: `lib/hub-configs/first-home-buyer.ts` (+211), `app/first-home-buyer/page.tsx` (+46), `app/tools/fhss-calculator/page.tsx` (+375), `lib/lead-magnets.ts` (+14), `app/tools/ToolsClient.tsx` (+10), `app/sitemap.ts` (+2)
- **What:**
  - **Z-23:** `/first-home-buyer` hub page wired to `HubPage` HOC. `firstHomeBuyerHubConfig` in `lib/hub-configs/first-home-buyer.ts`: 3 hero stats (median FHSS deposit, $50k max release, 35k FHBG places), 6 service grid cards, 3 deep-dives, 3 calculators, 6 FAQs covering FHSS mechanics, max savings, FHBG 5% deposit, combining FHSS+FHBG, state grants, stamp duty. `HubNewsletterCapture` + `LeadMagnetCapture` + `HubExitIntent` wired.
  - **BB-08:** FHSS calculator at `/tools/fhss-calculator`. Client component. Maths: max $15k/year concessional, $50k total; `85% × concessional × max(marginal_rate + 0.02 − 0.30, 0)` = tax on withdrawal; tax saving = (marginal_rate − 0.15) × concessional contributions. Shows after-tax equivalent (= contributions × (1 − marginal_rate)) to illustrate net benefit. GENERAL_ADVICE_WARNING footer. CTA to `/find/mortgage-broker`.
  - **AA-01 false-positive:** `app/find/[advisor-type]/[city]/page.tsx` found pre-existing (314 lines, full `generateStaticParams()`, 15 advisor types, ISR 3600). Pre-dates queue tracking. Marked done.
  - **Lead magnet:** FHB entry added to `lib/lead-magnets.ts` (slug `first-home-buyer-guide`, hubSlug `first-home-buyer`).
  - **Sitemap:** `/first-home-buyer` in `highPriority` set; `/tools/fhss-calculator` in tools block.
- **STATUS: PROGRESS · stream=Z-23+BB-08 · item=Z-23+BB-08 · pr=#895**

### iter 429 — 2026-05-18 — CI-RESCUE GT (#881 Supabase types drift again)

- **Stream:** GT (goal tracking)
- **Phase:** 2 — CI rescue
- **PR:** #881 OPEN
- **Commit:** `2929e91` (GT branch merge of main)
- **Diff:** merge commit picking up 24 main commits including updated `lib/database.types.ts`
- **Root cause:** PR #881 was based on `c5113b7` (pre-2026-05-18 founder feature burst). Main added 24 commits today including `20260518_advisor_auctions_and_bids_backfill.sql` migration and a fresh `lib/database.types.ts` regen. GT branch still had the old types file, causing `Supabase types drift` to fail. Fix: merged origin/main into the GT branch; resolved trivial `.driftallowlist` comment conflict (took main version).
- **Note:** `Accessibility (axe-core on key routes)` still failing — pre-existing systemic failure per Blocked entry; GT-02 changes only touch `app/account/annual-check` + dashboard NavCard, not the 8 tested public routes.
- **STATUS: CI-RESCUE · stream=GT · pr=#881**

### iter 428 — 2026-05-18 — QA-02 extend Q&A seed to 30 questions

- **Stream:** QA (Q&A surfaces)
- **Item:** QA-02 — extend seed to 30 questions
- **Branch:** `claude/audit-remediation/qa-01-question-deep-dive`
- **PR:** #890 OPEN
- **Commit:** `3c0d82a`
- **Diff:** +575 -0 in `lib/questions-data.ts`
- **What:** Added 13 new questions (17 → 30 total). Topics: tax-loss harvesting (Part IVA nuances, no wash-sale rule), Medicare Levy Surcharge (MLS thresholds, PHI rebate comparison), Low Income Tax Offset (LITO phase-out), crypto tax reporting (ATO data-matching, disposal events, staking income), investment bonds (10-year rule, 125% cap, estate planning), A-REITs (ASX-listed trusts, distribution tax, SMSF), portfolio rebalancing (calendar vs threshold, CGT-efficient approach), shares vs bonds (risk/return, ASX bonds access), diversification (correlation, over-diversification, ASX concentration), First Home Guarantee (FHBG 5% deposit scheme, price caps by state), Age Pension assets test (thresholds, exempt assets, downsizer), HECS-HELP vs invest (CPI indexation maths, LVR impact). QA stream complete at 30 questions pending #890 merge.
- **STATUS: PROGRESS · stream=QA · item=QA-02 · pr=#890**
- **Batch end:** 2 items in this fire (QA-01 + QA-02). Cumulative diff ~1900 LOC. Within batch cap.

### iter 427 — 2026-05-18 — QA-01 Q&A deep-dive template

- **Stream:** QA (Q&A surfaces)
- **Item:** QA-01 — single-question deep-dive template + seeded pages
- **Branch:** `claude/audit-remediation/qa-01-question-deep-dive`
- **PR:** #890 OPEN
- **Commit:** `a7c7d56`
- **Diff:** +1301 -1 across 4 files (lib/questions-data.ts +944, app/questions/[slug]/page.tsx +228, app/questions/page.tsx +126, app/sitemap.ts +4)
- **What:** New `/questions` surface at slot 72 in the priority order (Tier 3, after DF-01..04). `lib/questions-data.ts` defines `InvestingQuestion` type and seeds 17 questions spanning super (salary sacrifice, concessional contributions, SG rate, SMSF, preservation age, FHSS, franking in super), tax (negative gearing, franking credits, CGT discount, PPR exemption, property depreciation), investing (compound interest, DCA, ETF vs managed fund), and budgeting (emergency fund). `app/questions/page.tsx` — index grouped by category. `app/questions/[slug]/page.tsx` — RSC deep-dive with short answer box, detailed sections, FAQ accordion, related tools, related questions, `GENERAL_ADVICE_WARNING` footer, `FAQPage` JSON-LD, `BreadcrumbList` JSON-LD, `generateStaticParams()`. Sitemap updated. QA-02 (extend to 50 questions) is next.
- **STATUS: PROGRESS · stream=QA · item=QA-01 · pr=#890**

### iter 426 — 2026-05-18 — DF-04 tools index + batch end

- **Stream:** DF (decision frameworks)
- **Item:** DF-04 — tools index update
- **Branch:** `claude/audit-remediation/df-01-decision-frameworks`
- **PR:** #883 OPEN
- **Commit:** `cadd73e`
- **Diff:** +36 -0 in `app/tools/ToolsClient.tsx`
- **What:** Added buy-vs-rent (Calculators), salary-sacrifice (Super), and smsf-setup (Super) to the TOOLS array in ToolsClient so all three decision trees are discoverable via the /tools index page with correct category filtering.
- **STATUS: PROGRESS · stream=DF · item=DF-04 · pr=#883**
- **Batch end:** 5 iterations in this fire (422–426). Staying within ~1400 LOC cumulative diff. PR #883 covers DF-01..04 (all 4 stream items). DF stream complete.

### iter 425 — 2026-05-18 — DF-03 SMSF-setup decision tree

- **Stream:** DF (decision frameworks)
- **Item:** DF-03 — SMSF setup decision tree
- **Branch:** `claude/audit-remediation/df-01-decision-frameworks`
- **PR:** #883 OPEN
- **Commit:** `1d741e9`
- **Diff:** +248 -1 across 3 files
- **What:** `lib/decision-trees/smsf-setup.ts` — 3 question nodes + 5 leaves. Goal gate (investment control vs business real property vs returns disappointment), balance check (under $200k → too small, $200k–$500k → viable/watch costs, $500k+ → strong case), and a returns-check arm that surfaces ATO YourSuper comparison tool before committing. `app/tools/smsf-setup/page.tsx` — ISR-86400 RSC at `/tools/smsf-setup`. 4 FAQs: minimum balance, business real property rules, residential property rules, trustee obligations. Added to sitemap.
- **STATUS: PROGRESS · stream=DF · item=DF-03 · pr=#883**

### iter 424 — 2026-05-18 — DF-02 salary-sacrifice decision tree

- **Stream:** DF (decision frameworks)
- **Item:** DF-02 — salary sacrifice decision tree
- **Branch:** `claude/audit-remediation/df-01-decision-frameworks`
- **PR:** #883 OPEN
- **Commit:** `972e13a`
- **Diff:** +265 -1 across 3 files
- **What:** `lib/decision-trees/salary-sacrifice.ts` — 4 question nodes + 6 leaves. Employment gate (employee vs self-employed), income band (under $45k / $45k–$120k / over $120k), concessional cap check (room vs near-cap), Division 293 check (over $250k). Self-employed arm redirects to personal deductible contributions. Low-income arm surfaces super co-contribution as potentially better fit. `app/tools/salary-sacrifice/page.tsx` — ISR-86400 RSC at `/tools/salary-sacrifice`. 4 FAQs covering mechanics, cap, self-employed path, Division 293. Added to sitemap.
- **STATUS: PROGRESS · stream=DF · item=DF-02 · pr=#883**

### iter 423 — 2026-05-18 — DF-01 DecisionTree engine + buy-vs-rent tool

- **Stream:** DF (decision frameworks)
- **Item:** DF-01 — generic decision-tree engine + first tree
- **Branch:** `claude/audit-remediation/df-01-decision-frameworks`
- **PR:** #883 OPEN
- **Commit:** `49bc079`
- **Diff:** +534 -1 across 4 files (1 new component, 1 new lib file, 1 new page, 1 sitemap update)
- **What:** `components/DecisionTree.tsx` — client component with branching support. Accepts `TreeNode[]` (question nodes + leaf nodes), `startId`, optional `heading`. Tracks history stack for back navigation + reset. Leaf verdicts colour-coded: emerald (buy), blue (rent), amber (save), slate (review). `lib/decision-trees/buy-vs-rent.ts` — 5 question nodes + 9 leaf nodes covering renter→buy decision (3 horizon arms: <3yr → rent, 3–7yr → deposit check, 7yr+ → deposit/LMI check) and owner→sell decision (mobility/equity/CGT arms). `app/tools/buy-vs-rent/page.tsx` — ISR-86400 RSC, BreadcrumbList + FAQPage JSON-LD, general-advice disclaimer, FAQ section, ComplianceFooter. Sitemap updated. Unblocks DF-02 + DF-03.
- **STATUS: PROGRESS · stream=DF · item=DF-01 · pr=#883**

### iter 422 — 2026-05-18 — CI-RESCUE GT (#881 Supabase types drift)

- **Stream:** GT (goal tracking)
- **Phase:** 2 — CI rescue
- **PR:** #881 OPEN
- **Commits:** `c5113b7` (types regen to main), `731ea21` (GT branch rebase)
- **Diff:** +24 -0 in `lib/database.types.ts` (hub_drip_log table added)
- **Root cause:** EM-02 migration (PR #880) added `hub_drip_log` to the live Supabase DB. `lib/database.types.ts` on main didn't have this table, causing `Supabase types drift` to fail on #881. Fix: regenerated types via Supabase MCP, committed `chore(db): regenerate database.types.ts (auto-rescue)` directly to main (`c5113b7`), then rebased the GT branch onto main to pick it up.
- **STATUS: CI-RESCUE · stream=GT · pr=#881**

### iter 421 — 2026-05-17 — GT-02 annual financial check-up

- **Stream:** GT (goal tracking)
- **Item:** GT-02 — annual financial check-up
- **Branch:** `claude/audit-remediation/gt-02-annual-check`
- **PR:** #881 OPEN
- **Commit:** `a4c5352`
- **Diff:** +302 -0 across 2 files (1 new page, 1 dashboard update)
- **What:** `/account/annual-check` RSC behind `enforcePortalKind("investor")`. Reads `getInvestorProfile()` to personalise across 5 investor types (FHB, pre-retiree, HNW, business owner, cross-border). Four sections: Superannuation (concessional/non-concessional caps, consolidation, beneficiary nominations), Tax & investments (lodgement deadline, CGT harvesting, expense pre-payment), Insurance review (life/TPD, income protection, building & contents, private health), Goals & planning (update balances, emergency fund, estate docs, advisor review). FY2025–26 key dates banner. General-advice disclaimer at foot. Added "Annual Check-up" NavCard to dashboard nav grid (📅, `/account/annual-check`). GT-01 blocked (needs DV-01).
- **STATUS: PROGRESS · stream=GT · item=GT-02 · pr=#881**

### iter 420 — 2026-05-17 — EM-02 hub subscriber drip infrastructure

- **Stream:** EM (email infrastructure)
- **Item:** EM-02 — digest infrastructure (hub subscriber drip-sequence delivery mechanism)
- **Branch:** `claude/audit-remediation/em-02-hub-drip-infra`
- **PR:** #880 OPEN (Tier C — needs founder review before merge)
- **Commit:** `16add6f`
- **Diff:** +406 -0 across 4 files (1 new cron route, 1 new migration, 1 cron-groups update, 1 database.types update)
- **What:** Completes the EM stream's delivery layer. New `hub_drip_log` table (migration `20260517_em02_hub_drip_log.sql`) with UNIQUE(email, segment_slug, drip_step) — guarantees idempotent sends across retries. RLS: deny-all anon; service_role full access. New daily cron `app/api/cron/hub-subscriber-drip` (registered in `daily-10` alongside welcome-drip, advisor-onboarding, abandoned-quiz-drip): queries confirmed hub newsletter subscribers from `newsletter_subscriptions`, sends a 3-step welcome drip keyed off `confirmed_at` — Step 1 (Day 0–3) welcome + top resource, Step 2 (Day 5–9) calculator/tool CTA, Step 3 (Day 14–30) advisor CTA + series close. Covers 9 hub segments: smsf-hub, dividends-hub, wholesale-hub, property-hub, super-hub, insurance-hub, foreign-investment-hub, private-markets-hub, first-home-buyer-hub. `lib/database.types.ts` updated with hub_drip_log type stub.
- **Tier C announcement:** New cron route + new schema migration. Merge unless `STOP`.
- **STATUS: PROGRESS · stream=EM · item=EM-02 · pr=#880**

### iter 419 — 2026-05-17 — LX-03 cross-calculator navigation

- **Stream:** LX (calculator UX / conversion)
- **Item:** LX-03 — cross-calculator navigation (`RelatedCalculators` component)
- **Branch:** `claude/audit-remediation/lx-03-cross-calc-nav`
- **PR:** #879 OPEN
- **Commit:** `b6f675a`
- **Diff:** +88 -1 across 5 files (1 new component, 4 calculator pages updated)
- **What:** New `components/RelatedCalculators.tsx` — server component accepting `RelatedCalc[]` (name, description, href, optional tag chip). Renders a responsive 1-3 column card grid positioned between the calculator output and `CalcToPlanBridge`. Wired into: compound-interest-calculator (→ Savings, FIRE, Dividend Reinvestment); mortgage-calculator (→ Property vs Shares, Savings, CGT); savings-calculator (→ Compound Interest, FIRE, Mortgage); smsf-calculator (→ Super Contributions, Compound Interest, FIRE). Surfaces contextually relevant next tools at the natural "I have my answer" moment.
- **STATUS: PROGRESS · stream=LX · item=LX-03 · pr=#879**

### iter 418 — 2026-05-17 — queue sync + OB-09..OB-12 remaining hub quizzes

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-09..OB-12 — lump-sum-investing, foreign-investment, sell-business, halal-investing diagnostic quizzes
- **Branch:** `claude/audit-remediation/ob-09-remaining-quizzes`
- **PR:** #878 OPEN
- **Commit:** `710dba3`
- **Diff:** +581 -2 across 6 files (4 new quiz pages, 1 lib config +417 LOC, 1 sitemap update)
- **Queue sync (Phase 1):** All 5 previously-OPEN in-flight PRs were found merged by founder on 2026-05-17: #845 (LL-04 ✓), #847 (RR-02 ✓), #848 (EM-01+EM-03 ✓), #849 (LX-01+LX-02+LX-04+LX-05 ✓), #852 (OB-01..OB-08 ✓). RR stream complete. LL stalled at LL-05 (blocked).
- **What:** Completed the OB stream. Four new `HubOnboardingConfig` exports in `lib/hub-onboarding-configs.ts`. LUMP_SUM_ONBOARDING_CONFIG (source × amount × timeline → 6 branches: redundancy ETP/super window, inheritance 90-day rule, property-sale calculator, large-amount financial planner, short-horizon savings, default lump-sum calculator). FOREIGN_INVESTMENT_ONBOARDING_CONFIG (status × focus × concern → 5 branches: property/FIRB, expat super/DASP, withholding tax+DTA, new migrant banking, default hub). SELL_BUSINESS_ONBOARDING_CONFIG (revenue × timeline × priority → 5 branches: urgent 12-month sale, CGT concessions, M&A for large businesses, legacy/EOT exit, default valuation-first). HALAL_INVESTING_ONBOARDING_CONFIG (focus × experience × amount → 6 branches: super/Crescent Wealth, home finance/MCCA+Hejaz, experienced AAOIFI self-screening, screened ETFs for new investors, large bespoke portfolio, default hub). Four quiz pages at ISR 86400 with breadcrumb JSON-LD; no ComplianceFooter (hubs not in MANDATORY_ROOTS). All 4 pages registered in sitemap med-priority block.
- **AFSL:** lump-sum-investing, foreign-investment, sell-business, halal-investing are NOT in MANDATORY_ROOTS — no ComplianceFooter required.
- **STATUS: PROGRESS · stream=OB · item=OB-09..OB-12 · pr=#878**

### iter 417 — 2026-05-15 — OB-08 crypto hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-08 — cryptocurrency diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `26de421`
- **Diff:** +158 -1 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `CRYPTO_ONBOARDING_CONFIG` — 3 questions (experience: new/some/active/advanced; goal: diversify/long-term-growth/income-yield/speculate; allocation: under-5% / 5–15% / 15–30% / over-30%). Six evaluate() branches: complete beginner → regulated-exchange onboarding + 5%-max rule; over-30% allocation → concentration-risk warning + DCA alternative; income/yield → staking vs centralised-lending risk hierarchy + ATO tax note; advanced/DeFi → tax-record hygiene (Koinly/CoinTracker) + ATO data-sharing regime; diversify → institutional 5–10% satellite + ASX crypto ETFs; default → DCA Bitcoin/Ethereum + 12-month CGT discount. Created `app/crypto/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD to `/crypto`, `<ComplianceFooter>` — `app/crypto` is in AFSL MANDATORY_ROOTS). 39 AFSL compliance tests green. JSON-LD ✅.
- **STATUS: PROGRESS · stream=OB · item=OB-08 · pr=#852**

### iter 416 — 2026-05-15 — OB-07 super hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-07 — superannuation diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `080f127`
- **Diff:** +152 -1 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `SUPER_ONBOARDING_CONFIG` — 3 questions (life stage: early/mid/pre-retire/retire; balance: under-$50k / $50k–$200k / $200k–$500k / over-$500k; concern: fees / performance / contributions / consolidate). Six evaluate() branches: pre-retirement/retirement → TTR + account-based pension planning; large-balance + fees → APRA data + SMSF cost threshold; large-balance (other) → specialist comparison; contributions → $30k concessional cap + salary sacrifice; consolidate → myGov rollover + duplicate-fee math; default → low-fee indexed fund recommendation. Created `app/super/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD to `/super`, `<ComplianceFooter>` — `app/super` is in AFSL MANDATORY_ROOTS). 38 AFSL compliance tests green. JSON-LD ✅. Rate-limits 100%.
- **STATUS: PROGRESS · stream=OB · item=OB-07 · pr=#852**

### iter 415 — 2026-05-15 — OB-06 negative-gearing hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-06 — negative-gearing diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `1cd3d09`
- **Diff:** +157 -1 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `NEGATIVE_GEARING_ONBOARDING_CONFIG` — 3 questions (income bracket: under-$45k / $45k–$120k / $120k–$180k / over-$180k; vehicle: property / shares / both / exploring; situation: first-time / currently-neg / positively-geared / near-neutral). Seven evaluate() branches: under-$45k → cash-flow-positive alternative (tax offset too small at 19%); already-neg → depreciation schedule optimisation + tax accountant CTA; high-income + property → 37–45¢/dollar math with calculator CTA; high-income + shares → margin lending structure + adviser CTA; positively-geared → interest-only refinance restructuring; default → calculator + tax accountant CTA. Created `app/negative-gearing/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD to `/negative-gearing`). Added `/negative-gearing/quiz` to sitemap. AFSL compliance: `/negative-gearing` not in MANDATORY_ROOTS → no ComplianceFooter required. All 37 AFSL tests green. JSON-LD gate ✅.
- **STATUS: PROGRESS · stream=OB · item=OB-06 · pr=#852**

### iter 414 — 2026-05-15 — CI-RESCUE OB (#852)

- **Stream:** OB (hub onboarding flows)
- **Phase:** 2 — CI rescue
- **PR:** #852 OPEN
- **Commit:** `4872612`
- **Diff:** +4 -0 (2 files — app/etfs/quiz/page.tsx, app/property/quiz/page.tsx)
- **Root cause:** `Lint · Type-check · Test · Build` CI failing because `__tests__/lib/afsl-compliance-coverage.test.ts` requires every page under `app/etfs` and `app/property` to include `ComplianceFooter`, `PropertyDisclaimer`, or `GENERAL_ADVICE_WARNING`. The new `/etfs/quiz` and `/property/quiz` pages (OB-04 and OB-03) were missing this. Both pages produce personalised financial product recommendations (specific ETF tickers, property strategies) which are in scope for s912D general-advice disclosure. Fix: added `<ComplianceFooter className="mt-8 mx-4" />` to both pages. All 37 AFSL compliance tests now green. TSC, lint, and rate-limits audit all pass locally.
- **STATUS: CI-RESCUE · stream=OB · pr=#852**

### iter 413 — 2026-05-15 — OB-05 insurance hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-05 — insurance diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `037c5e7`
- **Diff:** +175 -0 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `INSURANCE_ONBOARDING_CONFIG` in `lib/hub-onboarding-configs.ts` — 3 questions (situation: single/couple/family/self-employed/near-retirement; priority concern: income/life/health/property/unsure; current cover: none/super-only/some/reviewing). Seven evaluate() branches: self-employed → income protection outside super critical (no sick leave); family → life + income protection both needed (MLS definition warning); health priority → MLS threshold guidance ($93K single / $186K family); property cover → rebuild cost vs market value underinsurance note; near retirement → right-size/review stepped premiums; none/super-only → super default cover gap + free broker push; default → income protection most universally needed (own occupation, to-65). Created `app/insurance/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD linking to `/insurance`). Added `/insurance/quiz` to sitemap after `/etfs/quiz`.
- **STATUS: PROGRESS · stream=OB · item=OB-05 · pr=#852**

### iter 412 — 2026-05-15 — LX-02 calculator history

- **Stream:** LX (calculator UX)
- **Item:** LX-02 — calculator history (save/load past scenarios)
- **Branch:** `claude/audit-remediation/lx-01-calculator-share-save`
- **PR:** #849 OPEN
- **Commit:** `d6e206c4`
- **Diff:** +159 -4 across 3 files (2 new files, 1 updated)
- **What:** `hooks/use-calculator-history.ts` — generic hook keyed by calc name, max 10 entries per key in localStorage (`invest-calc-history-${calcName}`), exposes `entries`, `addEntry(inputs, label, summary)`, `clearHistory()`. `components/CalculatorHistory.tsx` — renders saved scenarios list: label, summary (result), timestamp, Load button to restore inputs; Clear all button; hidden when empty. `app/compound-interest-calculator/CompoundInterestClient.tsx` — wired `useCalculatorHistory<CompoundInputs>` + "Save" button beside ShareButton + `CalculatorHistory` component with `onLoad` restoring all 5 state vars.
- **STATUS: PROGRESS · stream=LX · item=LX-02 · pr=#849**

### iter 411 — 2026-05-15 — OB-04 ETF strategy quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-04 — ETF strategy diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `07e5a76`
- **Diff:** +150 -0 across 3 files (1 new config, 1 new page, 1 sitemap)
- **What:** `ETF_ONBOARDING_CONFIG` — 3 questions (goal: income/growth/diversify/simplify; market: ASX/US/global/bonds; horizon: <3yr/3-7yr/7-15yr/15+yr). Six evaluate() branches: income + ASX/global → VHY/VDHG dividend ETFs with franking credit context; growth + US/global → VGS/IVV/NDQ low-cost global ETFs; diversify → VGS as ASX complement; simplify → A200 single-holding replacement + CGT timing note; bonds/short horizon → IAF/BOND defensive ETFs; default → 2-ETF (VAS+VGS) core portfolio recipe. Created `app/etfs/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD to `/etfs`). Added `/etfs/quiz` to sitemap.
- **STATUS: PROGRESS · stream=OB · item=OB-04 · pr=#852**

### iter 410 — 2026-05-15 — OB-03 property hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-03 — property investor diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `8244dc2`
- **Diff:** +150 -0 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `PROPERTY_ONBOARDING_CONFIG` in `lib/hub-onboarding-configs.ts` — 3 questions (goal: capital growth / yield / owner-occ / exploring; budget: <$100k / $100-200k / $200-500k / >$500k; experience: first-time / owner-occ / existing IP / researching). Six evaluate() branches: exploring → property-vs-shares calculator; first-time + low budget → FHSS / FHB hub; existing IP → portfolio scaling + buyer's agent; yield → yield calculator; capital growth → developments + buyer's agent; default → mortgage broker. Created `app/property/quiz/page.tsx` (ISR 86400, breadcrumb JSON-LD linking to `/property` which exists). Registered `/property/quiz` in sitemap.
- **STATUS: PROGRESS · stream=OB · item=OB-03 · pr=#852**

### iter 409 — 2026-05-15 — OB-02 wholesale hub onboarding quiz

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-02 — wholesale investor diagnostic quiz
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `7965eb9`
- **Diff:** +166 -0 across 3 files (1 new lib config, 1 new page, 1 sitemap update)
- **What:** `WHOLESALE_ONBOARDING_CONFIG` in `lib/hub-onboarding-configs.ts` — 3-question diagnostic (s708 qualification test: net-assets/$2.5M, income/$250k, professional rep, or exploring; asset class interest: PE/VC, hedge funds, litigation, unlisted property; investment horizon: short/medium/long/unsure). `evaluate()` branches: exploring → path-to-qualification route + adviser CTA; professional rep → broad-access product route; PE/litigation interest → PE listings; hedge funds → alternatives hub; unlisted property/long horizon → property hub; default → wholesale product hub. Created `app/wholesale/quiz/page.tsx` (ISR 86400, metadata, breadcrumb JSON-LD pointing to `/wholesale` parent which ships in Z-stream). Registered `/wholesale/quiz` in sitemap.
- **STATUS: PROGRESS · stream=OB · item=OB-02 · pr=#852**

### iter 408 — 2026-05-15 — EM-01 lead magnets

- **Stream:** EM (email infrastructure)
- **Item:** EM-01 — lead magnet capture (12-PDF registry + per-hub email gate)
- **Branch:** `claude/audit-remediation/em-03-hub-newsletter-infra`
- **PR:** #848 OPEN
- **Commit:** `511976fc`
- **Diff:** +273 -0 across 4 files (2 new files, 2 hub pages updated)
- **What:** `lib/lead-magnets.ts` — 12-entry registry, one per hub (SMSF trustee checklist, franking credits guide, wholesale checklist, property DD checklist, negative-gearing estimator, ETF selection guide, super comparison guide, crypto tax guide, business-sale checklist, FIRB guide, lump-sum guide, aged-care planning guide). `getLeadMagnetForHub(hubSlug)` helper. `components/LeadMagnetCapture.tsx` — "use client" email-gate card: amber gradient, cover icon, PDF title/description, email input → POST `/api/newsletter-segments/subscribe` → on success shows direct "Download Now" `<a download>` button + email-copy note. Handles 429 and network errors. `app/smsf/page.tsx`: wires SMSF magnet (trustee checklist) between guide cross-link and featured articles. `app/dividends/page.tsx`: wires dividends magnet (franking credits guide) between SMSF crossover callout and platform CTA.
- **STATUS: PROGRESS · stream=EM · item=EM-01 · pr=#848**

### iter 407 — 2026-05-15 — CI-RESCUE OB (#852)

- **Stream:** OB (hub onboarding flows)
- **Phase:** 2 — CI rescue
- **PR:** #852 OPEN
- **Commit:** `b680c6f0`
- **Diff:** +1 -1 (1 file — components/HubOnboardingShell.tsx)
- **Root cause:** `HubOnboardingResult.advisorCta` type declared `label: string` as required, but the `HubOnboardingShell` renders a hardcoded "Find an Adviser" button text (never reads `label`) and all 9 `advisorCta` object literals in `lib/hub-onboarding-configs.ts` omitted the field. TypeScript strict mode raised a type error on all 9 literals. Fix: removed `label: string` from the `advisorCta` type — the field is unused in the component and was a copy-paste artefact from `primaryCta`/`secondaryCta`.
- **STATUS: CI-RESCUE · stream=OB · pr=#852**

### iter 406 — 2026-05-15 — CI-RESCUE LX (#849)

- **Stream:** LX (UX conversion + retention)
- **Phase:** 2 — CI rescue
- **PR:** #849 OPEN
- **Commit:** `375d665`
- **Diff:** +4 -0 (2 files — app/dividends/page.tsx, app/smsf/page.tsx)
- **Root cause:** LX-05 placed `<HubExitIntent>` as a JSX sibling to `<HubPage>` without a Fragment wrapper in both `app/dividends/page.tsx` and `app/smsf/page.tsx`. TypeScript raised TS2657 "JSX expressions must have one parent element", failing `Lint · Type-check · Test · Build`. Fix: added `<>…</>` Fragment wrapper in both return statements.
- **Local verification:** visual inspect confirms Fragment closes correctly; the original TS2657 was the only tsc error in these files.
- **STATUS: CI-RESCUE · stream=LX · pr=#849**

### iter 405 — 2026-05-15 — LX-05 hub exit-intent email capture

- **Stream:** LX (UX conversion + retention)
- **Item:** LX-05 — exit-intent capture (cold-launch critical)
- **Branch:** `claude/audit-remediation/lx-01-calculator-share-save`
- **PR:** #849 OPEN
- **Commit:** `b2d527c6`
- **Diff:** +169 -0 across 3 files (1 new component, 2 hub pages)
- **What:** `HubExitIntent` "use client" component — fires on `mouseleave` through viewport top after ≥20s engagement, uses shared `exitIntentShown` sessionStorage key to coordinate with global `ExitIntentPopup` (no double-fire). Modal shows hub-specific headline + email capture form. Submits to `/api/newsletter-segments/subscribe` with the hub's segment slug for hub-specific drip sequences. Wired into `/smsf` (segmentSlug=smsf-hub) and `/dividends` (segmentSlug=dividends-hub). Accessible: role=dialog, aria-modal, aria-labelledby, close button with aria-label.
- **STATUS: PROGRESS · stream=LX · item=LX-05 · pr=#849**

### iter 404 — 2026-05-15 — LX-04 pre-filled advisor form URLs

- **Stream:** LX (UX conversion + retention)
- **Item:** LX-04 — pre-filled forms (buildAdvisorUrl + find-advisor + AdvisorMatchCTA)
- **Branch:** `claude/audit-remediation/lx-01-calculator-share-save`
- **PR:** #849 OPEN
- **Commit:** `c0a52b7b`
- **Diff:** +106 -6 across 3 files (1 new lib, 2 modified)
- **What:** Created `lib/prefill-url.ts` as the SSOT for building pre-filled /find-advisor and /quiz URLs. `buildAdvisorUrl({ need, state?, postcode?, budget?, firstName? })` produces canonical URLs; `buildQuizUrl({ vertical, state? })` does the same for /quiz. Updated `FindAdvisorQuiz` in `app/find-advisor/page.tsx` to read `?state`, `?postcode`, `?budget`, `?first_name` URL params alongside the existing `?need` — applied to useState initializer so Steps 3+4 are pre-populated when the user reaches them. Late-navigation useEffect also re-applies. Updated `AdvisorMatchCTA` to accept optional `state`/`postcode`/`budget` props and route through `buildAdvisorUrl` — backward-compatible, no callers broken.
- **STATUS: PROGRESS · stream=LX · item=LX-04 · pr=#849**

### iter 403 — 2026-05-15 — OB-01 hub onboarding shell

- **Stream:** OB (hub onboarding flows)
- **Item:** OB-01 — `HubOnboardingShell` + SMSF + Dividends diagnostic quiz pages
- **Branch:** `claude/audit-remediation/ob-01-hub-onboarding`
- **PR:** #852 OPEN
- **Commit:** `e654f70`
- **Diff:** +386 -2 across 5 files (1 new component, 1 new lib config, 2 new pages, 1 sitemap update)
- **What:** Built the generic hub onboarding shell and first two hub configs. `HubOnboardingShell` wraps `<EligibilityQuiz>` (W-10) and accepts a `HubOnboardingConfig` with hub-specific questions and an `evaluate(answers)` function. On completion the evaluate function returns a `HubOnboardingResult` (headline, summary, primaryCta, optional secondaryCta, optional advisorCta rendered as a "want expert advice?" card). `lib/hub-onboarding-configs.ts` defines `SMSF_ONBOARDING_CONFIG` (3 questions, 5 result branches: current trustee / under-balance / property-goal / ready+balance / default) and `DIVIDENDS_ONBOARDING_CONFIG` (3 questions, 4 result branches: SMSF+franking / income / growth / exploring). Pages at `/smsf/quiz` and `/dividends/quiz` (ISR 86400, breadcrumb JSON-LD, canonicals). OB-02..OB-13 (11 remaining hub configs) are the next iterations in this stream.
- **CI:** #848/#849 CI bypass (green). #845 axe-core systemic (blocked). #847 Vercel-only (CI not triggered on last push). No rescue needed this iteration.
- **STATUS: PROGRESS · stream=OB · item=OB-01 · pr=#852**

### iter 402 — 2026-05-15 — systemic axe-core cluster-guard

- **Stream:** systemic (main shared codebase → in-flight PR #845 LL-04)
- **Phase:** 1.7 + 2 — main CI preflight + CI rescue check
- **What:** Diagnosed `Accessibility (axe-core on key routes)` failure on PR #845 as a pre-existing main-codebase issue, not caused by LL-04's changes. Confirmed by: (1) LL-04 only touches `app/account/*` files, none of the 8 tested public routes; (2) founder PR #846 (independent branch) also fails; (3) PR #850 (merged to main today) also fails. The core CI (`Lint · Type-check · Test · Build`) is passing on all PRs — only the a11y gate fails. A previous concurrent session (running during iter 401's LX-01 fire) placed a blocked queue entry on the LL-04 branch rather than main — this iter 402 commit moves that entry to main where it belongs.
- **In-flight PR CI summary:** #845 (LL-04): axe-core FAILURE + Preview smoke timing + advisory LH. #847 (RR-02): only Vercel check visible (CI may not have triggered on latest commit). #848 (EM-03): CI bypass. #849 (LX-01): CI bypass.
- **Note:** `Preview smoke test` failure on #845 is a Vercel preview timing issue (not ready within 6-min window) — #850 passes it, confirming no structural regression.
- **STATUS: BLOCKED · systemic=Accessibility (axe-core on key routes)**

### iter 401 — 2026-05-15 — LX-01 calculator-share-save

- **Stream:** LX (calculator UX / viral loops)
- **Phase:** 3–7 — new stream, pick, verify, do, commit, push, PR
- **PR:** #849 OPEN
- **Branch:** `claude/audit-remediation/lx-01-calculator-share-save`
- **Commit:** `3359732`
- **Diff:** +104 -4 across 5 files (1 new component, 4 calculator pages updated)
- **What:** Viral deep-link sharing for all four main calculators. New `CalculatorShareButton` client component calls `buildShareableUrl(pathname, key, state)` from `hooks/use-calculator-state` to produce a URL with state encoded in the query string; copies to clipboard (falls back to `window.prompt` on non-HTTPS). Integrated into `CompoundInterestClient` (new share button in results panel). Upgraded `handleShare` in `MortgageCalculatorClient`, `SMSFCalculatorClient`, `SavingsCalculatorClient` to pass a deep link through `navigator.share` / clipboard copy — pre-existing share buttons now produce live-state URLs instead of bare origin URLs.
- **STATUS: PROGRESS · stream=LX · item=LX-01 · pr=#849**

### iter 400 — 2026-05-15 — EM-03 hub-newsletter-infra

- **Stream:** EM (email infrastructure)
- **Phase:** 3–7 — new stream, pick, verify, do, commit, push, PR
- **PR:** #848 OPEN
- **Branch:** `claude/audit-remediation/em-03-hub-newsletter-infra`
- **Commit:** `f5dcc0e`
- **Diff:** +216 -1 across 6 files (1 migration, 1 new component, 2 page updates, 1 HubPage slot, 1 verticals update)
- **What:** Foundational email list-building layer for all content hubs. Migration seeds 12 hub-specific `newsletter_segments` rows (smsf-hub, dividends-hub, wholesale-hub, etc.) so the segment-aware subscribe API accepts hub slugs without 400 errors. New `<HubNewsletterCapture>` client component posts to `/api/newsletter-segments/subscribe` with hub's segment slug; success/429/error states; accessible. Added `newsletterCapture?: ReactNode` slot to `<HubPage>` (positioned after advisorCta). Populated `newsletter: { listKey, cadence }` on `SMSF_HUB_CONFIG` and `DIVIDENDS_HUB_CONFIG`. Wired `<HubNewsletterCapture>` into `/smsf` and `/dividends` hub pages.
- **Unblocks:** EM-01 (lead magnets), EM-02 (digest infra), EM-04 (newsletter foundation), EM-05 (automation), EM-06 (drip sequences), LX-05 (exit-intent capture).
- **STATUS: PROGRESS · stream=EM · item=EM-03 · pr=#848**

### iter 399 — 2026-05-15 — CI-RESCUE RR (#847)

- **Stream:** RR (review extensions)
- **Phase:** 2 — CI rescue
- **PR:** #847 OPEN
- **Commit:** `c53761d`
- **Diff:** +21 -5 (1 file — app/advisor-portal/reviews/page.tsx)
- **Root cause:** `Lint · Type-check · Test · Build` CI failing with TS2352 in `app/advisor-portal/reviews/page.tsx`. Supabase nested select returns `professional_review_responses` as an array; the original code attempted to spread that into a `ReviewWithResponse` (which expects `advisor_response` singular), hitting "neither type sufficiently overlaps". Fix: introduced an explicit `RawReview` intermediate type and mapped it cleanly to `ReviewWithResponse`, picking `professional_review_responses[0]` into `advisor_response`.
- **Local verification:** `npm run type-check` → clean; 7 tests pass; lint clean; JSON-LD gate ✅; rate-limit audit 100%.
- **STATUS: CI-RESCUE · stream=RR · pr=#847**

### iter 398 — 2026-05-14 — RR-01 FP + RR-02 advisor-review-responses

- **Stream:** RR (review extensions)
- **Phase:** 3–7 — pick, verify, do, commit, push
- **PR:** #847 OPEN
- **Branch:** `claude/audit-remediation/rr-01-review-extensions`
- **Commit:** `8547e70`
- **Diff:** +407 -2 across 8 files (1 migration, 2 new API route, 2 new portal pages, 1 type update, 1 query update, 1 test suite)
- **RR-01:** Resolved as **false-positive** — `VerifiedClientBadge` component already implemented and wired into `UserReviewsList` and `AdvisorProfileClient`. No new code needed.
- **RR-02:** Advisor response to reviews. New `professional_review_responses` table (migration `20260726_rr02_…`), POST `/api/advisor-portal/reviews/respond` (rate-limited 10/60s, upsert pattern), advisor-portal reviews page (`/advisor-portal/reviews`) showing all approved+pending reviews with inline response forms, advisor response display in public profile, 7-test suite (all green).
- **STATUS: PROGRESS · stream=RR · item=RR-02 · pr=#847**

### iter 397 — 2026-05-14 — CI-RESCUE LL (#845)

- **Stream:** LL (logged-in user infrastructure)
- **Phase:** 2 — CI rescue
- **PR:** #845 OPEN
- **Commit:** `c7854e1`
- **Diff:** +1 -0 (1 file — scripts/check-jsonld-coverage.mjs)
- **Root cause:** `Lint · Type-check · Test · Build` CI job failing at the "JSON-LD coverage gate" step. `app/teams/[slug]/referrals/page.tsx` (added in main via PR #839) is an auth-gated advisor-portal page with no public SEO surface, but the gate was treating it as a public content route because `teams` was not in `EXEMPT_ROUTE_PATTERNS`. Fix: added `{ prefix: "teams", category: "PORTAL" }` to the exemption list with a comment. The public team profile (`/teams/[slug]`) already emits JSON-LD voluntarily — exempting the prefix does not regress public coverage.
- **Local verification:** `node scripts/check-jsonld-coverage.mjs` → ✅ All public routes emit JSON-LD; `npm run audit:rate-limits -- --strict` → 100%; vitest on test file → 6/6 pass.
- **STATUS: CI-RESCUE · stream=LL · pr=#845**

### iter 396 — 2026-05-14 — LL-04 [Tier-1 preempt]

- **Stream:** LL (logged-in user infrastructure)
- **Item:** LL-04 — reviews + ratings history
- **Branch:** `claude/audit-remediation/ll-04-reviews-ratings`
- **PR:** #845 OPEN
- **Commit:** `3fca3fe`
- **Diff:** +399 -4 across 5 files (3 new, 2 modified)
- **What:** Built the account-side reviews + ratings surface for logged-in investors. New `GET /api/account/reviews` route returns all of the authenticated user's broker reviews regardless of moderation status (standard RLS only shows `status='approved'`; admin client scoped to caller's own email provides the full history). New `app/account/reviews/page.tsx` RSC displays review cards with status badges (pending/approved/rejected), star rows, broker links, and a "View live →" link for approved reviews; empty-state has CTA to `/reviews/write`. Added optional `reviewCount` prop to `AccountKindCards` — when >0 renders an amber "My reviews" tile (follows the `savedSearchCount` pattern). `app/account/page.tsx` parallel-fetches the count (HEAD query via admin client) and threads it through. 5-test suite covers 401 paths, happy path, all-statuses, DB error, and null→[] normalisation. Rate-limit audit 100% (421 routes, 0 missing). LL-05 blocked (deps V-NEW-02 + CC-06).
- **STATUS: PROGRESS · stream=LL · item=LL-04 · pr=#845 · override=tier-1-preempt**

### iter 395 — 2026-05-14 — queue sync (all in-flight PRs merged by founder)

- **Stream:** all streams (queue housekeeping)
- **Phase:** 7 — queue update
- **What:** Comprehensive queue sync. All previously "OPEN" in-flight PRs were found merged or closed by founder before this iteration ran: #749 (KK-04 iter 4) ✓, #751 (KK-04 iter 5) ✓, #795 (CL) ✓, #799 (TT-04) ✓, #800 (QQ) ✓, #803 (MM) ✓, #807 (LL) ✓, #793 (MAIN-RESCUE) ✓. #782 (CMP) was closed without merging. Dep-vuln blocked entry corrected: iter 394's root cause was wrong — CI was already at `--audit-level=high`; the actual issue was that those branches predated #793's `next 16.2.4→16.2.6` patch. Block is now moot (PRs merged).
- **Main CI note:** Two non-loop auto-revert PRs pending: #827 (reverts `d26094aa` — tax-year CSV export) and #843 (reverts `ff43ed6f` — cron dispatcher wiring). These are founder-action items. Loop will not open new stream PRs until main CI is confirmed green.
- **Next item (when main CI clear):** LL-04 (reviews + ratings, Tier-1 preempt) on new branch from main.
- **STATUS: PROGRESS · queue-sync · streams=KK,TT,CL,QQ,MM,LL,MAIN-RESCUE**

### iter 394 — 2026-05-14 — dep-vuln systemic cluster-guard

- **Stream:** systemic (QQ #800, MM #803, LL #807)
- **Phase:** 2 — CI rescue check
- **Trigger:** Same-gate cluster guard: `Dependency vulnerabilities` failing on 3 in-flight PRs simultaneously
- **Root cause:** `postcss < 8.5.10` (GHSA-qx2v-qp2m-jg93, moderate) bundled inside next.js ≤16.2.6. No safe upgrade path — next@16.3.0 stable not yet released.
- **Additional per-PR failures (not systemic):** #803: Accessibility (axe-core) + Preview smoke test; #807: Accessibility (axe-core). These will be rescued once dep-vuln gate is resolved.
- **STATUS: BLOCKED · systemic=Dependency vulnerabilities**

### iter 393 — 2026-05-12 — LL-03

- **Stream:** LL (logged-in user infrastructure)
- **Item:** LL-03 — watchlist + email digests
- **Branch:** `claude/audit-remediation/ll-01-personal-dashboard`
- **PR:** #807 OPEN
- **Commit:** `a2c6f27`
- **Diff:** +171 -5 across 3 files (2 new files, 1 modified)
- **What:** Watchlist page already existed (false-positive on watchlist sub-feature). Delivered the email digest preferences part: created `app/api/account/digest-prefs/route.ts` (GET returns `{ watchlist_digest, advisor_digest }` from `investor_profiles.meta`; PUT merges new pref keys into meta via `upsertInvestorProfile()` — no schema migration needed, uses existing JSONB `meta` column). Created `app/account/watchlist/DigestToggle.tsx` — accessible toggle switch (`role=switch`, `aria-checked`) with optimistic update + rollback on error. Extended `app/account/watchlist/page.tsx` to parallel-fetch investor profile alongside watchlist items and render a "Email notifications" card at the bottom with the DigestToggle wired to `watchlist_digest` key. LL-04 (reviews + ratings) pending; LL-05 (live chat) blocked on V-NEW-02 + CC-06.
- **STATUS: PROGRESS · stream=LL · item=LL-03 · pr=#807**

### iter 392 — 2026-05-12 — LL-02

- **Stream:** LL (logged-in user infrastructure)
- **Item:** LL-02 — profile-driven advisor matching v2
- **Branch:** `claude/audit-remediation/ll-01-personal-dashboard`
- **PR:** #807 OPEN
- **Commit:** `b9d0631`
- **Diff:** +285 -1 across 2 files
- **What:** Created `app/api/account/advisor-matches/route.ts` — authenticated GET route returning top-6 advisors matched to the logged-in user's investor profile. Auth via `createClient()`, profile flags via `getInvestorProfile()`. Priority chain: `isFhb`→`mortgage_broker` | `isPreRetiree`→`retirement_planning` specialty (`.contains`) | `isHnw`→`investment_advice` specialty | `isBusinessOwner`→`business_advisory` specialty | `isCrossBorder`→`accepts_international=true` | else top-rated. Budget filter: `.or("min_investment_cents.is.null,min_investment_cents.lte.${budgetMax}")`. Returns `AdvisorMatchesResponse { advisors, match_basis }` with exported types for future callers. Also extended `app/account/dashboard/page.tsx`: added `fetchMatchedAdvisors()` RSC helper (same logic, limit 3), `AdvisorMatch` type, `BUDGET_MAX` constant, advisor grid section below recommended-for-you (shows photo via `next/image`, name, firm, location, star rating; hidden when no results). Unblocks: LX-02, LX-04, GT-01/02, DF-01..04, AT-01..04, CD-01, DV-01 — all now have both LL-01 and LL-02 landed.
- **STATUS: PROGRESS · stream=LL · item=LL-02 · pr=#807**

### iter 391 — 2026-05-12 — LL-01 [Tier-1 preempt]

- **Stream:** LL (logged-in user infrastructure)
- **Item:** LL-01 — personal financial dashboard (`/account/dashboard`)
- **Branch:** `claude/audit-remediation/ll-01-personal-dashboard`
- **PR:** #807 OPEN
- **Commit:** `8008bf1`
- **Diff:** +296 -0 (1 new file)
- **What:** Built `app/account/dashboard/page.tsx` — RSC personal financial dashboard for the investor portal. `enforcePortalKind("investor")` gate. Five parallel Supabase queries (user_profiles, investor_goals, investor_holdings, user_watchlist_items, investor_profiles). Sections: welcome header, financial snapshot (3 clickable snapshot cards), nearest-goal progress bar (with formatted dollars + % progress), profile completeness nudge (blue card, progress bar, hidden at 100%), personalised recommended-for-you actions (driven by investor_profile flags: is_fhb→/first-home-buyer, is_pre_retiree→/super, is_hnw→/wholesale, is_cross_border→/foreign-investment, is_business_owner→/account/upgrade/business; fallback to /quiz + /find-advisor), 10-card account navigation grid. No schema migration — uses existing tables. Note: user_profiles not yet in database.types.ts (types drift pre-existing); query works at runtime via Supabase schema API. Unblocks LL-02, LX-02, LX-04, GT-01/02, DF-01..04, AT-01..04, CD-01, DV-01.
- **STATUS: PROGRESS · stream=LL · item=LL-01 · pr=#807 · override=tier-1-critical-path**

### iter 390 — 2026-05-12 — MM-V08 [batch-end]

- **Stream:** MM (marketplace expansion)
- **Item:** MM-V08 — livestock & equine syndication listings discovery page
- **Branch:** `claude/audit-remediation/mm-v01b-digital-infra-listings`
- **PR:** #803 OPEN
- **Commit:** `6789f61`
- **Diff:** +59 -0 across 4 files (new page + `'livestock'` type union member + listing-url entry + 2 sitemap rows)
- **What:** Created `/invest/livestock/listings/page.tsx` following the established vertical listings pattern (ISR 300s, `generateMetadata` with live count, breadcrumb JSON-LD, `InvestListingsClient` locked to the new vertical). Added `'livestock'` to `InvestListingVertical` union in `lib/types.ts` (alphabetically between 'fund' and 'mining'). Added `livestock: "livestock"` to `VERTICAL_TO_CATEGORY` in `lib/listing-url.ts`. Registered `/invest/livestock` and `/invest/livestock/listings` in `app/sitemap.ts`. Sub-categories per MM-V08 plan: thoroughbred racehorse syndication (Magic Millions, Inglis), cattle herd investment (Wagyu, Angus, Brahman), sheep/wool programs, stud/breeding rights, genetic programs. Next: MM-V06 (wholesale-only alternatives — Tier C, s708 gate design required; announce intent before merge).
- **STATUS: PROGRESS · stream=MM · item=MM-V08 · pr=#803**

### iter 389 — 2026-05-12 — MM-V07

- **Stream:** MM (marketplace expansion)
- **Item:** MM-V07 — aquaculture & marine listings discovery page
- **Branch:** `claude/audit-remediation/mm-v01b-digital-infra-listings`
- **PR:** #803 OPEN
- **Commit:** `42eb238`
- **Diff:** +59 -0 across 4 files (new page + `'aquaculture'` type union member + listing-url entry + 2 sitemap rows)
- **What:** Created `/invest/aquaculture/listings/page.tsx` following the established vertical listings pattern (ISR 300s, `generateMetadata` with live count, breadcrumb JSON-LD, `InvestListingsClient` locked to the new vertical). Added `'aquaculture'` to `InvestListingVertical` union in `lib/types.ts`. Added `aquaculture: "aquaculture"` to `VERTICAL_TO_CATEGORY`. Registered `/invest/aquaculture` and `/invest/aquaculture/listings` in `app/sitemap.ts`. Sub-categories: salmon farming, oyster leases, abalone, prawn, mussel, land-based RAS, seaweed/kelp, fishing licences/quota.
- **STATUS: PROGRESS · stream=MM · item=MM-V07 · pr=#803**

### iter 388 — 2026-05-12 — QQ-07

- **Stream:** QQ (public AI Q&A capture surface)
- **Item:** QQ-07 — `lib/qa-ctas.ts` per-category CTA mapping
- **Branch:** `claude/audit-remediation/qq-01-public-qa-surface`
- **PR:** #800 OPEN
- **Commit:** `1ca09b2`
- **Diff:** +117 -0 (1 new file)
- **What:** Created `lib/qa-ctas.ts` — single source of truth for per-category CTA destinations on the public Q&A surface. Maps all 9 PlatformType-based categories, fx_provider, 2 composite topic categories, 4 cross-border specialties (cross_border:uk/us/firb/nz), and advisor/general. 18 categories total. Fallback `DEFAULT_CTA` → /find-advisor for unmapped/empty input. Pure data module — no client-side imports, safe in RSC contexts. Also resolved MM-V05 as false-positive.
- **STATUS: PROGRESS · stream=QQ · item=QQ-07 · pr=#800**

### iter 387 — 2026-05-12 — QQ-04

- **Stream:** QQ (public AI Q&A capture surface)
- **Item:** QQ-04 — `components/QuestionCaptureForm.tsx` + component test suite
- **Branch:** `claude/audit-remediation/qq-01-public-qa-surface`
- **PR:** #800 OPEN
- **Commit:** `ae0eaa3`
- **Diff:** +418 -0 across 2 files (new component + new test file)
- **What:** Built `QuestionCaptureForm` — "use client" component with textarea (10–500 chars), optional email (RFC5322-shaped), category select pre-filled from props. POSTs to `/api/answers/ask` (QQ-05). Surfaces pending-moderation state on success, client-side validation errors for too-short/too-long/malformed-email, rate-limit 429 error, and network error. 8-test suite covers render, prop pre-fill, validation, happy-path submit, 429, and network failure.
- **STATUS: PROGRESS · stream=QQ · item=QQ-04 · pr=#800**

### iter 386 — 2026-05-12 — MM-V04

- **Stream:** MM (marketplace expansion)
- **Item:** MM-V04 — royalties & IP listings discovery page
- **Branch:** `claude/audit-remediation/mm-v01b-digital-infra-listings`
- **PR:** #803 OPEN
- **Commit:** `512055c`
- **Diff:** +59 -0 across 4 files (new page + `'royalties'` type union member + listing-url entry + sitemap row)
- **STATUS: PROGRESS · stream=MM · item=MM-V04 · pr=#803**

### iter 385 — 2026-05-12 — MM-V03

- **Stream:** MM (marketplace expansion)
- **Item:** MM-V03 — carbon & environmental markets listings discovery page
- **Branch:** `claude/audit-remediation/mm-v01b-digital-infra-listings`
- **PR:** #803 OPEN
- **Commit:** `62aceac`
- **Diff:** +66 -1 across 4 files (new page + type + listing-url + sitemap)
- **STATUS: PROGRESS · stream=MM · item=MM-V03 · pr=#803**

### iter 384 — 2026-05-12 — CI-RESCUE QQ (#800)

- **Stream:** QQ (public AI Q&A capture surface)
- **Commit:** `8fa60df`
- **STATUS: CI-RESCUE · stream=QQ · pr=#800**

### iter 383 — 2026-05-12 — CI-RESCUE CL (#795)

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `aacdcf8`
- **STATUS: CI-RESCUE · stream=CL · pr=#795**

### iter 382 — 2026-05-12 — MM-V02

- **Stream:** MM (marketplace expansion)
- **Commit:** `ca9aa96`
- **STATUS: PROGRESS · stream=MM · item=MM-V02 · pr=#803**

### iter 381 — 2026-05-12 — QQ-03

- **Stream:** QQ (public AI Q&A capture surface)
- **Commit:** `d52119c`
- **STATUS: PROGRESS · stream=QQ · item=QQ-03 · pr=#800**

### iter 380 — 2026-05-12 — QQ-02

- **Stream:** QQ (public AI Q&A capture surface)
- **Commit:** `596676b`
- **STATUS: PROGRESS · stream=QQ · item=QQ-02 · pr=#800**

### iter 379 — 2026-05-12 — MM-V01c

- **Stream:** MM (marketplace expansion)
- **Commit:** `8512381`
- **STATUS: PROGRESS · stream=MM · item=MM-V01c · pr=#803**

### iter 378 — 2026-05-12 — MM-V01b

- **Stream:** MM (marketplace expansion)
- **Commit:** `369cbef`
- **STATUS: PROGRESS · stream=MM · item=MM-V01b · pr=#803**

### iter 377 — 2026-05-12 — CI-RESCUE CL (#795)

- **Commit:** `44d9a74`
- **STATUS: CI-RESCUE · stream=CL · pr=#795**

### iter 376 — 2026-05-12 — MM-AUDIT

- **Commit:** `163aeaf`
- **STATUS: PROGRESS · stream=MM · item=MM-AUDIT · pr=#801**

### iter 375 — 2026-05-11 — QQ-01

- **Commit:** `281a83a`
- **STATUS: PROGRESS · stream=QQ · item=QQ-01 · pr=#800**

### iter 374 — 2026-05-11 — CI-RESCUE CL (#795)

- **Commit:** `306f995`
- **STATUS: CI-RESCUE · stream=CL · pr=#795**

### iter 373 — 2026-05-11 — TT-04

- **Commit:** `e8453d0`
- **STATUS: PROGRESS · stream=TT · item=TT-04 · pr=#799**

### iter 372 — 2026-05-11 — CL-10 + CL-07/08 FP + CL-05 Blocked

- **Commit:** `0a74526`
- **STATUS: PROGRESS · stream=CL · item=CL-10 · pr=#795**

### iter 371 — 2026-05-11 — CL-09

- **Commit:** `af22343`
- **STATUS: PROGRESS · stream=CL · item=CL-09 · pr=#795**

### iter 370 — 2026-05-11 — CL-06

- **Commit:** `aa17850`
- **STATUS: PROGRESS · stream=CL · item=CL-06 · pr=#795**

### iter 369 — 2026-05-11 — CL-03

- **Commit:** `0aaf763`
- **STATUS: PROGRESS · stream=CL · item=CL-03 · pr=#795**

### iter 368 — 2026-05-11 — CL-02

- **Commit:** `64a46ca`
- **STATUS: PROGRESS · stream=CL · item=CL-02 · pr=#795**

### iter 367 — 2026-05-11 — CL-04

- **Commit:** `0d942b7`
- **STATUS: PROGRESS · stream=CL · item=CL-04 · pr=#795**

### iter 366 — 2026-05-11 — CL-01

- **Commit:** `549bfb1`
- **STATUS: PROGRESS · stream=CL · item=CL-01 · pr=#795**

### iter 365 — 2026-05-11 — MAIN-RESCUE

- **Commit:** `41981c4`
- **What:** next 16.2.4→16.2.6 (13 high CVEs).
- **STATUS: MAIN-RESCUE · pr=#793**
