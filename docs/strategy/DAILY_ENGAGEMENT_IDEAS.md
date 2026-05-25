# Daily Engagement & "Operating System for Investing" — Ideas

_Authored by deep-dive audit, 2026-05-25. Cross-referenced against existing feature inventory
(740+ pages), FIN_NOTEBOOK.md backlog, REGULATORY-AVOID-LIST.md guardrails, and live codebase._

---

## What Already Exists (Do Not Duplicate)

Before any idea below: the codebase already ships the following engagement infrastructure:

| Feature | Location | Status |
|---|---|---|
| Advisor insights feed | `/feed` | Live — advisors post updates/insights/questions |
| Community forum (Reddit-style) | `/community` + `/community/[category]/[thread]` | Live — seeded threads |
| Rate alert thresholds | `lib/alert-thresholds.ts` | Live — savings, TD, loan, broker fee alerts |
| Watchlist digest | `lib/watchlist-alerts.ts` | Live — weekly email for watchlist changes |
| Notification centre | `/account/notifications` + `lib/notifications.ts` | Live |
| Goals tracker | `/account/goals` | Live |
| Net worth tracker | `/account/net-worth` | Live |
| Holdings tracker | `/account/holdings` | Live |
| Quiz system | 14 vertical quizzes + main quiz | Live |
| Health scores | `/health-scores` | Live (public) |
| Annual financial MOT | `/account/annual-check` | Live (PX-07, May 2026) |
| Referral program | `/account/refer` + `/account/referrals` | Live (PX-05) |
| Fee impact visualiser | `/fee-impact` | Live (PX-04) |
| Bookmarks + saves | `/account/bookmarks` + `/account/saved` | Live |
| Saved searches | `/account/saved-searches` | Live |
| Portfolio calculator + X-ray | `/portfolio-calculator` + `/portfolio-xray` | Live |
| Advisor portal CRM | `/advisor-portal` | Live |
| Firm shared lead inbox | `/firm-portal` | Live (PX-03) |
| Slack lead alerts for advisors | `lib/slack-lead-notify.ts` | Live (PX-01) |
| IPO calendar | `/invest/ipo-calendar` | Live |
| Broker changelog | `/broker/[slug]/changelog` | Live |

**Key gaps the feed has:** Advisor-only (no user posts), no follow mechanic, no personalization, no subscription.
**Key gaps alerts have:** Email-only (no web push), weekly cadence only (no instant), no rate-of-change display.

---

## The Core Problem to Solve

invest.com.au is an excellent **research destination** — people come when they have a decision to make, then leave. Facebook is daily because the feed is **ambient** (always new) + **social** (people you know are in it) + **eventful** (you'll miss something if you don't check).

The goal: become the place where financial decisions **live**, not just get researched.

Three return-user anchors to build toward:
1. **Pull** — push notifications + morning email bring people back daily
2. **Social** — following advisors + investment peers creates a social graph reason to check
3. **Event-driven** — RBA day, EOFY, rate changes, maturity dates = scheduled re-engagement

---

## TIER 1 — High Impact, Low Effort (ship in weeks, mostly plumbing on existing infra)

### 1. Web Push Notifications for Rate Alerts
**Gap:** Alerts exist (`lib/alert-thresholds.ts`) but are email-only. Email has 24h latency; push = instant.  
**Build:** Service worker + Notification API, subscribe flow on `/account/alerts`, push dispatch in cron when threshold crosses.  
**Why daily:** "CBA HISA just hit 5.75%" arrives on lock screen — creates Pavlovian check-in habit.  
**Regulatory:** Factual data surfacing only (existing compliance framing). ✅  
**Effort:** ~1 week (service worker + subscription table + push API route).

---

### 2. "What Changed Today" Rate Board — Homepage + Daily Digest Widget
**Gap:** No freshness surface. Rates change constantly (providers update TDs, HISA rates move) but there's no "delta" view.  
**Build:**
- `rate_change_log` table — cron snapshots current rates hourly, records delta when changed
- Homepage widget: "Rates that moved today" with direction arrows and % change
- `/rates/today` page: full list of all rate changes in past 24h (SEO goldmine — "Australian savings rates today")
- Email digest block: "What moved this week" section added to newsletter  
**Why daily:** Creates the same habit as checking finance news — people come to see what changed.  
**Regulatory:** Factual comparison of public rates. ✅  
**Effort:** ~2 weeks (snapshot cron + UI widget).

