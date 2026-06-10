# Brief Studio — gold-standard `/briefs/new`

> Status: **Phase 1 shipping** (creation experience). Phase 2 (offers board on the
> brief detail page) is scoped at the bottom but not built here.

## Why

`/briefs/new` is the front door to the provider marketplace. Today it's a competent
4-step template form. The bar we're aiming for is the category gold standard — the
"post a task, get offers, pick a pro" experience people associate with Airtasker —
re-cast for Australian financial services and **bounded by our lean-lane compliance
posture** (general information only, no personal advice, no client money, masked PII,
flat B2B credits).

The single most important reframe: the marketplace's _mechanic_ is "verified pros
respond to your brief", but the creation flow never **sold that promise** or made it
feel alive. Brief Studio does.

## What changes (Phase 1)

A ground-up rebuild of the creation experience. **No backend, schema, or API-contract
changes** — the form still POSTs the exact same body to `/api/briefs` (and the
`plan_id` → `/api/get-matched/plans/{id}/to-brief` path is preserved). That keeps this
a page-UI change (Tier A/B), shippable without touching webhooks, cron, auth,
compliance semantics, or migrations.

### Five pillars

1. **Intent-first entry that covers every journey.**
   `lib/briefs/intent-catalog.ts` is a new single source of truth that maps a warm,
   consumer-facing intent gallery onto the 14 existing `brief_template`s. Every intent
   carries rich search keywords (so quiz-language like "refinance", "FIRB", "negative
   gearing", "CGT", "due diligence", "sell my business" all resolve), example prompts,
   an icon, a group, and sensible provider/routing defaults. A hero **"Describe it in
   your own words"** card is a first-class path: it drives the AI co-pilot when the
   `ai_match_request_copilot` flag is on, and gracefully seeds a `general` brief from
   the free text when it's off — so _everyone_ gets the freeform door, not just the
   flagged cohort.

2. **Live brief preview + strength meter.**
   A sticky "**This is exactly what pros will see**" card (`BriefPreviewCard`) mirrors
   `maskBriefForProvider` and fills in as the user types — including a visible reminder
   of what stays private until a pro responds. A deterministic **strength meter**
   (`lib/briefs/brief-strength.ts`, mirroring the 1–5 AI quality rubric in
   `lib/ai/brief-quality.ts`) scores the brief Weak → Excellent and surfaces the single
   highest-impact next improvement. It coaches better briefs without an API call.

3. **The bids promise, made tangible.**
   The matching step leads with **"Open to multiple pros — compare & choose"**
   (`routing_mode='multi_response'`) as the recommended default, with "Smart match" and
   "Send to one specific pro" as alternates. Honest social proof (a real
   active-professional count, shown only above a floor so we never advertise an empty
   marketplace) and a mechanic-based "you're notified the moment a pro responds" framing
   replace vague claims. The success screen orients the user to the next action:
   _compare responses and pick your pro_.

4. **Polished, accessible, mobile-first craft.**
   Step transitions use the existing CSS keyframes (`slideInRight`, `resultCardIn`) and
   inherit the global `prefers-reduced-motion` guard. Drafts autosave to `localStorage`
   and offer a restore banner. A sticky bottom action bar (with iOS safe-area inset)
   drives the flow on mobile. Validation is encouraging and inline; counters, ARIA, and
   keyboard support are first-class.

5. **Trust & compliance woven in, not bolted on.**
   Disclaimers come from the canonical `lib/compliance.ts` helpers (never hardcoded).
   The consent copy, masked-preview explainer, and "we provide general information only —
   the pro you engage delivers the service under their own licence" framing are all
   preserved and given prominence.

## Files

| File | Change |
|---|---|
| `lib/briefs/intent-catalog.ts` | **new** — intent registry + search, mapped to the 14 templates |
| `lib/briefs/brief-strength.ts` | **new** — deterministic brief-strength scorer + coaching tips |
| `components/briefs/IntentPicker.tsx` | **new** — searchable, grouped intent gallery + freeform hero |
| `components/briefs/BriefStrengthMeter.tsx` | **new** — strength bar + next-best tip |
| `components/briefs/BriefPreviewCard.tsx` | **new** — live "what pros see" masked preview |
| `components/briefs/MatchModeChooser.tsx` | **new** — the reframed "how do you want responses" step |
| `components/briefs/BriefSuccess.tsx` | **new** — vivid, next-action success state |
| `app/briefs/new/BriefForm.tsx` | **rewrite** — orchestrator; same submit contract + autosave + rail |
| `app/briefs/new/page.tsx` | **rewrite hero** — Airtasker-grade hero, honest supply, reframed how-it-works |
| `__tests__/lib/briefs/intent-catalog.test.ts` | **new** |
| `__tests__/lib/briefs/brief-strength.test.ts` | **new** |
| `__tests__/components/briefs/*.test.tsx` | **new** — smoke tests for the picker + meter |

## Compliance guardrails honored

- **No new `brief_payload` keys.** Notes-only templates use a `.strict()` Zod schema —
  adding keys would 400. The structured fields rendered remain exactly
  `BRIEF_TEMPLATE_FIELDS[template]`.
- **No personal-advice framing.** Copy stays "verified pros respond / you choose", never
  "we recommend pro X for you".
- **No client money / escrow.** The flow sets up responses; money never moves through
  the platform between consumer and pro. Nothing here charges the consumer.
- **PII masking preserved.** The preview card mirrors `maskBriefForProvider`; contact
  details still only unlock after a pro accepts.
- **Honest numbers only.** Social proof uses a real `professionals` count and is hidden
  below a floor; no fabricated "avg response time".

## Phase 2 (scoped, not built here)

The Airtasker-style **offers board** on `app/briefs/[slug]` — multiple pro responses
rendered as comparable cards (pitch, verified credentials, outcome score, shortlist,
message) with a consumer "choose this pro" action — building on the existing
`brief_shortlist`, `brief_messages`, and outcome-scoring tables. This is a Tier-B/C
change (touches the accepted-flow) and warrants its own PR.
