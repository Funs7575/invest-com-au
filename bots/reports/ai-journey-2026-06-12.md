# AI Journey — Advisor & Team Ecosystem Audit

**Date:** 2026-06-12
**Target:** `https://lambent-sawine-17c3dd.netlify.app` (Netlify preview mirror) + live DB read-only cross-checks
**Scope:** Every advisor- and team-facing surface — cold sign-up, onboarding, portal (24 tabs/sub-routes), team creation, invites, auctions/briefs, team inbox & quote builder, billing & credits, consumer→advisor match.
**Method:** In-session AI journey on the Max plan. Four harnesses driven behind the side-effect firewall (0 real writes): `ai-journey.cjs` (link crawls), `ai-form.cjs` (form driver), `lead-flows.cjs` (revenue flows), plus two purpose-built drivers added this run — `advisor-portal-flows.cjs` (mocked-session sweep of every portal tab + anonymous gate probes + mobile tap scan) and `advisor-acquisition-flows.cjs` (apply-with-photo, team-creation wizard, invite acceptance, quiz→Connect→OTP). Every candidate 4xx/5xx was re-probed 5× and only reported if consistent. Code paths and live aggregates were confirmed against the repo and Supabase (read-only).
**Firewall:** 100+ writes mocked across all runs; **0 real writes, 0 payments, 0 affiliate postbacks, 0 real leads.** Auth writes mocked.

---

## Executive summary

The advisor product is **broad but not yet activatable**: there are 24+ portal surfaces (leads CRM, analytics, auctions, briefs, teams, CPD, courses, events, badges, referrals, webhooks, KYC, tiered billing) and they are genuinely built — not "coming soon" shells — which already puts the feature surface ahead of Adviser Ratings' thin profile-claim model and in the same league as VentureWise on paper. **But a workspace-gate regression shipped 2 days ago (PR #1510) now blocks 177 of 180 active advisors (98%) from logging in at all** — the `/advisor-portal` layout calls `enforcePortalKind("advisor")`, which only accepts a Supabase session keyed to `professionals.auth_user_id`, and that column is null for almost every advisor because the admin-approval and legacy-token paths that created them never set it; the result is that the token in the approval email and the legacy session cookie are both dead, and a magic-link login lands the advisor in the investor chooser instead of their portal. Compounding the access bug, the marketplace is a **cold-start ghost town** — 0 open briefs, 3 leads in the last 30 days, and all 5 "expert teams" are seed data — so even an advisor who gets in finds empty Auctions, Briefs, and Leads tabs with no copy explaining why. The flows that *do* work end-to-end are the consumer ones (the get-matched quiz resolves and the in-funnel Connect→OTP lead capture fires a well-formed payload) and the unauthenticated halves of acquisition (the apply form submits cleanly with a valid payload incl. the required photo; the team-creation wizard validates and posts a correct body). The single biggest gap versus competitors is not features — it's that **the front door is locked and the shelves are empty**: fix advisor login, seed real demand into the marketplace, and add empty-state guidance, and this becomes a credible product; ship more features on top of a broken gate and none of them will be seen.

---

## Flow-by-flow findings

Severity key: **P0** = broken / blocks revenue · **P1** = serious friction · **P2** = polish · **P3** = nice-to-have.

### 1. Advisor cold sign-up — `/advisor-apply`
**Worked.** The 3-step form (account type → identity+photo → professional details → terms) renders fast (TTFB ~1.5s first hit, then warm), validates inline, and the **required photo upload works** (driver set a generated PNG; `POST /api/advisor-apply/photo` returned `{publicUrl}`; the final `POST /api/advisor-apply` carried a well-formed payload: `name, email, phone, type, afsl_number, registration_number, location_state, location_suburb, specialties, bio, website, fee_description, abn, account_type, photo_url, termsAccepted`). Post-submit state is correct and reassuring: *"Application Submitted! We'll review your credentials and get back to you within 48 hours. Check your email for confirmation."*
**Findings:**
- **P1 — Two divergent sign-up paths with different behaviour and different outcomes.** `/advisor-apply` → `advisor_applications` (admin-approval queue, photo required, **no auth user created**). `/advisor-signup` → `/api/advisor-signup` which *directly* creates a Supabase auth user **and** inserts an active `professionals` row with `auth_user_id` set. Same intent, two code paths, two data models, and only one of them produces a loginable account. This is the upstream cause of the P0 below. `/adviser-register`, `/for-advisors`, `/advisor-jobs`, `/advisor` also exist as separate advisor-facing entry pages.
- **P2 — No application-status visibility.** After submit there is no "track your application" surface; the advisor waits on email with no way to check state.

