# Pre-launch product bets — implementation plan

## Context

Founder asked for "high-quality future-proof bets versions" of three pre-launch product expansions identified in conversation:

1. **Account-types future-proofing** (firm / broker / CRE / fund-operator / investor profiles)
2. **Foreign-investment country pages: government schemes & grants section**
3. **Advisor-portal billing UX + refund-as-credit + no-lock-in policy**

Plus an exploration of adjacent higher-ROI ideas to consider in the same launch wave.

The intended outcome: ship the durable foundations of all three pre-launch (some as foundations only, some end-to-end), and queue a clear list of next-best-bets that don't fit this wave.

The existing surface to extend (audited):
- 12 country pages live (`app/foreign-investment/{country}` + dynamic `[country]`) backed by mixed hardcoded TSX configs and Supabase tables (`country_investment_profiles`, `foreign_investment_rates`); specialty taxonomy already includes UK Pension Transfer / FATCA / DASP / FIRB / migration_agent
- Single-account-per-`auth.users` model; `professionals` table via `auth_user_id` unique index; `broker_accounts` already implements the alternative pattern (different entity, same auth_user_id link); `investment_listings`, `property_listings`, `fund_listings` exist but lack a clean owner-FK pattern
- Live billing infra: 4-tier system in `lib/advisor-tiers.ts`, lead pricing in `lead_pricing` table, top-ups via `advisor_credit_topups`, charge-refunded webhook handler, full Stripe subscription + checkout flows. `BillingTab.tsx` and `UpgradeClient.tsx` already exist — new work is filling specific gaps, not greenfield.

---

## 1. Foreign-investment country schemes & grants (PR-F1, ~3-4 days)

### Decision
DB-backed (not hardcoded) so editorial team can update without redeploys. Single new table; render as a new section on existing country pages; admin CRUD via existing `/app/admin/*` pattern.

### Migration
`supabase/migrations/<date>_country_schemes.sql`

