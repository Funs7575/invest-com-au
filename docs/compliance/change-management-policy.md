# Change Management Policy

**Owner:** Founder (Finn Dunshea)
**Last reviewed:** 2026-05-02
**Next review:** 2027-05-02 (annual)
**Maps to SOC 2 TSC:** CC8.1, CC3.4

## Purpose

Defines how changes to production systems are authorized, tested, and deployed. Required for SOC 2 Type II Common Criteria 8 (Change Management).

## Scope

Applies to:
- All code merged to `main` branch (production)
- All Supabase database migrations
- All `.github/workflows/` changes
- All environment variable changes in Vercel production
- All third-party service configuration (Stripe, Resend, Sentry, Cloudflare DNS)

Does not apply to:
- Local development changes
- Branches that never merge to `main`

## Change classification — Tiers

Per `docs/audits/MERGE_AUTHORIZATION.md`. Each PR's changed files determine its tier; the most restrictive applicable tier wins.

### Tier A — Routine (auto-merge eligible)

**Examples:** test additions, doc updates, content/copy changes, page UI tweaks, hub component refactors, scripts/seed-* changes
**Path patterns matched:** `__tests__/**/*.test.ts`, `docs/**/*.md`, `content/**/*.md`, `app/**/page.tsx`, `scripts/seed-*.ts`, `components/Hub*.tsx`, `lib/verticals.ts`, `public/**`
**Authorization:** Auto-merge after CI green + 60-min quiet window (no STOP comment from a write-access user)
**Review:** None required (path classifier guarantees safety)
**Reversal:** Squash-merge in `git log`; revert via single PR

### Tier B — Reviewed (founder skims, then merges)

**Examples:** refactors not touching denylist paths, additive API tests with mocked DB, RLS migrations passing isolation gate
**Authorization:** Founder review + merge + 15-min observation window post-merge
**Review:** Diff scan; verify tests cover the change; confirm RLS isolation tests pass
**Reversal:** Same as Tier A

### Tier C — Announced (founder reviews, announces intent, merges unless STOP)

**Examples:** webhooks (`app/api/webhooks/*`), cron routes (`app/api/cron/*`), middleware (`proxy.ts`), auth (`lib/auth/*`), compliance copy (`lib/compliance.ts`), Stripe lib (`lib/stripe/*`), service-role client (`lib/supabase/admin.ts`), CI workflows (`.github/workflows/*`), new schema migrations (`supabase/migrations/*` with `CREATE TABLE`), BB/CC/DD/EE feature streams
**Authorization:** Founder reviews; announces intent (chat or PR comment); merges unless STOP comment received within reasonable window
**Review:** Full diff read; verify rollback strategy; confirm idempotency for migrations
**Reversal:** Forward-only — open a forward-fix PR; do NOT revert if migration has already run in prod (data integrity risk)

### Tier D — Hard hold (waits on precondition)

**Examples:** PRs whose body explicitly says "set X env var before merge"; PRs labelled `do-not-merge`
**Authorization:** Founder confirms precondition met before merge
**Review:** Full review + verification that env var / external config is in place
**Reversal:** Same as Tier C

### Tier E — Never autonomous (explicit fresh consent each time)

**Examples:** force-push, branch delete on `main`, repo settings changes, workflow disablement, anything `git revert` can't undo
**Authorization:** Explicit founder consent for that specific action
**Review:** Full discussion of consequences before any action
**Reversal:** May not be possible; requires backup recovery

## Tier classification — automated

The `auto-merge-label.js` workflow classifies every PR on every push:

- Path-based denylist (`supabase/migrations/**`, `app/api/**`, `lib/supabase/admin.ts`, `lib/stripe/**`, `.github/workflows/**`, `eslint.config.mjs`, `next.config.*`, `package.json`, `tsconfig.json`)
- Basename substring denylist (`rls`, `policy`, `.env`)
- Path-based allowlist for Tier A
- File-deletion guard (any tracked file removal → human review)
- LOC-threshold guard (additions > 1500 → human review)
- Queue-flag override for security/legal review items (`REVIEW_FLAGGED_ITEMS` in script)
- First-of-pattern override for new feature patterns

Classifier writes `auto-merge-safe` or `needs-human-review` label. The auto-merge workflow only acts on `auto-merge-safe` PRs.

## Pre-merge gates

Every PR must pass:

