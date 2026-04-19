# CI additions — ops-quality sweep

This PR introduces three new CI jobs and a rate-limit audit step. The OAuth token used to push the branch did not have the GitHub `workflow` scope, so `.github/workflows/ci.yml` could not be updated automatically — apply the YAML below by hand, commit, and push.

## 1. Add `Rate-limit coverage audit` step to the existing `ci` job

After the `Test with coverage` step, before `Build`:

```yaml
      - name: Rate-limit coverage audit
        run: npm run audit:rate-limits -- --strict
```

## 2. Add three new jobs alongside the existing `secret-scan`, `e2e`, `lighthouse`, `preview-smoke` jobs

Insert these as siblings of the `lighthouse` job:

```yaml
  supabase-types-drift:
    name: Supabase types drift
    runs-on: ubuntu-latest
    timeout-minutes: 5
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Check for drift between DB schema and lib/database.types.ts
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
        run: |
          if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ -z "$SUPABASE_PROJECT_ID" ]; then
            echo "::warning::SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_ID not set — skipping drift check"
            exit 0
          fi
          npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > /tmp/generated.ts
          if ! diff -u lib/database.types.ts /tmp/generated.ts > drift.diff; then
            echo "::error::lib/database.types.ts has drifted from the live schema."
            echo "Run 'npm run db:types' locally, commit the update, and push again."
            echo ""
            echo "--- drift (first 100 lines) ---"
            head -100 drift.diff || true
            exit 1
          fi
          echo "lib/database.types.ts matches live DB schema."

  lighthouse-cwv-gate:
    name: Lighthouse — Core Web Vitals gate (hard-fail)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: github.event_name == 'pull_request'
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
      SUPABASE_SERVICE_ROLE_KEY: placeholder
      RESEND_API_KEY: placeholder
      STRIPE_SECRET_KEY: placeholder
      STRIPE_WEBHOOK_SECRET: placeholder
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      CRON_SECRET: placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CWV gate
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./.lighthouserc.cwv.json
          uploadArtifacts: true
          temporaryPublicStorage: true

  a11y:
    name: Accessibility (axe-core on key routes)
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: github.event_name == 'pull_request'
    env:
      NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder
      SUPABASE_SERVICE_ROLE_KEY: placeholder
      RESEND_API_KEY: placeholder
      STRIPE_SECRET_KEY: placeholder
      STRIPE_WEBHOOK_SECRET: placeholder
      NEXT_PUBLIC_SITE_URL: http://localhost:3000
      CRON_SECRET: placeholder
      CI: "1"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v6
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - name: Install Playwright browser
        run: npx playwright install --with-deps chromium
      - run: npm run build
      - name: Run axe-core a11y suite
        run: npx playwright test e2e/a11y.spec.ts --reporter=github
      - name: Upload a11y report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: a11y-report
          path: playwright-report/
          retention-days: 7
          if-no-files-found: ignore
```

## 3. Required GitHub Actions secrets

Only the Supabase drift check needs new secrets — the rest work with the existing env stub.

| Secret | Purpose |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | Personal access token from https://supabase.com/dashboard/account/tokens — scope: `read` |
| `SUPABASE_PROJECT_ID` | The project ref (e.g. `guggzyqceattncjwvgyc`) |

If these aren't set, the drift job logs a warning and exits successfully — it will not block PRs.

## Scripts available locally

```bash
npm run audit:rate-limits        # report-only
npm run audit:rate-limits -- --strict  # exits non-zero on missing coverage

npm run db:types                 # regenerate lib/database.types.ts from live schema
npm run db:types:check           # diff regenerated types against committed file
```
