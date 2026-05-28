# Operating-System-for-Investing — Master Build Plan

_Authored 2026-05-25 after a 6-agent deep audit of the live codebase. Sequences all 55 daily-engagement
features (DAILY_ENGAGEMENT_IDEAS.md rounds 1 + 2) into mergeable, CI-gated, fully-finished PRs._

**STATUS: PLAN ONLY — no implementation until founder gives explicit go.**

---

## 0. The single most important finding

The 6-agent audit proved that **~15 of the 55 features are already 60–90% built**. The platform shipped a large
"advisor social + gamification + CPD" wave on 2026-05-22 that the idea docs didn't account for. The work for these
is **wiring and display**, not greenfield. This roughly halves the real effort.

### Reuse map — already in the codebase (DO NOT rebuild)

| Feature (from idea docs) | Already-built asset | What's actually left |
|---|---|---|
| Follow-an-advisor | `advisor_follows` table + RLS + `professionals.follower_count` (`20260522_advisor_social.sql`) | Follow **button** UI, "Following" feed tab, follow/post **notifications** |
| Advisor quick-post composer | `FeedTab.tsx` + `/api/advisor-auth/posts` + `advisor_posts` table | Mobile polish, auto-approve verified, dedicated `/advisor-portal/post/new` |
| Advisor post reactions | `advisor_post_reactions` (unique post+user) | Already works |
| Advisor gamification (badges/leaderboard) | `advisor_badges` + `advisor_leaderboard_monthly` (`20260522_advisor_gamification.sql`) | Badge-trigger crons + portal display |
| CPD tracker | `cpd_credits` + `course_certificates` + `courses.cpd_hours` (`20260522_cpd_tracking.sql`) | Progress bar UI + compliant-badge cron |
| Trust score | `computeAdvisorTrustScore()` (`lib/advisor-trust-score.ts`, 4 dimensions) | Cache columns + nightly cron + portal progress bar |
| Advisor match score | `rankByOutcomes()` + match logic (`lib/advisor-match-ranking.ts`) | Pre-compute table + `matchPercent` on `DirectoryCard` |
| Rate board / rate history | `savings_rate_snapshots`, `broker_price_snapshots` (append-only history) | Delta cron + board page + chart component |
| Deal expiry countdown | `brokers.deal_expiry` (date) already populated | A countdown badge component only |
| Portfolio stress test | `commodity_price_snapshots` (365-day retention) | Replay engine (⚠️ needs deeper history) |
| Events / office hours base | `advisor_events` + `advisor_event_rsvps` (`20260522_advisor_events.sql`) | Office-hours = events + live Q&A table |
| RBA poll / My-List voting | `forum_votes` (per-user ±1, unique constraint) | Poll metadata table; reuse vote rows |
| Review social loop | `forum_user_profiles.reputation` + `.badge` | "helped N people" notification + surfacing |
| Morning brief | `/api/cron/personalized-digest` (weekly_digest pref) | Extend to daily + personalise + AEDT schedule |
| Share-my-profile token | `investor_handoffs` + `article_preview_tokens` (token pattern) | New `profile_share_tokens` cloning the pattern |
| Web push | `dispatchPushToUser()` + `push_subscriptions` + `notification_preferences.browser_push` | Just call it from new triggers |
| Persona card | `/api/og` route + `investor_profiles` life-event flags | New `type=persona` branch + persona mapping |
| White-label widget | 6 widget types + `EmbedBuilder.tsx` (~50%) + badge widget | Add `best-rates` widget type |

### Net-new tables required (the genuine greenfield)

`user_daily_checkins`, `user_rate_memory`, `user_term_deposits`, `user_health_scores` (or compute-on-read),
`user_lists` + `user_list_items`, `product_user_verified`, `rba_polls`, `market_events`, `ipo_offers` +
`ipo_watchlist`, `life_event_wizard_state`, `advisor_office_hours` + `office_hour_questions`,
`advisor_ideal_clients`, `profile_share_tokens`, `advisor_user_match_scores`, `invest_score_daily`,
`etf_holdings`, `etf_distributions`, `rate_verifications`, `broker_reliability_reports`, `feed_events`,
`investment_clubs` + `club_members` + `club_watchlist_items` + `club_messages`, `user_current_products`.

Plus additive columns: `professionals.trust_score_overall/_updated_at/_version`, `forum_posts.is_anonymous`.

---

## 1. Cross-cutting standards (apply to every PR)

Non-negotiable, enforced by the 25 CI gates (see CLAUDE.md):

