# AI Journey — first live run (2026-06-02)

Plain-English summary of the first **AI-driven** bot sweep of the live site
(`lambent-sawine-17c3dd.netlify.app`). Unlike the deterministic page-sweep, this
mode gives each bot a *goal* and lets it roam like a real person, judging the
experience and following the most goal-relevant link at each step.

## How it ran (and why it's safe)

- **3 AI personas**, each chasing a real goal across the live site:
  - `first-home-buyer` — a beginner comparing platforms to open an account (start `/`).
  - `advice-seeker` — a pre-retiree looking for a financial adviser (start `/advisors`).
  - `quiz-taker` — a visitor completing the get-matched flow (start `/get-matched`).
- **36 pages walked** in total (12 each), deep into the site.
- **Side-effect firewall on the whole time.** The live site is treated as a
  *protected* target, so every dangerous request was intercepted with a fake
  response: **48 affiliate clicks/beacons mocked, 0 real affiliate postbacks**,
  no payments, no leads, no emails, no account writes. The bots looked like real
  users to the page but never cost you a referral or created junk data.
- **Run in-session on the Claude Max plan** — no separate Anthropic API bill.

## What it found

Every candidate was **re-verified with retries** before being called a bug, to
separate real defects from flaky sandbox-network blips. That verification
**rejected ~6 false positives** (transient `403`/`503` on `/get-matched`,
`/score`, `/auth/login`, `/switching-calculator` — all return `200`
consistently on retry).

### 🔴 High — logged-out users hit a 404 instead of a login screen  ✅ FIXED
20+ gated pages (advisor `pros/`, `teams/`, `firm-portal/`, `account/`, `admin/`)
server-redirect unauthenticated visitors to **`/account/login?redirect=…`** — but
that route **does not exist anywhere in the codebase**. The real sign-in page is
`/auth/login` (which reads `?next=`). So any logged-out person who lands on a
gated page got a **"Page Not Found"** instead of being asked to log in. The
quiz-taker persona tripped over this going from `/invest/startups` → a
"Personalised Feed" link → `/account/login` → 404 dead-end.

This is a **real codebase bug** (not a Netlify quirk — the route is missing on
Vercel too). It survived because developers are always logged in — exactly the
gap pre-launch bot QA exists to close.

**Fix shipped:** two redirect rules in `next.config.ts` that send
`/account/login` → `/auth/login`, translating the legacy `?redirect=` param onto
`?next=` so the post-login bounce-back still works. Un-breaks all 20+ entry
points from any source (including old bookmarks/external links).

### 🟠 Medium — broken `/wholesale` links  (needs your call)
Six links point to **`/wholesale`**, which 404s (no such page). Found in
`app/investing-for/[occupation]/page.tsx` (5×, the "Wholesale Investor" pathway
cards) and `app/account/dashboard/page.tsx` (the HNW "Wholesale & private
markets" action). Related routes that *do* exist: `/wholesale/quiz` and
`/account/wholesale-cert`. **Decision needed:** build a proper `/wholesale` hub
page, or repoint these links to an existing page? (Not auto-fixed — the right
target is a product decision, not a guess.)

### 🟠 Medium — placeholder image on `/share-trading`
The page requests `https://images.unsplash.com/placeholder` (a literal
placeholder URL, not a real image) → **404**, so one image is broken. The string
isn't in the source, so it's almost certainly a **data value** (a Supabase row
with a placeholder image URL). **Decision/action:** find and replace the row's
image URL.

### 🔵 Low / informational — Vercel Speed Insights 404 (self-resolving)
`/_vercel/speed-insights/script.js` 404s on **every** page (console error
site-wide) because the code loads Vercel's analytics script, which doesn't exist
on Netlify. **No user-facing breakage, and it fixes itself the moment you move
back to Vercel.** Listed only so it's not mistaken for a new problem.

### ⚪ Noted, likely benign — `/api/track-event` returns 400
The live analytics endpoint returns `400` to the page's own beacons. The bot
**declined cookie consent**, so this is most likely correct privacy-gating
(events rejected without consent), not a bug. Worth a 2-minute confirm.

## What's healthy (positive signals)

- **Every one of the 36 pages returned `200` and rendered fully** (40k–279k chars).
- **Fee information on 36/36 pages; risk/advice disclaimers on 36/36** — the
  goal was to flag *missing* fee/risk disclosures; they're present site-wide.
- **48 distinct "open an account" affiliate CTAs** exercised across the journeys,
  all safely mocked — the conversion path exists and is wired everywhere.
- The advisor area (`advice-seeker`, 12 pages incl. adviser + firm profiles +
  guides) had **zero** broken links or dead-ends.

## How to re-run

The harness lives in `bots/journey/` (see its README). It's driven in-session by
Claude on your Max plan — just ask Claude to "run the AI journey" (optionally
naming a persona or a goal). No terminal, no API key, no separate bill.

## Known limitation / next step

The walker follows **links**; it does not yet *drive multi-step forms*. So the
get-matched quiz and adviser-contact forms were observed at their entry points
but not completed end-to-end. The next capability is an interactive form-driver
so a persona can actually finish the quiz and judge the resulting action plan.
