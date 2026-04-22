# Flaky test triage — design doc

**Status:** design proposal, not implemented.
**Trigger to build:** when the Playwright / E2E suite exceeds ~100
tests, OR when retry-masking starts hiding real breakage (see
symptoms below).
**Written:** 2026-04-22 during the continuous-improvement session.

---

## Symptoms this solves

- A Playwright test fails on the first attempt but passes on the
  retry (we have `--retries=2` configured). Today: we shrug.
  Tomorrow: the retry is papering over an actual race in production
  code.
- A unit test that works locally mysteriously fails on CI runners
  under load. Today: re-run the job. Tomorrow: the test has a
  timing assumption that will bite in prod.
- The full E2E suite has ~20 tests. When we ship the full
  auth + quiz + booking flows (~100 tests), today's "re-run and
  hope" strategy starts losing PRs to noise.

---

## Goals

1. **Surface** every flake (a test that failed then passed in
   retries) — the current Playwright `retries=2` masks these.
2. **Quarantine** chronic flakes automatically — a test that has
   flaked ≥3 times in the last 14 days should stop blocking PRs
   and be flagged for fixing.
3. **Dashboard** the top-10 most flake-prone tests by last-14-day
   count, so the owner has a priority list.

Non-goals:

- Replace the existing retry behaviour. A retried-then-passed test
  is still better UX than a blocking failure from a transient network
  blip.
- Fix flaky tests automatically. That's human judgement — the
  system surfaces, engineers fix.

---

## Design

### Data model

One table: `flaky_test_runs`. Each Playwright run emits one row
per test × attempt.

```sql
CREATE TABLE flaky_test_runs (
  id              bigserial PRIMARY KEY,
  run_id          text NOT NULL,              -- GitHub Actions run ID
  workflow        text NOT NULL,              -- ci.yml / e2e-preview.yml / etc
  branch          text NOT NULL,
  pr_number       integer,                    -- null for main-branch runs
  commit_sha      text NOT NULL,

  test_file       text NOT NULL,              -- e.g. e2e/critical-flows.spec.ts
  test_name       text NOT NULL,              -- e.g. "quiz completes"
  project         text,                       -- chromium / webkit / mobile-safari

  attempt         smallint NOT NULL,          -- 1 = first try, 2+ = retries
  outcome         text NOT NULL CHECK (outcome IN ('passed', 'failed', 'timedout', 'skipped')),
  duration_ms     integer NOT NULL,
  error_message   text,                       -- truncated, 500 chars max

  recorded_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flaky_test_runs_file_name_recent
  ON flaky_test_runs (test_file, test_name, recorded_at DESC);
CREATE INDEX idx_flaky_test_runs_run
  ON flaky_test_runs (run_id);
```

Retention: 30 days via a scheduled cleanup cron (same pattern as
`cron_run_log`). 30 days × ~15 PRs/day × ~100 tests × 3 attempts
= 135k rows max. Well within a single-table budget.

### Ingest

Two touchpoints:

1. **Playwright JSON reporter**: add `json` to the reporter list in
   `playwright.config.ts`. Playwright writes a JSON summary to
   `playwright-report/report.json` at the end of each run.

2. **GitHub Actions post-run step**: in each workflow that runs
   Playwright (e2e, e2e-preview, a11y, e2e-staging),
   add a final step that parses the JSON, POSTs each test-attempt
   row to a cron-authenticated endpoint `/api/internal/flaky-test-
   ingest`. CRON_SECRET is already available.

### Classification

A Postgres view computes the 14-day flake profile for each test:

