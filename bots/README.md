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

## Testing the Netlify mirror (/advisors)

The live Netlify **mirror** (`https://lambent-sawine-17c3dd.netlify.app`) is the
default remote target for ad-hoc QA. It is a `protected` target, so **every
state-mutating write is auto-mocked** by `safety/money-paths.ts` — nothing real
happens.

```bash
npm run bots:mirror      # full fleet (incl. advisor personas) against the mirror
npm run bots:advisors    # same, scoped to the advisor personas only (-g advisor)
```

Both scripts set `BOTS_BASE_URL` to the mirror and `BOTS_IGNORE_HTTPS_ERRORS=1`
(this workspace sits behind a TLS-MITM proxy). The fleet includes the
`ADVISOR_PERSONAS` (in `personas.ts`) which cover the adviser directory
(`/advisors`, `/advisors/<type>`, `/advisors/<type>/<state>`), the specialty
hubs (`/advisors/firb-specialists`, `/advisors/migration-agents`,
`/advisors/international-tax-specialists`), the `/find-advisor` entry point, and
a seeded profile (`/advisor/<slug>`).

These personas are **anonymous** (no auth). For logged-in advisor flows
(advisor-portal, lead management), seed and capture auth as described under
[AI-driven bots](#ai-driven-bots) / the authenticated-personas roadmap item —
the mirror's writes remain mocked regardless.

The run writes `bots/.runs/<runId>/report.html` (visual report), `summary.md`
(plain-English digest), and `findings.json`.

## Hands-off mode (recommended — no terminal)

You don't need to run anything yourself. A GitHub Actions workflow
(`.github/workflows/bots.yml`) runs the fleet for you:

- **One click:** repo → **Actions** tab → **Bot fleet** → **Run workflow**
  (optionally paste a URL to test).
- **Automatically:** every night on a schedule.

One-time setup: set a repo **Variable** `BOTS_TARGET_URL` to your
preview/staging URL (Settings → Secrets and variables → Actions → Variables).
Then every run:

- uploads the full visual report as a downloadable **bot-report** artifact, and
- creates/updates a single issue, **"🤖 Bot fleet — latest results"**, with a
  plain-English summary of what was found.

To turn on the AI bots in CI, add a secret `BOTS_ANTHROPIC_API_KEY` (its own
billing line) and set the `BOTS_AI_TOKEN_BUDGET` variable above 0.

## Authenticated / sandbox testing

By default the fleet roams **anonymous** routes. To exercise LOGGED-IN journeys
(account dashboard, holdings, bookmarks, save-a-plan, advisor enquiry) it uses a
dedicated test account and a captured browser session — with **zero financial
side effects** (payments, affiliate `/go/`, leads and account writes are mocked
by `safety/money-paths.ts`, on every target class).

End-to-end flow against a **disposable sandbox/staging** target (never prod):

```bash
# 0. Point at a seeded sandbox / staging deploy (or Supabase local).
#    NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY must target it.
export BOTS_BASE_URL=https://my-staging.example.com

# 1. Seed the dedicated bot account(s) — idempotent; safe to re-run.
npm run bots:seed-users        # creates test-bot-buyer@invest-test.local + profile

# 2. Capture its authenticated session (storageState) via the auto-login flow.
#    Writes e2e/visual/.auth/bot-buyer.json (gitignored).
E2E_BASE_URL=$BOTS_BASE_URL npm run screenshots:auto-login

# 3a. Full fleet in sandbox mode — authed + lifecycle personas activate.
npm run bots:sandbox

# 3b. Lifecycle flow only (faster — just the 7-step scripted journey).
npm run bots:lifecycle

# 3c. Lifecycle against the Netlify mirror (writes mocked, quiz-flow skipped).
npm run bots:lifecycle-mirror
```

How it stays safe to run *un*seeded: each authenticated persona
(`AUTHED_PERSONAS` in `personas.ts`) is **skipped** unless its storageState file
exists on disk, so a normal/CI run without seeded auth never fails on them.

Destructive account operations (delete account, document removal) stay gated
behind `BOTS_ALLOW_DESTRUCTIVE=1` *and* a `sandbox` target — leave it off unless
you're deliberately testing teardown on throwaway data.

The credentials reuse the existing test convention: the non-routable
`*.invest-test.local` domain and the shared `TEST_USER_PASSWORD`
(single source of truth in `e2e/visual/state-registry.ts`). No new secret is
introduced, and the seed script never prints the password.

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
| `BOTS_AI_TOKEN_BUDGET` | `0` (AI off) | Hard token cap for the run; > 0 enables AI bots |
| `BOTS_AI_COST_BUDGET_USD` | `20` | Hard dollar cap per AI session |
| `BOTS_ANTHROPIC_API_KEY` | — | Anthropic key for AI bots (own billing line; falls back to `ANTHROPIC_API_KEY`) |
| `BOTS_AI_MODEL` | `claude-sonnet-4-6` | Model the AI bots use |
| `BOTS_MOCK_AI` | `true` | Mock the app's own AI endpoints to save tokens |
| `BOTS_ALLOW_DESTRUCTIVE` | `false` | Permit destructive account writes on a sandbox |
| `BOTS_PROD_OVERRIDE` | `false` | Required to point at a prod host |
| `BOTS_IGNORE_HTTPS_ERRORS` | `false` | Trust a self-signed/MITM cert (TLS-intercepting sandboxes only; never for real runs) |
| `BOTS_SKIP_WEBSERVER` | — | Don't auto-start a local dev server |
| `BOTS_WEBSERVER_CMD` | `npm run dev` | Command to auto-start a local target (e.g. `npm run start` for the prod build) |

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
├── flows/
│   ├── types.ts         # FlowStep / Flow / FlowStepContext types         [pure]
│   ├── runner.ts        # executes steps, catches → finding on failure    [pure]
│   └── user-lifecycle.ts # quiz → action plan → account → advisor enquiry → notifications
├── ai/cost.ts           # token→USD ledger + budget guard                 [pure]
├── personas.ts          # persona registry (anon / AI / authenticated / lifecycle)
├── session.ts           # BotSession: safety + checks + findings per user
├── fleet.spec.ts        # entrypoint (one session per persona)
├── playwright.config.ts # dedicated runner config
└── global-teardown.ts   # aggregates shards → report
```

Pure modules carry no Playwright import and are unit-tested under
`__tests__/bots/` (run with the normal `npm test`). Browser-driving modules are
exercised by `npm run bots`.

## AI-driven bots

When enabled, AI personas (`AI_PERSONAS` in `personas.ts`) pursue a goal like a
real user — they observe the page, decide the next action, and **judge** the
experience (flagging confusing/broken UX and missing financial disclosures).
The loop is in `ai/driver.ts`; the model is wrapped in `ai/anthropic-client.ts`.

Enable it:

```bash
BOTS_AI_TOKEN_BUDGET=50000 BOTS_ANTHROPIC_API_KEY=sk-ant-... \
  BOTS_BASE_URL=https://my-preview.vercel.app npm run bots
```

Spend is bounded by a per-session dollar ledger (`BOTS_AI_COST_BUDGET_USD`) and
reported on every run. In CI, set the `BOTS_ANTHROPIC_API_KEY` secret and the
`BOTS_AI_TOKEN_BUDGET` variable.

## Status & roadmap

- ✅ **Foundation** — safety net, cross-cutting checks, findings, report.
- ✅ **Hands-off ops** — one-click/nightly workflow, plain-English report +
  rolling results issue.
- ✅ **AI driver** — observe→act→judge loop, action model, budget guard, live
  Playwright + Anthropic implementations, AI personas wired into the fleet.
- ✅ **Authenticated personas** — `AUTHED_PERSONAS` drive logged-in surfaces
  (account dashboard, holdings, bookmarks) via captured storageState; skip
  gracefully when auth is not seeded.
- ✅ **Lifecycle flow** — deterministic 7-step scripted regression:
  quiz → action plan → account surfaces → advisor enquiry → notifications
  (`bots/flows/user-lifecycle.ts`, driven by `npm run bots:lifecycle`).
- **Next** — auto-discovered full-surface coverage; opt-in per-finding GitHub
  issues; sign-up / onboarding flow.
```
