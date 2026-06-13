# Fin's Notebook

**Purpose:** persistent memory for strategic ideas, decisions, and "come back to this later" items. Survives across Claude sessions — point any new chat at this file and it picks up the thread.

**How to use:**
- New idea or decision worth remembering? Add it under the right section with today's date.
- Set a `Revisit:` date on anything you want to look at again.
- At month-end, scan the `Revisit in 1 month` and `Revisit in 2 months` sections.
- Don't delete anything — move resolved items to the bottom (`Resolved / shipped`).

**To resume in a new chat:** just say *"read docs/strategy/FIN_NOTEBOOK.md"* and Claude will load the context.

---

## Active strategic decisions log

### 2026-06-12 — Money-Machine Top 30: full-platform commercial analysis written (founder decisions pending)

Founder asked for a fresh whole-platform analysis — business model, monetisation,
marketplace economics, retention, compliance — and the top 30 highest-ROI moves.
Full report: `docs/strategy/MONEY_MACHINE_TOP30.md` (diagnosis, ranked 30 with
per-idea MVP/world-class/scores, scoring table, top-10, 90-day pre-cutover
roadmap, 12–24mo flywheel, required codebase changes).

Headline diagnosis: **the machine is built, the ignition is off** — 6 revenue
channels live, 3 finished-but-dark (advisor Pro billing flag, API billing env
vars, drips), lead pricing flat-$39 while quality/money-band scoring already
exists, 5 disconnected B2B billing silos, brief marketplace primitives
(`brief_credit_prices`, `response_guarantee`, `ai_brief_quality_scoring`) all
dark, `/invest/startups` still a live s708 tripwire. Top-10 build order: (1)
revenue activation sprint, (2) lead-pricing rate card, (3) one advisor SaaS
ladder, (4) sponsorship inventory, (5) brief liquidity engine, (6) verified
badge + embed, (7) cross-border Phase C BD, (8) priority auctions (RG 246
packet week 1), (9) Fee X-Ray, (10) s708 gate. Four legal packets (RG 246,
badge methodology, s708 D4, Fee X-Ray copy) are the critical path — send
before building. 90-day window is hard-bounded by the Oct–Dec cutover freeze.

**Revisit:** 2026-06-26 — founder verdicts on the top-10; which legal packets
went out; did the activation sprint clear (deploy target, cron bridge, Stripe
price IDs, drip flag)?

### 2026-06-12 — Capital-raising / business-funding white space mapped (founder-requested exploration)

Founder asked for a deep, creative-but-commercial exploration of capital-raising
and crowdfunding-adjacent opportunities — business funding profiles, readiness
scoring, EOI/waitlists, CSF-intermediary referrals, investor discovery — beyond
advisor matching, with pre-licence vs licensed feasibility made explicit. Full
staged strategy written: **`docs/strategy/CAPITAL_RAISING_OPPORTUNITIES.md`**
(ideas CR-01..CR-14 + Stage 1 referral economy, Stage 2 post-AFSL wholesale,
Stage 3 licensed bets).

