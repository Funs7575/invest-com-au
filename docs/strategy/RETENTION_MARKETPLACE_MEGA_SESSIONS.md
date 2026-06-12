# 25 Retention & Marketplace Mega-Session Opportunities

**Generated:** 2026-06-11 · **Scope:** logged-in UX, marketplace economy, adviser workflows, retention loops.
**Method:** fresh full-codebase read (app routes, lib, components, all migrations + baseline schema). Every idea below was verified ABSENT from the live codebase (evidence noted inline), and none is a variant of the 25 excluded ideas.

**Ground truth used (what already exists, so these ideas don't rebuild it):** briefs with credit-debited accepts + per-brief Realtime chat (`brief_messages`), public quote auctions with visible bids (`advisor_auctions`/`advisor_auction_bids`), disputes + manual refunds, one-shot outcome forms (`brief_outcomes`), advisor tiers $0/$49/$149/$499 + credit ledger + dynamic lead pricing rules (`lib/dynamic-pricing.ts`), firm accounts + invites (no routing), advisor health score/benchmarks/completeness, consumer account suite (goals, holdings + Sharesight, net-worth, health score, decision inbox, vault, watchlist, rate alerts, annual check), Investor Pro $9/mo, forum + clubs + courses + office hours + advisor posts/follows, web push for consumers, AI brief copilot (flag-gated), partner data widgets.

---

### 1. Standing Orders & Instant Match — Category: Revenue

**The idea:** Advisers define standing rules — "auto-accept any SMSF brief in NSW, budget ≥ $5k band, up to 40 credits, max 5/week" — and matching briefs are claimed for them the second they pass admin review. Consumers see "Matched in 90 seconds."

**Why it's brilliant:** Response latency is the #1 marketplace KPI and the agents confirmed there are no saved brief filters, no auto-accept, and no brief alerts (`lib/marketplace/auto-bid.ts` is broker ad CPC bidding, a different domain). Standing orders convert adviser demand into guaranteed instant liquidity and turn credits into a recurring, budget-like spend — the AdWords moment for this marketplace. Finder/Canstar have no brief inventory to run rules against.

**What gets built:** `advisor_standing_orders` table (professional_id, filter jsonb: types/states/budget bands/templates, max_credits_per_lead, weekly_cap, paused_until, status). Evaluation hook where briefs become inbox-visible (brief create/approve path in `app/api/briefs/*`), executing the existing accept path: debit `advisor_credit_ledger` via `getAcceptCost()` + `lib/dynamic-pricing.ts`, unlock contact, open chat. Portal UI: new "Standing orders" panel in `app/advisor-portal/briefs` (rule builder, spend caps, activity log, instant pause). Respect `availability_status`, add a kill-switch feature flag, confirmation emails via `lib/advisor-emails.ts`, admin oversight card in `app/admin/marketplace`.

**Revenue or moat payoff:** Predictable credit consumption (rules drain budgets without manual sessions), near-zero response times to advertise on the consumer side, and a reason for advisers to top up before they have leads.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "accept_credits_cost|getAcceptCost" lib app/api --type ts`

---

### 2. The Response Guarantee Engine — Category: Product

**The idea:** A hard SLA with teeth: if an adviser accepts a brief and doesn't send a first message within 24h, credits are auto-refunded, the brief is re-broadcast to the next eligible advisers, and the adviser takes a ranking strike. Stale unaccepted briefs auto-recirculate with widened routing. Consumers see a "24-hour response guarantee" badge before posting.

**Why it's brilliant:** Agents confirmed refunds exist only via manual disputes, there is no auto-clawback, no escalation waterfall, and reopening stale quotes is manual. Guarantees are how two-sided marketplaces bootstrap demand-side trust pre-launch — and the enforcement loop (strikes → ranking via `lib/marketplace-ranking/`) makes the whole supply side faster without human ops.

**What gets built:** `brief_sla_events` table; cron `app/api/cron/brief-sla-sweep` (gated by `checkAutopilotGate`) that detects accepted-but-silent briefs (join `advisor_auctions` × `brief_messages`), reverses the ledger entry, notifies the consumer, re-broadcasts excluding the offender; second sweep widens `brief_routing_rules` for 72h-unaccepted briefs and sends a "still looking?" confirmation. Strike counter feeding `lib/advisor-trust-score.ts` and `lib/advisor-response-time.ts`; guarantee badge on `app/briefs/new` and advisor profiles; enforcement dashboard wired into the existing `app/admin/automation/sla` monitor.

**Revenue or moat payoff:** Higher brief-post conversion (trust), higher effective response rate (the metric advisers are sold on), fewer support tickets, and a marketing claim competitors structurally can't make.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "resolved_for_consumer|refund" app/api/admin/disputes lib/disputes`

---

### 3. The Money Profile — one profile that pre-fills everything — Category: Product

**The idea:** A single saved financial profile (age band, state, income band, super/portfolio bands, goals, current broker, risk comfort) that pre-fills all 40+ calculators, every quiz, brief intake, and comparison filter — with every tool offering one-tap "save back to profile."

**Why it's brilliant:** The account agent confirmed calculator state is per-calculator with no cross-site prefill — every tool starts blank even for logged-in users with rich `investor_profiles`. This is the single highest-leverage retention primitive: each visit makes the next visit better, and pre-filled briefs are objectively higher-quality leads (which `lead_quality_weights` already prices). Finder/Canstar can't do this without an account ecosystem.

**What gets built:** `lib/money-profile.ts` — typed merge of `investor_profiles` (+ meta jsonb), `manual_balances`, holdings totals, `fee_profiles`-style broker usage, and `lib/quiz-profile.ts`; a `useMoneyProfile()` hook; integration into `components/CalculatorShell.tsx` so every shell-based calculator gets prefill + a "prefilled from your profile — edit" chip; write-back prompts on calculator results; prefill in `BriefForm`, find-advisor quiz, and get-matched; profile-coverage meter on `/account/dashboard`. Mostly existing tables (extend `investor_profiles.meta`).

**Revenue or moat payoff:** Session depth and repeat usage compound; brief/lead quality (and therefore lead pricing) rises; the profile becomes the personal-data moat Finder's logged-out tools can never match.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "user_calculator_state|useCalculatorState" lib components -l`

---

### 4. Brief Trust Centre ("who's seen my brief") — Category: Product

**The idea:** A live activity trail on the consumer's brief tracker: "14 advisers viewed · 3 eligible in your area · median first response for SMSF briefs: 6h", plus message read-receipts and push/email pings when an adviser views or shortlists their brief.

**Why it's brilliant:** Confirmed absent — "No view counters or 'X pros viewed this'. No activity log." Posting a brief is an act of faith into a void; visible demand-side activity is the classic marketplace trick (Airbnb's "viewed 12 times today") that makes users return daily during their search window — the exact week they're most valuable.

