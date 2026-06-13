# Retail UX North Star — "The Platform You Keep"

> **Status:** audit + plan, awaiting founder priority call on the wave order (§10)
> **Author:** end-to-end UX/UI audit session, 2026-06-11
> **Method:** 6 parallel code-grounded surface audits (first-touch, browse/compare/decide, identity/save/return, learn/community/progression, design system/motion, get-matched/advisor) + live mobile screenshot sweep of the Netlify mirror (11 pages, 390×844 + desktop) + reconciliation against every prior UX/engagement plan.
> **Brief (founder):** *"Built for a retail investor who has never used a financial platform before but immediately feels like they've found the one they'll use forever… Robinhood/Revolut/Coinbase energy — exciting, approachable, personal. Not corporate. Not compliance-heavy grey boxes. Something that feels alive."*

---

## How this document relates to the other plans (read this first)

This is the **emotional layer** — the journey architecture and feeling of the product. It deliberately does not re-litigate what other living documents own:

| Document | Owns | Status | This doc's relationship |
|---|---|---|---|
| `UX_UI_FINTECH_ALIGNMENT.md` | Visual consistency: density, heroes, house primitives | Waves mostly shipped | That made the site *coherent*. This makes it *felt*. No density items repeated here. |
| `GET_MATCHED_SHOWCASE.md` (G1–G9) | The get-matched funnel's "visible intelligence" | Greenlit; **Wave 1 (G1+G2+G3) shipped** (`1a384f41`) | G4–G9 are slotted into this roadmap unchanged (§10). The showcase philosophy — *make the engine's intelligence visible* — is extended site-wide here. |
| `OS_FOR_INVESTING_BUILD_PLAN.md` (55 features) | Daily-engagement feature catalog | Plan-only, awaiting go | Several items have **since shipped** (streak/checkins, decisions inbox, health score, lists, clubs schema, calendar, feed). Where a Delight Map item overlaps an OS-plan PR, it's cross-referenced, not duplicated. |
| `COMMUNITY_MASTER_PLAN.md` | Community strategy + safety phases | Proposed; Phase 0 (moderation) is prerequisite to growth | §9 "Belong" wave is gated on its Phase 0. |
| `investor-account-end-to-end-plan.md` | Account/portfolio product scope | Largely shipped or superseded | Background only. |

**The single most important finding** (it repeats across every surface): **the delight infrastructure is already built — it's just dark.** Confetti exists and fires once. A toast exists and fires twice. A full daily-streak system (API + table + triggers on dozens of pages) renders one tiny chip inside a header menu. Match scores render with no explanation. Certificates exist with no ceremony. Personalisation exists only for signed-in users. The plan below is mostly **wiring and choreography, not greenfield** — which is why it's cheap relative to its impact.

---

## 0. TL;DR — the ten moves that matter

1. **Adopt the thesis: "celebrate readiness, not trades" (§1).** Robinhood got fined for confetti on transactions; we're not a broker — our conversion is a *decision well made* (a save, a compare, a match, a completed learning path). Celebrating those is compliant, differentiating, and genuinely pro-consumer. This is the lane where we can out-feel Robinhood *because* of ASIC, not despite it.
2. **Build the 6 missing celebration primitives** (queued Toast, `<Confetti>`, `<ProgressRing>`, `<AnimatedNumber>`, `<MilestoneToast>`, `<Modal/Sheet>`) — ~2–3 days; everything else composes from them (§7).
3. **Make the first save an event** (§5 D1). Today: a star silently turns amber (`components/BookmarkButton.tsx`). It should feel like the moment a relationship starts — and it already works *anonymously*, which is a structural advantage Robinhood can't match (no signup wall before the feeling of ownership).
4. **Fix the mobile first screen** (§3 J1). Live capture: the homepage fold is a four-sentence text wall with **no CTA visible**, a truncated trust pill, and a cookie banner + chat FAB eating the bottom third. The breathing "pokie" CTA — the page's best moment — is below the fold.
5. **Consolidate five save systems into one mental model — "Your Shortlist"** (§3 J3). Bookmarks, watchlist, saved comparisons, saved searches, lists all exist separately; the aggregator (`/account/my-saves`) is buried. One name, one badge count, one home.
6. **Surface the streak as a "curiosity streak"** (§5 D6) — the system is fully live (`/api/checkin`, `lib/streak.ts`, `user_daily_checkins` in prod baseline) and keyed to *research actions* (reading, calculators, quizzes), which is exactly the ASIC-safe framing. Today it's an invisible 🔥 chip in the account dropdown.
7. **Give the platform a memory users can see** (§5 D10): "Since you were last here: 2 fee changes on your shortlist, 3 new farmland listings." All the diffing infrastructure (snapshots, rate-change log, watchlist alerts) already runs in crons; none of it greets the user.
8. **Design the send-off** (§5 D3). `/go/` is where revenue happens and the journey emotionally dies — a silent 302. Pre-flight save-prompt + post-return "how did it go?" turns the scariest moment into the most caring one (and feeds the broker-reliability data moat).
9. **Sell the account at the moment of intent** (§3 J6). Live capture of `/auth/signup`: "Create your account — Get started with Invest.com.au" — zero value proposition while an anonymous shortlist sits in localStorage waiting to be claimed. "Keep your shortlist" is the highest-converting sentence we're not saying.
10. **Measure feeling with one number** (§11): **Weekly Decision-Ready Returners** — visitors who saved ≥1 thing AND returned within 7 days. Every Delight Map item exists to move it.

---

## 1. The thesis: regulated delight

### 1.1 What the reference apps actually did (mechanics, not vibes)

| App | The mechanic under the magic | Transferable here? |
|---|---|---|
| Robinhood | Made the *first action* trivially small and celebrated it disproportionately (first stock = confetti, even $1 fractional) | ✅ as **first save / first compare / first plan** — not trades |
| Revolut | Onboarding as identity ritual — you watch your card/account being "made for you"; progress bars everywhere | ✅ directly — we already *compute* an Investor Profile (G2, shipped); we never stage its assembly outside get-matched |
| Cash App | One action per screen; verbs not nouns; zero jargon | ✅ get-matched already does this (live capture: step 1 is genuinely great); the rest of the site doesn't |
| Coinbase | Education that *pays* — learn → earn loop; progress and streaks turn passive into active | ✅ as learning paths + curiosity streak + certificates (all built, uncelebrated) |
| Monzo | Identity and belonging — "I'm a Monzo person"; the product confesses its workings in public | ✅ as honest-by-construction trust surfaces (we already do this: real counters or nothing) + community Phase 0+ |

### 1.2 The hard wall (and why it's actually our moat)

We operate pre-AFSL under the s766B factual carve-out; post-AFSL we are general-advice-only. `REGULATORY-AVOID-LIST.md` is absolute. ASIC's review of trading-app "digital engagement practices" (gamification nudging retail into *transactions*) and RG 234 put a hard ceiling on Robinhood-style mechanics **for brokers**.

