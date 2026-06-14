# Advisor Portal — redesign to smart-fintech grade

Status: **in progress** (core-first sequencing, approved 2026-06-14).
Owner: Fin. Tracking doc for the multi-PR advisor-portal uplift.

## Goal

Take `/advisor-portal` (~22 dashboard tabs + sub-pages) from "looks broken and
unpolished" to a credible, smart-fintech product: real data on the dashboard, a
discoverable way in/out, and a consistent design system — without a 22-tab
big-bang. Each phase ships as its own screenshotted PR.

## Diagnosis (verified against the live DB; advisor #273 = Kai/Nexus = `finnduns@gmail.com`)

**Looks broken — it's a code bug, not missing data.** #273 actually has 9 leads,
244 profile views, 5 bookings, 5 reviews live. They render as `0` because:

1. **`/api/advisor-dashboard` 500s.** The route builds its `Promise.all` by
   calling `createAdminClient()` **synchronously** for the `advisor_bookings`
   read; `createAdminClient()` throws when `SUPABASE_SERVICE_ROLE_KEY` is absent
   (likely on the preview/mirror env). That throw rejects the whole route → 500
   → every KPI falls back to `|| 0` and the "Some data couldn't be loaded"
   banner (`anyFetchFailed`) fires. (Rating 4.8 + Trust 60 survive because they
   come from separate endpoints — `/api/advisor-auth/session` and
   `/trust-score`.)
2. **`professional_leads` is RLS-gated on `auth.uid()`.** The portal's custom
   `advisor_session` cookie carries no Supabase JWT, so legacy-cookie sessions
   read 0 leads even when the route works. (JWT/magic-link sessions — incl. the
   founder — DO satisfy the policy.)
3. **`Stats` API contract gap.** Analytics' "Engagement Breakdown" reads
   `phoneClicks / websiteClicks / bookingClicks / articleViews /
   searchImpressions / articles` — fields `/api/advisor-dashboard` never
   returns. Declared on the `Stats` type so TS stays quiet → permanent `0`.

**Looks unpolished ("not smart fintech"):** 8+ ad-hoc sub-`xs` font sizes
(`text-[0.5rem]`…`text-[0.68rem]`); split colour system (violet/teal/emerald/
slate, inconsistent primary button); hand-rolled charts (no axes/gridlines);
widgets that vanish when empty (layout jumps); hardcoded growth claims stated as
fact ("3× more leads") — also a compliance flag.

**Navigation:** no link to `/advisor-portal` anywhere (header/footer/account
menu). Advisors reach it only by URL or magic-link; no way back to the site.

## Phases

### Phase 1 — Make it REAL (data layer)  ← current
- [ ] `/api/advisor-dashboard`: guard `createAdminClient()` (try/catch → null)
      and use `Promise.allSettled` so one failed query degrades a single card
      instead of 500-ing everything. Bookings read only when the admin client
      is available, else `[]`.
- [ ] Keep RLS-gated personal reads (leads/billing) working for JWT sessions;
      note admin-scoped fallback for legacy-cookie sessions as a follow-up.
- [ ] Fix the `Stats` contract when redesigning Analytics (Phase 4) — return the
      engagement fields (source: `advisor_metrics_daily`) or remove dead tiles.
- [ ] Diagnose the live 500 precisely. If it's a missing
      `SUPABASE_SERVICE_ROLE_KEY` on the mirror, flag (Tier D) — don't touch prod.

### Phase 2 — Navigation (in + out)
- [ ] "Advisor portal" entry in the logged-in account menu, shown when the user
      resolves to an advisor (reuse `enforcePortalKind`/session check).
- [ ] Portal → "Back to site" + breadcrumbs; group the 22 tabs into sections
      (Grow / Engage / Manage) so mobile "More…" isn't a flat 14-item scroll.

### Phase 3 — Design system (the "smart fintech" layer)
- [ ] One type scale (kills the bespoke sub-`xs` sizes); one accent + token set
      (colour/spacing/radius/shadow); shared primitives: `StatCard`, `Chart`
      (real axes/gridlines), `EmptyState` (no disappearing widgets),
      `SectionHeader`, `Pill`.
- [ ] Apply to the shell + **Dashboard** as the exemplar → founder sign-off on
      the bar before rolling wider.

### Phase 4 — Roll the system across tabs
Priority: Dashboard → Leads → Analytics → Reviews → Profile → long tail
(CPD, Feed, Case Studies, Events, Courses, Billing, Settings, Widgets, Embed
Kit, Badges, Earn, Team). Extract the inline Articles tab into its own file.

### Phase 5 — Honesty / compliance pass
- [ ] Replace hardcoded "3×"-style claims with real computed deltas or neutral
      copy. Route disclosure copy through `lib/compliance.ts`.

### Phase 6 — Reproducible seed + bots
- [ ] Idempotent seed migration keyed to slug `kai-tanaka-nexus` populating
      every portal table: leads, profile views, bookings, reviews, billing,
      leaderboard, feed posts, case studies, articles, CPD credits, a course, an
      event, badges. Ships as a migration file — **human-triggered `db push`**.
- [ ] Move the archive firm-member seed (Kai) into the active migration set so a
      fresh DB rebuild creates the demo advisor.
- [ ] Wire the portal's custom-cookie login into the screenshot `auto-login`;
      sweep every tab (`npm run screenshots STATES=advisor MATCH=/advisor-portal`)
      for before/after. Re-verify the public `/invest` + `/advisors` cards.

## Guardrails
- Migrations forward-only, idempotent, RLS-aware; **no autonomous `db push`**.
- Service-role stays scoped to the validated `advisorId` (existing booking-read
  precedent in the route); justify each use per CLAUDE.md.
- Merge per `docs/audits/MERGE_AUTHORIZATION.md` — data/RLS/API = Tier B/C.
- Each phase = its own PR, screenshotted.

## Out of scope (separate tracks)
- `/compare` `?category=` URL-flapping client bug.
- Invest migration `db push` (biodiversity $25k→$50k data fix).
- Schema drift on certifications/articles/expert-teams endpoints (logged by the
  data deep-dive) — fold into Phase 4 when those tabs are touched.
