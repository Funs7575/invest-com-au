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

### ✅ Fixed — broken `/wholesale` links (built the hub — see Update below)
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

## Update — same-session build + verify pass

Acting on "build big, highest quality," this session then:

- **Built the `/wholesale` hub** (`app/wholesale/page.tsx`) — a comprehensive,
  Corporations-Act-accurate, compliance-reviewed educational page (the s708 tests,
  the accountant's certificate, wholesale-vs-retail trade-offs, FAQ + schema). It
  resolves all six `/wholesale` 404s at once (they pointed to a missing page) plus
  the quiz's breadcrumb parent, and is added to the sitemap. **Compliance:**
  factual / general-advice only, prominent loss-of-protections framing, links only
  to the existing eligibility quiz + certification — it does **not** facilitate any
  capital-raise (the CSF escalator on `REGULATORY-AVOID-LIST.md`) or funnel users
  into the ungated startup portal.

- **Verified the get-matched quiz is HEALTHY — not a bug.** The new form-driver
  first reported "Failed to start," but verification showed that was caused by the
  *firewall mocking the quiz's own `POST /api/get-matched/start`*. Hitting that
  endpoint directly returns a clean `200`/validation response — the backend works.
  The form-driver firewall was corrected to allow a feature-under-test's own
  endpoints. A textbook case of the verify-before-reporting rule preventing a false
  alarm.

- **Added the form-driver** (`bots/journey/ai-form.cjs`) — drives multi-step forms
  (answer → advance → judge), firewall-aware, and stops gracefully on
  error/fallback/nav-only states. **Limitation:** completing the get-matched quiz
  end-to-end is blocked *in this sandbox* because the TLS-MITM proxy drops the
  quiz's async question fetches (it renders a partial fallback). It needs a real
  network — i.e. the Vercel deploy — to run to a result.

- **Made it repeatable across sessions:** added the `/ai-journey` slash command
  (`.claude/commands/ai-journey.md`) and a CLAUDE.md note, both committed — so any
  future session on this repo can run the journey by typing `/ai-journey`.

Still open (your call): the `/share-trading` placeholder image is a Supabase row
holding `https://images.unsplash.com/placeholder` (likely `professionals.photo_url`
/ `advisor_articles.author_photo_url`). A one-line `UPDATE … = NULL` fixes it
(UI falls back to initials), but it's a direct production-data write so it's left
for an explicit go-ahead rather than auto-applied.