### 2. Onboarding wizard — `/advisor-portal/onboarding`
**Could not be exercised by a real advisor** — it sits *behind* the portal gate (see P0). The code is sound: 5 steps (Photo → Bio → Specialties → Fees → Availability), Photo/Bio/Fees/Availability gated by a quality check, Specialties seeded but skippable, "Skip" always available, auto-redirect when completeness < 40 and the `advisor-onboarding-seen` flag is unset. The component is shared between the full-page route and the dashboard modal, so field weights/save endpoints stay consistent.
**Finding:**
- **P0 (inherited)** — every onboarding entry point is gated by `enforcePortalKind`, so the wizard is unreachable for 98% of advisors. The driver hit `/advisor-portal/onboarding` and was redirected to `/auth/login` 5/5 times.

### 3. Advisor portal dashboard — `/advisor-portal` (all tabs)
**This is the headline P0.** Anonymous and freshly-authenticated advisors alike are bounced to `/auth/login` (5/5 consistent across retries). With a mocked Supabase session the SPA does render, but no real advisor can produce that session. Tab inventory (from code + mocked render), all **live, not placeholder**:

| Tab / sub-route | State | Notes |
|---|---|---|
| Dashboard | Live | Stats, recent leads, reviews, completeness checklist, onboarding nudge, leaderboard rank |
| Leads | Live | Search/filter/sort, pipeline stages, dispute window, CSV export, review-request, firm inbox (admin) |
| Analytics | Live | KPIs, funnel, engagement, article perf, source breakdown, peer benchmarks (unlock ≥3 peers) |
| CPD | Live | ASIC 40h tracker, category breakdown, certificates |
| Feed / Articles / Case Studies / Courses / Events | Live | Social + content CRUD; Courses gated on Stripe Connect payouts |
| Reviews | Live | Approve/respond to reviews with sub-ratings |
| Badges | Live | 15 badge types, earned + locked |
| Ideal Client / Profile / Profile Details | Live | Profile CRUD, services, certifications, languages, corridors |
| Billing | Live | Credit packs, payment method, ledger, featured add-on, annual prompt |
| Earn | Live | Referral code + $50/referral stats |
| Team (firm-admin only) | Live | Invite, roles, seat caps, analytics |
| Widgets / Settings | Live | Embed builder; notification + Slack + session-pricing settings |
| `/auctions` `/briefs` `/marketplace` `/kyc` `/upgrade` `/health` `/webhooks` `/teams` | Live | All render; auctions takes bids, KYC takes docs |

**Findings:**
- **P0 — Advisor portal is inaccessible to 177/180 active advisors.** `app/advisor-portal/layout.tsx` → `enforcePortalKind("advisor")` (`lib/portal-gate.ts`) runs server-side before the client page mounts. It calls `supabase.auth.getUser()` then `getKindsForUser()`, which reads the `account_kind_membership` view — defined as `professionals WHERE auth_user_id IS NOT NULL`. **Live DB: 180 active advisors, 3 with `auth_user_id` (1.7%), 0 live legacy sessions.** So: (a) unauthenticated advisor → redirect to `/auth/login`, losing any `?token=` from the approval email; (b) the legacy `?token=` verify route (`/api/advisor-auth/verify`) and the client `verifyToken()` in `page.tsx` are now unreachable because the layout redirects first; (c) the legacy `advisor_session` cookie is invisible to the gate (it only checks Supabase auth); (d) a magic-link login *does* create a Supabase session, but `getKindsForUser` returns `[]` (auth link missing), so `holdsExpected` is false and the advisor is sent to `/account/select-workspace`, which only surfaces an investor card — **a permanent dead-end into the portal.** Regression introduced 2026-06-10 in PR #1510. This blocks 100% of advisor revenue activity (leads, billing, bidding). **[Tier C — auth/gate. Needs founder decision on fix approach before shipping.]**
- **P1 — Empty-state blindness.** Even past the gate, Leads/Auctions/Briefs render against an empty marketplace (0 open briefs, 3 leads/30d) with no "why is this empty / here's how to get leads" copy. The mocked-session sweep found no `coming soon` strings (good) but also thin empty states.

