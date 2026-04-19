# Applying the ops-quality CI changes

The ops-quality PR (#170) added 4 new CI checks — **Supabase types drift**,
**Lighthouse CWV gate**, **axe-core a11y**, and **rate-limit audit**. The
code for each already shipped. Only `.github/workflows/ci.yml` needs to be
replaced, and that file requires the GitHub `workflow` OAuth scope to edit —
which Claude Code's token doesn't have.

The full replacement file is at `docs/ci-ops-quality.final.yml`.

## One command to apply

Run this from the repo root on your local machine:

```bash
gh auth refresh -s workflow && \
  cp docs/ci-ops-quality.final.yml .github/workflows/ci.yml && \
  git add .github/workflows/ci.yml && \
  git commit -m "ci: add ops-quality gates — rate-limits, Supabase drift, Lighthouse CWV, a11y" && \
  git push
```

`gh auth refresh -s workflow` opens a browser to add the `workflow` scope to
your gh CLI token. After the push, CI runs the new jobs on the next PR.

## Add the two new secrets (Supabase drift check only)

Only the drift check requires credentials. Without them, the job logs a
warning and exits 0 — nothing breaks.

```bash
gh secret set SUPABASE_ACCESS_TOKEN   # paste a token from https://supabase.com/dashboard/account/tokens
gh secret set SUPABASE_PROJECT_ID --body "guggzyqceattncjwvgyc"
```

## What each new check does

| Job | Blocks PR? | What it catches |
| --- | --- | --- |
| Rate-limit coverage audit | yes | A new `app/api/**/route.ts` added without `isAllowed()` or an exemption. |
| Supabase types drift | yes (when secrets set) | DB schema changed but `lib/database.types.ts` wasn't regenerated. |
| Lighthouse CWV gate | yes | LCP > 4.5s, CLS > 0.15, or TBT > 800ms on `/`, `/compare`, `/broker/commsec`. |
| axe-core a11y suite | yes | Serious/critical WCAG 2 AA violations on 10 key routes. |

## Local equivalents

```bash
npm run audit:rate-limits                    # report-only
npm run audit:rate-limits -- --strict        # fails on missing

npm run db:types                             # regenerate lib/database.types.ts
npm run db:types:check                       # diff regenerated against committed

npx playwright test e2e/a11y.spec.ts         # run the a11y suite locally
```