**What gets built:** `brief_views` table; instrument the masked-inbox fetch (`app/api/briefs/inbox`) and brief detail views to log professional_id × brief_id; upgrade `app/briefs/[slug]` tracker with an activity timeline component (`components/briefs/`), response forecast computed from historical `advisor_auctions` accept-time stats, surfaced read receipts (`brief_messages.read_by_pro_at` already exists); dispatch via `lib/push-dispatch.ts` + `user_notifications`. Anonymise viewers below acceptance (count + specialty only).

**Revenue or moat payoff:** Demand-side retention during the highest-intent week, more briefs completed instead of abandoned, and behavioural pressure on advisers (viewed-but-ignored stats feed ranking).

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "MaskedBrief" lib app --type ts -l`

---

### 5. Engagement Registry + the Annual Adviser Review — Category: Revenue

**The idea:** Track the relationship after the match: a registry seeded from accepted briefs with 30/90/365-day one-click check-ins ("met them / engaged / ongoing / ended"), culminating in an annual adviser review — and a pre-filled, anonymous re-brief for anyone unhappy.

**Why it's brilliant:** Confirmed: "Outcome review is one-time… No 're-match' or annual review loop. No ongoing relationship status." Advice relationships churn ~every 3-5 years; whoever owns the review moment owns the re-match. This converts a one-shot lead business into a recurring relationship platform, and the longitudinal outcome data (did engagements last?) becomes ranking fuel nobody else has. General-advice framing only — "compare your options" not "you should switch."

**What gets built:** `engagement_registry` table (user_id, professional_id, brief_id, status, started_at, last_checkin_at); seed from accepted `advisor_auctions` + `brief_outcomes` submissions; check-in cron (extend the outcome-email pattern in the existing outcomes cron) sending tokenised one-click status links (reuse `app/outcome/[token]` patterns); `/account/advisers` page listing relationships; annual review flow (rating, fee band paid, "considering a change?") feeding `provider_outcome_scores`; unhappy path → `/briefs/new` pre-filled anonymised re-brief. Adviser portal gains a retention stat.

**Revenue or moat payoff:** Second-bite lead revenue from the same user years later, verified-tenure data that makes reviews and rankings unfakeable, and a reason accounts stay alive between transactions.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "brief_outcomes|review_token" lib app/api --type ts -l`

---

### 6. Household Workspaces (couples plan together) — Category: Product

**The idea:** Invite a partner into a shared household: combined net-worth, shared goals, shared watchlist, joint briefs ("we're looking for a financial planner"), with per-item visibility controls.

**Why it's brilliant:** Confirmed: `account_type: "couple"` is a copy-routing label only — "no shared goals, holdings, watchlist, joint briefs, or partner invitations." Most advice-seeking moments (first home, kids, retirement) are made by couples, yet every comparison site treats users as individuals. Two engaged users per household ≈ double retention, and joint briefs are demonstrably higher-intent leads advisers will pay more for.

