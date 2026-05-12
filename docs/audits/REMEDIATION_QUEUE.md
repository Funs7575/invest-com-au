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
| QQ | `claude/audit-remediation/qq-01-public-qa-surface` | **#800 OPEN** (QQ-01) | QQ-01 done (`281a83a`): capability audit doc — safe-to-expose subset of chatbot/embeddings/ai-cost-caps, admin-only assumptions, lib/qa-chatbot.ts scope. QQ-02..QQ-10 pending. QQ-08 compliance gate blocks public-route exposure until `docs/audits/qq-compliance-signoff.md` is committed. Last CI: pending — pushed 2026-05-11. | All QQ tasks merged |
| MM | `claude/audit-remediation/mm-01-marketplace-coverage-audit` | **#801 OPEN** (MM-AUDIT) | MM-V01 already on main (committed in f024bc2 with KK/F bundle). MM-AUDIT (Phase 1 coverage doc) done (`163aeaf`). Next: MM-V01b (digital-infrastructure listings page — P0 gap), then MM-V02..V09. Last CI: pending — pushed 2026-05-12. | All MM phases merged |
| TT | `claude/audit-remediation/tt-04-ga4-removal` | **#764 MERGED** (TT-01) · **#772 MERGED** (TT-02) · **#779 MERGED** (TT-03) · **#799 OPEN** (TT-04) | TT-01..TT-03 MERGED. TT-04: **#799 OPEN** (iter 373 `e8453d0`; GA4 removed from layout; Plausible sole analytics; connect-src tightened). Last CI: in_progress. | TT-04 merged |
| CMP | `claude/audit-remediation/cmp-w1a-int-calculator-autosave` | **#782 OPEN** | CMP-W1A-INT complete. Last CI: pending. | All CMP tasks merged |
| SP | (none yet) | (none yet) | **BLOCKED — waiting on MM-V09 completion.** | All SP tasks merged + compliance signoff |
| MAIN-RESCUE | `fix/main-rescue-next-security-patch` | **#793 OPEN** | next 16.2.4→16.2.6 patch. | Merged to main |
| CL | `claude/audit-remediation/cl-01-about-entity-only` | **#795 OPEN** (CL-01..CL-04 + CL-06 + CL-09 + CL-10) | CL-01..CL-04, CL-06, CL-09, CL-10 done. CL-07+CL-08 false-positive. CL-05 blocked (WHOIS registrar action). CI rescue iter 377: fixed test mocks (admin email fallbacks changed by CL) + anonymity gate (exclude quarterly-audit dir) + cron-groups regex (`44d9a74`). Last CI: pending — pushed 2026-05-12. | All CL tasks merged |

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

---

## Iteration log (most recent first)

### iter 377 — 2026-05-12 — CI-RESCUE CL (#795)

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Item:** CI rescue — test mocks + anonymity gate + cron-groups regex
- **Branch:** `claude/audit-remediation/cl-01-about-entity-only`
- **PR:** #795 OPEN
- **Commit:** `44d9a74`
- **Diff:** +8 -11 across 5 files
- **What:** Three test files broke after CL stream changed admin email defaults: (1) admin.test.ts expected old `["admin@invest.com.au", "finn@invest.com.au"]` fallback and `["finn@invest.com.au"]` for getFinObjectionEmails — updated to match new entity-level defaults. (2) admin-country-rule-alerts.test.ts had adminLoggedIn() using finn@ which is no longer in the allow-list — switched to admin@invest.com.au. (3) cron-groups.test.ts regex didn't include `quarterly-*` cadence shape. Also: anonymity gate failed because the cron route contains the PII patterns it scans for — added `--exclude-dir=quarterly-anonymity-audit` to ci.yml; cleaned JSDoc in route.ts.
- **STATUS: CI-RESCUE · stream=CL · pr=#795**

### iter 376 — 2026-05-12 — MM-AUDIT

- **Stream:** MM (marketplace expansion)
- **Item:** MM-AUDIT — Phase 1 marketplace coverage audit (prerequisite doc)
- **Branch:** `claude/audit-remediation/mm-01-marketplace-coverage-audit`
- **PR:** #801 OPEN
- **Commit:** `163aeaf`
- **Diff:** +179 across 1 file (new `docs/audits/MM-01-marketplace-coverage-audit.md`)
- **What:** Maps all 37 /invest/ route directories against form vertical values, listing index pages, and sitemap registrations. Identifies two P0 gaps where submissions are accepted but discovery is broken: /invest/digital-infrastructure/listings/ and /invest/funds/listings/. Provides 7-point touch-point checklist and form-value→slug mismatch map for MM-V02..V09. No source code changed.
- **STATUS: PROGRESS · stream=MM · item=MM-AUDIT · pr=#801**

