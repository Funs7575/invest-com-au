# Community Master Plan — invest.com.au

**Status:** proposed (founder decisions pending — see §11) · **Author:** strategy session 2026-06-10 with Claude
**Inputs:** full code audit 2026-06-10 (§2), `FIN_NOTEBOOK.md` 2026-06-10 news/community entry, `DAILY_ENGAGEMENT_IDEAS.md`, `REGULATORY-AVOID-LIST.md`, `COMPANY.md`
**Companion:** the news verdict (no newsroom; data-news yes) lives in the notebook entry. This doc is community only.

---

## 1. Goal & positioning

**One-liner:** the expert-anchored community for Australia's "boring money" decisions — super, SMSF, property, ETFs, savings, tax, cross-border — where every serious question gets a quality answer within 24 hours, and the best threads become permanent, citable reference pages.

**Anti-positioning (what we are NOT):**
- Not HotCopper — no stock-tip culture, no ticker pumping. Specific-security "should I buy X" is our compliance hot zone, not our product.
- Not r/AusFinance — they have volume but zero verification and "go see an adviser" dead-ends. Our verified-advisor directory is the asset they can't copy: the dead-end is our front door.
- Not a social network — no DMs, no follower-farming for retail users. The graph is users → experts, not users → users (until Phase 4).

**Why community is the strategic prize (vs news):** UGC is the one content type AI engines can't commoditise and must cite; it attacks the core retention problem ("research destination — people come, decide, leave"); the question corpus compounds into GEO authority and the market-intel product (FIN_NOTEBOOK #11); and the advisor side is commercially self-incentivised to supply quality answers (answers → profile links → leads), which is what solves cold start.

**The flywheel:**
questions → expert answers (≤24h) → best threads promoted to indexed Q&A reference pages → GEO/SEO citations + long-tail traffic → more questioners + more advisor leads → more advisors answering → more questions. Side-products at every turn: newsletter digest content, quiz/lead hand-offs, anonymised trend data.

---

## 2. Current state (code audit, 2026-06-10)

### Already built and live
| Capability | Where | Notes |
|---|---|---|
| Forum: 9 categories, threads, nested replies, votes | `app/community/*`, `forum_categories/threads/posts/votes` | Auth-gated posting, rate-limited (5 threads/hr, 20 posts/hr) |
| Anonymous confessions + bull/bear debates | `thread_type` + `is_anonymous` + `debate_votes` | `/community/confessions` live |
| 24 seeded threads (3/category) | `20260802000000_seed_forum_threads.sql` | Attributed "Invest.com.au Community" (good — not fake users) |
| User forum profiles: reputation, badge, counts | `forum_user_profiles` | Badge/reputation are **static admin fields** — no accrual rules |
| Verified-adviser badge on threads | `lib/forum-author-badges.ts` | Cross-checks `professionals` (active + verified) |
| Solid RLS | `20260429_o_iter6_rls_forum.sql` | `author_id` never serialized; users can't self-pin/unlock/unremove |
| Advisor feed + posting schema | `app/feed`, `advisor_posts` (RLS: advisors can write) | **No posting UI exists** — feed is effectively admin/seeded |
| Follow schema | `advisor_follows` table | **No UI anywhere** |
| Adjacent infra ready to wire | `lib/notifications.ts` (has `reply` type), `lib/rate-limit.ts`, `lib/admin/classifier-config.ts` (thresholds + kill switches), `feed_events` (includes `community_thread`), PostHog, `lib/embeddings.ts` | All unused by community routes today |

### Hard gaps (ranked by risk)
1. **P0 — zero text moderation.** Community POSTs run no classifier, no queue: everything auto-publishes instantly. On a financial site operating pre-AFSL under the factual carve-out, with `/community` indexed, this is the single most exposed surface in the product. (Article comments and Q&A have moderation; the forum does not.)
2. **P0 — integrity: seeded counters overstate activity.** Seed migration initialises `reply_count` 0–7 and `vote_score` 4–16, but actual seeded replies are 1–2 and votes 0. Same ACL s18 family as the fabricated "X investors compared today" counter removed in #1489. Reconcile counters to real rows.
3. **P0 — no `GENERAL_ADVICE_WARNING` / house-rules surface** verified on thread pages; the hub FAQ promises moderation + an "Ask an Advisor" category with verified advisers — **neither exists yet** (no mod UI, no such category). The copy over-promises.
4. No admin moderation UI, no report button, no flag queue.
5. No reply notifications (infra exists, unwired). No thread subscribe/bookmark (bookmark enum excludes threads — needs a migration, see §4 constraint).
6. No PostHog events, no feature flag / kill switch on the surface.
7. Invisible: not in header, footer, or mobile bottom nav (4 tabs, no slot).
8. Two parallel social systems (forum + advisor feed) with no integration decision.

