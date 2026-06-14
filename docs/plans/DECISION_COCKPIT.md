# Decision Cockpit — the logged-in home

> The personalised surface a logged-in user sees directly under the hero.
> Not a "social feed" — a money command-center whose only job is to **advance
> the user's actual decision** and tell them **what changed since they last
> looked**. Robinhood-grade craft, pointed at *research progress, not trades*
> (per `RETAIL_UX_NORTHSTAR.md`: "celebrate readiness, not trades").

Status: **Phase 0 shipped** (card system + motion + placement). Phases 1–3
below are sequenced against two hard gates that are **founder-owned, not
autonomous**: the compliance line and the cron switch.

---

## The reframe

A comparison + marketplace + advisor platform under ASIC promotion rules is
not a brokerage. So the world-class version of "the thing under the hero" is a
**decision cockpit**, not a timeline. Anonymous visitors get the marketing
hero; logged-in users get *"Welcome back — here's what moved."* That single
swap is the highest-leverage retention change available, and it makes the
north-star metric literal: **Weekly Decision-Ready Returners** (saved ≥1 +
returned ≤7d).

---

## Hard gates (founder-owned — do not build/merge/enable autonomously)

1. **Compliance (Tier E / `REGULATORY-AVOID-LIST`).** The *craft* and the
   *factual* layers are lawful to ship. The **relevance/recommendation engine**
   — anything that decides "*you personally* should look at X" — is
   personal-advice-adjacent. It requires **founder + legal sign-off** before it
   is built or merged. The lawful framing: surface **facts about things the
   user explicitly chose** ("a listing matching *a search you saved* dropped
   8%"; "fee changed on *a broker you compared*"), with a visible
   "why you're seeing this" chip, and **never** "you should buy/switch."
   Celebrate *research milestones*, never *returns*.
2. **Cron (founder switch).** The live/notification phases ride on the cron
   fleet, **dark since 2026-05-23**. Code can be built and merged; it stays
   inert until `CRON_BRIDGE_ENABLED=true` is set in Netlify (+ `CRON_SECRET`).

---

## Phases

### Phase 0 — craft + placement ✅ (shipped)
- `HomeFeedTabs` / `FeedEventCard` rebuilt to the `UX_UI_FINTECH_ALIGNMENT.md`
  standard: rounded cards, `hover:-translate-y-0.5`, house `Icon` (never
  emoji), per-type colour accents, **actor avatars** (the `image_url` /
  `actor_name` already stored and previously unused), an emerald **"live"
  pulse** on <1h items, staggered `fadeInUp` entrance, skeleton loading.
- Relocated **directly under the hero** for logged-in users, capped to 6.
- No new ranking/recommendation logic — pure presentation. Compliance-safe.

### Phase 1 — the delta engine (the "smart") · gate: **compliance**
- Fuse the disconnected personal signals into one relevance pass: the
  `SinceYouWereHere` fee-diff, saved searches / saved comparisons, Get-Matched
  P8/P9 intent + outcome-learning, Country Mode corridor, follows.
- The atomic card becomes **"what changed on something you chose,"** each with
  a **reason chip** (transparency = trust + the compliance guardrail).
- Negative signals (dismiss / "not relevant") shorten and sharpen the feed.
- **Investor vs advisor split** (see below) — same card system, different
  signal set.
- ⚠️ Ships only behind the legal packet (Q1–Q3 below).

### Phase 2 — alive (signal bus + realtime + notifications) · gate: **cron**
- A unified event/signal bus: every surface (fee recheck, new listing, brief
  status, advisor reply, rule alert) emits one typed event; `feed_events` is
  the seed schema. The feed, the weekly digest, and push become **views of one
  stream**.
- Per-user ranked feed materialised server-side + edge-cached, recomputed on
  new signals (not ranked client-side per load).
- Supabase Realtime channel so a rate-change / availability flip animates
  **while watched**. Notification spine (in-app + push + digest) — **cron-gated**.

### Phase 3 — world-class · gate: **compliance + infra**
- Learned ranking (Get-Matched already logs outcomes → close the loop).
- Semantic matching (embed listings/articles against the user's stated thesis).
- An LLM **"3 things worth your attention today"** concierge summary at the top
  (in-session / Max-plan, no API bill — same lane as the AI journeys).

---

## Investor vs advisor — two cockpits, one engine

The feed currently renders for **any** logged-in user with identical content
(`HomeFeedSection`: `if (!user) return null`). World-class = audience-aware:
- **Investor:** decision cockpit — what changed on the things you're deciding
  between; next-best-step into compare / match.
- **Advisor:** practice pulse — new leads, a teammate's referral, leaderboard
  movement, a claimable brief, a review landed. (This is why the feed currently
  feels random to a logged-in advisor — they're shown an investor feed.)

---

## North-star metric & instrumentation

Instrument the only thing that matters: does a card lead to a
compare / save / match / booking? Kill cards that don't move decisions. Target:
**Weekly Decision-Ready Returners**.

## Open legal questions (clear before Phase 1 ships)

1. May we surface **factual changes on user-chosen items** (saved search, saved
   comparison, followed advisor) with a "why" chip, framed as information only?
2. Where is the line between a **factual "matches a search you saved"** chip and
   a **recommendation**? Approved phrasings vs banned phrasings.
3. Does an **LLM-generated factual summary** of already-published events need
   additional disclosure / human-in-the-loop review?