---

### 3. Follow-an-Advisor + Personalized Feed
**Gap:** The `/feed` page shows all advisor posts but has no follow/subscription mechanic — same content for every user.  
**Build:**
- `advisor_follows` table (`user_id`, `advisor_id`, `followed_at`)
- "Follow" button on every advisor profile + advisor card
- `/feed` becomes a tabbed view: "Following" (advisors you follow) + "Discover" (current all-advisors feed)
- Follow count shown on advisor profile as social proof
- Notification when followed advisor posts (uses existing notification infrastructure)  
**Why daily:** Your curated stream of experts you trust → replaces checking each advisor's profile separately.  
**Advisor retention:** Follow count = vanity metric advisors care about. Drives advisors to post more to grow their following.  
**Regulatory:** Advisor posts are general information only (same compliance framing as existing feed). ✅  
**Effort:** ~1.5 weeks.

---

### 4. Advisor "Quick Post" — Mobile-First Content Studio
**Gap:** Feed exists but posting UX is unclear — likely admin-mediated. Advisors need frictionless mobile posting.  
**Build:**
- `/advisor-portal/post/new` — single-screen composer (body text, post type badge, optional link, optional image)
- Character limit (500) to enforce snackable content
- Preview before submit
- Post goes live immediately (moderation flag for first 3 posts, then auto-approved for verified advisors)
- Post from advisor profile = appears in all followers' feeds  
**Why advisors use daily:** Audience building (follow count is the KPI). Like LinkedIn for financial pros.  
**Regulatory:** General information only; existing AFSL framing. ✅  
**Effort:** ~1 week (portal page + API route + moderation queue in admin).

---

### 5. "Rate Expiry Countdown" on Term Deposits + Maturity Reminders
**Gap:** Users save TDs to watchlist but there's no maturity tracking.  
**Build:**
- TD products store `intro_rate_expiry_days` field (already in schema likely)
- Watchlist items for TDs show countdown: "Intro rate expires in 14 days"
- `td_maturity_reminders` table: users optionally record their own TD maturity date
- Cron sends email 30d, 7d, 1d before: "Your TD matures soon — here are the best rates today"  
**Why daily:** Financial urgency — money is literally about to become available, forces check-in.  
**Effort:** ~1 week.

---

### 6. "Deal of the Day" — Time-Limited Offers Engine
**Gap:** Rates and offers change but there's no urgency/freshness surface for users.  
**Build:**
- Providers (via broker portal) can flag a product as "featured rate" with an expiry timestamp
- Homepage module: "Today's top rates" with live countdown timer if offer expires
- `/deals` (already exists) gets a "Expiring soon" filter
- Daily email digest highlight: "Don't miss — [X] term deposit expiring tonight"  
**Why daily:** Scarcity + expiry = powerful return mechanic (airline pricing psychology).  
**Revenue:** Providers pay for "Deal of the Day" featured slot (existing sponsored placement model). ✅  
**Effort:** ~1 week (flag in broker portal + homepage widget).

---

## TIER 2 — High Impact, Medium Effort (1–2 months)

### 7. Personalized "Morning Brief" Daily Email (8am AEDT)
**Gap:** Newsletter exists but it's editorial (same content for everyone). No personalized daily digest.  
**Build:**
- User preference: opt into "Morning Brief" in notification settings
- Cron at 7:45am AEDT generates personalized emails:
  - Rate changes for bookmarked products
  - New posts from followed advisors
  - One article matching user's quiz profile
  - One market fact (RBA cash rate, ASX 200 change)
  - One calculator or tool prompt relevant to user's goals
- Powered by existing quiz profile + bookmarks + follows graph  
**Why daily:** Inbox habit. Users open because it's *theirs*, not generic. 20-30% open rate potential.  
**Revenue:** Sponsored slot in Morning Brief (native ad, disclosed). ✅  
**Effort:** ~3 weeks (personalization engine + email template + preference UI).

---