1. **Type-check** — `npx tsc --noEmit` (strict + `noUncheckedIndexedAccess`)
2. **Lint** — `npm run lint` with `--max-warnings 0`
3. **Tests** — `npm test` — full vitest suite + integration
4. **Build** — `npm run build` — production build succeeds
5. **Bundle size diff** — fails if bundle size grows beyond threshold
6. **Preview smoke test** — Vercel preview deploy passes critical-route smoke checks
7. **RLS migration gate** (if migration added) — every `CREATE TABLE` has `ENABLE ROW LEVEL SECURITY`
8. **Database types drift** — `lib/database.types.ts` matches live schema
9. **Lighthouse CWV (advisory)** — runs but does not block; report uploaded for review
10. **Rate-limit coverage** (pre-push hook) — every new API route has rate limit or `EXEMPT_PATTERNS` entry

## Auto-merge workflow

`.github/workflows/auto-merge.yml` provides automated merging for Tier A PRs that pass:

- Label `auto-merge-safe` present, `needs-human-review` absent
- Not draft, base is `main`, head matches `claude/audit-remediation/**` or `claude/audit-queue-**`
- Mergeable === true (no conflicts)
- All check runs succeeded, skipped, or neutral (none failing, none cancelled, none in-progress)
- No STOP comment from a write-access user posted after the head commit
- Head commit ≥ 60 min old

The 60-min quiet window is the founder's intervention buffer — STOP comment cancels merge even after countdown comment is posted.

## Pause mechanism

`LOOP_PAUSE` sentinel file at repo root pauses all audit-loop activity. Every cron fire's Phase 0.5 reads this file; if present, fire exits with `STATUS: PAUSED · LOOP_PAUSE sentinel present`. Resume by deleting the file.

Use cases:
- Spend monitor alert (`docs/ops/loop-spend.md` row exceeds threshold)
- Stuck-detection surfacing 3+ Blocked entries in 24h
- Manual pause for major migration window or incident response
- Pre-launch freeze

## Database migrations

All migrations under `supabase/migrations/*.sql` must:

- Have a header comment block with: Date, Audit ref, Queue item ID, Why (in user terms), idempotency claim, Rollback strategy (concrete SQL)
- Be wrapped in `BEGIN; ... COMMIT;`
- Use `IF NOT EXISTS` on table creates and index creates
- For RLS-on-existing-table: `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS ... CREATE POLICY ...` for any policies (idempotent reruns)
- Run prior policy discovery (`grep -nE "(POLICY.*<table>|<table>.*POLICY)" supabase/migrations/*.sql`) and explicitly drop conflicting prior policies by exact name

Migrations are forward-only in production. Rollback is via forward-fix migration, not revert. The `supabase/migrations/*` files are the single source of schema truth — `lib/database.types.ts` is regenerated to match.

## Emergency change

Hotfixes for production incidents:

1. Open PR with `hotfix` label
2. Founder reviews + merges directly (does not wait for 60-min quiet window)
3. Post-incident: open RCA in `docs/incidents/<YYYY-MM-DD>-<slug>.md` within 7 days
4. Identify control improvements; add to `docs/audits/REMEDIATION_QUEUE.md`

## Compliance evidence

For SOC 2 audit:
- Every change is in `git log` with author, message, timestamp
- Tier classification visible in PR labels (`auto-merge-safe` / `needs-human-review`)
- Founder reviews visible in PR review history
- Auto-merge workflow runs visible in `gh run list --workflow auto-merge.yml`
- Pause history in `git log` (LOOP_PAUSE create/delete commits)
- CI gate evidence in workflow run logs

## Exceptions

Hard-coded in `auto-merge-label.js`:
- `REVIEW_FLAGGED_ITEMS` — specific queue items always force human review (`BB-04`, `CC-01`, `EE-02`, `CC-07` currently)
- `TRACKED_PATTERNS` — first PR of a tracked pattern force-flagged for founder review (e.g., first hub-on-extracted-component PR)

Updates to either list require a Tier C PR.

## References

- `docs/audits/MERGE_AUTHORIZATION.md` — full tier definitions
- `.github/workflows/auto-merge.yml` — automated workflow
- `.github/workflows/scripts/auto-merge-label.js` — label classifier
- `.claude/commands/audit-remediation-iteration.md` — loop's per-fire change discipline
