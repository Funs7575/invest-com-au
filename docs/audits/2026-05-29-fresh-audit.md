# Fresh End-to-End Audit — 2026-05-29

**Method:** independent re-audit using live systems (Supabase advisors + table state, Vercel deploy state, GitHub PRs/CI) cross-referenced with six parallel read-only deep-dive agents (security, testing, code quality, frontend/UX/a11y, performance, compliance/content/SEO) and ground-truth local runs (`tsc`, repo audit-gate scripts, full vitest run).
**Branch audited:** `claude/optimistic-thompson-10Vd7` (= `main` @ `07a634a`).
**Why this exists:** founder-requested fresh pass. Prior audits: `PRODUCT_AUDIT.md` (Apr 15), `codebase-health-2026-04-24.md`, `2026-05-20-new-features-audit.md`. This deliberately re-derives findings from the running system rather than re-reading those, then reconciles.

---

## 1. Executive verdict

This is a **genuinely impressive, defensively-mature pre-launch platform** that has closed most of the scary P0s from the April audit — and the remaining issues are overwhelmingly *uneven application of good primitives*, not missing foundations. The biggest risks are not in the product; they're in the **delivery process** (autonomous-loop churn, CI gates that are green-but-shallow or red-and-tolerated) and in **one regulatory-coverage gap** that matters because of what this business is.

**Overall: B / B+ (solid, launchable after a focused punch-list; not "F").**

The platform's own `metrics-latest.json` reports **grade "F" (0.24)** — but that is a **measurement artifact**: 7 of 13 metrics are `current: null` (coverage, RLS-tables, schema-drift, security/perf advisors, Lighthouse, OG-images couldn't be collected) and score 0. The real picture from live systems is much healthier.

### Dimension scorecard

| Dimension | Grade | One-line |
|---|---|---|
| Security & auth | **A−** | Fail-closed MFA, disciplined service-role, near-total Zod/rate-limit; residual CSP `https:` + non-atomic limiter |
| Database (RLS/perf) | **B−** | RLS now enabled on all 289 tables (huge win) but *enabled ≠ enforced*: 19 always-true policies, 3 DEFINER views, 556 unwrapped `auth.uid()` |
| Testing | **B−** | Strong money/auth/Stripe units; **RLS isolation never actually executed**; mutation testing unwired |
| Code quality | **B** | 0 `@ts-ignore`, great alias hygiene; type-drift leaks `as any` into Stripe money paths; dead `lib/json-ld.ts` |
| Frontend/UX/a11y | **B−** | Excellent directory primitives, ~⅓ adopted; gold-on-white WCAG fail; guides lack TOC/TL;DR |
| Performance | **B** | Exemplary caching/images; 556 unwrapped `auth.uid()`; one edge-cron timeout risk |
| Compliance/content/SEO | **B−** | Avoid-list tripwires closed; warning-coverage test under-covers → ~12 hubs + listings + 1 calc have no GAW |
| Delivery process / CI | **C+** | Loops produced real software fast, but 5 open auto-reverts, red gates on main, paused deploys, dashboard can't self-measure |

---

## 2. Ground-truth snapshot (verified live, not inferred)