```sql
CREATE TABLE IF NOT EXISTS public.country_schemes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  country_code    text   NOT NULL,                          -- ISO-2: 'gb','us','in','cn','sg', etc.
  audience        text   NOT NULL CHECK (audience IN (
                    'inbound_migrant',                       -- audience A: foreign → AU
                    'us_au_dual',                            -- audience B: US-AU duals
                    'non_resident_investor',                 -- audience C: into AU without moving
                    'outbound_australian'                    -- audience D: leaving AU
                  )),
  category        text   NOT NULL CHECK (category IN (
                    'visa_pathway',          'firb_threshold',
                    'tax_concession',        'super_rule',
                    'pension_transfer',      'first_home_buyer',
                    'investor_grant',        'dual_tax_treaty'
                  )),
  name            text   NOT NULL,
  summary         text   NOT NULL,                          -- 1-2 sentences for cards
  body_md         text   NOT NULL,                          -- markdown details for popover/page
  threshold_cents bigint,                                   -- if monetary; nullable
  threshold_label text,                                     -- "$1.5M+", "Annual cap"
  source_name     text   NOT NULL,                          -- "ATO", "Treasury", "ASIC"
  source_url      text   NOT NULL,
  sourced_at      date   NOT NULL,                          -- when we last verified
  stales_at       date   NOT NULL,                          -- when DatedStatBadge shows stale
  display_order   integer NOT NULL DEFAULT 0,
  status          text   NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','retired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_country_schemes_lookup
  ON public.country_schemes (country_code, status, audience, display_order);

ALTER TABLE public.country_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read published"
  ON public.country_schemes FOR SELECT TO anon
  USING (status = 'published');

CREATE POLICY "service_role full"
  ON public.country_schemes FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

### Files to add/modify
- `supabase/migrations/<date>_country_schemes.sql` (new)
- `lib/country-schemes.ts` (new) — `getSchemesForCountry(code, audience?)`, `getSchemesByCategory(...)` + Zod schemas. Pure DB-fetch helper; no admin secrets.
- `components/CountrySchemesSection.tsx` (new) — renders grouped cards by category, each scheme wrapped in `<DatedStatBadge sourcedAt={...} stalesAt={...} source={...} sourceUrl={...}>`. Re-uses `lib/dated-stats.ts` register pattern.
- `lib/schema-markup.ts` (modify) — add `governmentServiceJsonLd(scheme)` returning schema.org `GovernmentService` type for SEO.
- `app/foreign-investment/{country}/page.tsx` (modify each of 12) — render `<CountrySchemesSection countryCode="gb" />` under hero, before advisor CTA.
- `app/admin/cross-border-schemes/page.tsx` + `app/admin/cross-border-schemes/SchemesEditor.tsx` (new) — minimal CRUD UI; reuse admin auth pattern + `ADMIN_EMAILS` allow-list per `proxy.ts`.
- `app/api/admin/country-schemes/route.ts` (new) — POST/PATCH/DELETE with Zod via `withValidatedBody`.
- `__tests__/lib/country-schemes.test.ts` + `__tests__/api/admin/country-schemes.test.ts` (new) — RLS isolation + admin-only mutation.

### Seed content (PR-F1 scope)
3 highest-LTV countries × ~6 schemes each = 18 seed rows in the migration:
- **UK**: UK Pension Transfer (QROPS rules), FIRB Established Dwelling threshold, FHB Concession (state-by-state), Super non-resident contribution caps, US-UK-AU treaty residency, SIV 188C threshold
- **US-AU duals**: FATCA reporting threshold, PFIC trap on AU managed funds, Streamlined Filing Compliance, Roth IRA AU treatment, Estate-tax treaty, Social Security totalisation
- **India**: NRI vs ROR rules, DASP rate (2024 update), FIRB exemption (if any), India-AU DTA on dividends, FEMA repatriation cap, AU permanent migration thresholds

### Verification
- Run `npm run dev`, visit `/foreign-investment/united-kingdom`, confirm UK schemes render with DatedStatBadges
- Visit `/admin/cross-border-schemes` (logged in as admin), edit a scheme, confirm it surfaces on the public page
- `npm test -- country-schemes` — passes RLS + admin auth tests
- `npm run e2e -- foreign-grants` — Playwright check that public page renders scheme cards with stale-date warnings if applicable

---

## 2. Account-types future-proofing (PR-A1, ~half day, mostly docs)

### Decision: NO migration. Document the abstraction.

After audit (Agent A), the cleanest pattern for future account kinds is **the existing `broker_accounts` shape**: new entity tables that join via `auth_user_id` (and add unique index + RLS policies), kept separate from `professionals`. This keeps each entity's compliance surface clean (advisors → AFSL, listing owners → real estate licence, fund operators → wholesale rules).

A master `accounts` table would be premature normalisation given current volume — and the actual *blocker* if it existed isn't there: today an `auth.users` can already point at multiple entity tables (advisor row, listing-claim row, etc.). Single-account-per-user is enforced by the unique-index pattern, which is what we want for compliance separation.

### Files to add/modify
- `docs/architecture/account-types.md` (new) — the abstraction doc:
  - Today: `professionals` (advisors), `broker_accounts` (marketplace partners), email-allow-list admins
  - Future kinds and their tables: `listing_owners` (CRE seller marketplace), `wholesale_operators` (fund managers — sophisticated-investor flow), `investor_profiles` (end-user logged-in dogfood, saved searches, wizard pre-fill), `firm_partners` (firm-admin roles separate from advisor membership)
  - The auth flow per kind (Supabase magic link / OTP / password)
  - Compliance note per kind (AFSL Class 1 / 2 differences, real estate licence, sophisticated investor s708 declaration, GDPR for investor data)
  - The "what changes if we want multi-account-per-user" section: still doable later by relaxing the unique indexes and adding a join table `user_account_kinds(auth_user_id, kind)` — listed as deferred.
- `lib/account-types.ts` (new, ~30 LOC) — string-enum `AccountKind = 'advisor' | 'broker_partner'` (today) plus reserved future values commented in. Single import surface for any future code that needs to branch on kind.
- `lib/require-advisor-session.ts` (no change) — confirms existing function name is correct; `requireAccountSession(kind)` is a future generalisation listed in the doc.

### What this PR is NOT
- Not adding new account kinds. Not migrating existing data. Not refactoring `professionals`.
- The doc is the deliverable. Code changes are limited to the small `account-types.ts` enum module.

### Verification
- `docs/architecture/account-types.md` peer-reviewable
- `import { AccountKind } from '@/lib/account-types'` typechecks in a sample file
- New PRs that introduce new kinds (CRE, etc.) reference this doc and follow the pattern

---

## 3. Advisor-portal billing UX + refund-as-credit + no-lock-in (PR-B1, B2, B3 — ~2 weeks total)

Per Plan-agent design (folded in here, slimmed for scan-ability). **Tier C** — announce in chat before merging each PR.

### Core opinions

1. **`advisor_credit_ledger` is the single source of truth.** Every mutation to `professionals.credit_balance_cents` (topup, refund, proration credit, lead spend, expiry, admin adjustment) writes a ledger row first; the column on `professionals` becomes a denormalised cache, recomputable from `SUM(amount_cents)`.
2. **Refund-as-credit defaults; cash-refund requires explicit Stripe metadata.** The webhook reads `charge.metadata.refund_policy` (set when ops issues the refund). Default = credit; `refund_policy = "cash"` keeps existing card-back behaviour.
3. **Downgrades defer to end of cycle, but become immediately visible in the UI.** Advisor sees "Pro until 7 Jun, then Growth" the moment they downgrade. Stripe controls the actual switch via `cancel_at_period_end`.
4. **Public `/billing-policy` page lives under content (not portal).** Marketing/legal surface (SEO-indexed, AFSL-aware). Reuses `lib/compliance.ts` AFSL helpers.

### PR-B1 — Foundational ledger + refund-as-credit (Tier C)

**Goal:** ledger exists, refunds default to credit, all in-place balance mutations refactored through one helper.

**Migration:** `supabase/migrations/<date>_advisor_credit_ledger.sql`
- Table `advisor_credit_ledger` (id, professional_id, amount_cents [signed], balance_after_cents, kind ∈ {`topup`, `refund_to_credit`, `lead_spend`, `lead_dispute_refund`, `tier_proration_credit`, `admin_adjustment`, `expiry`, `chargeback_clawback`}, reference_type, reference_id, description, metadata, expires_at, created_by, created_at)
- Partial unique index on (kind, reference_type, reference_id) WHERE reference_id IS NOT NULL — webhook idempotency
- Indexes for advisor read + expiry sweep
- RLS: advisor SELECT own; service_role full; no anon
- Backfill: synthesise `topup` rows from existing `advisor_credit_topups WHERE status='completed'`

**New helper:** `lib/advisor-credit-ledger.ts`
- `recordLedgerEntry({ professionalId, amountCents, kind, referenceType, referenceId, description, metadata, expiresAt, createdBy })` — single transactional insert + cache update
- `getLedgerPage(professionalId, { limit, offset })` — paginated SELECT
- `computeBalance(professionalId)` — `SUM(amount_cents)` for reconciliation cron
- `expireOldCredits()` — TTL sweep (called from cron)

**Refactored callsites (call `recordLedgerEntry` instead of in-place UPDATE):**
- `lib/stripe-webhook/handlers/checkout-session-completed.ts` (topup completed)
- `lib/advisor-lead-dispute-resolver.ts` (lead refund to credit)
- `app/api/advisor-enquiry/route.ts` (lead spend)
- `app/api/admin/automation/override/route.ts` (admin adjustment)

**Refund-as-credit flow** in `lib/stripe-webhook/handlers/charge-refunded.ts`:
- After existing course/wallet/consultation flows, add advisor-billing flow
- Look up `advisor_billing` or `advisor_credit_topups` by `stripe_payment_intent_id`
- Read `charge.metadata.refund_policy` (`'cash'` keeps Stripe-card-back; default = credit)
- Compute partial-refund delta against prior `refund_to_credit` ledger rows for the same charge id (idempotent under replay)
- Write `kind: 'refund_to_credit'`, `expires_at: addMonths(now, 24)`
- Mark originating row `status='refunded'`
- Email advisor with confirmation

**Manager-override path:** ops staff trigger from `app/admin/refunds/...` (extend existing); form posts to `POST /api/admin/advisor-refund` which calls `stripe.refunds.create({ charge, metadata: { refund_policy, refund_reason, ops_actor_email } })`. Webhook reads metadata — no admin auth in webhook itself.

**Tests (new):**
- `__tests__/lib/advisor-credit-ledger.test.ts` — concurrent inserts, balance reconciliation, expiry math
- `__tests__/lib/stripe-webhook/charge-refunded.test.ts` (extend) — webhook idempotency, partial-refund deltas, cash-vs-credit branching
- `__tests__/integration/advisor-credit-ledger-rls.int.test.ts` — RLS isolation (advisor A can't read advisor B's ledger)

### PR-B2 — UX surface (Tier B, mostly additive)

**Goal:** unified ledger view, payment method on file, dashboard widget, Stripe Customer Portal link.

**New endpoints:**
- `POST /api/advisor-auth/billing-portal/route.ts` — `stripe.billingPortal.sessions.create({ customer, return_url })`. Auth via `requireAdvisorSession`. Rate limit 5/min/IP. Idempotency key = `advisor_portal_${id}_${minute}`.
- `GET /api/advisor-auth/billing-summary/route.ts` — single fetch returning `{ balance, expiringSoon, paymentMethod, pendingTier, ledgerPage[0..50] }`. Used by both BillingTab AND DashboardTab — one round-trip per portal load.
- `GET /api/advisor-auth/credit-ledger/route.ts` — paginated ledger (50/page).

**Extracted shared module:** `lib/advisor-credit-packs.ts` — currently `CREDIT_PACKS` is duplicated between `BillingTab.tsx:50` and `topup/route.ts:27`. Single source per CLAUDE.md "Single sources of truth" rule.

**New components in `app/advisor-portal/billing/`:**
- `CreditBalanceCard.tsx` (extracted from BillingTab line 36-44, plus "Expires from <date>" computed from ledger)
- `CreditPackGrid.tsx` (extracted from BillingTab line 46-93)
- `PaymentMethodCard.tsx` — "Card on file: Visa •••• 4242 — Update". Update click opens Customer Portal.
- `LedgerHistoryTable.tsx` — replaces separate "Lead Charges" + "Top-up History" tables with a unified ledger view (date / kind badge / description / amount / running balance). Kind badges: topup violet, refund_to_credit emerald, lead_spend slate, tier_proration_credit blue, admin_adjustment amber.
- `DowngradeBanner.tsx` — renders when `advisor.pending_tier` is set: "You're on Pro until 7 Jun, then Growth. Cancel downgrade →"
- `PinnedBillingWidget.tsx` — top of `/advisor-portal` dashboard. 3 pieces: credit remaining (+ "≈ N leads at $X"), this-month spend, status pill (`healthy` / `low` / `empty` / `pending_downgrade`) + CTA. Replaces the inline credit banner in DashboardTab.tsx:72-120.
- `BillingPolicyLink.tsx` — small inline link to `/billing-policy`.

**Modified pages:**
- `app/advisor-portal/BillingTab.tsx` — composes the new components in this order: DowngradeBanner (conditional) / CreditBalanceCard / CreditPackGrid / PaymentMethodCard / "Manage subscription & invoices" button → Customer Portal / Featured Advisor + Expert Article (kept) / LedgerHistoryTable / BillingPolicyLink
- `app/advisor-portal/DashboardTab.tsx` — render PinnedBillingWidget, remove inline credit banner
- `app/advisor-portal/page.tsx` — fetch billing-summary, pass through

**Tests:**
- `__tests__/api/advisor-billing-portal.test.ts` — 401/404/503/429/200 paths, idempotency key shape
- `__tests__/components/PinnedBillingWidget.test.tsx` — all 4 states from fixture
- `e2e/advisor-billing.spec.ts` — login → dashboard widget visible → top-up → BillingTab → Customer Portal redirect (mocked) → ledger row appears → policy link navigates

### PR-B3 — No-lock-in policy + downgrade flow + public policy page (Tier C)

**Goal:** downgrades become end-of-cycle by default; public policy page; cancel-pending-downgrade endpoint.

**Migration:** `supabase/migrations/<date+1>_professionals_pending_tier.sql`
- `ALTER TABLE professionals ADD COLUMN pending_tier text, ADD COLUMN pending_tier_effective_at timestamptz` (additive)

**Modified flow** in `app/api/advisor-auth/tier-upgrade/route.ts`:
- Detect downgrade
- Look up active subscription on `subscriptions` table; extract `current_period_end`
- Compute proration credit via `prorateUpgradeCents` (flip sign for downgrade)
- Issue credit via `recordLedgerEntry({ kind: 'tier_proration_credit', expiresAt: null })` — never expires (it's owed money)
- Stamp `pending_tier`, `pending_tier_effective_at` on `professionals`. Do NOT flip `advisor_tier` yet.
- Tell Stripe: `stripe.subscriptions.update(sub.id, { cancel_at_period_end: true, metadata: { pending_tier, downgrade_initiated_at } })`
- Email advisor: effective date + proration credit amount
- `lib/stripe-webhook/handlers/customer-subscription.ts` — `handleCustomerSubscriptionDeleted` reads `metadata.pending_tier` at cycle end, flips `advisor_tier`, queues a checkout-link email if going to a paid lower tier (free needs no new sub)

**New endpoint:** `DELETE /api/advisor-auth/tier-upgrade/pending/route.ts`
- Reads pending state from `professionals`
- Calls `stripe.subscriptions.update(sub.id, { cancel_at_period_end: false })` — un-cancels
- Clears `pending_tier`, `pending_tier_effective_at`
- Claws back credit via `recordLedgerEntry({ kind: 'admin_adjustment', amount: -prorationCents, metadata: { reason: 'cancelled_pending_downgrade' }})`

**Public page:** `app/billing-policy/page.tsx` (ISR `revalidate=86400`)
Sections:
1. **No lock-in, ever** — cancel any time; downgrades effective at end of current cycle; unused subscription days come back as portal credit
2. **How charges work** — free tier (3 leads), pay-per-lead after, optional monthly tier, no minimum, no setup fee
3. **Refunds: credit-first** — explains the policy. Cash refunds for: billing errors, platform outages > 4h, fraud, lead-quality disputes resolved in advisor's favour. Credit refunds for everything else.
4. **Credit expiry** — top-up credits expire 24 months from issue; refund + proration credits never expire
5. **Lead disputes** — link to `lib/advisor-lead-disputes.ts` policy at `/advisor-portal#disputes`
6. **Self-service tools** — Customer Portal CTA
7. **AFSL framing** — `AFSL_STATUS_DISCLOSURE` from `lib/compliance.ts:205`. Body: "Invest.com.au does not hold an AFSL and does not provide financial product advice. Advisor billing is for marketplace placement and lead access — it does not affect, and is not connected to, advice you receive from advisors."
8. Schema.org breadcrumb via `breadcrumbJsonLd`