**What gets built:** `households` + `household_members` (role, invited_email, token, status) tables; nullable `household_id` on `investor_goals`, `manual_balances`, `user_watchlist_items` with RLS policies granting member reads; invite/accept flow (email token → `/account/household/accept`); household toggle in the existing `WorkspaceSwitcher.tsx` + `lib/account-kinds.ts`; combined views in `/account/net-worth` and `/account/goals`; "post as household" option in `BriefForm` (both members get tracker updates). Migration ships RLS isolation tests (`audit:rls-isolation`).

**Revenue or moat payoff:** Viral in-product invite loop (each user recruits one more), stickier accounts (leaving means dismantling shared state), and premium-priced joint leads.

**Effort:** L

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "account_type" lib/investor-profiles.ts app/account`

---

### 7. Open to Offers — the reverse marketplace — Category: Revenue

**The idea:** Users who finish a quiz or profile can flip one switch: "Let vetted advisers pitch me — anonymously." Advisers browse anonymised prospect cards (goals, state, budget band, timeline) and spend credits to send one structured pitch; the user accepts to reveal contact and start a chat, or declines silently.

**Why it's brilliant:** Greps confirm no open-to-offers/pitch mechanic exists anywhere. Most quiz completers never write a brief — this monetises the silent majority with zero extra effort from them, and it's the LinkedIn-recruiter model advisers already understand. Strict caps keep it premium. Credits stay flat B2B fees (no client money, per the regulatory lean lane).

**What gets built:** `prospect_pool` (user_id, anonymised snapshot jsonb, status, expires_at) + `advisor_pitches` (professional_id, prospect_id, body ≤300 chars, fee_estimate band, credits_cost, status) tables. Opt-in toggles after quiz results and on `/account/dashboard`; "Prospects" tab in `app/advisor-portal/marketplace` with filters + pitch composer (price via `lib/dynamic-pricing.ts`); consumer pitch inbox in `/account/notifications` + email; accept → converts to a brief-equivalent with chat (`brief_messages` pattern); caps (≤3 pitches/user/month, auto-suppress on decline), kill-switch flag, moderation hooks via `lib/text-moderation.ts`.

**Revenue or moat payoff:** A second credit-spending surface advisers check daily, monetisation of the 90% of users who never post briefs, and pitch-acceptance data that sharpens matching.

**Effort:** L

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "scoreQuizAdvisors|investor_profiles" lib/find-advisor lib/quiz-profile.ts`

---

### 8. Adviser Push Command Centre (PWA) — Category: Infrastructure

**The idea:** Web-push for the supply side: advisers install the portal as a PWA and get actionable push notifications — new matching brief (with Accept action), new consumer message, dispute opened, SLA countdown at T-4h — answerable from a phone lock screen.

**Why it's brilliant:** Push infra (`lib/vapid-jwt.ts`, `lib/push-dispatch.ts`, `public/sw.js`, `push_subscriptions`) is live for consumers, but agents confirmed advisers get email + webhooks only — "no in-app push or notification bell." Advisers are out seeing clients all day; the marketplace whose advisers respond from their pocket wins every speed comparison, and it compounds ideas #1/#2.

**What gets built:** Extend `push_subscriptions` with `owner_kind`/`professional_id` (or sibling table); opt-in UI in the advisor portal shell (reuse `PushNotificationOptIn.tsx` pattern against `advisor_sessions` auth); dispatch hooks at brief-inbox eligibility, `brief_messages` insert, dispute open, and SLA sweep warnings; notification actions in `sw.js` (`notificationclick` → deep link, Accept action hitting the accept API with session check); portal manifest scope + unread badge counts; per-event preferences in the existing advisor notifications API.

**Revenue or moat payoff:** Response-time medians drop from hours to minutes — the stat that sells tier upgrades and justifies lead prices; also the prerequisite plumbing for #1 and #2 alerts.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "dispatchPushToUser|push_subscriptions" lib app -l`

---

### 9. The Advice Fee Benchmark + "Is this quote fair?" — Category: Quality

**The idea:** Turn the marketplace's own quote corpus into Australia's only real advice-price benchmark: medians and ranges by service type × state, shown publicly, inside the quote-review flow ("this bid is in the 35th percentile for SMSF setup in NSW"), and to advisers ("you price above 70% of peers").

**Why it's brilliant:** Confirmed absent: no crowdsourced or corpus-derived fee data exists (`/quotes/recent-wins` is social proof only; `fee_*` tables are broker product fees). Advice fees are notoriously opaque; ASIC surveys are stale aggregates. This benchmark is generated by the marketplace's own bid flow — Finder/Canstar cannot copy it without first building a quote marketplace. It is marketplace-exhaust data, not a public-dataset stats hub.

