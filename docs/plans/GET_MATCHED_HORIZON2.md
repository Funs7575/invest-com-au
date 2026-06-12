# Get Matched — Horizon 2: the unreal engine (founder vision 2026-06-11)

Showcase G1–G9 (`GET_MATCHED_SHOWCASE.md`) made the engine's intelligence *visible*.
Horizon 2 makes the experience *irresistible* — the quiz people finish, screenshot,
and send to a mate. Design principle for every phase: **cause and effect**. The user
acts, the engine visibly reacts, and the reaction makes the next action feel
inevitable. That loop — not gradients — is what "punchy fintech" means.

Compliance frame unchanged and hard: factual restatements and calculator output only,
"based on your answers" framing, no personal advice, licence gates respected. The AI
phases additionally pass the existing **AI factual-filter gate (V-NEW-02)**.

---

## The psychology map (why people abandon quizzes, and the counter-move)

| Abandon driver | Counter-move | Phase |
|---|---|---|
| "Is this doing anything?" | Every answer visibly eliminates options + updates identity | H1, H2 |
| Friction per step | Keyboard numbers, instant auto-advance, undo toast (never a Back hunt) | H3 |
| "The result will be generic" | Identity + live route prediction build DURING the quiz (already shipped: route chip; H2 completes it) | H2 |
| Flat reveal | Match-ladder reveal: ranked list animates in, scores count up, hero crowns | H4 |
| "Now what?" | Duel, share card, alerts — three different continuation hooks | H5, H6, H7 |
| One-size questioning | Conversational mode for people who hate chips | H8 |

## H1 — Engine ticker (effort M, impact ★★★) — THE core dopamine loop
A one-line live feed under the question card that reacts to each answer with the real
consequence: "⚡ 23 platforms eliminated — 12 remain" / "🎯 Advisor lane overtook
platforms" / "💰 Fee range narrowed to $80–$210/yr". Built from data we already have:
G5 supply counts (delta between fetches), resolveLanes weights re-run client-side per
answer (pure function — costs nothing), G3 fee projections. Animates in, fades to
quiet. This turns 8 questions from a form into a feedback game.
*Compliance: counts and weight changes are factual engine state.*

## H2 — Progressive identity rail (effort S, impact ★★★)
`buildInvestorProfile` (shipped, pure) runs on every answer, not just at resolve. The
right rail's "Your plan so far" becomes an identity card that visibly assembles:
label sharpens ("Investor" → "Crypto investor" → "Crypto-focused active trader"),
signal chips snap in one by one. People complete things that are building *them*.

## H3 — Momentum pack (effort S, impact ★★)
Keyboard 1–9 selects an option, Enter confirms multiselect; selection auto-advances
with a 160ms spring; Back becomes an undo toast ("Changed your mind? Undo") so the
flow never visually reverses; named stages ("About you → Your goal → Fine-tuning →
Your plan") replace bare step counts. Reduced-motion honoured throughout.

## H4 — Match-ladder reveal (effort M, impact ★★★)
After the analyzing screen: results arrive as a ladder — ranked rows animate in
bottom-to-top, each score counting up, then #1 crowns into the hero card. The
existing data (top_matches with scores) rendered as theatre. 1.2s total, skippable,
reduced-motion = static. This is the screenshot moment.

## H5 — Head-to-head duel (effort S, impact ★★)
The site already owns `/versus` (broker-vs-broker pages). When the carousel has ≥2
brokers: "See {A} vs {B} head-to-head" deep-links the existing versus page with the
user's fee projection context. Zero new comparison infra — pure reuse.

## H6 — Shareable profile card (effort M, impact ★★★ growth)
An OG-image route (`/api/og/profile-card`) renders the profile label + top-match +
match score as a branded card; "Share my investor profile" on the result hero. The
share URL is the plan share-token page (exists) so the recipient lands on a working
plan with a "Build yours" CTA. The old quiz's viral footer, rebuilt on the new engine.
*No PII on the card — label + score only.*

## H7 — Returning-user diff (effort M, impact ★★ retention)
Plan token (exists) + supply/match recompute on revisit: "Since you were here:
2 new platforms match · your top match changed · 1 advisor freed up capacity."
Rides the G9 alerts infra and partial-plan recall. The plan page stops being a
receipt and becomes a living dashboard.

## H8 — Conversational mode (effort L, impact ★★★, flag-gated AI)
"Prefer to just talk?" toggle on step 1 hands to a chat surface (the site already
ships an AI Concierge) that asks the SAME canonical questions conversationally,
writes into the SAME answer state, and exits to the same resolve. Chips remain the
default fast path. Server-side Anthropic key required → flag-gated, heuristic G8
parser is the no-key fallback. Same flag also unlocks AI-polished `why_text`
narratives (template-constrained, factual-filter-gated — never free-form advice).

## H9 — Inline article embeds (effort S, impact ★ distribution)
`lib/getmatched/embeds.ts` exists. Ship the step-1 goal picker as an inline embed in
articles/calculators ("Start your plan — 60s") that deep-links into /get-matched with
the goal prefilled. Every content page becomes a funnel mouth.

## H10 — Question-order experimentation (effort M, impact ★ compounding)
`feature_flags` + funnel events already exist. Variant question ORDER and copy per
flag arm; measure step-drop per arm in the existing PostHog funnel. The engine
learns its own best interrogation order over time — outcome learning for the
questions themselves, matching P9's outcome learning for the matches.

---

## Sequencing
- **Build next (after Showcase waves + the five hygiene items land):** H1 + H2 + H3
  — the in-quiz loop. Then H4 + H6 (the reveal + the share loop).
- **Needs founder input:** H8 requires an `ANTHROPIC_API_KEY` decision for prod
  (cost + V-NEW-02 review); H6 needs a brand pass on the card design.
- **Backlog:** H5, H7, H9, H10 slot into normal iteration.

## Measurement
Per-arm step-drop (H10), completion rate, ticker-visible vs hidden completion delta
(H1 ships behind a flag for a clean A/B), share-card CTR (H6), return-visit rate (H7).
