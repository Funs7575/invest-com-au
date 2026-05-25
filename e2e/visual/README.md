# Visual screenshot sweep

End-to-end screenshot collection for invest.com.au. Crawls every route as
each user type (anonymous, regular user, advisor, broker, business,
advertiser, author, admin), captures full-page screenshots at three
viewports, and emits a browsable HTML index.

> Supersedes the earlier "Chromatic regression skeleton" plan that lived
> in this README — that approach covered 14 routes × 2 viewports for
> pixel-diff CI. This is a broader, manual-trigger crawler designed for
> auditing feature coverage across every account type. The Chromatic
> idea is not gone; if pixel-diff CI is wanted later, layer it on top
> by adding `argosScreenshot(page, name)` (or Chromatic's Playwright
> mode) inside `runner.ts`.

## What gets captured

- **Routes**: every `page.tsx` under `app/**` (671 today). Dynamic
  segments (`[slug]`, `[category]`) are filled in from `fixtures.ts` —
  add new param names there as discovery surfaces them.
- **States**:
  - `anonymous` — no cookies (always available)
  - `user-individual` — logged-in regular user
  - `advisor` — advisor-portal session
  - `broker` — broker-portal session
  - `business` — business-portal session
  - `advertiser` — `/advertise` dashboard
  - `author` — content author
  - `admin` — ADMIN_EMAILS + MFA
- **Viewports**: mobile (375×812), tablet (768×1024), desktop (1440×900).

Default full sweep: 671 routes × 8 states × 3 viewports ≈ 16k screenshots.
Use `MATCH=…` to slice it down for iteration.

## Setup

One-time:

```bash
npm install
npm run e2e:install        # installs Chromium for Playwright
```

Test accounts: create one account per role you want to capture (use
Supabase admin tooling, or sign up via the site). Then **seed** an auth
state per account — this opens a headed browser and waits for you to log
in once. The session cookie is then reused on every screenshot run.

```bash
npm run screenshots:seed -- user-individual
npm run screenshots:seed -- advisor
npm run screenshots:seed -- broker
npm run screenshots:seed -- business
npm run screenshots:seed -- advertiser
npm run screenshots:seed -- author
npm run screenshots:seed -- admin   # complete MFA in the browser
```

Storage states are saved to `e2e/visual/.auth/<state>.json` (gitignored).
If a session expires, just re-run the seed command for that state.

## Running

```bash
# Full sweep (anonymous + every seeded state, every viewport)
npm run screenshots

# One state only
STATES=anonymous npm run screenshots

# Route filter (substring match)
MATCH=/advisor npm run screenshots

# Just desktop viewport, fast iteration
VIEWPORTS=desktop MATCH=/compare npm run screenshots
```

The dev server starts automatically via Playwright's `webServer` config.
If you already have `npm run dev` running on port 3000, that's reused.

## Output

```
e2e/visual/snapshots/
  YYYY-MM-DD/
    index.html                      ← open in browser to view the run
    anonymous/
      _root/
        desktop.png
        desktop.meta.json
        tablet.png
        tablet.meta.json
        mobile.png
        mobile.meta.json
      compare/
        desktop.png
        ...
    user-individual/
      ...
```

The `index.html` shows every captured route per state with thumbnails;
click a thumbnail to open the full-resolution PNG.

`meta.json` records the final URL after any redirects, the HTTP status,
and the capture timestamp — useful for auditing whether anonymous → /admin
landed on the login page (= expected) vs. 200'd through (= bug).

## What's missing from v1

- **Visual diffing.** v1 captures, doesn't diff. To enable diffs, sign
  up for [Argos CI](https://argos-ci.com) (free tier) and add
  `argosScreenshot(page, name)` calls in `runner.ts`. Argos's web UI
  shows side-by-side diffs and history; we deliberately didn't add SaaS
  in v1 to keep the loop self-contained.
- **End-to-end flow walks.** Reserved for multi-step journeys (signup →
  onboarding → dashboard, get-matched-to-advisor, advisor application).
  v1 is a route crawler only.
- **"Click every option" probe.** Right now we scroll the page to
  trigger lazy content but don't open accordions / hover menus /
  click disclosure widgets. To add: extend `runner.ts` with a probe
  step after the initial screenshot, save a second `desktop-expanded.png`.

## Adding a new state

1. Add an entry to `AUTH_STATES` in `state-registry.ts` (name, login
   URL, post-login URL pattern).
2. Run `npm run screenshots:seed -- <new-name>` to seed it.
3. Next `npm run screenshots` will include it automatically.

## Adding a fixture for a new dynamic param

If discovery logs a route like `→ /some/path/example` and the route is
actually `/some/path/[freshKey]`, add `freshKey: "real-value"` to
`PARAM_FIXTURES` in `fixtures.ts` so the bot visits a real page.

## Troubleshooting

- **"storage state missing"** — run the seed command for that state.
- **Login session expired** — re-run `screenshots:seed -- <state>`.
- **Dev server fails to start in time** — increase `webServer.timeout`
  in `playwright.config.ts`, or start `npm run dev` manually before
  the screenshot command (the config will reuse it).
- **A route crashes** — its error stack is dumped to
  `<runDir>/<state>/<slug>/error.txt`. The run continues.
