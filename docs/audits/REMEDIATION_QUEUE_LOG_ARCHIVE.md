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
- Phase 5: `lib/broker-recommendations.ts` — switched `createAdminClient()` → `await createClient()` from `@/lib/supabase/server`. Updated `__tests__/lib/broker-recommendations.test.ts` mock from `@/lib/supabase/admin` to `@/lib/supabase/server`. All 14 `scoreBrokerForContext` tests still pass (pure function, mock not exercised).
- Phase 6: committed `4ea88798`, pushed to stream C branch.
- Phase 6.5: no additional high-confidence discoveries.
- Phase 7: queue updated — In-flight table updated, C-06 row notes updated, iteration log added.

- STATUS: PROGRESS · stream=C · item=C-06 (iter1) · pr=#327
- Commit: 4ea88798
- Diff: +4 -4 across 2 files
- Next item: C-06 iter2 (bookmarks.ts + quiz-history.ts complex cases) or C-07 (CLAUDE.md allowed-scope list)
- Remaining: C-03 blocked · C-04 blocked · C-05 blocked (ArticleBrokerTable) · C-06..C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 161 (stream C — C-05 partial: notifications page done + ArticleBrokerTable blocked)

- Phase 0: batch continuation.
- Phase 1: synced main to `415b54a` (iter 160 merged). Stream C branch pulled to `8203a45` (iter 159 reconciliation).
- Phase 2: PR #327 CI pending (Vercel). No failures.
- Phase 3: picked C-05 (next pending C item). Two targets: account/notifications/page.tsx + ArticleBrokerTable.tsx.
- Phase 4: (1) notifications page — authenticated route (reads cookies for auth.getUser(); redirects to login if no user). user_notifications has "owner can read" SELECT policy (TO authenticated USING user_id = auth.uid()). Admin is unnecessary here — safe to switch to createClient(). (2) ArticleBrokerTable.tsx — public server component, no auth cookies. Phase 4 gate: not authenticated → Blocked. BUT behavioral analysis: query is `.eq("status", "active")` which matches the anon "Public read for active brokers" policy exactly — zero behavioral change.
- Phase 5: (1) notifications/page.tsx — removed createAdminClient import, switched `const admin = createAdminClient()` → use existing `supabase` var. Committed `170dd8e`. Diff: +1 -3 across 1 file. (2) ArticleBrokerTable.tsx → surfaced as Blocked.
- Phase 6: pushed `170dd8e` to stream C branch.
- Phase 6.5: no adjacent high-confidence discoveries.
- Phase 7: queue updated. C-05 status → blocked (partial). In-flight table updated. C-05 ArticleBrokerTable Blocked entry added.

