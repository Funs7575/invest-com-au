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
| KK | `claude/audit-remediation/kk-04-iter4-admin-density-override` · `claude/audit-remediation/kk-04-iter5-integration-tests` | **#703 MERGED** · **#711 MERGED** · **#743 MERGED** · **#747 MERGED** · **#749 OPEN** · **#751 OPEN** | KK-04 iter 4: **#749 OPEN** (Tier C migration — **needs human review**). KK-04 iter 5: **#751 OPEN** (tests). | KK-04 merged |
| PP | _complete_ | **#706 MERGED** · **#745 MERGED** · **#755 MERGED** · **#765 MERGED** · **#768 MERGED** | **Stream complete.** | All PP tasks merged ✓ |
| WW | _complete_ | **#651 MERGED** | WW-01+WW-02 merged. WW-03/04 blocked (DD-02 dep). | All WW tasks merged ✓ |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |
| QQ | `claude/audit-remediation/qq-01-public-qa-surface` | **#800 OPEN** (QQ-01..QQ-07) | QQ-01 done (`281a83a`): capability audit doc. QQ-02 done (`596676b`): `"qa_capture"` route in ai-cost-caps. QQ-03 done (`d52119c`): `lib/qa-chatbot.ts` — `generateAnswer()` with QA-specific system prompt, retrieval, provider call, cost tracking. dep-vuln CI rescue done (`8fa60df`): next 16.2.4→16.2.6. QQ-04 done (`ae0eaa3`): `components/QuestionCaptureForm.tsx` + 8-test suite. QQ-07 done (`1ca09b2`): `lib/qa-ctas.ts` — per-category CTA mapping (18 categories; fallback to /find-advisor; RSC-safe). QQ-05 pending (needs qa_questions/qa_answers schema migration first — Tier C, announce before merge). QQ-08 compliance gate blocks public exposure. QQ-06/QQ-09/QQ-10 pending. Last CI: pending — pushed 2026-05-12 (`1ca09b2`). | All QQ tasks merged |
| MM | `claude/audit-remediation/mm-01-marketplace-coverage-audit` · `claude/audit-remediation/mm-v01b-digital-infra-listings` | **#801 OPEN** (MM-AUDIT) · **#803 OPEN** (MM-V01b+V01c+V02+V03+V04+V07+V08+dep-vuln-rescue) | MM-V01 already on main (f024bc2). MM-AUDIT done (#801). MM-V01b done (#803 `369cbef`): /invest/digital-infrastructure/listings/. MM-V01c done (#803 `8512381`): /invest/funds/listings/ (P0 gap #2). dep-vuln CI rescue done (#803 `d240e3d`): next 16.2.4→16.2.6. MM-V02 done (#803 `ca9aa96`): /invest/public-social-infrastructure/listings/ page + type + URL mapping + sitemap. MM-V03 done (#803 `62aceac`): /invest/carbon-environmental-markets/listings/ page + type + URL mapping + sitemap. MM-V04 done (#803 `512055c`): /invest/royalties/listings/ page + 'royalties' type + listing-url + sitemap. MM-V05 false-positive — alternatives/listings already on main. MM-V07 done (#803 `42eb238`): /invest/aquaculture/listings/ page + 'aquaculture' type + listing-url + sitemap. MM-V08 done (#803 `6789f61`): /invest/livestock/listings/ page + 'livestock' type + listing-url + sitemap. Next: MM-V06 (wholesale-only alternatives — litigation funding, PE, VC, hedge funds, ILS). Last CI: pending — pushed 2026-05-12 (`6789f61`). | All MM phases merged |
| TT | `claude/audit-remediation/tt-04-ga4-removal` | **#764 MERGED** (TT-01) · **#772 MERGED** (TT-02) · **#779 MERGED** (TT-03) · **#799 OPEN** (TT-04) | TT-01..TT-03 MERGED. TT-04: **#799 OPEN** (iter 373 `e8453d0`; GA4 removed from layout; Plausible sole analytics; connect-src tightened). Last CI: in_progress. | TT-04 merged |
| CMP | `claude/audit-remediation/cmp-w1a-int-calculator-autosave` | **#782 OPEN** | CMP-W1A-INT complete. Last CI: pending. | All CMP tasks merged |
| SP | (none yet) | (none yet) | **BLOCKED — waiting on MM-V09 completion.** | All SP tasks merged + compliance signoff |
| MAIN-RESCUE | `fix/main-rescue-next-security-patch` | **#793 OPEN** | next 16.2.4→16.2.6 patch. | Merged to main |
| CL | `claude/audit-remediation/cl-01-about-entity-only` | **#795 OPEN** (CL-01..CL-04 + CL-06 + CL-09 + CL-10) | CL-01..CL-04, CL-06, CL-09, CL-10 done. CL-07+CL-08 false-positive. CL-05 blocked (WHOIS registrar action). CI rescue iter 383: centralised entity emails in compliance.ts (`aacdcf8`) — triggers Vercel redeployment so smoke test can find preview URL. Last CI: success (Vercel) — `aacdcf8`. | All CL tasks merged |
| LL | `claude/audit-remediation/ll-01-personal-dashboard` | **#807 OPEN** (LL-01..LL-03) | LL-01 done (`8008bf1`): `/account/dashboard` RSC. LL-02 done (`b9d0631`): profile-driven advisor matching — `/api/account/advisor-matches` + dashboard grid. LL-03 done (`a2c6f27`): watchlist digest prefs — `/api/account/digest-prefs` GET+PUT (JSONB meta merge, no migration) + `DigestToggle.tsx` client toggle; watchlist page shows email notification section. LL-04 pending (reviews + ratings — deps LL-01 ✓). LL-05 blocked (live chat AI routing — deps V-NEW-02 + CC-06 not yet done). Last CI: pending — pushed 2026-05-12 (`a2c6f27`). | All LL tasks merged |

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

## Resolved as false positives

| Item | Reason |
|------|--------|
| CL-07 (social media entity-only) | Source code social links are entity-level: `@investcomau` on X/Twitter, `linkedin.com/company/invest-com-au`. No personal founder accounts referenced in shipped code. |
| CL-08 (press inquiry handling) | `app/press/page.tsx` and `app/contact/page.tsx` already use `press@invest.com.au` (role address). No founder personal email in code. |
| MM-V05 (alternative collectibles listings) | `app/invest/alternatives/listings/page.tsx` exists on main and covers all MM-V05 sub-categories (whisky, wine, art, watches, cars, coins, etc.) via `ALTERNATIVES_SUB_CATEGORIES`. No new page needed. |

---

## Iteration log (most recent first)

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
