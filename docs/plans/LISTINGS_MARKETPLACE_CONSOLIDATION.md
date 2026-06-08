# Listings Marketplace — Consolidation & Long-Term Strategy

**Status:** proposal (awaiting founder + legal sign-off on §3 D4 / D5 and §7)
**Owner:** Fin (founder) · **Author:** Claude session · **Created:** 2026-06-07
**Branch:** `claude/upbeat-euler-VGA1z`

**Related:**
`docs/audits/MM-01-marketplace-coverage-audit.md` ·
`docs/strategy/REGULATORY-AVOID-LIST.md` ·
`docs/strategy/FIN_NOTEBOOK.md` (entries 2026-04-30, 2026-05-01) ·
`docs/audits/MERGE_AUTHORIZATION.md` ·
`lib/listing-verticals.ts` (vertical SSOT) ·
`lib/invest-listing-routes.ts` (route SSOT)

> Triggered by a bot sprawl + feedback review of `/invest/list` (2026-06-07). This
> document turns those findings into a single coherent plan and records the
> long-term strategic decisions. It does **not** itself change product code; the
> regulated-vertical and monetisation items are **never-autonomous** (Tier-E /
> avoid-list) and need founder + legal sign-off before any build.

---

## 1. Problem statement

We are shipping **two parallel "post a listing" products** that were never
reconciled. They use different tables, auth models, pricing, categories, and
owner portals — and both are linked in the live footer.

| | **`/invest/list`** (`ListingSubmitForm`) | **`/listings/new`** (`ListingNewClient`) |
|---|---|---|
| System of record | `investment_listings` (MM catalog; `lib/listings/types.ts` calls it *"the legacy paid catalog"*) | `listings` (MM12 *"reverse-flow primitive"*, migr. `20260514_mm12_listings.sql`) |
| Account required | **None — anonymous** | **Sign-in required** (API returns `401`) |
| Identity proof | `contact_email`, **unverified** at submit | real Supabase auth user |
| Ownership | no `owner_user_id`; OTP-claimed later | `owner_user_id` + owner-scoped RLS |
| Price | "From **$99**" + Stripe | "**Free to list**" |
| Categories | 10 verticals (incl. capital-markets) | 4 kinds (property/business/syndicate/other) |
| Moderation | `status='pending'` → admin | `draft → pending_review → approved/rejected` |
| Manage at | `/invest/my-listings` (email-OTP wall) | `/account/listings` (authed) |
| `listing_owner` kind | only via after-the-fact **OTP claim** | **never provisioned** |

**Root cause:** `investment_listings` is the SEO/GEO-bearing public catalog the MM
stream keeps expanding (20+ verticals, sitemap, paid plans, cross-border reach);
`listings` is a newer, cleaner ownership/lifecycle primitive wired to Get Matched
match-requests. Each solves half the problem. Neither was retired.

### 1.1 Evidence (live bot sprawl, 2026-06-07, mirror)
- `POST /api/listings/submit` with `{}` → **400 validation** (not 401) ⇒ the
  `/invest/list` write path has **no auth gate**; anyone can post.
- `POST /api/listings/owner-flow` (no auth) → **401** ⇒ the owner-flow *is* gated.
- `account_kind_membership` view derives `listing_owner` **only** from
  `listing_owner_accounts` (migr. `20260522`), which is upserted **only** by the
  OTP-claim route — so an authed `/listings/new` poster gets a `listings` row but
  **no** `listing_owner` kind, and `portalForKind('listing_owner')` routes them to
  `/invest/my-listings` (the OTP wall for the *other* table).
- `/invest/submit` (linked from the my-listings empty state) → **HTTP 500**;
  unknown `/invest/*` slugs return **500 not 404**.
- Hero says "8 investment categories"; the form offers **10**.
- Code: `ListingSubmitForm` only sends `featured`/`premium` to Stripe — the
  advertised **"$99 Standard" is never charged** (goes straight to success).

---

## 2. Findings inventory ("all of this")