### 4. Team creation — `/teams/new`
**Worked (structurally).** The 4-step wizard (Basics → Templates → Invites → Review) renders for anyone, validates, and the driver drove it to the "Submit for verification" step; `POST /api/teams/new` fired a **well-formed payload**: `{name, description, team_category, accepted_brief_templates, invites}`. Slug dedupe, creator-as-lead membership, invitation rows + emails all exist in the route.
**Findings:**
- **P1 — Fill-then-bounce: no upfront auth gate.** `/teams/new` is fully public and lets an anonymous user complete all 4 steps, but `POST /api/teams/new` requires an advisor session (returns 400/401 for anon, confirmed 5/5). A logged-out advisor invests 4 steps of effort then hits "Sign in required" at the very end. Gate the wizard (or show a sign-in step first) — and note that *because of the P0*, even logged-in advisors can't satisfy this.
- **P2 — "Pending review" with no expectation-setting.** Created squads are `verification_status='submitted', public=false, accepts_briefs=false` with no stated review SLA or what unlocks on approval.

### 5. Team invite flow — `/teams/accept-invite`
**Worked.** With the invite-lookup mocked to a fixture, the accept page renders cleanly: *"Team invitation — Join AU SMSF Property Squad"* with an Accept button. Clicking it (accept POST mocked) correctly routed an unauthenticated user to `/auth/login?next=/teams/au-smsf-property-squad/inbox`. The **invalid-token** and **no-token** paths both show a clean *"Invitation unavailable / Invalid invitation"* state — good error UX. Two-stage token + advisor-session model is sound.
**Finding:**
- **P1 (inherited)** — acceptance ultimately requires an advisor session, which 98% of advisors can't establish (P0). The invite UX itself is correct; it just terminates at the broken gate.

### 6. Bidding / auctions — `/advisor-portal/auctions` & `/advisor-portal/briefs`
**Code is complete; marketplace is empty.** Auctions page: live auction cards (type, location, budget band, time-remaining, high bid, leading flag), bid input, retract-with-reason, won-auctions and public-bids tabs. `GET /api/advisor-auction` correctly resolves the advisor from the **authenticated session** (a prior IDOR that trusted `?advisor_id=` was fixed). Briefs inbox: accept masked previews, credit deduction, 24h response-guarantee (feature-flagged), standing orders.
**Findings:**
- **P0 (inherited)** — both pages sit behind the gate; `GET /api/advisor-auction` returns 401 for anyone without a linked session (5/5).
- **P1 — No live demand.** 0 open briefs/auctions in the DB. With no seeded demand, the bidding economy can't start, and there's no copy telling an advisor "no live briefs right now — set a standing order / alert to be notified."
- **P2 — Two parallel demand objects.** `advisor_auctions` rows serve both "briefs" and "auctions" with overlapping fields (`job_title` vs `lead_type`, `budget_band` vs `budget_range`). The mental model for an advisor (bid vs accept) is not clearly separated in the UI.

### 7. Team inbox & quote builder — `/teams/[slug]/inbox` & `/teams/[slug]/quote-builder`
**Member-gated; correct redirects.** Inbox (claim/refer/snooze/complete, presence pinger, first-time tour) and quote-builder (fee structure, hours, rate, terms, timeline) both require an active membership and redirect logged-out users to `/auth/login?next=…`.
**Findings:**
- **P1 — Confusing 404 copy on quote-builder.** `/teams/[slug]/quote-builder` **without** a `?brief=` param calls `notFound()` and renders **"Team Not Found"** — but the team exists; the brief param is missing. Misleading. Should say "No brief selected" or redirect to the inbox.
- **P0/P1 (inherited)** — reachable only by linked advisors (P0) who are also active members.
- **[REGULATORY] — quote → payment.** Quote-builder today sends a *quote* (fine, lean lane). If a future step intermediates consumer→adviser payment of that quote, that is **client money + RG 246 [Tier E — never autonomous; founder + legal sign-off]** per `REGULATORY-AVOID-LIST.md` (cf. the `do-not-merge` DD-03 15% booking clip).

### 8. Billing & credits — `/advisor-portal/billing`
**Live and comprehensive.** Credit balance card, 3 credit packs (Starter $199/5, Growth $449/12, Scale $799/25), payment-method card (Stripe customer portal), ledger history, Featured Advisor add-on ($149/mo) with annual prompt, Expert Article add-on, tier upgrade/downgrade (`/advisor-portal/upgrade`, 20% annual discount). `POST /api/advisor-auth/topup` → Stripe checkout. Firewall mocked all Stripe/checkout calls; 0 real charges.
**Findings:**
- **P0 (inherited)** — unreachable behind the gate; no advisor can buy credits, so this is **directly revenue-blocking**.
- **Lean-lane OK.** Advisor→platform flat fees (credits/subscriptions/featured) are inside the lean lane (flat B2B fees), **not** an escalator. ✅
- **[REGULATORY] — session-pricing pass-through.** `SettingsTab` session pricing + 15% platform fee on consumer→adviser sessions is the **client-money / RG 246** escalator (`REGULATORY-AVOID-LIST.md` row DD-03). **[Tier E — keep flag-gated off until AFSL + legal.]** Do not un-gate.