### 8. Financial Health Score — Personalized, Tracked Over Time
**Gap:** `/health-scores` pages exist as public content (generic scores). No *user-specific* health score.  
**Build:**
- `/account/health` — personal health score (0–100) built from:
  - Quiz answers (diversification, risk match, fee awareness)
  - Behaviours (bookmarks, comparison activity, advisor contact)
  - Profile completeness (goals, holdings, net worth set)
- Score broken into sub-scores: Diversification, Cost Efficiency, Risk Alignment, Engagement
- Monthly email: "Your health score changed from 62 → 71 — here's what improved"
- Progress bar UI with specific action prompts to improve each sub-score  
**Why daily:** Progress-tracking loop (fitness tracker psychology). Users check score like they check step count.  
**Why advisors love it:** Low-score users are warm leads for advice. Surface "Connect with an advisor to improve your score" CTA.  
**Regulatory:** Factual scoring of user's own stated data + behaviours — no personal advice. ✅  
**Effort:** ~3 weeks.

---

### 9. "Investment Habit Streak" — Daily Check-in Gamification
**Gap:** No engagement gamification beyond quiz completion badges.  
**Build:**
- Daily "check-in" actions that count toward streak:
  - View watchlist (1 point)
  - Read an article (1 point)
  - Run a calculator (2 points)
  - Complete a quiz (3 points)
  - Leave a review (5 points)
  - Post in community (5 points)
- Streak counter in account header (🔥 7-day streak)
- Weekly badge milestones: 7-day "Consistent", 30-day "Dedicated", 90-day "Committed"
- Streak-at-risk notification: "You haven't checked in today — your 14-day streak ends tonight"  
**Why daily:** Duolingo mechanism. Streak loss aversion is the strongest daily return driver known.  
**Effort:** ~2 weeks (activity logging + streak calc cron + badge system).

---

### 10. User Posts in Community — "Question of the Day"
**Gap:** Community forum exists with seeded threads but user participation mechanics unclear.  
**Build:**
- Daily "Question of the Day" posted by editorial team to community
- Pushes notification to all opted-in users: "Today's question: [Title]"
- Users answer — reply becomes a mini review/insight on their profile
- Best answers surfaced to homepage "Community picks" widget
- Leaderboard: top contributors this week (drives repeat posting)  
**Why daily:** Answering questions is fast (2 min) + social validation when upvoted.  
**Why advisors use daily:** Advisors who answer get attribution + profile link → lead generation.  
**Effort:** ~2 weeks.

---

### 11. "Switching Tracker" — Lifetime Cost of Your Current Products
**Gap:** Switching calculator exists but is one-shot — not personalized or persistent.  
**Build:**
- After quiz/profile setup: "Tell us what you're currently using" (brokerage, super, savings)
- Platform calculates: "You've been with CommSec ~3 years. Estimated total brokerage paid: ~$1,840"
- Benchmarks against best-in-class: "If you'd been with SelfWealth, you'd have paid ~$720"
- Annual reminder: "Your annual switching review is due — see what you could save"  
**Why daily (annual):** Lifestyle inflation + inertia — this creates scheduled financial guilt that drives action.  
**Revenue:** Switching referral = affiliate commission. Switching CTA on every tracker result. ✅  
**Regulatory:** Factual cost comparison, no personal advice. ✅  
**Effort:** ~2 weeks.

---

### 12. Advisor "Office Hours" — Scheduled Live Text Q&A
**Gap:** Advisors can post but can't do live sessions. Users can't get real-time expert access without paying.  
**Build:**
- Advisors schedule "Office Hours" slots (30–60 min) via advisor portal
- Visible on advisor profile: "Next office hours: Thursday 5pm"
- Users follow + get notified when slot opens
- Live Q&A: users submit questions (anonymous option), advisor replies in real-time (simple chat UI)
- After session: transcript published as Q&A page (`/questions/[advisor-slug]-office-hours-[date]`)
- Transcript indexed for SEO + AI-overview extraction (GEO strategy alignment)  
**Why users return:** Rare access to free expert advice = high pull.  
**Why advisors use:** Audience building + warm lead generation from attendees.  
**Why SEO/GEO loves it:** Every session = evergreen Q&A content.  
**Effort:** ~3 weeks (live session infra + transcript archiving + SEO pages).

