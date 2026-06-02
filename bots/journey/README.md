# AI Journey — in-session, goal-directed bot exploration

A second bot mode alongside the deterministic page-sweep. Each persona is given
a **goal** and roams the site like a real user (goal-directed best-first crawl),
judging the experience and surfacing problems the fixed sweep can't — confusing
flows, dead-ends, and broken links discovered by *following* the UI.

## What makes it safe

Runs behind the same side-effect firewall as the rest of the fleet
(`bots/safety/money-paths.ts`). Against a live / **protected** target, every
payment, affiliate `/go/` redirect, lead, email and account write is **mocked**.
The bot looks like a real user to the page but never costs a referral, charges a
card, or writes junk data.

## Cost model

Driven **in-session by Claude on the Max plan** — Claude is the judgment brain
between browser steps (observe → decide → act → judge). No Anthropic API key, no
separate bill. (The autonomous, API-key driver in `bots/ai/` is the *other*
mode; this is the zero-extra-cost mode.)

## Run it

Easiest — **ask Claude**: "run the AI journey" (optionally name a persona or
goal). Claude drives `ai-journey.cjs`, reads back the captured journey, **verifies
candidate findings with retries**, and writes a report under `bots/reports/`.

Manual:

```bash
NODE_PATH=node_modules \
JOURNEY_NAME=first-home-buyer JOURNEY_START=/ JOURNEY_STEPS=12 \
JOURNEY_GOAL="As a beginner, compare platforms and get to opening an account." \
JOURNEY_KEYWORDS="compare,broker,platform,fees,account,get matched,best,review" \
JOURNEY_BASE="https://lambent-sawine-17c3dd.netlify.app" \
node bots/journey/ai-journey.cjs
```

Env vars: `JOURNEY_BASE` (target), `JOURNEY_START` (start path), `JOURNEY_NAME`,
`JOURNEY_GOAL`, `JOURNEY_KEYWORDS` (comma-separated, steer the walk),
`JOURNEY_STEPS` (max pages), `JOURNEY_OUT` (output dir, default `/tmp/journey`).
Outputs per-step screenshots + `<persona>.json` (observations, console errors,
failed responses, firewall interceptions).

> In this sandbox the live target sits behind a TLS-MITM proxy, so the harness
> sets `ignoreHTTPSErrors` and `NODE_PATH` must point at the repo `node_modules`.

## Personas

Defined in `bots/personas.ts` (`AI_PERSONAS`). The 2026-06-02 first run covered
`first-home-buyer`, `advice-seeker`, and `quiz-taker` — see
[`bots/reports/ai-journey-2026-06-02.md`](../reports/ai-journey-2026-06-02.md).

## Always verify before reporting

Sandbox networks are flaky: a one-off `403`/`503` is usually transient. The
driver retries navigation, and any candidate finding **must be re-checked with
retries** (a *consistent* status across several tries) before it's called a real
bug. The first run rejected ~6 false positives this way.

## Three scripts

- **`ai-journey.cjs`** — the goal-directed best-first **link crawler** (above).
- **`ai-form.cjs`** — a **generic form-driver**: completes a multi-step flow
  (answer → advance → judge). Firewall-aware (allows the feature-under-test's own
  endpoints, blocks payments / affiliate / PII-leads), stops gracefully on
  error/fallback/nav-only states. `FORM_*` env vars.
- **`lead-flows.cjs`** — launch-readiness **test #3** (the lead/revenue flows),
  purpose-built so it's reliable enough to gate a launch:
  - **get-matched quiz** — answers every `QuestionCard` (`role=radio` options
    auto-advance; multiselect/text/number use *Continue*), waits through the
    "Building your action plan" interstitial, and asserts the real result screen.
  - **adviser enquiry** — finds an adviser, fills the Contact form, submits, and
    asserts the "Enquiry Sent!" confirmation.
  - **lead capture** — enquiry/booking writes are mocked *locally* but their
    payloads are **captured and verified well-formed** (right ids + email): it
    proves a valid lead *would* be created without creating one. `LEAD_BASE` /
    `LEAD_STEPS` env vars.

## Known limitation / next step

Driving a multi-step form to a **result** is most reliable against a real network:
in this sandbox the TLS-MITM proxy intermittently drops the quiz's async fetches
(`start`/`resolve`), so a run can stall on the "Building your action plan" screen.
Point `LEAD_BASE` / `FORM_BASE` at the Vercel deploy for deterministic runs. (The
adviser-enquiry half always works here — its lead write is mocked locally.)