| # | Finding | Severity | Decision ref |
|---|---|---|---|
| A1 | Two parallel listing systems / write paths / tables | High (strategic) | D1 |
| A2 | Two entry points both in footer; nav points only at `/invest/list` | Med | D1, P0 |
| B1 | `/invest/list` requires no account; no identity proof | High | D2, D6 |
| B2 | `contact_email` unverified at submit (claim/manage later keys on it) | High | D2, D6 |
| B3 | `listing_owner` kind not provisioned by either happy path consistently | Med | D2, D3 |
| B4 | `portalForKind('listing_owner')` → OTP wall, not the authed portal | Med | D3 |
| C1 | `startup` ("equity crowdfunding/angel raise") open to anon retail | **Critical (regulatory)** | D4 |
| C2 | `fund` ("managed fund/scheme") open to anon retail | **Critical (regulatory)** | D4 |
| C3 | `pre_ipo` "s708 sophisticated only" is a **label, not a gate** | **Critical (regulatory)** | D4 |
| C4 | Heavy cross-border marketing to 12 countries (foreign-regulator reach) | High | D4 |
| D1$ | "$99 Standard" never charged (pricing ≠ behaviour) | High (trust/legal) | D5 |
| D2$ | Featured/Premium charged **before** admin approval; no stated refund path | Med | D5 |
| D3$ | "From $99" vs "Free to list" contradiction across the two pages | Med | D1, D5 |
| E1 | No fraud control: anyone can list a third party's asset | High | D6 |
| F1 | `/invest/submit` dead link → 500 (should be `/invest/list`) | Med (UX/SEO) | P0 |
| F2 | Unknown `/invest/*` → 500 instead of 404 | Med (SEO) | P0 |
| F3 | "8 categories" vs 10; copy drift | Low | P0 |

---

## 3. Strategic decisions

Each decision records the call, the rationale, the alternative considered, and
reversibility. **D4 and D5 are recommendations pending founder + legal sign-off**
(see §7); everything else I am deciding as the default direction, override welcome.

### D1 — One system of record: `investment_listings` (the catalog wins)
Consolidate onto `investment_listings`; **upgrade its write path** with the good
properties of the owner-flow (auth, ownership, lifecycle, match-requests).
Migrate the small `listings` table into it and retire `/listings/new`.

- **Why:** `investment_listings` carries the irreplaceable assets — the 20-vertical
  SEO/GEO discovery surface (a documented moat, FIN_NOTEBOOK 2026-05-21), the
  sitemap, paid plans, cross-border reach, the `lib/listing-verticals.ts` SSOT,
  and active MM momentum. The owner-flow's advantages are *mechanisms* (auth,
  RLS, lifecycle) that can be ported onto it far more cheaply than rebuilding
  discovery on top of `listings`.
- **Alternative (rejected):** make `listings` the winner. Rejected — throws away
  the MM catalog/SEO investment for a 4-kind table; bad ROI.
- **Reversibility:** medium. Migration is forward-only (Supabase prod), but the
  `listings` table can be kept read-only as a fallback for one release.