---

### 13. "What My Peers Are Doing" — Anonymous Benchmark Feed
**Gap:** No social proof of what investors like the user are actually doing.  
**Build:**
- From quiz profiles + bookmarks + watchlist (anonymized, aggregated):
  - "Investors in your profile cohort are looking at: ETFs (42%), Savings (31%), Property (18%)"
  - "Most bookmarked brokers this week among first-home buyers"
  - "Most-compared product pair this month"
- Surface as homepage personalized widget and weekly in Morning Brief
- No individual data exposed — only aggregated cohort stats  
**Why daily:** Social proof loop. "What are others like me doing?" is one of the strongest engagement triggers.  
**Regulatory:** Aggregated anonymous data, no personal advice. ✅  
**Effort:** ~2 weeks (aggregation cron + UI widget).

---

### 14. IPO Notification Bell + Application Deadline Reminders
**Gap:** `/invest/ipo-calendar` exists but users can't subscribe to specific IPOs.  
**Build:**
- "Notify me" bell on each IPO entry
- Alert types: "IPO opens", "Prospectus available", "Application closes in 48h"
- Post-IPO: "Results: [Company] listed at [price] — up/down X%"
- Monthly "Upcoming IPOs" email for subscribed users  
**Why daily in IPO periods:** ASX IPO season creates recurring return cycles.  
**Revenue:** IPO sponsors pay for featured placement in calendar. ✅  
**Effort:** ~1.5 weeks.

---

### 15. Portfolio Performance Benchmark — "How Am I Tracking?"
**Gap:** `/account/holdings` exists for manual entry but no benchmark comparison.  
**Build:**
- User enters holdings manually (no CDR bank-feed required — avoids regulatory escalator)
- Platform calculates weighted return using publicly available price data (ETF NAVs, ASX prices)
- Benchmarks against: ASX 200 total return, balanced fund average, user's own risk profile
- Monthly performance email: "Your portfolio returned X% vs ASX 200's Y% — [share/celebrate]"
- Social share card: "I returned 12.3% this year" (branded image, no sensitive data)  
**Why daily:** Money is the world's most compelling personal KPI. Checking performance = habit.  
**Regulatory:** User-entered data + public market prices = factual display, no advice. ✅  
**Effort:** ~3 weeks (price data ingestion + performance calc + email).

---

## TIER 3 — Platform-Level Features (2–4 months)

### 16. Investment Clubs — Private Group Watchlists + Discussion
**Concept:** Groups of 3–10 people (friends, family, work colleagues) share a private investment discussion space.  
**Build:**
- Create/join a club (invite by email)
- Shared watchlist visible to all members
- Private chat thread on each watchlisted product
- Anonymous portfolio contribution: "Our club returned 9.2% average this year"
- Club challenge: "Whose pick performed best this month?" (gamified)  
**Why daily:** Accountability + competition between trusted people. Book-club psychology applied to money.  
**Why viral:** Inviting friends = organic growth loop.  
**Regulatory:** Information sharing only, no money movement, no pooled investment. ✅  
**Effort:** ~4 weeks.

---

### 17. Unified Social Feed — The "Investing Home Screen"
**Concept:** Replace siloed pages (/feed, /community, /deals, /account/watchlist) with a unified, personalized home feed.  
**Algorithmic mix (tunable):**
- 30% — Rate changes on bookmarked/watchlisted products
- 20% — Posts from followed advisors
- 20% — Community thread activity (upvoted replies in categories you follow)
- 15% — Articles matching your quiz profile
- 10% — Deals/offers expiring soon
- 5% — "What peers are doing" cohort insights  
**Build:**
- `feed_events` table: unified event stream (rate_change, advisor_post, community_reply, article, deal, benchmark_move)
- Ranking function (recency × engagement × personalisation weight)
- Infinite scroll feed on `/` for logged-in users (homepage becomes the feed)
- Tab: "For You" / "Markets" / "Community" / "Advisors"  
**Why daily:** This IS the Facebook moment. The home screen becomes the product, not just a landing page.  
**Effort:** ~6 weeks (event stream + ranking + UI).

---