**We are not a broker.** Nobody transacts here. Our conversion events are: compared honestly, saved a shortlist, learned a concept, matched with a licensed professional, made a *considered* decision. Every one of those is something ASIC actively wants retail investors to do more of. So:

> **Robinhood celebrates the trade. We celebrate the homework.**
> Confetti on "you compared the real annual cost of 3 brokers" is not a regulatory risk — it's consumer protection with good UX.

### 1.3 The six principles (the constitution for every item below)

1. **Celebrate decisions, not transactions.** No celebration, streak, count or nudge may ever key on an outbound `/go/` click, an enquiry volume, or anything that monetarily benefits us per-event. Celebrations key on *research milestones* the user owns.
2. **The intelligence must be visible.** (Inherited from the showcase plan, applied site-wide.) Every score shows its reasons on tap; every ranking links "why this order"; every number animates *because it just computed something for you*.
3. **Anonymous-first ownership.** The "it's mine" feeling must arrive *before* the email ask. Saves, shortlists, quiz results, calculator scenarios all work anonymously today — the account is pitched as "keep it", never "unlock it".
4. **Honest by construction.** Real numbers or nothing (the `/api/social-proof` ≥25 threshold pattern, the data-driven freshness claims from #1489). One fabricated counter costs more than an empty state ever will. Delight never lies.
5. **Warm voice, intact warnings.** Mandatory compliance copy from `lib/compliance.ts` is never weakened or hidden — but everything *around* it is written by a calm expert who's excited for you, not a legal department (§6 voice guide).
6. **Respect is a feature.** Every nudge is dismissible and stays dismissed (the existing `quizPromptDismissed` pattern); streaks have grace, never guilt; push/email arrive only at moments the user created. Reduced-motion is already globally respected — keep it that way for every new animation.

---

## 2. One user, seven moments — the emotional spine

**Maya, 27, Brisbane. $8k saved, never invested, heard about ETFs from a podcast. Opens the site on her phone in bed.** Everything below is the *current* experience, grounded in code and the live mirror captures.

| # | Moment | What happens today | What she feels | Score /5 |
|---|---|---|---|---|
| M1 | **Arrival** (60s) | Dark hero, 4-sentence text wall, no CTA above the fold (live capture), trust pill truncated mid-word, cookie banner + chat FAB cover the bottom third. The genuinely alive elements — rotating intent reel, breathing CTA (`HomeHero.tsx:193-231`), pulsing Get-Matched card — are all below the fold. | "Serious. Wordy. Where do I… start?" | **2** |
| M2 | **First browse** | If she finds `/invest`: live stat tiles, playful search suggestion, colour-coded sectors — genuinely good (live capture). If she lands on `/compare` (the likelier SEO entry): raw fee cells, first three rows all labelled "Affiliate partner", no guidance, no "what matters for someone like me". | `/invest`: "Ooh." `/compare`: "Spreadsheet. Are these ads?" | 4 / **2** |
| M3 | **First save** | Star fills amber, silently (`BookmarkButton.tsx` — no toast, no count, no "where did it go"). A parallel `ShortlistButton` *does* toast ("Added to shortlist") — two different save verbs, two feedbacks, five backing systems. | "Did that… do something?" | **1.5** |
| M4 | **The decision** | She opens the compare bar (good mechanic: sticky, "2/4 selected"). Versus page gives verdict cards. But nothing translates fees into *her* dollars at her $8k (FeeImpactVisualiser exists, unmounted), and CHESS/SMSF jargon has no inline help on the table. | "I think the $0 one? I guess?" | **2.5** |
| M5 | **The handoff** | Taps "Open account →" — instant 302 to the broker (`app/go/[slug]/route.ts`, technically excellent). No save-prompt before leaving, no acknowledgment ever after. If she comes back: nothing knows she left. | (gone — and if it goes badly at the broker, we never existed) | **1** |
| M6 | **Becoming someone** | `/auth/signup`: "Create your account — Get started with Invest.com.au" (live capture). No mention of the shortlist she built. Onboarding (3 steps) is actually well-made; it ends in `/account?welcome=1` → a banner above a utility dashboard. Her Investor Profile, persona, completeness ring — all exist (`/account/dashboard`) but nothing *arrives*. | "Standard signup. Now I'm… in a settings page?" | **2.5** |
| M7 | **The return** (day 2–30) | Signed-in: a personalised strip with her name + saved pills (good bones, `HomepagePersonalisedStrip.tsx`). No delta ("what changed"), no streak surfacing (the chip hides in the account dropdown), no milestone memory. Anonymous returner: literally nothing changes. Email: weekly digests exist for the engaged; the abandoned-quiz and abandoned-shortlist drips are **built but dark**. | "Same site. What was I doing again?" | **2** |

**The arc today: trust without warmth.** Maya is *informed* at every step and *moved* at none. The fix is not more features — it's choreography on the moments above.

---

## 3. Journey scorecards (the audit proper)

Scores: 0–5. Dimensions: **Clarity** (do I get it in 5s) · **Speed-to-value** · **Emotion** (do I feel anything) · **Progress** (am I building something) · **Trust** · **Mobile** · **Return** (does it pull me back).

| Journey | Clarity | Speed | Emotion | Progress | Trust | Mobile | Return | Notes |
|---|---|---|---|---|---|---|---|---|
| J1 First touch / home | 4 | 3 | 2 | 1 | 4 | 2 | 2 | Best motion on the site, hidden below fold |
| J2 Browse `/invest` | 4 | 4 | 3.5 | 2 | 4 | 4 | 2 | The internal reference standard, deservedly |
| J2b Compare `/compare` | 3 | 3 | 1.5 | 2 | 4 | 2 | 2 | The money page is the flattest page |
| J3 Save & shortlist | 2 | 4 | 1.5 | 1 | 3 | 3 | 1 | Five systems, zero ceremony |
| J4 Get-matched | 4.5 | 4 | 3.5→ | 3 | 4.5 | 4 | 2 | Wave 1 shipped; best surface; result not revisitable |
| J5 Advisor funnel | 4 | 3 | 3 | 2 | 3.5 | 3 | 1 | Value-first preview good; post-contact void |
| J6 Identity/account | 2 | 2 | 2 | 2.5 | 4 | 3 | 2 | Rich artifacts, fragmented across 40+ pages |
| J7 Learn | 4 | 4 | 2 | 3 | 4 | 4 | 2 | Paths+certs+tooltips exist; completion is a quiet green box |
| J8 Community | 3 | 3 | 2 | 1.5 | 2.5 | 3 | 1 | Gated on Phase 0 safety (separate plan) |

### J1 — First touch & global chrome
**Working:** flash-safe dark mode; the intent reel + breathing CTA + pulsing route card (`HomeRouteCards.tsx:255`) are the most "alive" elements on the site; MobileBottomNav is clean (Compare / Opportunities / Experts / Get Matched); QuizPromptBar respects dismissal; 404 is helpful.
**Findings:**
- **F1.1 (P0, live-verified):** mobile fold = headline + 4-sentence paragraph + compliance line; **no CTA, no number, no product**. The hero's right column (reel + CTA) stacks below. One reordering fixes the first 5 seconds. `components/HomeHero.tsx`
- **F1.2 (P1, live-verified):** trust pill truncates ("…never change our ra") at 390px. The site's best honesty claim, cut mid-word.
- **F1.3 (P1):** consent banner is a full-width 3-button block stacked with the chat FAB — the first-session bottom-third is chrome. A slim single-line bar variant would respect both the law and the fold.
- **F1.4 (P1):** header CTA still shouts "Take the quiz" *inside* `/get-matched` (live capture) — should swap to progress/exit state on funnel routes.
- **F1.5 (P2):** anonymous returner gets zero recognition (`HomepagePersonalisedStrip` returns null) while everything needed (localStorage saves, quiz profile, recently-viewed) is client-readable.
- **F1.6 (P2):** route-card counts are static numbers; `CountUp` exists (`components/ui/CountUp.tsx`) and isn't used where numbers should feel live.

### J2 — Browse → compare → decide
**Working:** `/invest` toolbar + live counts + "Try:" search suggestion + colour taxonomy; sticky CompareBar with 2–4 cap; honest freshness indicator (`FeesFreshnessIndicator`); affiliate handoff technically clean (`rel="sponsored"`, logging, rate-limited).
**Findings:**
- **F2.1 (P0):** compare table answers "what are the numbers" but never "what do these numbers mean *for me*". `FeeImpactVisualiser` exists unmounted; fee cells lack `JargonTooltip` coverage (CHESS/SMSF/FX untipped on the table itself).
- **F2.2 (P0):** decision moments are mute — enquiry success is a functional modal with no next step; broker click-out has no pre-flight save prompt and no return acknowledgment.
- **F2.3 (P1, live-captured):** default share-trading view opens with three "Affiliate partner"-tagged rows stacked first (rating order, not paid — but the optics at first glance are "ads first"). One organic row interleave or a "why this order" affordance at the top would defuse it.
- **F2.4 (P1):** filter-to-zero shows a generic recovery ("Clear all filters") with no nearest-alternative suggestion despite the facet counts being known.
- **F2.5 (P2):** match-score pill ("82% match") renders with no tap-for-reasons; the reasons engine exists (`lib/find-advisor/match-reasons.ts`, listings scorer).
- **F2.6 (verify):** mobile compare cards captured at near-zero opacity 3.5s post-load — possibly a headless IntersectionObserver artifact, possibly a real scroll-fade-in stall on mobile. Re-verify with the bot fleet before treating as a bug.

### J3 — Save & the shortlist
**Working:** anonymous saves with localStorage mirror + idempotent claim-on-signup (`ClaimAnonymousOnAuth` → `/api/account/claim-anonymous`) — this whole pipeline is a genuine asset; `/account/my-saves` aggregator exists.
**Findings:**
- **F3.1 (P0):** the save *moment* is silent (BookmarkButton: state flip only). The other save button (ShortlistButton) toasts. Pick one verb, one feedback, one celebration ladder (§5 D1/D2).
- **F3.2 (P0):** five parallel systems (bookmarks / watchlist / saved comparisons / saved searches / lists) with identical-looking star/heart affordances writing to different tables; the hub that unifies them is one card among 11 quick links.
- **F3.3 (P1):** no count badge anywhere persistent (bottom nav, header) — your shortlist has no presence until you go looking for it.
- **F3.4 (P2):** shortlist cap (4) dead-ends with a disabled tooltip instead of "compare these first / swap one out".

### J4/J5 — Get-matched & advisors (delta to the showcase plan only)
**Working:** the funnel is the site's emotional high-water mark — named steps, "~2 min remaining", warm question copy (live capture), real analyzing stages, Investor Profile hero + fee dollars (G1–G3 shipped), value-first advisor preview before the OTP wall, honest "You're connected!" confirmation.
**Findings (not already covered by G4–G9):**
- **F4.1 (P1):** the result is hard to *re-find* — no "View my plan" persistent affordance for anonymous users post-session (token link only lives in an optional email). A localStorage pointer to the last plan + a "Your plan" chip in the header/bottom-nav would keep the artifact alive.
- **F4.2 (P1):** post-advisor-contact void — no lead status surface ("Did they get it? What now?"). A minimal tracker state on the plan ("Sent → Opened → Replied", even just "sent ✓, typically replies in 4h") kills the anxiety.
- **F4.3 (P2):** advisor match cards show logo, not face; no review snippet; no response-time *promise*. Photos + one verbatim review line (where licence-mode allows) are the trust difference for a nervous first-timer.
- **F4.4 (P2):** match score reads false-precise ("83") with no confidence framing — G7's sharpen loop is the fix; until then a "based on 5 answers" subtitle is honest and cheap.

### J6 — Identity & account
**Working:** dashboard persona card, cohort benchmark, profile-completeness meter, health score A–E, goals with progress bars, decisions inbox, timeline — a remarkable amount of identity *data* exists.
**Findings:**
- **F6.1 (P0, live-verified):** signup page sells nothing ("Get started with Invest.com.au") while holding the user's anonymous shortlist hostage-for-free. "Keep your shortlist — 3 platforms, 1 comparison" with a live preview of what gets claimed is the entire pitch.
- **F6.2 (P0):** onboarding ends in a banner, not an arrival. The data collected (interests, experience, goal) can assemble the personal home *in front of the user* (§5 D4) — Revolut's card-creation moment, ours is profile-creation.
- **F6.3 (P1):** the account is 40+ flat pages with three competing "home" surfaces (`/account`, `/account/dashboard`, `AccountClient` legacy shell). One spine: **Today / Your Shortlist / Your Profile / Settings**; everything else is a card inside those.
- **F6.4 (P2):** profile completeness exists but unlocks nothing visible. Completion should visibly sharpen things the user already sees (match %, fee projections in $, supply counts) — "complete budget → your matches get dollar figures".

### J7 — Learn & curiosity
**Working:** 5 learning paths with persistent progress (localStorage + DB merge), course certificates with public verify pages (`INV-YYYY-NNNNN`), 500-term glossary with `JargonTooltip`, reading-progress bar, NextActions strip, calculators with state persistence + shareable deep links.
**Findings:**
- **F7.1 (P1):** path completion = quiet green box; certificates exist for paid courses but **not for the free paths** — the single cheapest "Coinbase Earn" move available (D8).
- **F7.2 (P1):** the streak system counts article reads/calculator use *today* and surfaces nowhere outside the account dropdown chip (verified: `StreakBadge` mounts only in `components/layout/AccountButton.tsx`).
- **F7.3 (P2):** articles end without a "next step on your path" tie-in when the article belongs to a path the user started.
- **F7.4 (P2):** calculator results don't offer "save this scenario to your account" naming — state persists silently per-calculator but isn't an owned artifact.

### J8 — Community (deferred to COMMUNITY_MASTER_PLAN Phase 0)
Forum is live but pre-moderation-gate; QOTD built and flag-gated off; member identity is name-only. **No delight work should drive traffic here until Phase 0 ships** (P0 safety items). The Wrapped/belonging items in §5 are sequenced after it.

---

## 4. Trust architecture — where trust is built, beat by beat

Trust is already this platform's strongest suit (honest counters, data-driven freshness, real verification, candid `/how-we-earn`). The audit found trust *content* everywhere but trust *choreography* missing at exactly three beats:

1. **The first 5 seconds:** the truncated trust pill (F1.2) and the affiliate-rows-first optics (F2.3). Fixes are mechanical.
2. **The numbers' provenance on tap:** every score/rank/freshness claim should open its "why" in one tap (reasons sheet, methodology link, last-checked detail). The pattern exists on get-matched (`MatchExplainerCard`); extend it to compare rows, match pills, and the Invest Score gauge.
3. **The compliance voice (§6):** mandatory warnings stay verbatim; the *surrounding* copy stops sounding like it's afraid of you. Today the footer reads as "tread carefully"; it can read as "here's exactly how we make money and why you can check our work" — same facts, opposite feeling. Monzo's trick was making the honest mechanics a *brand asset*.

**Honesty patterns to keep sacred (and extend):** social-proof threshold (≥25 real sessions or render nothing — `app/api/social-proof/route.ts:24`); freshness claims derived from `fee_last_checked`, never asserted; no fake urgency — deal expiry countdowns only off real `brokers.deal_expiry`.

---

## 5. The Delight Map — twelve signature moments

Each moment: trigger → choreography → compliance note → what already exists → effort (S <1d · M 1–3d · L >3d). All copy below is draft voice (§6), all celebration visuals compose from the §7 primitives, all of it respects `prefers-reduced-motion` (graceful static fallbacks) and principle #6 (dismissible, never nagging).

### D1 — The first save: "your shortlist is born" · **S–M**
**Trigger:** first-ever save (any type), anonymous or signed-in (localStorage flag `iv_first_save_done`).
**Choreography:** star fills with a spring `check-pop` (CSS exists, `globals.css:704`) → a one-time rich toast slides up: **"Saved. This is the start of your shortlist."** with the item's name and a *"Where saves live →"* link → the bottom-nav/header save-count badge appears for the first time with a single pulse. Subsequent saves: light toast + badge increment (a `FloatingNumber` "+1" at the tap point).
**Compliance:** celebrates the *act of organising research*, references no product quality. No issue.
**Exists already:** anonymous save pipeline end-to-end; `check-pop`/`toast-enter` CSS; `useToast` (needs the queued version, §7).
**Also fixes:** F3.1, F3.3, and the BookmarkButton/ShortlistButton feedback split (one shared celebration hook).

### D2 — Shortlist-of-three: "you're ready to decide" · **M**
**Trigger:** third saved item of a comparable type (brokers, listings, advisors).
**Choreography:** bottom sheet (not modal — thumb-reach): **"Three's a shortlist. Want to see them side by side?"** → primary "Compare your 3" → secondary "Keep browsing". If anonymous, one quiet line under the primary: *"Free account keeps this shortlist on all your devices."* First time only; never repeats per type.
**Compliance:** invitation to *compare* — the most general-advice-safe verb we have.
**Exists:** CompareBar + versus pages + saved-comparisons. This is pure choreography on top.

### D3 — The send-off and the return · **M**
**Trigger A (send-off):** tap on an affiliate CTA when the item is *not* saved. A 1.5s non-blocking micro-sheet rides the navigation: **"Off to Stake — good luck in there. We've kept your comparison safe."** with an auto-save-to-shortlist (undoable). No extra tap added — the redirect proceeds; the sheet is informational. (A/B the auto-save vs. prompt variant; never gate the redirect.)
**Trigger B (return):** next visit after an outbound click (cookie/localStorage stamp): the welcome strip leads with **"How did it go with Stake?"** → "Opened an account 🎉" / "Still deciding" / "Not for me". Each answer routes usefully (mark decided + suggest next step / resurface comparison / suggest alternatives) and — flag-gated — feeds the broker-reliability micro-survey (OS plan 8.5) giving us proprietary "real switching experience" data no AU competitor has.
**Compliance:** factual acknowledgment of *their* action; no inducement (the click already happened); survey is factual experience collection. Keep `/go/` mechanics untouched (no interstitial).
**Exists:** click logging with metadata in `affiliate_clicks` (the return stamp can derive from it server-side for signed-in users), welcome strip slot, undo-toast pattern.

### D4 — Arrival: the personal home assembles itself · **M**
**Trigger:** onboarding completion (replaces the `?welcome=1` banner).
**Choreography:** full-screen 2.5s sequence (skippable, reduced-motion = static summary card): "Building your home…" → three staggered card-reveals matching her actual answers — *"ETFs & shares — your focus"*, *"Beginner-friendly explainers on"*, *"Your shortlist (3 saved)"* — each with the count-up treatment → settles into the dashboard with those exact cards at top. The animation *is* the information architecture: she watches her account become hers.
**Compliance:** interests/experience are her stated answers (the G2 "based on what you told us" framing, reused verbatim).
**Exists:** all the data (interests, experience, claimed saves), the dashboard cards, `AnalyzingScreen` stagger patterns to copy from get-matched.

### D5 — Profile strength that unlocks visible sharpness · **M**
**Trigger:** dashboard + account header, persistent.
**Choreography:** `<ProgressRing>` around the avatar (62%) → tap = sheet listing what each missing field *visibly sharpens*: "Add your budget band → fee estimates become **dollar figures** on every match" / "Add your state → advisor matches go local". Completing a field fires the milestone toast (D7) and — the key — the user *watches* a number on screen get more specific.
**Compliance:** all unlocks are factual-computation precision, not advice quality. Framing: "the more you tell us, the more specific our *information* gets."
**Exists:** completeness calc on `/account/dashboard`, fee-projection lib (G3), match scoring context. Missing only the ring + unlock copy + wiring.

### D6 — The curiosity streak (surface what's already burning) · **S–M**
**Trigger:** `user_daily_checkins` — already populated by reads/calculators/quizzes/watchlist views via `CheckinTrigger` on dozens of pages.
**Choreography:** move `StreakBadge` from the account dropdown to the header proper (signed-in) with a once-per-day increment moment: flame pulses + count-up on the first qualifying action of the day, with a single line: **"Day 4 of learning something about your money."** Streak panel on tap: calendar dots + what counted. **Grace built in:** a missed day shows "streak paused — it'll be here tomorrow" (no loss-aversion framing, no "you'll lose your streak!" push). Milestones at 3/7/30 days route through D7.
**Compliance:** keyed exclusively to *research/learning* actions (the existing source enum is already exactly this: `article_read, calculator, quiz, watchlist…`). Never add an outbound-click or enquiry source. This is the anti-Robinhood streak: it rewards homework, with grace instead of guilt.
**Exists:** **everything** — API, table (prod baseline), math lib, triggers, badge. This is a CSS-and-placement task with copy.

### D7 — "Firsts": the milestone ladder · **M**
**Trigger set (v1, all factual research acts):** first save · first comparison viewed · first calculator run · first article finished · first learning-path step · profile complete · first plan saved · first advisor question asked · streak 3/7/30.
**Choreography:** `<MilestoneToast>` (icon + one warm line + micro-confetti for the big ones only: first save, profile complete, path complete). Every milestone also writes to the existing account timeline so `/account` becomes a *story* ("12 May — your first comparison"). A quiet "Firsts" card on the dashboard shows collected + next-up (subtle, not a badge-wall).
**Compliance:** research milestones only; no volume leaderboards; nothing keyed to money movement.
**Exists:** timeline table + events, toast CSS, confetti CSS. Needs the registry (`lib/milestones.ts`, pure + tested) + toast component.

### D8 — Learning that ends with a certificate, not a green box · **S–M**
**Trigger:** learning-path completion (and per-module midpoints on long paths).
**Choreography:** completion screen upgrade: confetti-lite + **a real shareable mini-certificate for free paths** (reuse the existing `INV-YYYY-NNNNN` certificate machinery + OG-image card: "Maya completed the New Investor Starter Kit — 12 steps, 65 minutes") + "what opens up next" (the next path, pre-positioned). Article pages that belong to an in-progress path end with "Step 7 of 12 ✓ — next: franking credits, 4 min".
**Compliance:** certificates assert completed *education* — clean. (Avoid "qualified/certified investor" wording — "completed" only.)
**Exists:** path progress system, certificate issuance + public verify pages, OG-image route. The free-path bridge is small.

### D9 — Numbers that talk back · **M**
**Trigger:** compare table rows, broker cards, versus pages.
**Choreography:** a persistent scenario chip above the compare table — "For a **$10k** portfolio, **5 trades/yr**" (editable; defaults from profile when present, sensible default when anonymous) — and every row's "est. annual cost" becomes a *personal* dollar figure with `<AnimatedNumber>` re-rolling when the scenario changes. Tap any fee → plain-English line ("FX 0.5% = **$50** each time you move $10k into US shares"). This is G3/G4's philosophy applied to the public money page.
**Compliance:** pure calculator output, the explicitly sanctioned lane ("factual computation"). `Fee data incomplete` stays honest where inputs are missing (#1489 pattern).
**Exists:** `lib/cost-scenarios.ts`, `lib/getmatched/fee-projection.ts`, `FeeImpactVisualiser` (unmounted), `CountUp`. This is composition, not construction. **Also fixes F2.1 and most of J2b's emotional flatness.**

### D10 — "Since you were here": the platform remembers · **M–L**
**Trigger:** any return visit ≥24h gap with ≥1 saved/viewed item (signed-in via DB; anonymous via localStorage recents).
**Choreography:** the personalised strip leads with deltas, max 3, each tappable: "**CommSec** dropped its US fee ↓ since Tuesday" · "**2 new** farmland listings in QLD" · "Your **day-3** streak is one read away". Empty delta = strip stays as today (no fabricated news).
**Compliance:** factual change reporting from snapshot diffs we already compute (`savings_rate_snapshots`, `broker_price_snapshots`, `rate_change_log`, watchlist-alert cron).
**Exists:** all diffing crons + tables; `user_rate_memory` is specced in the OS plan (PR 1.3) — this item is its UI face. The anonymous variant needs only recently-viewed diffs.

### D11 — Every score explains itself · **S–M**
**Trigger:** any match % pill, Invest Score gauge, trust score, health grade.
**Choreography:** tap → bottom sheet with the 3 real reasons + "sharpen this" path (G7's loop where applicable; profile fields via D5 elsewhere). Score counts up on first render (the G1 pattern, site-wide).
**Compliance:** *more* transparency = *less* implied-endorsement risk. Reasons text already passes through the licence-mode-gated reason libs.
**Exists:** reason engines for advisors + get-matched; needs the listings/compare wiring + the sheet primitive.

### D12 — Year in Decisions ("Wrapped"), plus an EOFY edition · **L** *(seasonal, gated on D7 data)*
**Trigger:** December (calendar year) + June (EOFY — the Australian twist Spotify can't do).
**Choreography:** swipeable full-screen story from the user's own event history: "You compared **14** platforms · read **9** guides (top topic: ETFs) · your longest streak: **11 days** · you asked a licensed adviser **2** questions · …and you did it all *before* moving a dollar. That's how it's done." Shareable OG card at the end. Anonymous users get a teaser slide ("sign in to keep your year").
**Compliance:** the user's own factual activity; the closing line *celebrates diligence* — deliberately the opposite of trade-count bragging. Crypto slide carries `CRYPTO_WARNING` if crypto content featured. Legal review of the share-card template once, then it's a cron.
**Exists:** timeline events, checkins, bookmarks, quiz history, OG-image pipeline. Build after D7 has accrued a quarter of event data — schedule for EOFY 2027 dry-run at small scale, headline at Dec 2027… or EOFY 2026 if D7 ships in Wave 1–2 and we accept thinner stats. **Founder call on timing.**

---

## 6. Voice — the calm expert who's excited for you

The compliance constants in `lib/compliance.ts` are untouchable and stay verbatim. Everything else gets one voice: **plain Australian, second person, verbs first, numbers humanised, never breathless.** The microcopy rule of thumb: *would a good adviser say this sentence aloud to a nervous first-timer?*

| Surface (file) | Today | Proposed | Why it's still compliant |
|---|---|---|---|
| Save toast (new, D1) | *(silence)* | "Saved. This is the start of your shortlist." | Describes the user's own action |
| Signup headline (`SignupClient.tsx`) | "Create your account — Get started with Invest.com.au" | "Keep what you've built. Your shortlist, comparisons and streak — on every device." | Factual feature description |
| Onboarding finish (`OnboardingClient.tsx`) | banner: "Welcome to Invest.com.au! Your profile is set up…" | "That's everything. Watch this — we're building your home." (→ D4) | No claims at all |
| Empty shortlist | *(varies by system)* | "Nothing saved yet. The star on any card starts your shortlist." | Instructional |
| Filter-to-zero (`EmptyState`) | "No listings match your filters · Clear all filters" | "Nothing matches *all* of that. Closest: drop the state filter — **12** in QLD." | Factual counts we already have |
| Send-off (D3) | *(silent 302)* | "Off to Stake — we've kept your comparison safe for when you're back." | States our action, endorses nothing |
| Streak line (D6) | *(invisible)* | "Day 4 of learning something about your money." | Education framing |
| Footer legal intro (`Footer.tsx`) | *(wall of collapsibles)* | One line above the same collapsibles: "The short version: general information only, we never give personal advice, and here's exactly how we earn." | Same disclosures, one honest preamble |

**Banned in celebration copy** (pre-empting RG 234 / s18 review): "best for you", "you should", "don't miss", "act now", "hot", any superlative about a product inside a celebration. Celebrations talk about *the user's process*, never a product's quality.

---

## 7. The design language of "alive" — system work

The audit found a **CSS-only motion vocabulary of ~350 lines** (springy cubic-beziers, stagger systems, confetti keyframes, check-pops, count-ups, shimmer, sheet-up) with global reduced-motion handling — and almost no reusable components wrapping it. No animation library is needed or wanted (keep the bundle lean; the e2e perf budgets stay green).

### 7.1 Build these six primitives first (~2–3 days total; everything in §5 composes from them)

| Primitive | Spec | Reuses |
|---|---|---|
| `<ToastProvider>` + `useToast()` v2 | Queued, variant (light/rich/milestone), action slot (Undo/link), bottom-nav-aware offset, `role="status"` | `.toast-enter/.toast-exit` CSS; replaces the imperative DOM-injection hook in `components/Toast.tsx` (keep its API shape so ShortlistButton/SaveComparisonButton/admin migrate by import-swap) |
| `<Confetti>` | Portal burst, `count/colors/origin` props, auto-cleanup, reduced-motion = single check-pop | The 24-particle inline implementation in `QuizResultsScreen.tsx` + `confettiBurst` keyframes — extract, don't rewrite |
| `<ProgressRing>` | SVG stroke-dashoffset, animated on mount/in-view, size/colour/label slots | Invest Score gauge math (`HomeMarketToday`) |
| `<AnimatedNumber>` | Count-up + re-roll on value change + optional highlight flash; `tnum` enforced | `CountUp.tsx` + `.number-flash` keyframe |
| `<MilestoneToast>` | Rich toast variant: icon, line, optional micro-confetti; writes timeline event | Toast v2 + Confetti + existing timeline insert |
| `<Sheet>` (bottom sheet/modal) | Focus-trapped, `animate-sheet-up`, backdrop fade, thumb-zone actions | `.animate-sheet-up` CSS exists; unlocks D2/D3/D11 + mobile filters (§8) |

### 7.2 Tokenise motion (S)
Hardcoded durations/easings → CSS vars in `globals.css`: `--motion-fast: 120ms` · `--motion-base: 200ms` · `--motion-celebrate: 350ms` · `--ease-spring: cubic-bezier(0.34,1.56,0.64,1)` · `--ease-out: cubic-bezier(0.2,0.8,0.4,1)`. New code uses tokens; old code migrates opportunistically. One place to tune the whole site's "feel".

### 7.3 Keep / don't build
**Keep sacred:** dark mode coverage, reduced-motion handling, the Icon system (150+, no emoji in UI chrome), skeletons-over-spinners, the iv2 type system (`.iv2-bignum`/`tnum` on every number).
**Don't build:** Framer Motion/Lottie (bundle), sound effects (web finance ≠ game), haptics v1 (Vibration API is Android-only and easy to get wrong — revisit post-launch), mascot animation (the kangaroo SVG stays a logo accent, not a Clippy).

---

## 8. Mobile-first specifics

1. **Fold discipline (P0):** Home hero on 390px must show headline (≤2 lines), one-line subhead, the breathing CTA, and one live number. Everything else scrolls. (F1.1/F1.2.)
2. **The bottom nav earns a fifth state, not a fifth tab:** keep Compare / Opportunities / Experts / Get Matched, add the **save-count badge** on a "Saved" affordance (either replacing the least-used tab per analytics or as a badge on Compare) — your shortlist should be one thumb-tap from anywhere. The streak flame lives in the header, not the nav (calm, not casino).
3. **Filters in sheets:** `/compare` and `/invest` facet panels open as bottom sheets (`<Sheet>`) with sticky apply — already the pattern on `/invest` mobile ("All filters"); unify compare to match.
4. **Sticky decision bar:** the CompareBar pattern is good — extend it to versus pages ("Save this comparison · Set fee alert") and listing detail ("Save · Enquire").
5. **Consent bar slim variant (P1):** single-line bottom bar with "Accept · Essential · Manage", FAB suppressed until consent answered. (Legal text unchanged; it's a layout change.)
6. **PWA moment:** `public/manifest.json` exists; add the add-to-home-screen prompt at the *right* moment — immediately after D2 (shortlist-of-three) or D4 (arrival), never on first paint. Push opt-in (`PushNotificationOptIn`, topic-based, already respectful) moves to post-first-alert-need moments ("Want to know if these 3 change their fees?").
7. **Performance is a feeling:** every new celebration is CSS/SVG only; no new JS heavier than the primitives; keep skeletons for anything async. The fade-in-stall suspicion (F2.6) gets verified and, if real, the scroll-fade fallback timer shortens on mobile.

---

## 9. The personal-advice firewall — what we deliberately do NOT build

Per `REGULATORY-AVOID-LIST.md` (never-autonomous, Tier-E equivalent) plus this plan's own red lines:

| Never | Why | The safe twin we build instead |
|---|---|---|
| Celebration/confetti/streak keyed to outbound clicks, enquiries, or anything we're paid per-event | Inducement + conflicted-design optics; the exact Robinhood failure | Celebrate saves, comparisons, learning (D1–D8) |
| Leaderboards/competition on investing activity or portfolio size | Volume gamification of money decisions | Private "Firsts" ladder (D7); advisor leaderboard stays B2B |
| Countdown/scarcity on financial products beyond factual `deal_expiry` | Fake urgency = s18/RG234 | Factual expiry badges only |
| "Investors like you bought/chose X" | Herding + implied personal advice | Cohort stats stay aggregate + non-directive ("are looking at", never "chose") |
| Any celebration copy with product superlatives | Implied endorsement inside an emotional moment | §6 banned-words list; celebrations reference the user's process only |
| Push notifications on market moves ("ASX dropped — check your watchlist!") | Engineered anxiety → transaction nudge | Push only for user-created triggers (their alerts, their shortlist's fee changes) |
| Personalised "you should switch to X" | Personal advice | D9's scenario chip computes *costs*; the user concludes |
| Anything touching the avoid-list escalators (client money, CSF, credit, CDR…) | Separate licences | Already fenced; no §5 item goes near them |

Every §5 item ships with `lib/compliance.ts` strings where financial content renders, respects licence-mode gates (`SHOW_RATINGS` etc. — celebrations never resurface a gated rating), and the existing compliance-disclosure CI gate.

---

## 10. Roadmap — four waves, reconciled with every existing plan

Tiers per `docs/audits/MERGE_AUTHORIZATION.md`. "Built %" = how much already exists in code (the audit's recurring finding). No item below requires a new DB migration except where marked ⚠ (the ledger baseline-squash remains the infrastructure gate for those).

### Wave 1 — "Feel the save" (~1–2 weeks, all Tier A/B, zero schema)
The highest feeling-per-engineering-hour in the building.

| # | Item | Refs | Built % | Effort | Tier |
|---|---|---|---|---|---|
| 1.1 | Six primitives + motion tokens | §7 | 60% (CSS exists) | M | A |
| 1.2 | D1 first-save moment + one save-feedback path | F3.1 | 70% | S–M | A |
| 1.3 | D6 streak surfacing + grace copy | F7.2 | 90% | S–M | A |
| 1.4 | Mobile fold fix: CTA above fold, trust-pill ellipsis fix, consent slim bar, header quiz-state | F1.1–F1.4 | — | M | A |
| 1.5 | D9 scenario chip + personal $ on compare (first slice: share-trading table) | F2.1 | 70% (libs exist) | M | A |
| 1.6 | D8 path-completion ceremony + free-path certificates | F7.1 | 75% | S–M | A/B |
| 1.7 | D2 shortlist-of-three sheet | F3.4 | 80% | S | A |
| 1.8 | Compare "why this order" affordance + zero-result nearest-alternative | F2.3, F2.4 | 50% | S–M | A |
| 1.9 | Verify F2.6 (mobile fade-stall) via bot fleet; fix if real | F2.6 | — | S | A |

### Wave 2 — "Become someone" (~2–4 weeks)
| # | Item | Refs | Built % | Effort | Tier |
|---|---|---|---|---|---|
| 2.1 | F6.1 signup-with-a-reason (claim preview: "keep your 3 saves") | D1 data | 80% | S–M | A |
| 2.2 | D4 arrival sequence replacing welcome banner | F6.2 | 70% | M | A |
| 2.3 | D5 profile ring + visible unlocks | F6.4 | 75% | M | A |
| 2.4 | D7 milestones registry + toasts + timeline writes | — | 60% | M | A/B |
| 2.5 | "Your Shortlist" IA consolidation (one name, one hub, badge count; tables untouched) | F3.2, F3.3 | 70% | M | A |
| 2.6 | Account spine: Today / Shortlist / Profile / Settings (40 pages become cards) | F6.3 | 50% | L | A |
| 2.7 | **G4 + G6 + G7** (showcase Wave 2: what-if re-ranking, roadmap plan, sharpen loop) | showcase | per plan | M×3 | A |
| 2.8 | F4.1 plan re-find (localStorage pointer + header chip) & F4.2 lead-sent status line | — | 60% | S–M | A |
| 2.9 | D11 score-reasons sheets on compare/listings pills | F2.5 | 65% | S–M | A |

### Wave 3 — "Come back tomorrow" (~3–6 weeks; touches crons → Tier C announcements)
| # | Item | Refs | Built % | Effort | Tier |
|---|---|---|---|---|---|
| 3.1 | D3 send-off + return prompt (+ flag-gated reliability micro-survey ⚠ table) | F2.2 | 50% | M | A → C |
| 3.2 | D10 delta strip (signed-in via snapshots; anon via recents) | OS 1.3 | 60% | M–L | B |
| 3.3 | Light the dark drips: abandoned-quiz, abandoned-shortlist, investor-drip (copy pass through §6 voice first) | agent-3 inventory | 90% | S–M | C |
| 3.4 | Morning brief daily opt-in (OS 3.1) + push at need-moments (§8.6) | — | 70% | M | C |
| 3.5 | D12 Wrapped/EOFY — build decision + dry-run scope | D7 data | 40% | L | A (+legal review of share card) |
| 3.6 | **G5 + G8 + G9** (showcase Wave 3: live narrowing, AI intake, stack + alerts) | showcase | per plan | M×3 | A–C |

### Wave 4 — "Belong" (gated on COMMUNITY_MASTER_PLAN Phase 0)
QOTD on → community entry from article pages → contributor identity (earned, not admin-assigned, per community plan Phase 2) → clubs decision → Wrapped community stats. **Nothing here starts until the moderation gate ships.**

**Explicit do-not-do list (decided, to stop re-scoping):** no animation library; no sound; no haptics v1; no fifth bottom-nav tab without analytics; no consumer leaderboards; no streak-loss push; no celebration A/B that withholds compliance copy; nothing from §9's left column, ever.

---

## 11. Measurement — does it actually feel like theirs?

**North star: Weekly Decision-Ready Returners (WDRR)** — unique visitors who have ≥1 saved item AND ≥2 sessions within 7 days. It's the behavioural signature of "this is my platform now". Secondary: save-rate per first session, signup-from-claim rate (D1→2.1 funnel), streak-3 attainment, plan re-open rate, return-after-/go/ rate (D3).

**New events (PostHog, names final):** `save_first`, `shortlist_ready_shown/accepted`, `sendoff_shown`, `return_after_go_answered`, `arrival_sequence_completed/skipped`, `profile_ring_opened/field_completed`, `streak_incremented/milestone`, `milestone_unlocked{key}`, `path_certificate_issued/shared`, `scenario_chip_edited`, `score_reasons_opened`, `delta_strip_clicked`, `wrapped_viewed/shared`.

**Guardrails (delight must not curdle into nagging):** toast/sheet dismiss-rates per surface (>40% dismiss = kill or retune); email unsub + push revoke rates on the newly-lit drips; streak-panel "turn this off" usage (ship the off-switch with it); CWV budgets unchanged (every primitive is CSS/SVG); zero increase in compliance-surface bounce (the §6 rewrites should *reduce* it).

**Review cadence:** WDRR weekly on the analytics dashboard; one-month post-Wave-1 review decides whether Wave 3's heavier retention work proceeds as planned or retunes.

---

## Appendix A — the "already built, just dark" inventory (don't rebuild any of this)

| Asset | Where | State |
|---|---|---|
| Daily streak system (API, math, table, page triggers, badge) | `app/api/checkin/route.ts`, `lib/streak.ts`, `user_daily_checkins` (baseline), `components/streak/*`, mounted via `CheckinTrigger` across content pages | Live in prod; badge renders only in `components/layout/AccountButton.tsx` |
| Confetti | `QuizResultsScreen.tsx` inline + `confettiBurst` keyframes (`globals.css:593-620`) | Fires on one screen |
| Toast | `components/Toast.tsx` (imperative, single-slot) + enter/exit CSS | Used by ShortlistButton, SaveComparisonButton, admin |
| Check-pop / celebrate-emoji / number-flash / sheet-up animations | `globals.css:704,522,713,937` | Un-componentized |
| Count-up numbers | `components/ui/CountUp.tsx` | Used sparsely |
| Fee → personal dollars | `lib/cost-scenarios.ts`, `lib/getmatched/fee-projection.ts`, `FeeImpactVisualiser` | Get-matched only / unmounted |
| Anonymous save + claim | `BookmarkButton`, `anonymous_saves`, `ClaimAnonymousOnAuth`, `/api/account/claim-anonymous` | Fully wired, zero ceremony |
| Profile completeness | `/account/dashboard` | Meter exists, unlocks nothing |
| Persona / investor profile | `lib/getmatched/investor-profile.ts` (G2, shipped), `/persona/[type]`, dashboard persona card | Funnel-only |
| Certificates + public verify | `lib/course-certificates.ts`, `/certificate/[number]` | Paid courses only |
| Honest social proof | `app/api/social-proof/route.ts` (≥25 threshold) | Dark until launch traffic — by design, keep |
| Change-detection | `savings_rate_snapshots`, `broker_price_snapshots`, `rate_change_log`, watchlist-alert + digest crons | Emails only; no on-site surface |
| Re-engagement drips | abandoned-quiz, abandoned-shortlist, investor-drip crons | Built, dark |
| Push + topics | `PushNotificationOptIn`, `/api/push/subscribe` | Built; no moment-based prompting |
| PWA manifest | `public/manifest.json` | No install prompt |
| Reasons engines | `lib/quiz-advisor-match-reasons.ts`, `lib/find-advisor/match-reasons.ts`, `MatchExplainerCard` | Funnel-only |
| JargonTooltip + 500-term glossary | `components/JargonTooltip.tsx`, `lib/glossary.ts` | Articles yes; money tables no |
| Timeline / decisions / health / goals / cohort | `/account/*` | Data-rich, story-less |

## Appendix B — friction index (quick reference)

P0: F1.1 fold · F2.1 numbers-for-me · F2.2 mute decisions · F3.1 silent save · F3.2 five save systems · F6.1 signup sells nothing · F6.2 banner-not-arrival
P1: F1.2 truncated trust pill · F1.3 consent bulk · F1.4 header quiz-state · F2.3 affiliate-first optics · F2.4 zero-result dead end · F3.3 no badge count · F4.1 plan re-find · F4.2 lead void · F6.3 account fragmentation · F7.1 quiet completion · F7.2 invisible streak
P2: F1.5 anon returner · F1.6 static counts · F2.5 unexplained match % · F3.4 cap dead-end · F4.3 faceless advisor cards · F4.4 false-precise score · F6.4 unlock-less completeness · F7.3 path-article tie-in · F7.4 unnamed scenarios
Verify-first: F2.6 mobile fade-stall (possible headless artifact)

---

## Status ledger (updated 2026-06-11, build session 1)

Founder greenlit "build this end to end". Shipped on `claude/fervent-shannon-qxhsdg` (PR #1558), all tested + type-checked:

| Item | Status | Commit |
|---|---|---|
| §7.1 primitives: Toast v2 (queued, rich/milestone), `<Confetti>`, `<ProgressRing>`, `<AnimatedNumber>`, motion tokens; BottomSheet extended (footer/focus-restore/md-centring) instead of a duplicate Sheet | ✅ shipped | `d4ff58cf`, `83b930ef` |
| D1 first-save moment (unified BookmarkButton/ShortlistButton feedback) | ✅ shipped | `d4ff58cf` |
| D2 shortlist-of-three sheet | ✅ shipped | `d4ff58cf` |
| D6 streak surfacing (interactive chip + sheet + mute + daily/3/7/30 toasts) | ✅ shipped | `d4ff58cf` |
| 1.4 fold fixes (hero CTA above fold, trust-pill wrap, slim consent, calm in-funnel header, stale /quiz link) | ✅ shipped | `3c28eb8c` |
| D9 compare slice (persistent scenario chip, animated $ cells both layouts, mobile column tooltips) + D7 first_compare on 2 pins | ✅ shipped | `83b930ef` |
| D8 path ceremony (confetti on live completion, milestones, next-path link) | ✅ shipped | `371e84e6` |
| 2.1 signup claim preview ("Keep what you've built — N saved items") | ✅ shipped | `371e84e6` |
| D3 send-off + return loop (/go/ acknowledgment, "how did it go?", decided_broker milestone) | ✅ shipped | `371e84e6` |
| D7 milestones: registry + first_save / first_compare / first_path_step / path_complete / first_article / streak_3·7·30 / decided_broker wired | ✅ shipped | this branch |
| D4 arrival sequence (onboarding ends with the home assembling itself, skippable, reduced-motion-safe) | ✅ shipped | session 2 |
| D5 profile-strength ring + visible unlocks + profile_complete milestone | ✅ shipped | `7db33587` |
| F4.1 plan re-find ("Your plan" chip, header + mobile menu, 60-day stamp) + first_plan_saved + first_calculator wiring | ✅ shipped | `7db33587` |
| G4 + G6 + G7 (what-if panel, plan roadmap lanes, sharpen card) | ✅ found already shipped on main by a parallel session (grounding check before building — don't rebuild) | main |
| 1.8 compare recovery: zero-result nearest-alternative with real counts + "Why this order?" sheet (live sort state + canonical disclosure copy) | ✅ shipped | session 3 |
| D11 listings slice: `computeMatchBreakdown` emits factual reasons; match pill opens a why-this-score sheet with the profile-sharpening link (BottomSheet now portals to body so in-card sheets can't trigger card navigation) | ✅ shipped | session 3 |
| 1.9 mobile fade-stall (F2.6) | ✅ verified NOT a bug — live probe: cards at opacity 1, animations complete, 4s post-load unscrolled; original capture was a mid-animation screenshot artifact | — |
| D10 anonymous slice: FeeMemoryTrigger on broker pages + `/api/brokers/fees` (Zod, rate-limited, shared-cache) + homepage "Since you were here" strip — factual diffs only, renders nothing without a change, dismiss re-baselines | ✅ shipped | session 4 |
| Main-breakage repair: PR #1561 merged consumers of `lib/journey` / `journeyMoment` whose modules never landed — reconstructed both on the pinned contract (Stage 1: Curious …) over the milestone registry | ✅ shipped | session 4 |
| D10 signed-in slice (watchlist-wide deltas via `user_rate_memory` — ⚠ schema) · account IA (2.5/2.6) · Wave-3 crons (drips, morning brief — Tier C, announce first) · D12 Wrapped (gated on milestone data) | ⏳ next session(s) | — |
| 1.9 verify F2.6 mobile fade-stall via bot fleet | ⏳ open | — |

---

*Companion artifacts from this session: live mobile captures (home, compare, invest, get-matched, advisors, learn, signup, broker, community + 2 desktop) shared in the session thread; reproducible via the bots harness (`JOURNEY_BASE` mirror) — the capture script pattern is documented in `bots/journey/README.md`.*
