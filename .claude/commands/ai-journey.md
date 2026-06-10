---
description: Run the AI Journey — drive the live site as goal-directed personas (in-session, on the Max plan, no API key), verify findings, and write a report.
---

You are running the **AI Journey** — the in-session, goal-directed exploration of the live site. All tooling lives in `bots/journey/`. Read `bots/journey/README.md` for the full picture.

**Cost model:** *you* (Claude) are the judgment brain, in-session on the user's Max plan — no Anthropic API key, no separate bill. The firewall keeps it safe.

Args (optional, `$ARGUMENTS`): may name a persona (e.g. `advice-seeker`), a target URL, a single flow (`journey`|`forms`|`leads`), or a free-text goal.

---

## Scripts

| Script | What it does |
|--------|-------------|
| `bots/journey/ai-journey.cjs` | Full-signal best-first link crawler. Captures UX, tap targets, SEO/meta, perf timing, a11y quick-scan, broken images, cookie banners. |
| `bots/journey/ai-form.cjs` | Multi-step form driver (v2). Answers quiz questions, fills inputs, captures lead payloads, mocks Supabase auth. Works with any form URL via `FORM_*` env vars. |
| `bots/journey/lead-flows.cjs` | Four end-to-end revenue flows (v2): get-matched quiz, adviser enquiry, broker comparison, account signup detection. Verifies lead payload is well-formed. |
| `bots/journey/personas.cjs` | Standard persona definitions (CommonJS). `getPersona(name)` returns env var values for any script. |

---

## Step 1 — Bootstrap (the #1 reason a fresh run "doesn't work")

A freshly-cloned container has the npm package but **not** the Playwright browser binary. From the repo root:
```bash
[ -d node_modules ] || npm ci          # install deps if missing
npx playwright install chromium        # idempotent — installs the browser binary
```
If `npx playwright install` can't reach the CDN (restricted network), say so and stop.

---

## Step 2 — Target

Default `JOURNEY_BASE=https://lambent-sawine-17c3dd.netlify.app` (the Netlify preview mirror). The harness sets `ignoreHTTPSErrors` for sandbox TLS-MITM. Confirm the target is reachable first.

**Important:** the sandbox TLS-MITM proxy drops async API fetches, so the quiz's `/api/get-matched/start` and `/resolve` will time out in the sandbox. For a complete form run, trigger the **GitHub Actions workflow** instead (see Step 5) — it runs on a clean GitHub runner with no proxy.

---

## Step 3 — Run (in-session, sandbox)

**Link crawler** for a single persona:
```bash
NODE_PATH=node_modules \
  JOURNEY_NAME=advice-seeker JOURNEY_START=/advisors \
  JOURNEY_GOAL="Find a financial adviser near retirement" \
  JOURNEY_KEYWORDS="adviser,retirement,super,contact" \
  JOURNEY_VIEWPORT=desktop JOURNEY_STEPS=12 \
  JOURNEY_OUT=/tmp/journey \
  node bots/journey/ai-journey.cjs
```

Or load a persona from `personas.cjs`:
```bash
node -e "
  const { getPersona } = require('./bots/journey/personas.cjs');
  const p = getPersona('advice-seeker');
  require('child_process').spawnSync('node', ['bots/journey/ai-journey.cjs'], {
    env: { ...process.env, JOURNEY_NAME: p.name, JOURNEY_START: p.startPath,
           JOURNEY_GOAL: p.goal, JOURNEY_KEYWORDS: p.keywords.join(','),
           JOURNEY_VIEWPORT: p.viewport, JOURNEY_STEPS: String(p.steps),
           JOURNEY_OUT: '/tmp/journey', NODE_PATH: 'node_modules' },
    stdio: 'inherit',
  });
"
```

**Form driver** (works on sandbox for navigation, but quiz fetches may fail — use GHA for full run):
```bash
NODE_PATH=node_modules \
  FORM_NAME=get-matched FORM_START=/get-matched \
  FORM_GOAL="Complete the quiz as a long-term growth investor" \
  FORM_KEYWORDS="long-term,growth,shares,etf,balanced,yes,high" \
  FORM_VIEWPORT=desktop FORM_OUT=/tmp/journey \
  node bots/journey/ai-form.cjs
```

**Lead flows** (all four: quiz + adviser enquiry + broker comparison + account signup):
```bash
NODE_PATH=node_modules LEAD_OUT=/tmp/journey node bots/journey/lead-flows.cjs
```

The side-effect firewall is built in: on any **live/protected** target every payment, affiliate `/go/`, lead, Supabase auth, and account write is **mocked**. Never disable it against a real target.

---

## Step 4 — Read it back and judge

Open `/tmp/journey/<name>.json` and the per-step screenshots. Walk the journey as the persona:
- Flag confusing flows, dead-ends, broken links, missing fee/risk disclosures
- Check `tapViolationCount` on mobile runs (< 44 px is a real usability failure)
- Check `a11y.imgsNoAlt`, `btnsNoName`, `inputsNoLabel` totals
- Check `pagesWithoutCanonical`, `pagesWithoutMetaDesc` for SEO gaps
- For lead flows: verify `advisorEnquiryWellFormed: true` in the summary

---

## Step 5 — Full run on GitHub Actions (bypasses TLS-MITM proxy)

The **AI journey** workflow (`.github/workflows/ai-journey.yml`) runs the full suite on a clean GitHub runner — this is the only way to complete the quiz end-to-end in automation. Trigger it:

- **Manual:** Actions → "AI journey" → "Run workflow" — pick target, flows, persona
- **Automatic:** Fridays 16:00 UTC (weekly)

Artifact `ai-journey-<run-id>` contains all JSON reports + screenshots. Download it and read with Claude.

---

## Step 6 — Verify before reporting (critical)

The sandbox network is flaky — a one-off 403/503/000 is usually transient. For every candidate finding, re-probe with 4–5 retries (`request.newContext({ ignoreHTTPSErrors: true })`) and only call it real if the status is **consistent**. Discard transients.

---

## Step 7 — Compliance gate

If a finding touches advice/recommendations, payments, capital-raising/securities, credit, or bank-data — **read `docs/strategy/REGULATORY-AVOID-LIST.md` first**. Those escalators are never-autonomous (Tier E): surface them, never fix by building or un-gating.

---

## Step 8 — Report + act

Write a dated report to `bots/reports/ai-journey-<YYYY-MM-DD>.md`. For real, unambiguous, in-scope bugs, fix per `docs/audits/MERGE_AUTHORIZATION.md` tiers and open a **draft PR**. For ambiguous / product / compliance decisions, ask the founder.

---

## Personas

| Name | Start | Viewport | Steps |
|------|-------|----------|-------|
| `new-investor` | `/` | desktop | 15 |
| `advice-seeker` | `/advisors` | desktop | 12 |
| `quiz-taker` | `/get-matched` | desktop | 14 |
| `mobile-shopper` | `/` | mobile | 10 |
| `first-home-buyer` | `/invest/property` | desktop | 12 |
| `startup-investor` | `/invest/startups` | desktop | 12 |

Full definitions: `bots/journey/personas.cjs`.