**What gets built:** `lib/fee-benchmark.ts` aggregating won/active `advisor_auction_bids`, brief budget bands, and `consultations` prices with suppression below n=8 per cell; public page `app/advice-fees` (type × state matrix, IQR bands, freshness stamps, `GENERAL_ADVICE_WARNING` from `lib/compliance.ts`); inline percentile chip in `app/quotes/[slug]/review` and the consumer bid list; adviser-side pricing-position card in portal analytics. Cache via `lib/request-cache.ts`; JSON-LD via `lib/schema-markup.ts`.

**Revenue or moat payoff:** A citable, linkable data asset that compounds with every auction (data moat + organic links), higher quote-acceptance confidence (faster conversions), and pricing pressure that keeps the marketplace honest.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "bid_amount" lib app --type ts -l`

---

### 10. Brief Dossiers + Bid Coach — Category: Revenue

**The idea:** Every masked brief in the adviser inbox arrives as an intelligence dossier: postcode context from in-house `suburb_data`/`au_postcodes`, quality band, "briefs like this accept in a median 6h at $X budget," plus the adviser's own win rate on similar briefs and a suggested response window.

**Why it's brilliant:** All the raw data already exists in-house (suburb data, bid history, `lead_quality_weights`, `advisor_metrics_daily`) but agents confirmed nothing synthesises it at the point of bid/accept decision. Enriched leads *feel* premium — which supports the dynamic-pricing multipliers already built — and win-rate feedback turns bidding from gambling into a skill loop advisers return for daily.

**What gets built:** `lib/brief-intel.ts` (pure composition + cached reads): postcode/suburb enrichment, similar-brief stats from `advisor_auctions` history, per-adviser category win rates from `advisor_auction_bids`, quality band display; dossier panel in `BriefsInboxClient` and the auctions bid screen; "Bid Coach" sidebar (suggested response time, your win rate, category averages — extending the existing marketplace-analytics endpoint); optional flag-gated AI one-paragraph summary reusing the `/api/briefs/ai-copilot` pattern.

**Revenue or moat payoff:** Justifies higher accept costs and tier upgrades, raises bid quality (better consumer experience), and makes the inbox a daily scouting habit.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "suburb_data|au_postcodes" lib -l`

---

### 11. Sealed Bids, Best-and-Final & Counter-Offers — Category: Product

**The idea:** Richer auction mechanics: consumers choose sealed bidding (bids hidden until close), can trigger a 24h best-and-final round among their top 3, and can counter-offer any single bid ("would you do it for $2,200?").

**Why it's brilliant:** Confirmed: "Sealed bids — NO (all visible). No counter-offers or negotiation — bids are static." Open bids anchor low and stop early; sealed + final rounds extract honest pricing and dramatically increase adviser engagement (everyone gets a second chance instead of losing silently). This is auction-theory leverage no comparison site has because none of them runs auctions.

