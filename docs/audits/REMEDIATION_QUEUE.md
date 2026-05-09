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
| F | `claude/audit-remediation/f-08-cache-drift` | #212/#305/#341/#370/#384/#457/#470/#543 | F-01..F-07 done. F-08 blocked (see Blocked). | F-08 unblocked + merged |
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
| R | `claude/audit-remediation/r-coverage-m2b-calculators` · **#640 OPEN** (CI queued) | #290/#396/#459/#466/#471/#472/#473/#510/#511/#513/#514/#516/#517/#519/#521/#526/#527/#528/#529/#530/#531/#532/#533/#534/#535/#536/#537/#538/#539/#540/#541/#542/#543/#544/#545/#546/#547/#548/#549/#550/#551/#552/#553/#554/#555/#556/#557/#558/#559/#560/#561/#562/#563/#564/#565/#566/#567/#568/#569/#570/#571/#572/#573/#574/#575/#576/#577/#578/#579/#580/#581/#582/#583/#584/#585/#586/#587/#588/#589/#590/#591/#592/#593/#594/#595/#596/#597/#598/#599/#600/#601/#602/#603/#604/#605/#606/#607/#608/#609/#610/#611/#612/#640 | **#595 MERGED** (RATCHET M1 — coverage floors raised). **#597 MERGED** (R-COVERAGE-15). **#601 MERGED** (M2-A done — 12 files). **#640 OPEN** (M2-B — CGT+mortgage+currency.formatAUD, 3 test files, 368 LOC). | #640 merged |
| S | _complete_ | **#594 MERGED 2026-05-08** (`ee498f8c`) | queue-sync iter 315 — #594 MERGED. | S-01..S-05 done. **Stream complete.** |
| T | `claude/audit-remediation/t-05-type-safety` | #225/#318/#398/#457/#519/#560 | T-01..T-05 done. | T-05 merged ✓ |
| U | `claude/audit-remediation/u-04-url-canonicals` | #226/#319/#399/#457/#520/#561 | U-01..U-04 done. | U-04 merged ✓ |
| V | `claude/audit-remediation/v-07-auth-hardening` | #227/#320/#400/#457/#521/#562 | V-01..V-07 done. | V-07 merged ✓ |
| W | `claude/audit-remediation/w-12-hub-page-hoc` (W-15 remaining) | #306/#312/#369/#529/#598/#599/#602/#604/#605/#606/#607/#608/#609/#612 | **#609 MERGED 2026-05-08** (W-12+W-13+W-15 dividends). **#612 MERGED 2026-05-08** (W-14 grants→/startup/grants). W-04..W-15 all MERGED. | All W tasks merged ✓ |
| X | `claude/audit-remediation/x-09-preview-advisor-final` (#646) · `x-09-eslint-ratchet` (#648) | #257/#367/#596/#600/#610 MERGED · **#641 OPEN** (X-06) · **#643 OPEN** (X-07) · **#644 OPEN** (X-08) · **#646 OPEN** (X-09a) · **#648 OPEN** (X-09b) | X-06 (#641 CI re-running — iter 326 types fix), X-07 (#643 CI ✓), X-08 (#644 CI ✓), X-09a (#646 CI re-running — iter 327b types fix 8ecefa5), X-09b (#648 blocked). **Stream X complete** once X-06/07/08/09a merge. | All X PRs merged |
| EE | `claude/audit-remediation/ee-01-error-boundaries` · **#653 OPEN** | **#653 OPEN** (EE-01) | EE-01 done + EE-02/03/04 FP. Fixes quiz/calculators/savings-calc error.tsx. EE-05 pending. | EE-05 merged |
| FF | `claude/audit-remediation/ff-01-feature-flag-audit` · **#656 OPEN** | **#656 OPEN** (FF-01/02) | FF-01 done — seeded 8 missing flags. FF-02 done (iter 329 — flag expiry cron, `archived_at` column, commit `b276f56a`). FF-03/04 pending. | FF-04 merged |
| OOO | `claude/audit-remediation/ooo-01-runbook-audit` · **#652 OPEN** | — · **#652 OPEN** | OOO-01 done. OOO-04 FP. OOO-02 done (iter 324b commit 93372f0). OOO-03 done (iter 325b commit a610b2d). Types drift fixed (iter 327b commit c543803). **Stream complete — CI re-running.** | OOO-03 merged ✓ |
| WW | `claude/audit-remediation/ww-01-watchlist-data-model` · **#651 OPEN** | **#651 OPEN** (WW-01) | WW-01 migration applied to live DB, types regenerated. | All WW tasks merged |
| Y | `claude/audit-remediation/y-03-yield-calc` | #229/#322/#402/#457/#523/#564 | Y-01..Y-03 done. | Y-03 merged ✓ |
| Z | `claude/audit-remediation/z-04-zero-state-ux` | #230/#323/#403/#457/#524/#565 | Z-01..Z-04 done. | Z-04 merged ✓ |