### 18. "Market Events" Calendar — Scheduled Return Triggers
**Concept:** Financial calendar that pulls users back on known event dates.  
**Events covered:**
- RBA cash rate decisions (8 per year — always generates discussion)
- ASX earnings season highlights
- EOFY countdown (June) — tax optimization content
- Budget day — federal/state budget impact analysis
- Superannuation contribution deadlines
- SMSF audit deadlines
- Major ETF distribution dates  
**Build:**
- `/calendar` — public calendar page (SEO + bookmarkable)
- "Add to my calendar" button → downloads .ics / Google Calendar
- Pre-event push notification: "RBA decision tomorrow — what's expected?"
- Post-decision editorial: "RBA held at X% — here's what it means for your savings"  
**Why daily on event days:** Creates 8+ guaranteed high-engagement spikes per year.  
**Effort:** ~2 weeks.

---

### 19. Advisor Match Score — AI-Powered Personalised Ranking
**Concept:** Every advisor gets a personalised match % shown to each user (not a global score).  
**Algorithm inputs:**
- User quiz profile (goals, risk, wealth stage, investment type)
- User location vs advisor location/virtual
- Advisor specialty vs user's expressed needs
- Advisor review sentiment vs user's stated concerns
- Advisor activity on platform (post frequency, response rate)  
**Build:**
- `advisor_match_scores` table: pre-computed per-user, refreshed weekly
- Shown on advisor cards: "94% match for your profile"
- `/get-matched` result page shows ranked list with match %
- Morning Brief: "New advisor 92% matched to your profile joined this week"  
**Why daily:** Match scores make the advisor directory feel personal, not generic. Drives exploration.  
**Advisor retention:** Advisors can see what profile types they match highly with → optimise their profiles.  
**Effort:** ~4 weeks.

---

### 20. Advisor "Trust Score" Visible to Advisors — Gamified Profile Optimisation
**Concept:** Turn advisor trust score into a gamified improvement system for advisors.  
**Build:**
- In advisor portal: progress bar for Trust Score (0–100)
- Broken into sub-scores: Verified credentials, Response time, Review volume, Profile completeness, Activity
- Specific action prompts: "Add 2 more verified reviews to reach 'Highly Trusted' (+15 pts)"
- Tier badges: Starter → Active → Trusted → Highly Trusted → Elite
- Email nudges: "Your trust score dropped 3 pts this month — here's why"  
**Why advisors use daily:** Score = revenue (higher trust = more lead visibility). Checks become habit.  
**Effort:** ~2 weeks (score calc + portal UI).

---

### 21. "Concierge Match" — High-Touch Intake as Daily Driver
**Gap:** `/concierge` exists but appears to be a CTA page.  
**Build:**
- Concierge becomes a 5-min intake form (quiz-style) that generates a personalised brief
- Brief is matched to 3 advisors automatically + human review same day
- User gets real-time status: "Your brief has been sent to 3 advisors" → "2 have viewed" → "1 responded"
- Status updates drive return visits ("Check your responses")
- Advisors bid/compete for the brief (ties into hybrid auction — already 90% built per FIN_NOTEBOOK)  
**Why daily:** Active brief in progress = daily check-in. Job-board psychology.  
**Revenue:** Premium leads, auction mechanics, featured position bids. ✅  
**Effort:** ~3 weeks (status tracking + advisor matching + brief inbox).

---

## TIER 4 — Content & SEO Flywheels (Compound Over Time)

### 22. "Advisor Insights Archive" — Searchable Expert Content Hub
**Build:** Every advisor post to the feed becomes a searchable, indexed page at `/insights/[advisor-slug]/[post-slug]`  
**Why:** Each post = SEO content + GEO-extractable answer. 100 advisors posting weekly = 5,000+ unique pages/year.

### 23. "Rate History" Charts — Every Product Page Gets a Trend Line
**Build:** Store rate snapshots (already partially done for alert system) → display 12-month rate chart on every savings/TD/broker product page  
**Why:** Turns static comparison pages into live market data — reason to return when making decisions.

### 24. User Review Loops — Review as Content Creation
**Build:**
- Post-review: "Your review helped 47 people this month" (monthly notification)
- Review upvotes → reviewer earns "Trusted Reviewer" badge
- Top reviewers get profile visibility ("Featured community member")  
**Why daily:** Social validation drives repeat content creation.