**What gets built:** Auction options on `app/quotes/post` (sealed flag, round support); `round_number`, `revealed_at`, counter columns on `advisor_auction_bids` (or `bid_rounds` table); reveal-at-close job; consumer controls on `app/quotes/[slug]` (start final round, counter a bid with accept/decline for the adviser); adviser UX in `app/advisor-portal/auctions` (sealed indicator, final-round alerts via #8 push, counter inbox); email notifications via `lib/quote-emails.ts`; mechanism explainers + compliance copy (fees are the adviser's own — platform never clips consumer→adviser money).

**Revenue or moat payoff:** More bids per auction (liquidity), better prices (consumer trust → word of mouth), and a second engagement spike per auction for advisers.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "advisor_auction_bids" app/api -l`

---

### 12. First-Party Scheduling v2 (picker, ICS, reminders) — Category: Product

**The idea:** Finish the booking stack the platform half-owns: a visual availability editor for advisers, a real slot-picker for consumers (on profiles and inside brief chat: "propose times"), ICS calendar attachments, 24h/1h email+push reminders, reschedule/cancel links, and no-show tracking.

**Why it's brilliant:** `advisor_booking_slots`/`advisor_booking_appointments` exist but agents confirmed: no visual picker, no ICS anywhere in the codebase, no reminders, no reschedule, advisers paste Calendly links. Every Calendly handoff leaks the relationship off-platform and blinds the marketplace to its most important conversion event (the first meeting). No-show data also feeds outcome scoring.

**What gets built:** `lib/ics.ts` (pure RFC 5545 string builder — no dependency); weekly availability editor in the portal (writes `advisor_booking_slots`); consumer slot-picker component on `app/advisor/[slug]` and a "propose times" action in `BriefChatPanel`; reminder cron (email via `lib/resend.ts`, push via `lib/push-dispatch.ts`); tokenised reschedule/cancel routes; `no_show`/`completed` marking that feeds `lib/advisor-response-time.ts` and the engagement registry (#5). Booking stays free — no payment intermediation.

**Revenue or moat payoff:** Meeting-completion rate becomes a measurable, improvable funnel stage; bookings stay on-platform (attribution + data moat); kills a per-adviser SaaS dependency, making the portal stickier.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "advisor_booking" lib app/api -l`

---

### 13. Firm Lead-Ops: routing policies + per-seat billing — Category: Revenue

**The idea:** Real multi-adviser operations for firms: automatic lead distribution (round-robin, load-balanced, or specialty-mapped), assignment audit trail, manager console with per-member SLAs, and Stripe quantity-based per-seat billing.

**Why it's brilliant:** Confirmed: firms exist (`advisor_firms`, invitations, 10-seat default) but "NO round-robin / automatic lead distribution — manual dropdown only" and "NO per-seat monthly fee." Firms are the highest-LTV supply segment, and they buy *workflow*, not listings. Per-seat billing is the standard SaaS expansion lever this revenue model is missing.

**What gets built:** `routing_policy` jsonb + settings on `advisor_firms`; auto-assignment in the lead-create/brief-accept path (extend `/api/advisor-portal/firm-leads` write side) with `lead_assignments` audit rows; manager console upgrades in the portal firm tab (per-member response/win stats from `advisor_metrics_daily`, reassignment rules, vacation handling via `availability_status`); per-seat Stripe subscription items in `lib/firm-billing.ts` + webhook handling in `lib/stripe-webhook/`; seat-request flow upgraded from ops-manual to self-serve checkout.

**Revenue or moat payoff:** Expansion revenue (seats × $), firms consolidating their intake on the platform (defensibility), and faster firm-side response times from automatic distribution.

**Effort:** L

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "advisor_firms|firm-leads" lib app/api -l`

---

### 14. Adviser Follow-Up Autopilot (CRM sequences) — Category: Revenue

**The idea:** Per-lead tasks, due-date reminders, and editable follow-up sequences (day-0 intro, day-2 nudge, day-7 close) sent as platform emails with the adviser's reply-to — plus a kanban pipeline view and a daily "due today" digest/push.

**Why it's brilliant:** The portal CRM is confirmed thin: "notes + stage dropdowns only; no tasks, no follow-up reminders, no sequences, no kanban." Most leads die from adviser silence after day 1, not from bad matching — automated persistence directly lifts the win rates that make advisers renew. And sequenced comms running through the platform keep conversation data on-platform.

**What gets built:** `lead_tasks` + `lead_sequences`/`lead_sequence_steps` tables; template editor with merge fields (sanitised via `lib/sanitize-html.ts`); send engine on the existing Resend rails with suppression-list respect; kanban upgrade of `LeadsTab` in `app/advisor-portal` (columns = existing 6 stages, drag to move); due-task digest cron + push via #8; sequence-performance stats (reply/win deltas) in the analytics tab from `advisor_metrics_daily`.

**Revenue or moat payoff:** Higher lead-to-client conversion → higher willingness-to-pay per credit and tier upgrades; the portal becomes the adviser's daily operating tool rather than a place they check weekly.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "tracker_status|LeadsTab" app/advisor-portal lib -l`

---

### 15. The Decision Kit (choose between respondents) — Category: Product

**The idea:** Once bids/responses arrive, give consumers a structured way to decide: a respondent comparison matrix (quotes, trust score, response speed, verified outcomes side-by-side), printable intro-call question scripts per service type, post-call scorecards, and a weighted final summary that writes to their decisions journal.

**Why it's brilliant:** `AdvisorCompareMatrix` exists only for directory browsing — agents confirmed nothing helps users compare *the specific advisers who responded to them*, and there's no interview/scorecard layer at all. The choose-a-stranger-for-your-life-savings moment is the scariest step in the funnel; structure here converts stalled auctions into engagements — and the scorecard corpus becomes unique decision data.

**What gets built:** Respondent matrix on `app/briefs/[slug]` and `app/quotes/[slug]/review` (compose `advisor_auction_bids` × `lib/advisor-trust-score.ts` × `provider_outcome_scores` × response stats); per-service interview scripts (code-defined content modules); `respondent_scorecards` table + scorecard UI (criteria ratings + notes per call); weighted decision summary; completion writes to the existing decisions surface (`lib/decision-inbox.ts` source) and seeds `brief_outcomes`. Hook "book intro calls with your shortlist" into #12.

**Revenue or moat payoff:** Higher auction completion (the revenue event), faster time-to-decision, and proprietary "why they chose" data that improves ranking and matching.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "AdvisorCompareMatrix|brief_shortlists" components lib -l`

---

### 16. Reply-by-Email Bridge — Category: Infrastructure

**The idea:** Advisers (and consumers) answer brief-chat messages by simply replying to the notification email; the reply lands in `brief_messages`, appears in the Realtime chat, and keeps the SLA clock honest.

**Why it's brilliant:** Brief chat is in-app only and notification email is one-way — confirmed outbound-only Resend usage. Advisers live in their inbox; every context-switch to a portal loses replies. Reply addresses carry an HMAC token (`brief+<id>.<sig>@mail…`), so this needs zero new tables and no new vendor — Resend inbound + the already-present `lib/resend-webhook-verify.ts`.

**What gets built:** Inbound route `app/api/inbound/brief-reply` (signature verify, HMAC address validation, sender check against the brief's parties); reply-text extraction (strip quoted history/signatures — pure lib with tests); insert into `brief_messages` with correct sender kind → Realtime fires for free; reply-to headers added to brief notification emails in the existing mailers; bounce/suppression handling; rate limits via `lib/rate-limit.ts`.

**Revenue or moat payoff:** Materially higher response rates (the marketplace's core conversion), full conversation capture on-platform (data moat + dispute evidence), and better SLA integrity for #2.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "resend-webhook-verify|reply_to" lib app/api -l`

---

### 17. Group Briefs — pooled demand auctions — Category: Wildcard

**The idea:** Cluster consenting consumers with similar needs ("11 people in NSW want SMSF setup this month") into a demand pool; advisers respond once with a group offer (availability + a package rate), and each consumer individually accepts or declines — each acceptance debiting credits at a volume discount.

**Why it's brilliant:** Confirmed: "No multi-consumer pools or group purchasing." Pooling solves the cold-start liquidity problem in thin categories/regions — one adviser response services ten users — and group pricing gives consumers a tangible reason to join with an account. Strictly lead-routing bundles (advisers' own offers; nothing traded), staying clear of the Australian Market Licence escalator on the avoid-list.

