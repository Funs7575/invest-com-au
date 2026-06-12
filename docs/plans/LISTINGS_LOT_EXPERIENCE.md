# Listings Lot Experience — master build plan

**Status:** Phase 1 executed (this PR) · Phases 2+ sequenced, founder-gated
**Owner:** Fin (founder) · **Author:** Claude session · **Created:** 2026-06-11

**Related:**
`docs/plans/LISTINGS_MARKETPLACE_CONSOLIDATION.md` (D1–D7 system-of-record decisions) ·
`docs/strategy/REGULATORY-AVOID-LIST.md` (lean-lane redlines) ·
`lib/listing-verticals.ts` / `lib/invest-listing-routes.ts` (vertical + route SSOTs) ·
`lib/listing-kind.ts` (kind meta SSOT) · `lib/listing-format.ts` (metric display SSOT)

---

## 1. Vision

A listing on invest.com.au should feel like a **catalogued lot at a good auction
house**, not a classified ad: provenance, paper trail, honest costs, honest
liquidity, market context — presented with consumer-fintech polish on a phone.

The strategic position (from the 2026-06-11 ideation thread): the reason
alternative assets don't appear on financial platforms is missing **trust
infrastructure**. Our lean regulatory lane (factual listing + lead routing, no
client money, no custody, no fractionalisation) is the moat, not the
constraint — we can be the catalogue, the comps record, and the verification
layer without ever touching the transaction.

### Design principles

1. **Trust is the delight.** For money products, the Robinhood-style dopamine
   loop is the wrong import (and an ASIC gamification red flag). What we
   celebrate is *curiosity and understanding* — saving, comparing, learning —
   never the transaction itself. No confetti on enquiries.
2. **Honesty panels are the differentiator.** Holding costs, time-to-sell,
   exit paths. The platform that says "this takes 9 months to sell" is the one
   whose other claims you believe.
3. **Every listing gets the full experience.** Sections degrade gracefully:
   structured `key_metrics` light up rich modules; sparse rows fall back to
   per-vertical editorial intelligence so nothing ever renders as an empty
   shell.
4. **One canonical surface.** The 11 bespoke detail pages and the generic
   route converge on a single `ListingDetailView` — per-vertical flavour
   lives in a registry, not in forked JSX.
5. **Compliance is wired in, not bolted on.** `GENERAL_ADVICE_WARNING`,
   "general information only — not an offer or recommendation" (the
   listed-securities precedent), past-sales caveats, and licence-mode gates
   (`SHOW_GENERIC_VERIFIED`) ship inside the components.

---

## 2. Information architecture (the lot page, top to bottom)

| Zone | Module | Data source | Fallback |
|---|---|---|---|
| Header | Breadcrumb · kind badge · FIRB/SIV chips · title · location · **Save** | listing row + `LISTING_KIND_META` | — |
| Hero | Image gallery | `images[]` | vertical hero image (existing) |
| Price card | Price + per-vertical highlight metric (farmland → hectares, mining → commodity…) | `formatListingPrice` + intel registry | "Price on application" |
| Facts | Key-metrics grid | `listingDisplayMetrics` (full set) | hidden |
| Story | About section | `description` | hidden |
| **Field guide** | "New to {category}? What buyers check" — due-diligence checklist + guide link | intel registry | registry default |
| **Paper trail** | Provenance timeline (structured) or doc-fact list (scalar keys: provenance, documentation, grading…) | `lot-profile` parser | hidden + transparency nudge |
| **Transparency** | Listing-completeness meter: what's stated, what to request | `lot-transparency` scorer | always renders |
| **Costs** | Holding-cost grid (structured) or typical-costs editorial | parser → registry | registry |
| **Liquidity & exit** | Time-to-sell + liquidity narrative + exit paths | parser → registry | registry |
| **Comps** | Comparable-sales table + past-sales caveat | `comparable_sales[]` in `key_metrics` | hidden |
| FIRB | Eligibility explainer (vertical-specific note) | `firb_eligible` + registry | generic copy |
| Sidebar | Enquiry form (`#enquire`) · decision tools (after-tax, FIRB fee) · lister card · view counts | existing components | — |
| Mobile | **Sticky action bar**: price + Save + Enquire (appears after hero scrolls past) | client island | — |
| Footer | Related lots · category CTA · compliance notice | existing | — |

### The save moment

Saving is the platform's first commitment gesture, so it gets the care:
instant optimistic toggle, a one-time "Saved — find it any time in My Options"
hint on first ever save, `aria-live` announcement, and event tracking. Works
logged-out (localStorage mirror + anonymous_saves once the CHECK lands) and
logged-in (user_bookmarks — **no constraint, works today**).

---

## 3. Data model strategy

**No new tables in Phase 1.** Everything rides `investment_listings.key_metrics`
(JSONB) with documented conventions, parsed defensively:

