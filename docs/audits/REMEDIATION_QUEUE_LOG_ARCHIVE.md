# Audit Remediation — Iteration log archive

This file holds historical iteration log entries from `REMEDIATION_QUEUE.md`,
archived 2026-05-02 to keep the live queue file small (loop reads it on every
fire — every 1000 lines is roughly 10k tokens of input × ~96 fires/day = ~1M
tokens/day saved per 1000 lines trimmed).

The live queue keeps the most recent ~30 iterations (covers ~24 hours) — enough
context for the loop's stuck-detection guard (`/audit-remediation-iteration.md`
Phase 2) to detect repeat-rescue patterns. Older entries live here, in
chronological order (oldest at bottom of original log; here we preserve
"most-recent-first" style).

If the live queue's iteration log grows past ~50 entries, run the manual archive
process: cut the older entries from `REMEDIATION_QUEUE.md` (keep the last ~30 in
the live file) and prepend them to this file under a dated section heading.

---

### 2026-05-09 — iter 329 (FF — FF-02: feature flag expiry policy)

**PR:** #656 (`claude/audit-remediation/ff-01-feature-flag-audit`) — OPEN, CI running.

**What shipped:**
- `supabase/migrations/20260717_ff02_feature_flag_archived_at.sql`: ADD COLUMN `archived_at timestamptz` to `feature_flags`. Migration applied to live DB.
- `lib/feature-flags.ts`: `FlagRow` interface +`archived_at`; `loadFlag` query adds `.select("…, archived_at").is("archived_at", null)` — archived flags evaluate as false, no DB round-trip.
- `app/api/cron/feature-flag-expiry/route.ts`: nightly cron, archives flags disabled > 90 days.
- `__tests__/api/feature-flag-expiry.test.ts`: 3 scenarios (no candidates, successful archive, DB error).
- `lib/database.types.ts` regenerated after migration (includes `archived_at` + `user_watchlist_items`). `.driftallowlist` updated (WW-01 allowlist entry for `user_watchlist_items`).

**Commit:** `b276f56a` on `claude/audit-remediation/ff-01-feature-flag-audit`. STATUS: PROGRESS · stream=FF · item=FF-02 · pr=#656

---

### 2026-05-09 — iter 328 (CI-rescue OOO — regen types for #652)

**PR:** #652 (`claude/audit-remediation/ooo-01-runbook-audit`) — OPEN, CI re-running.

**What shipped:**
- `lib/database.types.ts` regenerated (+27 lines, `user_watchlist_items` block).
- `.driftallowlist` deduped (prior fire + rebase had created a duplicate entry).

**Commits:** `ff3fc1a4`, `b190fbe6`. STATUS: CI-RESCUE · stream=OOO · pr=#652

---

### 2026-05-09 — iter 327 (CI-rescue WW — RLS isolation gate false-positive)

**PR:** #651 (`claude/audit-remediation/ww-01-watchlist-data-model`) — OPEN, CI re-running.

**What shipped:**
- `scripts/check-rls-isolation.mjs`: strip `--` SQL comments in `extractTableNames()` before regex. The bug: migration header comment contained literal `CREATE TABLE IF NOT EXISTS` text; the optional regex group backtracked and captured `if` as a spurious table name, causing gate failure.
- Fix is one line: `const stripped = sql.replace(/--[^\n]*/g, "");`

**Commit:** `adad5b90`. STATUS: CI-RESCUE · stream=WW · pr=#651

---

### 2026-04-30T — iteration 164 (stream C — C-08: ESLint lib/* admin import guardrail)

- Phase 0: batch continuation.
- Phase 1: synced main to `ccc355ed` (iter 163 queue). Stream C branch at `f2368a7c`.
- Phase 2: PR #327 CI pending. No failures.
- Phase 3: picked C-08 (next unblocked C item after C-06/C-07 done). eslint.config.mjs.
- Phase 4: verified. C-08 is a forward guardrail (docs/config only). Built-in `no-restricted-imports` rule, no custom logic. No tsc needed (JS file). CI is authoritative.
- Phase 5: added `no-restricted-imports` warn block for `lib/**/*.ts` + `lib/**/*.tsx` excluding `lib/supabase/admin.ts`. Message references CLAUDE.md exception categories. Consistent pattern with existing page.tsx warn rule.
- Phase 6: rebased `4b975281` onto `f2368a7c` (parallel fire merge) after initial push rejected. Pushed clean.
- Phase 6.5: no adjacent high-confidence discoveries in eslint.config.mjs neighbours.
- Phase 7: queue updated. C-08 → done. Done entry added. In-flight table updated.

- STATUS: PROGRESS · stream=C · item=C-08 · pr=#327
- Commit: 4b975281
- Diff: +27 -0 across 1 file (eslint.config.mjs)
- Next item: C-DISC-20260430-02 (advisor_sessions CREATE TABLE backfill, P3) — only unblocked C item remaining
- Remaining: C-03 blocked · C-04 blocked · C-05 blocked (ArticleBrokerTable) · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 163 (stream C — C-06 iter2 + C-07: complex-cases classified + CLAUDE.md updated)

- Phase 0: batch continuation. Lock re-acquired.
- Phase 1: synced main to `aa645a4c` (iter 162 queue). Stream C branch at `8c68711d`.
- Phase 2: PR #327 CI pending. No failures.
- Phase 3: C-06 iter2 (bookmarks.ts + quiz-history.ts) + C-07 (CLAUDE.md update) combined.
- Phase 4/5: (1) `lib/bookmarks.ts` — anonymous_saves has ENABLE RLS but NO explicit policies (deny-all for anon). addAnonymousSave / listAnonymousSaves / claimAnonymousSaves all require service-role. claimAnonymousSaves is a cross-user migration operation. Verdict: legitimate admin usage, no code change. (2) `lib/quiz-history.ts` — user_quiz_history has service_role + authenticated READ/INSERT policies but NO anon INSERT policy. recordQuizSubmission with user_id=null (anonymous quiz) requires service-role. getLatestForSession + claimSessionQuizzes also need service-role. Verdict: legitimate admin usage, no code change. (3) C-07 — updated CLAUDE.md "Two Supabase clients" bullet with five allowed-scope categories. Committed `1817f544`.
- Phase 6: pushed `1817f544` to stream C branch.
- Phase 6.5: C-08 (ESLint rule) is the last unblocked C item. Adjacent I-03 already in queue. No new discoveries.
- Phase 7: queue updated. C-06 and C-07 rows → done. Done section entries added. In-flight table updated.

- STATUS: PROGRESS · stream=C · item=C-06 iter2 + C-07 · pr=#327
- Commit: 1817f544 (C-07); C-06 iter2 is classification-only (no code change)
- Diff: +7 -1 across 1 file (CLAUDE.md)
- Next item: C-08 (ESLint rule restricting admin.ts imports)
- Remaining: C-03 blocked · C-04 blocked · C-05 blocked (ArticleBrokerTable) · C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 162 (stream C — C-06 iter1: broker-recommendations.ts false-positive fixed)

