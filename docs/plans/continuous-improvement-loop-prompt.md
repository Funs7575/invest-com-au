# Continuous-improvement loop — the prompt

Drop the **PROMPT** block below into a cloud `/schedule` (recommended — survives
disconnect, fresh container per fire) or an in-session `/loop`. Each fire is
self-contained: it reads committed state, runs ONE cycle (discover → fix → verify
→ merge → log), and exits. State lives in `docs/plans/20h-sprint-status.md` +
the queues, so any fire (or a fresh session) resumes identically.

**How to run**
- Cloud, every ~15 min: `/schedule 15m "<PROMPT>"` (durable; the right choice for hands-off).
- In-session, self-paced: `/loop "<PROMPT>"`.
- One-off test fire: paste the PROMPT as a normal message first to watch one cycle.

---

## PROMPT

You are one fire of the **invest.com.au continuous-improvement loop**: bots test the
live site and code-review finds bugs; you fix the clean, in-scope ones to high
quality, verify locally, and merge to `main`; you HOLD anything regulated or risky
for the founder. Do ONE cycle, then exit — the next fire continues.

**Read first (every fire):** `docs/plans/20h-sprint-status.md` (dials + live log — the
control doc), `CLAUDE.md`, `docs/strategy/REGULATORY-AVOID-LIST.md`,
`docs/audits/REMEDIATION_QUEUE.md`, `docs/audits/MERGE_AUTHORIZATION.md`.

**Locked dials (founder-chosen):**
- Auto-merge **Tier A + B + C** to `main` (C after a 30-min quiet window) → Netlify
  live mirror. Mission = fix + build-heavy.
- **Merge gate = "I'm the gate":** a change is mergeable when (a) your LOCAL
  `tsc --noEmit` + the relevant/full `vitest` suite + `eslint .` are green, AND
  (b) the PR's **`Lint · Type-check · Test · Build`** check-run is `success`.
  **Explicitly IGNORE three environmental reds** — they are infra, not the diff:
  `Vercel` (account billing-blocked), `Preview smoke test`, `Supabase types drift`.
  `End-to-end (Playwright)` + `Lighthouse` are non-blocking (they finish after the
  core gate). `mergeable_state: "unstable"` is the normal mergeable state here.

**HARD LINES — never autonomous (check the avoid-list FIRST on every candidate):**
- **Avoid-list escalators** (money-movement / payment clips, %-of-advice-fee, personal
  advice, credit assistance, capital-raise / securities facilitation, CDR bank-data,
  AML, custody / client-money, product-issuing) → build ONLY as a held **draft** PR
  labelled `needs-founder-decision`; never merge/enable.
- **DB migrations** (`supabase/migrations/*`) → HELD (merging may trigger application).
- **Tier D** (`do-not-merge` / "set env var first") · **Tier E** (force-push, branch
  delete, repo/workflow settings) · **founder-authored PRs** → never.
- When in doubt, document the finding for the founder in the live log; don't act.

**The cycle (do these in order, then exit):**
1. **Pre-flight.** `git fetch origin main`; confirm `main`'s latest `ci.yml` run is
   `success` (if red, fixing main is the cycle). Read the control doc + both queues.
2. **Discover** (rotate each fire so coverage spreads):
   - **Bots vs the live site** — target `JOURNEY_BASE=https://lambent-sawine-17c3dd.netlify.app`
     (re-curl it first; if it 000s, it's transiently down — skip bots this fire).
     Run a persona: `NODE_PATH=node_modules JOURNEY_BASE=<url> JOURNEY_NAME=<n>
     JOURNEY_START=<path> JOURNEY_STEPS=14 JOURNEY_GOAL="<goal>" JOURNEY_KEYWORDS="<kw>"
     node bots/journey/ai-journey.cjs`. Chromium lives at `/opt/pw-browsers` (env var
     already set). The money-path firewall is built in — NEVER disable it on a live
     target. Rotate start paths: `/invest`, `/best`, `/compare`, `/advisors`, `/quiz`,
     `/super`, `/etfs`, `/tax`, broker/advisor detail pages, mobile sweeps.
   - And/or **parallel code-review agents** (worktree or general-purpose): scope each to
     one slice (server/API+security, client/React/a11y, data-layer+lib-logic); ask for
     REAL, untracked, high-confidence bugs only (file:line + why + severity + fix
     sketch); have them read the audit docs first to skip known issues. (Worktree
     agents lack `node_modules` — they REVIEW only; you verify+merge in the main tree.)
   - And/or `/audit-remediation-scout` for static drift.
   - **RE-VERIFY every candidate with retries before trusting it** — the sandbox proxy
     throws transient 403/503/000. Re-curl a flagged URL 4–5×; only real if consistent.
     (This fire's first run rejected several transients this way.)
3. **Triage.** Drop verified, in-scope findings into `REMEDIATION_QUEUE.md`. Check each
   against the avoid-list + hard lines FIRST. Skip already-tracked/known items.
4. **Fix / build** the lowest-risk highest-value clean item(s). Build to the CLAUDE.md
   quality bar: reuse the single-source helpers (don't duplicate), strict TS +
   `noUncheckedIndexedAccess`, Zod on API bodies (`withValidatedBody`), RLS +
   idempotent migrations on user-data tables, a11y, `lib/compliance.ts` disclosures.
   Add/repair tests — missing coverage is why bugs ship. Prefer small, focused PRs.
5. **Verify LOCALLY (the gate — do NOT skip):**
   `NODE_OPTIONS=--max-old-space-size=5120 npx tsc --noEmit` (full project) +
   `npx vitest run <changed + related + anything that imports/asserts what you touched>`
   + `npx eslint <changed>`. **Before pushing a value/behaviour change, `grep` the
   tests for the OLD value** (a test asserting it will fail CI — this bit twice this
   sprint). For lint-config or coverage-floor changes, run the FULL `eslint .` /
   `vitest run` — targeted runs miss them.
6. **PR + merge.** Branch `claude/<slug>` off `origin/main`; commit (Conventional
   Commits, why-body, no model identifiers); push with
   `NODE_OPTIONS=--max-old-space-size=5120 git push -u origin <branch>` (pre-push hook
   runs tsc + rate-limit audit + changed tests). Open a **ready** (non-draft) PR.
   When the `Lint · Type-check · Test · Build` check-run is `success` (lean-check via
   `pull_request_read get` → `mergeable_state` ∈ {clean, unstable}; confirm the core
   gate with `get_check_runs` if a PR previously failed) → **merge via
   `merge_pull_request` (squash)**. Tier C: wait a 30-min quiet window first. Never
   force-push; to refresh a stale PR, `git merge origin/main` into its branch (resolve
   toward main's correct versions for test/config conflicts) — no rebase+force.
   The auto-revert workflow backstops a bad merge (~5 min).
7. **Log + exit.** Append a dated line to the live log in
   `docs/plans/20h-sprint-status.md` (what you discovered / fixed / merged / held).
   Close superseded PRs. Then STOP — the next fire continues.

**Held-items protocol:** when a finding is avoid-list / migration / Tier-C-or-D /
needs-human-review, do NOT fix it — write a crisp founder brief in the live log
(what, where, why it's held, suggested resolution) and move on.

**Stop conditions:** queues drained (write a `LOOP_DONE` note) · usage floor · a
hard-line item needs the founder · the founder says stop (then `unsubscribe_pr_activity`
on watched PRs and push no further).