### D2 — Posting requires an authenticated account
Make the `investment_listings` write path require a Supabase session (mirror the
owner-flow's `401`). On first successful submit, **auto-provision the
`listing_owner` kind** (upsert `listing_owner_accounts`, same as the claim route).
Verify email/identity **before publish** (see D6). Keep the OTP-claim flow **only**
as a backfill path for pre-existing anonymous rows.

- **Why:** fixes B1/B2/B3 at the source; gives every listing a real owner for
  RLS, leads, billing, GDPR (soft-delete migration `20260801000800` already
  expects `listing_owner_accounts` ownership); kills the "list someone else's
  asset with a spoofed email" hole.
- **Alternative (rejected):** keep anonymous + OTP-claim. Rejected — unverified
  publication of capital-raise/securities content is the core compliance and
  fraud risk; an account is the cheapest durable gate.
- **Reversibility:** high (auth check + provisioning are additive).

### D3 — One moderation lifecycle + one owner portal
Adopt the owner-flow state machine (`draft → pending_review → approved/rejected →
archived`) for `investment_listings`. Make `/invest/my-listings` the **authed**
owner portal (fold in `/account/listings`); fix
`portalForKind('listing_owner')` to land there. One admin moderation queue.

- **Why:** fixes B4; removes the split-brain where owners can't see their own
  listings; single review surface for compliance.
- **Reversibility:** high.

### D4 — Regulatory posture: gate capital-markets, never facilitate offers ⚠️ (founder + legal)
For any vertical that is (or implies) a **securities offer / capital raise /
managed investment scheme** — today `startup`, `pre_ipo`, `fund`, and arguably
`infrastructure`/`digital-infrastructure` syndications — apply, on **submission,
enquiry, and payment**:
1. **`getAfslStatus().granted` gate** (`lib/server/afsl-status.ts`) — these
   verticals stay **OFF until the AFSL is granted** (currently `false`), OR
2. **wholesale-only (s708)** via the existing `components/invest/WholesaleAttestationGate.tsx`
   on both lister and enquirer, persisting `wholesale_only`/`s708_required` in the
   listing payload (already honoured by `lib/listing-match.ts`), OR
3. **factual-listing-only** with **no offer facilitation** (no enquiry routing /
   matching for these verticals) + `lib/compliance.ts` disclosures.

Lock the choice per vertical with legal. Keep the existing securities disclaimer
but treat it as **necessary-not-sufficient** — a disclaimer is not a gate.

- **Why:** `REGULATORY-AVOID-LIST.md` classifies CSF intermediation, market
  licence, and product-issuer activity as **never-autonomous escalators** that must
  stay flag-gated until the AFSL. This is the *same* tripwire already logged for
  the Startup Portal ("retail-exposed, no s708 gate"), surfacing on the submission
  form. Cross-border marketing (C4) can additionally pull in foreign regulators —
  geo-scope per the avoid-list.
- **Alternative (rejected):** keep retail + disclaimer. Rejected — directly
  violates the avoid-list enforcement rule; asymmetric regulatory downside.
- **Reversibility:** high (flag/gate); but **building it is gated on sign-off** —
  do not implement D4 autonomously.

### D5 — Monetisation: honest freemium, charge **after** approval, no success fees ⚠️ (founder confirm)
- **Standard = free** (resolves D1$ honestly — it is already never charged), with
  **paid Featured/Premium for placement**. Show "Free to list · paid placement
  options" consistently (kills D3$).
- **Charge after admin approval**, not before: authorise-and-capture on approve,
  or invoice-on-approve; **auto-void/refund on reject** (fixes D2$). Keep the
  `stripe_checkout` kill-switch.
- **Never** take a %-of-deal / success fee / escrow. That crosses into client
  money (RG 246) and market-licence/custody territory, and matches three explicit
  FIN_NOTEBOOK **NEVER** rulings (#16 P2P bids, #18 pure auction, and the
  client-money clips on the avoid-list).
- **Why:** aligns price with behaviour and with the lean-lane monetisation default
  (flat B2B fees, never consumer→counterparty money).
- **Reversibility:** medium (pricing + Stripe wiring).

### D6 — Trust & anti-fraud
Email verification before publish (reuse the existing OTP/`verify-otp` infra);
"I have authority to list this asset" attestation (already in the review step —
make it load-bearing); ABN/identity-lite for high asking-price and all D4
verticals; rate-limit + abuse heuristics already partly present (`isRateLimited`).

### D7 — Explicit scope guardrails (what we will NOT build)
Recorded so future sessions don't re-litigate (consistent with FIN_NOTEBOOK P5):
- **No P2P bidding/auction of the asset itself** (FIN_NOTEBOOK #16 — NEVER).
- **No operating a market/exchange** that matches/executes financial products
  (Australian Market Licence). We do **factual listing + lead routing** only.
- **No client money / escrow / settlement** (custody + RG 246).
- **No success fee / %-of-raise**.
- We remain a **comparison + lead-gen layer**, not a principal.

---

## 4. Target architecture (end state)

```
            ┌───────────────────────── one write path ─────────────────────────┐
  Seller →  /invest/list  ──(auth required, D2)──►  POST /api/listings/submit
            (single form,                            • require session, provision listing_owner
             verticals = SSOT)                       • D4 gate per-vertical (AFSL / s708 / factual)
                                                     • email verified before publish (D6)
                                                     • insert investment_listings(owner_user_id, status='draft')
                                                            │
                                              submit-for-review → status='pending_review'
                                                            │
                                                   one admin moderation queue
                                                       approve │ reject
                                                            ▼
   Discovery (unchanged): /invest/<vertical>/listings (SEO/GEO, sitemap, JSON-LD)
   Owner portal: /invest/my-listings (authed; folds in /account/listings)
   Monetisation: free Standard; Featured/Premium captured ON APPROVE (D5)
   Enquiries: /api/listings/enquire (suppressed/gated for D4 verticals)
            └──────────────────────────────────────────────────────────────────┘

  Retired: /listings/new + listings table (rows migrated; table read-only 1 release)
```

Reused (do **not** reinvent): `lib/listing-verticals.ts`, `lib/invest-listing-routes.ts`,
`components/invest/WholesaleAttestationGate.tsx`, `lib/server/afsl-status.ts`,
`lib/compliance.ts`, `account_kind_membership` view + `listing_owner_accounts`,
`lib/listing-match.ts` wholesale flags, `verify-otp` infra, `stripe_checkout` flag.

---

## 5. Delivery plan (phased · tier-mapped · AFSL/migration-window-aware)

> Tiers per `docs/audits/MERGE_AUTHORIZATION.md`. AFSL is **not granted**
> (`getAfslStatus()→false`); target ~Nov 2026 per the avoid-list, but FIN_NOTEBOOK
> flags a "late 2027" revisit — **treat as not-granted until confirmed (see §7)**.
> Domain migration window Oct–Dec 2026: land structural changes **before** it.

### Phase 0 — Stop the bleed (Tier A, ship now, no sign-off)
Honest, low-risk fixes that don't touch the regulated surface.
- Fix `/invest/submit` link → `/invest/list` (`app/invest/my-listings/page.tsx`).
- Make unknown `/invest/*` return **404** not 500 (`app/invest/[...]` not-found).
- Copy: "8" → dynamic count from SSOT; reconcile "From $99" vs "Free to list".
- Pick **one** primary entry point in nav/footer; make the other a redirect stub.
- **Standard plan:** stop advertising a price it never charges (interim: label
  "Free"); full monetisation rework is D5/Phase 3.
- Tests: route 404 test, copy snapshot.

### Phase 1 — Unify ownership & lifecycle (Tier C — auth/migration/RLS)
- Require auth on `POST /api/listings/submit`; auto-provision `listing_owner`.
- Add `owner_user_id` + RLS to `investment_listings` (idempotent, forward-only
  migration with rollback header; pass the RLS isolation gate).
- Adopt `draft → pending_review → approved/rejected` on `investment_listings`.
- Make `/invest/my-listings` authed; fix `portalForKind`; fold `/account/listings`.
- Email-verify before publish (D6 minimal).
- Migrate `listings` rows → `investment_listings`; `/listings/new` → 308 to
  `/invest/list`; keep `listings` read-only one release.
- Gates: Tier-C announce; full CI; RLS isolation; rollback documented.

### Phase 2 — Regulatory gating ⚠️ (Tier E — founder + legal first)
**Do not start without recorded sign-off (§7).**
- Classify each vertical with legal → AFSL-gate / s708 / factual-only (D4).
- Wire `WholesaleAttestationGate` + `getAfslStatus()` into submission, enquiry,
  and payment for D4 verticals; persist `wholesale_only`/`s708_required`.
- Geo-scope cross-border claims for those verticals.
- Bots: promote to **hard assertions** that D4 verticals stay gated pre-AFSL
  (ties to FIN_NOTEBOOK 2026-06-03 bots roadmap #4).

### Phase 3 — Monetisation rework ⚠️ (Tier C — founder confirm D5)
- Free Standard; capture Featured/Premium **on approve**; auto-void/refund on
  reject; Stripe idempotency + kill-switch retained; reconcile `listing_plans`.

### Phase 4 — Trust, cleanup, guardrails (Tier B/C)
- ABN/identity-lite for high-value + D4 verticals; authority attestation
  load-bearing; abuse heuristics.
- Drop `listings` table after one clean release; delete dead code.
- Migration-window guardian: redirect-map + canonical/sitemap parity for the
  consolidated routes (pairs with `CO-01`).

---

## 6. Risks & mitigations
- **Regulatory overreach by building D4 wrong** → Phase 2 is Tier-E, sign-off-gated;
  default to *gate/disable*, not enable.
- **Forward-only migration on prod** → idempotent + rollback header + isolation
  gate + keep `listings` read-only one release.
- **SEO regression from route/entry-point changes** → land before Oct–Dec window;
  301/308 redirects + sitemap parity check; bot regression diff.
- **Owner lockout from new auth gate** → OTP-claim backfill stays for legacy rows;
  email-verify reuses existing infra.
- **Revenue dip from free Standard** → offset by paid placement + higher-trust
  inventory; measure (see §8).

## 7. Open questions — founder + legal (decisions I can't make)
1. **AFSL grant date** — Nov 2026 (avoid-list) or late 2027 (FIN_NOTEBOOK)? Sets
   Phase 2 timing and whether D4 verticals are *gated-wholesale* or *fully off*.
2. **D4 per-vertical disposition** — for `startup`/`fund`/`pre_ipo` (and infra
   syndications): wholesale-only, factual-only, or disabled-until-AFSL? (legal)
3. **D5** — confirm free Standard + paid placement, charge-on-approve.
4. **D1 table fate** — migrate-and-retire `listings`, or keep both with one as a
   thin alias? (recommend migrate-and-retire.)
5. **Cross-border** — keep the 12-country marketing on non-D4 verticals only?

## 8. Success metrics
- 0 listings published without a verified owner; 0 anonymous capital-markets
  submissions reaching publish.
- 1 write path, 1 table, 1 portal, 1 moderation queue (architectural).
- Price = behaviour (no charged-but-unadvertised or advertised-but-uncharged).
- No `/invest/*` 500s; entry-point dedup; bots green on the listing surface.
- Featured/Premium attach rate; approval→publish time; lead/enquiry quality.

## 9. Reversibility summary
| Decision | Reversibility | Notes |
|---|---|---|
| D1 system of record | Medium | migration forward-only; `listings` kept read-only 1 release |
| D2 auth required | High | additive; OTP-claim backfill retained |
| D3 lifecycle/portal | High | UI + status additive |
| D4 regulatory gating | High to toggle / **build gated on sign-off** | flag + attestation |
| D5 monetisation | Medium | pricing + Stripe wiring |
| D6 trust | High | additive |
| D7 guardrails | n/a | non-build decisions |

---

## 10. Progress log

### 2026-06-07 — Phase 0 + Phase 1 increment 1 shipped (PR #1459)
Founder decisions captured this session: **D4 = wholesale-only (s708)** (⚠️ needs legal
sign-off before build — recorded against Q2 in `AFSL-LAWYER-BRIEF.md`; **not built**);
**Phase 1 = proceed (full)**; **D5 = free Standard + paid placement, charge-on-approve**.

- **Phase 0 (Tier-A):** `/invest/[slug]` unknown slugs 404 cleanly (was 500); `/invest/submit`
  dead link → `/invest/list`; hero "8"→"10" categories.
- **D5 (partial):** Standard plan shown as **Free** + hero copy fixed. The
  charge-on-approve / refund-on-reject Stripe rework remains (Phase 3).
- **Phase 1 increment 1 (schema-free, Tier-C):** `/api/listings/submit` requires auth +
  provisions the `listing_owner` kind; `ListingSubmitForm` gates client-side (no data
  loss). Removes anonymous submissions. `tsc` + `listings-submit`/`listings` suites green.

**Refinements discovered (supersede earlier assumptions in §3/§5):**
- **Keep the existing `pending`/`active` status vocabulary** on `investment_listings`
  (public discovery filters `status='active'`), rather than importing the owner-flow's
  `draft/approved`. Less breakage, same lifecycle intent.
- **`owner_user_id` + RLS + data-migration + `/listings/new` redirect + my-listings
  authed rewrite = increment 2**, which is blocked on the migration being **applied to
  the live DB + types regenerated** (the Supabase types-drift CI gate compares committed
  `lib/database.types.ts` against gen-from-live, so the column can't be referenced in
  typed code until it exists in prod). Treat as a Tier-D precondition: founder/pipeline
  applies the migration, then increment 2's code lands.

### 2026-06-07 (later) — increment-2 migration + D4 legal brief staged
- **Migration written, not applied:** `supabase/migrations/20260907040000_investment_listings_ownership.sql`
  adds `owner_user_id` (nullable FK) + index + an `authenticated` SELECT policy
  (the table had none, so logged-in users currently can't read via RLS — this
  fixes that latent gap too). Additive/idempotent/rollback-documented. **Apply to
  the live DB to unblock increment-2 code** (the `owner_user_id` write would 500
  pre-apply since the column wouldn't exist).
- **D4 legal gate:** `docs/strategy/LISTINGS_S708_LEGAL_BRIEF.md` — the wholesale
  (s708) sign-off brief with a decision record for legal to complete. Build stays
  gated until §5 there is filled in.
- **Bundle:** the form's session check uses the shared `useUser()` hook (already
  in the Header bundle), so the auth gate adds no client-chunk weight.

### 2026-06-08 — schema-free carve-out shipped separately (this PR)
- The Phase-0 fixes + Phase-1 increment-1 auth gate (above) shipped as a **new,
  migration-free PR** off latest main, **not** via #1459 (which stayed blocked on
  the Tier-E migration coupling). The auth gate is migration-independent: it
  provisions `listing_owner_accounts` (already in prod) and **never writes
  `owner_user_id`**.
- **Excluded from that carve-out (still blocked):** the
  `20260907040000_investment_listings_ownership.sql` migration and all of
  increment 2. The migration stays fenced until the ledger baseline-squash
  (`docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md`); increment-2 code lands
  only after it's applied + `lib/database.types.ts` regenerated. D4/s708 stays
  unbuilt pending legal §5.