### 25. "State of Australian Investing" — Annual Report as Engagement Engine
**Gap:** `/insights/state-of-australian-investing` exists.  
**Build:**
- Collect opt-in data via annual survey (short, quiz-style, incentivised with report early access)
- Report becomes PR-able ("Australians have X% of wealth in ETFs — up from Y%")
- Users who participated get personalised version: "You're in the top 15% for diversification"  
**Why:** Builds dataset + drives annual engagement spike + media coverage.

---

## Advisor Retention — Operating System for Their Practice

Advisors use it daily when it becomes infrastructure for their business:

| Feature | Why Daily |
|---|---|
| Lead inbox with real-time notifications | Revenue-critical — can't miss a lead |
| Slack/webhook integration (PX-01/02 — live) | Embedded in their existing workflow |
| Brief auction bidding | Active competition = frequent checking |
| Trust score progress bar | Gamified improvement loop |
| Follow count on advisor profile | Vanity metric + audience building |
| "Office Hours" session management | Scheduling + live attendance |
| Client review requests | Pipeline task management |
| Firm leaderboard (internal) | Performance management for firms |
| Content posting (quick post) | Audience building habit |
| Rate data for client comms (API) | Infrastructure dependency |

---

## Regulatory Checkpoints (per REGULATORY-AVOID-LIST.md)

Every idea above was checked against the avoid list. Safe features:

| Feature | Why Safe |
|---|---|
| Web push notifications | Factual data surfacing |
| Rate change board | Factual comparison of public rates |
| Follow an advisor | Information subscription, not advice |
| Morning brief | Factual + comparison, no personal advice |
| Financial health score | User's own data, no investment recommendation |
| Habit streaks | Engagement mechanic, no financial guidance |
| Investment clubs | Information sharing, no pooled investment |
| Portfolio benchmark | User-entered data + public prices, no advice |
| Advisor match score | Ranking/matching, not personal advice |
| IPO notifications | Factual event alerts |
| Switching tracker | Cost comparison, no credit assistance |

**Stop and escalate before building:**
- ❌ Anything that ingests bank data (CDR accreditation required)
- ❌ Any "rebalancing recommendation" (personal advice)
- ❌ Investment execution or order routing (AML)
- ❌ Pooling money in investment clubs (CSF/product issuer)
- ❌ "Your returns will be X%" (product issuer / misleading)

---

## Prioritised Roadmap

### Week 1–2 (Plumbing on existing infra)
1. Web push notifications for rate alerts
2. "What Changed Today" rate board widget on homepage
3. "Deal of the Day" expiry timer on TD/savings offers
4. Follow-an-advisor button + personalized feed tab

### Week 3–4
5. Rate maturity / TD reminder system
6. Advisor quick-post mobile composer
7. IPO notification bells
8. "What my peers are doing" cohort widget

### Month 2
9. Personalized morning brief email (8am AEDT)
10. Financial health score (user-specific)
11. Investment habit streak system
12. Switching tracker (persistent, personalized)

### Month 3
13. Advisor office hours (live Q&A sessions)
14. Market events calendar with .ics export
15. Portfolio benchmark comparison (manual entry)
16. Advisor trust score gamification (in advisor portal)

### Month 4+
17. Investment clubs (private group watchlists)
18. Advisor match score (AI-powered)
19. Unified social feed as new home screen
20. Rate history charts on all product pages

---

## Revenue Unlocked by These Features

| Feature | Revenue Mechanism |
|---|---|
| Morning brief | Sponsored slot (native, disclosed) |
| Deal of the Day | Featured placement fee from providers |
| Advisor office hours | Premium advisor plan inclusion |
| Investment clubs | Pro membership perk |
| Advisor match score | Higher match = more visibility → drives advisor plan upgrades |
| Concierge match | Auction/brief fees (existing model) |
| Rate history charts | Provider upgrades to "keep rates fresh" for SEO visibility |
| IPO calendar featured slots | IPO sponsors pay for prominence |
| Portfolio benchmark | Pro feature (detailed breakdown) |
| Rate API for advisors | Add-on for premium advisor plans |

---

_Append decisions here as items are approved/rejected/modified. Move shipped items to bottom._