**What gets built:** `demand_pools` + `pool_members` tables; opt-in checkbox in `BriefForm` ("join others with the same need — advisers may offer group rates"); clustering job (template × state × month) with min/max sizes; pool cards in the adviser inbox with one composer for a structured group offer (`pool_offers`); per-member accept → standard contact-unlock + chat; pool page showing anonymised member count + offer status; caps, expiry, and a kill-switch flag.

**Revenue or moat payoff:** Liquidity in thin markets, N acceptances per adviser response (credit revenue multiplier), and a genuinely novel mechanic that earns press/word-of-mouth.

**Effort:** L

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "brief_template|flow_type" lib/briefs app/api/briefs`

---

### 18. The Monthly Money Review ritual — Category: Product

**The idea:** A guided 10-minute monthly session: "since your last review — net worth +$3.1k, your TD rate dropped 25bps, goal 'House deposit' is 2 months behind, 1 open decision." One nudge action per section, a completion stamp, a streak, and a calendar of past reviews.

**Why it's brilliant:** The account suite has rich state (goals, balances, rate memory, health score, decision inbox) but agents confirmed there is no recurring ritual — only an annual check page and scattered drips, with "no monthly check-in nudge, no 'review in 6 months' follow-ups." Rituals are how finance apps earn monthly actives; this one assembles entirely from data the user already saved, so it's personal without being advice (arithmetic on own data — same legal footing as `/account/health`).

**What gets built:** `user_reviews_log` table (period, completed_at, snapshot jsonb); `app/account/review` guided flow composing `lib/goals/project`, `manual_balances` deltas, `user_rate_memory`, `lib/decision-inbox.ts`, and health-score trend; "remind me in N months" deferral hooks on calculators/tools writing future review items; monthly invite cron (email + push, preference-gated); streak surfacing via the existing `lib/streak.ts`/`user_daily_checkins` rails; dashboard tile.

**Revenue or moat payoff:** A durable monthly-active habit (the retention metric that compounds everything else), refreshed profile data each cycle (better matching/leads), and a natural monthly slot for Pro upsells.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "decision-inbox|user_rate_memory" lib app/account -l`

---

### 19. Consumer Quests & Achievements — Category: Product

**The idea:** An earned achievement system for investors: tiered quests bound to real account actions (complete your Money Profile, add 3 holdings, set a goal, run the annual check, create a rate alert, finish a course module, post your first brief) with a badge shelf on the dashboard and quest hints in the weekly digest.

**Why it's brilliant:** Gamification exists only for advisers (15-type `advisor_badges`) — agents confirmed "NO badges/achievements/levels for consumers; streaks tracked but never surfaced." The account suite is wide but discovery is the weak point: quests are a self-guiding tour that walks users through exactly the features that create saved state — every completed quest literally deepens the data moat.

**What gets built:** `user_achievements` table + code-defined quest registry `lib/quests.ts` (id, trigger event, tier); award hooks at the relevant API routes (profile save, holdings insert, goal create, alert create, course progress, brief create) via a small `awardIfEligible()` helper; badge shelf + next-quest card on `/account/dashboard`; streak surfacing widget (existing `components/streak`); digest section in the personalised-digest cron; deliberately serious visual tone (no confetti-for-trading; quests reward setup actions, never investment performance).

