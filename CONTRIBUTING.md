# Contributing

Thanks for working on invest-com-au. This file is the practical guide
to getting changes merged without surprises.

## Branching

- `main` is the deployed branch. Vercel ships every push.
- Feature branches: `feature/<short-name>` or `claude/<short-name>`.
- Bugfix branches: `fix/<short-name>`.
- Never push directly to `main` — open a PR.

## Commit messages

Conventional Commits style:

```
feat: add lithium subcategory to mining hub
fix: correct broker fee calculation for fractional trades
chore(deps): bump next from 16.2.2 to 16.2.3
docs: explain cron secret rotation
test: add coverage for share-cost calculator
```

The CI run does **not** enforce this format, but the commit log reads
much better when everyone uses it.

## Pull requests

- Keep PRs focused. Multiple unrelated changes = multiple PRs.
- Include a `Test plan` section in the description listing what you
  manually verified (or `npm test` output).
- Link the issue number if there is one.
- Mark draft PRs as draft — reviewers ignore non-draft PRs unless
  they're ready.

## Code style

- TypeScript strict mode is on (including `noUncheckedIndexedAccess`).
- Prefer small functions. If a function is over 80 lines, ask whether
  it should be split.
- No `any` without an `eslint-disable` line and a comment explaining why.
- Server components by default; use `"use client"` only when you need
  hooks or browser APIs.
- Use the `@/` import alias instead of relative paths for anything
  outside the current directory.
- Errors flow through `lib/logger`, not `console.log` / `console.error`.

## Database changes

- All schema changes go through `supabase/migrations/<date>_<name>.sql`.
- Migration naming: `YYYYMMDD_short_name.sql` (e.g. `20260427_add_health_pings.sql`).
- Every migration must be **idempotent** — wrap in `IF NOT EXISTS` /
  `IF EXISTS` so it can be re-run safely.
- Every migration must include a top-of-file comment documenting the
  rollback strategy. See [docs/runbooks/database-rollback.md](docs/runbooks/database-rollback.md).
- New tables holding user data **must** have RLS enabled with explicit
  policies. CI does not catch this — please be careful.

## Tests

- Unit tests live in `__tests__/`. Run with `npm test`.
- Coverage thresholds enforced in CI: 60% lines, 55% functions,
  50% branches. Run `npm run test:coverage` locally to check.
- E2E tests live in `e2e/`. Run with `npm run e2e`.
- Component tests run in a jsdom environment; everything else runs
  in node.
- **New API routes need a test.** Pattern: `__tests__/api/<route>.test.ts`.

## Pre-commit hooks

Husky + lint-staged runs ESLint with `--fix --max-warnings 0` on
staged `.ts` / `.tsx` files. If a hook fails, the commit is blocked.

Bypass with `--no-verify` only if you understand exactly what you're
skipping.

## CI

CI runs lint, type-check, test (with coverage), build, secret-scan,
dependency-scan, E2E, and Lighthouse. The first four block the merge;
the last four are advisory (`continue-on-error: true`) until staging
credentials are wired in.

## Releasing

There is no manual release step. Pushing to `main` deploys to
production via Vercel. If you need to roll back, see
[docs/runbooks/launch-rollback.md](docs/runbooks/launch-rollback.md).

## Security

- Report vulnerabilities privately to security@invest.com.au.
- Never commit `.env.local` or any file containing real credentials.
  The pre-commit gitleaks scan catches most cases but isn't perfect.
- Rotate the `CRON_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` if they
  ever appear in a log, error message, or git history.

## Questions

Drop a comment on the PR or open a Discussion in the repo. We're a
small team — slow to respond is the default, not rude.
