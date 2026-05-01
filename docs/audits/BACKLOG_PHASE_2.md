# Backlog — Phase 2

Streams frozen 2026-05-01 because the queue was growing faster than it drained. The loop must not pick items from these streams until every Phase 1 stream (A–Y, V-NEW, KK, the four co-shipped Z+BB pairings, and CL anonymity) is `done` or `blocked`.

This is the "stop the moving-goalpost" file. Audit findings or product features that would have fed the queue indefinitely live here instead. They are not abandoned — they will be Phase 2's queue. They are paused.

**Re-promotion to Phase 1 requires a hand-edit by the founder.** The loop does not auto-promote.

---

## Phase 2 stream list

| Stream | Title | Items | Owns |
|---|---|---|---|
| Z (extras only — Z-22..Z-27) | Lifecycle hubs beyond first co-shipped pair | 6 | `/redundancy` (kept in P1 via co-shipping with BB-07), `/first-home-buyer` (kept), `/inheritance`, `/insurance`, `/super`, `/tax-return` |
| AA | Programmatic SEO machine | ~7 | `/find/[advisor-type]/[city]`, `/grants/[industry]`, `/grants/[state]/[program]`, ETF ticker pages, suburb pages, occupation pages, just-event pages |
| BB (extras — BB-01..06, 09, 10, except BB-07/BB-08 which co-ship in P1) | Calculator farm beyond FHSS + ETP | ~8 | borrowing-power, mortgage-stress, salary-sacrifice, CGT, ETF screener, LIC screener, net-worth tracker, subscription audit |
| CC (extras — CC-02..07, except CC-01 in P1) | AI features beyond document upload | ~6 | super/tax/grants analyzers, portfolio review, advisor pre-chat, SoA/RoA generator |
| DD (extras — DD-02..04, except DD-01 in P1) | Marketplace mechanics beyond tiered listings | 3 | verified badge, booking + Stripe Connect, real-time auction |
| EE | Distribution / embeds | 4 | rate-table widget, Chrome extension, WhatsApp/Telegram bot, API marketplace |
| FF | Revenue density (7→10 marketplace ladder Theme 4) | 5 | per `REMEDIATION_QUEUE.md:1022` |
| GG | Compliance moat (7→10 ladder Theme 5) | 5 | per `REMEDIATION_QUEUE.md:1038` |
| HH | Mobile + extra distribution (7→10 ladder Theme 6) | 4 | per `REMEDIATION_QUEUE.md:1054` |
| II | Strategy + optimisation tooling | ~5 | per `REMEDIATION_QUEUE.md:1065` |
| JJ | Foreign-investment hero hub + multi-language | ~6 | per `REMEDIATION_QUEUE.md:1076` |
| NN | INVEST nav bucket + investment-listing monetisation | ~6 | per `REMEDIATION_QUEUE.md:1089` |
| LL (extras — LL-03..05, except LL-01..02 in P1) | Logged-in user platform polish | 3 | watchlist, reviews-on-profile, live chat |
| LX | UX features (Tier 2-3) | ~8 | calc share/save, pre-fill, exit-intent, history, comparison cart, print/PDF, freshness, author profiles |
| OB | Hub onboarding flows | 1 | 13-iteration shell once W-10 lands |
| EM (extras — EM-04, EM-06, except EM-01..03, EM-05 in P1) | Newsletter + drips | 2 | newsletter foundation, drip sequences |
| GT | Goal tracking | 2 | goal tracking, annual check-up |
| DF | Decision frameworks | 4 | engine + buy-vs-rent, salary-sacrifice, SMSF setup |
| QA | Q&A surfaces | 2 | template + 50 seeded |
| CD | Calendar + utility | 3 | deadlines calendar, currency converter, pricing transparency |
| RR | Review extensions | 2 | verification, advisor responses |
| MK | Marketplace conversion | 2 | calendar embedding, video intros |
| SM | Service-line + cultural matching | 2 | service-line tags, cultural/religion routing |
| CM | Conversion / multi-advisor matching | 3 | life-event matching, multi-advisor, lead quality scoring |
| AT | Account types | 4 | individual, couple, family, business |
| DV | Document vault | 1 | encrypted upload + RLS-isolated storage |

**~140 items in total.**

The full per-item detail is preserved in `REMEDIATION_QUEUE.md` under each stream's `### Stream <X>` heading. The loop just must not pick from those headings until Phase 2 lifts.

---

## Phase 1 (kept active)

For reference, what the loop is allowed to work on right now:

- **Quality / safety streams:** A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, V-NEW
- **Hub layer:** W, X, Y
- **Hub builds:** Z-01..Z-21 plus the two co-shipped pairs (Z-22+BB-07, Z-23+BB-08)
- **AI foundation:** CC-01 (security-reviewed)
- **Marketplace foundation:** DD-01
- **Lead-routing:** KK
- **Anonymity:** CL (Tier 0)
- **Logged-in user core:** LL-01, LL-02
- **Email infra core:** EM-01, EM-02, EM-03, EM-05
- **Cutover:** CO

---

## How to lift Phase 2

When Phase 1 is done (or the founder decides Phase 2 is now Phase 1):

1. Hand-edit `docs/audits/REMEDIATION_DEFAULTS.md` — remove the "Phase 2 — frozen" subsection or change "frozen" to "active".
2. The loop's next iteration picks up the change automatically.
3. Optionally, re-prioritise inside Phase 2 by reordering the table above.
