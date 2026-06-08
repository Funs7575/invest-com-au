# Platform Status Report — 2026-06-08

> Verified status snapshot produced by cross-referencing the in-repo trackers
> against **live GitHub PR state** (open + merged) and the live Supabase schema.
> Supersedes ad-hoc status claims in the per-stream docs where they conflict —
> see §2 (the trackers lag reality by ~2 weeks).
>
> Method: `gh`/MCP PR inventory (16 open, 36 merged since 2026-06-06) +
> `git` branch analysis + the migration-ledger investigation in
> `docs/audits/DB-STATE-2026-06-07.md`. Every PR number below was confirmed
> against the live API on 2026-06-08, not copied from a tracker.

## 1. Executive summary

- **Platform is ~75–80% launch-ready.** All known P0/P1 bugs from the 2026-06-02
  QA campaign are fixed. Remaining launch gaps are founder-gated (pen test,
  SOC 2 vendor, legal sign-off) — see §6.
- **The #1 infrastructure blocker is database migration-ledger drift.** The
  recent `/invest` listings firefight (~13 PRs, #1457→#1470) was almost entirely
  *symptoms* of this drift ("re-apply missing column", "match drifted verticals").
  The root-cause fix is staged in PR #1466 (this branch); the irreversible
  baseline-squash itself is founder-gated (Tier E).
- **The in-repo status trackers are materially stale** (§2). They cite PRs that
  merged or closed 2+ weeks ago (#948–#959, #1132–#1141). This report is the
  reconciled ground truth.
- **9 financial-correctness PRs (#1369–#1381) plus a bots/UX PR (#1451) are
  ready and idle** awaiting a merge decision; deep review in §4.

## 2. Key finding — the trackers lag reality

| Tracker | Claims | Reality (verified 2026-06-08) |
|---|---|---|
| `DIRECTORY_UX_UNIFICATION.md` | Phases 2–6 blocked behind PRs #955–#957 | Those PRs are gone; the directory work shipped as **#1452–#1455** (merged 06-06). A new 23-item UX backlog is open in **#1451**. |
| `BUILD-EVERYTHING-QUEUE.md` | 29 bootstrap PRs #1132–#1141 in-flight | All long-merged/closed; **loop never wired to a cron** — staged, never run. |
| `REMEDIATION_QUEUE.md` | iter 590, "ALL-BLOCKED" (05-29) | Loop kept producing merges through 06-07; queue entry not refreshed. |
| `pre-launch-wave-status.md` | idle since 05-25 | Accurate — wave is complete (27/28), W2.15 CDR blocked. |

**Action taken in this pass:** added this report as the reconciled source of
truth and corrected the migration docs (`MIGRATION_LEDGER_RECONCILIATION.md`,
`DB-STATE`, the superseded `MIGRATION_DEPLOY_BACKLOG.md`). The machine-managed
loop tracker (`REMEDIATION_QUEUE.md`, written by the cloud audit-remediation
routines every ~7 min) is intentionally **left to its owning loop** to avoid a
write race — its staleness is noted here instead.

## 3. Recent activity — 36 PRs merged 2026-06-06 → 2026-06-07

| Cluster | PRs | Note |
|---|---|---|
| `/invest` listings firefight | #1457, #1458, #1460, #1461, #1462, #1464, #1465, #1467, #1468, #1469, #1470 (+ CI guard #1463) | **Drift symptoms** — see §5 |
| Directory UX surface-consistency | #1452, #1453, #1454, #1455 | Shared `DirectoryHero`, /compare + /advisors adoption |
| Bots / QA fleet, GEO, a11y, security | #1440–#1450 | Monitors, Speakable schema, anon-read leak fixes, contrast |
| DB/CI hardening | #1463 (fail-loud migrate secrets), #1458/#1460 (re-apply FI flag) | Drift-driven |

**Insight (the through-line):** #1458/#1460 ("re-apply missing professionals
FI-flag column"), #1462/#1469 ("match drifted verticals"), and #1463 ("fail
loudly when migrate secrets unset") are all the same root cause: the local
migration tree has diverged from the live DB, so features silently break and get
hand-patched. **PR #1466 fixes the root cause** (baseline-squash + drift gates),
which is why it is the highest-leverage item on the board.

## 4. Open PR inventory — 16 (7 draft, 9 ready)

Every PR below was deep-reviewed (CI status, mergeability, correctness, tier).
**Authorship note:** the financial/UX/listings PRs are on the `Funs7575`
(founder) account; per `MERGE_AUTHORIZATION.md` founder-authored PRs are out of
autonomous scope, and all of them additionally carry explicit founder/legal
preconditions — so **none were merged autonomously**. The Vercel "Account is
blocked" red on these PRs is a billing block, not a CI failure; the signal that
matters is the `Lint · Type-check · Test · Build` job.

### 4.1 Financial-integrity PRs (Tier C→D — all HELD)

All correct-by-review unless noted. Each requires founder/legal sign-off; two
also have failing CI to fix first.

| PR | What | CI | Disposition |
|---|---|---|---|
| #1369 | Claw back granted credit on cash refund | 🟢 green | **HOLD** — founder must ratify the *allow-negative-balance* clawback policy; then mergeable |
| #1371 | Gate referral-accept on tier + balance | 🟢 green | **HOLD** (client-money) — flag: adds `success_bonus_award` to floored kinds = success-tier revenue-behaviour change |
| #1374 | Grant 3 free leads (honour configured 0) | 🟢 green | **NEAR-READY** — only needs founder to confirm the 2→3 free-lead pricing decision; then Tier-C announce-and-merge. Fixes a real falsy-zero bug. |
| #1378 | Deterministic `reference_id` for downgrade proration | 🟢 green | **HOLD (Tier D)** — `needs-founder-decision` label + reconcile already-double-credited advisors. Residual: same-day re-downgrade under-credits (key omits target tier). |
| #1379 | Clamp proration `daysRemaining` to `[0, cycleDays]` | 🟢 green | **HOLD** — lowest-risk (pure fn, kills an active ~12× over-credit on annual subs); best first founder approval. Annual proration still under-credits (deferred). |
| #1377 | Atomic balance mutation (RPC) + negative guard | 🔴 **fail (7 tests)** + conflicts | **NEEDS-WORK + HOLD** — core opt-lock already on main (redundant); add `.rpc` to shared test mock, fix 7 failing tests, re-justify dispute-resolver `refund→escalate`, rebase |
| #1380 | Marketplace webhook idempotency + fail-closed secret | 🟢 green | **HOLD** — confirm `STRIPE_MARKETPLACE_WEBHOOK_SECRET` is provisioned in live env *before* merge (else webhook 500s) |
| #1381 | Gate auto-recharge "succeeded" notification on PI status | 🔴 **fail (2 tsc)** | **NEEDS-WORK + HOLD** — fix 2 `tsc` errors in `__tests__/lib/briefs/auto-recharge.test.ts` (annotate `eligibleProRow(): ProRow` / cast `null`). Latent: no webhook grants credit for raw PI — notification still optimistic |

### 4.2 Stale drafts → CLOSE (founder authorization requested, §AskUser)

History was **re-rooted/force-pushed**; #1272/#1273/#1159 share an orphaned root
(`git merge-tree` → "refusing to merge unrelated histories") — **unrebaseable**.

| PR | What | Why close |
|---|---|---|
| #1439 | Auto-revert of #1432 (weights table) | Original healthy on main; merging would re-break wealth-stack POST (500). Bot-authored noise; red is Vercel billing. |
| #1446 | Auto-revert of #1444 (bots lifecycle) | Workflow live & healthy on main; pure QA tooling; same false red. |
| #1272 | Wave 1–4 audit (183 files) | Unrelated history (unmergeable); largely superseded. Re-derive any unique items fresh. |
| #1273 | Fresh audit Opus 4.8 (196 files) | Unrelated history; partly landed. **Salvage candidates → fresh PRs:** `RATE_LIMIT_HARD_FAIL` fail-closed toggle (`lib/rate-limit.ts`), delete dead `lib/json-ld.ts` SSOT-trap, preserve the audit doc. |
| #1159 | `iv_active_kind` cookie via Route Handler | Already fixed differently on main (`bestEffortSetActiveKind()` in `lib/portal-gate.ts`). |

### 4.3 UX / bots / listings

| PR | Disposition |
|---|---|
| #1451 (ready) | **Fix 1 line → Tier-A merge.** `__tests__/bots/coverage-flows.test.ts:18` asserts `toBe(10)` after flow count rose to 18. Ships 8 bot flows + `docs/strategy/UX_BACKLOG.md` (22 outstanding advisor UX items — see §4.4). Refresh backlog: drop ADV-004 (pagination already shipped), re-verify ADV-002. |
| #1459 (draft, dirty) | **Carve out the safe non-migration parts** (4 strategy docs + 3 Phase-0 404/redirect/copy fixes + the increment-1 **anonymous-submission auth gate** + 2 tests) into a rebased PR — Tier-A docs + Tier-C auth gate, CI-green, no DB. **Leave the `20260907040000_…ownership.sql` migration + increment-2 blocked behind the Tier-E baseline-squash.** Do NOT `db push`/`apply_migration`. D4/s708 gate stays unbuilt pending legal (`LISTINGS_S708_LEGAL_BRIEF.md`). |
| #1466 (this branch) | The ledger root-cause fix. Hardened + rebased this pass — see §7. |

### 4.4 Outstanding advisor-UX backlog (deduplicated, verified vs main)

22 items in `docs/strategy/UX_BACKLOG.md` (P1→P3). **Confirmed already done (drop):**
ADV-004 (directory pagination — `AdvisorsClient.tsx` has full paging), plus
DIRECTORY QW2/QW3/QW5/QW6 + SC-1..7. **Verify-first:** ADV-002 (booking CTA exists
in the client component already). **Genuinely outstanding quick wins** (≤½ day):
ADV-003 (silent portal errors → banner), ADV-008 (quiz progress save), ADV-012
(community notify CTA), ADV-014 (article share), ADV-015 (OTP countdown), ADV-016
(mobile "Filters (3)" label), ADV-017 (for-advisors FAQ), ADV-018/019 (freshness
stamps), ADV-022 (joined-this-week). **Larger (P1):** ADV-001 (portal onboarding
wizard), ADV-005 (for-advisors testimonials), ADV-006 (mobile tab overflow),
ADV-007 (quiz match-explanation), ADV-011 (reviews load-more — `advisor/[slug]/page.tsx:109` `.limit(20)`).

## 5. The migration-ledger drift (root cause) — status

- **Diagnosis of record:** `docs/audits/DB-STATE-2026-06-07.md` (415 live tables
  vs 352 in committed types pre-fix; 404 legacy migration files; only ~5 tracked
  in the prod ledger).
- **Plan of record:** `docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md` (Path A
  baseline-squash).
- **Shipped in PR #1466 (this branch):**
  - `scripts/check-migration-filenames.mjs` — CI gate, unique 14-digit versions
  - `scripts/audit/ledger-drift.mjs` — local-vs-ledger drift audit
  - `scripts/db/baseline-squash.sh` — guarded helper (stops before irreversible step)
  - Regenerated `lib/database.types.ts` (352→415 tables; type-check clean)
  - CI wiring, tests, CONTRIBUTING discipline, FIN_NOTEBOOK decision record
- **Founder-gated (Tier E, never autonomous):** the baseline-squash execution +
  `migration repair` + enabling auto-apply. Teed up; *revisit 2026-06-21*.
- **Code-quality hardening of the above:** see §7.

## 6. Consolidated founder-gated blockers

1. **DB ledger baseline-squash** (Tier E) — unblocks #1459 + all table-adding
   features. *Revisit 2026-06-21.*
2. **CDR accreditation** — blocks pre-launch W2.15 + remediation BB-04. Fin's lane.
3. **Launch-readiness:** pen test, vuln scan, SOC 2 vendor (Vanta/Drata), legal
   sign-off on launch copy + Privacy Policy + ToS, soak/load test.
4. **New-features decisions (4):** BriefChatPanel expose/delete, `AFSL_LOOKUP_URL`
   env, SMS consent record, content seed vs noindex.
5. **20h-sprint founder briefs (3):** SocialProofCounter (ACL s18 misleading
   conduct), `/admin` security headers (CSP regression caution), refund
   under-credit (may be addressed by #1369 — see §4).

## 7. Code quality — #1466 hardening (done this pass)

An adversarial code-review of the reconciliation tooling found 2 critical, 5
major, and several minor issues plus prod-safety doc gaps. **All were fixed on
this branch** (commit `harden(db): …`), verified by type-check + lint + tests:

| Sev | Issue | Fix |
|---|---|---|
| CRIT | CSF/s708 globs matched only today's 3 filenames → future capital-raising migrations silently archived | Broadened to token-level (`*startup*`, `*s708*`, `*esic*`, `*crowdfund*`, `*csf*`, `*wholesale*`, `*sophisticated*`) |
| CRIT | `ledger-drift` printed "✅ reconciled" off an empty/failed dump (the job's exit gate) | Empty dump → refuse to certify; `ledgerEmpty` added to `--json` |
| MAJ | Filename gate relied on accidental glob×pathspec; archive filter was undocumented-load-bearing | Directory pathspec + explicit load-bearing dirname filter; comment corrected |
| MAJ | Rename-to-bad-name escaped the gate when `diff.renames=true` | Force `-c diff.renames=false` |
| MAJ | `baseline-squash.sh` could half-archive on an untracked `.sql` | Fail on untracked; move tracked-only via `git ls-files`; recovery hint |
| MAJ | Gate false-passed locally with no `origin` remote | Resolve `origin/<ref>`→`<ref>` with a loud skip |
| MIN | `--ledger` ate the next flag; numeric versions dropped; non-versioned files faux-collided; dup parser logic | Validate flag; coerce to string; filter `""`; extract shared `scripts/lib/migration-version.mjs` |
| DOC | Runbook `${TS}` didn't survive between steps (prod ledger write); risky ledger collapse shown first | Re-derive `TS` from baseline filename; safe path is now default, collapse demoted to enumerated optional; partial-archive rollback documented |

**Tests:** 18 → **37** (added pure-function edge cases + a real integration test
that spawns the gate against a temp git repo: archive filtering, config-proof
rename detection, base-ref fallback, exit codes). Branch rebased onto current
`main` (merge, no force-push); drift gate, filename gate, type-check, lint all green.

## 8. Recommended action plan (sequenced)

**Done this pass (autonomous, in-scope):** hardened the #1466 tooling to
production quality (§7); produced this verified report; rebased #1466 onto
`main` (merge, no force-push); kept CI green. **No open PR was merged or closed**
— every open financial/UX/listings PR is on the founder account and/or carries
an explicit founder/legal precondition (§4), and closing PRs is the founder's
call; they are teed up below.

**Founder decisions queued (low-effort, high-leverage first):**
1. **Authorize the 5 stale-draft closes** (#1439, #1446, #1272, #1273, #1159 —
   §4.2). All verified safe to close; #1273 has 2 salvage items worth a fresh PR.
2. **#1451** — approve the 1-line test fix + Tier-A merge (ships the bot suite +
   UX backlog). **#1459** — approve the non-migration carve-out.
3. **Financial PRs** (§4.1) — ratify in this order: #1379 (lowest-risk),
   #1374 (confirm 3-free-leads), then #1369/#1371/#1378/#1380; fix CI on
   #1377/#1381 first.
4. **Schedule the Tier-E baseline-squash** (§5) — the #1 unblocker.
5. **Decide** the 4 new-features items + 3 sprint briefs (§6).

**Founder, pre-launch:** pen test, SOC 2 vendor (Vanta/Drata), legal sign-off on
launch copy + Privacy Policy + ToS, soak/load test.

## Appendix A — full merged-since-06-06 list

#1428, #1430, #1431, #1432, #1433, #1434, #1435, #1436, #1437, #1440, #1441,
#1442, #1443, #1444, #1445, #1446(rev), #1447, #1448, #1449, #1450, #1451,
#1452, #1453, #1454, #1455, #1456, #1457, #1458, #1460, #1461, #1462, #1463,
#1464, #1465, #1467, #1468, #1469, #1470.