### 9. Consumer → advisor match — `/get-matched`
**Worked end-to-end — the strongest flow on the site.** The quiz resolves through questions → "Building your action plan" interstitial → results (8 steps to result). The in-funnel **Connect** flow opened, reached the **OTP verification stage**, and the canonical lead path is wired (`/api/verify-otp/send` → `/api/verify-otp/verify` → `/api/submit-lead`). Independently, the `lead-flows.cjs` adviser-enquiry path submitted and showed "Enquiry Sent!" with a **well-formed captured payload** (`professional_id, user_name, user_email, user_phone, message, source_page, pages_visited, quiz_completed, calculator_used, qualification_data`). `/api/advisor-match` scores candidates (specialty/budget/location/outcomes), whitelists output columns (no PII leak), and rate-limits fail-open so quiz-takers aren't blocked.
**Findings:**
- **P2 — The lead an advisor receives lands in a portal they can't open.** The consumer side works; the advisor never sees the enquiry because of the P0. Email notifications (`lib/advisor-emails.ts`) still point to `/advisor-portal`, which bounces.
- **P3 — Brief-lane CTA doesn't carry plan context.** From results, "Start a brief" links to `/briefs/new` without the `plan_id`, so the brief starts cold even though `/api/get-matched/plans/[id]/to-brief` exists to pre-fill it.
- **Compliance OK** — results are framed as "find the right *type* of professional", general-advice warning present; matching is referral, not personal advice. ✅