1. **Migrations** — forward-only, idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` then `CREATE`), `BEGIN/COMMIT`
   wrapper, header comment with explicit rollback steps. Match `20260522_advisor_social.sql` exactly.
2. **RLS** — every user-data table: `ENABLE` + `FORCE ROW LEVEL SECURITY`, per-user policies scoping `auth.uid()`,
   `service_role` full-access policy. Passes the RLS-migration + RLS-isolation CI gates.
3. **Zod** — every new `app/api/*` POST/PUT/PATCH route wrapped in `withValidatedBody(Schema, …)` or consumes
   `req.json()` immediately via `Schema.safeParse`. ESLint `invest/no-unvalidated-req-json` is a commit blocker.
4. **Crons** — `requireCronAuth(req)` first line; register in `lib/cron-groups.ts`; wrap loops in the cron-run logger;
   dedup via a `*_sent_at` column or a `*_log(key)` table (mirror `investor_drip_log`).
5. **TypeScript** — strict + `noUncheckedIndexedAccess`. `arr[0]` is `T | undefined`. No build escape hatch.
6. **Tests** — mirror source path: `__tests__/lib/<x>.test.ts`, `__tests__/api/<route>.test.ts`,
   `__tests__/components/<C>.test.tsx`. Pure scoring/eval logic must be extracted to `lib/` and unit-tested
   (follow `lib/alert-thresholds.ts` precedent). Coverage thresholds are floors — don't drop them.
7. **Compliance** — general information / factual comparison / referral ONLY. Reuse `lib/compliance.ts` disclaimers.
   AI features reuse the `lib/chatbot.ts` personal-advice classifier. No personal advice, no money movement, no
   bank-data ingestion. Passes the AI factual-filter + compliance-disclosure CI gates.
8. **ISR** — content pages `export const revalidate = N`. Per-user pages `dynamic = "force-dynamic"`.
9. **Commits** — Conventional Commits; one-line subject; body explains *why*. Each PR = one coherent feature.

**Definition of Done (every PR):** migration applied + reversible · RLS verified · Zod on all writes · pure logic
unit-tested · component renders in `npm run dev` and clicked through · `npm run type-check` clean ·
`npm test -- <changed>` green · all 25 CI gates green · feature works end-to-end (not just compiles).

---

## 2. Merge-tier classification (per docs/audits/MERGE_AUTHORIZATION.md)

| Tier | Applies to | Action |
|---|---|---|
| **A** | Pure UI/content on existing data, page additions, tests | Merge on CI green |
| **B** | New user-data tables w/ RLS passing isolation gate, additive API | Merge + 15-min observation |
| **C** | New crons, anything touching compliance copy, AI/chatbot, widgets (public CORS) | Announce intent in chat, merge unless STOP |
| **E** | (none in this plan) | n/a |

Most PRs here are **B** (new user-data table) or **C** (new cron). Each PR's tier is marked below.

---

## 3. The wave sequence

Ordered by (a) dependency, (b) impact-per-effort, (c) risk. Each wave is independently valuable — we can stop
after any wave with a coherent shipped increment. **Each PR is fully finished before the next starts** (founder's
"nothing half done" requirement).

### WAVE 0 — Quick wins on existing data (highest impact-per-effort)

- **PR 0.1 — Deal-expiry countdown + Rate-of-the-Day** · Tier A
  Reuse `brokers.deal_expiry`. New `<DealExpiryCountdown>` component on broker/savings/TD cards. Editorial
  `rate_of_the_day` flag (config or `site_settings`) surfaced on homepage. No new table.
  *Covers: R1#3 (partial), R2#30.*

- **PR 0.2 — Follow advisor + Following feed + notifications + feed bug fix** · Tier B
  `advisor_follows` exists. Add Follow button to `AdvisorCard` + `/advisor/[slug]`; "Following" tab on `/feed`
  (filter posts to followed); fire `notifyUser` on new follower and on followed-advisor post; maintain
  `follower_count` via trigger. **Fix the `profile_image_url` vs `photo_url` mismatch** in the feed route/FeedTab.
  *Covers: R1#1.*

- **PR 0.3 — Advisor quick-post composer + insights archive** · Tier C (touches public advisor content)
  Dedicated `/advisor-portal/post/new` mobile composer (reuse `/api/advisor-auth/posts`); auto-approve for
  `verified` advisors, moderation queue for first 3 posts of unverified. New indexed pages
  `/insights/[advisor-slug]/[post-slug]` with FAQ/Speakable schema (GEO). ISR revalidate.
  *Covers: R1#4, R1#18.*

### WAVE 1 — Rate-data surfacing (leverage snapshots, near-zero data work)

- **PR 1.1 — "What Changed Today" rate board + /rates/today** · Tier C (new cron)
  New `/api/cron/rate-change-digest` diffs latest two `savings_rate_snapshots` per product, writes a
  `rate_change_log` row on change. Homepage widget + `/rates/today` SEO page. ISR 1h.
  *Covers: R1#2.*

- **PR 1.2 — Rate-history charts on product pages** · Tier A
  `<RateHistoryChart>` (pure SVG, no deps — match `FeeImpactVisualiser` precedent) querying
  `savings_rate_snapshots` / `broker_price_snapshots`. Mount on savings/TD/broker pages.
  *Covers: R1#17.*

- **PR 1.3 — Rate memory + comeback-email personalisation** · Tier B
  New `user_rate_memory(user_id, product_kind, broker_id, last_seen_rate_bps, last_seen_at)`. On product-page
  view (server), show delta-since-last-visit line; update on view. Feed the value into a new
  `/api/cron/comeback-rate-email` (subject line carries the actual rate move).
  *Covers: R2#3, R2#26.*

- **PR 1.4 — Dividend income projection on ETF pages** · Tier A
  Slider on ETF pages: "$X invested → ~$Y/yr" from `ETF_DATA.distributionYield` + franking. Pure calc.
  *Covers: R2#29.*

### WAVE 2 — Engagement mechanics (the daily-habit core)

- **PR 2.1 — Investment habit streak** · Tier B + C (table + cron)
  New `user_daily_checkins(user_id, check_in_date UNIQUE, points, streak_count)`. Server action logs check-in
  from existing events (watchlist view, calculator use, article read, quiz, post). Header streak counter;
  streak-at-risk push via `dispatchPushToUser`. Pure streak math in `lib/streak.ts` + tests.
  *Covers: R1#6.*

- **PR 2.2 — Per-user financial health score** · Tier B + C
  `lib/user-health-score.ts` (pure, tested) → sub-scores Diversification / Cost / Risk-alignment / Engagement
  from `investor_profiles` + holdings + goals + behaviour. `/account/health` page + monthly delta email cron.
  Framed as factual scoring of user's own data (compliance-safe).
  *Covers: R1#8.*

- **PR 2.3 — Investment persona card** · Tier A
  Map `investor_profiles` flags → persona (Accumulator / FIRE-Chaser / Wealth-Protector / Cautious-Builder /
  SMSF-Architect). Extend `/api/og` with `type=persona`. Shareable card on quiz results + account.
  *Covers: R2#25.*

- **PR 2.4 — Decision inbox** · Tier A (read-only JOIN, no new table)
  `/account/decisions` aggregating open items from goals / bookmarks / watchlist / briefs / rate-memory deltas.
  *Covers: R2#4.*

- **PR 2.5 — Peer cohort widget** · Tier A
  Extend the dashboard's existing admin-aggregate benchmarking to product-discovery cohort stats
  ("investors like you are looking at…"). Anonymised, aggregate-only.
  *Covers: R1#11, R2#27 (partial).*

### WAVE 3 — Lifecycle email/cron

- **PR 3.1 — Personalised Morning Brief (8am AEDT)** · Tier C
  Extend `personalized-digest` into a daily opt-in brief: bookmarked-rate changes + followed-advisor posts +
  profile-matched article + one market fact. Dedup via `morning_brief_log`. AEDT = 21:00 UTC (DST) / 22:00 UTC.
  *Covers: R1#7.*

- **PR 3.2 — Unfinished-business weekly digest** · Tier C
  Friday cron summarising open decisions (decision-inbox data) into one email.
  *Covers: R2#27.*

- **PR 3.3 — Seasonal series: EOFY countdown + New-FY kickstart + anniversary** · Tier C
  June daily EOFY tips series; July 1 kickstart; signup-anniversary email (mirror `annual-mot` exactly).
  *Covers: R2#17, R2#18, R2#19.*

- **PR 3.4 — TD maturity reminders** · Tier B + C
  New `user_term_deposits(user_id, provider_slug, principal_cents, maturity_date)`. Cron sends 30/7/1-day
  reminders with current best rates.
  *Covers: R1#3 (remainder).*

### WAVE 4 — Community depth

- **PR 4.1 — RBA prediction poll + prediction score** · Tier B
  New `rba_polls(meeting_date, status, outcome)`; reuse `forum_votes` (`target_type='rba_poll'`) for votes.
  Reveal + accuracy leaderboard. Persistent per-user accuracy in a view.
  *Covers: R2#11, R2#28.*

- **PR 4.2 — User "My List" public shortlists** · Tier B
  New `user_lists` + `user_list_items`; public published lists, owner-write RLS; follow/clone; surface on
  category pages.
  *Covers: R2#14.*

- **PR 4.3 — Community-verified "I use this" badge** · Tier B
  New `product_user_verified(product_type, product_ref, user_id UNIQUE)`; aggregate count → badge on cards.
  *Covers: R2#15.*

- **PR 4.4 — Investment confessions + expert debate** · Tier C (moderated public content)
  Add `forum_posts.is_anonymous`; confessions render "Anonymous Investor". Debate = `post_type='debate'` +
  position metadata + community vote.
  *Covers: R2#12, R2#13.*

- **PR 4.5 — Review social loop** · Tier A
  Monthly "your review helped N people" notification; "Trusted Reviewer" badge via existing
  `forum_user_profiles.reputation`/`badge`. Surfacing only.
  *Covers: R1#19.*

### WAVE 5 — Events & calendar

- **PR 5.1 — Market events calendar + .ics export** · Tier B
  New `market_events(date, type, title, description)`; `/calendar` public page; `/api/market-events/ical`
  builds VEVENTs; pre-event push.
  *Covers: R1#16.*

- **PR 5.2 — IPO calendar → DB + notification bells** · Tier B + C
  Migrate static IPO list to `ipo_offers`; new `ipo_watchlist(user_id, ipo_id, alert_type)`; cron fires
  open/close/prospectus alerts.
  *Covers: R1#5.*

- **PR 5.3 — Advisor office hours (live text Q&A)** · Tier C
  New `advisor_office_hours` + `office_hour_questions`; Supabase Realtime channel; post-session transcript
  published to `/questions/[…]` with schema (GEO). Reuses events/RSVP patterns.
  *Covers: R1#9.*

- **PR 5.4 — Life-event wizard with saved progress** · Tier B
  New `life_event_wizard_state(user_id, life_event_id, step, form_data, updated_at)`; multi-step checklist from
  `lib/life-events.ts`; weekly progress cron.
  *Covers: R2#16.*

### WAVE 6 — Professional tools (advisor stickiness)

- **PR 6.1 — Trust-score gamification** · Tier B + C
  Cache `trust_score_overall/_updated_at/_version` on `professionals`; nightly recompute cron; portal progress
  bar + tier badges (Starter→Elite via existing `advisor_badges`). Compliance: factual, methodology-linked.
  *Covers: R1#20.*

- **PR 6.2 — Advisor match score shown to users** · Tier B + C
  New `advisor_user_match_scores` (pre-computed weekly cron) using `rankByOutcomes`. `matchPercent` badge on
  `DirectoryCard`. Compliance label: "factual compatibility, not a suitability recommendation".
  *Covers: R1#15.*

- **PR 6.3 — Advisor ideal-client profile builder** · Tier B
  New `advisor_ideal_clients(professional_id, criteria JSONB)`; matcher boost; "good fit for your profile" hint.
  *Covers: R2#20.*

- **PR 6.4 — CPD hour tracker** · Tier A + C
  Portal progress bar from `SUM(cpd_credits.hours_earned WHERE cpd_year=current)` vs 40h; `cpd_compliant` badge
  cron. Renewal reminder.
  *Covers: R2#22.*

- **PR 6.5 — Firm performance dashboard** · Tier B
  `/firm-portal/performance` from `advisor_metrics_daily` + `advisor_leaderboard_monthly`; weekly admin email.
  *Covers: R2#23.*

- **PR 6.6 — Share-my-profile token** · Tier B
  New `profile_share_tokens` cloning `investor_handoffs` pattern (192-bit token, expiry, consume). Read-only
  advisor view of goals/quiz/watchlist/health.
  *Covers: R2#21.*

- **PR 6.7 — White-label "best rates" widget** · Tier C (public CORS)
  New `/api/widget/best-rates?for_advisor_slug=&state=`; co-branded; add tab to `EmbedBuilder`. Reuse badge
  widget CORS + disclosure pattern.
  *Covers: R2#24.*

### WAVE 7 — AI layer (reuse chatbot infra + classifier)

- **PR 7.1 — "Explain this number" on calculators** · Tier C
  Button → Claude call (reuse `lib/chatbot.ts` provider + personal-advice classifier) returning factual
  explanation of the user's own inputs. Cost-capped via existing `lib/ai-cost-caps.ts`.
  *Covers: R2#1.*

- **PR 7.2 — AI second opinion on advisor quotes** · Tier C
  Factual fee-percentile breakdown vs comparable advisors. Strictly comparison, no recommendation.
  *Covers: R2#5.*

- **PR 7.3 — "The Invest Score" daily sentiment index** · Tier C
  New `invest_score_daily`; cron computes composite from public signals; gauge on homepage; methodology page.
  Framed as factual market-data composite, explicitly **not** a buy/sell signal.
  *Covers: R2#2.*

### WAVE 8 — Data moat (⚠️ external data-sourcing dependency — confirm before starting)

- **PR 8.1 — ETF overlap detector** · Tier A (+ data) — ⚠️ needs `etf_holdings` data source
- **PR 8.2 — Portfolio historical stress test** · Tier A — ⚠️ needs deeper `commodity_price_snapshots` history
- **PR 8.3 — Dividend calendar** · Tier B — ⚠️ needs `etf_distributions` data source
- **PR 8.4 — Crowd-sourced rate verification** · Tier B + C — new `rate_verifications` + post-application email
- **PR 8.5 — Broker reliability score** · Tier B + C — new `broker_reliability_reports` + micro-survey
  *Covers: R2#8, R2#9, R2#10, R2#6, R2#7.*

  > These depend on data we don't yet hold (ETF constituents, distribution history, more price history). Flag to
  > founder: do we license a feed (Morningstar/ASX) or seed manually? Don't start until sourcing decided.

### WAVE 9 — Platform-level (largest builds, last)

- **PR 9.1 — Unified social feed as home screen** · Tier C
  New `feed_events` stream (rate changes + followed-advisor posts + community + articles + deals); ranking fn;
  logged-in homepage infinite scroll with For-You / Markets / Community / Advisors tabs.
  *Covers: R1#14.*

- **PR 9.2 — Investment clubs** · Tier B
  New `investment_clubs` + `club_members` + `club_watchlist_items` + `club_messages`; invite flow; anonymised
  in-club benchmarking. Information-sharing only (no pooled money — compliance-safe).
  *Covers: R1#13.*

- **PR 9.3 — Persistent switching tracker** · Tier B
  New `user_current_products`; lifetime-cost vs best-in-class; annual review reminder; switching CTA.
  *Covers: R1#10, R2 switching.*

---

## 4. Compliance register (every item pre-cleared against REGULATORY-AVOID-LIST.md)

| Risk area | Items | Guardrail |
|---|---|---|
| Personal advice | Explain-this-number, AI second opinion, health score, match score | Factual / comparison only; reuse chatbot personal-advice classifier; methodology-linked; explicit "not personal advice" |
| Market signal | Invest Score, RBA poll | Factual composite of public data / opinion poll; NOT buy/sell guidance |
| Pooled investment | Investment clubs | Information-sharing only; no money movement, no custody |
| Bank-data ingestion | (avoided) | All portfolio/TD entry is manual — no CDR |
| Credit assistance | (avoided) | TD/savings are factual comparison + referral only |

No feature in this plan touches a Tier-E escalator. If any scope drifts toward advice/issuing/custody, **stop and surface.**

---

## 5. Risk register

1. **External data (Wave 8)** — ETF holdings, distributions, deeper price history not held. Decide sourcing first.
2. **Realtime (office hours, PR 5.3)** — first Supabase Realtime use here; verify CSP `connect-src` allows the WS endpoint.
3. **AI cost (Wave 7)** — gate every Claude call through `lib/ai-cost-caps.ts`; cache aggressively.
4. **Cron budget** — Vercel 40-schedule cap; new crons must slot into existing `CRON_GROUPS`, not new schedules.
5. **Feed home-screen (PR 9.1)** — ranking + infinite scroll is the biggest single build; do it last, after the event
   stream sources (follows, rate changes, community) all exist.
6. **Bundle budget** — client glossary lesson: keep heavy logic server-side; watch the 12 MB client chunk gate.

---

## 6. Suggested execution order & checkpoints

Recommended: **Waves 0 → 3 first** (the daily-habit loop: follow, rates, streak, brief — the features that
actually drive daily return). Checkpoint with founder. Then 4 → 6 (community + advisor stickiness). Then 7
(AI), confirm Wave 8 data sourcing, then 9 (platform).

Each PR: branch off `claude/amazing-lovelace-hjxdh` (or per-feature branch), open **draft** PR, CI green, then
merge per its tier. Group commits so each PR is one coherent, reviewable feature.

---

_Awaiting founder go-ahead. On approval, default to starting Wave 0 PR 0.1 unless directed otherwise._