**Revenue or moat payoff:** Activation depth (each quest = saved state = retention), feature discovery without onboarding tours, and a measurable path from signup to brief-poster.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "advisor_badges|award-badges" app/api/cron lib -l`

---

### 20. Cohort Challenges (group programs with shared progress) — Category: Product

**The idea:** Time-boxed group programs — "Get Investment-Ready in 21 days," "EOFY Sprint," "First-Home Deposit Kickstart" — with daily tasks, a cohort progress bar, an optional linked club room, completion certificates, and a next-cohort waitlist.

**Why it's brilliant:** Confirmed absent: "No cohort/group challenge programs, no group goals" — while all the rails exist (courses with certificates, clubs with chat, goals, digests). Cohorts add the missing social-accountability layer that solo courses lack, and scheduled start dates create recurring re-activation moments. Task/learning-based only — no portfolio-performance competition — keeping it clearly distinct from any trading league and inside general-information territory.

**What gets built:** `challenges` + `challenge_enrolments` + `challenge_task_completions` tables; code-defined curricula (lib/challenges/) reusing course-lesson content patterns; cohort page `app/challenges/[slug]` (day list, personal + cohort progress, anonymous aggregate stats); optional auto-created club per cohort (`investment_clubs` rails); daily nudge emails/push during active windows; certificates via the `course_certificates` pattern; admin schedule page.

**Revenue or moat payoff:** Bursty, predictable re-engagement; cohort completions feed quests (#19), goals, and ultimately briefs; waitlists build an owned launch channel.

**Effort:** L

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "course_progress|course_certificates" lib app/api -l`

---

### 21. Scenario Workspace (named what-ifs across calculators) — Category: Product

**The idea:** Let users save *named* scenarios from any calculator ("Aggressive DCA," "If we refinance"), reopen them later, compare 2-3 side-by-side with deltas, and share a read-only link.

**Why it's brilliant:** Confirmed: calculator state is one anonymous record per user per calculator — "no named scenarios, no picker, no versioning, no sharing." People model decisions iteratively over weeks; today every revisit overwrites the last thought. Named scenarios convert 40+ stateless tools into a personal planning workspace — pure leverage on the existing `scenario-delta`/`scenario-engine` libs that currently power only editorial presets.

**What gets built:** `user_scenarios` table (user_id, calculator_key, name, inputs jsonb, results snapshot) replacing the single-row constraint of `user_calculator_state`; save-as/load picker in `components/CalculatorShell.tsx`; `/account/scenarios` library page; compare view reusing `lib/scenario-delta.ts`; share tokens via the `profile_share_tokens` pattern; "resume your scenario" re-engagement email hook.

**Revenue or moat payoff:** Repeat visits to tools that are currently one-shot, richer saved state (moat), and shared scenarios as an organic acquisition loop.

**Effort:** M

**DB needed:** [NEEDS SQUASH FIRST]

**First command:** `rg -n "scenario-delta|user_calculator_state" lib components -l`

---

### 22. Holdings CSV Import — Category: Product

**The idea:** A file-upload import wizard for portfolios: parsers for CommSec, SelfWealth, Stake, IBKR and Sharesight CSV exports plus a generic column-mapper, with dedupe/merge preview into the existing holdings tracker.

**Why it's brilliant:** Confirmed: "Manual holdings entry only — no CSV import anywhere" (Sharesight OAuth is the single integration). Manual entry is why portfolio features stall at 3 holdings; import is the activation unlock for health score, fee benchmarking, and Pro's "unlimited holdings" pitch. User-uploaded files are CDR-safe (explicitly the "manual entry" lean alternative on the regulatory avoid-list — no bank-feed accreditation triggered).

**What gets built:** `lib/holdings/import/` parser registry (per-broker column maps + a tolerant generic CSV engine, pure functions with fixture tests); upload wizard at `app/account/holdings/import` (client-side parse → server validate with Zod → preview rows → dedupe against `investor_holdings` → bulk insert); post-import hooks: price hydrate via `holdings_price_cache`, health-score recompute, broker-fee comparison CTA; export round-trip via existing `lib/csv-export.ts`.

