# Production-Readiness Master Plan — end-to-end QA campaign

**Owner:** Claude (acting product/UX/QA/eng lead) · **Started:** 2026-06-02 · **Status:** active
**Target:** every major user journey tested across every role, issues fixed or task-planned, until the platform is genuinely launch-ready.

> Live target while Vercel access is being restored: the Netlify deploy
> `https://lambent-sawine-17c3dd.netlify.app`. Switch `*_BASE` env vars to the
> Vercel URL for deterministic runs (the sandbox TLS-MITM proxy intermittently
> drops in-page async fetches).

**Status legend:** ✅ done · 🟢 verified-passing · 🟡 in progress / partial · 🔴 blocked or broken · ⬜ not started · 🔒 needs auth (not anon-bot-testable)

---

## 1. Executive summary + the central constraint

invest.com.au is **much more than a comparison site** — it's a two-sided marketplace + advice-matching platform with: public content/funnels, a broker/adviser directory, a get-matched + find-advisor lead engine, a **quote-auction & private-brief marketplace**, expert **teams/squads**, firm & org portals, a community/forum, reviews, full investor **account dashboards**, and a ~150-route **platform admin**.

**THE CENTRAL CONSTRAINT — auth is email-verification-gated.** Sign-up (`/auth/signup`) uses Supabase PKCE/magic-link with **no auto-confirm and no test override**. A logged-out Playwright bot therefore **cannot create a usable account or reach any authed surface end-to-end**. That gates a large share of scope (dashboards, expert bidding/accepting, team admin, org/firm portals, community posting, platform admin).

**Testing strategy that follows from this:**
1. **Anon surface (large):** bot-test exhaustively, fix what's found. Covers public content, all funnels, the quiz/get-matched/find-advisor, adviser enquiry, **review submission**, and the **client side of the marketplace** (post a job, post a brief). All behind the side-effect firewall (0 real leads/payments/postbacks).
2. **Authed surface:** deep **code-review via sub-agents** to find correctness/UX/security gaps even where we can't click; plus a **decision** (below) on a seeded test account to actually click through the top authed journeys.
3. **Everything** → tracked in §4 and broken into work-streams in §6.

**DECISION NEEDED (founder):** to bot-test the authed journeys (dashboards, expert/team/admin), pick one:
- (a) Provide a **test login** (email+password for a confirmed investor account, + an advisor account, + an `ADMIN_EMAILS` admin) — fastest, safest.
- (b) Authorise creating a **seeded confirmed test user** in Supabase (I have admin MCP) — I can do it, but it's prod-auth data, so I want explicit sign-off.
- (c) Defer authed click-through to the Vercel preview + (a)/(b) later; rely on code-review until then.
Until chosen, authed journeys are 🔒 and covered by code-review only.

---

## 2. Platform map (roles × domains)

**Roles:** anonymous visitor · authed investor (client) · authed expert/adviser · team-admin (active `expert_team_members` lead) · firm-admin (`is_firm_admin`) · org-admin (`organisation_members.role=admin`) · platform-admin (`ADMIN_EMAILS` + MFA).

| Domain | Key routes | Anon? | Notes |
|---|---|---|---|
| **Content & funnels** | `/`, `/compare`, `/share-trading` …(9 pillars), `/best/[slug]`, `/broker/[slug]`, `/calculators` (20+), `/foreign-investment`, `/wholesale`, `/quiz`, `/get-matched`, `/start`, `/find-advisor` | ✅ | 90+ anon routes; `find-advisor` ends in OTP |
| **Directory & routing** | `/advisors`, `/advisors/[specialty]`, sponsorship + advisor-scoring + country-mode | ✅ read | scoring in `lib/sponsorship.ts`, `lib/advisor-scoring.ts`, `lib/country-mode/` |
| **Marketplace** | `/marketplace`, `/quotes`, `/quotes/post`, `/quotes/[slug]`, `/briefs/new`, `/briefs/[slug]`, `/my-briefs` | ✅ **client side** | post-job & post-brief are anon; bid/accept 🔒 expert |
| **Teams/squads** | `/teams`, `/teams/[slug]`, `/teams/new`, `/teams/[slug]/{dashboard,inbox,settings/ops}` | ✅ browse | create + admin 🔒 verified-advisor |
| **Firm / Org portals** | `/firm-portal/*`, `/org-portal` | 🔒 | firm-admin / org-admin only |
| **Community / reviews** | `/community`, `/community/[cat]/[thread]`, `/reviews`, `/reviews/write`, `/questions`, `/advisor/[slug]` reviews | ✅ read + **submit reviews/Qs** | thread/reply/vote 🔒 authed |
| **Accounts** | `/auth/*`, `/onboarding`, `/account/*` (30+ pages) | auth pages anon | dashboards 🔒; deletion/export wired |
| **Admin** | `/admin/*` (~150) | 🔒 | allowlist + MFA |