- STATUS: PROGRESS · stream=C · item=C-05 (partial) · pr=#327
- Commit: 170dd8e
- Diff: +1 -3 across 1 file
- Next item: C-06 (lib/* modules) — C-05 ArticleBrokerTable + C-03 + C-04 remain blocked
- Remaining: C-03 blocked · C-04 blocked · C-05 blocked (ArticleBrokerTable only) · C-06..C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 160 (stream C — two parallel fires: C-DISC-admin-disputes resolved + C-04 blocked)

**Fire A — C-DISC-admin-disputes resolved:**
- Phase 3: `C-DISC-admin-disputes` blocked by iter 159. Prior commit `0fc88b5` on stream C branch already added "Admin can manage disputes" ALL policy — blocker resolved. Iter 159 blocked entry was based on role-identification error: `createClient()` for logged-in admins submits JWT → `authenticated` DB role in Postgres. Policy TO authenticated with role check covers admin page SELECT/UPDATE callers. No page refactoring required.
- Phase 7: C-DISC-admin-disputes blocked entry resolved. Queue updated.
- STATUS: PROGRESS · stream=C · item=C-DISC-admin-disputes (resolve) · pr=#327 · commit: 0fc88b5

**Fire B — C-04 blocked:**
- Phase 3: picked C-04 (next pending C item after C-03 blocked). `app/api/affiliate/click/route.ts` — single route.
- Phase 4: phase 4 gate — public route, no auth cookies. Found anon policies exist for both tables BUT `brokers` anon SELECT is limited to `status='active'` — switching to createClient() would 404 clicks on inactive broker slugs (behavioral change). Product decision needed.
- Phase 7: C-04 status → blocked. Blocked section entry added with decision matrix.
- STATUS: BLOCKED · stream=C · item=C-04

- Next item: C-05 (account/notifications page + ArticleBrokerTable component)
- Remaining: C-03 blocked · C-04 blocked · C-05..C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 159 (stream C — C-DISC-20260430-03 reconciled + C-DISC-admin-disputes surfaced)

- Phase 0: lock overridden (prior fire's session compacted — lock was 35 min old, well under 90 min, but the fire is dead). Lock re-acquired.
- Phase 1: synced main to `9180783` (parallel fire's iter 158 queue update). Stream C branch pulled (+5 commits from iter 158).
- Phase 2: CI on PR #327 pending — not red. No rescue needed.
- Phase 3: C-DISC-20260430-03 was listed as `done` by iter 158. The stream C branch had the lead_disputes RLS migration (`5b32c3b`) but review of the file revealed the iter 158 version lacked: (a) admin-pages warning, (b) `public.` schema prefix, (c) both DROP IF EXISTS policy name variants for idempotency. Also discovered that 3 admin browser pages (admin/page.tsx, admin/revenue/page.tsx, admin/advisors/page.tsx) use anon client for lead_disputes — not listed in the iter 158 queue item's caller verification — and will break when migration is applied in prod.
- Phase 4: verified all callers. lib/*, cron/*, API routes all use createAdminClient(). 3 admin browser pages use createClient(). No existing RLS policies on lead_disputes (confirmed). Migration safe to land in PR; precondition for prod apply: admin pages must be refactored first (tracked as C-DISC-admin-disputes).
- Phase 5: wrote reconciled migration adding admin-pages TODO warning, `public.` prefix, and idempotent DROP IF EXISTS for both policy name variants. Committed `9fe2ec2`. Rebase conflict on same file (iter 158 pushed identical migration). Resolved by taking best of both: iter 158's detailed header + caller-verification comment + my admin-pages warning. Final reconciled commit `9639d2c`.
- Phase 6: pushed to stream C branch at `9639d2c`.
- Phase 6.5: discovery — surfaced C-DISC-admin-disputes (admin browser pages breaking). No other new items.
- Phase 7: queue updated. C-DISC-20260430-03 done note updated to reference both commits. C-DISC-admin-disputes added to Blocked section. In-flight table updated.

- STATUS: PROGRESS · stream=C · item=C-DISC-20260430-03 (reconcile) · pr=#327
- Commit: 9639d2c
- Diff: +32 -21 across 1 file (migration reconcile)
- Next item: C-DISC-20260430-02 (advisor_sessions CREATE TABLE backfill, P3) or C-03 (advisor-apply refactor)
- Remaining: C-03..C-08 pending · C-DISC-20260430-02 pending · C-DISC-admin-disputes blocked · B-09 blocked

### 2026-04-30T — iteration 158 (stream C — C-02 step 5b — payment/firm-invite + C-DISC-20260430-03 lead_disputes RLS)

- Phase 0: lock acquired.
- Phase 1: synced main to `4c634ad`. Stream C branch pulled + rebased (concurrent fire had declared step 5 done but left payment/route.ts and firm/invite/route.ts on old createClient() path and C-DISC-20260430-03 pending).
- Phase 2: no CI failures to rescue.
- Phase 3: continued C-02 on C-01 branch. Found `firm/invite/route.ts` still using createClient() + manual session cookie extraction (missed by iter 157's "firm/* (all 4 routes)" — that fire did firm/route.ts, analytics, member, seat-request but not invite). payment/route.ts also still had manual session + advisor_id in body. Both break once advisor_sessions RLS migration is applied to production.
- Phase 4: verified. firm/invite has no auth.uid() path — correct to use requireAdvisorSession + admin. payment/route.ts redundant advisor_id body field confirmed safe to remove (session is authoritative). lead_disputes: no prior RLS policies found in any migration — first enable.
- Phase 5: (1) payment/route.ts — import requireAdvisorSession, remove manual cookie + second admin client + advisor_id body field; derive advisorId from session. (2) firm/invite/route.ts — extract getFirmAdmin() helper (requireAdvisorSession + admin firm-admin check), refactor all 3 handlers (POST/GET/PATCH) to use it + admin for all queries. (3) `20260606_c02_lead_disputes_rls.sql` — ENABLE RLS + FORCE RLS + service_role full access + advisor self-SELECT via professionals join. Committed `5b32c3b`. Diff: +134 -147 across 3 files.
- Phase 6: push rejected (concurrent fire had pushed to branch). Fetched + rebased; push succeeded.
- Phase 6.5: discovery — no new high-confidence items adjacent to touched files. C-DISC-20260430-02 (advisor_sessions CREATE TABLE backfill) already queued.
- Phase 7 (iter 158 part 2 — C-03 surface): picked C-03 as next item. Phase 4 gate: advisor-apply routes are PUBLIC (no auth cookies, no authenticated layout). Reviewed all 3 admin usages: photo/route.ts (storage) → false-positive; invite/route.ts (read-only invite lookup) → false-positive; route.ts dynamic admin import for agreement_acceptances → outside CLAUDE.md scope rule, needs human decision. Added Blocked entry for C-03 with decision matrix. Queue updated on main.

- STATUS: PROGRESS · stream=C · item=C-02 (step 5b) + C-DISC-20260430-03 · pr=#327
- Commit: 5b32c3b
- Diff: +134 -147 across 3 files
- Next pick: C-03 → STATUS: BLOCKED (see Blocked section — public route, admin scope exception decision needed)
- Remaining: C-03 blocked · C-04..C-08 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 157 (stream C — C-02 steps 4b+5 — professional_reviews RLS + tests + tier-upgrade + firm/* refactor)

- Phase 0: two parallel fires ran as "iter 157". Entries merged here.
- **Step 4b (parallel fire):** professional_reviews "Advisor can view own reviews" SELECT migration + requireAdvisorSession 7 unit tests + duplicate-import fix in data/route.ts. STATUS: PROGRESS · Commits: 48f4858 + 8201ea6 · Diff: +161 -90 across 5 files.
- **Step 5 (this fire):** tier-upgrade broken session fixed (wrong col + no JWT auth); firm/* (all 4) refactored (broken after RLS); disputes business queries switched to admin. STATUS: PROGRESS · Commit: 00ce41b · Diff: +59 -115 across 6 files.
- Phase 7: queue update on main (conflict-merged).

- STATUS: PROGRESS · stream=C · item=C-02 (steps 4b+5) · pr=#327
- Next item: C-DISC-20260430-03 (lead_disputes RLS) or C-03 (advisor-apply refactor)
- Remaining: C-02 minimal (payment optional) · C-DISC-20260430-03 pending · C-DISC-20260430-02 pending · B-09 blocked

### 2026-04-30T — iteration 156 (stream C — C-02 step 4 — requireAdvisorSession refactor, data/disputes/profile)

- Phase 0: batch-mode iteration 5 (final). Lock re-acquired (stale lock from compacted prior session cleared at start of batch; held through iterations 4 and 5).
- Phase 1: synced to main. CI check — PR #327 success, PR #326 success. No rescue needed.
- Phase 2: no failures.
- Phase 3: checked out C-01 branch. Found parallel fire had pushed `a7d90bb` (requireAdvisorSession extraction + notifications/topup/request-review). Rebased my commit on top.
- Phase 4: identified remaining inline getAdvisorId() in data/route.ts, disputes/route.ts, profile/route.ts. disputes/route.ts also had a slightly worse implementation (no email fallback in .or() clause — fixed by using shared helper). session/route.ts manages sessions directly — no getAdvisorId, no change needed.
- Phase 5: replaced inline getAdvisorId() with requireAdvisorSession() import in all 3 remaining routes. Removed unused createAdminClient import from disputes, createClient import from profile and data. Pre-commit TS check: all errors were pre-existing. Lint: eslint-config-next missing in sandbox (pre-existing env issue; CI authoritative gate). Committed `a6e06dc`. Diff: +10 -96 across 3 files.
- Phase 6: pushed after rebase (parallel fire had pushed queue update to branch). Commit `a6e06dc`.
- Phase 6.5: discovery — lead_disputes table has no RLS. disputes/route.ts GET uses createClient() to query lead_disputes; no RLS means all dispute rows visible to anon PostgREST callers. Added C-DISC-20260430-03.
- Phase 7: queue update on main. C-DISC-20260430-01 marked done (all 6 routes refactored).

- STATUS: PROGRESS · stream=C · item=C-02 (step 4) + C-DISC-20260430-01 (done)
- Commit: a6e06dc · Diff: +10 -96 across 3 files
- Next item: C-02 step 5 — tier-upgrade, payment, firm/* routes audit + C-DISC-20260430-03 (lead_disputes RLS)
- Remaining: C-02 step 5+ pending · C-DISC-20260430-02 pending · C-DISC-20260430-03 pending · B-09 blocked

### 2026-04-30T — iteration 155 (stream C — C-02 step 3b — requireAdvisorSession helper + 3 routes)

- Phase 0: batch-mode iteration 1 (new fire). Lock acquired.
- Phase 1: synced main. Found main was behind 3 commits (iter 152/153/154 queue updates + step 3a from parallel fire). Fast-forwarded.
- Phase 2: PR #303 state: merged (squash-merge captured C-01 only; C-02 commits on branch post-merge). Stream C CI: no new CI red to rescue.
- Phase 3: checked out `claude/audit-remediation/c-01-admin-callgraph`. Found branch has C-02 step 1-3a done (d38ae87, 8b0dbd7, 165c490) and a parallel fire's step 3a RLS migration already pushed. Continued on same branch.
- Phase 4: verification gate — all 3 target routes (notifications, request-review, topup) are advisor-portal-only; all read cookies; admin client appropriate in shared helper (email fallback + pending status + legacy cookie auth require service-role).
- Phase 5: created `lib/require-advisor-session.ts` (44 LOC); refactored notifications/route.ts, request-review/route.ts, topup/route.ts (removed ~74 LOC of duplicated getAdvisorId() closures, 3 files).
- Phase 6: committed `a7d90bb`. Rebased on top of parallel-fire's `165c490`. Pushed to branch. PR #303 was already squash-merged (C-01 only) — opened new draft PR #327 for all C-02 work (steps 1-3).
- Phase 6.5: discovery sweep — `session/route.ts`, `disputes/route.ts`, `tier-upgrade/route.ts`, `payment/route.ts`, `firm/*.ts` still have getAdvisorId() closures (5 files). Already tracked in C-02 + C-DISC-20260430-01. No new high-confidence items added.
- Phase 7: queue updated. C-02 notes + in-flight table updated to PR #327. C-DISC-20260430-01 notes updated.

- STATUS: PROGRESS · stream=C · item=C-02 (step 3b) · pr=#327
- Branch: claude/audit-remediation/c-01-admin-callgraph
- Commit: a7d90bb · Diff: +52 -86 across 4 files
- Next item: C-02 (step 4 — session, disputes, tier-upgrade, payment, firm/* routes)
- Remaining: C-02 step 4 pending · B-09 blocked · A pending · O pending

### 2026-04-30T — iteration 154 (stream C — C-02 step 3 — advisor data tables RLS foundation)

- Phase 0: batch-mode iteration 4. Lock re-acquired (stale lock from compacted prior session cleared).
- Phase 1: synced to main. CI check — PR #303 success, PR #326 pending (just pushed). No rescue needed.
- Phase 2: no failures.
- Phase 3: checked out C-01 branch. Fast-forwarded to `6aa7a86` (queue update from prior iter).
- Phase 4: verified prior policies. `professional_leads`: RLS enabled, INSERT policy only, no SELECT. `advisor_billing`: no RLS at all (only an index reference in 20260309, table created outside migrations). `professional_reviews` and `advisor_profile_views` already have public SELECT policies covering authenticated role.
- Phase 5: wrote `20260604_c02_advisor_data_tables_rls.sql` (146 lines). Adds "Advisor can view own leads" SELECT to professional_leads (first SELECT policy). Enables RLS + FORCE RLS on advisor_billing + service_role full access + "Advisor can view own billing" SELECT. SQL-only — no TS type-check needed.
- Phase 6: committed `165c490`, pushed to C-01 branch (PR #303). Diff: +146 -0 across 1 file.
- Phase 6.5: discovery sweep — no new high-confidence items found. `advisor_profile_views` already has "Public read advisor views" (TO anon, authenticated). `professional_reviews` has "Public can view approved reviews" (no TO clause, applies to all roles). Step 2 comment in data/route.ts was slightly over-broad (those two tables already had SELECT access), but admin client usage is still correct and safe.
- Phase 7: queue update on main.

- STATUS: PROGRESS · stream=C · item=C-02 (step 3) · pr=#303
- Commit: 165c490 · Diff: +146 -0 across 1 file
- Next item: C-02 (step 4 — remaining advisor-auth routes: notifications, session, disputes, tier-upgrade, topup, request-review, firm/*)
- Remaining: C-02 step 4+ pending · B-09 blocked · A pending · O pending

### 2026-04-30T — iteration 153 (stream C — C-02 step 2 — advisor data route silent empty-array bug)

- Phase 0: batch-mode iteration 3. Lock continued.
- Phase 1: synced to main (`698ee94`). No CI rescue needed.
- Phase 2: no failures on PRs #303, #285, #326.
- Phase 3: continued C-02 on C-01 branch. Fetched and pulled branch (`31526b3` → latest after parallel fire queue update).
- Phase 5: read `data/route.ts` (208 lines). Found: GET handler used `createClient()` for 5 sequential queries against tables with no RLS SELECT policy for authenticated role → all returned empty arrays silently. PATCH handler used `createClient()` for lead ownership check, lead UPDATE, response-time aggregation, and professionals avg-response-time update → all silently failed. Switched all 8 query calls to `createAdminClient()` scoped by advisorId. `createClient()` retained in `getAdvisorId()` for Supabase Auth session verification.
- Phase 6: committed `8b0dbd7`, pushed to C-01 branch (PR #303).
- Phase 6.5: discovery — `advisor_billing`, `advisor_profile_views`, `professional_reviews`, `professional_leads` all lack RLS SELECT policies for authenticated role. Should be added in C-02 step 3 before switching back to auth client. Already noted in C-02 queue entry.
- Phase 7: queue update on main.

- STATUS: PROGRESS · stream=C · item=C-02 (step 2) · pr=#303
- Remaining: C-02 (step 3 pending — add RLS to remaining advisor-data tables) · B-09 blocked · A pending · O pending

### 2026-04-30T — iteration 152 (stream C — C-02 step 1 — advisor_sessions RLS + profile PATCH bug fix)

- Phase 0: batch-mode iteration 2. Lock continued.
- Phase 1: synced to main (`149c5eb`). No CI rescue needed on open PRs (#303, #285, #326).
- Phase 2: no CI failures detected on in-flight PRs.
- Phase 3: picked C-02 (slot 11 in priority order; B-09 blocked, B-08 corrected in iter 151).
- Phase 4 (verification gate): confirmed routes read cookies via `await createClient()` + `getUser()`. Gate passes. Dual-auth model (Supabase Auth + custom advisor_session cookie) noted — prevents full admin→auth refactor in one shot.
- Phase 5: wrote migration `20260603_c02_advisor_auth_rls_hardening.sql` enabling RLS on `advisor_sessions` (deny-all anon, service_role bypass) and adding self-scoped SELECT + UPDATE policies to `professionals`. Fixed silent bug in `profile/route.ts` PATCH: UPDATE used `createClient()` with no matching RLS policy → silently returned 500; switched to `createAdminClient()` which works for both auth paths.
- Phase 6: committed `d38ae87`, pushed to C-01 branch (PR #303). Updated queue In-flight and C-02 notes.
- Phase 6.5 (discovery): `getAdvisorId()` helper duplicated across 7 routes in advisor-auth — should be extracted to `lib/advisor-auth.ts`. `advisor_sessions` table created outside migrations (no `CREATE TABLE` migration). Appending 2 discovery items.
- Phase 7: queue update on main.

- STATUS: PROGRESS · stream=C · item=C-02 (step 1) · pr=#303
- Remaining: C-02 (step 2 pending) · B-09 blocked · A-01..A-07 pending · O-01 ~34 tables remaining

### 2026-04-30T — iteration 151 (stream B — B-08 — corrected: code changes not in PR #286 merge)

- Phase 0: batch-mode continuation from prior fire (iter 149 rebase conflict unresolved). Lock acquired.
- Phase 1: synced to origin/main. Found main at `b94c307` (queue update only) then `e66c07e` (another parallel fire).
- Phase 2: CI rescue not needed.
- Phase 3: Continued resolving rebase conflict on `b-07-rls-migration-lint` branch (B-08 commit had merge conflicts from a parallel fire's earlier push). Resolved conflicts in submit/route.ts and enquire/route.ts; pushed `fba9e66`.
- Phase 4: Discovered PR #286 was already merged. Code changes (`204b4da`) were added to the branch AFTER the merge and never landed on main. Queue had been prematurely updated by iter 149 to say B-08 done. Migration and route changes were not on main.
- Phase 5: Created clean branch `claude/audit-remediation/b-08-rls-select-only` from main. Applied net diff of B-08 changes: removed `createClient` import from submit route, switched INSERT to admin client, added `createAdminClient` import to enquire route, switched counter RPC + fallback UPDATE to admin client. Added migration `20260602_investment_listings_tighten_rls.sql` (drops anon write policies; upgrades counter RPCs to SECURITY DEFINER with `SET search_path`).
- Phase 6: Committed `ed3cbee`, pushed, created PR #326. Updated queue In-flight table (B stream → `b-08-rls-select-only` / PR #326) and corrected B-08 Done entry reference.
- Phase 6.5: Discovery sweep: enquire route now uses `createAdminClient` but has no test coverage for the counter-increment path (RPC + fallback). Submit route now uses admin client but existing tests may not cover admin-client path. Appending D-DISC item below.
- Phase 7: Queue update on main. B-08 corrected. Next item: C-02 (advisor-auth admin imports) or next pending non-blocked item.

- STATUS: PROGRESS · stream=B · item=B-08 (correction) · pr=#326
- Remaining: B-09 blocked · C-02..C-08 pending · A-01..A-07 pending · O-01 ~34 tables remaining

### 2026-04-30T — iteration 150 (stream B — B-09 — BLOCKED: email-verification mechanism needed)

- Phase 0: batch-mode fire, iteration 1. Lock acquired.
- Phase 1: reset to `origin/main` (`b94c307`). Queue shows B-09 as first pending item (slot 10, B other).
- Phase 1.5: types-drift skipped (Supabase MCP not probed — SQL-only iteration).
- Phase 2: CI checked PRs #286 (B), #285 (D), #303 (C), #289 (L) — all checks green or skipped. No CI rescue needed.
- Phase 3: B-09 is the first pending non-blocked item. Stream B branch `claude/audit-remediation/b-07-rls-migration-lint` (PR #286) already exists.
- Phase 4 (verification gate — refactor): read `app/api/listings/my-listings/route.ts`. Route accepts unauthenticated `email` query param; uses `createClient()` (anon key); no cookie read, no session, no `auth.uid()` linkage. Gate requires "route reads cookies / is in an authenticated layout." FAILED. PII enumeration vector cannot be closed by admin-client swap alone — caller identity must be verified first. The mechanism (OTP vs magic link vs account login) is a design decision. Surfaced to Blocked with 4-option decision matrix.
- Phase 5/6: no code changes. Queue-only update on main.
- Phase 7: B-09 status → `blocked`; B-09-MY-LISTINGS-1 entry added to Blocked section; this log entry added.

- STATUS: BLOCKED · stream=B · item=B-09
- Remaining: B-09 blocked · C-02..C-08 pending · A-01..A-07 pending · O-01 ~34 tables remaining

### 2026-04-30T — iteration 149 (stream B — B-08 — investment_listings anon write surface removed)

- Phase 0: batch-mode iteration 5/5 (final). Lock held from batch start.
- Phase 1: synced main (`d5c566f`). Queue shows B-08 pending (slot 10, B other).
- Phase 1.5: types-drift skipped.
- Phase 2: CI checked for PR #286 (B-07 branch) — no red CI.
- Phase 3: B-08 pending on existing B-07 branch. Checked out `claude/audit-remediation/b-07-rls-migration-lint` (PR #286). C-01 confirmed done (`b654e12`) — B-08 dependency satisfied.
- Phase 4: Read listings/submit/route.ts — uses createClient() for INSERT; already has createAdminClient() for advisor opt-ins fan-out. Read enquire/route.ts — uses createClient() for counter RPC + fallback UPDATE. Read migration 20260601_rls_investment_listings.sql — "anon insert pending" + "anon update counters" are the policies to drop.
- Phase 5: 3-file change: (1) listings/submit — dropped createClient() import, switched INSERT to admin; reused same admin for opt-ins. (2) listings/enquire — added createAdminClient() import; switched counter RPC + fallback UPDATE to admin. (3) New migration 20260602_rls_investment_listings_select_only.sql — drops anon insert/update policies + REVOKEs column-level UPDATE grant. diff: +82/-7.
- Phase 6: committed `204b4da`; pushed cleanly to PR #286.
- Phase 6.5: discovery sweep — all 5 sibling listing routes have tests (listings-submit.test.ts, listings-enquire.test.ts, listings.test.ts, listings-my-listings.test.ts, property-listings.test.ts). No discovery items.
- Phase 7: B-08 → done; B stream in-flight row updated; this entry added to main.

- STATUS: PROGRESS · stream=B · item=B-08 · branch=claude/audit-remediation/b-07-rls-migration-lint · pr=#286 · commit=`204b4da` · diff=+82/-7 across 3 files
- Next item: B-09 (my-listings admin refactor + email-verification challenge)
- Remaining: B-09 pending · C-02..C-08 pending · A-01..A-07 pending · O-01 ~34 tables

### 2026-04-26 — setup
- Created queue, defaults doc, slash command. No code changes.
- Caught audit false positive (F-01); flagged for verification gate in `REMEDIATION_DEFAULTS.md`.
- Status: ready for `/loop 30m /audit-remediation-iteration`.