**Revenue or moat payoff:** Step-change in portfolio adoption → more Pro conversions and far richer per-user data; every imported portfolio strengthens fee tools and adviser-match context.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "investor_holdings" app/account/holdings lib/holdings -l`

---

### 23. Public Demand Board (supply acquisition engine) — Category: Revenue

**The idea:** A live, anonymised board at `/for-advisors/demand`: open briefs by service type × state with budget bands and recency ("23 open briefs in NSW · est. $48k in advice fees this month"), an earnings estimator, and "alert me about SMSF briefs in NSW" capture for unregistered advisers.

**Why it's brilliant:** Confirmed: the for-advisors page shows only static hero stats — "no 'N open briefs in your area' to non-registered advisers." Marketplaces recruit supply by showing demand they can't have yet; this converts the brief inventory into a self-serve adviser-acquisition funnel with zero BD work, and the alert capture builds a pre-qualified onboarding pipeline.

**What gets built:** Anonymised aggregation over open `advisor_auctions` (reuse the redaction patterns from `app/quotes/recent-wins`); `app/for-advisors/demand` with ISR (5-min revalidate), state/type filters, and a simple earnings estimator (median accepted budgets × capacity); email capture writing to the prospect pipeline (existing `prospects`/`bd_pipeline` tables) + a weekly "demand in your area" send for unconverted captures; tasteful JSON-LD + internal links from `/advisor-signup`.

**Revenue or moat payoff:** Cheaper, compounding supply growth (more advisers → faster responses → more consumers), with each new brief making the recruitment page more persuasive — a true network-effect surface.

**Effort:** S

**DB needed:** [RUNS NOW]

**First command:** `rg -n "recent-wins" app/quotes -l`

---

### 24. Per-Adviser Embed Kit (badges on their own sites) — Category: SEO

**The idea:** Self-serve embeds advisers paste onto their own websites: a live rating badge ("4.9★ · 31 verified reviews · Verified on invest.com.au"), a reviews carousel, and a "Book me" button — each linking back to their profile.

**Why it's brilliant:** The existing widget system (`lib/widget`, Shadow-DOM `/api/widget/*`) serves *partner data tables*; agents confirmed nothing lets an individual adviser embed their own profile assets. Hundreds of adviser sites embedding live badges = a distributed backlink farm to a 30-year domain, free brand distribution, and lock-in: removing the badge means losing visible social proof. Review platforms (Trustpilot) built empires on exactly this loop.

**What gets built:** "Embeds" tab in the adviser portal generating script/iframe snippets keyed by advisor slug + signed token (reuse `advisor_auth_tokens` signing patterns); three embed types served through the existing Shadow-DOM widget infra: rating badge (live `professional_reviews` stats + verification tick), review carousel (published reviews only), booking button (deep link to profile/booking); impression + click attribution into `attribution_touches`; dofollow profile links; abuse controls (revocation, domain pinning).

**Revenue or moat payoff:** Compounding backlinks and referral traffic, higher perceived value of staying subscribed/verified, and a supply-side virality channel no AU competitor has.

**Effort:** M

**DB needed:** [RUNS NOW]

**First command:** `rg -n "Shadow DOM|/api/widget" lib/widget app/api/widget -l`

---

### 25. FY Money Wrapped — Category: Wildcard

**The idea:** A shareable end-of-financial-year recap generated from each user's own saved state: "FY26 — net worth +$18k, 3 goals on track, you caught 2 rate cuts before your bank told you, health score B→A−, 14-week review streak," rendered as swipeable cards with an OG share image.

**Why it's brilliant:** Confirmed absent: "No year-in-review recap of any kind." Australia's June-30 EOFY is a culturally synchronised money moment with no consumer ritual attached — Wrapped-style recaps are proven viral re-activation, and only a platform with per-user saved state can make one (Finder/Canstar literally lack the data). Reads existing tables only; the share card markets the account ecosystem itself.

**What gets built:** `app/wrapped` (auth-gated, FY period param) composing existing data: `user_health_score_log` trend, goals progress (`lib/goals/project`), `manual_balances`/holdings deltas, `rate_alert_sends` wins, quiz/comparison/review activity, streaks; card renderer + share image via `next/og` `ImageResponse`; anonymous-visitor teaser → signup CTA; EOFY send slot in the existing seasonal-email cron + push; strictly own-data arithmetic with compliance copy from `lib/compliance.ts` (no percentile-vs-others comparisons).

**Revenue or moat payoff:** An annual viral spike, dormant-account re-activation, and an emotional payoff for keeping data on the platform all year — the retention loop's victory lap.

**Effort:** S

**DB needed:** [RUNS NOW]

**First command:** `rg -n "user_health_score_log|seasonal" lib app/api/cron -l`

---

## Coverage summary

| Lens | Ideas |
|---|---|
| Adviser economics & habit loops | 1, 7, 8, 10, 11, 13, 14, 23, 24 |
| Marketplace trust & liquidity mechanics | 2, 4, 9, 15, 16, 17 |
| Consumer retention & saved state | 3, 5, 6, 18, 19, 20, 21, 22, 25 |
| Runs without schema changes | 3, 9, 10, 16, 22, 23, 24, 25 |

Compliance posture: every idea stays inside the lean lane (flat B2B credit/subscription fees, no consumer→adviser money intermediation, general-information framing, manual data entry not CDR, lead routing not product markets). Ideas 7, 9, 17 include explicit guard notes inline.
