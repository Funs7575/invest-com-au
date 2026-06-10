# Branch & PR Audit — 2026-06-10

Full audit of all ~335 remote branches and open PRs, with verified dispositions.
Requested by founder ("audit all the outstanding branches and PRs… get all this
sorted"). Every deletion below is recoverable: the SHA manifest pins each tip.
Restore any branch with `git branch <name> <sha>` (objects persist via reflog /
GitHub for ~90 days; this file is the permanent record).

## Method

1. `git merge-tree --write-tree origin/main <branch>` for every branch — a merge
   result identical to main's tree proves full absorption (`MERGED-EQUIV`).
2. Novel-file scan — every file a branch ADDs that is absent from main.
   This repo's features always add lib/route/test files, so zero novel adds on
   a feature branch means its content landed (typically via the cleaned-up
   sprint PRs #1216–#1257 — commit messages alone were misleading).
3. Content checks against main + the 2026-06-09 baseline migration for every
   branch whose only novelty was a migration file (most were squash artifacts).
4. Read-only `information_schema` queries against prod for schema claims.

## Outcomes

### PRs opened

- **#1525** — `fix(invest)`: registers the 7 MM-V01b discovery verticals
  (live taxonomy bug: 10 active digital-infrastructure listings unfilterable)
  + rescues 69 orphaned test files (~950 passing tests) from 5 dead branches.
- **#1526** — `fix(db)` **[DO-NOT-MERGE — founder review]**: recovers the 3
  unlanded api-billing / consumer-webhook migrations. Code from #1241/#1244 is
  live in main but its schema never reached prod — `/api/v1/webhooks` errors on
  use and 4 crons + the 30-min retry cron fail silently every run. Founder
  decision: land schema (then human-triggered `supabase db push`) or strip the
  dead code.
- **#1522** — pre-existing draft (AI journey suite v2), untouched.

### Integrity findings (beyond branch hygiene)

1. **Live taxonomy fork** (fixed in #1525): PR #803 shipped 7 sector
   listings pages without registering them in `invest-categories.ts` /
   `invest-listing-routes.ts`; `VERTICAL_TO_CATEGORY` pointed at non-existent
   category slugs — the 2026-04-26 incident class, re-introduced.
2. **Merged code, missing schema** (parked in #1526): see above.
3. **The never-merged taxonomy guard test** that would have caught (1) sat in
   `claude/fix-listings-filter-D6zM8` since 2026-04-26. Now rescued.

## KEEP — held branches and why

| Branch | Why kept |
|---|---|
| `claude/relaxed-knuth-9tktxj` | Open draft PR #1522 |
| `claude/rescue/orphan-route-tests`, `claude/rescue/api-billing-webhooks-schema` | This audit's PRs #1525 / #1526 |
| `claude/audit-account-architecture-7186H` | **Identity-platform expansion** — 81 unmerged files: principals-based account architecture (partially landed: `principals` IS in prod), broker teams, partner orgs, wholesale + embed portals, admin RBAC, squad billing, 25 staged migrations, master plan + staging runbook docs. Strategic hold — founder review. |
| `claude/setup-cloud-sessions-RWRQs` | Misleading name — **~61-file unmerged feature trove**: aged-care + retirement quiz hubs, firm branded-profile Stripe subscriptions, v1 tax/broker-health API routes, currency-hedging calculator, alternatives pages (art/watches/whisky/wine), careers marketplace migration. Mine for backlog. |
| `rescue/seo-infra-wave2` + `claude/inspiring-planck-c7u3s` | **Advisor-community wave** (2026-05-22): CPD tracking, courses, endorsements, gamification, social, organisations foundation — 12+ unmerged migrations + components. One coherent held product. |
| `claude/optimistic-thompson-10Vd7` | Tests rescued into #1525; still holds 3 unlanded perf migrations (RLS initplan wrap, FK indexes) + 2026-05-29 fresh-audit doc. Delete after migration review. |
| `claude/ecstatic-albattani-SbQM7` | 3 unlanded RLS-hardening migrations (pii-hardening, audit wave3, db-integrity wave3) + 6 route error boundaries + add-cron-wrap script. Review migrations against baseline before deciding. |
| `claude/magical-thompson-nQepn` | **Unlanded RLS fix migrations** incl. `fix_account_deletion_rerequest_rls` + forum_reports companion + data-exports bucket; also 2 bot journey scripts (adversarial-nav, reverify) worth folding into `bots/`. Security review. |
| `claude/laughing-hypatia-1bEAR` | Identity-platform slice (activate-kind route + bfin enquiries migration — bfin table IS in baseline; route is not in main). Review with the identity cluster. |
| `pre-launch/sharesight-oauth-001035` / `-040502` | Complete unmerged **Sharesight portfolio-sync integration** (OAuth, import, 19 files, tests). Needs partner API keys + product decision. |
| `claude/versus-votes-migration-HELD` | Explicitly HELD migration (`versus_votes` confirmed absent from prod — hold is still live). |
| `claude/audit-remediation/cmp-w1a-int-calculator-autosave` | Queue references it: PR #782 founder-closed 2026-05-14, "may need re-examination on a fresh branch". |
| `claude/audit-remediation/l-observability` | PostHog tests for the unmerged analytics wiring — keep with `feat/analytics-posthog-wiring` (privacy-policy review before enabling). |
| `claude/audit-remediation/sp-02-schema-migration` | `startup_portal` schema confirmed absent from prod — undecided product. |
| `claude/audit-remediation/nf-20-part1-sms-consent` | SMS consent schema — marketing-comms regulatory surface; founder + legal. |
| `claude/audit-remediation/b-07/b-08`, `c-01/c-02`, `claude/build-rls-clean`, `claude/continuous-improvements-0kk15`, `claude/o-iter6/forum`, `claude/o-iter7/editorial-obs-secrets`, `chore/audit-loop-followups-2026-05-08` | Migration-bearing branches whose baseline status was not positively verified — cheap to keep until a migration-ledger review pass. |
| `claude/audit-remediation/m-01b-cover-image-backfill` | Holds the only copy of `docs/runbooks/domain-migration.md` — relevant to the Oct–Dec 2026 migration window. |
| `claude/wave1-fee-impact-viz` | 362-line FeeImpactChart SVG component + test, never landed (attempted on 3 branches). Needs a dev-server UI pass before rescue. |
| `feat/next-20-wave-1-3` ⊃ `feat/post-launch-followon-round-4` | 20 unmerged feature files: /ask page, FeeImpactChart, PersonalisedFeeDelta, admin AI draft modal, email-suppression admin, slack-webhook lib, marketplace service-lines. Feature backlog — review for relevance. |
| `feat/n8n-phase1-infra`, `feat/n8n-phase2-editorial-publish-gate`, `feat/n8n-phase3-batch-4-agents`, `feat/n8n-phase3-data-aggregator` | Unmerged n8n agent workflow JSONs + ops docs (phase 3 never landed). Ops review, then merge as docs or drop. |
| `feat/n8n-phase2-lead-nurture-hourly`, `feat/abandoned-shortlist-drip` | Email-drip automations to leads — REGULATORY-AVOID-LIST adjacency; founder + legal before any merge. |
| `feat/analytics-posthog-wiring` | PostHog event wiring — confirm privacy policy covers it first. |
| `claude/advisor-platform-comparison-5vAIE` | 3 April migrations (marketplace v2 extensions) not positively matched to baseline; review then drop. |
| `claude/optimize-trajectory` (+`-batch-2`) | 16 novel docs/plans for loop optimisation — skim for ideas, then drop. |
| `vercel/react-server-components-cve-vu-gtp764` | Vercel-bot CVE patch branch — confirm Next is at/past the patched version, then drop. |
| `codex/audit-setup` | Sole copy of an `AGENTS.md` (Codex agent instructions) — founder glance, then merge or drop. |
| `archive/tailwind-cleanup-2026-04-28` | Deliberate archive prefix. |
| `automerge-bot/stats` | Bot-owned stats branch (unrelated history) — likely consumed by a workflow. |

## Follow-ups (tracked here, not yet queued)

1. Decide #1526 (schema vs code-removal) — until then the retry-consumer-webhooks cron errors silently every 30 min.
2. Seed listings for the 6 guide-tier MM-V01b verticals, then flip intent to opportunity + register in `STATIC_LISTING_SLUGS` (same change — test enforces pairing).
3. Migration-ledger review pass over the KEEP-pending migration branches (b-07, c-01/02, o-iter6/7, build-rls-clean, ecstatic-albattani wave-3 trio, magical-thompson RLS fixes, optimistic-thompson perf trio).
4. Identity-platform cluster decision (account-architecture + laughing-hypatia + the in-prod `principals` foundation).
5. Dropped-test rewrites if wanted: admin/ai-chat (route diverged), auth-callback identifyUser assertions (pending PostHog decision).
6. `bots/`: fold adversarial-nav.cjs + reverify.cjs (magical-thompson) into the journey suite (#1522 just upgraded it).

## DELETED — manifest (recover with `git branch <name> <sha>`)

| Branch | Tip SHA | Evidence |
|---|---|---|
| `big-advisor-trust` | `b6dd9fa2e672` | superseded — content verified present in main |
| `big-alerts-product` | `50aeee14fda1` | 0 commits ahead of main |
| `big-api-billing` | `5374519414bd` | superseded — content verified present in main |
| `big-certificates` | `8bea6bd2defe` | superseded — content verified present in main |
| `big-concierge` | `0df20ae7d58a` | superseded — content verified present in main |
| `big-data-pipelines` | `78d301bcac21` | superseded — content verified present in main |
| `big-expat-planner` | `ed3aa4a81e7f` | 0 commits ahead of main |
| `big-expat-v2` | `f0de55153bfe` | superseded — content verified present in main |
| `big-geo-platform` | `e3ee1052d9f5` | superseded — content verified present in main |
| `big-geo-v2` | `2dac685619f3` | superseded — content verified present in main |
| `big-learning-paths` | `b9af704d8866` | superseded — content verified present in main |
| `big-market-intelligence` | `8801db43b228` | superseded — content verified present in main |
| `big-next-action` | `727414bb0ae4` | superseded — content verified present in main |
| `big-pro-command-center` | `deb82a7bb01d` | superseded — content verified present in main |
| `big-push-delivery` | `dd626ef8303a` | superseded — content verified present in main |
| `big-push-vapid` | `34d3dd8f61c9` | superseded — content verified present in main |
| `big-pwa-offline` | `c14d4d325b63` | 0 commits ahead of main |
| `big-retention` | `d2d1e67a4810` | merge-tree identical to main |
| `big-reviewer-depth` | `9463dedd613c` | superseded — content verified present in main |
| `big-scenario-engine` | `abe9f9cd48c2` | superseded — content verified present in main |
| `big-scenario-protie` | `d1aead0ac2e4` | superseded — content verified present in main |
| `big-scenario-v2` | `c9e4c9b860cc` | superseded — content verified present in main |
| `big-sitemap-split` | `b0f35e570652` | 0 commits ahead of main |
| `big-switching` | `55760fc2e892` | superseded — content verified present in main |
| `big-trust-badges` | `e508d5692c28` | superseded — content verified present in main |
| `big-verified-reviews` | `e204326afa0f` | superseded — content verified present in main |
| `big-webhook-delivery` | `a5f82c166f56` | superseded — content verified present in main |
| `big-widget-suite` | `45aefa7f96ed` | 0 commits ahead of main |
| `chore/audit-queue-unblock-2026-05-01-v2` | `6a38cc6b4c55` | superseded — content verified present in main |
| `chore/homepage-country-mode-ux-polish` | `c6e20d7537a4` | superseded — content verified present in main |
| `chore/launch-ops-rls-gate-bug-reports-exempt` | `70dac699360f` | superseded — content verified present in main |
| `chore/quality-metrics-24969985721` | `4906d39c83a3` | superseded — content verified present in main |
| `chore/queue-sync-iter-323` | `70927bc1876b` | loop/status bookkeeping |
| `chore/status-doc-reconcile-2026-05-10` | `9d1d3b6930d4` | loop/status bookkeeping |
| `claude/20h-handsoff-sprint` | `323fd6930fea` | superseded — content verified present in main |
| `claude/audit-2026-04-26` | `a9f4fa2e969b` | superseded — content verified present in main |
| `claude/audit-2026-04-26-follow-up-docs` | `d1286c114e7e` | merge-tree identical to main |
| `claude/audit-baseline-2026-04-27-clean` | `87dc465699cf` | superseded — content verified present in main |
| `claude/audit-baseline-and-reprioritize` | `c58c47743790` | superseded — content verified present in main |
| `claude/audit-codebase-health-8OCxZ` | `231e909d7412` | 0 commits ahead of main |
| `claude/audit-remediation/a-01-drift-list` | `7a1fc1fbf79d` | merge-tree identical to main |
| `claude/audit-remediation/a-02-batch-1-user-data-backfill` | `f9e225d8f39d` | merge-tree identical to main |
| `claude/audit-remediation/a-02-batch-4-advisor-tokens-slots` | `8da39459125f` | merge-tree identical to main |
| `claude/audit-remediation/a-03-batch-1-revenue-backfill` | `330fe38db032` | merge-tree identical to main |
| `claude/audit-remediation/a-03-batch-2-revenue-backfill` | `c883975b2214` | merge-tree identical to main |
| `claude/audit-remediation/a-05-batch1-agent-ops-rls` | `0b94d95f1cc6` | merge-tree identical to main |
| `claude/audit-remediation/a-91-92-marketplace-notify-auth` | `cc5e17b950c7` | merge-tree identical to main |
| `claude/audit-remediation/d-11-batch-15` | `eb78f0a64e2b` | superseded — content verified present in main |
| `claude/audit-remediation/d-11-batch-24` | `3055b9973c12` | superseded — content verified present in main |
| `claude/audit-remediation/d-route-tests` | `6044635547c7` | superseded — content verified present in main |
| `claude/audit-remediation/d-route-tests-2` | `19c5c766da3c` | superseded — content verified present in main |
| `claude/audit-remediation/dd-04-auction-close` | `5d70a68ccbff` | superseded — content verified present in main |
| `claude/audit-remediation/df-01-decision-flows` | `fcb0370b62af` | superseded — content verified present in main |
| `claude/audit-remediation/e-01-with-validated-body` | `5d36e52139d1` | superseded — content verified present in main |
| `claude/audit-remediation/e-02-batch-1-zod-rollout` | `0c5701ed4999` | superseded — content verified present in main |
| `claude/audit-remediation/e-02-batch-2-zod-rollout` | `6dc2ed563bdb` | superseded — content verified present in main |
| `claude/audit-remediation/e-02-batch-3-zod-rollout` | `3aef95cf6014` | superseded — content verified present in main |
| `claude/audit-remediation/e-03-zod-lint-rule` | `aa4251271e09` | superseded — content verified present in main |
| `claude/audit-remediation/f-02-formatdate-consolidation` | `1a5ee3cd8c4a` | superseded — content verified present in main |
| `claude/audit-remediation/f-03-formatcurrency-consolidation` | `0e390351b796` | superseded — content verified present in main |
| `claude/audit-remediation/f-04-slugify-consolidation` | `2ce723d7b2b7` | superseded — content verified present in main |
| `claude/audit-remediation/f-05-console-to-logger` | `439abc1c223a` | superseded — content verified present in main |
| `claude/audit-remediation/f-05a-followup` | `64ddb9a2bff4` | superseded — content verified present in main |
| `claude/audit-remediation/f-06-compliance-copy-ssot` | `aa564e823d7e` | superseded — content verified present in main |
| `claude/audit-remediation/f-followups-lint-staged-sweep` | `e821c5f111f4` | superseded — content verified present in main |
| `claude/audit-remediation/g-01-g-02-migration-hygiene` | `5cb597e34166` | superseded — content verified present in main |
| `claude/audit-remediation/g-03-batch-1-rollback-headers` | `0ab55d756f0a` | superseded — content verified present in main |
| `claude/audit-remediation/g-03-batch-2-rollback-headers` | `48c6773868b0` | superseded — content verified present in main |
| `claude/audit-remediation/g-03-batch-3-rollback-headers` | `0101892a2634` | superseded — content verified present in main |
| `claude/audit-remediation/g-03-batch-4-rollback-headers` | `441bc3635e44` | superseded — content verified present in main |
| `claude/audit-remediation/g-04-partial-failure-marker-doc` | `126b31377247` | superseded — content verified present in main |
| `claude/audit-remediation/gg-03-broker-card-ab` | `7b08265f9488` | superseded — content verified present in main |
| `claude/audit-remediation/i-02-drift-detection-ci` | `6f39e2187099` | superseded — content verified present in main |
| `claude/audit-remediation/i-new-01-metrics-workflow-fix` | `77e49e157e51` | merge-tree identical to main |
| `claude/audit-remediation/i-new-04-main-ci-auto-revert` | `13ad4c000b3c` | merge-tree identical to main |
| `claude/audit-remediation/j-stripe-webhook` | `d0bd18280db6` | superseded — content verified present in main |
| `claude/audit-remediation/kk-01-internal-link-audit` | `1d7643f29e18` | superseded — content verified present in main |
| `claude/audit-remediation/loop-discovery-infrastructure` | `dc24be1d6410` | merge-tree identical to main |
| `claude/audit-remediation/loop-throughput-2x` | `2d5619b50629` | merge-tree identical to main |
| `claude/audit-remediation/m-02-versus-json-ld` | `3ab1bacf4942` | superseded — content verified present in main |
| `claude/audit-remediation/m-05-glossary-linkifier` | `e308b258fe3e` | superseded — content verified present in main |
| `claude/audit-remediation/mm-01-marketplace-coverage-audit` | `0e0c4f45298d` | superseded — content verified present in main |
| `claude/audit-remediation/n-new-01-pre-launch-force-quiz-hero` | `4210d1f836eb` | merge-tree identical to main |
| `claude/audit-remediation/n-ux-perf` | `963e14392015` | merge-tree identical to main |
| `claude/audit-remediation/nf-03-admin-mfa-login-env-guard` | `fee9f82d4a3c` | superseded — content verified present in main |
| `claude/audit-remediation/nf-16-autopilot-db-backed` | `0f1fe6099df4` | merge-tree identical to main |
| `claude/audit-remediation/nf-16-autopilot-toggle-enforcement` | `2f743dd301a9` | superseded — content verified present in main |
| `claude/audit-remediation/o-rls-iter2-article-engagement` | `ce7266534a98` | merge-tree identical to main |
| `claude/audit-remediation/o-rls-iter3-admin-audit` | `b059de647479` | merge-tree identical to main |
| `claude/audit-remediation/o-rls-iter4-bulk-admin` | `154704703cdd` | merge-tree identical to main |
| `claude/audit-remediation/o-rls-no-policy` | `4aedbdab9de1` | merge-tree identical to main |
| `claude/audit-remediation/pp-01-bundle-size-ci` | `a6552e79132a` | superseded — content verified present in main |
| `claude/audit-remediation/pp-02-image-audit-v2` | `f7235714cb5c` | merge-tree identical to main |
| `claude/audit-remediation/queue-7to10-marketplace-ladder` | `2c5339680556` | superseded — content verified present in main |
| `claude/audit-remediation/queue-grooming-2026-05-01` | `4fb2041d26aa` | loop/status bookkeeping |
| `claude/audit-remediation/queue-sync-340` | `a2c74df91398` | loop/status bookkeeping |
| `claude/audit-remediation/r-01-marketplace-allocation` | `da7c31dd08ba` | merge-tree identical to main |
| `claude/audit-remediation/r-10-advisor-application-resolver-tests` | `34e2ea2fc10c` | superseded — content verified present in main |
| `claude/audit-remediation/u-03-email-deliverability` | `b5bd5fbdd863` | merge-tree identical to main |
| `claude/audit-remediation/v-new-02-factual-filter` | `38e4a969de48` | superseded — content verified present in main |
| `claude/audit-remediation/v-polish-extras` | `0260692e22ff` | merge-tree identical to main |
| `claude/audit-remediation/w-01-hubconfig-schema` | `0b668077adf8` | superseded — content verified present in main |
| `claude/audit-remediation/w-12-hub-page-hoc` | `1638394059f2` | superseded — content verified present in main |
| `claude/audit-remediation/w-new-01-calculator-reference-pattern` | `c44f695ab403` | merge-tree identical to main |
| `claude/audit-remediation/x-09-eslint-ratchet` | `06bc4fecacbc` | superseded — content verified present in main |
| `claude/audit-remediation/x-09-preview-advisor-final` | `565e1db20bc1` | merge-tree identical to main |
| `claude/audit-remediation/x-admin-backlog` | `e2a9b5c24872` | merge-tree identical to main |
| `claude/build-analytics-daily-workflow-tsC8o` | `83f19548997a` | superseded — content verified present in main |
| `claude/codebase-health-audit-02o2v` | `b989dbd78b28` | 0 commits ahead of main |
| `claude/d-tests/advisor-auth` | `10042c4b4cb4` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-data` | `cfd2c440715c` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-disputes` | `b47bf57f28d5` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-firm` | `88838c866b3b` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-firm-invite` | `5eb86fe01903` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-payment` | `e105655e9301` | superseded — content verified present in main |
| `claude/d-tests/advisor-auth-topup` | `c16242641773` | superseded — content verified present in main |
| `claude/d-tests/critical-paths` | `431af41c64e9` | superseded — content verified present in main |
| `claude/d-tests/lead-routes` | `b4c6b70ca9ef` | superseded — content verified present in main |
| `claude/d-tests/lib-coverage` | `64f1967736f7` | superseded — content verified present in main |
| `claude/document-automation-progress-32BOA` | `b8fcfba4e248` | superseded — content verified present in main |
| `claude/fix-listings-filter-D6zM8` | `a8ea4217d674` | superseded — content verified present in main |
| `claude/fix-verification-email-quiz-Lurv5` | `2d91c6f32de9` | superseded — content verified present in main |
| `claude/handoff-directory` | `49ab685818cb` | superseded — content verified present in main |
| `claude/invest-wave8-seo-state-bestfor` | `cf5a5d5db658` | superseded — content verified present in main |
| `claude/launch-gate-a90-verification-blocked` | `a41f473bf0e5` | merge-tree identical to main |
| `claude/marketplace-placement-strategy-4IwWQ` | `79fd0cd35edb` | superseded — content verified present in main |
| `claude/nice-archimedes-xQNgJ` | `d8446fcf7aa7` | superseded — content verified present in main |
| `claude/progress-status-update-GMuUX` | `a5cb0e162fdf` | superseded — content verified present in main |
| `claude/queue-update-iters-347-348` | `a4452e22f125` | loop/status bookkeeping |
| `claude/queue-update-iters-349-350` | `8a1fa1d19e44` | loop/status bookkeeping |
| `claude/revert-hero-v3` | `d5d59e97a6ac` | superseded — content verified present in main |
| `claude/review-smsf-grants-features-CKmjJ` | `171af6f96eca` | superseded — content verified present in main |
| `claude/sprint-1/dispatcher-direct-invoke` | `1a4350433737` | merge-tree identical to main |
| `claude/test-ts-errors/sweep-2026-04-29` | `831fe32084a1` | merge-tree identical to main |
| `claude/vercel-billing-usage-mk4ZB` | `a46a4b55d406` | superseded — content verified present in main |
| `claude/verify-audit-scores-WoXfG` | `15acad2b8cbc` | superseded — content verified present in main |
| `codex/clarify-collaboration-process-for-live-updates` | `74fadf973ec6` | 0 commits ahead of main |
| `codex/clarify-collaboration-process-for-live-updates-27285h` | `74fadf973ec6` | 0 commits ahead of main |
| `codex/clarify-collaboration-process-for-live-updates-6c5tgq` | `74fadf973ec6` | 0 commits ahead of main |
| `codex/clarify-collaboration-process-for-live-updates-nbl8lk` | `74fadf973ec6` | 0 commits ahead of main |
| `codex/clarify-collaboration-process-for-live-updates-w28t07` | `74fadf973ec6` | 0 commits ahead of main |
| `codex/revamp-investment-platform-comparison-engine` | `21057a9edf13` | superseded — content verified present in main |
| `country-mode-phase-5c` | `5c3dc9a274ca` | 0 commits ahead of main |
| `country-mode-tracked-clicks` | `9c5593ea6811` | superseded — content verified present in main |
| `d-route-tests` | `cd736c8e9584` | superseded — content verified present in main |
| `deepen-expat-journey` | `b8bfe644eda1` | superseded — content verified present in main |
| `deepen-forum-verified` | `abbee6647535` | superseded — content verified present in main |
| `deepen-investor-pro-value` | `8f4a24845587` | superseded — content verified present in main |
| `deepen-loanrate-admin` | `1b3c0987cd99` | 0 commits ahead of main |
| `docs/launch-design-audit` | `c4b9d3108016` | superseded — content verified present in main |
| `docs/queue-status-2026-06-06b` | `8d9f8d8215d7` | loop/status bookkeeping |
| `eeat-backup` | `40c81bb867b9` | 0 commits ahead of main |
| `feat/best-cross-vertical-companions` | `0788ae16be95` | superseded — content verified present in main |
| `feat/compare-cross-sell-banner` | `b8111c527af1` | superseded — content verified present in main |
| `feat/cross-border-billing-specialties` | `211b25c4bbf6` | superseded — content verified present in main |
| `feat/cross-border-home-section` | `0689aec1f84f` | superseded — content verified present in main |
| `feat/cross-border-strategy-lock` | `f3712e59c2d5` | superseded — content verified present in main |
| `feat/home-redesign-v3` | `39ab6071388f` | superseded — content verified present in main |
| `feat/home-v4-four-ways` | `0a10485c398e` | superseded — content verified present in main |
| `feat/home-v4-hero` | `2fa2b5a9bd9e` | superseded — content verified present in main |
| `feat/home-v4-methodology-position` | `4e53eb358f0b` | superseded — content verified present in main |
| `feat/home-v4-nav-sticky` | `213cae0c9193` | superseded — content verified present in main |
| `feat/home-v4-strip-filters` | `6fb31b7324b0` | superseded — content verified present in main |
| `feat/home-v4-trust-polish` | `c38a8d6ef34f` | superseded — content verified present in main |
| `feat/home-v5-front-door` | `4dc477a20890` | superseded — content verified present in main |
| `feat/home-v6-reviewer-overhaul` | `0c7c829b9842` | superseded — content verified present in main |
| `feat/homepage-design-revisions-claude` | `614fdd96d6e6` | superseded — content verified present in main |
| `feat/invest-marketplace-canonical` | `b7d0dbc97b2b` | superseded — content verified present in main |
| `feat/n8n-overseer-snapshot` | `09a0481dc359` | merge-tree identical to main |
| `feat/n8n-phase2-advisor-onboarding` | `3c4806927276` | merge-tree identical to main |
| `feat/n8n-phase2-cto-daily` | `c04481d0c5b4` | merge-tree identical to main |
| `feat/nav-cross-link-post-a-job` | `e663a513d843` | superseded — content verified present in main |
| `feat/nav-four-ways-restructure` | `b2cb0d0effd9` | superseded — content verified present in main |
| `feat/nav-location-flag-v2` | `b220c275791a` | superseded — content verified present in main |
| `feat/nav-relabels-and-faq-jsonld` | `f49e475925da` | superseded — content verified present in main |
| `feat/pro-analytics-and-verification` | `7a5042b95388` | 0 commits ahead of main |
| `feat/quiz-bundle-results` | `fc5690467399` | superseded — content verified present in main |
| `feat/versus-or-both` | `a704f303ce15` | merge-tree identical to main |
| `feat/webhooks-and-intake-templates` | `7a5042b95388` | 0 commits ahead of main |
| `fix/advisor-auth-tests` | `6eedbd7ac7d3` | superseded — content verified present in main |
| `fix/c-02-test-mocks` | `cf0a9fed8ae3` | superseded — content verified present in main |
| `fix/ci-non-blocking-checks-dev-csp` | `fe4c06a57cda` | superseded — content verified present in main |
| `fix/ci-unblock-revert-prs` | `86b2c3bb2cf8` | merge-tree identical to main |
| `fix/commodity-listings-404` | `0df87b89cd18` | merge-tree identical to main |
| `fix/iter332-queue-update` | `dbf36492ecc8` | loop/status bookkeeping |
| `fix/iter332-queue-update-v2` | `09c3a7d27318` | loop/status bookkeeping |
| `fix/main-rescue-cron-webhook-mock` | `5d1c3bb0a2fb` | superseded — content verified present in main |
| `fix/main-rescue-flag-mock-advisor-concierge` | `6648e46b902b` | merge-tree identical to main |
| `fix/n8n-empty-array-chain-termination` | `db0073c9ec23` | merge-tree identical to main |
| `fix/ooo-queue-sync-iter-324` | `004491d7a368` | loop/status bookkeeping |
| `fix/queue-iter-351-update` | `f2a26f180bc6` | loop/status bookkeeping |
| `fix/queue-kk-row-331` | `a6cad6d9c5ff` | loop/status bookkeeping |
| `fix/queue-restore-327b` | `3882f56798f6` | loop/status bookkeeping |
| `fix/queue-sync-iters-339-340` | `d7274b18a15d` | loop/status bookkeeping |
| `fix/sitefooter-date-hydration` | `be261f2c7590` | merge-tree identical to main |
| `fix/tests-afterEach-import` | `585ea8b12433` | merge-tree identical to main |
| `fix/useSubscription-lint` | `72363b5b059b` | merge-tree identical to main |
| `fix/weights-table-rebase` | `f15462923b28` | superseded — content verified present in main |
| `fix/workflows-yaml-validity` | `254bd67b6a41` | merge-tree identical to main |
| `pre-launch/country-eligibility-advisor-filter-001739` | `1113bd756936` | superseded — content verified present in main |
| `pre-launch/country-rule-alerts-db-020744` | `deefa3d280bf` | superseded — content verified present in main |
| `pre-launch/csv-import-stake-021044` | `a06bcb4c2030` | superseded — content verified present in main |
| `pre-launch/funds-reviews-230706` | `83f66bfca90b` | superseded — content verified present in main |
| `pre-launch/just-jsonld-034001` | `35025ab61fc6` | superseded — content verified present in main |
| `pre-launch/placement-experiments-010851` | `2c72e0d785e8` | superseded — content verified present in main |
| `pre-launch/placement-experiments-fix-types` | `5cb9041c4943` | superseded — content verified present in main |
| `pre-launch/placement-experiments-typesfix2` | `1129afc55992` | superseded — content verified present in main |
| `pre-launch/premium-gating-010808` | `779cbc70ef8c` | superseded — content verified present in main |
| `pre-launch/state-grants-calc-010440` | `78857b4e5c32` | superseded — content verified present in main |
| `pre-launch/status-W3.18-done-145126` | `a0a4f306c4cf` | loop/status bookkeeping |
| `pre-launch/status-doc-reconcile-164616` | `9c1c2d90edb3` | loop/status bookkeeping |
| `pre-launch/status-fhb-savings-031145` | `980a48a6fe70` | loop/status bookkeeping |
| `pre-launch/status-reconcile-020450` | `98d3693c861a` | loop/status bookkeeping |
| `pre-launch/status-reconcile-020516` | `3742ddf029f4` | loop/status bookkeeping |
| `pre-launch/status-reconcile-102808` | `974c3bc8d98e` | loop/status bookkeeping |
| `pre-launch/status-reconcile-221147` | `f0108ceffb78` | loop/status bookkeeping |
| `pre-launch/status-reconcile-233239` | `db8d5b241117` | loop/status bookkeeping |
| `pre-launch/status-reconcile-w29-021952` | `fd67ccbd447c` | loop/status bookkeeping |
| `pre-launch/status-update-235046` | `b36eaacf9d5a` | loop/status bookkeeping |
| `pre-launch/status-w1-2-done-011038` | `c6fadd63430c` | loop/status bookkeeping |
| `pre-launch/status-w1-3-merged-011307` | `f53f6775ddaf` | loop/status bookkeeping |
| `pre-launch/status-w1-merges-010842` | `2bf2e069a48e` | loop/status bookkeeping |
| `pre-launch/status-w319-broker-handoff-215925` | `d3bf2dd500f8` | loop/status bookkeeping |
| `pre-launch/status-w526-inflight` | `4ee0e022506f` | loop/status bookkeeping |
| `queue-housekeeping-iter305` | `5cfba55a7175` | loop/status bookkeeping |
| `queue-housekeeping-iter305b` | `e6a7570ad5ce` | loop/status bookkeeping |
| `queue-housekeeping-iter306` | `e8d9daa73459` | loop/status bookkeeping |
| `queue-update-iter-360` | `41c278e9c683` | loop/status bookkeeping |
| `queue-update-iter-361` | `c328323c2d64` | loop/status bookkeeping |
| `queue-update-iter-362` | `77c33641977e` | loop/status bookkeeping |
| `queue-update-iter-364` | `40a0c6fd3a92` | loop/status bookkeeping |
| `revert/04488c01-auto` | `3ae25fafc600` | auto-revert artifact |
| `revert/0f836ffc-auto` | `7808f91bc3a1` | auto-revert artifact |
| `revert/13bb3263-auto` | `40efa9361c6b` | auto-revert artifact |
| `revert/1cbb0010-auto` | `6bd113c787a8` | auto-revert artifact |
| `revert/1ce55ac8-auto` | `d2a980af7fe1` | auto-revert artifact |
| `revert/1f606090-auto` | `a89e75445d7c` | auto-revert artifact |
| `revert/2608802b-auto` | `0d5e289430c4` | auto-revert artifact |
| `revert/2dd25601-auto` | `dcd54c1dc8ee` | auto-revert artifact |
| `revert/2e8006f2-auto` | `ef0e3149298b` | auto-revert artifact |
| `revert/2ec53037-auto` | `ac0e15688426` | auto-revert artifact |
| `revert/304442e9-auto` | `3808ee28f293` | auto-revert artifact |
| `revert/354deec7-auto` | `42e1bb704092` | auto-revert artifact |
| `revert/3cd718be-auto` | `7e406bd2cf39` | auto-revert artifact |
| `revert/45aefa7f-auto` | `ceafb086c0e5` | auto-revert artifact |
| `revert/51099ca3-auto` | `a702d1c3c1fb` | auto-revert artifact |
| `revert/52e14109-auto` | `d5a28644122e` | auto-revert artifact |
| `revert/554aefb9-auto` | `31f4147e6142` | auto-revert artifact |
| `revert/55987b2e-auto` | `2441521eca0e` | auto-revert artifact |
| `revert/59dbd8e6-auto` | `d7d312cb57d8` | auto-revert artifact |
| `revert/5d4c306b-auto` | `4cbc5ce8be49` | auto-revert artifact |
| `revert/657715fa-auto` | `ad2017bc8fb5` | auto-revert artifact |
| `revert/693fb5e2-auto` | `63e57b697654` | auto-revert artifact |
| `revert/6a7c39a4-auto` | `0d0a52a744a3` | auto-revert artifact |
| `revert/7920facc-auto` | `48e0438eec48` | auto-revert artifact |
| `revert/81041c77-auto` | `af86801e155d` | auto-revert artifact |
| `revert/8497a1d4-auto` | `bdec6a65199e` | auto-revert artifact |
| `revert/87e8fb2b-auto` | `ac662cacc0a6` | auto-revert artifact |
| `revert/8e1cb03d-auto` | `218587cb3561` | auto-revert artifact |
| `revert/958f4f6c-auto` | `578b8aee3d2f` | auto-revert artifact |
| `revert/9a56d6f9-auto` | `14f18c020493` | auto-revert artifact |
| `revert/9bc8a6b7-auto` | `fa64253abb36` | auto-revert artifact |
| `revert/a19ea785-auto` | `ec622c416a11` | auto-revert artifact |
| `revert/a1c15394-auto` | `4e28fc312601` | auto-revert artifact |
| `revert/a224b581-auto` | `7badddf74fd7` | auto-revert artifact |
| `revert/a5690239-auto` | `de495fc2002a` | auto-revert artifact |
| `revert/a925284d-auto` | `8eb197991b6e` | auto-revert artifact |
| `revert/b0cd2bba-auto` | `84a92465d115` | auto-revert artifact |
| `revert/b554f95e-auto` | `2e235eb776b0` | auto-revert artifact |
| `revert/b9d39f4e-auto` | `d153d27d591d` | auto-revert artifact |
| `revert/be0453cb-auto` | `4f3b58b6854c` | auto-revert artifact |
| `revert/c2307929-auto` | `7b474d25f943` | auto-revert artifact |
| `revert/c553ea95-auto` | `2a48a1e9e057` | auto-revert artifact |
| `revert/cc040483-auto` | `4fc50e7f802a` | auto-revert artifact |
| `revert/d26094aa-auto` | `fdb1a9f1c401` | auto-revert artifact |
| `revert/d8226e39-auto` | `6cb7f360d42a` | auto-revert artifact |
| `revert/dd367c71-auto` | `066f0bd84b6d` | auto-revert artifact |
| `revert/e6826f57-auto` | `3b6bce3c050d` | auto-revert artifact |
| `revert/f29012b3-auto` | `78be0b3c2573` | auto-revert artifact |
| `revert/ff2d3a57-auto` | `d36d269f85de` | auto-revert artifact |
| `revert/ff43ed6f-auto` | `20fc0cbd13a3` | auto-revert artifact |
| `temp-types-test-1778287922` | `344912c56d71` | superseded — content verified present in main |
| `ui-a11y` | `3c5ddb30dc58` | superseded — content verified present in main |
| `ui-advisor-compare` | `ff1b4adbad0e` | superseded — content verified present in main |
| `ui-calc-share` | `fbfb168b91d3` | superseded — content verified present in main |
| `ui-dark-mode` | `2d199441e884` | superseded — content verified present in main |
| `ui-discovery` | `336174bb37a6` | superseded — content verified present in main |
| `ui-empty-states` | `14c2d6485ef7` | superseded — content verified present in main |
| `ui-homepage-mobile` | `2ea176ea83cc` | superseded — content verified present in main |
| `ui-my-saves` | `133e3b0c2238` | superseded — content verified present in main |
| `ui-search` | `bc2fa44b7639` | superseded — content verified present in main |
