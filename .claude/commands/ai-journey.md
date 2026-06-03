---
description: Run the AI Journey — drive the live site as goal-directed personas (in-session, on the Max plan, no API key), verify findings, and write a report.
---

You are running the **AI Journey** — the in-session, goal-directed bot exploration of the live site. Tooling lives in `bots/journey/ai-journey.cjs` (read `bots/journey/README.md`). Personas are in `bots/personas.ts` (`AI_PERSONAS`). Prior runs: `bots/reports/`.

**Cost model:** *you* (Claude) are the judgment brain, in-session on the user's Max plan — no Anthropic API key, no separate bill. The firewall keeps it safe.

Args (optional, `$ARGUMENTS`): may name a persona (e.g. `first-home-buyer`), a target URL, or a free-text goal. If empty, run the three default `AI_PERSONAS`.

Do this:

1. **Bootstrap first (the #1 reason a fresh run "doesn't work").** A freshly-cloned container has the npm package but **not** the Playwright browser binary, so `node …ai-journey.cjs` dies at launch with *"Executable doesn't exist … run npx playwright install"*. From the repo root:
   ```bash
   [ -d node_modules ] || npm ci          # install deps if missing
   npx playwright install chromium        # idempotent — installs the browser binary
   ```
   If `npx playwright install` can't reach the CDN through a restricted network, say so and stop — the journey can't run without the browser.

2. **Target.** Default `JOURNEY_BASE=https://lambent-sawine-17c3dd.netlify.app` (the live Netlify deploy) unless the args / user give another (e.g. the Vercel URL once it's live). The harness sets `ignoreHTTPSErrors` for the sandbox TLS-MITM proxy and needs `NODE_PATH=node_modules`. Confirm the target is reachable first (`request.newContext({ignoreHTTPSErrors:true})` GET, expect 200).

3. **Run** each persona (or the one in args):
   ```bash
   NODE_PATH=node_modules JOURNEY_NAME=<name> JOURNEY_START=<path> JOURNEY_STEPS=12 \
   JOURNEY_GOAL="<the persona's goal>" JOURNEY_KEYWORDS="<comma,separated,goal,words>" \
   node bots/journey/ai-journey.cjs
   ```
   The side-effect firewall is built in: on a live/**protected** target every payment, affiliate `/go/`, lead, email and account write is **mocked** (faithful to `bots/safety/money-paths.ts`). Never disable it against a live target. For completing a multi-step form (e.g. the get-matched quiz), use `bots/journey/ai-form.cjs` with the `FORM_*` env vars instead.

4. **Read it back + judge.** Open `/tmp/journey/<name>.json` and the per-step screenshots. Walk the journey as the persona: flag confusing flows, dead-ends, broken links, missing fee/risk disclosures, anything a real user trips over.

5. **VERIFY before reporting (critical).** The sandbox network is flaky — a one-off `403`/`503`/`000` is usually transient. For every candidate finding, re-probe the route with retries (a small `request.newContext({ ignoreHTTPSErrors: true })` loop, 4–5 tries) and only call it real if the status is **consistent**. Discard transients. (The first run rejected ~6 false positives this way — don't cry wolf.)

6. **Compliance gate.** If a finding touches advice/recommendations, payments, capital-raising / securities, credit, or bank-data — **read `docs/strategy/REGULATORY-AVOID-LIST.md` first**. Those escalators are never-autonomous (Tier E): surface them, never "fix" by building or un-gating.

7. **Report + act.** Write a dated report to `bots/reports/ai-journey-<YYYY-MM-DD>.md` (plain-English: what ran, confirmed vs rejected, what's healthy). For real, unambiguous, in-scope bugs, fix per `docs/audits/MERGE_AUTHORIZATION.md` tiers and open a **draft PR**. For ambiguous / product / compliance decisions, ask the founder with `AskUserQuestion`.

8. **Summarise** to the user in plain English — the report path, key findings, and any screenshots worth surfacing via the file-send tool.

Known limitation: the link-crawler follows **links**; full multi-step form completion (`ai-form.cjs`) needs a real network — in this sandbox the TLS-MITM proxy drops the quiz's async fetches, so point `FORM_BASE` at the Vercel deploy to run a flow to a result.