```jsonc
{
  // structured modules (all optional, all arrays tolerant of bad entries)
  "provenance_events": [{ "year": 2019, "label": "Acquired at Shannons auction" }],
  "documents":         [{ "name": "Independent valuation", "status": "verified" }],
  "comparable_sales":  [{ "label": "380ha Riverina aggregation", "price": "$3.8M", "when": "Nov 2025" }],
  "holding_costs":     [{ "label": "Storage & insurance", "amount": "$2,400/yr" }],
  "typical_time_to_sell": "6–18 months",
  // scalar doc-ish keys fold into the paper trail automatically
  "provenance": "full build sheet and ownership history",
  "matching_numbers": true
}
```

Existing seed rows (e.g. the GT-HO collectibles) already carry doc-ish scalars,
so the paper trail lights up on real data from day one.

**Schema changes in this PR (file only — founder runs `db push` per DB rules):**
`20260611140000_anonymous_saves_listing_type.sql` extends the
`anonymous_saves.bookmark_type` CHECK with `'listing'`. Until applied, anonymous
listing-saves persist in localStorage only (the existing mirror pattern);
authed saves are unaffected. Fails soft everywhere.

**Phase 2+ (founder-gated, from the consolidation plan):** `owner_user_id`
ownership migration, `listing_entities` (org profiles with vertical-aware
labels), entity follows/drop alerts, sold-price archive columns. Each is
designed in the ideation thread; none block Phase 1.

---

## 4. Component breakdown

```
lib/listings/
  lot-profile.ts        parser: key_metrics → typed LotProfile (zod, never throws)
  vertical-intel.ts     per-category editorial registry (headings, nouns, FIRB
                        notes, highlight metrics, due diligence, costs,
                        liquidity, exit paths) + DEFAULT fallback
  lot-transparency.ts   completeness scorer → level + present/missing items

components/invest/lot/
  LotSaveButton.tsx     client · optimistic save w/ anon fallback + first-save hint
  LotStickyActions.tsx  client · mobile bottom bar (IntersectionObserver sentinel)
  LotFieldGuide.tsx     server · <details> due-diligence explainer
  LotPaperTrail.tsx     server · provenance timeline / doc-fact list
  LotTransparency.tsx   server · completeness meter + request-docs nudge
  LotHoldingCosts.tsx   server · structured grid or editorial typical costs
  LotLiquidityExit.tsx  server · liquidity narrative + exit paths
  LotComparables.tsx    server · comps table + caveat
  LotListerCard.tsx     server · lister identity from key_metrics (entity layer later)

components/invest/ListingDetailView.tsx   composes all of the above (v2)
```

Route consolidation: 9 of the 11 bespoke
`app/invest/<cat>/listings/[slug]/page.tsx` detail branches swap their forked
JSX for the shared view (metadata + subcategory branches stay bespoke — those
genuinely differ).

**Deliberately NOT migrated: `startups` and `pre-ipo`.** Their bespoke pages
carry the s708 wholesale gating (`WholesaleAttestationGate` around raise
terms, wholesale-only notices, risk warnings) that the shared view does not
yet compose. Removing that gating autonomously would violate the avoid-list.
They join the shared surface only when it gains gate-aware slots, designed
under the s708 workstream (consolidation plan D4) with founder + legal
sign-off.

---

## 5. Compliance redlines (checked against REGULATORY-AVOID-LIST)

- Factual presentation only; no appreciation/return promises anywhere in
  registry copy. Comps carry "Past sales are not an indicator of future
  prices."
- No transaction mechanics: enquiry remains the only action (lead routing).
- "Verified" language gates behind `SHOW_GENERIC_VERIFIED`.
- Capital-markets verticals (startups, pre-ipo, funds) keep their existing
  posture; registry entries for them are risk-forward and change no gating.
  The s708 wholesale gate remains a separate, legal-gated workstream (D4).
- No engagement streaks/leaderboards on money actions (ASIC INFO 251-adjacent
  gamification concern). Delight = clarity + responsiveness only.

## 6. Analytics

`trackEvent` on: `listing_save` / `listing_unsave` (vertical, listing id,
authed flag), `listing_sticky_enquire` (mobile bar tap). Enquiry submission
events already exist in `ListingEnquiryForm`.

## 7. Test plan

- `lot-profile`: rich seed-shaped km, structured arrays, malformed entries
  skipped, empty km.
- `vertical-intel`: every `LISTING_PAGE_SLUGS` slug resolves with non-empty
  required fields; unknown slug → DEFAULT.
- `lot-transparency`: sparse vs documented vs comprehensive; missing-items
  correctness.
- Components (jsdom): LotSaveButton toggle + anon localStorage path +
  aria-pressed; LotPaperTrail structured/scalar variants; LotFieldGuide render.

## 8. Sequencing after this PR

1. Founder: `supabase db push` for the bookmark-type migration (Tier-E ledger
   rules apply — reconcile M05 drift first).
2. Entity profiles (`listing_entities`) per the ideation design — needs the
   ownership migration window.
3. Follows + drop alerts (rides the rate-alert mailer engine).
4. Sold archive + comps capture (the data moat), then category pilots
   (water rights / whisky casks / heritage plates) with asset-passport
   schemas per vertical.
