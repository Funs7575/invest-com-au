# Avoid-list drift brief — HELD migrations needing founder + legal sign-off

**Status:** draft for founder + legal review · **Owner:** Fin (founder) · **Created:** 2026-06-04
· **Companion to:** `docs/strategy/REGULATORY-AVOID-LIST.md`, `docs/strategy/AFSL-LAWYER-BRIEF.md`

> Not legal advice. This is an engineering/strategy gate and an input to the AFSL adviser.
> Every escalator referenced here is **never-autonomous (Tier E-equivalent)** per
> `REGULATORY-AVOID-LIST.md` §ENFORCEMENT and `docs/audits/MERGE_AUTHORIZATION.md` Tier E.

## Purpose & scope

This brief reviews the schema migrations on the "avoid-list" — the ones that back features
implicating a **regulatory escalator beyond the planned ~Nov 2026 AFSL** (CSF intermediary,
Australian Market Licence, ACL/NCCP, custody, client money, conflicted remuneration, product
issuing). It is a **READ-ONLY** assessment: nothing here has been applied to the database,
un-gated, flag-flipped, or merged. The deliverable is a per-item decision row plus the concrete
unblock condition for each.

**Bottom line first:** of the 12 reviewed items, **1 is SAFE-INERT-SCHEMA** (the course-certificate
display column) and **11 are HOLD-for-founder+legal-signoff**. The held items are *not* bare
columns — most have substantial app-code already written (portals, routes, webhooks, Stripe rails,
cron) sitting behind feature flags or simply un-launched. The schema is the **foundation of
regulated-activity features**, which is exactly why the avoid-list treats it as a tripwire.

### Important context that shaped these calls

- **Schema is wired, not inert.** A code search found live app wiring for nearly every item:
  `/startup-portal/*`, `/api/startups/*`, `lib/stripe-connect/index.ts`, `lib/consumer-webhook-dispatch.ts`,
  `lib/briefs/{credits,auto-recharge,pricing-tier}.ts`, `app/api/ipo-offers`, `app/api/cron/refresh-loan-rates`,
  etc. So "does the schema alone enable regulated activity" is partly academic — the application layer
  that consumes the schema **already exists** and only a flag/launch decision separates it from going live.
- **Two kill-switch postures exist, and they are inconsistent.** Brief payments are hard-gated:
  `createPaymentForBrief()` refuses to create a charge unless `BRIEF_PAYMENTS_ENABLED === "true"`
  (`lib/stripe-connect/index.ts`). **But the DD-03 session-booking rail (`createBookingCheckout()`) has
  no equivalent pre-AFSL flag** — it only checks for the Stripe secret + Connect status. This is a
  flagged gap, called out per-item below.
