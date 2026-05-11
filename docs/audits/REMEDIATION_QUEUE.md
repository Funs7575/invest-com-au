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
|--------|--------|------------------------|-------|----------|
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
| R | _complete_ | #290/#396/#459/#466/#471/#472/#473/#510/#511/#513/#514/#516/#517/#519/#521/#526/#527/#528/#529/#530/#531/#532/#533/#534/#535/#536/#537/#538/#539/#540/#541/#542/#543/#544/#545/#546/#547/#548/#549/#550/#551/#552/#553/#554/#555/#556/#557/#558/#559/#560/#561/#562/#563/#564/#565/#566/#567/#568/#569/#570/#571/#572/#573/#574/#575/#576/#577/#578/#579/#580/#581/#582/#583/#584/#585/#586/#587/#588/#589/#590/#591/#592/#593/#594/#595/#596/#597/#598/#599/#600/#601/#602/#603/#604/#605/#606/#607/#608/#609/#610/#611/#612/#640 | **#595 MERGED** (RATCHET M1). **#597 MERGED** (R-COVERAGE-15). **#601 MERGED** (M2-A). **#640 MERGED 2026-05-10** (M2-B — CGT+mortgage+currency.formatAUD). **Stream complete.** | #640 merged ✓ |
| S | _complete_ | **#594 MERGED 2026-05-08** (`ee498f8c`) | queue-sync iter 315 — #594 MERGED. | S-01..S-05 done. **Stream complete.** |
| T | `claude/audit-remediation/t-05-type-safety` | #225/#318/#398/#457/#519/#560 | T-01..T-05 done. | T-05 merged ✓ |
| U | `claude/audit-remediation/u-04-url-canonicals` | #226/#319/#399/#457/#520/#561 | U-01..U-04 done. | U-04 merged ✓ |
| V | `claude/audit-remediation/v-07-auth-hardening` | #227/#320/#400/#457/#521/#562 | V-01..V-07 done. | V-07 merged ✓ |
| W | `claude/audit-remediation/w-12-hub-page-hoc` (W-15 remaining) | #306/#312/#369/#529/#598/#599/#602/#604/#605/#606/#607/#608/#609/#612 | **#609 MERGED 2026-05-08** (W-12+W-13+W-15 dividends). **#612 MERGED 2026-05-08** (W-14 grants→/startup/grants). W-04..W-15 all MERGED. | All W tasks merged ✓ |
| X | _complete_ | #257/#367/#596/#600/#610/#641/#643/#644/#646/#702 MERGED | X-06..X-09a all MERGED. X-09b: **#702 MERGED 2026-05-10** (ESLint ratchet warn→error + find/[advisor-type]/[city] → createStaticClient). **Stream complete.** | All X PRs merged ✓ |
| CC | _complete_ | **#675 MERGED** (CC-01) · **#678 MERGED** (CC-04) · **#704 MERGED 2026-05-10** (CC-05) | CC-01 done. CC-02/CC-03 false-positive. CC-04 MERGED (#678). CC-05: **#704 MERGED 2026-05-10** (`ccf29307` — LOCALE_KNOWN_PATHS + localizedPages + BCP47_TAG). **Stream complete.** | CC-05 merged ✓ |
| EE | `claude/audit-remediation/ee-01-error-boundaries` | **#653 MERGED** (EE-01+EE-05) | EE-01 done + EE-02/03/04 FP + EE-05 done. **Stream complete.** | #653 merged ✓ |
| FF | `claude/audit-remediation/ff-01-feature-flag-audit` | **#656 MERGED 2026-05-09** (`4da4004f`) | FF-01..FF-04 done. FF-03 false-positive. **Stream complete.** | FF-04 merged ✓ |
| OOO | `claude/audit-remediation/ooo-01-runbook-audit` | **#652 MERGED** | OOO-01 done. OOO-04 FP. OOO-02 done. OOO-03 done. **Stream complete.** | OOO-03 merged ✓ |
| KK | `claude/audit-remediation/kk-04-iter4-admin-density-override` · `claude/audit-remediation/kk-04-iter5-integration-tests` | **#703 MERGED 2026-05-10** (KK-03) · **#711 MERGED 2026-05-10** (KK-04 iter 1) · **#743 MERGED 2026-05-11** (KK-04 iter 2) · **#747 MERGED 2026-05-11** (KK-04 iter 3) · **#749 OPEN** (KK-04 iter 4) · **#751 OPEN** (KK-04 iter 5) | KK-01 done (#667). KK-02 done (#670). KK-03: **#703 MERGED 2026-05-10** (`57cfce7`). KK-04 iter 1: **#711 MERGED 2026-05-10** (`34455f2b`). KK-04 iter 2: **#743 MERGED 2026-05-11** (`3792739`). KK-04 iter 3: **#747 MERGED 2026-05-11** (`d8fc9f8` — Tier B squash, per-category density). KK-04 iter 4: **#749 OPEN** (iter 356 rebase `8cdb1e0`; link_density_override + admin editor; Tier C migration — **needs human review**). KK-04 iter 5: **#751 OPEN** (iter 356 rebase `b329073`; 11 unit + 4 integration + 4 Playwright tests). CI rescue iter 359: Supabase types regen pushed to #749 (`dfe3442`) + #751 (`3480f79`). | KK-04 merged |
| PP | _complete_ | **#706 MERGED** (PP-01) · **#745 MERGED** (PP-02) · **#755 MERGED 2026-05-11** (PP-03) · **#765 MERGED 2026-05-11** (PP-04) · **#768 MERGED** (PP-05) | PP-01..PP-05 all MERGED. PP-03: **#755 MERGED 2026-05-11** (iter 361 squash SHA `f2c564b`; font weight trim). PP-04: **#765 MERGED 2026-05-11** (iter 361 squash SHA `c54b2e0`; consent unification `lib/consent.ts` + PostHog gate). **Stream complete.** | All PP tasks merged ✓ |
| WW | `claude/audit-remediation/ww-01-watchlist-data-model` | **#651 MERGED** | WW-01 migration + WW-02 watchlist UI done. WW-03/04 blocked (DD-02 dep). **Streams WW-01+WW-02 merged.** | All WW tasks merged ✓ |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |
| QQ | `claude/audit-remediation/qq-01-public-qa-surface` | (none yet) | QQ-01..QQ-10 pending. Public AI Q&A capture surface — promote production RAG chatbot from admin-only to public SEO/lead-capture surface. Brief: `docs/audits/qq-ai-qa-capture-brief.md` (drafted 2026-05-09 from FIN_NOTEBOOK.md ship-now item #7). QQ-08 is a compliance gate — surfaces to Blocked until `docs/audits/qq-compliance-signoff.md` is committed by a human reviewer. | All QQ tasks merged |
| MM | `claude/audit-remediation/mm-01-marketplace-coverage-audit` | **MM-V01 delivered locally 2026-05-09** (Digital Infrastructure / data centres — `lib/listing-verticals.ts`, `app/invest/list/ListingSubmitForm.tsx`, `app/api/listings/submit/route.ts`, `lib/listing-vertical-images.ts`, `components/ContextualLeadMagnet.tsx`, new `supabase/migrations/20260509_digital_infrastructure_vertical.sql`, new `app/invest/digital-infrastructure/page.tsx`). Pending commit + PR. | **MM-V01 Digital Infrastructure DELIVERED locally 2026-05-09** (pending commit). MM-AUDIT next on cloud loop, then remaining MM-V02..V09 + MM-S01..S06 + MM-CONTENT + MM-UX + MM-INTEG. Plan: `docs/audits/MM-marketplace-expansion-plan.md`. New: **MM-V09 Startup vertical expansion** (deepen existing `/invest/startups` from 226 LOC to ~500 LOC + sector pages + round-instrument explainers + ESIC tax explainer + 12+ seed listings + pitch event aggregation). All wholesale-only / MIS-adjacent verticals reuse the existing s708 gating pattern from pre-IPO listings. No AFSL upgrade required pre-launch. | All MM phases merged |
| TT | `claude/audit-remediation/tt-03-privacy-analytics` | **#764 MERGED 2026-05-11** (TT-01) · **#772 MERGED 2026-05-11** (TT-02) · **#779 MERGED 2026-05-11** (TT-03 iter 1) | TT-01: **#764 MERGED 2026-05-11** (`1ee4da8`). TT-02: **#772 MERGED 2026-05-11** (`fa5532e`). TT-03 iter 1: **#779 MERGED 2026-05-11** (`33130522`; iter 362 `f5b12dd`; Plausible Analytics component + CSP + 3 tests; all hard gates + Lint/Build + LH + A11y ✓; merged post-iter-363 with Playwright advisory in_progress; Tier C proxy.ts, intent announced iter 362). TT-04 pending (depends TT-03). | TT-04 merged |
| CMP | `claude/audit-remediation/cmp-w1a-int-calculator-autosave` | **#782 OPEN** (CMP-W1A-INT iter 1+2) | CMP foundation (#689) merged 2026-05-09. CMP-W1A-INT iter 1: (iter 363 `fafd7a2`). CMP-W1A-INT iter 2: **iter 364 `352af9a`** — fixed TCO PREFILL_RULES (savings.balance→tco.amt; removed 3 invalid field mappings); added useUrlSync + ShareResultsButton to savings + mortgage calculators; updated unit tests. W1A-INT **complete** (all 3 calcs have autosave+prefill+URL sync+share). Last CI: pending — pushed 2026-05-11. | All CMP tasks merged |
| SP | `claude/audit-remediation/sp-01-capability-audit` | (none yet) | **BLOCKED — waiting on MM-V09 completion.** Startup Portal — founder-side auth + round management + data room + wholesale-investor (s708) certification + ESIC verification + investor sector-thesis matching. New auth context mirroring advisor-portal pattern. Brief: `docs/audits/sp-startup-portal-brief.md` (drafted 2026-05-09). 13 sub-tasks SP-01..SP-13 (~25–35 iters, ~3–4 calendar weeks). SP-12 is the compliance gate. SP starts only after MM-V09 ships to avoid building against a moving listings model. | All SP tasks merged + compliance signoff |
| MAIN-RESCUE | `fix/main-rescue-next-security-patch` | **#793 OPEN** | next 16.2.4→16.2.6 patch (13 high CVEs — GHSA-492v-c6pp-mqqv et al.). Unblocks "Dependency vulnerabilities" CI gate failing on all open PRs (CMP #782 + future PRs). npm audit --audit-level=high exits 0 after. iter 365. | Merged to main |
| CL | `claude/audit-remediation/cl-01-about-entity-only` | **#795 OPEN** (CL-01 + CL-02 + CL-04) | CL-01 done (`549bfb1`): /about entity-only editorial section. CL-04 done (`0d942b7`): AFSL_STATUS_DISCLOSURE added to /about disclaimers. CL-02 done (`64a46ca`): NOINDEX_PERSONA_SLUGS set added to lib/compliance.ts; noindex propagated to generateMetadata in /authors/[slug] and /reviewers/[slug]. CL-03 (operational personas), CL-05 (WHOIS audit), CL-06 (repo PII sweep), CL-07 (social media entity-only), CL-08 (press inquiry handling), CL-09 (anonymity stress test CI gate), CL-10 (quarterly anonymity audit cron) — all pending. | All CL tasks merged |

---

## Iteration log (most recent first)

### iter 368 — 2026-05-11 — CL-02

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Item:** CL-02 — noindex persona slugs (finn-webster, alex-reid)
- **Branch:** `claude/audit-remediation/cl-01-about-entity-only` (commit added to #795)
- **PR:** #795 OPEN (updated to CL-01 + CL-02 + CL-04)
- **Commit:** `64a46ca`
- **Diff:** +23 across 3 files
- **What:** Added NOINDEX_PERSONA_SLUGS ReadonlySet to lib/compliance.ts SSOT (finn-webster, alex-reid). Propagated to generateMetadata in app/authors/[slug]/page.tsx and app/reviewers/[slug]/page.tsx — any DB record with a persona slug now renders with robots: {index: false, follow: false}. Pages already 404 if record doesn't exist (eq status active gate); noindex is defence-in-depth for legacy DB records.
- **STATUS: PROGRESS · stream=CL · item=CL-02 · pr=#795**

### iter 367 — 2026-05-11 — CL-04

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Item:** CL-04 — AFSL disclosure on /about page
- **Branch:** `claude/audit-remediation/cl-01-about-entity-only` (commit added to #795)
- **PR:** #795 OPEN (updated to CL-01 + CL-04)
- **Commit:** `0d942b7`
- **Diff:** +4 across 1 file
- **What:** Verified all AFSL disclosure surfaces (Footer, FSG, billing-policy, CompactDisclosure, SiteFooter) already entity-only using lib/compliance.ts SSOT. Added AFSL_STATUS_DISCLOSURE to /about page Disclaimers section — the primary compliance surface for ASIC/journalist review, which previously only had GENERAL_ADVICE_WARNING. Updated PR #795 title to reflect CL-01+CL-04 bundle.
- **STATUS: PROGRESS · stream=CL · item=CL-04 · pr=#795**

### iter 366 — 2026-05-11 — CL-01

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Item:** CL-01 — /about page entity-only
- **Branch:** `claude/audit-remediation/cl-01-about-entity-only`
- **PR:** #795 OPEN
- **Commit:** `549bfb1`
- **Diff:** +24 -25 across 1 file
- **What:** Removed "Finn Webster — Founder & Lead Editor" persona card (and Alex Reid, Editorial Team cards) from `/about` page. Replaced with 3 entity-level editorial-structure cards (Tier 1 named author, Tier 2 Research Team, Compliance Review). No individual names now appear on the about page. Orphaned `/authors/finn-webster` route is CL-02 scope. Override fired: `STATUS: PROGRESS · override=tier-0`.
- **STATUS: PROGRESS · stream=CL · item=CL-01 · pr=#795**

### iter 365 — 2026-05-11 — MAIN-RESCUE

- **Stream:** MAIN-RESCUE (systemic dep-vuln gate failure)
- **Item:** next-security-patch (next 16.2.4→16.2.6)
- **Branch:** `fix/main-rescue-next-security-patch`
- **PR:** #793 OPEN
- **Commit:** `41981c4`
- **What:** npm advisory database gained 13 high-severity CVEs for next@16.2.4 after recent merges, causing "Dependency vulnerabilities" CI gate to fail on all open PRs. Bumped next to 16.2.6 (upstream patch release, no API changes). `npm audit --audit-level=high --omit=dev` now exits 0. postcss moderate advisory remains (requires breaking downgrade, not blocked by CI gate).
- **STATUS: MAIN-RESCUE · pr=#793**