- **Type-check:** `tsc --noEmit` → **exit 0** (clean) on HEAD.
- **Full test suite (ground truth):** `vitest run` → **RED**: 7 files / **46 tests failed**, 15,662 passed (15,708 total), 10 unhandled errors. **Every failure is one class** — `admin.from(...).select is not a function` in `fireConsumerWebhook` (`lib/consumer-webhook-dispatch.ts:107`) called from `cron-snapshot-health-scores` and siblings, because the per-file Supabase mock doesn't cover the `api_consumer_webhooks` table. This is the §4.3/§5.1 mock-drift class **quantified on HEAD** — not 46 distinct product bugs, but the test-scaffolding fragility made concrete. (Fix is in-flight as PR #1268, not yet on this branch.)
- **Repo audit gates:** `rate-limit-coverage` **100%** (678 routes, 0 missing); `console-calls` **0** rogue calls; `stale-dated-stats` clean (1789 files). **FAILING:** `duplicate-functions` (5 dupes incl. `renderStars` copied out of the `lib/tracking.ts` single-source) and `jsonld-coverage` (7 public routes missing JSON-LD). Note: `dated-strings`, `rls-isolation`, `rls-migrations` are **diff-scoped** — they pass vacuously with no PR diff, so they protect against *new* drift but never re-scan the whole tree.
- **Supabase RLS:** **289/290 public tables have `rls_enabled: true`** — including `leads` and `email_otps` (both RLS-less in April). Only `spatial_ref_sys` (PostGIS system table) is off — accepted.
- **Supabase security advisors:** 4 ERROR (3 `security_definer_view` incl. `firm_credit_balance_summary`; 1 `rls_disabled_in_public` = `spatial_ref_sys`), 82 WARN: **19 `rls_policy_always_true`**, 26+26 SECURITY DEFINER funcs anon/auth-executable, 5 `function_search_path_mutable`, 3 `extension_in_public`, 1 `public_bucket_allows_listing`, **leaked-password protection OFF**.
- **Supabase performance advisors:** 0 ERROR, 249 WARN, 562 INFO: **112 `auth_rls_initplan`** (bare `auth.uid()` re-eval per row), **137 `multiple_permissive_policies`**, 37 unindexed FKs, 523 unused indexes (mostly a pre-launch/no-traffic artifact — re-evaluate post-traffic).
- **Data state:** pre-launch. Operational tables have real volume (`cron_run_log` 43,969; `broker_price_snapshots` 71,248; `cron_health_alerts` 7,981; `synthetic_check_runs` 3,162) but customer/user tables are ~empty. `brokers` 115, `professionals` 180 (seeded/mock). **`articles` = 0 rows** (was 223 in April) — see §7 content bifurcation.
- **Vercel:** every deployment in the recent window is `CANCELED`/`ERROR`; auto-deploy is effectively **paused** (consistent with the `LOOP_PAUSE` founder backlog-cleanup and PR #1270 "Vercel paused/unconfigured").
- **GitHub:** 18 open PRs incl. **5 bot auto-revert PRs** (#1263, #1254, #1246, #1237, #1220 — failed "deepen"-loop features reverted off main) and two large omnibus drafts (#1271 "15-wave hardening, ~950 tests"; #1272 "Wave 1–4 security/perf/SEO") carrying RLS migrations marked *do-not-auto-apply*.

---

## 3. What's genuinely strong (don't regress these)

- **Auth.** Fail-closed admin MFA with constant-time HMAC verify, layered IP+email lockout + exponential backoff, allowlist re-check after Supabase auth, uniform `requireAdmin`/`requireAdvisorSession`/`enforcePortalKind` gates.
- **Service-role discipline.** The April "admin.ts used in 140+ sites" P0 is **resolved** — nearly every `createAdminClient()` pairs the RLS-bypassing client with an explicit ownership predicate; public-read `brokers` correctly uses the anon key.
- **Money paths.** Stripe webhook signature + idempotency are correct; replayed events converge to one write (genuinely tested).
- **Validation & rate-limit coverage.** Near-total Zod coverage (161→ routes, rule promoted to error); 100% rate-limit coverage with documented exemptions.
- **Caching & images.** Zero raw `<img>` (universal `next/image`, AVIF/WebP, 30-day TTL); broker/homepage batch queries in a single `Promise.all`; sitemap 8-way sharded; `lib/cached-data.ts` deliberately uses the anon client to prevent per-user cache leaks.
- **Directory primitives** (`components/directory/*`) are excellent a11y citizens (labelled search, native range slider, recovery-suggesting EmptyState). Skip link, accessible toasts (`role=status`/`aria-live`), robust dark-mode CSS remap with pre-hydration flash guard.
- **Compliance architecture.** `LICENCE_MODE="factual_only"` flag-gates ratings/rankings OFF pre-AFSL; `filterFactualOutput()` is a strong deterministic AI gate; affiliate/referral disclosure is well-wired; content accuracy is high (franking gross-up math, DASP 35/65%, Div 296 correctly labelled "proposed").
- **Regulatory avoid-list tripwires are closed:** startup equity raises gated behind `WholesaleAttestationGate` + s708; `tax-optimizer`/`portfolio-xray` APIs return 410; Sharesight is read-only (the named lean-lane alternative), not CDR ingestion; the orphan plaintext-token `sharesight_connections` table was dropped.

---

## 4. Findings by dimension

Severity: **P0** = launch-blocking / legal-or-data exposure · **P1** = fix before scaling traffic · **P2** = quality/maintainability · **P3** = polish.

### 4.1 Security (Grade A−)
- **[P1] CSP keeps a bare `https:` script-src fallback** — `proxy.ts:151`. On CSP2 browsers (Safari <15.4, old WebViews) `strict-dynamic` is ignored and `https:` permits any HTTPS-hosted script → XSS not contained on a non-trivial AU iOS slice. Drop `https:` or use an explicit host allowlist.
- **[P2] DB token-bucket limiter is not atomic** — `lib/rate-limit-db.ts:109-125`. The UPDATE filters only `scope`+`key`, not the read token value, so concurrent requests lose a decrement and can burst over the limit. This backs ~177 endpoints (leads, signup, OTP). Move the decrement into a Postgres RPC (the `admin_rate_limit_increment` pattern at `app/api/admin/login/route.ts:68` already does this correctly).
- **[P2] Non-constant-time webhook secret compare** — `lib/telegram.ts:45` uses `===` for the Telegram secret token while every other secret check uses `timingSafeEqual`. Use the constant-time helper.
- **[P3] `RATE_LIMIT_HARD_FAIL` is documented but unimplemented** — grep finds zero references in `lib/`/`app/`; both limiters fail open unconditionally. A sustained Supabase outage silently disables all rate limiting. Implement the toggle or fix the docs (CLAUDE.md + ARCHITECTURE.md both promise it).
- **[P3] `IP_HASH_SALT` defaults to a hardcoded literal** (`"invest-com-au-2026"`) in `/go/[slug]`, admin login, marketplace postback — set it in prod or fail closed if unset. (No open-redirect/SSRF — affiliate destinations are DB-controlled.)

### 4.2 Database / RLS / DB-perf (Grade B−)
- **[P0-watch] "Enabled ≠ enforced."** RLS coverage is now ~complete, but **19 `rls_policy_always_true`** policies + **3 SECURITY DEFINER views** (`firm_credit_balance_summary` et al., which run as creator and bypass the caller's RLS) + **52 anon/authenticated-executable SECURITY DEFINER functions** mean the actual isolation property is unverified. Combined with §4.3's finding that *no test executes RLS*, a logically-wrong policy ships green. **Do a policy-correctness pass** (audit each always-true policy; convert DEFINER views to `security_invoker` or lock down grants) before real user data lands.
- **[P1] 112 policies use bare `auth.uid()` (`auth_rls_initplan`)** — re-evaluated per row instead of once per query. 556 occurrences across migration files, **zero** wrapped as `(select auth.uid())`. Recreate hot user-data policies (holdings, bookmarks, notifications, watchlist, saved_searches) with the wrapped form.
- **[P1] 137 `multiple_permissive_policies`** — multiple permissive policies per role/action are each evaluated; consolidate per table/action.
- **[P2] Leaked-password protection is OFF** (HaveIBeenPwned check). Enable in Supabase Auth settings.
- **[P2] 5 `function_search_path_mutable`** — set `search_path` on these functions (privilege-escalation hardening).
- **[P2] 37 unindexed foreign keys**; **523 unused indexes** — defer the unused-index cleanup until post-traffic (they read "unused" only because there's no production load yet), but add the missing FK indexes.

### 4.3 Testing (Grade B−)
- **[P0] RLS isolation is never actually executed.** `__tests__/integration/o-iter6.rls.int.test.ts:20-26` regex-parses migration SQL; the harness (`__tests__/integration/harness.ts:30`) fakes Supabase auth. No test asserts "user A cannot read user B's rows." A `USING (true)` policy passes. **Add a real-Postgres job** (supabase-local or a pg container) executing as two JWTs for the 5–10 hottest user-data tables. This is the single highest-leverage test investment given §4.2.
- **[P0] Mutation testing configured but not installed/wired** — `stryker.config.mjs` is a skeleton (not in `package.json`, no CI job, no baseline). Coverage floors measure execution, not assertion strength — which matters because the bulk route tests inflate coverage while asserting little. Enable Stryker weekly on the 6 critical files the config already names.
- **[P1] Bulk per-route tests verify the auth gate, not behavior** — e.g. `__tests__/api/admin-ai-chat.test.ts:88-108` tests 401/401/503 then stops; `cron-complaints-sla.test.ts:51-57` only asserts `total_open===0` on empty data. This is the dominant shape across the ~213-file sweep. Seed breaching/non-breaching rows and assert the action taken.
- **[P1] Supabase chain mock is copy-pasted across ~184 files (3+ incompatible variants); only 55 use the shared helper** — this is the documented auto-revert cause (a route adds a `.from('x')` → per-file mocks throw → main CI breaks → revert PR). Mandate `createChainableBuilder`; add a lint guard banning local `mockReturnThis()` builders.
- **[P1] No authenticated/checkout E2E** — all 17 specs are render-no-5xx or auth-redirect. No spec logs in, completes a Stripe test-mode checkout, or drives a portal action. Add 2–3 seeded-user journeys.
- **[P1] 148/149 `Date`-using test files run on the real clock** (11 use fake timers); flaky-triage (`docs/flaky-test-triage.md`) is an unimplemented design doc; `retries=2` masks flakes. Use fake timers for any expiry/window/SLA assertion.
- *Positive:* `submit-lead`, `dynamic-pricing`, `rate-limit-db`, `stripe-webhook-idempotency`, `cron-auth` tests are genuinely strong and would catch real regressions.

### 4.4 Code quality (Grade B)
- **[P1] Type-drift leaks `as any` into Stripe money paths** — `lib/stripe-webhook/handlers/api-key-subscription.ts:62,86,126,148,175` (`(ctx.admin as any).from("api_keys").update(...)` on billing columns; 4 of 5 disables lack a reason); `charge-refunded.ts:217` hand-rebuilds the query-builder type for `advisor_credit_ledger` in refund-ledger logic. Root cause: tables/columns missing from generated `lib/database.types.ts`. **Regenerate the types** — one action removes ~40 of 46 `as any` and the worst `as unknown as` in money code.
- **[P1] `lib/json-ld.ts` is a dead duplicate of the blessed `lib/schema-markup.ts`** — 7 shadow builders, **zero importers**. A contributor will import it by mistake. Delete it; keep the `components/JsonLd.tsx` render wrapper.
- **[P2] `lib/database.types.ts` is 19,059 lines — 95% of the 20k split trigger** in `ARCHITECTURE.md:288` (which still records a stale "~13,300"). Update the doc figure now; pre-stage the per-domain split.
- **[P2] Conflicting-unit money formatters** — `formatCurrency` (dollars in 7 files vs cents in `lib/currency.ts`) and `formatAUD` (cents vs dollars) are allowlisted with "swapping double-divides" comments — exactly the latent bug. Rename to put the unit in the name (`formatDollarsAUD`/`formatCentsAUD`).
- **[P2] Tracked scratch files at repo root** — `__qa_cmp.mjs`, `__qa_super.mjs` (one-off localhost:3100 Playwright probes). Delete.
- **[P2] Inner fire-and-forget fan-outs lack per-call `.catch`** — e.g. `app/api/cron/advisor-quality/route.ts:66,207,278,315`; one failed recipient can silently drop the rest of a notification loop. Wrap with `.catch`/`Promise.allSettled`.
- *Positive:* 0 `@ts-ignore`/`@ts-expect-error` in prod, ~2 rogue `console.*`, only 2 deep-relative imports (alias hygiene near-perfect), low TODO density (35 in 119K LOC).

### 4.5 Frontend / UX / a11y (Grade B−)
- **[P1] Institutional Gold as foreground text fails WCAG** — `text-amber-500` (#EAB308) heading accents on white (~25 heroes, e.g. `app/global-investing/page.tsx:265`, `app/foreign-investment/{shares,tax,crypto}/page.tsx`) ≈ 1.9:1, fails even the 3:1 large-text bar. Use `amber-600/700` on white (add a `html.dark .text-amber-600` remap to stay bright on navy). Gold-on-navy is fine — leave it.
- **[P1] The two biggest directories bypass the primitives** — `app/advisors/AdvisorsClient.tsx` (1602 lines) and `app/find-advisor/page.tsx` (1750 lines) import none of `components/directory/*`; they reimplement search/filter/sort/compare/empty inline. The unification is ~⅓ done; this is the source of the empty-state inconsistency below.
- **[P1] Empty-state handling is inconsistent post-revert** — shared `EmptyState` used by only 5 files; ≥32 ad-hoc empties (the flagship `AdvisorsClient.tsx:1387` hand-rolls `<p>No advisors found</p>`). `find-advisor` has *no* no-match state (dead end). Route them through `EmptyState`.
- **[P1] Multiple bottom-fixed elements collide on mobile/tablet** — `MobileBottomNav` (`bottom-0 z-40 md:hidden`), `ListingCompareBar`, `StickyAdFooter` (both `bottom-0 z-40`), `MobileFloatingCTA` (`bottom-0 z-50 lg:hidden`), `QuizPromptBar` — stack on a mobile `/invest` page; the `md:hidden`/`lg:hidden` mismatch overlaps CTA+footer on tablet. Add a single bottom-stack manager / shared offset var.
- **[P1] Modal focus management is inconsistent** — `ConfirmDialog.tsx` is the gold standard (trap+Escape+labelled) but `ExitIntentModal`/`NewsletterExitIntentModal` (no trap/Escape), `CsvImportModal` (no `role=dialog`), `AdminSearch`/`AdminHelpPanel` (no trap) drift; **none restore focus to the trigger** on close. Extract a `useDialog` hook and apply.
- **[P1] Long-form guides lack a TOC and TL;DR** — of ~40 rebuilt guides, 1 has a TOC and 4 have a TL;DR. These are SEO money pages; bounce + featured-snippet eligibility suffer. Add a shared `<GuideTOC>` (auto-built from h2s) + an answer-first "Quick answer" box. (Heading hierarchy is already clean; 49 guides use accessible `<details>` FAQ accordions.)
- **[P2] Nested `<main>` landmarks** — `LayoutShell.tsx:64` renders `<main>` and 71 pages render their own inside it. Change page-level `<main>` to `<section>`.
- **[P2] axe a11y is chromium-only on ~14 static public routes** — admin/account/portal/guides are never scanned (where the contrast + interactive a11y bugs live). Add a logged-in fixture.

### 4.6 Performance (Grade B)
- **[P1] `marketplace-stats` cron runs serial N+1 + per-row emails on the EDGE runtime** — `app/api/cron/marketplace-stats/route.ts:9` (`runtime="edge"`, `maxDuration=60`); a `for (const broker)` loop does 3 sequential count queries + a `fetch()` to Resend per broker. Will silently time out and partially re-send as brokers grow. Move to `nodejs`/`maxDuration=300`, batch the counts (group-by), parallelize sends.
- **[P1] 556 unwrapped `auth.uid()` in RLS** — same as §4.2; cheapest broad DB-CPU reduction.
- **[P2] Hot broker-page review query seq-scans every regen** — `app/broker/[slug]/page.tsx:124` filters `user_reviews(broker_slug, status='approved')` but the only index is on `(broker_id, …) WHERE status='published'` (wrong column + wrong predicate). Add `idx_user_reviews_slug_approved (broker_slug, created_at DESC) WHERE status='approved'`.
- **[P2] `recompute-trust-scores` does 2 serial writes per advisor with no batch cap** — `app/api/cron/recompute-trust-scores/route.ts:106,125`; will exceed the 5-min limit at a few thousand advisors. Compute in memory, single bulk upsert.
- **[P2] Huge top-level `"use client"` SEO pages** — `app/find-advisor/page.tsx` (1750 lines, line-1 `"use client"`) ships a large bundle and renders client-side, hurting mobile LCP/TBT. Split a server shell + a client island.
- **[P2] `select('*')` on wide `brokers` in cached hot paths** — `lib/cached-data.ts:63` pulls every column just to compute a 3-item similar-brokers list. Add a scoped projection.
- **[P3] Lighthouse budgets are loose and desktop-only** — `.lighthouserc*.json` are `warn`-only (perf minScore 0.7, LCP up to 6000ms) and `preset:"desktop"`; **mobile CWV is never measured** despite AU mobile-heavy traffic. Add a mobile run; tighten LCP toward 2500ms. Bundle-size workflow is advisory-only.

### 4.7 Compliance / content / SEO (Grade B−)
- **[P1] AFSL warning-coverage test under-covers** — `__tests__/lib/afsl-compliance-coverage.test.ts:20` `MANDATORY_ROOTS` omits `app/invest`, `app/best-for`, `app/dividends`, `app/smsf`, `app/retirement`, `app/aged-care`, `app/home-loans`, `app/insurance`, `app/tax`, `app/global-investing`, `app/foreign-investment`, `app/robo-advisors`, `app/term-deposits`, `app/savings`, `app/tools`. The whole class below is invisible to CI. **Fix this first — it surfaces and locks in the rest.**
- **[P1] ~12 `/invest/*` product hubs render no general-advice warning** — *verified*: mining, gold, private-credit, funds, farmland, startups, renewable-energy, ipos (and private-equity, digital-infrastructure, franchise, buy-business) have zero warning, despite discussing specific products and embedding enquiry CTAs. Only 4 commodity pages use `components/commodities/GeneralAdviceWarning`. Mount it on every `/invest/*` hub.
- **[P1] Investment-listing detail + enquiry surfaces carry no GAW** — `components/ListingEnquiryForm.tsx`, `components/ListingCard.tsx`, listing detail pages. Enquiring about a *specific* deal with no warning is the most advice-adjacent surface on the site. Render `ListingComplianceNotice`/GAW on listing index + detail + inside the enquiry form.
- **[P1] `/dividends/calculator` has zero compliance text** — *verified*: `app/dividends/calculator/FrankingCalculatorClient.tsx` (0 matches). It sits outside `app/calculators/` so it dodges the calculator-layout disclaimer. Add `FACTUAL_CALCULATOR_DISCLAIMER`.
- **[P2] SMSF guides lack the super warning** — `app/smsf/setup/page.tsx` (+ investment-strategy, checklist) have no `SUPER_WARNING`/GAW. High-risk vertical.
- **[P2] `/best-for/[slug]` ranking page hardcodes its disclaimer** — `app/best-for/[slug]/page.tsx:245` inlines a literal instead of `GENERAL_ADVICE_WARNING`, and the root isn't in the AFSL test. A ranking page is exactly what needs the full warning via `ComplianceFooter`.
- **[P2] Site-wide chatbot skips `filterFactualOutput()`** — `app/api/chatbot/route.ts:97` returns `result.reply` directly; `ChatWidget` is mounted in `app/layout.tsx` (every page). Input is classified but output is trusted to obey the prompt. Run the reply through the same deterministic gate every other AI surface uses.
- **[P2] Rebuilt guides emit only breadcrumb + FAQ schema — no Article/Person/Organization, no byline** — `articleJsonLd`/`personJsonLd` exist but are unused on the new long-form YMYL content (E-E-A-T weakness on the aged domain). Add `articleJsonLd` + a visible "Reviewed by" byline.
- **[P2] noindex'd empty hubs are still in the sitemap** — `/stories`, `/alerts`, `/reports`, `/consultations` are `robots:{index:false}` yet hardcoded in `app/sitemap.ts` shard-0 — a conflicting crawl signal that matters more during the Oct–Dec 2026 migration. Drop them from the static list until seeded.
- **[P2] Site-wide date drift** — *verified*: `lib/seo.ts:13` `CURRENT_MONTH_YEAR="March 2026"` while today is 2026-05-29, so every page reads "Updated March 2026" (2 months stale). The dated-strings gate regex requires a day so it can't catch bare "March 2026". Bump the constant; extend the gate regex.
- **[P3] Three compliance-copy sources now exist** — `lib/compliance.ts` (the named SSOT), `lib/compliance-config.ts` (`FACTUAL_*` constants), and inline literals. Consolidate to avoid drift in regulated copy.
- *Positive:* `/broker/[slug]` and `/compare/*` are fully covered; content accuracy is high; avoid-list tripwires are closed (§3).

---

## 5. Cross-cutting / process & meta findings

These are the highest-signal observations a per-file review misses.

1. **The autonomous loops shipped a lot of real software — and a real churn tax.** 5 open auto-revert PRs, a `MAIN-RESCUE` branch, and repeated "deepen loop added X without updating mocks → main CI broke" entries in the remediation queue. **Root cause is structural, not bad luck:** admin-merges bypass CI + the copy-pasted Supabase mock (§4.3) makes any new `.from()` break unrelated tests. Fixing the shared-mock fragility removes most of this class. **This is not hypothetical — HEAD itself is red: 46 failing tests, all the `consumer-webhook-dispatch` mock-drift class (see §2).**
2. **"Green CI" overstates safety; "F dashboard" understates it.** Several gates are diff-scoped (pass with no diff) or shallow (jsonld-coverage only checks *presence*; afsl-coverage omits most roots; coverage floors measure execution not assertions). Meanwhile `metrics-latest.json` can't collect 7/13 metrics and self-grades "F." **Both the safety signal and the health signal are partly broken** — invest in making the dashboard actually collect (coverage %, advisor counts, drift) and in deepening the gates that matter.
3. **"Enabled ≠ enforced" is the unifying DB risk.** RLS coverage went from 11 gaps to ~complete (excellent), but 19 always-true policies + DEFINER views/functions + *no test that executes RLS* means the isolation property is asserted nowhere. This is the one place a confident "we're secure" could be wrong once real users arrive.
4. **Content has bifurcated into two parallel systems.** All real content now lives in hundreds of hand-built static TSX guide pages, while the **DB `articles` system (0 rows)** — admin CMS editor, `/article/[slug]`, `/articles`, plus crons `auto-publish`/`weekly-newsletter`/`content-staleness`/`embeddings-refresh`/`personalized-digest` and the article-scorecard/OG-image machinery — is fully wired but idling on an empty table (55 files still read it). Either the DB system is the post-launch CMO-agent path (then document that) or it's orphaned overhead (then prune it). Every content edit is now a deploy, and `M12 OG-image coverage` reading 0 is a direct consequence.
5. **Type-drift is one root cause with many symptoms.** The `as any` in money paths, the `as unknown as` in the public v1 API, and the 19k-line-but-incomplete `database.types.ts` all trace to tables/columns not in the generated types. One regen + a CI `db:types:check` that actually runs would retire a whole finding cluster.
6. **Deploys are paused.** Reasonable during backlog cleanup, but it means none of the merged work is verified in production and the "is it actually live?" question (`articles=0`, paused crons' real behavior) can't be answered from prod. Re-enable a preview/prod deploy before launch sign-off.

---

## 6. Prioritized punch list

### Do before real user traffic / launch (P0–P1)
0. **(Immediate) Get `main` green.** 46 tests fail on HEAD — all the `consumer-webhook-dispatch` mock-drift class. Land the PR #1268-style mock fix. A red `main` means the auto-revert safety net and every open PR's CI are operating on a broken baseline.
1. **Add the missing roots to `afsl-compliance-coverage.test.ts`**, then mount the general-advice warning on the surfaces it exposes: ~12 `/invest/*` hubs, listing detail + `ListingEnquiryForm`, `/dividends/calculator`, SMSF guides, `/best-for/[slug]`. *(1 test + N small component edits; closes the only genuine pre-AFSL liability.)*
2. **Run the chatbot reply through `filterFactualOutput()`** (site-wide AI surface).
3. **Add real-Postgres RLS-isolation tests** for the hottest user-data tables, and **audit the 19 always-true policies + 3 DEFINER views** ("enabled ≠ enforced").
4. **Fix the shared Supabase test mock** (consolidate on `createChainableBuilder`, lint-ban local builders) — removes the auto-revert churn class.
5. **Regenerate `lib/database.types.ts`** and wire `db:types:check` into CI — retires the `as any` in Stripe money paths and the v1 API casts; then split the file before 20k lines.
6. **CSP:** drop the bare `https:` script-src fallback (or host-allowlist).
7. **Re-enable a deploy** (preview at least) to verify merged work and answer the `articles=0` / paused-cron questions.

### Fix before scaling (P1–P2)
8. **Wrap `auth.uid()` → `(select auth.uid())`** on hot RLS policies (112 lints / 556 occurrences); consolidate multiple-permissive policies; add the 37 FK indexes + the `user_reviews` slug/approved index.
9. **`marketplace-stats` cron** → nodejs runtime + batched counts + parallel sends; cap/batch `recompute-trust-scores`.
10. **Gold-on-white WCAG fix** (`amber-500`→`amber-600/700` on ~25 heroes + dark remap).
11. **Migrate `AdvisorsClient`/`find-advisor` onto directory primitives + shared `EmptyState`;** resolve the bottom-fixed mobile stacking collision; extract a `useDialog` focus-trap hook.
12. **Add `<GuideTOC>` + TL;DR + Article/Person JSON-LD + byline** to the rebuilt guides.
13. **Bump `CURRENT_MONTH_YEAR`** and extend the dated-strings gate to month-year; drop noindex hubs from the sitemap.
14. **Make the quality dashboard actually collect** its 7 null metrics; deepen the shallow gates (jsonld type-correctness, full-tree dated-strings).

### Hygiene (P2–P3)
15. Delete dead `lib/json-ld.ts`; delete `__qa_cmp.mjs`/`__qa_super.mjs`; rename conflicting-unit money formatters; fix the 5 `duplicate-functions` failures (esp. `renderStars` ← `lib/tracking.ts`) and 7 `jsonld-coverage` gaps that are currently **red on main**.
16. Enable leaked-password protection; set function `search_path`; implement-or-document `RATE_LIMIT_HARD_FAIL`; set `IP_HASH_SALT` in prod; constant-time the Telegram secret compare.
17. Wire Stryker mutation testing (weekly, the 6 named files); add a logged-in axe fixture; add 2–3 authed/checkout E2E.
18. Reconcile the **content bifurcation** decision (keep + document the DB-article path, or prune it).

---

## 7. Reconciliation with prior audits

- **April `codebase-health` P0s — status:** schema drift (231 tables) → **substantially reconciled** (2026-05-17 backfill batch); RLS on `leads`/`email_otps` → **fixed** (both now RLS-enabled); admin.ts 140+ misuse → **resolved** (service-role now ownership-scoped); API-route test coverage 81% untested → **261/294 now tested**; Zod 2 routes → **161**. Strong remediation execution.
- **May `new-features` audit P0s — status:** sharesight orphan token table → **dropped** ✓; startup raises s708 gate → **gated** ✓; admin MFA fail-closed → **PR #1176 (open)**; carbon/ACCU compliance TODO → **still present** (`app/invest/carbon-environmental-markets/listings/page.tsx:23`); presence/TMD/disclosure items → mostly still open (see that doc).
- **New this pass:** the content bifurcation (§5.4), "enabled ≠ enforced" RLS correctness (§5.3), the under-covering AFSL test (§4.7), the auto-revert churn root cause (§5.1), and the dashboard/gate measurement gaps (§5.2).

---

*Produced by an independent multi-agent + live-systems pass; read-only except for this report. File:line references point to HEAD `07a634a`.*
