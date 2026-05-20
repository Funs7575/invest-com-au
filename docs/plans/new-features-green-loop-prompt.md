# "Green the Audit" — pre-launch remediation loop (master prompt)

**What this is:** a self-contained prompt for a *local* Claude Code session that drives every finding in
`docs/audits/2026-05-20-new-features-audit.md` to green — surgically, at high quality, fanning out
sub-agents, merging one PR-section at a time, on a loop.

**How to run (pick one):**
- Paste this whole file into a fresh Claude Code session at the repo root, or
- Save as `.claude/commands/green-audit.md` and run `/green-audit`, or
- Drive on an interval: `/loop 15m /green-audit`.

**Cadence:** each invocation completes **exactly ONE mergeable chunk end-to-end, then stops.** Re-invoke (or
loop) to continue. Small, reviewable diffs over big-bang PRs.

---

## Mission

Resolve **every §5 red flag (P0 → P1 → P2)** in `docs/audits/2026-05-20-new-features-audit.md`, then close
the **completeness backlog** (the §8 inventory items tagged 🔴 / 🟠 / 📥 / 🟡). Done = the punch list is clear,
CI is green on `main`, and the quality dashboard has not regressed.

**Source of truth:** the audit doc above for *what*; this file for *how & in what order*; the queue file (below)
for *live state*.

## Operating principles (non-negotiable)

1. **Surgical.** Smallest diff that *fully* fixes the item. No refactors, no scope creep, no drive-by edits, nothing half-done. (Per `CLAUDE.md`.)
2. **Highest quality.** Every change ships with tests, passes `npm run type-check` and `npm run lint` (`--max-warnings 0`), and reuses single-source helpers — disclaimers from `lib/compliance.ts`, SEO from `lib/seo.ts`, JSON-LD from `lib/schema-markup.ts`, never hardcoded duplicates.
3. **Compliance-first.** This is an AFSL-licensed site. P0 compliance/security ships before anything cosmetic.
4. **Fan out.** For any item that spans many files or needs investigation, spawn an `Explore`/general-purpose sub-agent to map it first; parallelize independent items across sub-agents. One agent owns one item — never duplicate work.
5. **Honest state.** An item is "done" only when **merged to `main` and green**. Trust the working tree over tracker claims (the trackers drifted all month).
6. **Ask when unsure.** Use `AskUserQuestion` for anything ambiguous or architecturally significant (exposing the chat surface, dropping a table, changing auth/MFA, seeding public content). Never guess on those.

## The loop — one chunk per run

1. **Load state.** Read the audit §5 and `docs/audits/NEW-FEATURES-GREEN-QUEUE.md`. On first run, create that queue file seeded from the "Ordered work plan" below (P0→P1→P2→completeness), one row per item: `id | section | tier | status | PR | notes`.
2. **Pick.** Highest-priority **unblocked** item. Skip `human-gated` rows (see below).
3. **Duplicate guard.** Search open PRs for the same scope. If a fresh, on-track PR already covers it, *drive that one to merge* rather than opening a parallel branch.
4. **Investigate.** Confirm the real root cause **on `main`** (fan out a sub-agent if needed). The audit text is a pointer, not gospel — verify before changing.
5. **Implement** on `claude/green/<item-id>`. Surgical.
6. **Quality gates — ALL must pass before opening the PR:**
   - `npm run type-check` (prefix `NODE_OPTIONS="--max-old-space-size=5120"` if tsc OOMs)
   - `npm run lint`
   - `npm test -- <changed test files>` (write/extend tests for the change)
   - Data-table change → RLS enabled + an isolation test (`// rls-isolation:` marker)
   - AFSL-aware surface → disclaimer sourced from `lib/compliance.ts`
   - Cron route → `requireCronAuth` first
   - Migration → idempotent (`IF NOT EXISTS`), forward-only, rollback header, RLS+policies; apply to live via Supabase MCP before merge so the types-drift gate passes
   - UI change → actually run `npm run dev` and click the flow
7. **PR.** Conventional Commit title (`fix:` / `feat:` / `chore:` / `docs:`). Body states the *why* and **which audit flag it closes** (e.g., "Closes audit §5 flag #8"). Draft unless you intend to merge this run.
8. **Merge** per `docs/audits/MERGE_AUTHORIZATION.md`:
   - **Tier A** (docs/tests/content/page-UI) → merge on green, no wait
   - **Tier B** (refactor / additive API tests / RLS-passing migration) → merge + 15-min watch
   - **Tier C** (webhooks, cron, middleware/`proxy.ts`, auth, compliance, `lib/stripe`, `lib/supabase/admin`, new schema migration) → announce intent, merge unless `STOP`
   - **Tier D** (PR body needs an env var set first) → **hard hold**, leave as draft, surface to founder
   - **Tier E** (force-push / branch delete / table DROP / repo settings) → **never autonomous**; `AskUserQuestion` every time
   - CI must be green **except** the documented chronic-noise checks: Lighthouse CWV, axe-core a11y, and Supabase types-drift on diffs that touch no DB files. Never `--no-verify`.