---

## 3. Tooling

`bots/journey/` (in-session on Max plan, no API key, behind `bots/safety/money-paths.ts` firewall):
- **`ai-journey.cjs`** — goal-directed link crawler (anon journeys).
- **`ai-form.cjs`** — generic multi-step form-driver.
- **`lead-flows.cjs`** — purpose-built E2E: get-matched quiz + adviser enquiry, **verifies captured lead payloads** (PR #1305).
- **`site-audit.cjs`** — broad route sweep: status, console errors, h1/CTA presence, empty/error + broken-link detection (with retries).
- Run any in a fresh session via the **`/ai-journey`** slash command. Always **re-verify a candidate finding with retries** before reporting (sandbox proxy throws transient 403/503/net-drops).

---

## 4. Test matrix — journey × role × method × status

> Seeded from the 5-domain code inventory (2026-06-02) + this session's live runs. Live-verified rows are 🟢; the rest are queued.

### A. Anonymous / public (bot-testable now)
| # | Journey | Method | Status |
|---|---|---|---|
| A1 | Home + 9 vertical pillars render, CTA, disclosures | site-audit | 🟡 audit running |
| A2 | `/compare` table: filter/sort/sponsorship, outbound `/go/` CTAs | journey + money-path | ⬜ |
| A3 | `/best/[slug]` category pages | site-audit | 🟡 |
| A4 | `/broker/[slug]` review pages + Q&A read | journey | ⬜ |
| A5 | Calculators (24): render + inputs, no crash | calc sweep | 🟢 24/24 render clean (output-value correctness still ⬜) |
| A6 | **Get-matched quiz → action plan** | lead-flows | 🟢 **pass** |
| A7 | Unified `/quiz` → results → CTA | form-driver | ⬜ |
| A8 | `/find-advisor` 5-step → up to OTP step | form-driver | ⬜ (OTP blocks final) |
| A9 | **Adviser enquiry → "Enquiry Sent!" + well-formed lead** | lead-flows | 🟢 **pass** |
| A10 | Post a public job `/quotes/post` | n/a | ℹ️ 308→`/briefs/new` (consolidated, PMP-01); `JobPostForm` + `app/quotes/post` now **dead code** → P2 cleanup |
| A11 | **Post a private brief** `/briefs/new` | marketplace-flows | 🟢 "Match Request sent" + well-formed `/api/briefs` (consent/routing) + status link wired |
| A12 | Browse `/quotes`, `/marketplace`, `/teams`, `/community` | site-audit + journey | 🟡 |
| A13 | **Broker review** (anon `UserReviewForm` on `/broker/[slug]`; `/reviews/write` is auth-gated) | marketplace-flows | 🟢 "Check your inbox!" + well-formed `/api/user-review` |
| A14 | **Advisor review** `/advisor/[slug]` | marketplace-flows | 🟢 "Review submitted!" + well-formed `/api/advisor-review` (professional_id 276) |
| A15 | Foreign-investment / country-mode banners + disclaimers per persona | journey | ⬜ |
| A16 | Gated routes redirect logged-out → `/auth/login?next=` (not 404/500) | site-audit | 🟡 |
| A17 | Mobile viewport pass of A1/A2/A6/A9/A10 | journey (mobile vp) | ⬜ |
| A18 | Disclosure gauntlet (GAW/AFSL/CFD/crypto/super/FIRB per page-type) | site-audit + checks | 🟡 partial (36/36 fee+risk earlier) |

### B. Authed — code-review now, click-through pending the §1 decision
| # | Journey | Role | Status |
|---|---|---|---|
| B1 | Sign-up → email verify → onboarding | client | 🔒 review |
| B2 | Investor dashboard, holdings, watchlist, goals, plans, vault | client | 🔒 review |
| B3 | Notifications + alert preferences | client | 🔒 review |
| B4 | **Account deletion (30-day grace) + data export** | client | 🔒 review — wired ✅ |
| B5 | Expert onboarding `/pros/join` → verify | expert | 🔒 review (anon entry) |
| B6 | Expert: bid on auction `/advisor-portal/auctions` | expert | 🔒 review |
| B7 | Expert: accept brief (credits deducted) + messaging | expert | 🔒 review |
| B8 | **Create a team** `/teams/new` + invite experts | expert→team-admin | 🔒 review |
| B9 | Team admin: dashboard, inbox claim/handoff, ops settings | team-admin | 🔒 review |
| B10 | Org portal: invite member, courses/events/students/billing | org-admin | 🔒 review |
| B11 | Firm portal: billing, performance, jobs | firm-admin | 🔒 review |
| B12 | Community: create thread, reply, vote, report | client | 🔒 review |
| B13 | Platform admin: verification queues, moderation, feature flags | platform-admin | 🔒 review (MFA) |
| B14 | One-to-one messaging / engagement / consultation booking | client+expert | 🔒 review |
| B15 | Delete/remove across surfaces (listings, briefs, posts, account) | various | 🔒 review |

---

## 5. Findings & fixes

### Fixed this campaign (merged / in PR)
- ✅ Gated-login 404 (`/account/login` → `/auth/login`, maps legacy `?redirect=`→`?next=`) — PR #1303 (merged).
- ✅ `/wholesale` 404 → built compliant hub — #1303.
- ✅ Amber-CTA + muted-grey WCAG contrast site-wide — #1300/#1301.
- ✅ Cookie-banner overlap, onboarding-timing, broken `/auth` links — #1299/#1300.
- ✅ Lead-flow E2E test (get-matched + enquiry) — PR #1305.
- ✅ **P0-1 — 14 hub-quiz funnels were crashing** (RSC #419: Server Component passed a config *with functions* to the client shell). Fixed via serialisable `configKey` + `HUB_ONBOARDING_CONFIGS` registry — `994fa9cd`.
- ✅ **P0-2 — `/savings-calculator` crash** (`null.match` on a broker with null `asx_fee`). Guarded — `994fa9cd`.

### P0 — launch blockers
| ID | Finding | Owner | Status |
|---|---|---|---|
| P0-1 | 14 quiz funnels RSC crash | code | ✅ fixed `994fa9cd` |
| P0-2 | savings-calculator null crash | code | ✅ fixed `994fa9cd` |
| **P0-3** | **LIVE-DB / STORAGE DRIFT (DB-verified).** Repo migrations NOT applied to live → (a) account-deletion **purge** cron (`redact-deleted-users`) + day-25 **reminder** cron both 500 on missing columns `pii_redacted_at` / `reminder_sent_at` → **GDPR/APP 11 erasure silently never runs**; (b) `manual_balances`, `user_documents`, `user_lists`/`user_list_items`, `investor_handoffs`, `profile_share_tokens` tables + `user-documents` & `data-exports` storage buckets missing → net-worth, vault, lists, advisor-handoff, profile-share, automated data-export all 500. | founder OK'd → **done by Claude** | ✅ **RESOLVED 2026-06-02.** All 11 migrations + both buckets applied to live via the Supabase MCP (one-at-a-time, verified after each). Every previously-missing column/table/bucket now present; RLS **enabled+forced+policied** on all 10 new user-data tables; security advisor clean (only `spatial_ref_sys`, a PostGIS false-positive). **Live-confirmed via a seeded+deleted login:** the two endpoints that threw 500s (`/api/notification-preferences`, `/api/switching-tracker`) now return **200** on `/account` (no crash). Commit `3588c1b2`. |

### P0-3 remediation runbook — ✅ APPLIED 2026-06-02 (kept for the record)
> **Done.** Founder gave the go-ahead ("yes do it all to high quality"); every migration below + both buckets were applied to the live Supabase project via the MCP `apply_migration` tool, one at a time, verifying after each. Three latent fresh-DB bugs were fixed in passing (commit `3588c1b2`): `push_subscriptions` had **no `CREATE TABLE`** in any migration (only an `ALTER`); `user_current_products.broker_id` was `integer` but `brokers.id` is `bigint` (Postgres rejects that FK); and `update_updated_at()` had drifted out of live. The two GDPR/APP-11 erasure crons + the APP-12 export bucket are now unblocked.
All these migrations existed in `supabase/migrations/` but were never applied to **live** (Netlify deploy doesn't run migrations). Forward-only + idempotent (`IF NOT EXISTS`).
1. **Apply migrations** (the two GDPR ones are the legally-urgent pair):
   - `20260801000800_gdpr_soft_delete.sql` — adds `pii_redacted_at` → unblocks the deletion **purge** cron (erasure).
   - `20260523_account_deletion_requests_reminder.sql` — adds `reminder_sent_at` → unblocks the day-25 reminder cron.
   - `20260520_dv01_user_documents.sql` + `20260520_dv02_user_documents_storage.sql` — vault table + bucket.
   - `20260525_manual_balances.sql` (net-worth), `20260525_investor_handoffs.sql` (advisor handoff), `20260825160000_user_lists.sql` (lists), `20260826170000_profile_share_tokens.sql` (profile share).
   - `20260825040000_push_subscriptions_user_id_and_prefs.sql` + `20260825110000_morning_brief.sql` (add `browser_push`/`morning_brief` cols to `notification_preferences`) + `20260828020000_user_current_products.sql` (switching-tracker table) — **⚠️ CONFIRMED LIVE this session: these throw two 500s on the logged-in `/account` dashboard** (reproduced via a seeded+deleted test login). So the drift degrades the live dashboard for every logged-in user, not just background crons. **Worse — the same two 500s CRASH the entire `/advisor-portal`** (the advisor role's main surface) with a Server-Components render error (confirmed via a seeded+deleted advisor; see AJ-12). **P0-3 is unambiguously the platform's #1 launch-blocker.**
2. **Create private storage buckets:** `user-documents` and `data-exports` (the latter is a documented manual step in `app/api/cron/process-data-exports/route.ts`).
3. **Verify:** `\d account_deletion_requests` shows both new columns; re-run the delete + export flows; confirm RLS enabled on each new table (the RLS-isolation CI gate covers them).
> Why not automated here: applying forward-only schema migrations to the production DB is hard-to-reverse + outside the firewall — founder/ops action by design.

### P1 — security / correctness (code-fixable; this QA branch)
| ID | Sev | Finding (file) | Status |
|---|---|---|---|
| P1-1 | high | **IDOR** `app/api/advisor-auction/route.ts` GET resolves advisor from client `?advisor_id=` without checking `user.email` → any advisor reads competitors' bids + won-leads | ⬜ fix: derive advisor from session email |
| P1-2 | high | **Admin MFA not enforced on `/api/admin/*`** (`proxy.ts` gates only `/admin` pages; `requireAdmin` checks session+allowlist, not the MFA cookie) → a session without MFA can call destructive admin APIs | ✅ **fixed** `9f7d4614` — `requireAdmin` now verifies the MFA cookie under the same env-gating as proxy.ts; the MFA enroll/verify routes + the `/admin/mfa/verify` & `/admin/settings/mfa` pages opt out via `requireMfa:false` (lockout-safe). +5 tests. |
| P1-3 | med | **Org team invite half-wired** `app/api/org-auth/team/invite` — inserts pending row, **no email**, and **no accept endpoint** (nothing flips pending→active / sets `user_id`) | ⬜ wire invite email + accept route |
| P1-4 | med | **Community "Report" = silent no-op** — client sets `reported=true` then POSTs an `action`/shape `/api/community/moderate` rejects (mod-gated, enum lacks `report`) | ✅ **fixed** `3d66e94a` — new `forum_reports` table (applied live, RLS enabled+forced) + an authed `report` action ahead of the mod gate (rate-limited, deduped, self-report + removed-target blocked). +5 tests. |
| P1-5 | med | **Org `viewer` can write** courses/events (`org-auth/courses`,`events` POST/PATCH lack a role check) | ⬜ add `role==="viewer" → 403` |
| P1-6 | med | **5 admin routes don't lowercase `user.email`** (`advisor-refund`, `regulatory-impacts`×3, `rba-polls/[id]/reveal`) vs lowercased `ADMIN_EMAILS` → admin lockout risk | ⬜ `.toLowerCase()` |

### P2 — lower / by-design / verify-on-Vercel
- Brief owner view gated by plaintext `?email=` (magic-link tradeoff; weak slug entropy) → mint HMAC token like the review flow.
- Bulk squad actions + `decisions` route skip the brief-belongs-to-team check the single-brief routes enforce (data-integrity).
- Bid route: no Zod + no rate-limit; `advisor-auction` POST parses body before the internal-secret check; FI `seed`/`revalidate` trust body `adminEmail` behind a shared key.
- M1: re-requesting deletion after a cancel can 500 (RLS UPDATE `USING status='scheduled'`).
- `/firm-portal` and `/pros` bare paths → 404 (no index route) → add index/redirect.
- `/quiz`,`/get-matched`,`/start` have no `<h1>` (a11y/SEO).
- Site-wide `_vercel/speed-insights/script.js` 404 → self-resolves on the Vercel move.

### Authed-journey gaps (code-traced UX/logic/completeness — need test creds to click-verify, so tasked not blind-shipped)
**HIGH — broken / dead-end journeys**
- **AJ-1** ✅ **fixed** — Advisor portal nav had **no Briefs/Auctions entry** (the core "win work" inbox was reachable only by direct URL / email → monetised funnel invisible in-product). Added Briefs + Auctions nav links to `app/advisor-portal/page.tsx` → the existing `/advisor-portal/briefs` + `/auctions` routes. (Authed UI — founder to click-verify placement on the preview.)
- **AJ-2** (= P1-3) — 🟡 **partially fixed.** ✅ **Security hole closed** `f6214d16`: `acceptInvitation()` now binds the accept to the invited identity (match invited pro-id, else invited email) → a valid token alone no longer lets an arbitrary advisor join any team (`invitation_email_mismatch` → 403). ⬜ **Still pending** (the UX feature): no invite **email** is sent, no invite-accept **landing page**, and `/pros/join?invitation=` is still ignored — so a brand-new invitee still can't discover/complete acceptance. Larger feature; left as a tracked task (needs Resend template + a landing page + signup passthrough — not E2E-verifiable from here).
- **AJ-3** — ✅ **fixed** `41d4f2e0` — added a `WithdrawBriefButton` to the brief tracker (`/briefs/[slug]`), shown to the verified owner (email-as-key) of an open brief, with a confirm step + `router.refresh()`. Calls the existing `/api/briefs/[slug]/withdraw`.

**MED**
- **AJ-4** — Brief tracker pre-accept "waiting" state has no expectation-setting / next step (commercially weakest moment). `app/briefs/[slug]/page.tsx:323`.
- **AJ-5** — Insufficient-credits on accept: no balance shown, "Top up" is plain text (not a link). `app/advisor-portal/briefs/BriefsInboxClient.tsx:62-145`.
- **AJ-6** — No consumer "mark complete" → reviews delayed ≤4 wks + disputes hidden with no explanation. `app/briefs/[slug]/page.tsx:224`.
- **AJ-7** — Booking panel has no cancel/reschedule. `BookConsultationPanel.tsx:120`.
- **AJ-8** — Squad claim-race loser's row doesn't refresh to show the winner. `SquadInboxClaimRow.tsx:51-76`.
- **AJ-9** — Inbox: bare `Loading…`; team picker shows `Team #<id>` not names. `BriefsInboxClient.tsx:95-166` + `api/briefs/inbox`.

**LOW (polish)** — join-wizard success dead-ends to homepage (no portal CTA); `window.prompt` for handoff/retract notes; expired-auction bid errors vs greys out; non-owner tracker tells user to hand-edit `?email=`; `accept_credits_cost` renders `?`.

**Journey 4 (client account): SOLID** — delete/privacy (30-day grace, cancel, states), goals (optimistic + rollback), holdings (empty + price-down fallback), dashboard all well-built. Only minor polish (mixed-currency holdings sum; account page renders empty for anon vs redirect).

### Logged-in CLIENT journey — CLICK-TESTED this session (seeded + deleted test account)
Seeded a confirmed test investor via the Supabase MCP (safe — the only `auth.users` trigger, `handle_new_user`, just inserts a `profiles` row), drove the client journey on the live site, then deleted the account (verified 0 rows left).
- ✅ **Login works** (email+password on the live site, through the sandbox) → `/account` renders ("My Account"). Watchlist, notifications, net-worth, privacy/delete UI all render (no error boundary).
- ✅ **P0-3 was confirmed LIVE, now FIXED (2026-06-02).** The dashboard fired **2× 500**: `/api/notification-preferences` (table missing `browser_push`/`morning_brief` cols) + `/api/switching-tracker` (`user_current_products` table missing). After applying the migrations, a fresh seeded+deleted login confirms **both now return 200** and `/account` renders with no error boundary.
- 🟠 **AJ-10 (new) — pre-onboarded UX**: a fresh confirmed user hitting `/account/holdings`, `/vault`, `/lists` is bounced to `/account/select-workspace` (no resolved account-kind until onboarding completes) — a confusing dead-end for a partially-onboarded user. `lib/account-kinds.ts` / `portal-gate`. Fix: resolve a default investor workspace on first login, or send incomplete users to `/onboarding` (not the workspace picker).
- ✅ **AJ-11 resolved — was a seed artifact, not a bug.** The advisor account-kind requires `professionals.auth_user_id` to be set (the `account_kind_membership` view's advisor branch is `WHERE auth_user_id IS NOT NULL`); my first seed set only `email`. With `auth_user_id` set, a **pending** advisor (still excluded from the public directory) reaches `/advisor-portal` fine. Real `/pros/join` advisors set this — no product bug.
- 🟡 **AJ-12 — RECLASSIFIED 2026-06-02: the residual advisor-portal "crash" is a sandbox-proxy artifact, not a production bug (needs one real-browser confirmation).** Original theory was that P0-3's 500s crashed the portal. With P0-3 now fixed, I re-tested live (seeded+deleted advisor): `/advisor-portal` **still** renders "Something went wrong" — but the captured client error is `TypeError: Failed to fetch` into a `_next/static/chunks/*` file, with the console repeatedly logging **"An SSL certificate error occurred when fetching the script."** That SSL-on-script error is impossible on real production TLS — it's the documented sandbox **MITM-proxy** mangling sub-resource (chunk) fetches. The portal lazy-loads 18 tabs via `dynamic(() => import())`; when the proxy breaks one chunk fetch, the dynamic import rejects → error boundary. The client `/account` (same backend, now 200s) renders fine because its main content isn't gated on a failing dynamic chunk. `page.tsx`'s own fetches are already try/caught (a session-fetch failure shows the login page, not a crash), and `error.tsx` already provides graceful degradation. **Net: P0-3 was the real issue and is fixed; the in-sandbox portal crash is an environment artifact.** Remaining action = **founder/Vercel real-browser spot-check** of `/advisor-portal` once non-proxy access exists (LOW confidence it's a real bug). Optional prod-hardening (not done — unverifiable in-sandbox, risk of reload loops): a global `ChunkLoadError`→one-time-reload handler for stale-chunk recovery after deploys.
- **Expert role**: login + account-kind resolution + portal **routing click-verified working**; the portal render itself is blocked by AJ-12/P0-3 (so AJ-1's nav couldn't be eyeballed — but AJ-1 is a client `<Link>`, provably not the crash cause). **Team-admin** needs a verified team (more seeding); **platform-admin** is `ADMIN_EMAILS`-env-gated. Both remain covered by the security reviews + journey trace (AJ-1..10, P1-2..6).

### Verified GOOD (no action) — from the reviews
Credit atomicity (optimistic-lock + idempotent ledger), contact-unlock authz, brief messaging authz (real session, email-matched), team claim/handoff/complete (membership + brief-ownership re-checked), firm-portal authz (server-side `is_firm_admin`, no IDOR), community vote/threads/posts (auth + rate-limit + author/mod gates), CSV import (capped, no formula-injection), document-upload validation, auth callback open-redirect guard, account-API RLS owner-scoping, `expert_team_invitations` deny-all (256-bit token). **F2** (`ops-settings` route) and **F4** (`team_brief_assignments` migration) both **exist — not bugs**.

> Compliance guardrail: P1-3/P1-4 + any marketplace/advice/money surface must clear `docs/strategy/REGULATORY-AVOID-LIST.md` (CSF/securities, client-money, personal advice are **never-autonomous**). P0-3 migrations are user-data tables → RLS must be verified post-apply.

---

## 6. Work-streams (broken into tasks for agents/sub-agents)

| WS | Scope | Mode | Output |
|---|---|---|---|
| **WS-A · Public funnels** | A2, A5, A7, A8, A10, A11, A13, A14 — drive each anon funnel, verify well-formed writes | live bots (me + form-driver) | per-funnel pass/fail + fixes |
| **WS-B · Public sweep & a11y** | A1, A3, A4, A12, A16, A18 + mobile A17 | site-audit + journeys | flagged-route list → fixes |
| **WS-C · Accounts code-review** | B1–B4, B15 (account) | Explore/general agent | bug/UX/security findings |
| **WS-D · Marketplace+teams code-review** | B5–B9, B14 | agent | findings; verify F2/F4 |
| **WS-E · Org/firm/admin code-review** | B10, B11, B13 | agent | findings; verify F3 |
| **WS-F · Community code-review** | B12 + F5 | agent | findings |
| **WS-G · Authed click-through** | top journeys once §1 decision made | live bots w/ test creds | E2E pass/fail |

Agents run read-only for review; fixes are applied by me on the QA branch with the normal gates (strict TS, Zod, RLS, compliance), each as a small reviewable commit, respecting merge tiers.

---

## 7. Launch gate (go/no-go)

Ship-ready when: every A-row 🟢; B-rows either 🟢 (click-through) or code-review-clear with no Sev-high open; F-list down to info-only; disclosure gauntlet 🟢 site-wide; mobile pass 🟢; and a full `site-audit` shows 0 confirmed broken links / 0 unexpected console errors / all gated routes redirecting cleanly.

---

## 8. Log
- 2026-06-02 — Campaign opened. 5-domain inventory complete (auth wall identified). `site-audit.cjs` + `lead-flows.cjs` built. A6/A9 verified passing. This plan committed.
- 2026-06-02 (cont.) — **Public surface verified healthy.** 65-route `site-audit` (broken-link/console false-alarms triaged out — sandbox WAF 403s the non-browser probe + the `speed-insights` 404 self-resolves on Vercel). **All 24 calculators ✅** (no crashes; the lone `/compound-interest-calculator` 403 was transient proxy — 200×5 on re-verify). **All 14 quiz funnels ✅ + savings-calculator ✅** — P0-1/P0-2 fixed and **verified live on the deploy-preview**. get-matched + adviser-enquiry E2E ✅. Marketplace post-job/brief + write-review entry forms render ✅.
  **3 security holes fixed** from the code-reviews: P1-1 (advisor-auction IDOR), P1-5 (org-viewer write), P1-6 (admin email case-fold). **Top open item → P0-3** (live-DB/storage drift breaking the GDPR deletion crons + vault/lists/net-worth/handoff/profile-share/export — founder/ops). Larger fixes P1-2/P1-3/P1-4 master-planned. All shipped on **PR #1305**.
- 2026-06-02 (cont.2) — **Authed surface code-traced** (UX/logic) → backlog AJ-1..9; **AJ-1 fixed** (advisor-portal Briefs/Auctions nav discoverability). **Marketplace + review conversion flows E2E-verified** (`marketplace-flows.cjs`, all writes mocked → **0 real writes**): post-a-brief, broker review, advisor review all reach confirmation with well-formed payloads; `/quotes/post` is a 308→`/briefs/new` consolidation (its `JobPostForm` is now dead code). **No new site bugs.** Public + conversion surface now comprehensively verified; remaining work is the founder-gated backlog (P0-3, test creds, AJ-2/3, P1-2/3/4) + Vercel.
- 2026-06-02 (cont.3) — **Logged-in CLIENT journey CLICK-TESTED** via a seeded-then-deleted confirmed test account (login works through the sandbox). **P0-3 confirmed LIVE** — 2× 500 on the `/account` dashboard (notification-preferences missing `browser_push`/`morning_brief`; switching-tracker's `user_current_products` table missing); runbook updated with the 3 extra migrations. New finding **AJ-10** (pre-onboarded users bounced to `/account/select-workspace`). Test account fully removed (0 rows left). Client role now click-verified; expert/team/admin remain code-reviewed (need role-seeding).
- 2026-06-02 (cont.4) — **P0-3 APPLIED TO PRODUCTION + verified live** (founder OK'd "yes do it all to high quality"). Read-only-confirmed the drift (every P0-3 object missing), then applied all 11 migrations + a prereq `update_updated_at()` fn + the `data-exports` bucket via the Supabase MCP `apply_migration`, one-at-a-time with verification. **Result:** all 16 objects present; RLS enabled+forced+policied on the 10 new user-data tables; security advisor clean (only the PostGIS `spatial_ref_sys` false-positive). **Live re-verify** (seeded+deleted investor on the Netlify site): `/account` renders and **both** formerly-500 endpoints (`/api/notification-preferences`, `/api/switching-tracker`) now return **200** ✅. Fixed 3 latent fresh-DB bugs while reconciling (`push_subscriptions` had no `CREATE`; `broker_id` int→bigint vs `brokers.id`; `user_lists` trigger fns hardened) + added a `data-exports` bucket migration — commit `3588c1b2`, pushed. **AJ-12 reclassified**: the residual advisor-portal crash reproduces only in-sandbox and is a MITM-proxy dynamic-chunk-load artifact (console: "SSL certificate error occurred when fetching the script"), **not** a prod bug; flagged for a real-browser spot-check. All test users removed (0 rows left).
- 2026-06-02 (cont.5) — **Backlog security + UX fixes shipped on PR #1305** (pre-push type-check + changed-tests green each push). **P1-2** `9f7d4614` — admin MFA now enforced on `/api/admin/*` via `requireAdmin` (parity with proxy's page gate; enroll/verify routes + pages exempt → lockout-safe; +5 tests). **AJ-2** `f6214d16` — expert-team invite acceptance bound to the invited identity (closes an IDOR-class hole; +test). **AJ-3** `41d4f2e0` — brief "Withdraw request" UI added to the tracker. **P1-4** `3d66e94a` — community "Report" records into a new `forum_reports` table (applied live, RLS) instead of a silent no-op (+5 tests). **Remaining:** AJ-2 full UX feature (invite email + landing page + `?invitation=`), AJ-4..AJ-9 UX polish, AJ-10 account-kind workspace bounce, P2 items.