- **Prior decisions already point HOLD.** `REGULATORY-AVOID-LIST.md` §"Current codebase tripwires"
  already lists the Startup Portal (CSF/market), the brief-payment clip (#859/MM34, client money + RG 246),
  and DD-03 (#1034, `do-not-merge`) as live-or-draft escalators to gate. `AFSL-LAWYER-BRIEF.md` has open
  questions for each. This brief does not re-litigate those; it confirms and extends them to the schema.
- **Duplicate startup-portal migration.** `20260520_sp02_startup_portal_schema.sql` and
  `20260729_sp02_startup_portal_schema.sql` both `CREATE TABLE IF NOT EXISTS` the same 8 startup tables
  and both `CREATE OR REPLACE` the `account_kind_membership` view. They diverge in RLS policy names,
  some defaults (`min_ticket_aud_cents` 0 vs 500000), added indexes, and the view's startup-label
  `COALESCE`. **Applying both is redundant and order-dependent** (last-writer-wins on the view + policies).
  This is a housekeeping hazard on top of the regulatory hold — flagged in the SP-02 row.

---

## Per-item decision table

| # | Item (migration / columns) | Exact schema change | Regulatory escalator + licence/permission (per REGULATORY-AVOID-LIST.md) | Does the SCHEMA ALONE enable regulated activity? | Recommendation | Unblock condition |
|---|---|---|---|---|---|---|
| 1 | **API billing tiers** — `20260825030000_api_billing_tiers.sql` | Adds `api_keys.stripe_subscription_id`, `stripe_customer_id`, `requests_this_month`, `billing_period_start`; new table `api_key_subscriptions` (tier/status, service-role RLS) | **Client money / payments** — §B "handling/holding client money"; recurring card billing infrastructure. Lower-risk than consumer→adviser flows (this is **B2B SaaS self-billing for our own API**, the lean-lane-approved monetisation), but it is still live Stripe money-movement that should land with the licensed entity + reviewed terms. | **Storage is inert**, but the columns exist *to drive* `lib/stripe-webhook/handlers/api-key-subscription.ts`. Schema alone creates no charge; the wired webhook handler does. | **HOLD** (low-risk; likely lean-lane-OK) | Founder + legal confirm B2B API SaaS billing is in-scope for the AFSL (or needs no AFSL as it is not a financial service); confirm merchant terms + refund/chargeback handling. Then un-hold. |
| 2 | **API consumer webhooks** — `20260825050000_api_consumer_webhooks.sql` | New table `api_consumer_webhooks` (url, events, secret_hash/prefix, service-role RLS) | **Data egress / Privacy Act** (§D parallel regimes), and indirectly **product/data-licensing** if the events carry regulated data. Not itself an AFSL escalator, but couples to billing tiers (#1) and to any future bank/CDR data (§A CDR). | **Inert** as schema. The wired dispatcher (`lib/consumer-webhook-dispatch.ts`) is what egresses data. | **HOLD** (pair with #1/#3; data-scope review) | Confirm with founder+legal what event payloads are permitted to leave the platform (no CDR/bank data, no PII beyond ToS); confirm it is gated to paying API tiers only. |
| 3 | **Consumer webhook deliveries** — `20260825060000_consumer_webhook_deliveries.sql` | Adds `api_consumer_webhooks.signing_secret` (plaintext, service-role); new table `consumer_webhook_deliveries` (payload/response log, retry) | Same as #2 — egress observability + a **plaintext signing secret at rest** (security/Privacy review trigger, not an AFSL escalator on its own). | **Inert** as schema; the dispatch/retry worker performs egress. | **HOLD** (pair with #2; security review of secret-at-rest) | Same gate as #2, plus security sign-off on storing the plaintext signing secret (acceptable under deny-all-anon RLS, but should be an explicit decision). |
| 4 | **Pro subscription (MM24)** — `20260515_mm24_pro_subscription_tier.sql` | `professionals.subscription_tier` / `subscription_status` / `subscription_started_at` / `subscription_current_period_end` / `subscription_stripe_id` (+ CHECKs, partial index) | **Client money / payments** (§B). This is **flat recurring B2B SaaS** (advisor pays us for placement/priority) — the **lean-lane-approved** monetisation model. Watch the **RG 246 / RG 234** edge: paying for "+priority weight in marketplace ranking" adjacent to an advice/lead surface is the conflicted-remuneration + disclosure question already open in `AFSL-LAWYER-BRIEF.md` §6. | **Inert** as schema; `lib/pro-subscription/index.ts` + Stripe wiring consume it. Migration comment itself says Stripe lifecycle is "gated behind a feature flag in app code". | **HOLD** (low-risk billing; RG 246/234 ranking-disclosure caveat) | Founder+legal confirm: (a) flat advisor-subscription billing is in-scope/needs-no-AFSL; (b) paid ranking priority is disclosed adequately (RG 234) and does not breach RG 246 when adjacent to advice. Then un-hold. |
| 5 | **Pro auto-recharge (MM03)** — `20260514_mm03_credit_auto_recharge.sql` | `professionals.stripe_customer_id`, `stripe_default_payment_method`, `auto_recharge_enabled`, `auto_recharge_threshold_credits`, `auto_recharge_pack_slug`, `auto_recharge_last_attempted_at` (+ partial index) | **Client money / payments** (§B). Stores a **saved card / off-session charge** capability. Charging a saved PM off-session for lead-credit top-ups is B2B (advisor buys our credits) — lean-lane-ish, but it is unattended money-movement that should land licensed + with mandate/SCA terms. | **Inert** as schema; `lib/briefs/auto-recharge.ts` performs the off-session charge. | **HOLD** (low-risk billing; mandate/SCA review) | Founder+legal/payments confirm off-session saved-card B2B billing is in-scope and the recharge mandate consent + Stripe off-session/SCA handling are compliant. Then un-hold. |
| 6 | **Advisor payout columns** — `20260514_pros_join_verification_columns.sql` (`payout_bsb`, `payout_account_last4`) | Among other verification columns, adds `professionals.payout_bsb` and `payout_account_last4`; plus a private `pro-verification-docs` storage bucket | **Custodial / client money** (§A "Custodial / IDPS authorisation", §B "handling/holding client money", **s981A+**). Storing payout bank details is the **advisor-payout** half of moving money *to* advisers — the exact intermediation the avoid-list says to avoid (use flat B2B fees / Stripe Connect destination charges, never custody). | **Schema is inert storage of a BSB + last4** (no full account number, no balance, no transfer). It does **not** itself move or hold money. But it exists to enable advisor payouts, which is the regulated leg. | **HOLD** | Founder+legal confirm the payout model (Stripe Connect destination charges vs manual/Wise) avoids s981A client-money/trust-account obligations; confirm we never hold client funds. Note: the *other* verification columns in this same migration (verification_status, accepts_briefs, doc bucket) are benign — but the migration is **atomic**, so it holds as a unit until the payout question clears. |
| 7 | **Outcome-based pricing (MM16)** — `20260514_mm16_outcome_based_pricing.sql` | `professionals.pricing_tier` ('standard'\|'success_only'); `advisor_auctions.pricing_tier_at_accept` snapshot (+ partial index) | **Conflicted remuneration (RG 246)** — §B. "Success_only" = pay a **higher multiple only when the consumer marks the outcome completed". A success-contingent fee tied to advice/lead outcomes is squarely the **%-of-outcome / paid-influence-on-advice** pattern RG 246 restricts. | **Inert** as schema (two text columns + a snapshot). But it encodes a **success-contingent pricing model** whose whole point is outcome-linked remuneration. The schema is the data model for an RG 246 escalator. | **HOLD** | Founder+legal confirm whether outcome-contingent advisor pricing is permissible under RG 246 at all, and if so under what flat-fee/disclosure structure. Likely needs redesign to a flat model, not just a flag. |
| 8 | **Session booking payments (DD-03)** — `20260520_dd03_session_booking_payments.sql` (`professionals.session_price_cents`) | Adds `professionals.session_price_cents`; new table `booking_payments` (amount/platform_fee/Stripe ids/status, RLS: consumer+advisor read, service-role all) | **Client money + RG 246** — §B. Consumer pays for an advisor session; platform retains **15% application_fee** via Stripe Connect. This is **consumer→adviser money intermediation + a % clip** — the avoid-list's flagged DD-03 item (PR #1034, `do-not-merge`). | **Inert** as schema. **CRITICAL GAP:** unlike brief payments, the consuming code path `createBookingCheckout()` in `lib/stripe-connect/index.ts` has **no `*_PAYMENTS_ENABLED` kill-switch** — it will create a real Checkout session if a pro is Connect-enabled and `STRIPE_SECRET_KEY` is set. So here the gap between "schema" and "live money" is thinner than elsewhere. | **HOLD** (highest priority) | (a) Founder+legal clear the consumer→adviser payment + 15% clip question (`AFSL-LAWYER-BRIEF.md` §1: client money s981A, RG 246). (b) **Engineering pre-req regardless of legal:** add a pre-AFSL flag gate to `createBookingCheckout()` mirroring `areBriefPaymentsEnabled()`. Keep PR #1034 `do-not-merge`. |
| 9 | **Startup portal schema (SP-02)** — `20260520_sp02_startup_portal_schema.sql` **and duplicate** `20260729_sp02_startup_portal_schema.sql` | 8 tables: `startup_profiles`, `startup_rounds` (instrument, target/raised, valuation cap, **anon-readable open/committed/closed**, `wholesale_only`), `wholesale_investor_certifications`, `startup_investor_inquiries`, `startup_data_room_files`/`_access`, `startup_sessions`, `esic_verifications`; + `account_kind_membership` view gains a `startup` arm | **CSF intermediary authorisation (RG 261/262) and/or Australian Market Licence (s795B)** — §A. Facilitating startup capital-raises / matching investors to offers is its own AFSL authorisation. Showing raise terms (valuation, instrument) to **retail** can constitute an **offer** needing disclosure. Already flagged LIVE-on-main in `REGULATORY-AVOID-LIST.md`. | **Schema is the structural enabler.** `startup_rounds` has an **anon-readable RLS policy** for open/committed/closed rounds — i.e. applying the schema + seeding a row + the existing `/invest/startups/*` UI would expose raise terms to retail without a verified s708 gate. The `wholesale_only` flag and `wholesale_investor_certifications` table exist precisely because this is the CSF/s708 boundary. This is the **least inert** item: the data model itself carries the regulated surface. | **HOLD** | Founder+legal resolve `AFSL-LAWYER-BRIEF.md` §2: CSF intermediary auth vs wholesale-only (s708) matching; required certs/attestations/disclaimers before showing raise terms or accepting an EOI; whether retail display = an offer. **Plus** SP-12 compliance signoff (`docs/audits/REMEDIATION_QUEUE.md` Blocked) and the `do-not-merge`-equivalent hold on PR #1048. **Also resolve the duplicate migration** (keep one; don't apply both). |
| 10 | **Startup sessions token (SP-03)** — `20260520_sp03_startup_sessions_token.sql` | Adds `startup_sessions.session_token text UNIQUE NOT NULL DEFAULT ''` | Same escalator as #9 (**CSF / market**). This is an auth-plumbing column for the startup portal; it has no independent regulated meaning but it **only exists to make the held startup portal work**. | **Inert** as a column, but it is part-and-parcel of the held CSF feature. Applying it in isolation is pointless without #9. | **HOLD** (rides with #9) | Unblocks only together with #9. Same legal gate. |
| 11 | **Investment loan rates** — `20260525_investment_loan_rates.sql` | New table `investment_loan_rates` (lender, rate, comparison_rate, max_lvr, IO, offset, min_loan, **apply_url**); anon-SELECT RLS; seeded 8 lenders | **Australian Credit Licence (NCCP)** — §A. Credit assistance = recommending/helping apply for specific loans. A factual rate table is the lean alternative; the **tripwire is `apply_url` + any "best loan for you" framing**. Today the seeded `apply_url` values all point to the **in-app broker finder** (`/find-advisor?type=mortgage-brokers`) = **referral**, which is the lean-lane-OK form. | **Inert + currently referral-shaped.** The schema *permits* a per-lender direct-apply URL, and the page that consumes it (`app/property/finance/`) is a comparison surface. The NCCP line is crossed not by the table but by (a) pointing `apply_url` at a direct-apply/lender landing page and/or (b) adding personalised "you should apply for X" framing. | **HOLD** (conservative — it is one config change away from credit assistance) | Founder+legal confirm (`AFSL-LAWYER-BRIEF.md` §4) the finance page stays a **factual comparison + referral to a licensed broker**, with no specific-loan recommendation and `apply_url` pointing only to the broker finder (not direct lender apply). With that guardrail documented, this can drop to SAFE/low-risk. Until documented: HOLD. |
| 12 | **IPO offers** — `20260826110000_ipo_offers.sql` | New tables `ipo_offers` (ASX IPO list: code, dates, issue_price, raised, **minimum_application_cents**, **prospectus_url**, published flag), `ipo_watchlist` (user alerts), `ipo_alert_sends` (dedup); anon-read on published; seeded | **Market / product issuing + sector layer** — §A "Product issuer + DDO/TMD", §C product/sector layers. A **factual list of third-party IPOs + a watchlist/alert** is comparison/referral (lean-lane). The escalator is only reached if we **facilitate the application/subscription** (accept money, route to subscribe) or **issue/co-brand** an offer. | **Inert + currently factual.** `app/api/ipo-offers` is a public read-only list; `minimum_application_cents` is informational; `prospectus_url` links out. No subscribe/apply/money path exists in the schema. The escalator is *adjacent* (this is the "market/product issuing" sector), so conservatively it stays on the avoid-list. | **HOLD** (conservative — it sits in the product-issuing sector layer) | Founder+legal confirm IPO content stays **factual display + alerts only**, with no application-facilitation, no "apply here" subscription routing, and no co-branded/own offer. With that documented, this can drop to SAFE/low-risk. Until documented: HOLD. |
| — | **Certificate holder display name** — `20260825070000_certificate_holder_display_name.sql` | Adds `course_certificates.holder_display_name text` | **None.** `course_certificates` is the **CPD / course-completion** certificate (ASIC CPD hours for advisors; `lib/course-certificates.ts`). This column is a denormalised display string so the public verify page (`/certificate/[number]`) renders a name without joining PII/auth tables. No financial product, no money, no advice, no offer. | **N/A — genuinely inert display field.** It stores a name captured at issuance; existing rows stay NULL with a generic fallback. It touches no escalator on the avoid-list. | **SAFE-INERT-SCHEMA (no regulated capability)** | None required from a regulatory standpoint. (Normal merge-authorization tier still applies; it is education/CPD content, not on the avoid-list.) |

---

## Summary classification

**SAFE-INERT-SCHEMA — no regulated capability (1):**
- `20260825070000_certificate_holder_display_name.sql` — inert CPD-certificate display column; not a financial surface.

**HOLD for founder + legal sign-off (11):**
- `20260825030000_api_billing_tiers.sql` — API SaaS billing (client money / payments) — *low-risk, likely lean-lane-OK*.
- `20260825050000_api_consumer_webhooks.sql` — data egress (Privacy; couples to billing/CDR).
- `20260825060000_consumer_webhook_deliveries.sql` — egress log + plaintext signing secret.
- `20260515_mm24_pro_subscription_tier.sql` — advisor SaaS billing — *low-risk; RG 246/234 ranking caveat*.
- `20260514_mm03_credit_auto_recharge.sql` — saved-card off-session B2B billing — *low-risk; mandate/SCA caveat*.
- `20260514_pros_join_verification_columns.sql` (`payout_bsb`, `payout_account_last4`) — advisor-payout / client-money (s981A).
- `20260514_mm16_outcome_based_pricing.sql` — outcome-contingent pricing (RG 246).
- `20260520_dd03_session_booking_payments.sql` — consumer→adviser payment + 15% clip (client money + RG 246) — **highest priority + has a missing kill-switch**.
- `20260520_sp02_startup_portal_schema.sql` **+** duplicate `20260729_sp02_startup_portal_schema.sql` — startup capital-raise matching (CSF RG 261/262 / Market Licence s795B) — **least inert; anon-readable raise terms**.
- `20260520_sp03_startup_sessions_token.sql` — startup-portal auth column (rides with SP-02).
- `20260525_investment_loan_rates.sql` — investment-loan rate table (ACL/NCCP) — *currently referral-shaped; one config change from credit assistance*.
- `20260826110000_ipo_offers.sql` — ASX IPO factual list + alerts (market/product-issuing sector) — *currently factual-only*.

## Headline recommendation

**HOLD all 11. Apply none of the avoid-list migrations to the database; do not un-gate, un-draft,
or flag-on any associated feature, until founder + legal sign-off is recorded in-repo per
`REGULATORY-AVOID-LIST.md` §ENFORCEMENT.** Only the certificate display column is clear to proceed
under normal merge tiers.

Conservatism note: items 1, 4, 5 (and arguably 11, 12) are the *lean-lane monetisation* the strategy
explicitly wants (flat B2B fees, factual comparison + referral). They are flagged HOLD not because the
model is wrong, but because (a) they involve live money-movement or sit in a sector layer, and (b) the
avoid-list mandates founder + legal confirmation **before** enabling anything in those zones — "when in
doubt, HOLD". Once the relevant `AFSL-LAWYER-BRIEF.md` questions are cleared and the answers annotated
back here, these can be reclassified individually without re-reviewing the whole set.

### Two engineering follow-ups surfaced by this review (not regulatory sign-offs, but do them)

1. **Add a pre-AFSL kill-switch to the session-booking rail.** `createBookingCheckout()`
   (`lib/stripe-connect/index.ts`) lacks the `areBriefPaymentsEnabled()`-style flag that
   `createPaymentForBrief()` has. As written, a Connect-enabled pro + a Stripe secret is enough to take
   a real consumer payment. This should be gated behind an explicit env flag (default OFF) **independent
   of** the legal decision, so the rail cannot fire accidentally pre-AFSL.
2. **Resolve the duplicate SP-02 migration.** `20260520_sp02_*` and `20260729_sp02_*` create the same
   tables and replace the same view with divergent policies/defaults. Pick one before either is ever
   applied; applying both is order-dependent and confusing.

## Maintenance

When a `AFSL-LAWYER-BRIEF.md` question is cleared, annotate the matching row above with
*covered / not covered / needs separate authorisation* and the date, mirroring the maintenance
convention in `REGULATORY-AVOID-LIST.md`. Do not delete rows — move resolved items to a "Cleared"
section at the bottom.