Key grounding findings (so future sessions don't re-scope): the **pre-raise
layer is the unregulated white space** (pathway education, readiness scoring,
raise-prep professional matching, grants, provider comparison, generic intent
capture) while offer hosting/deal matching stays [E]-gated per the avoid-list;
the `/grants` hub is **live but under-monetised** (no grant-writer marketplace,
no paid alerts); `lib/verticals.ts` already types `startup`/`angel`/`wholesale`/
`business_for_sale`/`private_markets` lead queues; `startupRaisesEnabled()`
compliance gate + `WholesaleAttestationGate` already exist. Most of Stage 0 is
activation of existing rails, not greenfield. Prior NEVER rulings (#16/#17/#18,
no success fees/escrow) respected by design.

Regulatory state web-verified same day (doc §2.2/§11, counsel to confirm):
**business-introduction/matching relief is fully dead** (securities Oct 2022,
MIS remnant expired 1 Apr 2025) — no unlicensed private-offer matching model
exists; **CSF market halved in FY25** (~$33M/63 offers; Equitise in
administration; Birchal ~70%+ share and pays third-party referral fees per its
FSG); **s738ZG(6) prescribed-statement safe harbour** makes factual CSF-offer
content/alerts lawful even pre-offer (gated on legal copy sign-off);
**wholesale thresholds unchanged** (PJC Feb 2025: no indexation);
**business-purpose lending confirmed outside NCCP** (no ACL to refer it). Net:
revenue weight goes to grants + SME-debt referral + raise-prep services;
CSF/equity is the positioning + data layer.

**Pending founder (§10 of the doc):** ratify the staged corridor + avoid-list
additions (§8), greenlight Priority 1 (CR-04 grants monetisation + CR-01
Funding Pathway Finder + CR-02 /raise hub — fully lean-lane), commission the
§9 legal memo bundled with the s708 brief, set Stage-1 BD order, decide CR-05
(business-lending referrals) proceed-vs-park.

**Update (same day) — founder greenlit via /goal ("build all of this, merged,
highest quality → doc (1"); Priority 1 BUILT on PR #1564:** CR-01 Funding
Pathway Finder (`/raise/pathway-finder` — 10 questions, pure scoring engine
with regime gates + reasons/cautions, 16 tests, grants-quiz persistence
pattern, HubLeadForm into the accountant funnel), CR-02 `/raise` hub + 7
SSG pathway guides (answer-first, FAQPage JSON-LD), CR-03-lite factual CSF
platform table (no-commercial-relationship disclosure), CAPITAL_RAISING_NOTE
in lib/compliance.ts, sitemap + footer wiring. Escalator items (CR-05
lending, CR-09 raising-status, CR-11 offer alerts, Stage 2+) deliberately
NOT built per avoid-list. Remaining from Priority 1: CR-04a grant-writer
professional type + CR-04b paid grant alerts (taxonomy + Stripe-price-ID
dependent — next session).

**Revisit:** 2026-07-12 — founder verdicts on the five asks; CR-04a/b
build; first pathway-finder completion/lead numbers in PostHog.

### 2026-06-11 — Retail UX North Star: end-to-end emotional audit + "regulated delight" plan written

Founder brief: make the platform feel like Robinhood/Revolut/Coinbase for a
first-time retail investor — alive, personal, exciting — within our compliance
walls. Full audit + plan: `docs/plans/RETAIL_UX_NORTHSTAR.md` (6 parallel
surface audits + live mobile screenshot sweep of the mirror).

Core thesis locked in the doc: **"celebrate readiness, not trades"** — we're
not a broker, so the delight lane that got Robinhood in trouble (transaction
gamification) doesn't apply; celebrating research milestones (saves, compares,
learning, matches) is both ASIC-safe and differentiating. Headline audit
finding: **the delight infrastructure is already built and dark** — full
streak system live in prod (badge hidden in a dropdown), confetti/toast/
count-up CSS used once each, fee-projection + reasons engines funnel-only,
claim-on-signup wired with zero ceremony, signup page sells nothing while
holding the user's anonymous shortlist. Plan = 12 signature "Delight Map"
moments + 6 celebration primitives (~2-3 days) + 4 waves reconciled against
GET_MATCHED_SHOWCASE (G4-G9 slotted), OS_FOR_INVESTING (overlaps cross-ref'd,
several items found already shipped), COMMUNITY_MASTER_PLAN (belong-wave gated
on its Phase 0). North-star metric proposed: Weekly Decision-Ready Returners
(saved ≥1 + returned ≤7d).

**Founder greenlit same-day: "build this end to end to the highest quality."**
Build session 1 shipped Wave 1 + the cream of Wave 2/3 on PR #1558 (see the
doc's Status ledger): celebration primitives, first-save/shortlist-of-three/
streak-surfacing moments, mobile fold fixes, the compare cost-engine chip
with animated personal dollars, path-completion ceremony, signup claim
preview, and the /go/ send-off + return loop. Remaining (next sessions): D4
arrival, D5 ring, D10 delta strip, D11 reasons sheets, G4-G9 remainder,
account IA, Tier-C drips, D12 Wrapped.

### 2026-06-11 — Get Matched "showcase" upgrade greenlit (founder); root cause of "looks the same" found and fixed

The P1–P9 Decision Engine was invisible in prod for two DB reasons (PR #1543):
`get_matched_result_templates` had the legacy schema so every template lookup
fell back to generic copy, and `intent_taxonomy` was missing all 13 retail
slugs so mainstream resolves threw FK errors. Both fixed via gm06/gm07
(applied to prod + ledger-synced). Third gap: `topMatchesForRoute` only
returned brokers on route=compare, so info-only crypto/trade/grow users got a
card-less result — now lane-aware (platforms lane ⇒ broker carousel).

Founder verdict after seeing it live: engine is smart but the *intelligence is
invisible*. Greenlit the showcase roadmap — `docs/plans/GET_MATCHED_SHOWCASE.md`
(G1–G9): real analyzing moment, Investor Profile hero, dollar figures on cards
(fee projections), what-if live re-ranking, supply narrowing, roadmap-style
plan, confidence loop, AI free-text intake, stack+alerts endgame. Wave 1 =
G1+G2+G3 (result page: identity + numbers + visible reasoning, no schema).


### 2026-06-11 — /goal product-upgrade session: find-advisor elevated; Tasks 2–4 of the brief found already shipped

The five-task product brief (quiz, advisor onboarding wizard, profile
load-more/CTA, cross-border funnel, contrast sweep) was largely stale —
grep-before-scope found the wizard (OnboardingWizard + shared
profile-completeness lib), the profile reviews load-more + booking-CTA
primacy (ADV-002/ADV-011), the FIRB eligibility walkthrough, the
non-resident mortgage guide, and the homepage cross-border section all
already on main. Lesson re-confirmed: any task brief older than ~a week
must be re-grounded against the tree before scoping.

**Funnel layering (worth remembering):** /quiz and bare /find-advisor 301
to /get-matched (P8 Decision Engine); /find-advisor stays dedicated ONLY
for ?specialty=/?country= cross-border arrivals (the 1.75x premium line).
So quiz work splits: get-matched = volume funnel, find-advisor = premium
corridor funnel.

**Shipped this session (branch claude/modest-knuth-cchsde):**
- find-advisor: answer-driven "why we matched you" engine
  (lib/find-advisor/match-reasons, licence-mode-gated), overseas path
  (country picker -> corridor cookie + derived cross-border specialty —
  closes the quiz residency gap from the cross-border plan), optional
  timeline lead-quality signal (timeline_* context ids), not-sure paths
  with checkbox exclusivity, commercial-property option, PII-free resume
  storage (localStorage now answers+position only; legacy blobs with
  email/phone discarded on load), honest no-match state with pre-filtered
  browse CTA, edit-answers loop, single OTP countdown, focus management.
- resolveAdvisorTypes: commercial -> mortgage_broker+buyers_agent;
  not_sure under smsf broadens to tax_agent.
- Sitewide AA contrast: 1,892 text-slate-400 body-text instances -> 500
  via context-aware codemod (scripts/codemods/slate-400-contrast.mjs);
  icons/dark-sections/dark:/disabled: deliberately kept.

**Decision:** lead-quality timeline signal rides in the context array
(timeline_asap|weeks|research) rather than a schema change — advisors see
it in the enquiry payload; revisit a first-class column only if reporting
needs it.

### 2026-06-11 — Mega-session: launch-clean sweep (DISC A–F) + API-billing verified live-ready + cutover guardian; P1 found: cron fleet dark 19 days

Founder picked three sessions (B cutover-readiness, C polish sweep, D API
activation) from a menu; all three shipped on one branch/PR. Grounding first
(per the coordination lesson) found yesterday's 12-workstream wave mostly
**evaporated with its worktrees** — no PRs existed for the licence-gate
sweep or cutover scripts, so they were genuinely unclaimed.

**P1 ops finding (needs founder, ~2 min):** the ENTIRE 139-route cron fleet
has been dark since 2026-05-23 — zero `cron_run_log` rows in 48 h across all
job names. The #1430 Netlify bridge is merged but never enabled. Fix: set
`CRON_BRIDGE_ENABLED=true` + confirm `CRON_SECRET` in the Netlify env. The
"fee-recheck stale" queue item was a symptom of this, not a check-fees bug.
Prevention shipped: public `GET /api/health/crons` age probe + GitHub-Actions
`cron-watchdog.yml` (external scheduler — in-platform cron monitors die with
the fleet they monitor; that's how 19 days passed silently).

**Session C (launch-clean):** licence-mode rating gates completed everywhere
(~36 surfaces + central `renderStars` gate + JSON-LD builders — a
factual_only deploy is now genuinely rating-free, UI and schema); soft-404s
fixed with real 404 status on advisors/best/how-to (dynamicParams=false) and
broker/invest (metadata-level notFound), verified live; social-proof counter
honestly re-enabled (`/api/social-proof`, real 7-day distinct sessions,
hidden below 25 — stays dark until launch traffic, by design); mobile tap
targets + /compare load-more; hero stat scope-labelled. Decision: vitest now
runs in **general_advice posture** (mirrors prod env) with factual-mode
pinned by explicit module-mock tests. Decision: `app/quiz/page.tsx` NOT
deleted — still the documented reference implementation.

**Session D (API billing):** prod verified — the #1529 schema IS applied
(ledger 155721/155736/155745/155755), so the line is env-vars-away from
live. Gaps closed: monthly `requests_this_month` reset cron existed only as
a comment (built: `reset-api-monthly-usage`, monthly-1-3); `fee.changed` was
subscribable but never fired (wired into check-fees auto-approve + admin
fee-queue approve); retry cron's silent-empty-stats failure mode now throws
loudly into cron_run_log; `api_billing` kill switch added at checkout
(fail-open, automation_kill_switches). Founder path:
`docs/runbooks/api-billing-activation.md` + `npm run preflight:api-billing`
(read-only). Remaining to revenue: create 2 Stripe prices, set
`STRIPE_API_BASIC_PRICE_ID`/`STRIPE_API_PRO_PRICE_ID`, smoke checkout.

**Session B (cutover guardian):** `scripts/cutover/` — sitemap fingerprinter
(status/redirect-chain/canonical/JSON-LD/noindex per URL, deterministic
sampling, cross-host path-keyed), fingerprint differ (exit-1 on orphans /
status regressions / canonical-host drift), redirect-map checker reading
`docs/cutover/legacy-redirect-map.csv` (**the CO-01 drop-in point** — harness
live now, founder supplies the prior-host list later), plus
`cutover-guardian.yml` (weekly + dispatch, artifact baselines). Smoke-tested
live against the mirror: 8 shards parsed, 3,500 URLs discovered, sampled
pages all healthy with apex canonicals.

**Revisit:** 2026-06-18 — (1) did the founder flip the Netlify cron envs
(watchdog goes green)? (2) Stripe price IDs set → first API-billing checkout
smoke-tested? (3) consider promoting noindex-appearance to exit-1 in the
cutover differ once a real baseline exists.

### 2026-06-11 — Wave-1 mega-integration on PR #1541 (8 workstreams, quiz elevation, DISC fixes)

One PR integrates the full parallel wave: quiz not_sure paths + jargon microcopy +
attribute-driven match reasons; DISC-20260610 A/C/D/F fixes; advisor-portal
onboarding wizard + lead-cap upsell + pro-research admin CRUD + win-back cron;
rate-alert mailer engine + tokenised manage-prefs (no-login, possession-of-token
auth); calculators public API v1 (5 endpoints) + embed gating; /fees/today + /today
data-news surfaces; community Phase 1 (cross-links, QOTD, newsletter highlights);
GEO AI-crawler capture in proxy.ts; /careers demand probe; CO-stream cutover
guardian scripts.

Strategic decisions made (this session, founder gave blanket "make the best
long-term call" authorisation):

- **DISC-A direction — corrected twice, final answer is GATE the ratings**:
  first pass wrongly reverted the agent's `SHOW_RATINGS` gate on `BrokerCard`
  on a "ratings are factual" theory. The REMEDIATION_QUEUE row is explicit:
  DISC-A = wire `SHOW_RATINGS`/`SHOW_ADVISOR_RATINGS` through the surfaces
  that REMAINED un-gated (BrokerCard, DealCard, RecentlyViewed, quiz results,
  advisor cards, versus) — #1489 had already gated the compare table etc.
  Editorial star ratings are opinion (implied recommendation risk in
  factual_only mode), unlike fee/CHESS facts. Gate restored; BrokerCard test
  now mocks the flag. Lesson: **when an agent's change contradicts your memory
  of an audit item, re-read the audit item before "fixing" the agent.**
- **PR #1541 merged with a MERGE COMMIT, not squash**, deliberately breaking
  the repo's squash convention for this one PR: 19 commits across 8 independent
  workstreams — squashing would destroy per-stream blame/revert granularity,
  and a same-branch follow-up PR after a squash would re-show old diffs
  (merge-base lag) or force a Tier-E force-push. Merge commit avoids both.
  Single-stream PRs stay squash.
- **advisor-winback cron is fully wired** (cron-groups `weekly-mon-11` →
  existing vercel.json dispatch) — no founder action needed for scheduling;
  it degrades gracefully until its migration lands.
- **Bot-fleet 403 noise root-cause hypothesis**: /advisors, /articles etc.
  403 under the bot fleet but pass perf-budget single-hits on the same
  Netlify preview → almost certainly DB-backed rate limiting tripping on
  fleet concurrency, not a real outage. Backlog: give bots/ a preview-only
  bypass header so smoke reports stop drowning in false highs.

**FOUNDER ACTION REQUIRED (the only items Claude cannot do):**

1. **`supabase db push`** for the two new migrations
   (`20260611100000_rate_alert_mailer_support.sql`,
   `20260611110000_advisor_winback_sends.sql`) — plus the still-unpushed
   api-billing/consumer-webhook set from 2026-06-10. **Pre-req:** M05 shows
   425-table ledger drift → per DB Migration Rules this is Tier E until you
   run `supabase migration list` and reconcile. Until pushed: loan-rate
   alerts stay silently skipped, win-back cron falls back to
   last_notified_at stamping, API billing stays locked.
2. **Stripe env vars** `STRIPE_PRICE_ID_*` for the API billing tiers
   (calculators API v1 monetisation is code-complete behind these).
3. **CO-01/02/04** — DNS + registrar credentials for the invest.com.au
   cutover window (Oct–Dec 2026); guardian scripts are ready in
   `scripts/cutover/`.
4. **Vercel account blocked** — every commit carries a failing "Vercel —
   Account is blocked" status; previews run on Netlify. Pay/unblock or
   formally migrate; if Vercel stays dead the vercel.json cron fleet has no
   runner (cron-health doc 2026-06-06 flagged 13 dark days already).
5. **RG 246 legal sign-off** — `advisor_lead_referral_bonus` flag stays OFF
   until then (unchanged from 2026-06-10).


### 2026-06-10 — Advisor ecosystem social layer shipped (7 workstreams, 1 migration)

Built on `claude/confident-feynman-qdq82c` (plan: `docs/plans/ADVISOR_ECOSYSTEM_BUILD.md`).
Audit-first scope — half the original wishlist already existed (public /feed,
insights permalinks, leaderboard page + cron, squad inbox), so the build elevated
real gaps instead of rebuilding: ideal-client criteria now public on profiles;
feed got reactions-for-everyone + pagination + advice banner; team pages got
story/case-studies/ratings; squads got private per-brief comment threads;
articles got co-author dual bylines; leads got advisor→advisor referrals;
leaderboard got community-contribution signals.

Strategic decisions made (this session):

- **Advisor→advisor lead referrals are lean-lane**: receiver gets the lead FREE
  (adoption over short-term revenue — referral volume is engagement + future
  monetisation data); referrer bonus is a flat platform credit via the existing
  `referral_payout` kind. **Bonus crediting is flag-gated OFF**
  (`advisor_lead_referral_bonus`) until founder + legal sign-off per
  REGULATORY-AVOID-LIST (RG 246: flat fee, never %-of-advice-fee).
- **No pre-publish hold on advisor posts** — kept the existing "no hidden-hold
  queue for professional accounts" posture; first-3-posts get a post-publish
  admin review email instead.
- **Dropped team contact_email** from team pages — a free email bypass around
  the monetised brief flow is commercially negative; the brief CTA stays the
  single contact path.
- **No reputation_events table** — leaderboard signals computed directly from
  source tables in the cron; revisit a dedicated accrual table only if badges
  (Phase 3 community plan) need per-event history.
- **`supabase db push` for `20260610120000_advisor_ecosystem_social_layer.sql`
  is founder-triggered** (3 new tables + team_story + 3 leaderboard columns,
  all RLS-enabled). All shipped code fails soft until applied — nothing breaks
  if the push waits.
### 2026-06-10 — Quiz elevation (Task-1 brief) shipped in 4 waves; booking-CTA primacy changes funnel economics

Four merged PRs (#1530, #1534, #1536, #1537 pending CI) close the find-advisor
quiz brief's acceptance criteria against the post-#434 engine:
- **Goal-driven cross-border corridors** — India/China/HK/Singapore/UAE →AU
  journeys now hit first-class specialty matching (SIV / investor-visa /
  international-tax) instead of the generic intl pool; the passport-driven
  corridors (UK pension, US FATCA/PFIC, DASP) are unchanged.
- **"Not sure" is a valid path on every judgment question** (experience /
  complexity / amount / priority), degrading to a neutral no-signal.
- **stage=ready / under-contract is now an urgency signal**: fast responders
  get a small scoring bonus; explicitly-closed books damp harder. Get-matched
  lanes unaffected (stage optional in context).
- **Booking-CTA primacy** (strategic): when an advisor publishes a
  `booking_link`, "Book a call" is the primary CTA on the matched screen and
  the introduction-request becomes secondary. This trades a captured lead row
  for a direct calendar booking on a fraction of matches — by design per the
  product brief (conversion > capture). `advisor_booking_click` (source
  `quiz_match`) tracks the volume; revisit if booking clicks materially
  cannibalise `/api/advisor-lead` volume without producing engagements.
- Audit also confirmed already-met criteria (no PII in quiz localStorage,
  7-day TTL resume, closest-match fallbacks, focus-based a11y announcements)
  — don't re-scope these from older briefs.

### 2026-06-10 — Decision Engine COMPLETE: P1–P9 all merged; /find-advisor folded; engine now learns from outcomes

The 9-phase program from the same-day "vision locked" entry below is fully
on main (final PR #1524, squash da0c9db). One engine end-to-end: translator
→ single-lead allocation → shared advisor scoring (P1–P2); user-named type
always wins + missing-signal questions (P3); listings scorer with CSF
exclusion + FIRB gate (P4); multi-lane composite results + My Options
workspace + saved_items (P5); in-funnel lead capture with OTP at confirm +
single-lead UI lockout (P6); side-by-side advisor comparison (P7a); P8 —
this CLOSES the "Revisit: 301 /find-advisor only after get-matched gains
lead capture" item below: /find-advisor now 308s to /get-matched, with
?specialty= / ?country= deep-links carved out so the 1.75× cross-border
corridor keeps its wizard until get-matched consumes those params; P9 —
advisor ordering now blends engine fit with real engagement history via the
shared Wilson ranker (fail-soft; fed by the /plans/[id]/connected stamp).

Live state: advisor_match_v2_get_matched at 100%, prod schema applied
(ledger 3⇄3, first persisted plan verified). **Sole live-path blocker is
founder-side: restore a deploy target (Netlify credits or Vercel unblock)
— everything queues at HEAD until then.**

Open engineering backlog (post-program, none block launch): listings lane
renders lane-level links, not the P4 scorer's specific listing cards —
that resolve/UI wiring is the last gap vs the vision statement; get-matched
consuming ?specialty=/?country= (then the wizard folds entirely and the
~40 hardcoded /find-advisor literals can be repointed); P5 saved-criteria
alerts.

**Revisit:** 2026-06-17 — deploy restored? Founder device/visual pass on
the new result surface. **Revisit:** 2026-09-10 — P9 ranking-weight review
once professional_leads/connected has ~3 months of real outcome rows.

### 2026-06-10 — Branch estate audited: 291 dead branches deleted, 4 held platforms inventoried, api-billing schema gap found

Full audit of the ~335-branch estate (founder-requested). Permanent record with
method, SHA recovery manifest and per-branch dispositions:
`docs/audits/BRANCH_CLEANUP_2026-06-10.md` (PR #1527).

Strategic items surfaced (decisions pending, founder-owned):

- **API billing is half-shipped.** #1241/#1244 merged code for the tiered/billed
  API + consumer webhooks, but the schema never reached prod — `/api/v1/webhooks`
  errors on use and the 30-min retry cron fails silently every run. Schema
  recovered in **#1529 (merged)**; activate by running `supabase db push` locally.
  Next: set `STRIPE_PRICE_ID_*` env vars and flip the billing feature flag to
  open the revenue line. (Revenue backlog: "API data platform" monetisation.)
- **Identity-platform expansion** (81 files, 25 staged migrations, master plan
  docs) sits unmerged on `claude/audit-account-architecture-7186H`; the
  `principals` foundation is already in prod. Biggest held bet in the estate.
- **Advisor-community wave** (CPD, courses, endorsements, gamification, orgs —
  2026-05-22) held on `rescue/seo-infra-wave2` + `claude/inspiring-planck-c7u3s`.
- **Sharesight portfolio sync** fully built, never merged
  (`pre-launch/sharesight-oauth-*`) — needs partner API keys + product call.
- Live taxonomy fork fixed + 69 orphaned test files (~950 tests) rescued in
  **#1525**. The guard test that would have prevented the fork sat unmerged
  since 2026-04-26 — same lesson as 2026-05-02: trackers and branches lag the
  code; verify against main before scoping or deleting.

### 2026-06-10 — "Complete everything unblocked" wave: 12 parallel workstreams launched; CI unblocked; coordination lesson

Founder directive: finish every unblocked TOP-10 / backlog opportunity to
production quality, skipping quiz/Decision-Engine surfaces (owned by a
parallel session) and anything gated on deals/legal/credentials.

**Shipped to main this session:** #1504 (multi-tenant CPL partner accounts
on `api_customers` + single-lead allocation fix — the old partner endpoint
fanned 1 enquiry to up to 5 advisors — + partner analytics dashboard +
admin key minting; weekly premium research digest cron; advisors
country-mode deep-link wiring) and #1515 (CI unblock: the #1504 migration
collided with gm04 on version `20260610090000` — renamed; plus 4 RLS
integration tests still read pre-squash migration paths and ENOENT-failed
the build job on EVERY PR since the baseline squash — repointed at
`supabase/migrations/archive/`).

**Grounding corrections (don't re-scope from stale idea lists):**
rate alerts are ~built BUT nothing ever emails subscribers (the cron only
writes `rate_change_log`); cross-border persona selector + DASP + WHT
calculators already exist; premium research pipeline only lacks an admin
editorial UI; advisor monetization only lacks cap-hit upsell + churn
win-back; /rates/today exists but /fees/today + public events calendar +
a unified "today" surface don't.

**In flight (parallel worktree agents, one PR each):** rate-alert mailer +
manage-prefs; data-news (/fees/today, calendar, /today); pro-research
admin CRUD; advisor cap-upsell + win-back cron; community Phase 1
remainder (article↔thread cross-links, newsletter community block, /feed
nav, QotD flag-gated OFF pending §11 D2/D3); calculators-as-a-service
(/api/v1/calculators/* on partner keys); embed partner gating + metering;
GEO server-side crawler capture (proxy.ts waitUntil, Tier C); licence-mode
star gating (DISC-20260610); firm careers demand probe; cutover-guardian
scripts + funnel-bot workflow.

**Coordination lesson (logged so it stops happening):** while this wave
was being scoped, the parallel session landed #1502 (WCAG wave 1) and
#1503 (FIRB explainer + non-resident mortgage guide) — duplicating two
agent briefs mid-flight. Rule: grep ORIGIN/MAIN immediately before
launching any build agent AND again before integrating its output;
discard duplicated output rather than merging it.

**Revisit:** 2026-06-17 — are all wave PRs merged? Did the rate-alert
mailer + premium admin UI actually unlock their revenue lines (first
digest sent; first report published)?

### 2026-06-10 — Hybrid auction (#5 ship-now): quality multiplier SHIPPED; engineering now complete, blocker is legal only

The 2026-04-30 decision approved the hybrid auction as "editorial filter +
bid + quality multiplier". Audit found the first two were live but the
multiplier had never been built — `getWinningCampaigns` ranked purely on
`rate_cents`, so a low-quality campaign could buy the top slot indefinitely
(the exact adverse-selection risk the hybrid model exists to prevent).

**Shipped (branch `claude/exciting-dijkstra-4htd5f`, PR #1498):**
- `lib/marketplace/quality-score.ts` — cohort-relative 30d CTR/CR scorer,
  0.6/0.4 blend, clamped [0.5, 1.5], neutral 1.0 cold-start (new brokers
  never penalised). Quality affects **rank only, never billing** —
  `recordCpcClick` still charges the stated DB rate.
- Allocation now also enforces the placement reserve server-side
  (`below_reserve`; was client-side-only at creation) and gates suspended/
  pending `broker_accounts` out of serving (`broker_not_active`; fails open
  for legacy campaigns with no portal account row). Every decision logs
  `quality_multiplier` + `effective_rate_cents` to `allocation_decisions`.

**Corrections to the audit that scoped this** (logged so future sessions
don't re-plan from bad data): broker self-serve onboarding ALREADY existed
(`/broker-portal/register` + admin approval queue), as did analytics CSV
export; and `/invest/alternatives` is live (~80%), not "0% greenfield".
Full corrections in `docs/audits/TOP10_CODEBASE_BENCHMARK.md`.

**Remaining for revenue to land:** RG 246 conflicted-remuneration legal
sign-off (founder + lawyer, non-code) and pilot-broker BD. **Revisit:**
2026-07-10 — has legal reviewed the tier/quality-multiplier framing?

### 2026-06-10 — Decision Engine vision locked: multi-lane outcome router on /get-matched

Founder vision set the bar: not a quiz or directory — a decision engine that
resolves the right destination(s) per user: matched advisors when a
professional is the answer, SPECIFIC scored listings when browsing is, both
lanes side-by-side when both apply; shortlists, comparison, a "My Options"
workspace, resumable journeys, full why-this transparency. Full product plan
+ architecture: docs/plans/UNIFIED_MATCHING_ENGINE.md (v2) — lanes
(advisor/listings/platforms/brief/education), weighting by intent + urgency +
certainty + real supply, composite results, edge-case table, compliance
redlines (listing matches are factual criteria only; CSF verticals excluded
pending s708 gate), 9 phases each flag-gated + tested.

P1 shipped same day (PR #1497): lib/getmatched/advisor-allocation.ts — the
translator that drives get-matched's answers through the ONE advisor engine
(deriveNeeds → pickPrimary single-lead + scoring context), 17 intent-matrix
tests. Next: P2 (advisor lane live in resolve behind
advisor_match_v2_get_matched), then listings scorer (P4) and the workspace
(P5, needs device QA).

**Revisit:** after P2 ships, before P5 — founder eyes on the result-surface
redesign on the Netlify mirror.

### 2026-06-10 — OTP wall relocated on /find-advisor (decision: keep the funnel, don't 301)

Founder delegated the §5.6/§6 either-or. Evidence decided it: /get-matched
writes NO leads (action-plan router — no contact capture, no advisor
auto-match, no professional_leads insert), while /find-advisor is the only
direct advisor-lead funnel (submit-lead dry-run preview + confirm →
leads + professional_leads, round-robin, country gate, dedup). A 301 would
have pointed lead intent at a funnel that cannot take a lead.

Shipped instead: the audit's "single biggest expected lift" — the flow now
shows the dry-run match preview BEFORE the contact+OTP wall (steps: quiz →
preview → "Connect with {name}" → contact + email verification at the
side-effecting confirm → lead). /api/submit-lead allows a contact-less
dry_run only (side-effecting paths stay email-gated; email-keyed dedup
re-runs at confirm). Preview copy rewritten to promise-not-claim (it used
to say "has been notified" pre-lead).

**Revisit:** 301 /find-advisor → /get-matched only after get-matched gains
advisor lead capture (Phase-5 prerequisite, see QUIZ_REDESIGN §6 port-list).

### 2026-06-10 — Merged #1477 (matching brain + portal wizard); canonical-surface integration finding

Squash-merged PR #1477 to main (f167d58, founder-instructed): server-side
scored advisor matching + corridor-specialty routing (UK pension / FATCA /
DASP / FIRB — pre-fix the exact-corridor specialist scored as having no
relevant specialty), the option↔schema contract net (caught 2 silent
lead-nulling bugs), all stranded advisor types, the advisor-portal
profile-completeness lib + guided onboarding wizard, profile reviews
Load-more, and the WCAG directory/funnel contrast pass.

**Integration finding:** #1489 made `/get-matched` canonical (permanent
`/quiz` redirect) while #1477 was in flight. The merged branch's lib/API/
portal/profile/directory work is all live; the root `/quiz` page UI is the
consolidation *reference implementation* behind the redirect. Port-list for
Phase 5 recorded in QUIZ_REDESIGN.md §6 (multi-select needs + pickPrimary,
readiness gate, trust strip, advisor-match engine convergence). Follow-up
shipped: full-funnel PostHog on `/get-matched` (funnel_started /
step_answered / step_back / resolved) — it previously had ZERO analytics,
so drop-off analysis on the canonical funnel could not run.

**Revisit:** Phase-5 consolidation (engine convergence + /find-advisor
OTP decision); ratchet vitest coverage floors after the next few PRs.

### 2026-06-10 — Homepage cleanup: 24 sections → 13; paid-placement policy for the marketplace teaser

Founder call ("way too long and bloated") + expert review. Decisions:

1. **Cut/merge, don't redesign.** Removed `HomeCompareDeepDive` (278-line
   client re-implementation of /compare), `HomeCPDCourses` (B2B content on
   a consumer surface), `HomeActivitySection` (third "welcome back" surface
   — `HomepagePersonalisedStrip` is the one canonical returning-user strip)
   and the inline tool chips. Merged the three market strips
   (rate-of-the-day + Invest Score gauge + rate changes) into one
   `HomeMarketToday` band. Squad-of-the-month shrunk from a full-bleed
   violet band to a one-row spotlight strip docked under the experts grid
   (ranking logic unchanged); events shrunk to a 3-row strip; post-a-request
   shrunk to a one-row CTA strip. Net: 24 sections → 13 modules.
2. **Marketplace teaser paid-placement policy:** hybrid. Diversity
   round-robin (max 2/vertical) + image-first ranking stays; paid
   (`listing_type` featured/premium) capped at **3 of the 6 visible
   cards**, always labelled (SponsorChip + `ADVERTISER_DISCLOSURE_SHORT`).
   Placement stays a **flat-fee tier upgrade — no bidding** (RG 246
   conflicted-remuneration + adverse-selection risk). Logic is pure +
   unit-tested in `lib/home-listing-curation.ts`.
3. **Equity raises excluded from the homepage teaser** while
   /invest/startups has no s708 wholesale gate (CSF escalator,
   REGULATORY-AVOID-LIST §A). Re-include only behind the wholesale gate.
4. **Bug found during the work:** homepage teaser cards hand-rolled
   `/invest/<vertical>/<slug>` — a 404 for every vertical (canonical shape
   is `/invest/<category>/listings/<slug>` via `lib/listing-url`). Fixed +
   pinned by test. Also: `lib/listing-url` + `formatListingPrice` widened
   to accept drifted string verticals; teaser chips now humanise unknown
   verticals (`carbon-environmental-markets` was rendering raw).
5. **Data drift noted, not migrated:** `vertical='fund'` (60 collectibles),
   `commercial_property` underscore variant (4 rows). Handled in code via
   existing VERTICAL_ALIASES; root-cause normalisation migration stays a
   separate queue item (URL/SEO impact needs its own review).

Revisit: when listing supply grows past ~300 or a homepage-placement SKU is
actually sold, revisit the 3-of-6 cap and whether the teaser needs an admin
curation override.

### 2026-06-10 — Licence-mode gates wired into money surfaces; hero claims reworded; compare default changed (PR #1489)

Skeptical-first-time-investor funnel audit (full report:
`bots/reports/ai-journey-2026-06-10.md`) found the licence-mode framework
(`lib/compliance-config.ts`) wasn't consumed by the surfaces it exists to
gate — a factual_only (no-AFSL) build still rendered star ratings,
"Editor's Choice", /best rankings and match language. Three founder
decisions taken in-session:

1. **Wire the gates through** (chosen over "hold for legal" / "mirror is
   exempt"): compare table rating column/stars/sort, editorial badges,
   match-language CTAs and "ASIC-verified" claims now consume the flags.
   **Operational consequence: any deploy without
   `NEXT_PUBLIC_LICENCE_MODE=general_advice` now genuinely strips those
   features.** Set the env on the Netlify mirror if current visuals should
   stay. Remaining un-gated star renders (BrokerCard, DealCard, advisor
   cards, quiz results, RecentlyViewed…) queued as DISC-20260610 follow-up.
2. **Hero trust strip**: "ASIC-registered · No commission incentive"
   replaced with "Independent · Est. 1996 · Commissions never change our
   rankings" (old wording falsifiable via /how-we-earn + RG 234
   implied-endorsement risk). Same claim aligned in homepage JSON-LD.
3. **/compare default**: cold organic landings open on share-trading
   (mixed "All" view led with three same-rated affiliate rows); missing
   fee data now renders "Fee data incomplete" instead of a fabricated $0,
   sinks in cost sorts, and earns a neutral (not perfect) cost score.

Also shipped on #1489: fabricated social-proof counter disabled (sine-curve
"X investors compared today" — ACL s18 exposure), compare freshness claims
made data-driven ("rechecked weekly" only when true; raw ISO timestamps and
"Admin/source note not public" removed from the freshness column), mobile
chat FAB un-overlapped from the Get Matched tab, /quiz→/get-matched rename
completed (37 files), QROPS/UK copy genericized in country-mode banner,
quiz-outcome dead link to phantom /advisors/accountants repointed.

**Ops follow-ups**: fee-recheck pipeline stale since 2026-05-23 (the
"weekly" claim was false for 17 days); Vercel account still blocked
(deploy status red on every PR); unknown `[type]`/`[subcategory]` slugs
soft-404 (HTTP 200 + React #419) instead of clean 404s.

### 2026-06-09 — Find-advisor quiz: rebuilt the advisor-match brain (scored matching) + master plan

Ran a 5-agent deep audit of the quiz funnel (data/matching, intent architecture,
competitive/CRO, a11y/QA, technical+bots). Convergent finding: **the matching
intelligence is ~80% already built and ~0% wired into the live funnel** — a
weighted match engine (`computeAdvisorProfileMatch`/`rankAdvisors`), an 8-outcome
resolver (`resolveBestOutcome`), a 39-type taxonomy, and proper single-lead
allocation (`/api/submit-lead`) all exist, but the live `/quiz` advisor path
bypassed them (sorted by `rating DESC`, dropped ~9 of 11 collected signals, picked
advisors client-side with no dedup/eligibility). Also found **four parallel
funnels** (`/quiz`, `/get-matched`, 14 hub quizzes, `/find-advisor`) mid-migration,
and silent **P0 data-integrity bugs** (e.g. `location` nulled on every domestic lead;
a test enshrined the wrong enum).

**Decision: rebuild the orchestration + data contract; keep & wire in the brains.**
Full design + phased plan in `docs/plans/QUIZ_REDESIGN.md`. Canonical-surface choice
(consolidate the 4 funnels → 1) deferred to the consolidation phase; founder chose
"foundations first".

**Shipped this session (PR #1477, branch `claude/epic-newton-g5ml7l`, ~17 commits, all green):**
- Server-side **scored advisor matching** (`lib/quiz-advisor-scoring.ts` +
  `POST /api/advisor-match`): weighted fit (specialty/budget/location/corridor/quality)
  + country-eligibility gate + qualitative confidence band + whitelisted in/out (no PII leak).
- Verified, dynamic **"Why we matched you"** (`lib/quiz-advisor-match-reasons.ts`):
  specialty/corridor/FIRB/language/local/rating/free-consult/response-time/budget,
  + a closest-match honesty fallback.
- **P0 data integrity** (location enum, `answers.structured` personalisation, vertical
  + money-band drift), robustness (silent-drop tracking, refresh-during-analyzing,
  score-fetch timeout, 7-day localStorage TTL), and a keyboard/screen-reader a11y pass.

**Remaining (documented in `docs/plans/QUIZ_REDESIGN.md`, building next):** Phase 1
(one typed answer model), Phase 3 (question-graph rebuild — multi-select "needs" +
readiness question + `pickPrimary` team model + stranded advisor types), Phase 4
(`/find-advisor` OTP-wall consolidation), then Tasks 2–5. Founder direction: continue
building all phases in-session to the highest quality (Phase 3 started — `pickPrimary`).

**Revisit:** when Phase 3 starts — pick up from `docs/plans/QUIZ_REDESIGN.md`.

### 2026-06-08 — Listings: anonymous-submission hole closed (carve-out of #1459, no DB)

A bot sprawl + review of `/invest/list` (2026-06-07) surfaced that we ran **two
parallel post-a-listing products** plus a real regulatory hole: `/invest/list →
investment_listings` accepted **anonymous, unverified-email** submissions across
10 verticals **including capital-markets** (`startup`/`fund`/`pre_ipo`). The full
consolidation plan + founder decisions live in
`docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md` (D1–D7) and the wholesale
sign-off brief in `docs/strategy/LISTINGS_S708_LEGAL_BRIEF.md`.

PR #1459 bundled the safe build increments **with** a Tier-E prod migration
(`20260907040000_investment_listings_ownership.sql`, adds `owner_user_id` + RLS),
which can't land until the migration-ledger baseline-squash is done
(`docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md`). That coupling blocked the
whole PR.

**This session — shipped the schema-free carve-out (new PR, no DB):**
- **Phase 0 (Tier-A):** `/invest/[slug]` unknown slug now **404s** (was a soft-500
  via the segment error boundary — bad for users + SEO); `/invest/my-listings`
  dead link `/invest/submit` → `/invest/list`; hero "8"→"10" categories.
- **Phase 1 increment 1 (the compliance win):** `/api/listings/submit` now
  **requires an authenticated session (401 for anon)** and best-effort provisions
  the `listing_owner_accounts` workspace (a table that **already exists in prod**,
  so no migration needed). `ListingSubmitForm` gates client-side (no part-filled
  form lost to a 401) via the shared `useUser()` hook. **D5 honesty:** Standard
  shown as **Free** (it's never actually charged today).
- This **removes the anonymous capital-markets submission path** — a real de-risk
  even before the s708 gate.

**Deliberately EXCLUDED from the carve-out (stay blocked):**
- The `owner_user_id` migration + everything that writes that column. It does
  **not** exist in prod; writing it pre-apply would 500 the live submit. Stays
  fenced per `MIGRATION_LEDGER_RECONCILIATION.md`.
- **Increment 2** (owner-scoped RLS portal, `listings`→`investment_listings`
  data-migration, `/listings/new` 308, authed my-listings rewrite) — depends on
  that migration. Not started.
- **D4 / s708 capital-markets gate** — ⚠️ founder direction set (wholesale-only),
  but **unbuilt pending legal sign-off** recorded in repo (§5 of the s708 brief).

**Revisit:** 2026-07-07 — has the migration-ledger baseline-squash been scheduled
(it's the blocker for increment 2) and has legal ruled on D4?

### 2026-06-07 — Database migration ledger: forked, not "behind"; decision = baseline-squash

Deep-dive of the standing "database backlog" (was framed as "118 migrations
behind main; run `db push`"). That framing is **wrong and dangerous**. Measured
against live prod:

- The local migration tree and the prod `schema_migrations` **ledger have
  forked**: only **5 of 250** local versions are tracked in prod; **245** local
  versions are untracked; **434** prod ledger rows have no local file. A
  `supabase db push` would attempt ~245 migrations (re-creating existing tables,
  re-running ~35 non-idempotent backfills, sweeping in the CSF migration).
- **Root cause:** `supabase-migrate.yml` silently no-op'd for **months** (its
  `PROJECT_REF`/`DB_PASSWORD` secrets were unset → green-but-applied-nothing; see
  PR #1463). Every prod migration was applied **out-of-band via MCP**, each with
  a fresh timestamp, so the ledger never matched the files.
- **Good news:** schema *content* is ~98% converged (397/412 local tables live)
  and RLS is comprehensive (414/415). So this is **history reconciliation +
  pipeline repair**, not a schema rebuild.

**Decision — Path A: baseline-squash.** Treat live prod as source of truth; dump
it to one baseline migration; archive the 404 legacy files; `migration repair`
the ledger so the tree == ledger == types; then resume a normal pipeline.
Rejected Path B (per-file `migration repair`) — infeasible against 50 colliding
date-only versions + 3 version formats. Full procedure:
`docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md`; state of record:
`docs/audits/DB-STATE-2026-06-07.md`.

**Shipped this session (safe, repo-only):** corrected runbook + DB-state doc;
deprecated the dangerous `MIGRATION_DEPLOY_BACKLOG.md`; `audit:migration-filenames`
gate (blocks new non-14-digit / colliding versions) + `audit:ledger-drift` audit;
CONTRIBUTING migration discipline (14-digit timestamps; apply via pipeline, not
MCP; never `db push` pre-reconciliation).

**Founder-gated (Tier E — not done autonomously):** the prod baseline-squash +
ledger repair, the zombie-table drops, and **enabling auto-apply** (adding the
two secrets) — all must wait until *after* the baseline, else `db push
--include-all` replays the backlog. **⚖️ Legal-gated:** the startup-portal (CSF)
and wholesale-cert (s708) tables stay held per `REGULATORY-AVOID-LIST.md`.

**Revisit:** 2026-06-21 — has the baseline-squash been scheduled? Until it is,
every new feature needing a table keeps hitting the same wall (PR #1459, in-app
charts). This is now the #1 infrastructure blocker.

### 2026-06-07 — Sign-off: factual "Listed Securities (ASX)" category

Founder signed off on adding a **Listed Securities (ASX)** browse category to
the /invest marketplace. ~32 ASX-listed securities (uranium / hydrogen /
oil-gas / digital-infrastructure themes) were previously mis-bucketed into
"Funds" via the `categoryForListing` fallback; `categoryForListing` is now
keyed on `listing_kind="listed_security"` so they group correctly, with a
dedicated `/invest/listed-securities/listings` page.

**Regulatory posture (lean lane, per `REGULATORY-AVOID-LIST.md`):** this is a
**factual listing of already-public securities + referral** ("buy via your own
broker"), explicitly the sanctioned lean alternative — *not* an escalator. It
does **not** issue, sell, arrange, facilitate an offer, run a market, or give
personal advice. `GENERAL_ADVICE_WARNING` + a "general information only, not an
offer/recommendation" notice are wired onto the page. If legal wants to review
the securities framing, the category can be flag-gated. (Sign-off recorded here
per the avoid-list's "founder + legal sign-off recorded in this repo" rule;
legal review still open if desired.)

### 2026-06-03 — Bot-QA system: ranked roadmap for the next big projects

Context: the AI-Journey bot found a real P1 in one run (`/api/versus/vote` 500s
site-wide — `versus_votes` table was never migrated in; held draft PR #1317).
That proved the value but also exposed the bots' structural limits. Today they
are **one-off, browse-only, anon-only**, with a side-effect firewall. Ranked
roadmap by leverage:

1. **Funnel-completion runner (do first).** The bots cover *browsing* but never
   *converting* — the quiz→match, lead, and account-signup flows are untested.
   The blocker is **this Claude Code sandbox's TLS-MITM proxy** dropping async
   fetches — **NOT** Netlify. Fix: run `ai-form.cjs` / the journey from a
   **clean-network environment (GitHub Actions job or small cloud runner)
   against the live Netlify mirror**, firewall still mocking the terminal money
   action. Available now; conversion is where the revenue and the worst bugs
   live. **Constraint: do NOT make this depend on the Vercel deploy** — Vercel is
   launch-gated (build needs ~14 GB; only Vercel Pro ever compiled it; reserved
   for cutover). Targeting Vercel is a *post-launch* nice-to-have, not the plan.
2. **Cross-run regression baseline + diffing.** Fingerprint each route (status /
   key content / JSON-LD present / console-clean / disclosures present), diff
   every run vs last green. Would have caught BOTH the CSP/ISR outage and the
   versus_votes 500 as regressions the moment they shipped. Backbone for the
   post-merge-smoke cadence.
3. **Systematic API-surface probing.** versus_votes was caught by luck. Enumerate
   `app/api/**`, probe each read endpoint with valid inputs against live, flag
   consistent 500s — a whole surface the UI crawler can't see.
4. **Bots as a compliance + GEO gate.** Promote soft "fees/risk present"
   observations into hard assertions: required `lib/compliance.ts` disclosures on
   every advice/comparison/payment surface + avoid-list surfaces stay gated
   (AFSL, Nov 2026); AND valid JSON-LD / answer-first / canonical (the GEO
   citability thesis — see 2026-05-21 + 2026-05-29 entries).
5. **Migration/cutover guardian.** During the Oct–Dec 2026 domain move: verify
   the prior-host redirect map, canonicals→new domain, sitemap parity, zero
   orphans, continuously. Pairs with the `CO-01` legacy-redirect-map queue item.

Honorable mention: **authenticated/portal coverage** (seeded test account) — the
advisor/startup-portal work is entirely untested by bots (anon-only today).

**If only one gets funded: #1**, then #2. Together they turn the fleet from
"is the page up?" into "does the money path still work?".

**Revisit:** 2026-07-15 — has the clean-network funnel runner been stood up? If
yes, layer #2 (regression baseline) on top.

### 2026-05-29 — GEO measurement built; GEO "supply floor" found already-shipped

Picked up the GEO thread to build the **measurement** side (the one piece the
2026-05-21 GEO entry left unbuilt). Grounding the codebase first changed the
picture twice — logging both as corrections so future sessions don't re-scope
from stale notes:

**Correction 1 — the GEO "to-do" list is mostly already shipped.** Contrary to
the 2026-05-21 open items: `public/llms.txt` + `public/llms-full.txt` exist
(served, curated, compliance-aware); `public/robots.txt` was dropped so
`app/robots.ts` is the single robots source (caveat (a) resolved); `Speakable`
+ answer-first schema now extend to articles, `/questions/[slug]`, and versus
(not just glossary); articles emit a real `dateModified` from `updated_at`; FAQ
schema is on the calculators (commit `c918cd7` "answer-engine v2"). The cheap
structural GEO floor is **done** — don't rebuild it.

**Correction 2 — golden-flow E2E already exists.** `T-TESTS-02` was tracked as
"`__tests__/e2e/` doesn't exist". True about that path but misleading: the
suite lives in `e2e/` (15 specs incl. `critical-path-get-matched-to-brief`,
`smoke`, `pre-launch-qa`). Golden flows are covered; don't duplicate.

**What was genuinely missing → built (PR #1274, branch `claude/sleepy-dirac-gTZXz`):**
measurement — there was zero AI-referrer/crawler instrumentation.
- `lib/geo/ai-referrer.ts` — pure, tested classifier for AI referrers
  (ChatGPT/Perplexity/Gemini/Claude/Copilot/…) + AI crawlers
  (GPTBot/ClaudeBot/PerplexityBot/…). google.com/bing.com excluded on purpose
  (AI Overviews / Bing chat share the search host — that's a GSC signal).
- `ai_referral` PostHog event, fired once/session, consent-gated.
- `/admin/geo` page: live detection coverage + a ready-to-paste HogQL insight.

**Decision — schema-markup.ts / seo.ts consolidation: NOT doing it.** The
2026-05-21 deep-dive item #1 mused about merging the two JSON-LD modules.
Rejected: `CLAUDE.md` documents `breadcrumbJsonLd` + SEO helpers as living in
`seo.ts` and schema.org builders in `schema-markup.ts`, so "one module"
contradicts documented ownership; it's hundreds of import sites for low payoff;
bundling a big refactor with a feature hurts reviewability. The only real smell
is `qaPageJsonLd` + `howToJsonLd` being defined in **both** files — worth a
small, separate dedup PR if/when someone touches them.

**Flagged next steps (deliberately deferred):** server-side crawler capture in
`proxy.ts` (Tier C); Search Console ingestion for the AI-Overview
impressions-vs-clicks gap (the part referrers can't see); optional Supabase
table for in-app charts (deferred until the pre-existing "Supabase types drift"
CI check is green, to avoid compounding it).

**Revisit:** 2026-06-29 — are `ai_referral` events actually landing in PostHog,
and which AI sources dominate? If volume is real, do crawler capture + the GSC
gap next.

### 2026-05-21 — Platform Expansion (PX stream) shipped

Seven features that turn the platform from comparison directory into practice management tool for advisors and financial dashboard for investors.

**Shipped in one session (branch `claude/sweet-gates-izLBx`):**
- **PX-01: Slack lead alerts** — `slack_webhook_url` column on professionals, Slack Block Kit formatter (`lib/slack-lead-notify.ts`), internal Node route (`/api/internal/lead-webhooks`), advisor Settings tab UI. Advisors paste a Slack Incoming Webhook URL → get a structured Slack ping on every matched lead.
- **PX-02: CRM/Zapier webhook sync** — `lead.received` added to outbound webhook ALLOWED_EVENTS; `sendOutboundWebhook` now accepts optional owner filter (prevents cross-advisor event leakage); wired from `submit-lead` via fire-and-forget internal route (edge runtime compatibility).
- **PX-03: Firm shared lead inbox** — `Mine/Team` toggle in LeadsTab when `is_firm_admin=true`; `/api/advisor-portal/firm-leads` (GET + PATCH) returns all firm member leads with assignment dropdown. Firm admins can now see and reassign all leads across their team.
- **PX-04: Fee impact visualiser** — `components/FeeImpactVisualiser.tsx` (pure SVG, no deps, interactive amount/horizon selectors, animated area chart, AUD callout). Embedded in `/broker/[slug]/` Fee Audit section for ETF/managed fund contexts.
- **PX-05: Referral programme migration** — `referral_codes` + `referral_claims` tables (with RLS) that wire up the already-built `/api/referrals` route and `/account/referrals` UI which were orphaned without a DB backing.
- **PX-06: Calendar booking on advisor profile** — already done (booking_link + BookingWidget already on advisor/[slug] profile page). No work needed.
- **PX-07: Annual Financial MOT email** — daily cron (`/api/cron/annual-mot`) finds users whose account anniversary is today, queries their bookmarks, sends personalised re-engagement email. `mot_sent_at` column on `investor_profiles` prevents duplicate sends. Uses `auth.admin.listUsers()` pagination pattern.

**Key architectural decision:** outbound webhooks (CRM/Zapier) and Slack notifications share one internal Node runtime route (`/api/internal/lead-webhooks`) called fire-and-forget from the edge `submit-lead` route. This sidesteps the `node:crypto` / edge runtime incompatibility without breaking the edge performance budget.

**Docs:** `docs/plans/PLATFORM_EXPANSION_BRIEF.md` has full spec for each item.

**Revisit:** 2026-06-21 — check Slack adoption rate in settings (query `SELECT COUNT(*) FROM professionals WHERE slack_webhook_url IS NOT NULL`), lead response time improvement in LeadsTab analytics, fee visualiser engagement (PostHog).

---

### 2026-05-21 — GEO pivot: optimise to be *cited* by AI, not to *rank*

**Trigger:** Google I/O 2026 (May 19–20) — the largest search overhaul in 25 years.
Ten-blue-links increasingly replaced by AI-synthesised answers (Gemini 3.5 Flash).
Founder's framing of the numbers: zero-click ~58.5% of queries; position-1 organic
CTR on AI-impacted queries fell 27% → 11%; brands cited inside AI Overviews see ~35%
more organic / ~91% more paid clicks than uncited competitors. *(I can't verify the
exact I/O figures — knowledge cutoff Jan 2026 — but the direction, zero-click rising +
AI Overviews reshaping CTR, was already the established trend; the strategy holds
regardless of the precise percentages.)*

**Decision: SEO → GEO (Generative Engine Optimization).** The goal shifts from ranking
to *being the source Google's AI cites when Australians ask financial questions*. This
is a lens applied to existing work, not a new build — most of the moats already exist.

**Moats that matter in this world (all already real assets):**
- 30-year domain (registered 1996) — strongest AU-finance authority signal for citation.
  See [[project_invest_domain_lineage]].
- `/quotes` reverse marketplace — transactional, not summarisable → structurally AI-proof.
- Listing depth across 8+ verticals — AI prefers comprehensive structured sources.
- Schema markup everywhere — `lib/schema-markup.ts` (single source of truth) is how AI
  parses and surfaces us.

**Grounded codebase state (checked 2026-05-21):**
- **Glossary: 122 terms today** (`lib/glossary.ts` + DB-backed `lib/glossary-db.ts`,
  migration `20260419_glossary_terms.sql`). Target 200 → **78 to add.** Definitional AU
  finance content is prime citation material → this is the highest-leverage near-term GEO
  lever and cheapest to ship.
- **Schema gap:** `lib/schema-markup.ts` has article / FAQ / broker-FinancialProduct /
  advisor / ItemList / listing-Product / versus / calculator / governmentService builders,
  but **no `DefinedTerm` / `DefinedTermSet`** (the glossary-citation schema) and **no
  `Speakable`**. Adding those two is the most direct "make us machine-citable" code change.
- **AI Q&A capture (#7 / stream QQ)** is already in-flight and squarely on-strategy —
  public Q&A landing pages with answer-first structure are exactly what GEO wants. Don't
  treat GEO as greenfield; it largely re-prioritises QQ + glossary + schema.

**Operating rules for all content work this session forward:**
1. Schema markup non-negotiable on every listing, broker/advisor profile, and article.
2. Every article/glossary term leads with a direct answer in the first 2–3 sentences
   (extraction-ready), before any preamble.
3. Glossary → 200 terms is now **high priority** (was untracked).
4. Restructure informational content for AI extraction, not just keyword density.
5. Competitive read: Finder/Canstar bleed *informational* traffic first → window to
   become the cited AU-finance source on definitional/explanatory queries.

**Concrete next actions (smallest-first):**
- [x] **SHIPPED 2026-05-21** — `definedTermJsonLd` / `definedTermSetJsonLd` /
  `definedTermPageJsonLd` / `speakableSpecification` added to `lib/schema-markup.ts`
  (single source of truth; canonical `GLOSSARY_TERM_SET` shared so term page + index
  can't drift). Glossary term page now emits a `WebPage` → `speakable` (answer-first
  heading `#glossary-term-name` + lead definition `#glossary-term-definition`) →
  `mainEntity: DefinedTerm`, replacing the hand-rolled inline node; index uses
  `definedTermSetJsonLd`. 41 schema tests green, tsc clean. **This is the GEO schema floor.**
- [ ] Audit existing articles/glossary entries for answer-first opening sentences.
- [x] **Glossary "→200" was ALREADY met — corrected 2026-05-21.** The live glossary is
  DB-backed (`public.glossary_terms`, seeded by migration `20260419` with **203 terms**);
  `lib/glossary.ts` (122) is only the `JargonTooltip` source + build-time fallback and had
  drifted behind. Real gap was static/DB parity, not new content. First attempt synced all
  81 into `lib/glossary.ts` — but that file is **client-bundled** (JargonTooltip imports
  `GLOSSARY`), so it tipped the shared client chunk +49.5 kB over the 12 MB bundle budget
  (CI caught it). **Final shape (#1156):** keep `lib/glossary.ts` lean at 122 (client tooltip
  set, == main, zero bundle change); put the 81 specialised terms in a **server-only**
  `lib/glossary-extended.ts` (`FULL_GLOSSARY_ENTRIES` = 203) that powers the sitemap (was
  missing 81 live term pages → now complete), internal-link targets, and the DB fallback.
  Net: a GEO win (all 203 term pages in the sitemap + more internal-link targets) with no
  client cost. Lesson (again): grep the runtime source before scoping from a tracker count,
  and watch what's client- vs server-bundled. *Net-new terms beyond 203 = separate
  new-content task; route through the content loop for accuracy.*
- [ ] Confirm QQ public Q&A pages emit FAQ + (where apt) Speakable schema.

**Deeper GEO dive (2026-05-21) — what else to add/adjust, grounded in the codebase:**
1. **Schema is broad but split across two modules.** `lib/schema-markup.ts` AND `lib/seo.ts`
   both emit Article/FAQ schema (`articleAuthorJsonLd`/`articleFaqJsonLd` live in seo.ts;
   `/best/[slug]` uses schema-markup's `articleJsonLd`). Not a bug, but consolidate to one
   so GEO changes (Speakable, dateModified discipline) land everywhere at once.
2. **`Speakable` should extend beyond glossary** — add it to article TL;DRs, `/questions/[slug]`
   answers, and the versus `tldr` (which already exists as answer-first copy in
   `lib/versus-content.ts`). The answer copy is written; it just isn't marked machine-readable.
3. **`dateModified` is the cheapest authority signal for AI** — AI engines prefer fresh,
   dated sources. Ensure every Article/DefinedTerm emits a real `dateModified` (glossary
   currently shows only `CURRENT_YEAR` in visible copy, no per-term date in schema).
4. **FAQPage is on 27 pages — extend to listings + calculators** ("How much is FIRB fee for
   a $2m property?" is exactly an AI-Overview query; calculator pages should emit the Q&A).
5. **Author/E-E-A-T entities — already strong (verified 2026-05-21).** `articleAuthorJsonLd`
   in `lib/seo.ts` already emits `Person` with `sameAs` (LinkedIn/Twitter), `jobTitle`,
   `worksFor`, and `/authors/[slug]`, plus a separate reviewer Person block. Low-priority;
   the win here is just ensuring every published article actually has an author assigned.
6. **Citable stats/data**: AI cites concrete numbers. Fee tables, return figures, and
   comparison data should sit in extractable `Table`/`Dataset`-friendly markup, not images.
7. **Crawler policy — verified 2026-05-21.** AI crawlers (GPTBot/Google-Extended/Perplexity)
   are currently **allowed** (only a `User-agent: *` block disallowing admin/api/auth/account
   paths). Good for a citation strategy — don't add AI-bot disallows. TWO caveats: (a) there
   are **two robots sources** — `app/robots.ts` AND `public/robots.txt` — and in Next.js the
   static `public/robots.txt` wins, so `app/robots.ts` is dead/confusing → consolidate to one;
   (b) **no `llms.txt`** exists — cheap, on-strategy add (curated map of our best citable pages).
8. **Measurement is the hard part** — AI-Overview citations aren't in GSC cleanly. Proxy via
   impressions-up/clicks-flat divergence + referrer strings from AI engines in PostHog.

**Revisit:** 2026-06-21 — did cited-rate / referral mix actually move once QQ + the schema
additions ship? (Hard to measure directly; proxy via GSC impressions-vs-clicks gap and any
AI-Overview-attributed referrers PostHog can see.)

### 2026-05-20 — Cross-border #24 Phase A finished + Phase B engineering shipped

Closed out the remaining cross-border engineering in one session. Most of it
turned out to be already built by earlier loop iterations — the work was
finding the dangling wires and connecting them.

**Phase A — DONE.**
- Premium pricing helper (`getLeadPriceCents` / `crossBorderLeadMultiplier`,
  1.75×) and the on-site advisor-enquiry path were already wired. The one gap
  was the **partner bulk-lead API** (`/api/partner/leads`) — it billed every
  lead at the flat base price. Now stacks the 1.75× premium, so partner-sourced
  cross-border leads price the same as on-site ones.
- Country-page → advisor CTA `?specialty=` wiring already live for UK/US/India.
  Did **not** add specialty params to the other corridors (China/HK/SG/…):
  they have no clean mapping to the four cross-border specialties, and their
  CTAs target the tax-specialist directory — forcing a FIRB-lawyer specialty
  there would filter to zero advisors. The new country-match boost (below)
  routes those corridors via `?country=` instead.

**Phase B — engineering shipped (was estimated 4–6 wks; most pre-existed).**
- `available_in_countries TEXT[]` column + GIN index: already existed
  (migration 20260515). Advisor portal self-selection UI (`CountriesServedField`
  in `ProfileTab.tsx`): already existed and persists via the profile PATCH
  allowlist. **No new migration / UI needed.**
- **Ranker country-match boost — built.** `available_in_countries` was being
  collected but never consulted. Now `advisor-ranker` takes a `countryMatch`
  option (per-advisor +15 default, normalised like specialtyMatchBoost) and
  the submit-lead matcher prefers, in order: specialty+corridor → specialty →
  corridor → top pick. `/find-advisor/[location]` passes the resolved intent
  country. Soft preference, not a hard filter (country_eligibility already
  hard-filters), so AU-only advisors aren't hidden.
- **Affiliate panel — capability built, dormant.** Typed `CrossBorderPartner` +
  `CountryConfig.crossBorderPartners` + `CrossBorderPartnerPanel` component
  (affiliate `rel` + advertiser disclosure baked in) + template section. Left
  **unpopulated**: listing a provider asserts a real referral relationship on
  an AFSL page — that needs a signed agreement + disclosure review, which is
  Phase C BD, not a code change. Activation is now a one-config-block change:
  see `docs/plans/CROSS_BORDER_PARTNER_PANEL.md`.

**What's left for revenue to actually land:** the affiliate panel needs signed
FX / remittance / non-resident-mortgage / FIRB-legal referral deals (Phase C),
and the persona selector + DASP calculator + homepage rewrite remain
design/copy work, not engineering.

### 2026-05-01 — Cross-border audit (deep)

The homepage v4 redesign exposed that the cross-border surface (`/foreign-investment` hub + 12 country pages) is **rich content with dumb monetization**. Bespoke deep guides (UK 2-audience, US FATCA/PFIC warnings, India NRI/ROR/DASP, SIV/188 pathways) already capture high-intent traffic. But every monetization signal — visa class, country of origin, journey direction — gets dropped at the funnel entrance. Lead lands in the same flat `$39/lead` advisor pool as a Brisbane share-trader.

**Decision: cross-border becomes a separate revenue product line**, not a content arm. Pricing, taxonomy, affiliate stack, funnel design, and reporting all split out.

**The LTV asymmetry that justifies the work:** a UK-arrival lead consumes ~$5–20k of professional fees over 18 months across pension transfer + non-resident mortgage + FX + FIRB lawyer + ongoing planner + insurance + recurring tax. **5–15× a domestic share-broker lead.** Same pattern (different intensities) for US-AU dual citizens, India-AU migrants, and non-resident investors.

**Audience segmentation** (the homepage section is muddled because it tries to serve all 4 from one card grid):
- **A. Inbound migrants** (UK / India / China → AU) — biggest absolute LTV, longest cycle, most complex
- **B. US-AU dual citizens in AU** — small audience, ~100% experience FATCA pain, recurring spend
- **C. Non-resident foreign investors** investing INTO AU without moving — high volume, lower per-lead value
- **D. Outbound Australians** (DASP, breaking residency) — moderate, time-limited

**Phase A (ship now, this session):** specialty taxonomy + premium pricing + CTA wiring + homepage section rewrite around audience A. Estimated $15–40k/yr realistic.

**Phase B (4–6 weeks, separate session):** `countries_served TEXT[]` schema migration + advisor portal self-selection UI + ranker country-match boost + remittance / FX / non-resident-mortgage / FIRB-lawyer affiliate panel. Estimated $30–80k/yr + Featured-partner sponsorship slots ($50–100k/yr if 3 slots filled).

**Phase C (Q2–Q3, BD-heavy):** visa advisor partner network (SIV / 188C premium CPL), pension-transfer specialist desk, US-AU tax desk, distinct cross-border reverse-marketplace flow. Estimated $65–200k/yr.

**Why this matters strategically:** the audit (2026-04-30) ranked 23 revenue ideas and surfaced ZERO cross-border items. That was a blind spot. Cross-border is now backlog item #24 and gets its own swim lane in the ship-now table below.

---

### 2026-04-30 — Revenue strategy review (this is the conversation that started this file)

Audited 23 candidate revenue ideas against the actual codebase. Big finding: a lot of infrastructure is already built but not commercialised. Four ideas dropped from "Q2/Q3 build" to "ship now" after audit. Full backlog and audit sit in this notebook below.

**Decisions made:**
- Pure marketplace placement auction: **NO**. Compliance risk too high (ASIC RG 246 conflicted remuneration), adverse selection (worst products bid hardest), thin AU market.
- Hybrid auction (editorial filter + bid + quality multiplier): **YES**. 90% already built in `lib/marketplace/auto-bid.ts`. Promote from Q3 → ship-now.
- Peer-to-peer asset auction (AirTasker for investments): **NO**. Securities law triggers, custody/settlement nightmare, adverse selection.
- Whisky/wine/art auction *house*: **NO**. Be the comparison + lead-gen layer above existing platforms instead.
- Own financial product (co-branded ETF/super): **NO** (for now). Different company, AFSL upgrade required, Y5+ spin-out only.

---

## Revenue backlog — full ranking (snapshot 2026-04-30)

### 🟢 Ship now (post-audit)

| # | Idea | Real effort | Status in codebase | Why ship-now |
|---|------|-------------|---------------------|--------------|
| 1 | Concierge wealth-stack builder | 3–4 wks | 70% built — extend `app/quiz/` + `lib/quiz-scoring.ts` | Quiz already does multi-product matching for brokers; extend to super/savings/robo. `app/api/concierge/route.ts` exists. |
| 4 | Rate alerts → high-intent email list | 2–3 wks | 30% built | Resend pipeline + cron infra reusable. Smallest build of any idea. |
| 7 | AI Q&A capture layer | 2–3 wks | 80% built — `lib/chatbot.ts` (RAG, Claude+OpenAI), `lib/embeddings.ts`, `lib/ai-cost-caps.ts` | **🟡 IN-FLIGHT 2026-05-09 — queued as audit-remediation stream QQ. Brief at `docs/audits/qq-ai-qa-capture-brief.md`. 10 sub-tasks (QQ-01..QQ-10), compliance gate at QQ-08. Cloud loop picks up on next fire.** Production-ready chatbot is admin-only today. Just needs public Q&A landing pages + question-capture form. |
| 5 | Hybrid auction self-serve | 4–6 wks | 90% built — `lib/marketplace/auto-bid.ts`, `app/admin/marketplace/` | Auction already running. Need: partner self-serve onboarding, quality multiplier (CTR/CR → bid rank), reserve prices, eligibility gate. **Needs legal sign-off before code.** |
| 10 | Premium research subscription | content only | 90% built — full Stripe (`lib/stripe.ts`), Pro tier (`app/pro/`) | Plumbing complete. Just write the premium content. |
| **24** | **Cross-border revenue line** (Phase A) | **~1 day remaining** | **Specialty taxonomy SHIPPED 2026-05-02 in `lib/advisor-specialties.ts:122–138` — UK Pension Transfer, FATCA-Aware US Expat Planning, DASP Processing, FIRB Property (Non-Resident); SIV/188C covered via `immigration_investment_lawyer` type. Wired into `financial_planner`, `tax_agent`, `migration_agent` advisor types. Country pages exist with deep content.** | **Remaining: premium 1.75× lead pricing in `lib/advisor-billing.ts` (~half day), filtered advisor-CTA wiring on country pages so /foreign-investment/uk routes /find-advisor with `?specialty=UK+Pension+Transfer` (~half day), persona selector + DASP calc + homepage rewrite (design/copy work, not engineering). $15–40k/yr realistic. See decision log entry 2026-05-01.** |

### 🟡 Q2 / year-1

| # | Idea | Real effort | Status |
|---|------|-------------|--------|
| 3 | Lead generation (CPL replaces CPA) | 3–4 wks tech + 4–6 wks BD | 80% built — `app/api/{quiz-lead,advisor-lead,submit-lead,email-capture}/`, Resend webhooks |
| 2 | Switching-as-a-service (super, savings, broker HIN) | 4–6 wks per vertical | 40% built — calculators done, partner integrations missing |
| 9 | Awards / badges / methodology licensing | 6–8 wks (mostly editorial+legal) | 35% built — methodology page + best-of categories live |
| 6 | Alt-asset comparison vertical (whisky/wine/watches/art) | 4–6 wks per sub-vertical | 0% — greenfield, but pattern from existing 9 verticals replicable |
| 13 | Sponsored editorial / content studio | 4 wks ops setup | 40% built — AI drafting infra exists |

### 🟠 Q3 / harder

| # | Idea | Real effort | Status |
|---|------|-------------|--------|
| 8 | White-label comparison widgets (B2B SaaS) | 4–6 wks tech + 12+ wks sales | 50% built — `app/embed/` exists |
| 15 | Calculators-as-a-service / public API | 4–6 wks | 35% built |
| 11 | Market-intelligence data product | 8–12 wks | 40% built — PostHog wired, no DW yet |

### 🔴 Year-2+ / spin-out / never

| # | Idea | Verdict | Why |
|---|------|---------|-----|
| 14 | Off-market property syndicate matchmaking | Y2+ | Real market but 6–9mo build, KYC + deal vetting heavy |
| 12 | Pre-IPO secondaries marketplace (wholesale) | Spin-out | Standalone-company-sized bet, AFSL upgrade |
| 16 | P2P "post your investment for bids" | NEVER | Securities law trigger, adverse selection, no real market |
| 17 | Whisky/wine/art *auction house* | NEVER | Be comparison layer, not auctioneer |
| 18 | Pure auction (no editorial filter) | NEVER | RG 246 risk, premium partners walk |
| 19 | Own financial product (co-branded ETF/super) | Y5+ spin-out | Become a product issuer, capital + AFSL upgrade |
| 20 | Crypto-aggressive affiliate plays | NEVER | Reputation cost > revenue |
| 21 | Display ads / programmatic | NEVER | Kills UX, regulator hates them |
| 22 | Events / annual conference | Later | Different business |
| 23 | Robo-advice referrals without disclosure rigour | NEVER | Same RG 246 risk |

---

## Audit findings — capability inventory (2026-04-30)

Things already in the codebase that I didn't initially account for:

- **`lib/marketplace/auto-bid.ts` + `app/admin/marketplace/`** — full marketplace auction with auto-bidding (CPC → CPA optimization). Admin-managed today; missing self-serve onboarding.
- **`app/quotes/` + `app/api/quotes/[slug]/`** — existing advisor quote auction (B2C RFQ). The "AirTasker for assets" idea has a working sibling here. Worth examining whether the quote-auction pattern extends to deal sourcing (accountants bidding for SMSF setup, brokers bidding for refi, etc.).
- **Full Stripe + Pro tier** (`lib/stripe.ts`, `app/pro/`, all webhook handlers in `lib/stripe-webhook/handlers/`) — premium subscription technically complete, just not used.
- **`lib/chatbot.ts`** — production RAG chatbot with Claude+OpenAI fallback, prompt-injection classifier, AFSL guardrails, conversation audit logging, cost caps.
- **`lib/quiz-scoring.ts`** — full multi-product weighted scoring engine (broker-only today, structurally extensible).

---

## Revisit in 1 month (check ~2026-05-30)

- [ ] Has the concierge wealth-stack builder been spec'd / started? (idea #1)
- [ ] Did legal sign off on the hybrid auction quality-multiplier model? (idea #5)
- [ ] Did anyone actually pick up rate alerts? Smallest build, most embarrassing if still not done. (idea #4)
- [ ] Status of the four-item ship-now block in `TODO.md` (added 2026-04-30, PR #319).

## Revisit in 2 months (check ~2026-06-30)

- [ ] Re-examine the quote-auction extension idea (accountants/brokers bidding for service work). Does `app/quotes/` pattern make sense for non-advisor verticals?
- [ ] Has the AI Q&A capture (#7) accumulated enough question data to consider the market-intel data product (#11)?
- [ ] Re-evaluate alt-asset vertical (#6) — is there partner BD progress on whisky/wine/watches platforms?

## Revisit in 6 months

- [ ] Pre-IPO secondaries (#12) — has any AU competitor emerged? If still greenfield, reconsider as a serious spin-out.
- [ ] Awards programme (#9) — has Canstar/Finder shifted methodology in any way that creates an opening?

## Revisit at AFSL grant (late 2027)

- [ ] Idea #19 (own financial product) reactivates as a possibility.
- [ ] Anything currently gated by `agent_memory:licensing:afsl_granted_at`.

---

## Saved for later — full deferred backlog

Everything not in the ship-now tier, captured here with priority, trigger, and revisit date. Scan this list at month-end. Priority scale: **P1** = pursue as soon as ship-now wave clears · **P2** = next quarter · **P3** = next year · **P4** = revisit only if something changes · **P5** = never unless the world changes.

### P1 — pursue Q2 (after ship-now wave clears)

- **#3 Lead generation (CPL replaces CPA on hot categories)**
  - Effort: 3–4 wks tech + 4–6 wks BD
  - Status: 80% built (`app/api/{quiz-lead,advisor-lead,submit-lead,email-capture}/`, Resend webhooks)
  - Why P1: 10× revenue per user vs current affiliate model. Bottleneck is commercial agreements, not engineering.
  - Trigger to start: BD has 2+ partners willing to pay $80–250/lead in writing.
  - Revisit: 2026-06-01

- **#2 Switching-as-a-service (super first, then savings, then broker HIN)**
  - Effort: 4–6 wks per vertical
  - Status: 40% built — calculators done, partner integrations missing
  - Why P1: Turns existing calculator output into transactions. $80–250 per completed switch.
  - Trigger to start: Concierge stack (#1) live, so we have routed traffic to convert.
  - Revisit: 2026-06-01

- **#9 Awards / badges / methodology licensing**
  - Effort: 6–8 wks (mostly editorial + legal, light engineering)
  - Status: 35% built — methodology page + best-of categories live, no badge SKU
  - Why P1: Recurring revenue, near-zero marginal cost per badge sold, drives SEO traffic.
  - Trigger to start: Methodology defensibility audit signed off by legal.
  - Risk: collapses into paid-badge scheme if methodology isn't genuinely defensible.
  - Revisit: 2026-06-01

- **#6 Alt-asset comparison vertical (whisky → wine → watches → art)**
  - Effort: 4–6 wks per sub-vertical
  - Status: 0% — greenfield, but pattern from existing 9 verticals is replicable
  - Why P1: New SEO surface area with zero AU competitors. CPLs $200–500.
  - Trigger to start: 1+ partner BD conversation booked (Cask 88, WhiskyInvestDirect, Vinovest equivalent).
  - Revisit: 2026-06-30

- **#13 Sponsored editorial / content studio**
  - Effort: 4 wks ops setup
  - Status: 40% built — AI drafting infra exists (`app/api/admin/content/generate-draft/`)
  - Why P1: Higher margin than display, sticky retention.
  - Trigger to start: spare editorial capacity OR a partner asking unsolicited.
  - Risk: editorial independence must be visibly protected (disclosure rules).
  - Revisit: 2026-06-30

### P2 — pursue Q3 (year-1 stretch)

- **#8 White-label comparison widgets (B2B SaaS)**
  - Effort: 4–6 wks tech + 12+ wks sales
  - Status: 50% built — `app/embed/` + `EmbedBuilder.tsx` exists
  - Why P2: Recurring SaaS revenue. Same content, 5× the surface area.
  - Trigger: 1 anchor B2B customer signed (bank, news site, or accountant network).
  - Bottleneck: B2B sales motion (new muscle).
  - Revisit: 2026-09-01

- **#15 Calculators-as-a-service / public API**
  - Effort: 4–6 wks
  - Status: 35% built — calculators exist, no API gateway
  - Why P2: Adjacent SaaS revenue, low engineering cost.
  - Trigger: 1+ fintech / accountant SaaS willing to pay metered.
  - Bottleneck: small market, free competitors.
  - Revisit: 2026-09-01

- **#11 Market-intelligence data product**
  - Effort: 8–12 wks technical + ongoing enterprise sales motion
  - Status: 40% built — PostHog event collection wired, no DW layer
  - Why P2: Becomes a moat once AI Q&A (#7) accumulates 6 months of question dataset.
  - Trigger: #7 has 6 months of data in production.
  - Risk: enterprise sales cycles are long; needs dedicated ICs.
  - Revisit: 2026-10-01

### P3 — year-2 candidates (validate before committing)

- **#14 Off-market property syndicate matchmaking**
  - Effort: 6–9 mo
  - Status: 0% — greenfield
  - Why P3: Real market (currently happens in dodgy FB groups). Big lift — KYC, deal vetting, standard syndicate paperwork.
  - Trigger: someone actively asks us to broker a syndicate match (organic demand signal).
  - Revisit: 2027-01-01

### P4 — revisit only if circumstances change

- **#12 Pre-IPO / private company secondaries marketplace (wholesale only)**
  - Effort: 6–9 mo + AFSL upgrade work
  - Status: 5% — only wholesale-classification mentions in CFD content
  - Why P4: Genuinely big upside ($50k–500k deals × 3–5% take). But standalone-company-sized bet, not a feature. **Spin-out candidate, not a roadmap item.**
  - Trigger: AFSL granted (late 2027), AND no AU competitor has emerged.
  - Revisit: 2026-10-01 (competitor scan), 2027-01-01 (AFSL milestone check)

- **Quote-auction pattern extension** (uses existing `app/quotes/` infra)
  - Idea: extend B2C advisor quote auction to other service verticals — accountants bidding for SMSF setups, brokers bidding for refi business, conveyancers bidding for property settlements.
  - Effort: 2–4 wks per vertical (infra exists)
  - Status: parent infra at `app/quotes/` is production
  - Why P4: Real revenue but each new vertical needs its own partner pool. Validate one extension before committing.
  - Trigger: 1 specific service vertical has 3+ providers asking to be on the platform.
  - Revisit: 2026-06-30 (with the alt-asset BD scan)

- **#10 Premium research subscription content programme**
  - Effort: ongoing content motion (Stripe + Pro tier infra is 90% built)
  - Status: plumbing complete (`lib/stripe.ts`, `app/pro/`); content is the gap
  - Why P4 (was higher): infrastructure means *anyone can flip the switch* but content production requires editorial bandwidth. Don't block on this; ship when capacity exists.
  - Trigger: editorial calendar has a clear premium-tier slot for 6+ consecutive months.
  - Revisit: 2026-07-01

### P5 — NEVER (unless the regulatory or market world changes)

These are explicitly **don't build** decisions. Captured so future Claude sessions don't waste time re-relitigating them.

- **#16 P2P "post your investment for bids" marketplace (AirTasker for assets)**
  - Why never: securities law (prospectus/PDS triggers, AFSL requirement); adverse selection (worst stuff lists fastest); listed-share version has no real market (broker sale takes 30 seconds at same price).
  - The narrower version that works is #12 (wholesale secondaries) — see P4.
  - Reactivation trigger: only if AU regulator carved out a specific safe harbour for P2P investment-asset marketplaces. Not on the horizon.

- **#17 Whisky / wine / art *auction house* (you running the auction)**
  - Why never: Langton's owns AU wine, Chrono24 owns global watches, Cask 88 owns whisky. Custody, settlement, fraud, dispute resolution = different business with thin margins.
  - The version that works is #6 (be the comparison + lead-gen layer) — see P1.

- **#18 Pure auction for placement (no editorial filter)**
  - Why never: ASIC RG 246 conflicted-remuneration risk; adverse selection (worst products bid hardest); premium partners walk.
  - The version that works is #5 hybrid auction — already in ship-now.

- **#19 Own financial product (co-branded ETF / savings / super)**
  - Why never (for now): become a financial product issuer with capital requirements + AFSL upgrade + board obligations + liability. Different company, not a feature.
  - Reactivation trigger: AFSL granted + 3+ years operating history + clear retail-investor demand for an own-brand product. Y5+ at earliest.
  - Revisit: 2027-12-01

- **#20 Crypto-aggressive affiliate plays (high-CPA leverage products, offshore deals)**
  - Why never: ASIC enforcement appetite on finance-site reputation. Asymmetric downside.
  - Existing crypto vertical at compliant CPA terms is fine; pushing harder is the trap.

- **#21 Display ads / programmatic**
  - Why never: kills UX, regulator dislikes them on financial-product sites, race-to-bottom revenue, hurts the brand asset.

- **#22 Events / annual conference**
  - Why never (for now): real money but operationally a separate business; one COVID-style disruption from disaster.
  - Reactivation trigger: core revenue >$10M ARR AND someone on the team wants to run events as a P&L.

- **#23 Robo-advice referrals at scale without disclosure rigour**
  - Why never: same RG 246 risk as pure auction. Existing robo vertical at compliant disclosure terms is fine.

---

## Parking lot (raw ideas, not yet evaluated)

Drop new ideas here as they come up. Evaluate when time permits — assign a priority (P1–P5) and move into the appropriate section above.

### 2026-05-09 — Visual content / rich-media upgrades to listings

Captured during conversation with Claude. Re-evaluate against the 6-month pre-launch window — most should ship.

- **App screenshot galleries** on `/broker/[slug]`, `/crypto/[slug]`, `/savings/[slug]`. 3–5 real screenshots per platform (login, trade, portfolio, fees, mobile/desktop). ~1–2 wks build (gallery component + admin upload + `ImageObject` schema). Quarterly maintenance ~30 min/platform. Real moat vs Canstar/Finder. **Provisional P1.**
- **Custom OG images per `/best/[slug]`** — extend existing `/api/og` to render category-specific imagery (top 3 platform logos + key stat). Almost free; existing infra. Drives social CTR. **Provisional P1, smallest build.**
- **Animated fee-impact visualisation component.** "$50k at 0.10% vs 0.30% over 10 years" — pure SVG/Canvas, no media production. Reusable across every fee page. Big trust signal. **Provisional P1.**
- **Annotated screenshots calling out fees / hidden costs / UX friction.** ~1–2 days/platform editorial. Highly shareable on Twitter/Reddit. Worth doing for top-10 platforms per vertical. **Provisional P2, editorial-bandwidth-bound.**
- **60–90s video walkthroughs.** Self-shot screencast + voiceover. Evergreen SEO + YouTube discovery. ~3–4h per video. **Provisional P2, depends on whether anyone will actually shoot them.**
- **3D scans of commercial property syndicate assets** (BrickX, DomaCom etc). Underlying platforms don't have these themselves. $500–1500/property × syndicate-property-churns-quarterly = negative ROI. **Provisional P5 — skip.**
- **Advisor video bios on profile pages.** 5–15% advisor uptake (supply problem). Selection bias toward camera-ready advisors. **Provisional P4 — defer until 1000+ active advisors.**
- **Office tour 360° photos for firm pages.** Same supply problem. **Provisional P5 — skip.**
- **Drone/aerial property shots, interactive floor plans.** You're not the source — platform is. Doesn't scale. **Provisional P5 — skip.**

**Next action:** stand up "OG" stream brief for the custom-OG-images sub-idea (smallest, highest cost-leverage, ~3–5 days cloud loop work). The screenshot gallery + fee-impact component are larger streams; brief them after OG ships.

### 2026-05-09 — Recruitment marketplace (firm ↔ advisor matching)

Evaluated in conversation. Reframe: not "recruiter search" but "firm-to-advisor lead-gen", reusing `marketplace_placements` + `advisor_credit_ledger` + `advisor_firm_invitations`. Two-sided cold start is the constraint (advisors didn't opt in to be recruited; needs explicit "open to roles" toggle). Sized at $500k–$2M ARR ceiling. **Provisional P3 — sit until QQ ships and at least one inbound from a firm asking to hire. Don't build founder-pushed.**

The narrower, cheaper variant: a "Careers" tab on `/firm/[slug]` profiles. ~half day. Reveals demand without a marketplace build. **Provisional P2 sub-task — bundle into a future firm-profile-improvements stream.**

### 2026-06-10 — News & community: lean in? (exploration, founder decision pending)

Founder asked whether to lean further into news + community (e.g. a News tab in
the top bar). Explored in conversation with Claude, grounded in the codebase.
Verdicts provisional until founder confirms.

**Grounding discoveries — most of it is already built, just unlit:**
- `/community` (Reddit-style forum: seeded threads, confessions/debate formats,
  RLS'd, index=true) and `/feed` (advisor insights feed) are LIVE but linked
  from **nowhere in the header**.
- Editorial (~740 pages: /articles, /learn, /how-to, /glossary) appears in the
  nav only as a sidebar block inside the Tools mega-menu — no top-level entry.
- Newsletter infra complete (segments, double opt-in, weekly + personalized
  digest crons); archive noindexed while empty. No `/news` route exists.

**Verdicts (provisional):**
1. **Traditional newsroom / News tab now: NO.** (a) Commodity treadmill vs
   AFR/Livewire/Stockhead, no data moat; (b) news monetises via display ads —
   explicitly NEVER (#21); (c) zero-click/AI Overviews eat news summaries first,
   counter to the GEO pivot (2026-05-21); (d) **pre-AFSL, market commentary
   ("analysts see upside") drifts from the s766B factual carve-out toward
   general advice** — widens the compliance surface exactly when it must stay
   narrow; (e) homepage was cut 24→13 sections today for bloat — adding a
   top-bar tab the same day cuts against that call.
2. **Data-news ("what changed today"): YES — this is our version of news.**
   Rate-change board / `/rates/today`, RBA-day + EOFY market-events calendar,
   fee-change log, IPO alerts. Proprietary (we already track fees/rates),
   factual (clean under the carve-out), GEO-citable, monetises through existing
   levers (affiliate + newsletter sponsor). = DAILY_ENGAGEMENT_IDEAS Tier 1
   #2/#6 + Tier 3 #18; the new `HomeMarketToday` band is the beachhead.
3. **Community: YES strategically — the real moat (UGC = content AI can't get
   elsewhere + retention) — but SEQUENCE it.** Pre-launch it's an empty
   restaurant, and thin UGC pages indexed during the Oct–Dec migration window
   add SEO risk at the worst possible moment. Seed supply-side first (advisor
   question-of-the-day, office-hours transcripts → Q&A pages), noindex threads
   below a quality threshold, promote to nav only post-cutover.
4. **Nav: no News tab.** The real gap is ONE consolidated top-level content
   entry ("Learn" / "Insights & Community") post-cutover, folding
   articles/guides/glossary/Q&A/community — not two new tabs.

**Sequencing:** now→Sep: data-news surfaces + Morning-Brief newsletter habit;
community stays soft-launched/expert-seeded. Oct–Dec: freeze new surfaces
(migration window). Q1 2027 (post-AFSL): commentary loosens (general advice
covered), open community posting wider, add the consolidated nav entry.

**Compliance tripwires if pursued:** market commentary pre-AFSL (above); UGC
moderation duty (existing classifyText pipeline + house rules; specific-security
"should I buy X" threads are the hot zone — ASIC INFO 269 finfluencer context);
never let community pool money or drift toward execution (avoid-list).

**Revisit:** 2026-07-10 — founder verdict on sequencing; if agreed, brief the
data-news stream (rate-change log + `/rates/today`) as the first build.

**Update (same day):** founder asked for the full community plan → written to
`docs/plans/COMMUNITY_MASTER_PLAN.md` (positioning, 5 phases, UX spec, cold-start
playbook, metrics/kill criteria, 6 founder decisions). **Two P0 findings from the
code audit:** (1) community thread/post POSTs run **zero text moderation** —
everything auto-publishes onto indexed pages (article comments and Q&A are
moderated; the forum is not); (2) the seed migration **inflates reply/vote
counters** beyond actual seeded rows (same ACL s18 family as the fabricated
counter killed in #1489). Plan's Phase 0 fixes both schema-free (migration
ledger still frozen). These two are worth fixing even if community is never
promoted.

**Update 2 (same day) — founder said "do it all"; Phase 0 BUILT on PR #1493:**
publish gate (classifyText, new forum surfaces) on thread/reply POSTs with
held-for-review path into forum_reports; `/admin/community` queue
(approve/remove/dismiss + live-row recounts); kill switch + hold_all raid dial;
expert-answer elevation + licence-mode-aware adviser CTA on threads (the
user-asks→expert-answers wire into the lead funnel); per-thread noindex until
pinned/voted/expert-answered (migration protection); reply notifications;
composer held-state + advice-phrasing nudge; /community/guidelines; footer
link; PostHog gate events; DML-only counter-reconciliation script (run
post-merge: `npx tsx --env-file=.env.local scripts/community-reconcile-counters.ts`
— also seeds the Ask-an-Advisor category). 101 tests green, tsc/eslint clean.
**Next up (Phase 1):** advisor quick-post UI + follow button (tables exist,
no UI), QotD ritual + 24h Research-Team SLA (needs founder call on §11 D2/D3),
confessions composer bug (`?thread_type=` ignored — Confess CTA makes a
normal thread).

**Update 3 (same day) — "continue": Phase 1 grounding + increment 2 shipped.**
Grepping before building (again the lesson): quick-post composer
(`advisor-portal/FeedTab.tsx` → `/api/advisor-auth/posts`), Follow button
(`components/FollowAdvisorButton.tsx` on advisor profiles, follower_count
live) and `/feed` All/Following tabs **already existed** — the master plan's
1.2/1.3 were stale-scoped from the June audit; corrected in place. What was
genuinely missing, now shipped on #1493: (1) **advisor posts had NO publish
gate** (same hole as the forum, worse optics — authoritative voices) →
`classifyText` with new `advisor_post` surface; non-clean verdicts bounce
with the specific rule (RG 170 forward-looking message) rather than a hidden
hold; (2) **follower notifications** — follows previously had zero pull;
publishing now fans out capped (500) deduped announcements to followers;
(3) confessions composer fixed (`?thread_type=` honoured, anonymity toggle,
confession banner). Remaining genuinely-unbuilt Phase 1: QotD + 24h SLA
(founder §11 D2/D3), article→thread cross-links, newsletter community-digest
block, Founding-Experts BD motion.

---

### 2026-06-11 — The 25 mega-sessions: pure-code compounding-value backlog

Brainstormed list of self-contained builds (each one Claude session, no founder input, no new licences, no schema): the agreed execution order is **top-down**. Status tags maintained here as sessions complete.

1. **Adviser Register Atlas** (`/adviser-register`) — ✅ SHIPPED #1545. Claim-CTA loop into /advisor-apply; awaiting real FAR extract (`npm run data:far` wherever egress is open; bundled data is noindex'd synthetic preview until then).
2. **Super Fund Performance Explorer** (`/super/funds`) — ✅ SHIPPED #1546. Same file-backed pattern; awaiting APRA extract (`npm run data:apra -- --file <csv> --period "..."`).
3. **ASX Ghost Tickers** — programmatic pages for every delisted/renamed ASX code ("what happened to X?"); high-intent orphaned searches, links into broker comparison.
4. **Postcode Wealth Atlas** — ABS/ATO open data per postcode (median income, super balances, property): 2,600 pages feeding suburb guides + advisor directory by location.
5. **Franking-credit encyclopedia** — per-ASX-200-stock dividend/franking history pages off announcements data.
6. **ETF overlap matrix** — pairwise holdings-overlap pages for the ~40 most-held ASX ETFs ("VAS vs IOZ: 96% overlap — don't hold both").
7. **Fee-drag calculator pages** — programmatic "cost of 1% over 30 years at $X" pages per balance band; internal links from every fund/broker page.
8. **Glossary cross-language expansion** — the 8 locales × glossary terms as indexable pages (the i18n registry exists).
9. **Historical broker-fee tracker** — date-stamped fee snapshots (the data already accrues in git history of site-data) rendered as per-broker fee-history pages.
10. **"Is X regulated?" checker pages** — AFSL/ACL/unlicensed status pages for every entity in the AFSL register cache.
11–25. (lower-confidence ideas — regenerate from this list's spirit when reached: state-by-state stamp duty matrices, visa-by-visa investment right pages, SMSF cost benchmarks by balance, dividend calendar pages, broker outage log, term-deposit ladder builders, CGT scenario library, currency-corridor remittance pages, super contribution deadline pages, advisor fee benchmarks by region, FIRB application timeline tracker, bond yield explainers, IPO archive, LIC NTA discount tracker, robo-advisor comparison matrix.)

**Loop status (2026-06-11 PM session):**
- #6-as-attempted (AFSL permalinks): already existed (parallel session) — shipped the Atlas↔AFSL adviser cross-link instead (#1551, merged).
- #9 (broker fee-history): already exists — `broker/[slug]/changelog` + `broker_data_changes` + market-pulse cover it. Marked done.
- #8 (glossary i18n): deferred — 195 terms × 3 locales of hand-authored translations; needs founder sign-off on translation approach before it's worth building.
- CGT scenario library (from the 11–25 tail): ✅ SHIPPED — 18 prerendered worked-example pages at `/cgt-calculator/[scenario]` over the existing `computeCgt` engine; pure math, live immediately, same posture as fee-drag.
- Remaining buildable-without-data items are thinning; most of the tail now waits on founder-run ingests (the four `data:*` commands) or founder decisions.

**Pattern established (#1, #2):** file-backed JSON in `data/` + typed lib loader + alias-driven CSV ingest script + hub/detail ISR routes + synthetic preview with `meta.sample` → banner + noindex until real extract lands → one-command hydration, ships as PR diff. Egress from build sandboxes is blocked for AU data portals — run ingests locally.

## Open commitments / revisit-by dates

Time-bound items that need a check-in at a specific date. Don't delete — strike through and timestamp when resolved so we keep the trail.

- **2026-05-16 — Quiz funnel post-deploy review.** PR #434 (quiz outcome resolver, post-results email capture, vertical drips, sponsor-boost vertical-aware) shipped 2026-05-02. Estimated +35–50% end-to-end conversion lift; ground truth requires 14 days of PostHog data on `quiz_outcome_primary_cta` distribution + `quiz_lead_capture` rate + drip open/CTR. Compare actuals vs estimate in this notebook on revisit. Remote-trigger scheduled.
- **2026-05-09 — Test-posture readiness call.** Currently B-grade: ~71% lib coverage, ~14% API-route line coverage, ~~38 TypeScript errors in test files~~ **TS errors closed by audit-remediation loop — `tsc --noEmit` exits 0 on main as of 2026-05-02 PM (verified)**, 228 untested API routes. Realistic enterprise-grade timeline ~4–6 focused weeks; pre-launch must-do is now just **golden-flow Playwright E2E lockdown** (T-TESTS-02, ~1 week — `__tests__/e2e/` directory currently doesn't exist). Decide on a Friday whether to dedicate a sprint to it.
- **Drip cron kill-switch.** `abandoned_quiz_drip` is gated by `isFeatureDisabled('abandoned_quiz_drip')` (per `lib/admin/classifier-config`). The 27 vertical drip templates shipped in PR #434 sit dormant until flipped. Estimated +1–2% sitewide conversion uplift when enabled. No revisit date — flip when you're ready for the lead volume.

---

## Resolved / shipped

Move items here once they ship OR are formally killed. Don't delete — keep the trail so we can see what we built and what we walked away from.

- **2026-06-06 — Batch security + feature merges (mega-session continuation).**
  Six PRs merged in a single pass during the `/goal do all to high quality` session:
  - **#1409 P0 security** — owner-scope RLS on `broker_wallets`, `wallet_transactions`, `marketplace_invoices`. `USING (true)` gave every authenticated user all broker Stripe/PII data via PostgREST; replaced with per-broker-slug + is_admin() guard. 6 regression tests.
  - **#1411 quiz server-side scoring** — moved all `quiz_weights` reads server-side (service-role); stripped `select("*")` on `/api/quiz/data` that was leaking `cpa_value`/`affiliate_priority` etc. to every quiz visitor. New `/api/quiz/score` endpoint.
  - **#1413 wealth-stack fields** — stripped commercial broker columns (`cpa_value`, `monthly_sponsorship_fee`, `affiliate_priority`) from `/api/wealth-stack` public response. Followed #1408's lead.
  - **#1414 versus_votes table** — created the missing `versus_votes` table (every `/versus/*` vote widget was 500ing). Closed the HELD #1317.
  - **#1415 revenue-summary + schema-drift** — admin revenue summary made resilient to missing `broker_campaigns`; schema-drift audit of 31 phantom tables documented.
  - **#1416 cron-health docs** — documents the ~13-day Vercel account blockage that left the cron fleet dark.
  - **#1422 NF-20 SMS consent** — OPEN, CI running. Superseded conflicting #1180.
  - **#1421 credit-ledger CAS fix** — OPEN, CI running. Fixes optimistic-lock retry dead predicate.
  - **#1412 quiz_weights lock** — waiting for #1411 Netlify deploy to complete before merge.

- **2026-06-06 — Bot fleet infrastructure: full suite shipped.** Completed in mega-session (context ~2 windows). All of the following are on `main`:
  - **Performance baseline** (`bots/checks/perf.ts`): Navigation Timing + FCP + JS heap captured after every `visit()`, written to `perf-baseline.json` per run.
  - **JSON-LD schema drift detection** (`bots/checks/schema-markup.ts`): every `<script type="application/ld+json">` block validated against required fields per type — critical for GEO/AI citability.
  - **Startup ecosystem flow** + **Advisor portal flow** (`bots/flows/startup-portal.ts`, `bots/flows/advisor-portal.ts`): 5-step scripted regressions for each.
  - **CI smoke gate** (`.github/workflows/bots-pr-smoke.yml`): runs advisor/startup flows on PRs touching those paths, posts advisory comment, never blocks merge.
  - **Auto GitHub issue filer** (`scripts/bots-file-issues.ts`): deduplicates open issues, files one per Critical/High finding; opt-in nightly via `BOTS_AUTO_FILE_ISSUES=1`.
  - **Cross-run regression diff** (`scripts/bots-diff-baseline.ts`, `npm run bots:diff`): compares any two `findings.json` using stable ID hashes; surfaces new/resolved/stable/occurrence-change; exits 1 on critical/high regressions; 16 unit tests.
  - **API surface probe** (`scripts/bots-probe-api.ts`, `npm run bots:probe-api`): enumerates 403 GET handlers, probes 186 non-admin/non-cron static routes against the mirror; found 5 server errors on first run (see DISC-20260606 in REMEDIATION_QUEUE); writes `bots/.runs/latest-api-probe.json`.
  - Live runs: two full mirror runs executed. First probe found React hydration error #418 on every page (cross-cutting Netlify mirror issue), advisor portal login form missing inputs, and 5 API 500s. Diff script confirmed 12 new findings, 16 resolved between runs.

- **2026-05-02 — Quiz funnel rebuilt.** PR #434 shipped: 7-outcome resolver (post-job, advisor-match, advisor-browse, calculator-first, education-first, diy-broker, bundle-stack) replaces binary DIY-vs-advisor track; email gate moved post-results (warm capture); 12 structured columns added to `quiz_leads`; 9 vertical drip-template variants × 3 steps = 27 drip templates; `applyQuizSponsorBoost` is vertical-aware (no crypto-sponsor over super result); `/quotes/post` prefills from quiz handoff. Migration applied to prod (project `guggzyqceattncjwvgyc`), 125 tests passing, all 25 CI gates green. Squash commit `f1d2017c` on main. Co-author Claude Opus 4.7.

- **2026-05-02 — Tracker reality-audit findings.** Two queue items I was about to scope as fresh work were already done:
  - **T-TESTS-01 (38 TypeScript errors in test files):** closed by the audit-remediation loop. `tsc --noEmit` exits 0 on a fresh main pull. The project gotcha note in `MEMORY.md project_test_typescript_drift` is stale and should be cleared. Pre-launch must-do is now just **T-TESTS-02 (golden-flow Playwright lockdown)** since `__tests__/e2e/` doesn't exist yet.
  - **Cross-border specialty taxonomy (FIN_NOTEBOOK 2026-05-01 backlog #24):** shipped in `lib/advisor-specialties.ts` lines 122–138 with all 5 specialties wired into the relevant advisor types. Phase A's remaining engineering scope is just (a) premium 1.75× pricing in `lib/advisor-billing.ts` and (b) country-page CTA filter wiring. Persona selector + DASP calc + homepage rewrite are design/copy, not engineering.
  Lesson — don't scope from queue/notebook entries without grepping the code. Two parallel agents (audit-remediation loop + a-stream backfill PRs) close items faster than the trackers update.