`app/sitemap.ts` — add `/billing-policy` entry

**Tests:**
- `__tests__/api/advisor-tier-upgrade.test.ts` (extend) — downgrade defers, sets pending fields, writes proration credit
- `__tests__/api/advisor-tier-upgrade-pending.test.ts` (new) — DELETE cancels pending + claws back credit
- `__tests__/lib/stripe-webhook/customer-subscription.test.ts` (extend) — cycle-end flip
- `e2e/advisor-billing.spec.ts` (extend) — downgrade → cancel-pending flow

### What's intentionally NOT in this wave
- Auto-topup-at-low-balance Stripe SetupIntent flow (toggle column `credit_auto_topup` exists; UX completion is its own PR)
- Annual billing prompt on the dashboard (data already there; UX is a separate small PR)
- Firm-level billing aggregation
- Lead-refund self-service for advisors (currently dispute path is admin-side)

---

## 4. Adjacent ROI exploration (per founder ask: "what other similar things to add")

Top 5 by ROI / effort, drawn from the audit findings:

### 4.1 Auto-topup at low balance (PR-X1, ~2 days)
Toggle column `credit_auto_topup` already exists on `professionals` — just no flow. Use Stripe SetupIntent to save a payment method, then a daily cron (`/api/cron/advisor-auto-topup`) detects balance below the configured threshold and charges the saved method. Eliminates the "ran out of leads on Friday night" failure mode that's the #1 churn cause for marketplace-style products. Composes with PR-B1's ledger.