### iter 375 — 2026-05-11 — QQ-01

- **Stream:** QQ (public AI Q&A capture surface)
- **Item:** QQ-01 — capability audit & API surface spec
- **Branch:** `claude/audit-remediation/qq-01-public-qa-surface`
- **PR:** #800 OPEN
- **Commit:** `281a83a`
- **Diff:** +204 across 1 file (new `docs/audits/qq-01-capability-audit.md`)
- **What:** Audited `lib/chatbot.ts` (367 LOC), `lib/embeddings.ts` (199 LOC), `lib/ai-cost-caps.ts` (343 LOC), `/api/chatbot/route.ts`, `/api/concierge/route.ts`. Safe-to-expose subset: `classifyUserMessage()`, `buildChatPrompt()`, `embedText()` (pure/auth-free). `respondToMessage()` NOT safe for public (admin client + chatbot_conversations write). New route needs: IP-keyed rate limit (10 req/hr), `qa_capture` route in ai-cost-caps with separate spend caps, `lib/qa-chatbot.ts` wrapper (QQ-03). QQ-08 compliance gate confirmed. Sub-task scopes refined for QQ-02..QQ-10. Named duplicate: PR #794 is quiz Zod schemas (E stream), not QQ — confirmed naming collision only.
- **STATUS: PROGRESS · stream=QQ · item=QQ-01 · pr=#800**

### iter 374 — 2026-05-11 — CI-RESCUE CL (#795)

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Item:** CI rescue — quarterly-anonymity-audit route type errors
- **Branch:** `claude/audit-remediation/cl-01-about-entity-only`
- **PR:** #795 OPEN
- **Commit:** `306f995`
- **Diff:** +8 -8 across 1 file
- **What:** `npm run type-check` failed on `app/api/cron/quarterly-anonymity-audit/route.ts` — three `log.info/warn` calls used the pino-style `(meta, msg)` arg order but this codebase's logger signature is `(msg: string, meta?: LogMeta)`. Also fixed a ternary precedence bug in the `origin` computation. Rebased the branch on main (was behind by 8 queue-update commits). Type-check green before push.
- **STATUS: CI-RESCUE · stream=CL · pr=#795**

### iter 373 — 2026-05-11 — TT-04

- **Stream:** TT (privacy-analytics)
- **Item:** TT-04 — GA4 removal; Plausible as sole page analytics
- **Branch:** `claude/audit-remediation/tt-04-ga4-removal`
- **PR:** #799 OPEN
- **Commit:** `e8453d0`
- **Diff:** +5 -5 across 5 files
- **What:** Removed `<GoogleAnalytics />` from `app/layout.tsx` now that TT-03 Plausible integration is merged. Tightened proxy.ts connect-src by removing `*.google-analytics.com` and `*.analytics.google.com`. Tier C (proxy.ts CSP narrowing, intent announced here).
- **STATUS: PROGRESS · stream=TT · item=TT-04 · pr=#799**

### iter 372 — 2026-05-11 — CL-10 + CL-07/08 FP + CL-05 Blocked

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Items:** CL-10 done; CL-07 + CL-08 false-positive; CL-05 surfaced to Blocked
- **Commit:** `0a74526`
- **STATUS: PROGRESS · stream=CL · item=CL-10 · pr=#795**

### iter 371 — 2026-05-11 — CL-09

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `af22343`
- **STATUS: PROGRESS · stream=CL · item=CL-09 · pr=#795**

### iter 370 — 2026-05-11 — CL-06

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `aa17850`
- **STATUS: PROGRESS · stream=CL · item=CL-06 · pr=#795**

### iter 369 — 2026-05-11 — CL-03

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `0aaf763`
- **STATUS: PROGRESS · stream=CL · item=CL-03 · pr=#795**

### iter 368 — 2026-05-11 — CL-02

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `64a46ca`
- **STATUS: PROGRESS · stream=CL · item=CL-02 · pr=#795**

### iter 367 — 2026-05-11 — CL-04

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `0d942b7`
- **STATUS: PROGRESS · stream=CL · item=CL-04 · pr=#795**

### iter 366 — 2026-05-11 — CL-01

- **Stream:** CL (anonymity infrastructure — Tier-0 preempt)
- **Commit:** `549bfb1`
- **STATUS: PROGRESS · stream=CL · item=CL-01 · pr=#795**

### iter 365 — 2026-05-11 — MAIN-RESCUE

- **Stream:** MAIN-RESCUE
- **Commit:** `41981c4`
- **What:** next 16.2.4→16.2.6 (13 high CVEs).
- **STATUS: MAIN-RESCUE · pr=#793**
