# Onboarding — day 1

> Goal: in 8 focused hours, a new engineer (or the founder coming back after
> a break) can clone this repo, understand its architecture, ship a small
> queue item, and not break anything. Read top to bottom; don't skip steps.

## Hour 1 — clone + boot

```bash
git clone https://github.com/Funs7575/invest-com-au.git
cd invest-com-au

# Node 20+ is required — Node 18 builds will silently break at runtime
node --version  # expect v20.x

npm ci          # ~2 min
```

Create `.env.local` with at minimum:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
RESEND_API_KEY=placeholder
STRIPE_SECRET_KEY=placeholder
STRIPE_WEBHOOK_SECRET=placeholder
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=placeholder
```

For real values, ask the founder. Stubs are enough to build and run unit
tests; you only need real values to hit the live database.

## Hour 2 — read these five files in order

Sequence matters. Each file assumes the prior one.

1. `COMPANY.md` — what the business is, who the team is, what compliance
   constraints apply (AFSL, ACL, AFCA, GDPR, AU Privacy Act).
2. `docs/architecture/overview.md` — request lifecycle, the 5 most-important
   files, the 3 things that surprise new engineers.
3. `CLAUDE.md` — project-specific conventions. Strict TS + `noUncheckedIndexedAccess`.
   Single sources of truth. The audit-loop's quirks. **Re-read the
   "Common gotchas" section at the bottom; it'll save you 10 hours of
   debugging over the first month.**
4. `CONTRIBUTING.md` — commit format (Conventional Commits), PR process,
   branch naming.
5. `docs/audits/ENTERPRISE_STANDARD.md` — the per-surface quality rubric.
   Every PR is judged against this. AI surface is currently deferred per
   `docs/launch/manual-ops-during-ai-pause.md`.

After this read-through, you should be able to answer:

- What's the difference between `lib/supabase/server.ts` and `lib/supabase/admin.ts`?
- Why is the middleware called `proxy.ts`?
- What's a "stream" and what's a "queue"?
- Where would I put a new piece of compliance copy?

If any of those are blank, re-read the relevant file.

## Hour 3 — run the tests

```bash
npm run type-check      # ~30s. Strict TS — must pass clean.
npm run lint            # ~20s
npm test                # ~3-4 min full suite
```

If anything fails on a fresh clone of `main`, that's a real regression —
**don't proceed** until either (a) you've fixed it and opened a PR, or
(b) someone confirms it's a known flake and points you at the rescue PR.

## Hour 4 — read the queue, pick a small item

```bash
less docs/audits/REMEDIATION_QUEUE.md
less docs/audits/LOOP_PROGRESS.md  # what the audit-loop has been doing
```

The queue is grouped by **stream** (a letter — A, B, C, D, K, N, V, etc.).
Each item has a status: `pending` / `in-progress` / `done` / `blocked` /
`false-positive` / `deferred-post-launch`.

For a first PR, find a `pending` item that's:

- Estimated 1 iteration (the smallest unit)
- In a stream that doesn't require deep domain knowledge (avoid B/RLS,
  K/security, J/Stripe webhooks for the first PR)
- Doesn't have unmet dependencies in the "Cross-stream dependencies" section

Good first-PR streams: D (route tests), F (helper consolidation), V (CI
gates), Y (docs/dated-stats).

## Hour 5 — branch + implement

```bash
git checkout main
git pull
git checkout -b claude/audit-remediation/<stream-letter>-<your-task>

# Hack hack hack
npm run dev  # http://localhost:3000

# As you work:
npm test -- <changed file>          # focused tests
npm run type-check                  # frequently

# Before committing:
npm run lint                        # husky will run this anyway
npm test                            # full suite, ~4 min
```

## Hour 6 — open a PR

Conventional Commit subject:

```bash
git add <specific files>            # never `git add -A`
git commit -m "test(d): integration tests for /api/<route>"
git push -u origin claude/audit-remediation/<stream>-<task>
```

Open the PR as a **draft**. Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
Reference the queue item ID in the body.

## Hour 7 — watch CI

CI runs on every PR. Expected jobs:

- **Lint · Type-check · Test · Build** (~6 min) — must pass
- **AI code review** (~2 min) — posts a sticky comment with verdict; fails
  the check if `REQUEST_CHANGES`
- **Secret scan / dep vulns / size cap** — should all pass on a small change
- **Vercel preview** — auto-deploys; click the bot's URL to test live

If anything's red, read the log, fix, push. The audit-loop has a CI-rescue
pattern (commits prefixed `chore(audit): … CI-rescue`); don't be afraid
to use that vocab.

## Hour 8 — merge or leave for review

Three paths:

- **Auto-merge-safe** (docs only, tests only): apply the `auto-merge-safe`
  label, mark the PR ready, the auto-merge workflow handles it.
- **Needs human review** (any runtime change): mark ready for review,
  ping the founder, wait. Don't self-merge runtime changes on day 1.
- **Still uncertain**: leave as draft, write down your concerns in the PR
  body, ping the founder.

Either way, end the day by:

```bash
# Add a one-line entry to LOOP_PROGRESS.md describing what you did
# Update the queue item's status if it's now done
git checkout main && git pull
```

## What to read next

Once you've shipped one PR, deepen your knowledge here:

- `ARCHITECTURE.md` — the full version of the architecture
- `docs/audits/2026-04-26-comprehensive-audit.md` — the most recent enterprise audit; everything in flight today is a remediation of something there
- `docs/runbooks/` — every incident type has a runbook; skim them all
- `docs/audits/HUB_BLUEPRINT.md` — how the multi-vertical hub system is structured (matters once you touch any `app/<vertical>/` code)
- `docs/audits/REMEDIATION_DEFAULTS.md` — the audit-loop's playbook
- `docs/glossary.md` — AFSL, ACL, AFCA, KYC, etc.

## Common day-1 mistakes

| Mistake | Fix |
|---|---|
| `arr[0]` without optional chaining | `arr[0]?.foo` — `noUncheckedIndexedAccess` is on |
| Importing `lib/supabase/admin.ts` in an RSC page | Use `lib/supabase/server.ts` instead; admin is service-role |
| Adding a new disclaimer string | Use `lib/compliance.ts` instead — single source of truth |
| Writing a new affiliate URL builder | Use `lib/tracking.ts` instead |
| Naming a folder `_foo/` for a route | Next.js excludes `_`-prefixed folders. Use `(foo)/` for route groups instead |
| Using `console.log` in production code | Use `logger("ctx")` from `lib/logger.ts` — Sentry-integrated |
| Skipping the husky pre-commit hook | Don't. It's `eslint --fix --max-warnings 0`. Hook failures = real problems |
| Running `git add -A` | Stage explicit files. Avoid committing `.env.local` or any local-only files |