### 4.2 Lead-quality SLA + response-time reward (PR-X2, ~3 days)
Columns `avg_response_minutes`, `response_time_hours` already on `professionals`. Surface a public-facing "Responds within 60 min" badge (already implemented partial — extend), and add a billing-side "respond to your next lead within 60 min, get the lead after at 25% off" mechanic. Two-sided benefit: end-users get faster response, advisors get a usage-based discount. Increases NPS on both sides.

### 4.3 Firm-level billing dashboard (PR-X3, ~3 days)
For `is_firm_admin = true` users, aggregate across `firm_id`: total firm credit balance (pooled), firm-wide leads-this-month, per-member breakdown, single firm payment method. Enables enterprise sales conversations (10-seat firm with $5k/mo budget vs 10 individual subscriptions). Composes with PR-B1's ledger; adds a `firm_credit_balance_cents` view.

### 4.4 Annual-billing dashboard prompt (PR-X4, ~half day)
Tier model already prices annual. Dashboard widget: "Switch to annual on Pro and save $X/yr (= 2 free months)". One-click upgrade via existing `tier-upgrade` route with `billing: 'annual'`. Shifts cash-flow forward. Should ship right after PR-B2 (the dashboard widget surface is established).

### 4.5 Investor / end-user accounts (PR-X5, ~1 week)
New table `investor_profiles` joining `auth_user_id` (per the broker_accounts pattern documented in §2). Saved searches, saved comparisons, pre-filled wizard data, opt-in newsletter. Conversion lift via personalisation, but more importantly: this is the foundation for the gated matchmaker flow ("save your match results — sign in") and post-launch personalised content. Significant scope — properly its own wave after launch.

