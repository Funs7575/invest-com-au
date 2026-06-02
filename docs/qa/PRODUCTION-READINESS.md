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
| A10 | **Marketplace: post a public job** `/quotes/post` → `/quotes/[slug]` | form-driver (mock+capture write) | ⬜ |
| A11 | **Marketplace: post a private brief** `/briefs/new` → `/briefs/[slug]?email=` | form-driver (mock+capture) | ⬜ |
| A12 | Browse `/quotes`, `/marketplace`, `/teams`, `/community` | site-audit + journey | 🟡 |
| A13 | **Submit broker review** `/reviews/write` (+ Q on broker page) — well-formed | form-driver (mock+capture) | ⬜ |
| A14 | **Submit advisor review** `/advisor/[slug]` — well-formed | form-driver (mock+capture) | ⬜ |
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
| **P0-3** | **LIVE-DB / STORAGE DRIFT (DB-verified).** Repo migrations NOT applied to live → (a) account-deletion **purge** cron (`redact-deleted-users`) + day-25 **reminder** cron both 500 on missing columns `pii_redacted_at` / `reminder_sent_at` → **GDPR/APP 11 erasure silently never runs**; (b) `manual_balances`, `user_documents`, `user_lists`/`user_list_items`, `investor_handoffs`, `profile_share_tokens` tables + `user-documents` & `data-exports` storage buckets missing → net-worth, vault, lists, advisor-handoff, profile-share, automated data-export all 500. | **founder / ops** | 🔴 apply migrations `20260523_account_deletion_requests_reminder`, `20260801000800_gdpr_soft_delete`, `20260525_manual_balances` (+ lists/handoff/profile-share); create 2 private buckets. Then re-verify. |

### P0-3 remediation runbook (founder / ops — ~15 min; can't be done from here safely)
All these migrations exist in `supabase/migrations/` but were never applied to **live** (Netlify deploy doesn't run migrations). Apply to the live Supabase project, then create 2 private buckets. Forward-only + idempotent (`IF NOT EXISTS`).
1. **Apply migrations** (the two GDPR ones are the legally-urgent pair):
   - `20260801000800_gdpr_soft_delete.sql` — adds `pii_redacted_at` → unblocks the deletion **purge** cron (erasure).
   - `20260523_account_deletion_requests_reminder.sql` — adds `reminder_sent_at` → unblocks the day-25 reminder cron.
   - `20260520_dv01_user_documents.sql` + `20260520_dv02_user_documents_storage.sql` — vault table + bucket.
   - `20260525_manual_balances.sql` (net-worth), `20260525_investor_handoffs.sql` (advisor handoff), `20260825160000_user_lists.sql` (lists), `20260826170000_profile_share_tokens.sql` (profile share).
2. **Create private storage buckets:** `user-documents` and `data-exports` (the latter is a documented manual step in `app/api/cron/process-data-exports/route.ts`).
3. **Verify:** `\d account_deletion_requests` shows both new columns; re-run the delete + export flows; confirm RLS enabled on each new table (the RLS-isolation CI gate covers them).
> Why not automated here: applying forward-only schema migrations to the production DB is hard-to-reverse + outside the firewall — founder/ops action by design.

### P1 — security / correctness (code-fixable; this QA branch)
| ID | Sev | Finding (file) | Status |
|---|---|---|---|
| P1-1 | high | **IDOR** `app/api/advisor-auction/route.ts` GET resolves advisor from client `?advisor_id=` without checking `user.email` → any advisor reads competitors' bids + won-leads | ⬜ fix: derive advisor from session email |
| P1-2 | high | **Admin MFA not enforced on `/api/admin/*`** (`proxy.ts` gates only `/admin` pages; `requireAdmin` checks session+allowlist, not the MFA cookie) → a session without MFA can call destructive admin APIs | ⬜ fix: assert MFA cookie in `requireAdmin` (exempt mfa/login) — *careful, test for lockout* |
| P1-3 | med | **Org team invite half-wired** `app/api/org-auth/team/invite` — inserts pending row, **no email**, and **no accept endpoint** (nothing flips pending→active / sets `user_id`) | ⬜ wire invite email + accept route |
| P1-4 | med | **Community "Report" = silent no-op** — client sets `reported=true` then POSTs an `action`/shape `/api/community/moderate` rejects (mod-gated, enum lacks `report`) | ⬜ add authed `report` → moderation queue |
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
