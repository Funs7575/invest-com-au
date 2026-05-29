# 🤖 Bot fleet — AI-driven synthetic user testing

A fleet of simulated users that exercise invest-com-au's features the way real
people would, pre-launch, so we get broad QA coverage without humans. It mixes
**deterministic scripted journeys** (reliable, repeatable) with **AI-driven
explorers** (Claude picks what to click and *judges* whether pages make sense),
and runs everything behind a **safety net** that guarantees no real-world side
effects.

> Status: **Phase 0 (foundation)** — safety net, cross-cutting checks, finding
> store, report aggregation, and a deterministic smoke fleet are in place. AI
> driver, authenticated personas, deep critical-path flows, full-surface
> coverage, GitHub-issue filing and a CI workflow land in later phases (see
> [Roadmap](#roadmap)).

## Quick start

```bash
npm run bots:install          # one-time: install the chromium browser
npm run bots                  # drive a local dev server (auto-started)

# point at a deployed sandbox/staging instead of local:
BOTS_BASE_URL=https://my-preview.vercel.app npm run bots
```

The run writes a report to `bots/.runs/<runId>/report.html` (+ `findings.json`).

## Why this is safe

The whole design hinges on one rule: **a bot must never trip a real-world side
effect** — no Stripe charges, no real emails, no fraudulent affiliate clicks, no
polluted revenue data, no destroyed fixtures.

Two layers enforce it:

1. **Per-request firewall** (`safety/intercept.ts` + `safety/money-paths.ts`).
   Every same-origin request is classified and, per policy, either allowed
   through or answered with a synthetic response. The classifier is built from
   the live `app/api/**` + `app/go/**` route tree.

2. **Target class** (`config.ts`). The fleet is environment-agnostic; safety
   posture is derived from *where* it points:

   | Category | `sandbox` (local / seeded staging) | `protected` (anything else) |
   |---|---|---|
   | payment, affiliate, external-integration, destructive | **mock** | **mock** |
   | lead, email, content, account | allow (exercise for real) | **mock** |
   | ai (server-side cost-capped) | allow / mockable | allow / mockable |

   Irreversible/external effects are **always mocked**, on every target. Internal
   writes are allowed only on a disposable `sandbox` so deep flows can run
   end-to-end against throwaway data. `localhost` is auto-classified `sandbox`;
   everything else defaults to `protected`. `assertTargetAllowed` refuses a
   production host outright unless `BOTS_PROD_OVERRIDE=1`.

## What each bot checks

Cross-cutting, on every page a bot lands on:

- **console errors** + unhandled page exceptions (`checks/console.ts`)
- **first-party HTTP errors** (4xx/5xx) and request failures (`checks/network.ts`)
- **accessibility** — axe-core serious/critical WCAG violations, same config as
  `e2e/a11y.spec.ts` (`checks/a11y.ts`)
- **broken internal links** — a capped sample, fetched safely (side-effecting
  links like `/go/*` are skipped) (`checks/links.ts`)
- **dead ends** — 2xx pages that render almost nothing

Findings are deduplicated by a stable signature so the same broken thing seen by
50 bots collapses to one row with an occurrence count
(`findings/types.ts`, `findings/store.ts`), then rendered into a single report
(`findings/report.ts`).

## Cost & billing

The AI-driven bots (later phase) call the Anthropic **API**, which is billed to
whatever account owns the key — **separate from the Claude Code subscription**
used to build this. To keep bot spend attributable and bounded:

- Point `BOTS_ANTHROPIC_API_KEY` at a **dedicated key/project** so the spend
  lands on its own billing line. (Falls back to `ANTHROPIC_API_KEY` if unset.)
- Every run enforces a hard **dollar budget** (`BOTS_AI_COST_BUDGET_USD`, default
  $20) *and* a token budget (`BOTS_AI_TOKEN_BUDGET`) — whichever trips first
  stops AI for the run (`ai/cost.ts`).
- The run report shows **tokens + estimated USD** per run, so each run is
  "charge $X to the bots line".

The app's own AI endpoints are independently cost-capped server-side (V-NEW-06:
$5/IP/day, $200/day global), so even allowed AI traffic can't run away.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `BOTS_BASE_URL` | `E2E_BASE_URL` → `http://localhost:3000` | Target to drive |
| `BOTS_TARGET_CLASS` | derived from host | Force `sandbox` / `protected` |
| `BOTS_CONCURRENCY` | `4` | Parallel sessions (Playwright workers) |
| `BOTS_MAX_STEPS` | `40` | Max actions per AI session |
| `BOTS_AI_TOKEN_BUDGET` | `0` (AI off) | Hard token cap for the run |
| `BOTS_AI_COST_BUDGET_USD` | `20` | Hard dollar cap for the run |
| `BOTS_MOCK_AI` | `true` | Mock AI endpoints to save tokens |
| `BOTS_ALLOW_DESTRUCTIVE` | `false` | Permit destructive account writes on a sandbox |
| `BOTS_PROD_OVERRIDE` | `false` | Required to point at a prod host |
| `BOTS_SKIP_WEBSERVER` | — | Don't auto-start a local dev server |

## Layout

```
bots/
├── config.ts            # run config, target-class model, prod guard      [pure]
├── safety/
│   ├── money-paths.ts   # request classifier + policy                     [pure]
│   └── intercept.ts     # installs the per-request firewall on a page
├── checks/              # console / network / a11y / links collectors
├── findings/
│   ├── types.ts         # Finding model + dedupe signature                [pure]
│   ├── store.ts         # collect / dedupe / aggregate                     [pure]
│   └── report.ts        # HTML+JSON report + shard aggregation            [pure render]
├── ai/cost.ts           # token→USD ledger + budget guard                 [pure]
├── personas.ts          # persona registry
├── session.ts           # BotSession: safety + checks + findings per user
├── fleet.spec.ts        # entrypoint (one session per persona)
├── playwright.config.ts # dedicated runner config
└── global-teardown.ts   # aggregates shards → report
```

Pure modules carry no Playwright import and are unit-tested under
`__tests__/bots/` (run with the normal `npm test`). Browser-driving modules are
exercised by `npm run bots`.

## Roadmap

- **Phase 1** — deterministic critical/money-path flows (get-matched → action
  plan, advisor lead, compare → affiliate (mocked), signup/login, top
  calculators), reusing the existing auth scaffold for logged-in personas.
- **Phase 2** — AI driver: Claude observes a compact a11y-tree snapshot, picks
  the next action, and judges UX + that required financial disclosures are
  present. Budget-capped and prompt-cached.
- **Phase 3** — full-surface coverage: auto-discover all routes and let
  persona+goal-driven AI bots roam, so we cover ~220 routes without
  hand-writing specs.
- **Phase 4** — opt-in GitHub issue filing for high-severity findings (deduped),
  then a non-gating nightly CI workflow.
```