### Lower-priority but tracked
- Newsletter sponsorship (post-launch — needs list size first)
- AI-assisted advisor profile drafting (composes with the embedding chunk shipped in #622 — high-leverage but better post-launch when we have advisor signal on what's working)
- White-label embed for partners (`app/embed/` exists; expose `/embed/concierge` + `/embed/advisor-search`; partner-driven CPL channel)
- Cross-border country-of-origin geo-detection landing
- CRE listings marketplace (`property_listings` already exists; charge listing fee; new revenue line — but compliance scope is non-trivial)

---

## Critical files to modify (whole plan)

### Foreign country schemes (PR-F1)
- `supabase/migrations/<date>_country_schemes.sql` (new)
- `lib/country-schemes.ts` (new)
- `components/CountrySchemesSection.tsx` (new)
- `lib/schema-markup.ts` (modify — add `governmentServiceJsonLd`)
- `app/foreign-investment/{country}/page.tsx` × 12 (modify — render section)
- `app/admin/cross-border-schemes/page.tsx` + editor (new)
- `app/api/admin/country-schemes/route.ts` (new)

### Account types doc (PR-A1)
- `docs/architecture/account-types.md` (new)
- `lib/account-types.ts` (new, ~30 LOC)

### Advisor billing (PR-B1, B2, B3)
- `supabase/migrations/<date>_advisor_credit_ledger.sql` (new)
- `supabase/migrations/<date+1>_professionals_pending_tier.sql` (new)
- `lib/advisor-credit-ledger.ts` (new)
- `lib/advisor-credit-packs.ts` (new — extracted)
- `lib/stripe-webhook/handlers/charge-refunded.ts` (extend)
- `lib/stripe-webhook/handlers/checkout-session-completed.ts` (modify)
- `lib/stripe-webhook/handlers/customer-subscription.ts` (extend)
- `lib/advisor-lead-dispute-resolver.ts` (modify)
- `app/api/advisor-enquiry/route.ts` (modify)
- `app/api/admin/automation/override/route.ts` (modify)
- `app/api/advisor-auth/billing-portal/route.ts` (new)
- `app/api/advisor-auth/billing-summary/route.ts` (new)
- `app/api/advisor-auth/credit-ledger/route.ts` (new)
- `app/api/advisor-auth/tier-upgrade/route.ts` (modify)
- `app/api/advisor-auth/tier-upgrade/pending/route.ts` (new)
- `app/api/admin/advisor-refund/route.ts` (new)
- `app/advisor-portal/billing/*` × 6 components (new)
- `app/advisor-portal/BillingTab.tsx` (refactor)
- `app/advisor-portal/DashboardTab.tsx` (modify)
- `app/advisor-portal/page.tsx` (modify)
- `app/billing-policy/page.tsx` (new)
- `app/sitemap.ts` (modify)

---

## Existing utilities to reuse (do not re-implement)

- `lib/compliance.ts` — `AFSL_STATUS_DISCLOSURE`, AFSL helpers (use on `/billing-policy`)
- `lib/seo.ts` — `breadcrumbJsonLd`, `CURRENT_YEAR`, `absoluteUrl` (use on country & policy pages)
- `lib/dated-stats.ts` — registry pattern for cron alerting on stale dates (register every scheme entry)
- `components/DatedStatBadge.tsx` — wrap every dated claim (V-NEW-01 enforced)
- `lib/schema-markup.ts` — extend with `governmentServiceJsonLd`; reuse existing `articleJsonLd`/`faqJsonLd`/etc.
- `lib/validation/withValidatedBody.ts` — Zod-validated request bodies on every new POST/PATCH/DELETE
- `lib/logger.ts` — structured logging (never `console.*`)
- `lib/rate-limit.ts` — DB-backed rate limiting (use on billing-portal route)
- `lib/stripe.ts` — `getStripe()` singleton; do not re-init Stripe
- `lib/advisor-tiers.ts` — `prorateUpgradeCents()` (use in downgrade flow)
- `lib/require-advisor-session.ts` — `requireAdvisorSession()` (every advisor-auth route)
- `lib/admin.ts` — `ADMIN_EMAILS` allow-list (every admin route)
- `lib/supabase/admin.ts` — service-role client (webhooks, admin routes only)
- `lib/supabase/server.ts` — RSC + route-handler client (everything else, carries user cookies)
- `webhook_events` table — Stripe idempotency PK (every webhook handler)
- `proxy.ts` — admin route gating + MFA enforcement (CLAUDE.md V-NEW-07)

---

## Verification

### Foreign country schemes
- [ ] `npm run dev`, visit `/foreign-investment/united-kingdom` — UK schemes section renders with 6+ scheme cards, each wrapped in DatedStatBadge
- [ ] `/admin/cross-border-schemes` — add/edit a scheme, surfaces on public page within ISR cycle
- [ ] `npm test -- country-schemes` — RLS isolation tests + admin-only mutation tests pass
- [ ] CI "Stale dated-stats gate" passes (no `stalesAt` in past)
- [ ] `npm run e2e -- foreign-grants` — Playwright check renders + asserts JSON-LD `GovernmentService` present
- [ ] Lighthouse score on country page doesn't regress

### Account types
- [ ] `docs/architecture/account-types.md` peer-reviewable; covers all 5 future kinds + compliance per kind
- [ ] `import { AccountKind } from '@/lib/account-types'` typechecks
- [ ] `npm run type-check` clean

### Advisor billing
PR-B1:
- [ ] Run migration locally; `advisor_credit_ledger` exists with constraints; backfill produced one row per completed topup
- [ ] `npm test -- advisor-credit-ledger` — concurrent insert + reconciliation tests pass
- [ ] `npm test -- charge-refunded` — replay produces zero duplicates; cash-vs-credit branching correct
- [ ] `npm test -- advisor-credit-ledger-rls.int` — advisor A cannot read advisor B's ledger
- [ ] Coverage on `lib/advisor-credit-ledger.ts` ≥ 85%

PR-B2:
- [ ] `npm test -- advisor-billing-portal` — 401/404/503/429/200 paths
- [ ] `npm run dev`, `/advisor-portal` — PinnedBillingWidget renders all 4 states from fixture data
- [ ] `npm run dev`, `/advisor-portal?tab=billing` — composed BillingTab renders; ledger table shows kind badges; "Manage subscription" link returns Stripe Customer Portal URL
- [ ] `npm run e2e -- advisor-billing` — login → top-up → ledger row → policy link

PR-B3:
- [ ] Downgrade does NOT flip `advisor_tier` immediately; sets `pending_tier`; writes proration credit; calls Stripe `cancel_at_period_end`
- [ ] DELETE `/api/advisor-auth/tier-upgrade/pending` un-cancels and claws back credit
- [ ] `/billing-policy` renders all 8 sections; Schema.org breadcrumb present
- [ ] `npm run e2e -- advisor-billing` — downgrade + cancel-pending flow passes
- [ ] Manual: confirm Stripe Dashboard → Customer Portal config matches `docs/runbooks/stripe-portal.md`

### Adjacent ROI ideas (PR-X*)
Each gets its own verification when scoped — listed for tracking only, not part of this plan's PRs.

---

## Sequencing recommendation

To stay under the launch timeline while preserving Tier-C carefulness:

1. **Week 1:** PR-A1 (account-types doc, half day) → PR-F1 (foreign country schemes, ~3-4 days) → PR-B1 (ledger + refund-as-credit, ~2-3 days, Tier C announce)
2. **Week 2:** PR-B2 (UX surface, ~2-3 days) → PR-B3 (no-lock-in policy + flow, ~2 days, Tier C announce) → PR-X4 (annual prompt, half day)
3. **Post-launch wave:** PR-X1 (auto-topup), PR-X2 (response-time reward), PR-X3 (firm billing), PR-X5 (investor accounts)

Founder approves each Tier-C PR before merge per CLAUDE.md tier policy.