### Cross-cutting signals
- **Accessibility:** clean. 0 broken images, 0 images-without-alt, 0 buttons-without-name across crawls; a handful of inputs-without-label (6–11) concentrated on search/newsletter widgets — **P2**.
- **SEO:** only `/auth/login` lacks a canonical (correct — it's noindexed). Portal pages carry `noindex` headers via `proxy.ts`. ✅
- **Performance:** TTFB 190–1500ms (cold advisor pages slowest); no layout-shift or perf red flags.
- **Mobile:** no horizontal overflow on any advisor screen. Tap-target scan reported ~71 sub-44px hits **but these were measured on the login wall** (the gate blocked the real tabs), and most are header/footer nav links and the "Magic Link/Password" toggles (36–37px tall). **P2** — re-scan after the gate is fixed to get true in-portal numbers; the toggle pills and small text links are the real candidates.
- **Console/network:** 0 real console errors, 0 internal 5xx across all runs (sandbox proxy noise filtered).

---

## High-level improvement plan

Grouped by theme. Each item: **Problem → Solution → Effort (S/M/L) → Impact**. Sequenced so unblocks precede the features that depend on them. Regulatory escalators flagged inline.

### Theme A — Onboarding & Access *(do first; everything depends on it)*
1. **Advisor login gate locks out 98% of advisors (P0).**
   → Make the gate self-healing: in `enforcePortalKind` (or `/auth/callback`), when an authenticated Supabase user's email matches a `professionals` row with null `auth_user_id`, link it (set `auth_user_id`) and treat the advisor kind as held. Pair with a one-off **backfill migration** linking existing `professionals.email → auth.users.email`, and a decision on the legacy `advisor_session` cookie (either honour it in the gate or sunset it deliberately). → **Effort M · Impact High.** **[REGULATORY/Tier C — auth + gate; founder picks approach + reviews before merge. Do not autonomous-merge.]**
2. **Two sign-up paths produce different account types (P1).**
   → Pick one canonical path. Recommended: keep `/advisor-apply` (admin-approval + photo + compliance record) as the front door, and have **approval** create/link the Supabase auth user + `auth_user_id` so the approval email's login link actually works. Redirect `/advisor-signup`, `/adviser-register` (as a sign-up CTA), `/for-advisors` to it. → **Effort M · Impact High.**
3. **No application-status visibility (P2).**
   → Add a lightweight "application received / under review / approved" status page keyed by email-link. → **Effort S · Impact Med.**

### Theme B — Bidding & Leads *(unblock demand before polishing supply tools)*
4. **Marketplace has no live demand (P1).**
   → Route real consumer briefs/quiz-to-brief conversions into `advisor_auctions` and **seed a credible baseline** so Auctions/Briefs aren't empty on day one; wire the get-matched brief-lane CTA to carry `plan_id` into `/api/get-matched/plans/[id]/to-brief`. → **Effort M · Impact High.**
5. **Empty Leads/Auctions/Briefs show nothing useful (P1).**
   → Add real empty states: "No live briefs in your categories right now — set a standing order / alert and we'll notify you." Reuse the standing-orders panel as the empty-state CTA. → **Effort S · Impact High.**
6. **Bid-vs-accept mental model is muddy (P2).**
   → Visually separate "auction (bid to win)" from "brief (accept at fixed credit cost)"; align the `job_title`/`lead_type` and `budget_band`/`budget_range` field naming. → **Effort M · Impact Med.** *(Lean lane: keep auctions to lead-routing only — never product trading — per REGULATORY-AVOID-LIST.)*

### Theme C — Team Features
7. **`/teams/new` fill-then-bounce (P1).**
   → Gate the wizard behind sign-in (or make step 1 a sign-in/identity step) so anonymous users aren't sent away after 4 steps. → **Effort S · Impact Med.**
8. **Quote-builder "Team Not Found" on missing `?brief=` (P1).**
   → Replace `notFound()` with "No brief selected" + link to the team inbox. → **Effort S · Impact Med.**
9. **Team verification has no SLA/expectation copy (P2).**
   → State the review timeline and what unlocks (public listing, `accepts_briefs`) on the success screen. → **Effort S · Impact Low.**

### Theme D — Dashboard & Analytics
10. **No in-product reason for empty dashboards (P1).** → First-run dashboard state that walks a new advisor from empty → first lead (complete profile → set alerts → buy starter credits). → **Effort M · Impact Med.**
11. **Benchmarks silently locked under 3 peers (P2).** → Already handled with a "notify me" CTA; add the cohort size so the advisor knows how close they are. → **Effort S · Impact Low.**

### Theme E — Consumer Matching
12. **Lead reaches an unopenable portal (P2, resolves with A1).** → No separate work once A1 lands; verify the enquiry→notification→portal loop end-to-end after the gate fix. → **Effort S · Impact High (validation).**
13. **Brief-lane loses plan context (P3).** → Carry `plan_id` on the results "Start a brief" CTA. → **Effort S · Impact Med.**

### Theme F — Trust & Conversion
14. **Inputs without labels on search/newsletter widgets (P2).** → Add `aria-label`s. → **Effort S · Impact Low.**
15. **Mobile tap targets on login toggles (P2).** → Bring "Magic Link / Password" pills and small text links to ≥44px; re-scan in-portal after A1. → **Effort S · Impact Med.**
16. **Pricing transparency for advisors (P2).** → Surface "what a lead costs / what credits buy" on `/for-advisors` *before* sign-up to reduce abandonment. → **Effort S · Impact Med.**

---

## Quick wins (P0 + sub-day fixes)

These are actionable now. The P0 itself is Tier C (auth) and needs a founder call on approach — listed first because nothing else matters until it lands.

1. **[Tier C — needs founder sign-off] Unlock advisor login.** Self-heal `auth_user_id` on authenticated email match in `enforcePortalKind`/callback + backfill migration. ~½–1 day incl. migration; **the** revenue unblock. *(Approach options in Strategic Bet 1.)*
2. **Quote-builder 404 copy.** `/teams/[slug]/quote-builder` without `?brief=` → "No brief selected" + inbox link instead of "Team Not Found". `app/teams/[slug]/quote-builder/page.tsx`. ~30 min.
3. **Gate `/teams/new` behind sign-in.** Add an auth check / sign-in step so the 4-step wizard doesn't end in a bounce. ~1–2 hrs.
4. **Empty-state copy for Leads/Auctions/Briefs.** "No live briefs in your categories — set an alert." Reuse standing-orders CTA. ~2–3 hrs.
5. **`aria-label`s on unlabelled search/newsletter inputs.** ~30 min.
6. **Carry `plan_id` on the get-matched brief-lane CTA.** ~1 hr.

*(Do **not** touch session-pricing pass-through or any consumer→adviser payment clip — those are Tier E regulatory escalators that must stay flag-gated off.)*

---

## Strategic bets (1–2 week initiatives that move acquisition, activation, retention)

**Bet 1 — "Front door that opens": one identity, one sign-up, self-healing access. *(Activation)***
Collapse the four sign-up entry points into one canonical funnel and unify advisor identity on Supabase auth. Approval (or first magic-link login) links `auth_user_id`; the gate self-heals on email match; legacy sessions are honoured or cleanly sunset; a backfill migration links the existing 177 advisors. Deliverable: any approved advisor can log in via the email link and reach their portal, first try, on any device. *Without this, every other advisor feature is invisible.* **[Tier C — auth; founder + review. The `auth_user_id` backfill is a schema-touching migration → ship the migration file in the same PR per DB Migration Rules; do not `supabase db push` autonomously.]**

**Bet 2 — "Cold-start the marketplace": real demand + guided activation. *(Acquisition + Activation)***
The supply side (180 advisors) exists; demand (0 open briefs, 3 leads/30d) does not. Drive get-matched and brief conversions into the auction/brief pool, instrument a credible baseline, and build a first-run activation path (complete profile → set lead alerts/standing orders → starter credit pack → first brief). Add empty-state guidance everywhere a tab can be empty. Deliverable: a new advisor's first session ends with alerts set and a clear path to their first lead — not three empty tabs. **Lean-lane only: lead-routing, flat B2B credit fees; no consumer→adviser money.**

**Bet 3 — "Teams that close the loop": from squad creation to a paid (B2B) outcome. *(Retention)***
The team system is the most differentiated asset versus Adviser Ratings (who have no equivalent) and is genuinely built (creation, invites, inbox, quote-builder, referrals, availability, dashboard). Make it a coherent journey: gate creation behind sign-in, set verification SLAs, route real briefs to verified squads, and make claim→quote→complete→outcome flow without dead-ends. Keep monetisation as flat B2B (team subscription / lead credits), explicitly **not** a clip of any consumer→adviser payment. Deliverable: a verified squad can receive a brief, claim it, send a quote, and record an outcome end-to-end. **[Watch the quote→payment boundary — REGULATORY Tier E if money intermediation is ever added.]**

---

## Appendix — evidence & artifacts

- **Harnesses (this repo):** `bots/journey/advisor-portal-flows.cjs` (new), `bots/journey/advisor-acquisition-flows.cjs` (new), plus `ai-journey.cjs`, `ai-form.cjs`, `lead-flows.cjs`, `marketplace-flows.cjs`.
- **JSON + screenshots:** `/tmp/journey/advisor-portal.json`, `advisor-acquisition.json`, `advisor-prospect.json`, `team-explorer.json`, `lead-flows.json` + per-step PNGs (`portal-*`, `acq-*`, `*-step-*`).
- **Firewall proof:** every run reported `realWritesReachingServer: 0`; 100+ writes mocked (web-vitals, advisor-apply, teams/new, get-matched, expert-teams/invite/accept, topup/stripe).
- **Live DB cross-checks (read-only aggregates, no PII):** 180 active advisors / 3 with `auth_user_id` / 0 live legacy sessions; 0 pending applications; 5 teams (all public+verified seed); 0 open briefs; 3 leads in 30d.
- **Re-verification (5× retries, all consistent):** anon `/advisor-portal` → `/auth/login` (5/5); `GET /api/advisor-dashboard|advisor-auction|advisor-auth/session` → 401 (5/5); `POST /api/teams/new` (anon) → 400/401 (5/5). No transients accepted.
- **Regression provenance:** `enforcePortalKind` added to `app/advisor-portal/layout.tsx` + `lib/portal-gate.ts` in PR #1510 (`59efcdef`, 2026-06-10).
- **Regulatory gate:** session-pricing pass-through and brief/booking payment clips are Tier E escalators (`docs/strategy/REGULATORY-AVOID-LIST.md`); advisor→platform flat credit fees are inside the lean lane.
- **Bot-smoke cross-check (run `2026-06-12T19-15-48-iv4ewa`, posted on PR #1573):** the deterministic fleet's `advisor-journey-ux` failure at `/auth/login?next=%2Fadvisor-portal` independently **corroborates the P0 gate finding**. Its other advisor-page "high" findings were re-probed 4× each from this session and did not reproduce — `/advisors`, `/advisors/leaderboard`, `/advisors/mortgage-brokers` all 200 with real h1s and zero console errors (the "TypeError: Failed to fetch" and render-step failures are transients/flow quirks; discarded). One nit held up: **`/find-advisor` renders with no `<h1>`** (4/4 consistent) — likely what tripped the fleet's `quiz-landing-renders` check; small real P2 (a11y/SEO polish) on an advisor-matching entry page.