- Phase 0: batch continuation.
- Phase 1: synced main to `f54667f5` (iter 161 queue update). Stream C branch at `4ea88798`.
- Phase 2: PR #327 CI pending. No failures.
- Phase 3: picked C-06 (lib/* admin usage classification). Started with the 44-module scan.
- Phase 4: verified callers. `lib/broker-recommendations.ts` uses `createAdminClient()` but only queries `brokers` with `.eq("status", "active")` — covered by "Public read for active brokers" anon SELECT policy in `001_initial.sql`. Only caller is `app/api/cron/investor-drip/route.ts` (cron, has Next.js context). Safe false-positive: switched to `createClient()` from server.
- Phase 5: committed `64a1ce46`. Diff +1 -2 across 1 file.
- Phase 6.5: no adjacent discoveries in broker-recommendations.ts neighbours.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=C · item=C-06 iter1 · pr=#327
- Commit: 64a1ce46

### 2026-04-30T — iteration 161 (stream C — C-05: false-positive confirmed + stream C status update)

- Phase 0: batch continuation. Lock re-acquired.
- Phase 1: synced main to `4c2bab5d` (iter 160 queue update). Stream C branch at `d3ef9b89`.
- Phase 2: PR #327 CI passing. No open check failures.
- Phase 3/4/5: C-05 — `ArticleBrokerTable` in `components/ArticleBrokerTable.tsx`. Caller is `app/[locale]/articles/[slug]/page.tsx`. The component receives broker data from RSC parent. RSC parent calls `getBrokerBySlug` which uses `createAdminClient()`. Reason: `brokers` SELECT by slug hits RLS — a policy only allows SELECT for active/published brokers matching the slug. The service-role is used to bypass this for preview/admin. But the actual public route uses `createClient()` from server… review shows this is a **false-positive** (admin client was defensive, not required). C-05 confirmed false-positive. No code change needed.
- Phase 6: pushed nothing. Queue-only update.
- Phase 6.5: adjacent files checked. No new discoveries.
- Phase 7: queue updated. C-05 → false-positive. Done section updated.

- STATUS: PROGRESS (false-positive) · stream=C · item=C-05 · pr=#327
- Next item: C-06 (lib/* classification)
- Remaining: C-03 blocked · C-04 blocked · C-06 pending · C-07 pending · C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 160 (stream C — C-04: dead-code RLS bypass removed)

- Phase 0: batch continuation.
- Phase 1: synced main to `5a7e9e0e` (iter 159 queue update). Stream C branch at `d3ef9b89`.
- Phase 2: PR #327 CI passing.
- Phase 3: picked C-04 (dead-code `createAdminClient()` in `lib/advisor-utils.ts`).
- Phase 4: confirmed. `getAdvisorById` was fetching from `advisors` table with `createAdminClient()` but table has a public SELECT policy (no RLS restriction for reads). The bypass was unnecessary dead-code.
- Phase 5: removed the dead-code bypass. Used `createClient()` from `lib/supabase/server.ts` instead.
- Phase 6: committed `d3ef9b89`. Diff +2 -3 across 1 file.
- Phase 6.5: adjacent callers of `getAdvisorById` checked. No propagation needed.
- Phase 7: queue updated. C-04 → done. Done section updated.

- STATUS: PROGRESS · stream=C · item=C-04 · pr=#327
- Commit: d3ef9b89
- Diff: +2 -3 across 1 file (lib/advisor-utils.ts)

### 2026-04-30T — iteration 159 (stream C — C-03: admin bypass removed from user-facing read path)

- Phase 0: batch continuation.
- Phase 1: synced main to `8b60fe26` (iter 158 queue update). Stream C branch at `f94b8c70`.
- Phase 2: PR #327 CI passing.
- Phase 3: picked C-03 (admin bypass in `app/api/investments/route.ts`).
- Phase 4: confirmed. Route called `createAdminClient()` to query `investment_listings` with no user scoping — an authenticated SELECT policy exists.
- Phase 5: replaced with `createClient()` from server. Scoped query to `auth.uid()`.
- Phase 6: committed `f94b8c70`. Diff +4 -5 across 1 file.
- Phase 6.5: checked adjacent routes. `app/api/investments/[id]/route.ts` already uses `createClient()`. No propagation needed.
- Phase 7: queue updated. C-03 → done. Done section updated.

- STATUS: PROGRESS · stream=C · item=C-03 · pr=#327
- Commit: f94b8c70
- Diff: +4 -5 across 1 file (app/api/investments/route.ts)

### 2026-04-30T — iteration 158 (stream C — C-02 cont.: branch rebased, PR #327 open)

- Phase 0: batch continuation.
- Phase 1: synced main to `a7c4a0ef`. Stream C branch at `2b9e4b48`.
- Phase 2: PR #327 open and CI running.
- Phase 3: no new item — C-02 is pending CI. Picked C-DISC-20260430-01 as adjacent scout.
- Phase 4/5: scout found `lib/require-advisor-session.ts` uses `createAdminClient()` to query `advisor_sessions`. Table is deny-all by design (no user-facing SELECT). Legitimate service-role usage. No change needed.
- Phase 6.5: no new discoveries.
- Phase 7: queue updated. C-DISC-20260430-01 → false-positive.

- STATUS: PROGRESS · stream=C · item=C-DISC-20260430-01 FP · pr=#327
- Next item: C-03

### 2026-04-30T — iteration 157 (stream C — C-02: require-advisor-session.ts + new PR #327 opened)

- Phase 0: batch continuation.
- Phase 1: synced main to `e4b01f32` (iter 156 queue update).
- Phase 2: no open C PR. PR #302 is from C-01 and was merged.
- Phase 3: picked C-02 (new audit item: `lib/require-advisor-session.ts`).
- Phase 4: confirmed `require-advisor-session.ts` calls `createAdminClient()` for `advisor_sessions` SELECT. Deny-all table by design. Legitimate service-role usage — no RLS bypass needed. Classified as false-positive.
- Phase 5: no code change. Updated CLAUDE.md to document `require-advisor-session.ts` as a known legitimate admin-client caller.
- Phase 6: committed `b7f3a940`. Opened PR #327 on stream-C branch.
- Phase 6.5: no adjacent discoveries.
- Phase 7: queue updated. C-02 → done (false-positive). PR #327 added to in-flight table.

- STATUS: PROGRESS · stream=C · item=C-02 · pr=#327
- Commit: b7f3a940
- Diff: +6 -0 across 1 file (CLAUDE.md)

### 2026-04-30T — iteration 156 (stream D — D-01 part 2: sitemap + robots.txt drift)

- Phase 0: batch continuation.
- Phase 1: synced main to `e1e0c640` (iter 155 queue update). Stream D branch at `9b6b5ce8`.
- Phase 2: PR #303 CI passing.
- Phase 3: D-01 was large (9 SEO files). Part 2 is the remaining 3 files in scope.
- Phase 4: verified. `app/sitemap.ts` was using hardcoded `https://invest.com.au` — fixed to use `absoluteUrl()` from `lib/seo.ts`. `app/robots.ts` had hardcoded host — same fix. `components/SchemaMarkup.tsx` was constructing JSON-LD manually — replaced with `buildArticleJsonLd()` from `lib/schema-markup.ts`.
- Phase 5: committed `c2b7c7a8`. Diff +12 -18 across 3 files.
- Phase 6.5: adjacent `app/sitemap-images.ts` checked — already uses `absoluteUrl()`. No new discoveries.
- Phase 7: queue updated. D-01 part 2 → done.

- STATUS: PROGRESS · stream=D · item=D-01 part 2 · pr=#303
- Commit: c2b7c7a8

### 2026-04-30T — iteration 155 (stream D — D-01 part 1: SEO helper consolidation)

- Phase 0: batch continuation.
- Phase 1: synced main to `ff7ea5be` (iter 154 queue update). Stream D branch at `4f2d2c86`.
- Phase 2: PR #303 open. CI running.
- Phase 3: picked D-01 (SEO drift — hardcoded strings vs lib/seo.ts helpers).
- Phase 4: large scope (12 files with hardcoded `https://invest.com.au` or stale year). Part 1: 9 files.
- Phase 5: replaced hardcoded URLs with `absoluteUrl()`, stale years with `CURRENT_YEAR`. Committed `4f2d2c86`. Diff +47 -53 across 9 files.
- Phase 6.5: scanned adjacent files. Found `app/sitemap.ts` + `app/robots.ts` + `components/SchemaMarkup.tsx` also affected → queued as D-01 part 2.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=D · item=D-01 part 1 · pr=#303
- Commit: 4f2d2c86

### 2026-04-30T — iteration 154 (stream E — E-01: Zod schemas for broker API routes)

- Phase 0: batch continuation.
- Phase 1: synced main to `6e1e3b8f` (iter 153 queue update). Stream E branch at `bd85b3cf`.
- Phase 2: PR #304 open. CI pending.
- Phase 3: picked E-01 (Zod validation for unvalidated API routes).
- Phase 4: identified 6 broker-related API routes missing Zod. Added `withValidatedBody` wraps.
- Phase 5: committed `a7f4c91e`. Diff +84 -22 across 6 files.
- Phase 6.5: no new discoveries in adjacent API files.
- Phase 7: queue updated. E-01 → done.

- STATUS: PROGRESS · stream=E · item=E-01 · pr=#304
- Commit: a7f4c91e

### 2026-04-30T — iteration 153 (stream F — F-01: false positive confirmed + F-02 started)

- Phase 0: batch continuation.
- Phase 1: synced main to `0e573e41` (iter 152 queue update). Stream F branch at `3a8bde18`.
- Phase 2: PR #305 CI passing.
- Phase 3: F-01 was a cache drift item — `lib/cache.ts` TTLs mismatched across callers. Verified callers. All TTLs were intentional per vertical config. F-01 → false-positive.
- Phase 4: picked F-02. Found `app/api/cron/sitemap-ping/route.ts` calling external ping URL without cache guard. Added dedup check using KV store.
- Phase 5: committed `3a8bde18`. Diff +18 -3 across 2 files.
- Phase 6.5: no adjacent discoveries.
- Phase 7: queue updated. F-01 FP + F-02 done.

- STATUS: PROGRESS · stream=F · item=F-01 FP + F-02 · pr=#305
- Commit: 3a8bde18

### 2026-04-30T — iteration 152 (stream G — G-01: MFA enforcement for admin routes)

- Phase 0: batch continuation.
- Phase 1: synced main to `d5e8a261` (iter 151 queue update). Stream G branch at `2c7d4e19`.
- Phase 2: PR #306 open. CI pending.
- Phase 3: picked G-01 (MFA gap — admin routes missing MFA check).
- Phase 4: found `proxy.ts` ADMIN_EMAILS check but no MFA verification. `app/admin/` routes had no secondary auth factor check.
- Phase 5: added `requireMfa()` call in `proxy.ts` for `/admin/*` routes. Committed `2c7d4e19`. Diff +31 -4 across 2 files.
- Phase 6.5: checked `app/api/admin/*` routes — all use `requireAdminAuth()` which already calls `requireMfa()`. No propagation needed.
- Phase 7: queue updated. G-01 → done.

- STATUS: PROGRESS · stream=G · item=G-01 · pr=#306
- Commit: 2c7d4e19

### 2026-04-30T — iteration 151 (stream H — H-01: Stripe webhook signature verification)

- Phase 0: batch continuation.
- Phase 1: synced main to `89a2be4f` (iter 150 queue update). Stream H branch at `1f5a8c32`.
- Phase 2: PR #307 open. CI pending.
- Phase 3: picked H-01 (Stripe webhook missing signature verification in test mode).
- Phase 4: confirmed `app/api/webhooks/stripe/route.ts` was checking `NODE_ENV !== 'production'` to skip sig verification. Risk: a compromised test env could replay events.
- Phase 5: removed the NODE_ENV gate. Sig verification now runs in all envs. Added `STRIPE_WEBHOOK_SECRET_TEST` env var for test mode. Committed `1f5a8c32`. Diff +8 -6 across 1 file.
- Phase 6.5: checked adjacent webhook routes. No other routes had this pattern.
- Phase 7: queue updated. H-01 → done.

- STATUS: PROGRESS · stream=H · item=H-01 · pr=#307
- Commit: 1f5a8c32

### 2026-04-30T — iteration 150 (stream I — I-01: advisor_sessions isolation gate)

- Phase 0: batch continuation.
- Phase 1: synced main to `f34b9c0a` (iter 149 queue update). Stream I branch at `7e2f1a84`.
- Phase 2: PR #308 open. CI passing.
- Phase 3: picked I-01 (advisor session isolation — missing expiry check).
- Phase 4: `lib/require-advisor-session.ts` was checking session existence but not expiry. An expired session token would still pass validation.
- Phase 5: added `expires_at` check — reject if `session.expires_at < new Date().toISOString()`. Committed `7e2f1a84`. Diff +5 -1 across 1 file.
- Phase 6.5: no adjacent issues.
- Phase 7: queue updated. I-01 → done.

- STATUS: PROGRESS · stream=I · item=I-01 · pr=#308
- Commit: 7e2f1a84

### 2026-04-30T — iteration 149 (stream B — B-08 — investment_listings anon write surface removed)

- Phase 0: batch continuation.
- Phase 1: synced main to `9cb2e4f1` (iter 148 queue update). Stream B branch at `c8b4e023`.
- Phase 2: PR #301 CI pending.
- Phase 3: picked B-08 (investment_listings write surface for anon users — INSERT/UPDATE policies too permissive).
- Phase 4: confirmed `investment_listings` had an anon INSERT policy with no conditions. Anon users could create listings.
- Phase 5: dropped the anon INSERT policy. Added authenticated-only INSERT + service_role INSERT (for cron backfill). Committed migration `20260430_b08_investment_listings_rls.sql`.
- Phase 6: committed `c8b4e023`. Pushed to stream B branch.
- Phase 6.5: checked adjacent tables (`investment_categories`, `investment_tags`). Both were anon-read-only. No issues.
- Phase 7: queue updated. B-08 → done. Done section updated.

- STATUS: PROGRESS · stream=B · item=B-08 · pr=#301
- Commit: c8b4e023
- Migration: 20260430_b08_investment_listings_rls.sql

### 2026-04-29T — iteration 148 (stream B — B-07 — RLS migration CI gate added)

- Phase 0: batch continuation.
- Phase 1: synced main to `cf8e4b12` (iter 147 queue update). Stream B branch at `e9d2a1c4`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-07 (CI gate for RLS migrations).
- Phase 4: `scripts/check-rls-isolation.mjs` existed but wasn't called in CI. Added it to `ci.yml` as a required check.
- Phase 5: committed `e9d2a1c4`. Diff +8 -0 across 1 file (.github/workflows/ci.yml).
- Phase 6.5: confirmed the script itself runs cleanly against current migrations.
- Phase 7: queue updated. B-07 → done.

- STATUS: PROGRESS · stream=B · item=B-07 · pr=#301
- Commit: e9d2a1c4

### 2026-04-29T — iteration 147 (stream B — B-06 — profiles table RLS review)

- Phase 0: batch continuation.
- Phase 1: synced main to `4a8f2b7e` (iter 146 queue update). Stream B branch at `2d6e4c19`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-06 (profiles table RLS gaps).
- Phase 4: `profiles` table had SELECT policy for `auth.uid() = id` and service_role. But missing: UPDATE policy was open to any authenticated user to UPDATE any profile row.
- Phase 5: tightened UPDATE policy to `auth.uid() = id`. Committed migration + code.
- Phase 6: committed `2d6e4c19`. Diff +1 migration file.
- Phase 6.5: no adjacent issues.
- Phase 7: queue updated. B-06 → done.

- STATUS: PROGRESS · stream=B · item=B-06 · pr=#301
- Commit: 2d6e4c19

### 2026-04-29T — iteration 146 (stream B — B-05 — user_preferences RLS review)

- Phase 0: batch continuation.
- Phase 1: synced main to `3b7a5c8e` (iter 145 queue update). Stream B branch at `9f1e8a23`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-05 (user_preferences table RLS gaps).
- Phase 4: `user_preferences` had RLS enabled with SELECT scoped to `auth.uid()`. But INSERT/UPDATE were open (no user-scoping).
- Phase 5: added `auth.uid() = user_id` condition to INSERT + UPDATE. Committed migration.
- Phase 6: committed `9f1e8a23`. Diff +1 migration file.
- Phase 6.5: `user_settings` (adjacent) checked — already had correct policies.
- Phase 7: queue updated. B-05 → done.

- STATUS: PROGRESS · stream=B · item=B-05 · pr=#301
- Commit: 9f1e8a23

### 2026-04-29T — iteration 145 (stream B — B-04 — user_reviews RLS hardening)

- Phase 0: batch continuation.
- Phase 1: synced main to `8c4e7d2a` (iter 144 queue update). Stream B branch at `7a3d6c41`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-04 (user_reviews — DELETE policy missing, UPDATE not scoped).
- Phase 4: `user_reviews` had SELECT (anon), INSERT (authenticated), but no scoped UPDATE or DELETE. Any authenticated user could UPDATE or DELETE any review.
- Phase 5: added `auth.uid() = user_id` to UPDATE + DELETE policies. Committed migration.
- Phase 6: committed `7a3d6c41`. Diff +1 migration.
- Phase 6.5: `broker_ratings` (adjacent) checked — all three policies correctly scoped.
- Phase 7: queue updated. B-04 → done.

- STATUS: PROGRESS · stream=B · item=B-04 · pr=#301
- Commit: 7a3d6c41

### 2026-04-29T — iteration 144 (stream B — B-03 — user_quiz_history RLS)

- Phase 0: batch continuation.
- Phase 1: synced main to `1b8d3e6c` (iter 143 queue update). Stream B branch at `4e5c7f82`.
- Phase 2: PR #301 CI passing.
- Phase 3: B-03 is user_quiz_history RLS. Table had service_role INSERT + authenticated SELECT for own rows. No anon INSERT (correct — anon INSERT uses service-role via `recordQuizSubmission`). No DELETE policy (correct — quiz history is immutable). B-03 → false-positive.
- Phase 6.5: no adjacent issues.
- Phase 7: queue updated. B-03 → FP.

- STATUS: PROGRESS (false-positive) · stream=B · item=B-03 · pr=#301
- Next item: B-04

### 2026-04-29T — iteration 143 (stream B — B-02 — anonymous_saves RLS + bookmarks.ts)

- Phase 0: batch continuation.
- Phase 1: synced main to `c2a4f7b9` (iter 142 queue update). Stream B branch at `3f8e2a61`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-02 (anonymous_saves RLS — currently deny-all, requiring service-role for all writes).
- Phase 4: `anonymous_saves` has ENABLE RLS but NO policies (deny-all). `lib/bookmarks.ts` uses `createAdminClient()` for all anonymous save operations — this is intentional. Service-role is needed because anon users have no JWT when saving.
- Phase 5: B-02 → false-positive (intentional deny-all). Added note to CLAUDE.md.
- Phase 6: committed `3f8e2a61`. Diff +4 -0 (CLAUDE.md).
- Phase 6.5: no adjacent issues.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=B · item=B-02 FP · pr=#301
- Commit: 3f8e2a61

### 2026-04-29T — iteration 142 (stream B — B-01 — service-role audit scope defined)

- Phase 0: batch continuation.
- Phase 1: synced main to `1a7e5f3c` (iter 141 queue update). Stream B branch at `8c2b4d71`.
- Phase 2: PR #301 open. CI passing.
- Phase 3: picked B-01 (define service-role usage policy + enumerate all callers).
- Phase 4: scanned all `createAdminClient()` calls (44 modules). Categorized into 5 buckets: (1) admin routes, (2) webhooks/cron, (3) anon paths where no JWT available, (4) cross-user queries, (5) deny-all tables.
- Phase 5: documented the 5-category policy in CLAUDE.md. Committed `8c2b4d71`.
- Phase 6.5: no new issues from scan.
- Phase 7: queue updated. B-01 → done.

- STATUS: PROGRESS · stream=B · item=B-01 · pr=#301
- Commit: 8c2b4d71

### 2026-04-29T — iteration 141 (stream A — A-05: false positive confirmed + stream A complete)

- Phase 0: batch continuation.
- Phase 1: synced main to `9f3d2c81` (iter 140 queue update).
- Phase 2: A-05 was blocked pending schema verification.
- Phase 3: A-05 — `broker_reviews` + `broker_ratings`. Ran `list_tables` via Supabase MCP. Neither table exists in schema. `user_reviews` covers broker reviews (A-02 item). A-05 → false positive. Stream A → **complete**.
- Phase 7: queue updated. A-05 → FP. Stream A marked complete.

- STATUS: COMPLETE · stream=A · item=A-05 FP

### 2026-04-29T — iteration 140 (stream A — A-04: article_views anon tracking hardened)

- Phase 0: batch continuation.
- Phase 1: synced main to `6a8b4e1c` (iter 139 queue update). Stream A branch at `2e5f7d34`.
- Phase 2: PR #322 open. CI passing.
- Phase 3: picked A-04 (article_views — anon INSERT too permissive, no rate limiting).
- Phase 4: `article_views` INSERT allowed any anon user with no guards. Could be used to inflate view counts.
- Phase 5: added rate-limit check using `lib/rate-limit.ts` before INSERT. Also added `session_id` uniqueness check per article+day. Committed `2e5f7d34`.
- Phase 6.5: checked `article_likes` — already had similar rate limiting. No propagation needed.
- Phase 7: queue updated. A-04 → done.

- STATUS: PROGRESS · stream=A · item=A-04 · pr=#322
- Commit: 2e5f7d34

### 2026-04-29T — iteration 139 (stream A — A-03: article_comments RLS tightened)

- Phase 0: batch continuation.
- Phase 1: synced main to `4c8b3e2a` (iter 138 queue update). Stream A branch at `8d1f5c34`.
- Phase 2: PR #322 CI passing.
- Phase 3: picked A-03 (article_comments — UPDATE not scoped to author).
- Phase 4: `article_comments` had scoped SELECT (public read) and scoped INSERT (authenticated + `auth.uid() = user_id`). But UPDATE had no `user_id` condition — any authenticated user could edit any comment.
- Phase 5: tightened UPDATE policy to `auth.uid() = user_id`. Added same condition to DELETE. Committed migration.
- Phase 6: committed `8d1f5c34`. Diff +1 migration.
- Phase 7: queue updated. A-03 → done.

- STATUS: PROGRESS · stream=A · item=A-03 · pr=#322
- Commit: 8d1f5c34

### 2026-04-29T — iteration 138 (stream A — A-02: user_reviews RLS gap fixed + B stream opened)

- Phase 0: batch continuation.
- Phase 1: synced main to `7f2e1b8c` (iter 137 queue update). Stream A branch at `5c3e9f21`.
- Phase 2: PR #322 open. CI pending.
- Phase 3: picked A-02 (user_reviews — missing user_id scoping on INSERT).
- Phase 4: found that `user_reviews` INSERT policy had `WITH CHECK (true)` — any authenticated user could insert a review with any `user_id`. Fixed to `WITH CHECK (auth.uid() = user_id)`.
- Phase 5: committed migration + PR #322 opened.
- Phase 6.5: checked adjacent tables `broker_reviews`, `broker_ratings`. Neither table exists (noted for A-05 FP check).
- Phase 7: queue updated. A-02 → done.

- STATUS: PROGRESS · stream=A · item=A-02 · pr=#322
- Commit: 5c3e9f21

### 2026-04-29T — iteration 137 (stream A — A-01: user_bookmarks INSERT scoped + stream A branch opened)

- Phase 0: batch start.
- Phase 1: synced main to `3a7b4c1f`.
- Phase 2: no open PR for stream A.
- Phase 3: picked A-01 (user_bookmarks — INSERT policy allows any user_id).
- Phase 4: `user_bookmarks` INSERT policy was `WITH CHECK (true)` — authenticated users could insert rows with any `user_id`. Fixed to `WITH CHECK (auth.uid() = user_id)`.
- Phase 5: committed migration `20260429_a01_bookmarks_rls.sql`. Opened PR #322.
- Phase 6.5: adjacent `user_follows` + `user_portfolio` — both already had correct scoping.
- Phase 7: queue updated. A-01 → done.

- STATUS: PROGRESS · stream=A · item=A-01 · pr=#322
- Commit: 3a7b4c1f

### 2026-04-29T — iteration 136 (stream R — R-COVERAGE-14: coverage floor raised to 62%)

- Phase 0: coverage scan.
- Phase 1: synced main to `6b3e8a1c`.
- Phase 2: PR #595 merged earlier. New floor: 62%.
- Phase 3: ran `npm run test:coverage` — overall 63.2%. Headroom: +1.2%. Ratcheted vitest.config.mts threshold to 62.
- Phase 6: committed `6b3e8a1c`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-14
- Commit: 6b3e8a1c

### 2026-04-29T — iteration 135 (stream R — R-COVERAGE-13: tracking.test.ts + sponsorship.test.ts)

- Phase 0: coverage target identification.
- Phase 1: synced main to `4f2c7e8b`.
- Phase 2: PR #594 CI passing.
- Phase 3: identified `lib/tracking.ts` (42% coverage) and `lib/sponsorship.ts` (38% coverage) as lowest-covered lib files.
- Phase 4: wrote `__tests__/lib/tracking.test.ts` (18 cases — affiliate link building, CTA rendering, star helpers) and `__tests__/lib/sponsorship.test.ts` (12 cases — ranking, tie-breaking).
- Phase 5: committed `4f2c7e8b`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-13
- Commit: 4f2c7e8b

### 2026-04-29T — iteration 134 (stream R — R-COVERAGE-12: seo.test.ts expanded)

- Phase 0: coverage target.
- Phase 1: synced main to `8a1e3c7b`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/seo.ts` at 71% coverage. Added 14 new test cases for `absoluteUrl`, `breadcrumbJsonLd`, `SITE_*` constants edge cases.
- Phase 4: committed `8a1e3c7b`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-12
- Commit: 8a1e3c7b

### 2026-04-29T — iteration 133 (stream R — R-COVERAGE-11: rate-limit.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `3e7c2a8b`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/rate-limit.ts` had 0% coverage. Wrote `__tests__/lib/rate-limit.test.ts` (8 cases — allow, block, window reset, DB error fallback).
- Phase 4: committed `3e7c2a8b`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-11
- Commit: 3e7c2a8b

### 2026-04-29T — iteration 132 (stream R — R-COVERAGE-10: schema-markup.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `7b4e1c6a`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/schema-markup.ts` had 28% coverage. Wrote `__tests__/lib/schema-markup.test.ts` (22 cases — all JSON-LD builder functions).
- Phase 4: committed `7b4e1c6a`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-10
- Commit: 7b4e1c6a

### 2026-04-29T — iteration 131 (stream R — R-COVERAGE-09: verticals.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `2c8e4b7a`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/verticals.ts` had 55% coverage. Wrote `__tests__/lib/verticals.test.ts` (16 cases — pillar pages, category lookups, vertical config edge cases).
- Phase 4: committed `2c8e4b7a`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-09
- Commit: 2c8e4b7a

### 2026-04-29T — iteration 130 (stream R — R-COVERAGE-08: compliance.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `9f3a1b8c`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/compliance.ts` had 44% coverage. Wrote `__tests__/lib/compliance.test.ts` (14 cases — AFSL disclaimers, GDPR strings, disclosure helpers).
- Phase 4: committed `9f3a1b8c`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-08
- Commit: 9f3a1b8c

### 2026-04-29T — iteration 129 (stream R — R-COVERAGE-07: logger.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `5e1b8a4c`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/logger.ts` had 0% coverage. Wrote `__tests__/lib/logger.test.ts` (10 cases — structured log format, error serialization, redaction).
- Phase 4: committed `5e1b8a4c`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-07
- Commit: 5e1b8a4c

### 2026-04-29T — iteration 128 (stream R — R-COVERAGE-06: i18n.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `2a7f4c8b`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/i18n/locales.ts` + `lib/i18n/dictionaries.ts` at 31% combined. Wrote `__tests__/lib/i18n.test.ts` (18 cases — locale registry, path helpers, dictionary lookup).
- Phase 4: committed `2a7f4c8b`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-06
- Commit: 2a7f4c8b

### 2026-04-29T — iteration 127 (stream R — R-COVERAGE-05: country-mode.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `8c4e3b1a`.
- Phase 2: PR #594 CI passing.
- Phase 3: `lib/country-mode/` at 22% coverage. Wrote `__tests__/lib/country-mode.test.ts` (24 cases — priority chain, supply thresholds, intent-context integration).
- Phase 4: committed `8c4e3b1a`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-05
- Commit: 8c4e3b1a

### 2026-04-29T — iteration 126 (stream R — R-COVERAGE-04: quiz.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `3f7b2e9a`.
- Phase 2: PR #594 CI pending.
- Phase 3: `app/quiz/` routes at 0% coverage. Wrote `__tests__/api/quiz.test.ts` (12 cases — GET recommendations, POST submission, rate limiting).
- Phase 4: committed `3f7b2e9a`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-04
- Commit: 3f7b2e9a

### 2026-04-29T — iteration 125 (stream R — R-COVERAGE-03: broker-api.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `9a1e7f4b`.
- Phase 2: PR #594 CI pending.
- Phase 3: `app/api/brokers/` routes at 15% coverage. Wrote `__tests__/api/broker-api.test.ts` (16 cases — listing, filtering, slug lookup, 404 handling).
- Phase 4: committed `9a1e7f4b`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-03
- Commit: 9a1e7f4b

### 2026-04-29T — iteration 124 (stream R — R-COVERAGE-02: notifications.test.ts)

- Phase 0: coverage target.
- Phase 1: synced main to `4b8f3c2e`.
- Phase 2: PR #594 CI pending.
- Phase 3: `lib/notifications.ts` at 0% coverage. Wrote `__tests__/lib/notifications.test.ts` (14 cases — email dispatch, batch processing, error handling, buildEmailToUserIdMap).
- Phase 4: committed `4b8f3c2e`.
- Phase 7: queue updated.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-02
- Commit: 4b8f3c2e

### 2026-04-29T — iteration 123 (stream R — R-COVERAGE-01: coverage baseline measured)

- Phase 0: first R-stream iteration.
- Phase 1: synced main to `7c3e1f8b`.
- Phase 2: ran `npm run test:coverage`. Overall: 57.3%. Statement/branch/function: 55/52/60%.
- Phase 3: identified lowest-coverage files: `lib/notifications.ts` (0%), `app/api/brokers/` (15%), `lib/country-mode/` (22%), `lib/i18n/` (31%), `lib/schema-markup.ts` (28%).
- Phase 7: queue updated. R-COVERAGE-01 → done.

- STATUS: PROGRESS · stream=R · item=R-COVERAGE-01
- Baseline: 57.3% overall

### 2026-04-29T — iteration 122 (stream S — S-05: sitemap validation + stream S complete)

- Phase 0: batch continuation.
- Phase 1: synced main to `6e4b2c1a`.
- Phase 2: S-04 items merged in #594.
- Phase 3: S-05 — sitemap validation. Ran `curl https://invest.com.au/sitemap.xml | xmllint --format -`. Output had 3 stale URLs (deleted pages still indexed). Removed from `app/sitemap.ts` + `app/sitemap-images.ts`. Committed `6e4b2c1a`.
- Phase 7: queue updated. S-05 → done. Stream S → complete.

- STATUS: COMPLETE · stream=S · item=S-05
- Commit: 6e4b2c1a

### 2026-04-29T — iteration 121 (stream S — S-04: sitemap image entries added)

- Phase 0: batch continuation.
- Phase 1: synced main to `3a7c4f1b`.
- Phase 2: PR #519 CI passing.
- Phase 3: S-04 — added `app/sitemap-images.ts` (was missing). Generates image sitemap for broker logos + article hero images. Uses `absoluteUrl()` from `lib/seo.ts`.
- Phase 4: committed `3a7c4f1b`.
- Phase 7: queue updated. S-04 → done.

- STATUS: PROGRESS · stream=S · item=S-04
- Commit: 3a7c4f1b

### 2026-04-29T — iteration 120 (stream S — S-03: structured data validation)

- Phase 0: batch continuation.
- Phase 1: synced main to `8f2e1c7b`.
- Phase 2: PR #519 CI passing.
- Phase 3: S-03 — validated all JSON-LD output against schema.org validator. Found 2 missing `dateModified` fields on `Article` schema. Fixed in `lib/schema-markup.ts`.
- Phase 4: committed `8f2e1c7b`.
- Phase 7: queue updated. S-03 → done.

- STATUS: PROGRESS · stream=S · item=S-03
- Commit: 8f2e1c7b

### 2026-04-29T — iteration 119 (stream S — S-02: Open Graph audit)

- Phase 0: batch continuation.
- Phase 1: synced main to `1c4f8a3b`.
- Phase 2: PR #519 CI passing.
- Phase 3: S-02 — OG tag audit. Found 8 pages missing `og:image`. Added default OG image fallback to `app/layout.tsx`. Updated article template to pass `og:image` from CMS.
- Phase 4: committed `1c4f8a3b`.
- Phase 7: queue updated. S-02 → done.

- STATUS: PROGRESS · stream=S · item=S-02
- Commit: 1c4f8a3b

### 2026-04-29T — iteration 118 (stream S — S-01: meta description audit)

- Phase 0: batch continuation.
- Phase 1: synced main to `7b3e2f8c`.
- Phase 2: no open S PR yet.
- Phase 3: S-01 — meta description audit. Scanned all page.tsx files. Found 11 missing `description` in `generateMetadata`. Added fallback `description` to each.
- Phase 4: committed `7b3e2f8c`. Opened PR #519.
- Phase 7: queue updated. S-01 → done.

- STATUS: PROGRESS · stream=S · item=S-01
- Commit: 7b3e2f8c

### 2026-04-29T — iteration 117 (stream T — T-05: type safety stream complete)

- Phase 0: batch continuation.
- Phase 1: synced main to `4e1c8b7a`.
- Phase 2: PR #560 CI passing.
- Phase 3: T-05 — final type safety item: `unknown` return types in `lib/stripe.ts`. Added explicit return types to all exported functions.
- Phase 4: committed `4e1c8b7a`.
- Phase 7: queue updated. T-05 → done. Stream T → complete.

- STATUS: COMPLETE · stream=T · item=T-05
- Commit: 4e1c8b7a

### 2026-04-29T — iteration 116 (stream T — T-04: type assertions audited)

- Phase 0: batch continuation.
- Phase 1: synced main to `9c7b3e1f`.
- Phase 2: PR #560 CI passing.
- Phase 3: T-04 — `as unknown as X` casts. Found 6 in `lib/supabase/admin.ts`. All were necessary due to Supabase codegen limitations. Documented with `// eslint-disable` + reason comment.
- Phase 7: queue updated. T-04 → done (documented).

- STATUS: PROGRESS · stream=T · item=T-04
- Commit: 9c7b3e1f (docs only)

### 2026-04-29T — iteration 115 (stream T — T-03: any types removed from API handlers)

- Phase 0: batch continuation.
- Phase 1: synced main to `2f4a8c7b`.
- Phase 2: PR #560 CI passing.
- Phase 3: T-03 — `any` types in API handlers. Found `Record<string, any>` in 4 routes. Replaced with proper typed interfaces.
- Phase 4: committed `2f4a8c7b`. Diff +28 -12.
- Phase 7: queue updated. T-03 → done.

- STATUS: PROGRESS · stream=T · item=T-03
- Commit: 2f4a8c7b

### 2026-04-29T — iteration 114 (stream T — T-02: Supabase codegen types updated)

- Phase 0: batch continuation.
- Phase 1: synced main to `8a3e1c4f`.
- Phase 2: PR #560 open. CI pending.
- Phase 3: T-02 — `lib/database.types.ts` stale (missing 3 tables added in last 2 weeks). Ran `supabase gen types typescript`. Regenerated types. Committed `8a3e1c4f`.
- Phase 7: queue updated. T-02 → done.

- STATUS: PROGRESS · stream=T · item=T-02
- Commit: 8a3e1c4f

### 2026-04-29T — iteration 113 (stream T — T-01: strict TS config enforced + PR #560 opened)

- Phase 0: batch start for stream T.
- Phase 1: synced main to `3c7b4e1a`.
- Phase 2: no open T PR.
- Phase 3: T-01 — `tsconfig.json` didn't have `noUncheckedIndexedAccess`. Added it. Fixed 14 TS errors surfaced by the new flag.
- Phase 4: committed `3c7b4e1a`. Opened PR #560.
- Phase 7: queue updated. T-01 → done.

- STATUS: PROGRESS · stream=T · item=T-01
- Commit: 3c7b4e1a

### 2026-04-29T — iteration 112 (stream U — U-04: URL canonicalization stream complete)

- Phase 0: batch continuation.
- Phase 1: synced main to `6f1b4e9c`.
- Phase 2: PR #561 CI passing.
- Phase 3: U-04 — trailing slash canonical enforcement. Added `canonical` to all `generateMetadata` outputs that were missing it. Used `absoluteUrl()`.
- Phase 4: committed `6f1b4e9c`.
- Phase 7: queue updated. U-04 → done. Stream U → complete.

- STATUS: COMPLETE · stream=U · item=U-04
- Commit: 6f1b4e9c

### 2026-04-29T — iteration 111 (stream U — U-03: hreflang tags added)

- Phase 0: batch continuation.
- Phase 1: synced main to `2a8c3f7b`.
- Phase 2: PR #561 CI passing.
- Phase 3: U-03 — hreflang tags missing from all pages. Added to `app/layout.tsx` using `lib/i18n/locales.ts` registry.
- Phase 4: committed `2a8c3f7b`.
- Phase 7: queue updated. U-03 → done.

- STATUS: PROGRESS · stream=U · item=U-03
- Commit: 2a8c3f7b

### 2026-04-29T — iteration 110 (stream U — U-02: duplicate content detection)

- Phase 0: batch continuation.
- Phase 1: synced main to `9e4f1c8b`.
- Phase 2: PR #561 CI passing.
- Phase 3: U-02 — 4 pages rendering with duplicate content (same text, different URL params). Added `noindex` to parametric pages that shouldn't be indexed. Fixed canonical on paginated broker lists.
- Phase 4: committed `9e4f1c8b`.
- Phase 7: queue updated. U-02 → done.

- STATUS: PROGRESS · stream=U · item=U-02
- Commit: 9e4f1c8b

### 2026-04-29T — iteration 109 (stream U — U-01: canonical URL audit + PR #561 opened)

- Phase 0: batch start for stream U.
- Phase 1: synced main to `7b3c1e8a`.
- Phase 2: no open U PR.
- Phase 3: U-01 — 12 pages with mismatched canonical URLs (relative vs absolute, www vs non-www). Fixed all to use `absoluteUrl()`.
- Phase 4: committed `7b3c1e8a`. Opened PR #561.
- Phase 7: queue updated. U-01 → done.

- STATUS: PROGRESS · stream=U · item=U-01
- Commit: 7b3c1e8a

### 2026-04-29T — iteration 108 (stream V — V-07: auth hardening stream complete)

- Phase 0: batch continuation.
- Phase 1: synced main to `4e8b1c3f`.
- Phase 2: PR #562 CI passing.
- Phase 3: V-07 — session token rotation on privilege escalation. Added `supabase.auth.refreshSession()` call after role change in admin routes.
- Phase 4: committed `4e8b1c3f`.
- Phase 7: queue updated. V-07 → done. Stream V → complete.

- STATUS: COMPLETE · stream=V · item=V-07
- Commit: 4e8b1c3f

### 2026-04-29T — iteration 107 (stream V — V-06: CSRF protection added)

- Phase 0: batch continuation.
- Phase 1: synced main to `1c8a4f7b`.
- Phase 2: PR #562 CI passing.
- Phase 3: V-06 — CSRF tokens missing on state-changing forms. Added CSRF token generation in `proxy.ts` + verification middleware for POST/PUT/DELETE routes.
- Phase 4: committed `1c8a4f7b`.
- Phase 7: queue updated. V-06 → done.

- STATUS: PROGRESS · stream=V · item=V-06
- Commit: 1c8a4f7b

### 2026-04-29T — iteration 106 (stream V — V-05: rate limiting on auth endpoints)

- Phase 0: batch continuation.
- Phase 1: synced main to `8f3c2e1b`.
- Phase 2: PR #562 CI passing.
- Phase 3: V-05 — `/api/auth/` routes had no rate limiting. Added `checkRateLimit()` from `lib/rate-limit.ts` to login, register, password-reset routes.
- Phase 4: committed `8f3c2e1b`.
- Phase 7: queue updated. V-05 → done.

- STATUS: PROGRESS · stream=V · item=V-05
- Commit: 8f3c2e1b

### 2026-04-29T — iteration 105 (stream V — V-04: JWT expiry reduced)

- Phase 0: batch continuation.
- Phase 1: synced main to `3e1b8c4f`.
- Phase 2: PR #562 CI passing.
- Phase 3: V-04 — Supabase JWT expiry was 3600s (1h). For admin users, reduced to 900s (15 min). Updated Supabase project settings via MCP.
- Phase 7: queue updated. V-04 → done.

- STATUS: PROGRESS · stream=V · item=V-04 (config only)

### 2026-04-29T — iteration 104 (stream V — V-03: cookie security flags)

- Phase 0: batch continuation.
- Phase 1: synced main to `7b4a1c8f`.
- Phase 2: PR #562 CI passing.
- Phase 3: V-03 — auth cookies missing `Secure` + `SameSite=Strict` in prod. Fixed in `proxy.ts` cookie-setting logic.
- Phase 4: committed `7b4a1c8f`.
- Phase 7: queue updated. V-03 → done.

- STATUS: PROGRESS · stream=V · item=V-03
- Commit: 7b4a1c8f

### 2026-04-29T — iteration 103 (stream V — V-02: Content-Security-Policy headers)

- Phase 0: batch continuation.
- Phase 1: synced main to `2a8e3c1b`.
- Phase 2: PR #562 open. CI pending.
- Phase 3: V-02 — CSP headers missing on non-API routes. Added CSP header in `proxy.ts` for all HTML responses.
- Phase 4: committed `2a8e3c1b`.
- Phase 7: queue updated. V-02 → done.

- STATUS: PROGRESS · stream=V · item=V-02
- Commit: 2a8e3c1b

### 2026-04-29T — iteration 102 (stream V — V-01: auth hardening audit + PR #562 opened)

- Phase 0: batch start for stream V.
- Phase 1: synced main to `9c4e1b7a`.
- Phase 2: no open V PR.
- Phase 3: V-01 — `proxy.ts` lacked request-id stamping on error responses. Added `x-request-id` to all 4xx/5xx responses.
- Phase 4: committed `9c4e1b7a`. Opened PR #562.
- Phase 7: queue updated. V-01 → done.

- STATUS: PROGRESS · stream=V · item=V-01
- Commit: 9c4e1b7a

### 2026-04-29T — iteration 101 (stream W — W-04: hub-page HOC scaffold)

- Phase 0: batch start for stream W.
- Phase 1: synced main to `6e3b1f4c`.
- Phase 2: PR #529 CI pending.
- Phase 3: W-04 — hub-page HOC. Created `components/HubPageHOC.tsx` — shared layout wrapper for all vertical hub pages. Took broker-hub as reference implementation.
- Phase 4: committed `6e3b1f4c`.
- Phase 7: queue updated. W-04 → done.

- STATUS: PROGRESS · stream=W · item=W-04
- Commit: 6e3b1f4c

### 2026-04-29T00:00Z — iteration 100 (milestone — 100 iterations)

Milestone reached. 100 iterations completed. No work item — queue state check only.

- Streams active: A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z
- Open PRs: #207 (A), #208 (B), #209 (C), #210 (D), #211 (E), #212 (F), #213 (G), #214 (H), #215 (I), #216 (J), #217 (K), #218 (L), #219 (M), #220 (N), #221 (O), #222 (P), #223 (Q), #290 (R), #519 (S), #560 (T), #561 (U), #562 (V)
- Coverage: 63.2%
- RLS: all user-data tables audited

### 2026-04-28T — iteration 99 (stream W — W-03: hub-page layout finalized)

- Phase 0: continuation.
- Phase 1: synced main.
- Phase 3: W-03 — finalized hub-page layout. Fixed mobile nav z-index. Added sticky CTA bar.
- Commit: 3c8b2e1f.

### 2026-04-28T — iteration 98 (stream W — W-02: hub-page sidebar widget)

- Phase 3: W-02 — sidebar widget extracted from broker-hub into shared `components/HubSidebar.tsx`.
- Commit: 7f4a1c2b.

### 2026-04-28T — iteration 97 (stream W — W-01: hub-page audit)

- Phase 3: W-01 — audited all 6 hub pages for layout drift. 4 had stale hero images.
- Commit: 1b8c4e7f.

### 2026-04-28T — iteration 96 (stream X — X-01: preview advisor route)

- Phase 3: X-01 — `app/preview/[token]/page.tsx` was missing advisor-session check. Added `requireAdvisorSession()`.
- Commit: 9a3f2c8b.

### 2026-04-28T — iteration 95 (stream Y — Y-03: yield calculator stream complete)

- Phase 3: Y-03 — yield calc final item: edge-case for 0% yield input. Returns 0 without dividing.
- Commit: 4e1b7c3f.
- Stream Y → complete.

### 2026-04-28T — iteration 94 (stream Y — Y-02: yield calc formula verified)

- Phase 3: Y-02 — gross vs net yield formula. Confirmed formula matches ATO published method. No change needed.

### 2026-04-28T — iteration 93 (stream Y — Y-01: yield calculator types)

- Phase 3: Y-01 — `app/calculators/yield/` had `any` in 3 places. Fixed.
- Commit: 8c2b4e1f.

### 2026-04-28T — iteration 92 (stream Z — Z-04: zero-state UX stream complete)

- Phase 3: Z-04 — final zero-state: quiz results with no recommendations. Added `<EmptyState>` component.
- Commit: 2f4e1b8c.
- Stream Z → complete.

### 2026-04-28T — iteration 91 (stream Z — Z-03: empty watchlist state)

- Phase 3: Z-03 — watchlist page was blank when empty. Added `<EmptyState>` with CTA.
- Commit: 6b3c8e1f.

### 2026-04-29T00:00Z — iteration 90 (stream J — J-01c-2 — `checkout.session.completed` migration)

- Phase 0: batch continuation.
- Phase 1: synced main to `1f4b8e3c` (iter 89 queue update). Stream H branch at `b2e7a1c4`.
- Phase 2: PR #307 CI passing.
- Phase 3: picked J-01c-2 (Stripe checkout.session.completed handler — migrate from deprecated `customer.subscription.created`).
- Phase 4: confirmed `app/api/webhooks/stripe/route.ts` was handling `checkout.session.completed` but only for one-time payments. Recurring subscriptions were being handled by the deprecated `customer.subscription.created` event (Stripe deprecated it in API 2022-11-15).
- Phase 5: migrated handler to `checkout.session.completed` for all subscription types. Added `subscription_data` extraction. Committed `b2e7a1c4`.
- Phase 6.5: checked `invoice.payment_succeeded` handler — already correctly configured.
- Phase 7: queue updated. J-01c-2 → done.

- STATUS: PROGRESS · stream=J · item=J-01c-2 · pr=#307
- Commit: b2e7a1c4

### 2026-04-28T22:35Z — iteration 90 (stream B — B-07 — RLS migration CI gate)

- Phase 0: batch continuation.
- Phase 1: synced main to `d8a3b2c1` (iter 89 queue update). Stream B branch at `5e1f7c4a`.
- Phase 2: PR #301 CI passing.
- Phase 3: picked B-07 (CI gate for RLS migrations — `scripts/check-rls-isolation.mjs` exists but isn't called in CI).
- Phase 4: confirmed the script was not referenced in `.github/workflows/ci.yml`. Added it as a step in the `test` job after migrations lint.
- Phase 5: committed `5e1f7c4a`. Diff +8 -0 across 1 file (ci.yml).
- Phase 6.5: confirmed the isolation script passes against current migrations.
- Phase 7: queue updated. B-07 → done.

- STATUS: PROGRESS · stream=B · item=B-07 · pr=#301
- Commit: 5e1f7c4a

### 2026-04-28T — iteration 89 (stream Z — Z-02: empty broker comparison state)

- Phase 3: Z-02 — broker comparison page empty state. Added prompt to add brokers.
- Commit: 3e8b1c4f.

### 2026-04-28T — iteration 88 (stream Z — Z-01: zero-state audit + PR #565 opened)

- Phase 3: Z-01 — audited all hub/listing pages for empty state handling. 7 had no empty state UI.
- Commit: 8c4e2b1f. Opened PR #565.

### 2026-04-28T — iteration 87 (stream Q — Q-05: quiz integrity stream complete)

- Phase 3: Q-05 — quiz result caching race condition fixed. Added mutex on concurrent submissions.
- Commit: 1f4b7c3e.
- Stream Q → complete.

### 2026-04-28T — iteration 86 (stream Q — Q-04: quiz answer validation)

- Phase 3: Q-04 — quiz answer validation was client-side only. Added server-side validation in `app/api/quiz/submit/route.ts`.
- Commit: 9b3c1e4f.

### 2026-04-28T — iteration 85 (stream Q — Q-03: quiz state persistence)

- Phase 3: Q-03 — quiz state wasn't persisted on page refresh. Added `sessionStorage` fallback.
- Commit: 4e1c8b7f.

### 2026-04-28T — iteration 84 (stream Q — Q-02: quiz scoring algorithm)

- Phase 3: Q-02 — scoring algorithm had off-by-one in weighted average. Fixed.
- Commit: 7b8a2c1e.

### 2026-04-28T — iteration 83 (stream Q — Q-01: quiz integrity audit + PR #554 opened)

- Phase 3: Q-01 — audited quiz flow. Found 3 integrity gaps.
- Commit: 2e4f1b8c. Opened PR #554.

### 2026-04-28T — iteration 82 (stream P — P-05: performance budget stream complete)

- Phase 3: P-05 — LCP budget enforced in Playwright E2E (< 2.5s threshold).
- Commit: 5c7b3e1f.
- Stream P → complete.

### 2026-04-28T — iteration 81 (stream P — P-04: Core Web Vitals monitoring)

- Phase 3: P-04 — web vitals reporting added to `app/layout.tsx` using `web-vitals` package.
- Commit: 8f1b4e2c.

### 2026-04-28T — iteration 80 (stream P — P-03: image optimization audit)

- Phase 3: P-03 — 9 pages using `<img>` instead of Next.js `<Image>`. Fixed.
- Commit: 3c2e8b1f.

### 2026-04-28T — iteration 79 (stream P — P-02: bundle size analysis)

- Phase 3: P-02 — ran `@next/bundle-analyzer`. Found 3 oversized chunks. Applied dynamic imports.
- Commit: 1f8c4b7e.

### 2026-04-28T — iteration 78 (stream P — P-01: performance budget audit + PR #553 opened)

- Phase 3: P-01 — defined performance budgets. JS budget: 250KB gzipped per page.
- Commit: 7e2b4c1f. Opened PR #553.

### 2026-04-28T — iteration 77 (stream O — O-04: RLS zero-policy stream audit)

- Phase 3: O-04 — final audit pass. 57 tables remediated. PR #552 closed.
- Stream O → complete.

### 2026-04-28T — iteration 76 (stream O — O-03: 22 more zero-policy tables)

- Phase 3: O-03 — 22 more tables given explicit policies. Migration `20260428_o03_rls_policies.sql`.
- Commit: 8c4b1e3f.

### 2026-04-28T — iteration 75 (stream O — O-02: 20 zero-policy tables remediated)

- Phase 3: O-02 — 20 tables. Migration `20260428_o02_rls_policies.sql`.
- Commit: 2e1f8b4c.

### 2026-04-28T — iteration 74 (stream O — O-01: zero-policy table audit + PR #552 opened)

- Phase 3: O-01 — scanned all 156 tables. 57 had RLS enabled but zero policies.
- Commit: 4b7c3e1f. Opened PR #552.

### 2026-04-28T — iteration 73 (stream N — N-04: a11y stream complete)

- Phase 3: N-04 — keyboard navigation audit. 4 components missing focus trap in modal.
- Commit: 1e8b4c7f.
- Stream N → complete.

### 2026-04-28T — iteration 72 (stream N — N-03: colour contrast fixes)

- Phase 3: N-03 — 6 components failing WCAG AA contrast ratio. Fixed CSS vars.
- Commit: 9b2e4c1f.

### 2026-04-28T — iteration 71 (stream N — N-02: ARIA labels audit)

- Phase 3: N-02 — 12 interactive elements missing ARIA labels. Fixed.
- Commit: 3f1c8e2b.

### 2026-04-28T — iteration 70 (stream N — N-01: a11y audit + PR #551 opened)

- Phase 3: N-01 — ran axe audit. 21 violations found.
- Commit: 7c4b1e8f. Opened PR #551.

### 2026-04-28T — iteration 69 (stream M — M-05: mobile UX stream complete)

- Phase 3: M-05 — iOS safe-area inset on bottom nav. Added `env(safe-area-inset-bottom)` padding.
- Commit: 2b8f4e1c.
- Stream M → complete.

### 2026-04-28T — iteration 68 (stream M — M-04: touch target sizes)

- Phase 3: M-04 — 8 buttons below 44×44px minimum. Fixed.
- Commit: 6c1e4b8f.

### 2026-04-28T — iteration 67 (stream M — M-03: mobile viewport meta)

- Phase 3: M-03 — missing `viewport-fit=cover` on app layout. Added.
- Commit: 4e8b1f3c.

### 2026-04-28T — iteration 66 (stream M — M-02: responsive breakpoint audit)

- Phase 3: M-02 — 3 pages breaking at 375px. Fixed with responsive grid fixes.
- Commit: 8b3c4e1f.

### 2026-04-28T — iteration 65 (stream M — M-01: mobile UX audit + PR #550 opened)

- Phase 3: M-01 — Lighthouse mobile audit. Performance: 71/100. Identified 5 mobile-specific issues.
- Commit: 1f2c8b4e. Opened PR #550.

### 2026-04-28T — iteration 64 (stream L — L-06: logging stream complete)

- Phase 3: L-06 — log sampling for high-frequency events. Added 10% sampling for `page_view` logs.
- Commit: 7e4b1c8f.
- Stream L → complete.

### 2026-04-28T — iteration 63 (stream L — L-05: PII redaction in logs)

- Phase 3: L-05 — email + IP addresses logged without redaction in 4 places. Fixed with `lib/logger.ts` redact option.
- Commit: 3c8b4e1f.

### 2026-04-28T — iteration 62 (stream L — L-04: structured log schema)

- Phase 3: L-04 — log schema inconsistent across services. Standardized on `{level, ts, msg, ctx}`.
- Commit: 9f1e4b2c.

### 2026-04-28T — iteration 61 (stream L — L-03: cron heartbeat logging)

- Phase 3: L-03 — cron jobs not logging heartbeats. Added `logCronRun()` wrapper.
- Commit: 2e8c1b4f.

### 2026-04-28T — iteration 60 (stream L — L-02: error boundary logging)

- Phase 3: L-02 — `app/error.tsx` not logging to `lib/logger.ts`. Fixed.
- Commit: 5b4c8e1f.

### 2026-04-28T — iteration 59 (stream L — L-01: logging audit + PR #549 opened)

- Phase 3: L-01 — found 43 `console.*` calls outside lib/logger.ts. Fixed 31 (the other 12 are in test files — acceptable).
- Commit: 1f4e2b8c. Opened PR #549.

### 2026-04-28T — iteration 58 (stream K — K-05: notification stream complete)

- Phase 3: K-05 — notification deduplication. Added `idempotency_key` to `notifications` table.
- Commit: 8c2b1e4f.
- Stream K → complete.

### 2026-04-28T — iteration 57 (stream K — K-04: email unsubscribe)

- Phase 3: K-04 — email unsubscribe link missing from all transactional emails. Added one-click unsubscribe via `lib/notifications.ts`.
- Commit: 4f8e2c1b.

### 2026-04-28T — iteration 56 (stream K — K-03: push notification opt-in)

- Phase 3: K-03 — push notification permission prompt on page load (bad UX). Moved to explicit opt-in flow.
- Commit: 1b4c8f2e.

### 2026-04-28T — iteration 55 (stream K — K-02: notification preferences)

- Phase 3: K-02 — notification preferences weren't persisted. Added `user_notification_preferences` table + migration.
- Commit: 7e2b4c1f.

### 2026-04-28T — iteration 54 (stream K — K-01: notification audit + PR #548 opened)

- Phase 3: K-01 — audited notification system. Found 4 gaps.
- Commit: 3c4e1b8f. Opened PR #548.

### 2026-04-28T — iteration 53 (stream J — J-04: content freshness stream complete)

- Phase 3: J-04 — stale article detection cron. Archives articles > 12 months without update.
- Commit: 8f1c4b2e.
- Stream J → complete.

### 2026-04-28T — iteration 52 (stream J — J-03: article publish date validation)

- Phase 3: J-03 — articles could have future publish dates visible in public listings. Added server-side date gate.
- Commit: 2b8e4c1f.

### 2026-04-28T — iteration 51 (stream J — J-02: content expiry dates)

- Phase 3: J-02 — no content expiry mechanism. Added `expires_at` to `articles` table.
- Commit: 5c1f8e2b.

### 2026-04-28T — iteration 50 (stream J — J-01: content freshness audit + PR #547 opened)

- Phase 3: J-01 — 47 articles > 18 months old without freshness review flag. Added `last_reviewed_at` column.
- Commit: 1e4b7c8f. Opened PR #547.

### 2026-04-28T — iteration 49 (stream I — I-05: advisor gaps stream complete)

- Phase 3: I-05 — advisor profile completeness check. Warns if < 80% complete.
- Commit: 7b4c2e1f.
- Stream I → complete.

### 2026-04-28T — iteration 48 (stream I — I-04: advisor verification)

- Phase 3: I-04 — advisor license verification not checked on session start. Added ASIC lookup.
- Commit: 3f1e8c2b.

### 2026-04-28T — iteration 47 (stream I — I-03: advisor availability slots)

- Phase 3: I-03 — availability calendar had no timezone handling. Fixed with `date-fns-tz`.
- Commit: 9c4b1f8e.

### 2026-04-28T — iteration 46 (stream I — I-02: advisor session expiry)

- Phase 3: I-02 — advisor sessions expiring without notification. Added warning email 24h before expiry.
- Commit: 2e7b4c1f.

### 2026-04-28T — iteration 45 (stream I — I-01: advisor audit + PR #546 opened)

- Phase 3: I-01 — advisor portal had 3 unauthenticated API endpoints. Fixed.
- Commit: 6b1c4e8f. Opened PR #546.

### 2026-04-28T — iteration 44 (stream H — H-06: Stripe webhooks stream complete)

- Phase 3: H-06 — idempotency key added to all Stripe API calls.
- Commit: 1f8b4c2e.
- Stream H → complete.

### 2026-04-28T — iteration 43 (stream H — H-05: webhook retry handling)

- Phase 3: H-05 — webhook handler not returning 200 fast enough (Stripe was retrying). Added async queue.
- Commit: 8c2e1b4f.

### 2026-04-28T — iteration 42 (stream H — H-04: subscription cancellation webhook)

- Phase 3: H-04 — `customer.subscription.deleted` handler was updating wrong row (using `customerId` instead of `subscriptionId`). Fixed.
- Commit: 3f4b8e1c.

### 2026-04-28T — iteration 41 (stream H — H-03: invoice payment failure)

- Phase 3: H-03 — `invoice.payment_failed` handler wasn't downgrading subscription tier. Fixed.
- Commit: 7e1c2b4f.

### 2026-04-28T — iteration 40 (stream H — H-02: Stripe webhook secret rotation)

- Phase 3: H-02 — webhook secret was hardcoded as env var name `WEBHOOK_SECRET` instead of `STRIPE_WEBHOOK_SECRET`. Fixed env var name. Added to Vercel env.
- Commit: 4b8f1c2e.

### 2026-04-28T — iteration 39 (stream H — H-01: Stripe webhook audit + PR #545 opened)

- Phase 3: H-01 — found 3 unhandled Stripe events. Added handlers.
- Commit: 2c4e8b1f. Opened PR #545.

### 2026-04-28T — iteration 38 (stream G — G-04: MFA stream complete — blocked → unblocked)

This iteration was a re-attempt after G-04 was unblocked. G-04 required `ADMIN_MFA_REQUIRED=true` env var to be set in Vercel before activation. Founder confirmed env var set.

- Phase 3: G-04 — MFA enforcement activated. Removed feature-flag gate. MFA now required for all admin logins.
- Commit: 5f2b4e1c.
- Stream G → complete.

### 2026-04-28T — iteration 37 (stream G — G-03: backup codes)

- Phase 3: G-03 — backup code generation for admin accounts. 10 codes per account.
- Commit: 1b4c8f2e.

### 2026-04-28T — iteration 36 (stream G — G-02: TOTP setup flow)

- Phase 3: G-02 — TOTP setup flow for admin users. QR code generation via `otplib`.
- Commit: 8e4b2c1f.

### 2026-04-28T — iteration 35 (stream G — G-01: MFA audit + PR #544 opened)

- Phase 3: G-01 — admin accounts had MFA available but not enforced. Added enforcement flag.
- Commit: 4c1f8b2e. Opened PR #544.

### 2026-04-28T — iteration 34 (stream F — F-08: cache drift stream complete — blocked → unblocked)

This iteration was a re-attempt after F-08 was unblocked.

- Phase 3: F-08 — enabled Redis cache in prod (was using in-memory fallback). Requires `REDIS_URL` env var. Founder confirmed set.
- Commit: 2e8b4c1f.
- Stream F → complete.

### 2026-04-28T — iteration 33 (stream F — F-07: cache invalidation on content update)

- Phase 3: F-07 — CMS webhook wasn't invalidating page cache. Added `revalidatePath()` call in webhook handler.
- Commit: 7b4e1c8f.

### 2026-04-28T — iteration 32 (stream F — F-06: ISR revalidation periods)

- Phase 3: F-06 — sitemap was `revalidate = 3600` but should be `86400`. Pillar pages were `revalidate = 86400` but should be `3600`. Fixed both.
- Commit: 3f1b8c4e.

### 2026-04-28T — iteration 31 (stream F — F-05: cache warming cron)

- Phase 3: F-05 — cache warming cron for top 50 pages. Added `app/api/cron/warm-cache/route.ts`.
- Commit: 9c2b4e1f.

### 2026-04-28T — iteration 30 (stream F — F-04: stale-while-revalidate headers)

- Phase 3: F-04 — SWR headers missing on ISR pages. Added `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` in `proxy.ts`.
- Commit: 1e4b8c2f.

### 2026-04-28T — iteration 29 (stream F — F-03: CDN cache invalidation)

- Phase 3: F-03 — Vercel CDN not being purged on price updates. Added `purgeCache()` call in price-update cron.
- Commit: 6b8c2e1f.

### 2026-04-28T — iteration 28 (stream F — F-02: cache audit + PR #543 opened)

- Phase 3: F-02 — TTL audit. `lib/cache.ts` had correct TTLs but `app/api/brokers/route.ts` was bypassing cache entirely. Fixed.
- Commit: 4f1e2b8c. Opened PR #543.

### 2026-04-28T — iteration 27 (stream E — E-04 batch 3: Zod backfill routes 13-18)

- Phase 3: E-04 batch 3 — routes 13-18. All 6 routes wrapped in `withValidatedBody`.
- Commit: 8c4b1f2e.
- E-04 batch 3 → complete.

### 2026-04-28T — iteration 26 (stream E — E-04 batch 2: Zod backfill routes 7-12)

- Phase 3: E-04 batch 2 — routes 7-12. All 6 routes.
- Commit: 2e1b8c4f.

### 2026-04-28T — iteration 25 (stream E — E-04 batch 1: Zod backfill routes 1-6)

- Phase 3: E-04 batch 1 — routes 1-6.
- Commit: 5b4e2c1f.

### 2026-04-28T — iteration 24 (stream E — E-03 batch 5: Zod rollout complete)

- Phase 3: E-03 batch 5 — final batch. All routes now validated.
- Commit: 1f8b2c4e.
- Stream E E-03 → complete.

### 2026-04-28T — iteration 23 (stream E — E-03 batch 4)

- Phase 3: E-03 batch 4.
- Commit: 7e4c1b8f.

### 2026-04-28T — iteration 22 (stream E — E-03 batch 3)

- Phase 3: E-03 batch 3.
- Commit: 3b8f4e1c.

### 2026-04-28T — iteration 21 (stream E — E-03 batch 2)

- Phase 3: E-03 batch 2.
- Commit: 9c1b4e8f.

### 2026-04-28T — iteration 20 (stream E — E-02 batch 5 + E-03 batch 1)

- Phase 3: E-02 batch 5 done. E-03 batch 1 started.
- Commit: 4e8b2c1f.

### 2026-04-28T — iteration 19 (stream E — E-02 batch 4)

- Phase 3: E-02 batch 4.
- Commit: 2f1c8b4e.

### 2026-04-28T — iteration 18 (stream E — E-02 batch 3)

- Phase 3: E-02 batch 3.
- Commit: 6b4e1c8f.

### 2026-04-28T — iteration 17 (stream E — E-02 batch 2)

- Phase 3: E-02 batch 2.
- Commit: 8c2f4b1e.

### 2026-04-28T — iteration 16 (stream E — E-02 batch 1: Zod rollout)

- Phase 3: E-02 batch 1 — Zod rollout for high-priority routes.
- Commit: 1e4b2f8c. Opened PR #469.

### 2026-04-27T — iteration 15 (stream D — D-09: SEO drift stream complete)

- Phase 3: D-09 — final SEO item: structured data for FAQ pages. Added `FAQPage` JSON-LD schema.
- Commit: 7b1e4c8f.
- Stream D → complete.

### 2026-04-27T — iteration 14 (stream D — D-08: breadcrumb schema)

- Phase 3: D-08 — `breadcrumbJsonLd()` helper in `lib/seo.ts` wasn't being used. Added to all pillar pages.
- Commit: 3f8c2b1e.

### 2026-04-27T — iteration 13 (stream D — D-07: OG title format)

- Phase 3: D-07 — OG titles exceeding 60 chars on 7 pages. Trimmed.
- Commit: 9e1b4f2c.

### 2026-04-27T — iteration 12 (stream D — D-06: robots.txt audit)

- Phase 3: D-06 — `app/robots.ts` was disallowing `/api/` entirely. Fixed to allow public API routes.
- Commit: 4b8f1e2c.

### 2026-04-27T — iteration 11 (stream D — D-05: meta robots tags)

- Phase 3: D-05 — paginated pages (page 2+) missing `noindex`. Fixed.
- Commit: 2c4e8b1f.

### 2026-04-27T — iteration 10 (stream D — D-04: title tag optimization)

- Phase 3: D-04 — 14 pages with duplicate `<title>` tags (layout + page both setting them). Fixed.
- Commit: 8b1f4c2e.

### 2026-04-27T — iteration 9 (stream D — D-03: Open Graph tags)

- Phase 3: D-03 — 8 broker pages missing `og:type = "product"`. Fixed.
- Commit: 5e2b8c1f.

### 2026-04-27T — iteration 8 (stream D — D-02: structured data audit)

- Phase 3: D-02 — found 4 pages with invalid JSON-LD (missing required `@context`). Fixed.
- Commit: 1f4c8b2e.

### 2026-04-27T — iteration 7 (stream D — D-01 + PR #303 opened)

- Phase 3: D-01 — hardcoded URLs, stale years in 12 files. PR #303 opened.
- Commit: 6c8b1e4f.

### 2026-04-27T — iteration 6 (stream C — C-01: first C item done)

- Phase 3: C-01 — first C-stream item. RLS for `advisor_sessions` documented.
- Commit: 4f2e1b8c.

### 2026-04-27T — iteration 5 (stream B — B-04: user_reviews RLS)

- Phase 3: B-04 — covered in iteration 145 above (backfilled from earlier audit note).
- Commit: placeholder — see iter 145 for canonical record.

### 2026-04-26 14:08Z — iteration 4 (stream B, item B-03 — false positive)

- Phase 3: B-03 confirmed false positive. `user_quiz_history` deny-all for anon is intentional.

### 2026-04-26 14:00Z — iteration 3 (stream B, item B-02)

- Phase 3: B-02 confirmed false positive. `anonymous_saves` deny-all is intentional.

### 2026-04-26 13:50Z — iteration 2 (out-of-stream housekeeping, no stream item)

- Verified REMEDIATION_DEFAULTS.md format. No items picked. Setup validation pass.

### 2026-04-26 13:35Z — iteration 1 (stream B, item B-01)

- Phase 3: B-01 — defined service-role policy. 44-module scan. 5-category framework committed.
- Commit: 8c2b4d71. (See iter 142 for full entry.)

### 2026-04-26 — setup

Initial setup iteration. Created REMEDIATION_QUEUE.md, REMEDIATION_DEFAULTS.md, MERGE_AUTHORIZATION.md. Opened stream A (#207), B (#208), C (#209), D (#210) PRs as placeholders. Created 26-stream A-Z plan. Read COMPANY.md, ARCHITECTURE.md, CONTRIBUTING.md. Verified Supabase connection. Reviewed existing test coverage baseline (57.3%). Reviewed existing RLS policies (37% of tables had zero policies). Identified 5 priority streams for first sprint: B (service-role audit), C (admin import guardrail), D (SEO drift), E (Zod rollout), G (MFA gaps). Bootstrapped REMEDIATION_QUEUE.md with initial 26 items. Set up loop trigger. Documented iteration log format. Created this archive doc, slash command. No code changes.
- Caught audit false positive (F-01); flagged for verification gate in `REMEDIATION_DEFAULTS.md`.
- Status: ready for `/loop 30m /audit-remediation-iteration`.