```sql
CREATE VIEW flaky_tests_14d AS
SELECT
  test_file,
  test_name,
  COUNT(*) FILTER (WHERE attempt = 1 AND outcome != 'passed') AS first_try_failures,
  COUNT(*) FILTER (WHERE outcome = 'passed' AND EXISTS (
    SELECT 1 FROM flaky_test_runs r2
    WHERE r2.run_id = r.run_id
      AND r2.test_file = r.test_file
      AND r2.test_name = r.test_name
      AND r2.attempt < r.attempt
      AND r2.outcome != 'passed'
  )) AS recovered_via_retry,
  COUNT(DISTINCT run_id) AS total_runs,
  MAX(recorded_at) AS last_seen_at
FROM flaky_test_runs r
WHERE recorded_at > now() - interval '14 days'
GROUP BY test_file, test_name;
```

**Flake score** = `recovered_via_retry / total_runs`. Thresholds:

| Score     | Action                                            |
|-----------|---------------------------------------------------|
| 0–5%      | Healthy. No action.                               |
| 5–15%     | Watch. Surface in weekly digest email to owner.   |
| 15–30%    | Quarantine. Auto-mark `test.skip` in next PR.     |
| 30%+      | Bug. Hard-fail — can't merge while in this band.  |

### Quarantine automation

A scheduled GH Actions cron (daily 04:00 AEST — same slot as other
maintenance jobs) queries `flaky_tests_14d`, finds tests with
score ≥ 15%, and opens a PR that:

1. Adds `test.skip(…)` before the test body.
2. Injects a comment block: `// @ts-expect-flake — quarantined
   YYYY-MM-DD; flake score: 23%. Owner: @finn. Unskip when fix
   lands.`
3. Assigns to the file's CODEOWNER.

The CODEOWNER reviews, fixes the test or accepts the quarantine,
merges. No test stays quarantined silently — the PR forces a human
decision.

### Dashboard

Admin route `/admin/test-health` renders the `flaky_tests_14d`
view as a sortable table. Columns: file, name, score, first-try
failures, last seen. The CTO-agent (#02) can read this surface in
its weekly health check and raise a T2 escalation if any test
stays in the 15%+ band for 7 consecutive days without a fix PR.

---

## Cost

Incremental server load: negligible (~15k rows/week).
Incremental CI time per workflow: ~2s for the JSON parse + POST
step.
Human time per week: ~20 min to review the quarantine PRs.

## Failure modes

- **Ingest endpoint down during a run**: row loss for that run.
  Acceptable — the next run will catch up; we're looking at
  trends, not perfect coverage.
- **Auto-quarantine quarantines a real-signal test**: the weekly
  digest email + the PR-assignment flow surfaces it; owner
  unskips within 7 days or the quarantine stands.
- **Flake score stays high after a fix lands**: expected — the
  14-day window takes 2 weeks to fully roll off. Unquarantine PR
  is manual, same as quarantine PR.

---

## Build order when we're ready

1. Add the table + view migration (~30 min).
2. Add the ingest endpoint in `app/api/internal/flaky-test-ingest/
   route.ts` with CRON_SECRET auth (~1 hour).
3. Wire the JSON reporter to Playwright config + add the post-run
   step to e2e and e2e-preview workflows (~1 hour).
4. Build the admin `/admin/test-health` page reading
   `flaky_tests_14d` (~2 hours).
5. Write the daily quarantine-PR cron (~3 hours, most of which is
   the PR-creation wiring via the GitHub API).
6. Tune thresholds after 2 weeks of production data.

**Total:** ~1 day when the E2E suite hits ~100 tests and the noise
is actually costing PR review time.

## Alternatives considered

- **BuildPulse / Trunk.io flaky-test services**: SaaS solutions
  that ingest JUnit XML and give you a hosted dashboard. Pricing
  around $50–200/mo. Less work upfront but one more vendor
  relationship, and the auto-quarantine workflow would need custom
  logic anyway. Revisit if we're spending a day a month building
  this ourselves.
- **Playwright `--retries=0` and hard-fail on every flake**: loud
  signal, but burns engineer time on transient infra issues. Works
  for small suites; painful once E2E > 20 tests.
- **Don't retry, just log**: similar to above. The retry behaviour
  exists precisely because transient flakes happen; the problem
  isn't retries, it's the lack of visibility into them.