### Planning constraint that shapes everything
**The migration ledger is frozen until the baseline-squash** (FIN_NOTEBOOK 2026-06-07 — the #1 infrastructure blocker). Therefore **Phases 0–1 are deliberately schema-free**: every item below either reuses existing tables/columns/config rows or is pure code. Items needing DDL (bookmark enum value, `is_accepted` on posts, reputation-events table, thread embeddings) are explicitly parked in Phase 3+ behind the squash.

---

## 3. Strategy — five pillars

1. **Expert-anchored, not peer-anchored.** The differentiator is a verified professional in the thread. Every mechanic (badges, ranking, programmes) elevates expert participation first. Retail users get great answers; advisors get qualified exposure; the platform gets citable content and warm leads.
2. **Answer-guaranteed.** "Every question answered within 24h" is a promise no AU competitor makes — and the 19-agent fleet makes it cheap: a compliance-gated **Research Team** baseline answer (clearly bylined per the editorial Tier-2 standard, factual/general-only) backstops any thread no human reaches. This converts the empty-restaurant problem into a service guarantee.
3. **Outcome-structured.** A thread is not the end state. Good threads get curated into permanent `/questions/`-style reference pages (answer-first, QAPage/Speakable schema, glossary auto-links) — the GEO converter. The forum is the intake; the reference library is the asset.
4. **Compliance-native, visibly.** Moderation, hot-zone handling and general-advice framing are product features users can see (trust), not a back-office tax. Pre-AFSL: strictly factual/general framing, hot-zone throttles on specific-security threads. Post-AFSL (Nov 2026): general-advice posture relaxes the ceiling, never the floor.
5. **Honest by construction.** No fake users, no inflated counters, no agent posts masquerading as humans — seeds and AI answers always attributed (Research Team / Community byline). One fabricated number costs more trust than an empty forum ever will.

---

## 4. Phased roadmap

Timeline anchors: AFSL ~Nov 2026 · domain cutover Oct–Dec 2026 · migration freeze applies to *structural* changes, not content cadence.

### Phase 0 — Make it safe & honest (now → mid-July, ~2 wks effort, schema-free)
*Nothing grows until this ships. All items reuse existing infra.*

| # | Item | How (existing infra) | Tier |
|---|---|---|---|
| 0.1 | Text-moderation gate on thread/post POST | Run classifier (same pipeline as article comments) before insert; flagged → `is_removed=true` + queue; thresholds via `classifier_config`; kill switch row in `automation_kill_switches` | B |
| 0.2 | Hot-zone detection | Ticker/security-name + advice-phrase patterns ("should I buy/sell") → auto-flag for review + stricter banner; never auto-publish | B |
| 0.3 | Admin moderation queue | `/admin/community`: flagged list, approve/remove/lock/pin, author history. Mirrors `/admin/qa` patterns | B |
| 0.4 | Report button + house-rules page | `/community/guidelines`; report → flag in queue. Fixes the FAQ over-promise | A |
| 0.5 | Counter reconciliation | Migration-free script/route to set seeded `reply_count`/`vote_score` to actual row counts (UPDATE on existing columns is DML, not DDL) | A |
| 0.6 | `GENERAL_ADVICE_WARNING` + "posts are opinions, not advice" banner on every thread page | `lib/compliance.ts` (never hardcode) | A |
| 0.7 | UGC indexing policy | Hub + category pages stay indexed; **individual threads `noindex` until they pass a quality bar** (mod-approved or expert-answered). Confessions listing → noindex until 0.1–0.3 live | A |
| 0.8 | PostHog events (`community_thread_created`, `_reply`, `_vote`, `_report`) + feature-flag wrap of the whole surface | `lib/posthog`, `classifier-config` kill switch | A |
| 0.9 | Reply notifications | `notifyUser()` already has `reply` type + email dedup — wire it on post insert | B |

### Phase 1 — Seed the supply side (mid-July → Sept, schema-free)
*Solve cold start with experts and rituals, not growth hacks.*

| # | Item | Notes | Effort |
|---|---|---|---|
| 1.1 | **Founding Experts programme** | Recruit 10–20 verified advisors (Co-Founder BD + Ops/Email agents automate outreach + weekly "questions waiting for you" digests). Incentive: "Founding Expert" badge (static badge field exists), homepage experts-strip eligibility, free Pro-tier window (founder call, §11). Target SLA: expert reply on every non-trivial thread <48h | BD-heavy, ~3 dev-days |
| 1.2 | **Advisor quick-post UI** | `/advisor-portal` composer → `advisor_posts` (table + RLS ready). 500-char limit, link, moderation flag on first 3 posts | ~1 wk |
| 1.3 | **Follow mechanic** | Follow button on advisor profiles/cards → `advisor_follows` (table ready); `/feed` gets Following/Discover tabs; follow count on profiles | ~1 wk |
| 1.4 | **Question of the Day ritual** | Editorial agent posts daily prompt thread (attributed); advisors answer; best answer featured in newsletter community block. 7 prompts/wk ≈ 350+ threads/yr of structured content | ~3 days + ongoing agent cadence |
| 1.5 | **24h Research-Team answer SLA** | Agent drafts factual/general answer for any thread unanswered at 24h → compliance scorecard → human-tier publish per escalation rules; always bylined "invest.com.au Research Team", never a persona | ~1 wk |
| 1.6 | **Ask-an-Advisor category** | Create the promised category; route unanswered/complex threads to `/get-matched` CTA (lead funnel); advisor answers carry profile links | ~2 days |
| 1.7 | **Cross-linking loops** | Article footers: "Discuss this"; broker/product pages: "Community threads about X"; quiz results: "What people like you asked"; weekly newsletter digest block | ~1 wk total |
| 1.8 | **AMA / office-hours pilot (lite)** | No new infra: scheduled, pinned, time-boxed thread format with a named advisor; transcript curated to a reference page after | ~3 days |
| 1.9 | **Density rule** | Concentrate: actively seed/promote only 3 categories first (super-retirement, property, beginners+ETFs). A category "opens" for promotion at ≥10 organic posts/wk; merge/hide laggards (`off-topic` → hide) | policy |

### Phase 2 — Freeze & harvest (Oct → Dec, migration window)
- **No structural/nav/schema changes.** Rituals (QotD, SLA, digest) continue on cadence — content accumulation is migration-safe.
- Curate the best 50–100 threads into reference pages; build the launch backlog.
- Community URLs go into the cutover redirect map (pairs with CO-01); verify canonicals + sitemap parity for `/community/*`.
- Measure Phase-1 cohorts; make the Phase-3 go/no-go call on data (§9).

### Phase 3 — Open the doors (Q1 2027, post-AFSL + post-cutover + post-baseline-squash)
- **Nav promotion:** one consolidated top-level entry ("Learn & Community" or "Insights") folding articles/guides/glossary/Q&A/community — not a standalone Community tab; mobile bottom-nav slot decision (§11).
- **Homepage module:** "From the community" (expert answers + trending), slotting into the 13-module budget — swap-in, not add-on.
- **Gamification, real accrual:** reputation events (post=1, helpful vote=2, expert-marked answer=10…), earned badges, weekly contributor digest. Needs the post-squash schema window; until then reputation derives from existing counts.
- **Accepted answers** (`is_accepted` column), **thread bookmarks** (enum extension), **duplicate-question detector** (embeddings similarity at compose time — `lib/embeddings.ts` exists; storage post-squash).
- **RBA-day megathreads** wired to the market-events calendar (the data-news layer from the notebook entry) — 8 guaranteed engagement spikes/yr.
- **General-advice posture upgrade** post-AFSL: editorial/Research-Team answers can carry general-advice framing with the licence disclosure set from `lib/compliance.ts`.

### Phase 4 — Compound (2027+)
- Question-corpus → anonymised trend reports (market-intel #11) and "State of Australian Investing" survey tie-in (#25).
- Investment clubs / private group watchlists (DAILY_ENGAGEMENT #16) once the public surface is liquid.
- Unified personalized feed (`feed_events` already includes `community_thread`) as the logged-in home (DAILY_ENGAGEMENT #17).
- Community embeds/API as B2B surface area (#8).

---

## 5. UX/UI specification notes

**Information architecture**
- `/community` evolves from "category directory" to **digest**: Today's Question → latest expert answers strip → trending threads → categories. Categories mirror site verticals so cross-links feel native.
- Thread page goes **answer-first** (same GEO logic as articles): verified-expert reply pinned above the fold with `VerifiedAdvisorBadge`; OP collapses after lead paragraph on long threads; reference-page promotion banner when curated.

**Composer (the make-or-break surface)**
- Single screen, ≤3 required fields (category auto-suggested from text, title, body). Anonymous toggle stays.
- **Inline compliance nudge, friendly not legal:** "Keep it general — 'how do people evaluate X?' works; 'should I buy X?' gets removed." Shown on hot-zone pattern match *before* submit (saves the user a removal, saves us a queue item).
- Similar-threads suggestion before posting (Phase 3, embeddings) to concentrate liquidity.
- Post-submit: clear state — "Live now. Expert answer expected within 24h" (the SLA as UX copy).

**Trust surfaces**
- Badge system consistent everywhere (advisor badge component reused on comments/Q&A too).
- Per-thread provenance: "Answered by [Advisor], AFSL-verified" vs "Research Team" vs "Community member" — three visually distinct reply styles.
- Compliance banner via `lib/compliance.ts` + banner visual tokens from `components/foreign-investment/banner-tokens.ts`; reuse `components/directory/*` primitives for sort/filter/empty states rather than bespoke widgets.

**Empty states & honesty**
- Keep the current "suggested topics" empty state; add the answer-guarantee framing. Never pad with fake activity; show real seeded prompts with real bylines.
- Show real counts only (post-0.5); if a number would embarrass us, design hides the number, not inflates it.

**Mobile**
- Reading: sticky reply bar, collapsed nested replies (>2 levels behind "show thread").
- Bottom-nav: no change until Phase 3; interim discoverability via footer link (add to Learn column — 1-line change) and article/quiz cross-links.

---

## 6. Compliance & safety architecture (the non-negotiables)

- Pre-AFSL: everything factual/general; `GENERAL_ADVICE_WARNING` on every community surface; FAQ copy must match shipped reality.
- **Hot zone** = specific-security buy/sell/hold solicitations, return promises, "guaranteed", pump patterns (multiple accounts/posts, same ticker): auto-flag, never auto-publish; repeat → lock + ban path. INFO 269 context: we must not host de-facto unlicensed advice.
- Advisors answering = general information; their AFSL details surface via the badge; conflicts/disclosure rules in house rules.
- **No paid influence on answer ranking or thread placement — ever** (RG 246 hygiene). Monetisation stays out of the discussion surface (§7).
- No DMs in any phase covered by this doc (off-platform advice solicitation channel).
- Escalation mapping: classifier flag → admin queue (Tier 1 auto-hold); pump-pattern/coordinated → Tier 3; legal threat/regulator mention → Tier 4. Moderation latency is a tracked SLO (§9).
- Avoid-list tripwires that live nearby: no money pooling in any future clubs feature; no execution/order-routing; CSF adjacency if startup raises get discussed → factual-listing framing only.

## 7. Monetisation (deliberately indirect, all existing levers)

| Mechanism | Lever | Notes |
|---|---|---|
| Unanswered/complex thread → "Get matched" CTA; advisor answers carry profile links | Lead gen (existing funnel) | The primary money path: community as top-of-funnel for the $39+/lead engine |
| Advisor Pro tier perks: quick-post studio, follower analytics, AMA hosting, priority in *expert recruitment* (not answer ranking) | B2B subscription (existing Stripe/Pro) | Community becomes an advisor-retention feature |
| Newsletter community-digest block sponsor slot | Newsletter sponsorship (allowed lever) | Disclosed, outside the discussion surface |
| Anonymised question-trend data | Market-intel #11 (later) | Corpus value compounds from day one |
| **Not done:** display ads in threads, paid placement of answers/threads, charging users | — | #21 NEVER + RG 246 |

## 8. Cold-start playbook (tactics summary)

1. Supply before demand: Founding Experts + QotD + Research-Team SLA make the room feel alive *honestly* before traffic exists.
2. Density over breadth: 3 promoted categories until thresholds met (§4 1.9).
3. Borrow existing demand: article footers, quiz results, broker pages, newsletter — the site already has the traffic; route slivers of it to threads.
4. Rituals over campaigns: daily QotD, weekly digest, monthly AMA, quarterly survey — agent-automatable cadences, not one-off pushes.
5. Integrity as strategy: visible moderation + real numbers + named experts is the differentiation from every anonymous finance forum in Australia.

## 9. Metrics, SLOs, kill criteria

- **North star: expert-answered questions per week.**
- Supply: active verified advisors posting/wk; median time-to-first quality reply (target <24h, SLA backstop 100%).
- Demand: organic (non-seeded, non-agent) threads/wk; posting users WAU; 4-week poster retention.
- Safety SLOs: median flag→decision <12h; % auto-published posts later removed <2%; zero hot-zone auto-publishes.
- GEO/SEO: curated reference pages live; community pages cited in `ai_referral` events (instrumentation exists); long-tail impressions on `/community/*` + `/questions/*`.
- Business: community-attributed matched leads/mo; newsletter signups from community surfaces.
- **Kill/pivot criterion:** if by end of Q1 2027 (one quarter after the open-doors push) organic threads <25/wk **or** active answering advisors <8, collapse the forum surface into the structured Q&A product (question intake → expert/Research-Team answer → reference page) and keep the corpus + SLA. The asset is the question pipeline and answer library, not the forum shape — this pivot loses almost nothing.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Unmoderated UGC ships harm pre-AFSL | Phase 0 is a precondition for everything; kill switch wraps the surface |
| Empty rooms damage trust at launch | Phases gate nav promotion on real liquidity; guarantee-SLA reframes emptiness as service |
| Thin UGC indexed during domain cutover | 0.7 indexing policy + Phase-2 structural freeze |
| Moderation load outgrows team | Classifier first-line + agent triage + escalation tiers; volume thresholds throttle category openings |
| Advisors won't post | Their incentive is leads (proven motivator); programme + weekly prompt digests lower effort to ~10 min/wk; if still flat, the Q&A pivot (§9) needs only ~8 committed experts |
| Temptation to fake liquidity | Pillar 5; counters reconciled in 0.5; CI anonymity/honesty culture already established (#1489) |
| Forum + advisor-feed fragmentation | Phase 1 integrates (advisor posts surface in community digest; one identity/badge system); Phase 4 unifies via `feed_events` |

## 11. Founder decisions needed

1. **Approve Phase 0 now** (safety/integrity — recommend treating as not-optional; it also protects the existing live surface even if we never grow community).
2. Founding Experts incentive: free Pro-tier window (6 or 12 mo) + does Co-Founder own the 10–20 recruit target?
3. Research-Team 24h SLA: approve agent-drafted, human-gated, clearly-bylined baseline answers — yes/no + publish tier (recommend Tier 2: notify+proceed).
4. Indexing bar for threads (recommend: mod-approved OR expert-answered).
5. Confessions: keep prominently featured (great differentiation) but noindex until Phase 0 ships — confirm.
6. Phase-3 mobile nav: which of the 4 tabs yields a slot (or none — header entry only)?

## 12. Build order (first PRs, all schema-free)

1. **PR-C1** — moderation gate + hot-zone flagging + kill switch + PostHog events (0.1, 0.2, 0.8) — Tier B
2. **PR-C2** — admin queue + report flow + guidelines page + FAQ copy fix (0.3, 0.4) — Tier B
3. **PR-C3** — counter reconciliation + indexing policy + compliance banner + footer link (0.5, 0.6, 0.7) — Tier A
4. **PR-C4** — reply notifications + thread-watch via existing notifications (0.9) — Tier B
5. **PR-C5** — advisor quick-post + follow button + feed tabs (1.2, 1.3) — Tier B
6. **PR-C6** — QotD ritual + Research-Team SLA pipeline + Ask-an-Advisor category (1.4, 1.5, 1.6) — Tier B/C (agent cadence touches cron)

---

*Maintenance: append decisions + shipped items below; don't rewrite history.*