9. **Record.** Flip the queue row (status + PR link), flip the matching tag in the audit doc, append one line to `docs/audits/green-loop-progress.md`.
10. **Stop.** End the run. Re-invoke for the next chunk.

## Ordered work plan (merge a PR per coherent section)

**Section 0 — Reconcile "done-not-on-`main`"** *(do first — removes confusion, mostly cheap)*
- Drive Document Vault PR **#1040** and startup-portal PR **#1048** to merge if green, else mark blocked with the reason.
- The real-time brief chat (`BriefChatPanel`, inventory #38) is built but mounted nowhere → **ASK**: expose it (then it needs the §5-#7 compliance framing) or remove the dead component.

**Section 1 — P0 compliance/security** *(highest priority)*
- **#1** Carbon/aquaculture/livestock listing pages: resolve the `// ACCUs are financial products` TODO — add the wholesale (s708) gate + `lib/compliance.ts` disclaimer, or `noindex`+unlist until reviewed. *(Tier C)*
- **#2** `DROP` orphan `sharesight_connections` (plaintext tokens) + remove from `.driftallowlist`. *(Tier E — confirm first)*
- **#3** Make admin MFA fail-closed on protected admin routes when `ADMIN_MFA_KEY` is unset. *(Tier C)*
- **#4** AFSL-expiry monitor: fail loudly + alert if `AFSL_LOOKUP_URL` unset; confirm env in prod. *(Tier C; env = Tier D — surface)*

**Section 2 — P1 disclosure & data exposure**
- **#5** Sponsored-content disclosure on advisor pay-to-publish articles (s1041H).
- **#6** General-advice disclaimer on community advisor posts (RG 36) — reuse the `/questions` pattern for consistency.
- **#7** Brief-chat compliance framing (disclaimer + archival/monitoring) — only if §0 exposes it.
- **#8** Supplier ABN on broker-portal invoice PDF (use `COMPANY_ABN` from `lib/compliance.ts`).
- **#9** Restrict `presence_pings` RLS — drop anon read or expose only a coarse online boolean.
- **#10** TMD expiry enforcement/alert (don't just display dates).
- **#11** Approval gate on regulatory-alert & country-rule publish.
- **#12** Require an admin session (not just `CRON_SECRET`) on the `run-migration` route.
- **#13** Impersonation visibility ("who is impersonating whom") admin view.
- **#14** Wire `portal-gate` workspace isolation for business/firm/startup portals.

**Section 3 — P2 reliability / consent / validation**
- **#15** Circuit-breaker on `ab-auto-promote`; **#16** make autopilot toggles DB-backed or remove them; **#17** outbound-webhook auto-retry; **#18** alert when `property-suburb-refresh` runs the zero-stub; **#19** Zod-validate `submit-lead`; **#20** consent fixes (SMS/WhatsApp consent record, unified unsubscribe, SSR-readable cookie consent); **#21** reconcile the stale `process-data-exports` "table missing" comment.

**Section 4 — completeness / SEO** *(the 🔴 / 🟡)*
- Listing verticals (inventory #21): enable submit **or** `noindex` the empty pages.
- Occupation pages (#83): add the 8 missing configs **or** drop them from the sitemap.
- Expert Teams (#23–31): add a `/teams` index page + a nav-registry link (unlocks the whole feature).
- Reports / switch-stories / community: **ASK** — seed content or keep `noindex`.

## Human-gated items — surface, don't spin

If an item needs something the loop can't do — **env var (Tier D)**, registrar/DNS, GSC/GA4, CDR accreditation,
or a compliance signoff (QQ-08-style) — mark the queue row `human-gated`, write the **exact action the founder
must take**, and move on. Never loop on a blocked item.

## Guardrails

- Never `--no-verify` / never bypass hooks. Never force-push `main`. Push from the **primary worktree** only (agent worktrees lack `node_modules` → pre-push OOM).
- Respect `LOOP_PAUSE` if present. One mergeable chunk per run. No scope creep.
- Admin-merge caution: if merging a PR that adds a new test file, run `npx vitest run <file>` locally first (admin-merge bypasses CI).
- Don't include any model identifier in commits/PRs/code.

## Definition of done (green)

- Every §5 flag resolved (or consciously deferred *with the founder*).
- Every 🔴 / 📥 inventory item green or deferred.
- CI green on `main`; quality dashboard not regressed.
- Queue empty except `human-gated` rows, each with a clear founder action.
