# Bug-Hunt Founder Brief — 2026-06-04

## What this is

This is a founder-facing brief of the adversarially-verified findings from the
2026-06-04 mega-build bug-hunt. Twenty-one candidate findings were each
re-derived from current `main` (read-only), confirmed against the actual code
(file + line evidence), and triaged for severity, merge tier, and whether the
fix is safe to apply autonomously.

- **21 findings total.** 1 confirmed false positive (no defect on main).
- **5 are `autoFixSafe=true`** — contained, testable, no hard-line surface.
  These were auto-fixed in wave-3 PRs (see closing note).
- **16 are HELD** — they touch money-movement, webhook signing/idempotency,
  auth controls, concurrency/race correctness on balances, or require a Supabase
  migration. Per the hard-line rules in `CLAUDE.md` and
  `docs/audits/MERGE_AUTHORIZATION.md`, none of these may be built, merged, or
  enabled without explicit founder (and where noted, ops/legal/payments)
  sign-off.

The P1/P2 money-movement, webhook-idempotency, and race findings are grouped
first below — these are the items that need your decision before any fix lands.

## Summary table

| # | Title | File | Severity | Tier | autoFixSafe | stillReal |
|---|-------|------|----------|------|-------------|-----------|
| 1 | Cash-policy advisor topup refund returns cash but never claws back the granted lead credit | `lib/stripe-webhook/handlers/charge-refunded.ts` | P1 | HELD | false | true |
| 2 | Referral brief-accept charges advisor credit with no balance or pricing-tier check | `lib/team-brief-referrals/payouts.ts` | P1 | C | false | true |
| 3 | Advisor credit-ledger optimistic-lock retry is a no-op; lost cache update undetected | `lib/advisor-credit-ledger.ts` | P1 | C | false | true |
| 4 | Tier-downgrade proration credit uses `Date.now()` in idempotency key → double-credit | `app/api/advisor-auth/tier-upgrade/route.ts` | P1 | C | false | true |
| 5 | Proration ratio not clamped: can exceed 1.0, inflating downgrade credit (annual) | `lib/advisor-tiers.ts` | P1 | C | false | true |
| 6 | Open redirect via login `next` param (password-login path) | `app/auth/login/LoginClient.tsx` | P2 | B | **true** (fixed wave 3) | true |
| 7 | Per-email login lockout non-atomic SELECT→compute→upsert (lost-update race) | `lib/login-lockout.ts` | P2 | C | false | true |
| 8 | Broker conversion webhooks delivered unsigned (no HMAC) | `app/api/cron/retry-webhooks/route.ts` | P2 | HELD | false | true |
| 9 | Marketplace Stripe webhook has no event-level idempotency guard | `app/api/marketplace/webhook/route.ts` | P2 | C | false | true |
| 10 | Auto-recharge fires "top-up succeeded" before PaymentIntent status confirmed | `lib/briefs/auto-recharge.ts` | P2 | HELD | false | true |
| 11 | Advisor free-lead allowance mismatch: server grants 2, portal advertises 3 | `app/api/advisor-enquiry/route.ts` | P2 | C | false | true |
| 12 | Consumer webhook retry clears only latest delivery row's `needs_retry` flag | `lib/consumer-webhook-dispatch.ts` | P2 | C | false | true |
| 13 | Lead-webhooks config non-const mutation | `app/api/internal/lead-webhooks/route.ts` | P3 | HELD | false | **false (false positive)** |
| 14 | Advisor-review POST has a minimum but no maximum length on text fields | `app/api/advisor-review/route.ts` | P3 | B | **true** (fixed wave 3) | true |
| 15 | getMatched top-match selector uses service-role client for public anon tables | `lib/getmatched/top-match.ts` | P3 | B | **true** (fixed wave 3) | true |
| 16 | advisor-auth topup GET hardcodes free-lead allowance 2 instead of `FREE_LEAD_LIMIT` | `app/api/advisor-auth/topup/route.ts` | P3 | A | **true** (fixed wave 3) | true |
| 17 | Calculator-state DB writes are non-atomic read-modify-write (lost update) | `lib/calculator-state.ts` | P3 | B | false | true |
| 18 | Marketplace postback `conversion_value_cents` has no bounds (negative/NaN/overflow) | `app/api/marketplace/postback/route.ts` | P3 | B | **true** (fixed wave 3) | true |
| 19 | Resend webhook uses `email_id` (a UUID) as email-address fallback → suppression no-ops | `app/api/webhooks/resend/route.ts` | P3 | C | false | true |
| 20 | Marketplace Stripe webhook falls back to main `STRIPE_WEBHOOK_SECRET` when marketplace secret unset | `app/api/marketplace/webhook/route.ts` | P3 | HELD | false | true |

---

## HELD — needs founder decision

The 16 findings below are not safe for autonomous fixing. Each lists the
defect, repro, impact, recommended fix, and why it is held / its caveats.

### Group A — Money-movement, balance-affecting, and webhook-idempotency (P1/P2): needs sign-off

These are the prominent items. They write to advisor credit balances, broker
wallets, or refund/payment flows, or they govern webhook idempotency/signing.
All require founder (and where noted ops/payments/legal) sign-off.

#### 1. Cash-policy advisor topup refund returns cash but never claws back the granted lead credit — P1, HELD

**File:** `lib/stripe-webhook/handlers/charge-refunded.ts`

**Defect.** In the `charge.refunded` handler, the advisor-billing branch (lines
159-307) treats `metadata.refund_policy === "cash"` identically for both source
types, but the two sources behave differently at top-up time:

- `advisor_billing` (per-lead invoice): the original payment never added to
  `professionals.credit_balance_cents`. A cash refund correctly needs no ledger
  movement.
- `advisor_credit_topup`: the original Checkout DID grant spendable credit.
  `checkout-session-completed.ts` (lines 144-193) calls
  `recordLedgerEntry({ kind: "topup", amountCents })`, raising
  `credit_balance_cents` by the full top-up amount.

For a cash refund on a top-up, lines 204-209 log "skipping credit ledger" and
return cash to the card via Stripe, but NEVER record a negative/clawback ledger
entry, so `credit_balance_cents` is left fully intact. The only state change for
a full refund is lines 291-306, which merely flip `advisor_credit_topups.status`
to "refunded" — that column is not consumed by any balance computation
(`computeBalance` sums `advisor_credit_ledger.amount_cents` only; cached balance
is mutated solely through `recordLedgerEntry`). Net result: advisor receives the
cash back AND keeps the equivalent lead credit. There is no compensating
clawback elsewhere: a `chargeback_clawback` LedgerKind exists but is not emitted
on this path, and the admin refund route only creates the Stripe refund + sets
metadata.

**Repro.**
1. Advisor tops up A$200: `POST /api/advisor-auth/topup` → Checkout completes →
   grants `kind:"topup"` ledger row, `credit_balance_cents += 20000`.
2. Ops issues a cash refund: `POST /api/admin/advisor-refund { payment_intent_id,
   refund_policy: "cash", refund_reason }` → Stripe refunds A$200 to card,
   `charge.metadata.refund_policy = "cash"`.
3. Stripe fires `charge.refunded` → handler hits `advisor_credit_topup`,
   `advisorRefundPolicy === "cash"` → logs and skips; `isFullRefund` flips status
   to "refunded" but `credit_balance_cents` stays 20000.
4. Advisor still has A$200 of usable lead credit AND A$200 back on their card.

The existing test `respects refund_policy = 'cash' (no ledger insert)`
(`charge-refunded.test.ts:392`) actually locks in the buggy behaviour.

**Impact.** Direct revenue/credit leakage: every cash refund of an advisor
credit top-up double-pays the advisor — they keep spendable lead credit equal to
the refunded cash. Each occurrence over-grants the full top-up amount (capped
$50–$2,000 per the topup route's bounds). Scope is limited to the admin-initiated
cash-policy path (default policy is "credit", handled correctly), so volume is
low, but each event is a clean balance-affecting error and the audit log even
records `advisor_refund_policy:"cash"` with `advisor_credit_refund_cents:0`,
masking the discrepancy.

**Recommended fix.** Make the cash-policy branch source-type aware. For
`sourceType === "advisor_credit_topup"`, a cash refund must still claw back the
granted credit so the net balance returns to its pre-topup state — record a
negative ledger entry via
`recordLedgerEntry({ kind: "chargeback_clawback" (or a new
"refund_to_cash_clawback" kind), amountCents: -deltaCents, ... })` using the same
partial-refund-safe cumulative delta math already in the credit branch (lines
211-241), guarded by the same idempotency triple. For `advisor_billing`, keep the
current no-op. Add a test asserting topup + cash refund produces a negative
clawback ledger entry, and fix the test at line 392. Decide negative-balance edge
policy (allow negative / cap at current balance) with the founder.

**Why held / caveats.** Money-movement / client-balance-affecting fix. The change
writes a negative entry against `credit_balance_cents` (the balance used to charge
advisors for leads) and interacts with refund policy and a possible new
LedgerKind — squarely within the hard-line money-movement exclusion, and
`charge-refunded` is webhook code (Tier C). It also touches refund-policy
semantics with an over-refund-vs-negative-balance policy decision needing founder
+ ops sign-off. Defect confirmed present on current main.

#### 2. Referral brief-accept charges advisor credit with no balance or pricing-tier check (can go negative; success_only pros wrongly charged) — P1, Tier C

**File:** `lib/team-brief-referrals/payouts.ts`

**Defect.** The referral-accept settlement path charges the accepting
professional's prepaid credit balance with NO sufficient-balance guard and NO
pricing-tier check, diverging from the direct-accept path which has both. Chain:
`app/api/referrals/[id]/accept/route.ts` → `acceptReferral()`
(`lib/team-brief-referrals.ts:203-292`) → `recordReferralPayout()`
(`lib/team-brief-referrals/payouts.ts:60-147`).

In `recordReferralPayout`, the accepting pro is debited at lines 89-101 via
`recordLedgerEntry({ amountCents: -chargeCents, kind: "lead_spend", ... })`. There
is no read-and-compare of `credit_balance_cents` before this charge, and
`recordLedgerEntry` does NOT enforce any floor — it computes
`newBalance = currentBalance + input.amountCents` and writes it even when negative
(contrast `lib/marketplace/wallet.ts:274` which throws "Adjustment would result in
negative balance"). The direct-accept path `acceptBrief()`
(`lib/briefs/credits.ts:148-161`) (a) reads the balance and returns
`reason:"insufficient_credits"` when `tier === "standard" && currentBalance <
cents`, and (b) resolves `getProPricingTier` and skips the accept-time charge for
success_only pros. `recordReferralPayout` does neither. Also,
`acceptReferral()` claims the brief and stamps the referral "accepted" BEFORE
calling `recordReferralPayout`, and swallows payout errors — so the fix must gate
before the claim, not just inside `recordReferralPayout`.

**Repro.**
1. Advisor B is a member of `to_team` with `credit_balance_cents` below the
   brief's accept cost (e.g. balance 100c, accept cost 25 credits = 2500c).
2. A pending `team_brief_referral` exists pointing the brief at B's team.
3. B calls `POST /api/referrals/{id}/accept`.
4. `acceptReferral` claims the brief and `recordReferralPayout` debits 2500c with
   no balance check → `credit_balance_cents` goes to -2400c. The brief is
   accepted; the referrer is also credited 20%.

Tier variant: B is on the success_only tier (should pay $0 at accept). Accept via
referral still charges the full accept cost — double-charging the pro.

**Impact.** Advisors can be driven to a negative prepaid credit balance through
the referral-accept flow, and success_only-tier advisors are incorrectly charged
the accept-time fee they are contractually exempt from. This is real money
(`credit_balance_cents` is prepaid funds loaded via Stripe). Consequences:
advisors consume leads they haven't paid for (un-collectable negative balances),
success_only pros are over-charged (refund liability + trust/compliance
exposure), and the two accept paths apply inconsistent billing rules. The
referrer simultaneously receives a 20% payout funded by a charge that may not be
collectable.

**Recommended fix.** Make the referral-accept path enforce the same pre-charge
gating as `acceptBrief`, BEFORE claiming the brief:
1. Resolve `getProPricingTier(professionalId)`. If success_only, skip the
   accept-time charge while still recording `pricing_tier_at_accept` and paying
   the referrer.
2. For standard tier, read `credit_balance_cents` and reject (throw
   `ReferralError("insufficient_credits")`, surfaced as 402/400) when balance <
   chargeCents — so the brief is NOT claimed and no ledger write happens.
3. Defensively add a negative-balance floor inside `recordLedgerEntry` for spend
   kinds (mirroring `wallet.ts:274`).

Best done as a single shared "can this pro afford N cents" helper used by both
`acceptBrief` and `acceptReferral`. Add tests for insufficient-balance and
success_only referral accepts. Restructure so the gate runs and can abort before
the claim, not inside the swallowed try/catch.

**Why held / caveats.** Balance-affecting / client-money path (advisor prepaid
credit funded by Stripe top-ups), touching billing-rule logic (pricing tiers,
charge collection) plus the referrer payout. Per hard lines, anything
client-money or balance-affecting stays `autoFixSafe=false` and tier C. The fix
also changes `acceptReferral`'s claim-then-charge ordering and ideally adds a
floor to the shared ledger helper — non-trivial and money-movement-sensitive.
Confirmed present on current main; tests cover no insufficient-balance or tier
case, so the gap is unguarded by tests too.

#### 3. Advisor credit-ledger optimistic-lock retry is a no-op; lost cache update goes silently undetected (balance drift) — P1, Tier C

**File:** `lib/advisor-credit-ledger.ts`

**Defect.** In `recordLedgerEntry` (lines 205-232), the cache-write loop that
updates `professionals.credit_balance_cents` is broken in two compounding ways:

1. **The optimistic-lock retry is a literal no-op.** Line 211:
   `.eq("credit_balance_cents", attempt === 0 ? currentBalance : currentBalance)`
   — both ternary branches are identical. On retry (attempt 1) the code
   recomputes the new balance off a fresh read (line 223), but the WHERE
   predicate still matches the original stale `currentBalance`, so it also matches
   0 rows. The "retry once" is structurally incapable of succeeding.
2. **The lost update is never detected, so the retry never fires.** The update
   chain (lines 207-211) has no `.select()` / count / `head:true` and only
   inspects `cacheErr`. A bare `UPDATE ... WHERE` that matches zero rows returns
   `{ error: null, data: null }` — NOT an error. So when the optimistic predicate
   misses, `cacheErr` is falsy → `cacheOk = true` → loop breaks at attempt 0
   believing it succeeded. The `log.error("Cache update lost...")` is unreachable
   in the concurrent-loss case, and the function returns an optimistic
   `balanceAfterCents` that was never persisted.

Net effect: under concurrent ledger writes to the same advisor (Stripe top-up
webhook landing while a lead-spend decrement runs, or the daily expiry cron), one
writer's cache update is silently dropped. The ledger rows remain authoritative
via `computeBalance`, but the cached `credit_balance_cents` — which production
reads use for lead-gating, billing summary, dunning, auto-topup — drifts from the
true sum, with no error surfaced. The existing unit test (lines 192-205) masks
this: its `professionals` update stub returns an error when the predicate doesn't
match, which is NOT how PostgREST behaves (0-row UPDATE = no error).

**Repro.** Concurrent (or rapidly sequential) ledger writes to the same advisor
where the cached balance changes between read and write. Concrete path:
`expireOldCredits` (lines 315-339) loops calling `recordLedgerEntry`; if a Stripe
top-up webhook or a lead_spend decrement lands for the same advisor mid-loop, the
read at line 127 is stale by the time the cache UPDATE runs. The
`.eq("credit_balance_cents", currentBalance)` predicate matches 0 rows; PostgREST
returns no error; `cacheOk` is set true; the lost update is neither retried
(no-op ternary) nor logged. To observe in a test you must use a stub that models
a 0-row optimistic UPDATE as `{error:null}` (real PostgREST behavior).

**Impact.** Cached advisor credit balance silently drifts from the authoritative
ledger sum under concurrency. Because the cache is what production lead-gating,
billing summaries, dunning, and auto-topup read, an advisor can be over- or
under-charged for leads, shown a wrong balance, or have lead delivery wrongly
gated — until a reconciliation job re-derives from the ledger. No error is
logged, so the drift is invisible to operators. P1 (money-adjacent, silent,
concurrency-triggered) rather than P0 because the immutable ledger rows remain
authoritative and recoverable.

**Recommended fix.** Two changes, both required: (1) Make the retry predicate use
the refreshed balance — track a `lockBalance` variable, set it to
`refreshed.credit_balance_cents` after the refetch, and use
`.eq("credit_balance_cents", lockBalance)`. (2) Detect 0-row updates: append
`.select("id")` (or `{ count: 'exact', head: true }`) and treat a 0-row result as
a lock miss that triggers the retry; only set `cacheOk = true` when a row was
actually affected. **Better still**, replace the read-modify-write cache update
with a single atomic SQL RPC
(`UPDATE professionals SET credit_balance_cents = credit_balance_cents + :delta
... WHERE id = :id`) — mirroring the `increment_field` RPC already used in
`app/api/advisor-enquiry/route.ts:325` — eliminating the race entirely. Also fix
the test stub to model a 0-row optimistic UPDATE as `{error:null, data:null}`.

**Why held / caveats.** Balance-affecting money path (`credit_balance_cents`) —
hard line. The robust fix involves an atomic balance-mutation RPC (a Supabase
function / potential migration) and touches webhook-replay / dispute-resolver /
cron callers, all Tier C. Verified present verbatim on current main (HEAD
f1df51aa9): line 211 `attempt === 0 ? currentBalance : currentBalance`, cache
UPDATE has no row-count check. The defect is masked by an inaccurate test stub.
Caveat: real-world impact magnitude depends on per-advisor concurrency volume,
likely low pre-launch; severity reflects silent-corruption-of-money-cache
potential.

#### 4. Tier-downgrade proration credit uses `Date.now()` in the ledger idempotency reference_id, defeating dedup and enabling double-credit — P1, Tier C

**File:** `app/api/advisor-auth/tier-upgrade/route.ts`

**Defect.** On the self-service tier DOWNGRADE path, the proration credit is
written via `recordLedgerEntry(...)` (lines 130-142) with
`referenceId: `pro_${advisor.id}_${Date.now()}`` (line 137) and
`referenceType: "tier_downgrade"`. The credit-ledger's only dedup mechanism is
the unique `(kind, reference_type, reference_id)` triple. Because `Date.now()` is
embedded in `reference_id`, EVERY invocation produces a distinct triple, so the
idempotency check can never match — the key is structurally non-idempotent. The
only thing preventing a duplicate is the application-level `pending_tier` guard
(lines 86-91), which reads `advisor.pending_tier` from a row fetched earlier
(lines 59-63) and only writes `pending_tier` later (lines 144-150) — a
check-then-act (TOCTOU) gap with no DB unique constraint on `pending_tier`. Two
concurrent POSTs for the same advisor (per-advisor rate limit is `max:10` burst)
both read `pending_tier=null`, both pass the 409 guard, and both call
`recordLedgerEntry` with DIFFERENT `Date.now()` reference_ids — producing TWO
positive `tier_proration_credit` rows and double-crediting
`credit_balance_cents`. (The UPGRADE path does not write a ledger credit, so only
downgrade is affected.) Verified on current main (HEAD cfadc9476; blame
8168dcbec2).

**Repro.**
1. Advisor on `pro` tier with active subscription and `pending_tier = null`.
2. Fire two concurrent POSTs to `/api/advisor-auth/tier-upgrade` with
   `{ target_tier: "growth", billing: "monthly" }` (double-click, client retry,
   or load-balanced duplicate).
3. Both requests fetch the advisor row before either writes `pending_tier`, so
   both pass the line-86 guard.
4. Both call `recordLedgerEntry` with reference_ids `pro_42_<t1>` and
   `pro_42_<t2>`. Result: two `tier_proration_credit` rows, advisor credited
   twice for a single downgrade.

**Impact.** Financial: the platform over-credits advisors' portal credit balance
on concurrent or racing self-service downgrades. Credit balance is real spendable
value (used against lead spend), so this is a balance-affecting money-movement
defect. Magnitude per incident is one extra proration credit (capped by tier
price difference and days remaining), but it is unbounded across affected
advisors and silently bypasses the single-credit-per-downgrade invariant. It also
defeats the documented ledger idempotency guarantee.

**Recommended fix.** Make the reference_id deterministic so the ledger unique
index dedupes. Best: key on the subscription billing period, e.g.
`referenceId: `pro_${advisor.id}_downgrade_${stripeSubscriptionId ??
"nosub"}_${cycleEnd.toISOString().slice(0,10)}``. At minimum, drop `Date.now()`
and use a stable per-downgrade key. Additionally close the TOCTOU window: replace
the read-then-write `pending_tier` guard with an atomic conditional UPDATE
(`.update({ pending_tier, ... }).eq("id", advisor.id).is("pending_tier", null)`,
treat zero rows affected as the 409), and/or add a DB unique/partial constraint —
then perform the ledger write only after winning that update.

**Why held / caveats.** Balance-affecting money-movement (writes a credit to
`credit_balance_cents`), an explicit hard line. A correct fix touches the
dedup/idempotency key for a financial ledger and the concurrency guard, and the
most robust remedy involves a Supabase migration (unique/partial constraint on
`pending_tier`) — migrations and money-movement are never-autonomous. Requires
founder + a backfill/reconciliation check for any advisors already
double-credited. Confirmed real on current main (line 137; blame 8168dcbec2);
existing tests mock `recordLedgerEntry` so they do not exercise the reference_id
value or the race.

#### 5. Proration amount not clamped: daysRemaining/cycleDays ratio can exceed 1.0, inflating downgrade credit (esp. annual) — P1, Tier C

**File:** `lib/advisor-tiers.ts`

**Defect.** `prorateUpgradeCents` (lines 104-123) guards only `cycleDays <= 0`
(line 111). It never bounds `daysRemaining` to `[0, cycleDays]`. The proration is
`Math.round((price * daysRemaining) / cycleDays)`, so whenever
`daysRemaining > cycleDays` the multiplier exceeds 1.0 and the prorated figure
exceeds a full plan price; whenever `daysRemaining < 0` it flips sign. The sole
production caller is the downgrade branch of
`app/api/advisor-auth/tier-upgrade/route.ts`, where `cycleDays` is HARDCODED to 30
(line 124) but `daysRemaining` is derived from the Stripe subscription's
`current_period_end`. For an ANNUAL subscription `current_period_end` is ~365 days
out, so daysRemaining ≈ 365 while cycleDays = 30 — a ~12.2× multiplier. The
negative return is converted to `creditCents = -proration` and written to
`advisor_credit_ledger` as a `tier_proration_credit` with `expiresAt: null` — a
never-expiring, real-money credit.

Worked example (elite→pro deferred downgrade, annual, daysRemaining≈365,
cycleDays=30):
```
unusedFromCredit = round(479000 * 365/30) = 5,827,167
proratedToCharge = round(143000 * 365/30) = 1,740,167
proration        = 1,740,167 - 5,827,167 = -4,087,000  →  creditCents = $40,870
```
The advisor paid at most $4,790 (elite annual) yet is credited ~$40,870 (>8× the
highest annual plan price). Existing unit tests only exercise daysRemaining ≤
cycleDays, so the unclamped path is untested.

**Repro.**
1. Advisor on Elite ANNUAL with `current_period_end` ~11-12 months away.
2. `POST /api/advisor-auth/tier-upgrade` with
   `{ target_tier: "pro", billing: "annual" }` (a downgrade).
3. Route computes daysRemaining≈365 and calls
   `prorateUpgradeCents(elite, pro, ~365, 30, "annual")`.
4. Function returns ≈ -4,087,000; route writes a $40,870 credit ledger row, far
   exceeding the ≤$4,790 the advisor ever paid.

Unit repro: `prorateUpgradeCents("elite","pro",365,30,"annual")` ≈ -4087000;
`prorateUpgradeCents("free","growth",60,30)` returns 9800 (double the monthly
price) — neither is clamped.

**Impact.** Over-crediting of real money owed to advisors. Annual downgraders can
be granted portal credits many multiples of what they paid (~$40,870 vs ~$4,790
paid). Credits are `tier_proration_credit` with `expiresAt:null`, so they persist
and offset future lead fees. The pending-cancel route claws back exactly the
recorded (inflated) amount, so a downgrade-then-cancel nets zero, but any advisor
who lets the downgrade proceed keeps the inflated credit. Monetisation/billing
integrity issue on the advisor revenue stream.

**Recommended fix.** Clamp inside `prorateUpgradeCents`: after the cycleDays
guard, add `const days = Math.min(Math.max(daysRemaining, 0), cycleDays);` and use
`days` in both `Math.round` expressions. This bounds the multiplier to [0,1].
Additionally fix the caller's unit mismatch: do not pass a hardcoded
`cycleDays=30` for annual billing — pass the actual cycle length (365 for annual,
or compute from `current_period_start..current_period_end`). Both changes needed:
the clamp prevents over-credit; the caller fix makes annual proration
economically correct. Add unit tests covering daysRemaining > cycleDays and the
annual downgrade path.

**Why held / caveats.** Balance-affecting / money-movement: sizes
`advisor_credit_ledger` entries (real money owed) and interacts with the Stripe
downgrade/cancel-at-period-end flow and the clawback route. Per hard lines it
stays `autoFixSafe=false` and Tier C. The clamp itself is a small pure change, but
choosing the correct annual semantics (cap-at-one-cycle vs. true period-length
proration) is a billing-policy decision needing founder/billing sign-off.
Confirmed present on current main.

#### 8. Broker conversion webhooks delivered unsigned (no HMAC) — recipient cannot verify authenticity — P2, HELD

**File:** `app/api/cron/retry-webhooks/route.ts`

**Defect.** The cron sends broker conversion webhooks via
`fetch(item.webhook_url, ...)` (lines 59-68) with only three headers
(Content-Type, `X-Webhook-Source: invest.com.au`, `X-Delivery-Attempt`) and the
raw `JSON.stringify(item.payload)` body. There is NO HMAC signature header, no
timestamp, no signed payload. The receiving broker has no cryptographic way to
verify the POST came from invest.com.au or that the body was not tampered with.
**Scope correction:** this is NOT limited to retries — this cron is the SOLE
delivery mechanism for broker conversion webhooks
(`app/api/marketplace/postback/route.ts` only ENQUEUES into
`webhook_delivery_queue`; there is no separate first-attempt sender). So EVERY
broker conversion webhook (first attempt and all retries) is unsigned. The
codebase already implements the correct pattern in `lib/outbound-webhooks/index.ts`
(Stripe-style HMAC-SHA256 `X-Invest-Signature: t=<ts>,v1=<hex_hmac>` over
`<ts>.<body>`), but the broker queue path was never wired to it. **Schema gap:**
`broker_accounts` has `webhook_url` and `postback_api_key` but NO
`webhook_signing_secret` column, and the broker-portal docs page documents only
the inbound contract — so there is currently no secret to sign with and no
documented verification contract.

**Repro.**
1. A broker configures `broker_accounts.webhook_url`.
2. A valid conversion postback arrives at `/api/marketplace/postback`, which
   inserts a `conversion_event` and enqueues a row in `webhook_delivery_queue`.
3. The retry-webhooks cron fires and POSTs the payload with only Content-Type,
   X-Webhook-Source, X-Delivery-Attempt headers.
4. Inspect the outbound request: no signature header; the broker cannot
   authenticate it.
5. An attacker who knows the broker's `webhook_url` can replay/forge identical
   POSTs the broker cannot distinguish from genuine ones.

**Impact.** Brokers cannot verify authenticity or integrity. A third party who
discovers a broker's `webhook_url` can forge conversion events, polluting the
broker's attribution/reporting or triggering downstream automation. Integrity/
authentication gap on an outbound integration the rest of the codebase signs. Not
directly money-moving on our side (these are notifications; our own
conversion_events are recorded independently and idempotently), capping severity
at P2.

**Recommended fix.** Adopt the existing `lib/outbound-webhooks` signing pattern:
(1) Add a `webhook_signing_secret` column to `broker_accounts` via a forward-only,
idempotent migration (generate `whsec_` secret on onboarding / first webhook_url
set; expose once in broker-portal). (2) In `retry-webhooks/route.ts`, look up the
broker's signing_secret, compute
`X-Invest-Signature: t=<unix>,v1=<hmac-sha256(secret, `${t}.${body}`)>` using the
same `signPayload` helper, and sign the exact bytes sent. (3) Document the
signature header + verification snippet on the broker-portal webhooks page.
Consider routing broker conversion webhooks through `lib/outbound-webhooks` for a
single signing implementation. Add a test asserting the signature header is
present and verifies.

**Why held / caveats.** Webhook signing is on the explicit HARD LINES list, so it
must stay non-autonomous. Beyond policy, the fix is not safely agent-testable as a
code-only change: it requires a new migration (`broker_accounts.webhook_signing_secret`)
plus broker-portal UI/docs to surface the secret and define the verification
contract — coordinated schema + UI + external-partner-facing changes. Secret
generation/exposure for live broker partners needs founder review. Genuinely
present on current main and broader than originally stated (all broker conversion
webhooks, not only retries). Tier raised from C to HELD under the webhook-signing
hard line.

#### 9. Marketplace Stripe webhook has no event-level idempotency guard (duplicate audit-log rows + paid_at overwrite on retries) — P2, Tier C

**File:** `app/api/marketplace/webhook/route.ts`

**Defect.** The marketplace Stripe webhook POST handler verifies the Stripe
signature (lines 22-31) but performs NO event-level idempotency check. Contrast
with the main webhook (`app/api/stripe/webhook/route.ts:46-115`), which claims
each event in `stripe_webhook_events` with a processing→done state machine so
retried event.ids are short-circuited. The marketplace route never reads
`event.id` and never consults that table.

**Mitigating fact (verified):** the actual money movement is protected.
`creditWallet()` (`lib/marketplace/wallet.ts:62-74`, plus a unique partial index
on `wallet_transactions.stripe_payment_intent_id`) is idempotent on
`stripe_payment_intent_id`, so a retried event does NOT double-credit the wallet.

The UN-deduplicated side effects that DO fire again on every retry:
1. `admin_audit_log` INSERT — checkout branch (lines 95-106) and auto_topup branch
   (lines 166-176). Each Stripe retry writes another audit row, polluting the
   financial audit trail with phantom duplicate entries.
2. `marketplace_invoices` UPDATE to `status='paid'` (lines 73-91, 144-162). The
   field set is idempotent in value EXCEPT `paid_at`, recomputed as
   `new Date().toISOString()` on each retry — so the recorded payment time drifts
   forward to the last retry rather than the true settlement time.

Why retries are not theoretical: any error inside the handler returns HTTP 500
(line 187), and `creditWallet` throws on transient DB contention — a 500 is
exactly what makes Stripe re-deliver the same event.

**Repro.**
1. Stripe delivers a `checkout.session.completed` (wallet_topup) event; handler
   credits wallet, writes invoice `paid_at=T1`, writes one audit row, returns 200.
2. Alternatively the first delivery hits a transient `creditWallet` lock failure →
   handler returns 500 → Stripe retries.
3. On the retry, `creditWallet` is idempotent so balance is unchanged, BUT a
   SECOND `admin_audit_log` row is inserted and `paid_at` is overwritten to T2.
   Repeat for each of Stripe's automatic retries. Net result: N duplicate audit
   rows and a `paid_at` reflecting the last retry, not the real payment.

**Impact.** Audit-trail integrity and invoice-timestamp accuracy degradation for
broker wallet payments. No customer-facing balance corruption (`creditWallet`
idempotency holds the line), so not a P0/P1 money-loss bug. Impact is on
reconciliation/reporting: duplicate audit entries inflate apparent top-up
activity; `paid_at` drift misstates settlement time. Because it touches a payment
webhook feeding wallet balances, it sits inside the money-movement blast radius.

**Recommended fix.** Add the same event-level idempotency claim used by the main
webhook: immediately after `constructEvent` succeeds, INSERT into
`stripe_webhook_events {event_id, event_type, status:'processing', started_at}`.
On 23505 (duplicate), inspect the existing row: if `done` return
`{received:true, duplicate:true}`; if `processing` and younger than 5 min return
in-flight; if stale, re-take. Mark `done` after successful handling and `error`
in the catch before returning 500. (Reuse/extract the existing logic rather than
duplicating.) Secondary hardening: only set `paid_at` when status is not already
`'paid'`, so even without the event guard the timestamp doesn't drift.

**Why held / caveats.** HARD LINE: Stripe payment webhook whose side effects feed
broker wallet balances and the financial audit log — money-movement / webhook
idempotency territory; must stay `autoFixSafe=false` and Tier C. The fix is
well-understood and low-risk in shape, but changes payment-webhook control flow
and the dedup-table interaction, needing human review and the Tier C
announce-then-merge path, plus verification that the marketplace webhook is
allowed to write to the shared `stripe_webhook_events` table (event.id namespaces
are global within a Stripe account). Kept at P2 because the unique-index
idempotency in `creditWallet` already prevents the worst case (double wallet
credit).

#### 10. Auto-recharge fires "top-up succeeded" inbox notification before the off-session PaymentIntent status is confirmed — P2, HELD

**File:** `lib/briefs/auto-recharge.ts`

**Defect.** In `maybeAutoRecharge`, the success notification is fired purely on a
non-throwing return from `stripe.paymentIntents.create(...)`, never on the actual
PaymentIntent status. Lines 141-158 create an off-session intent
(`off_session: true, confirm: true`) and discard the return value. Lines 166-176
then immediately call `notifyProInbox(pro, "topup_succeeded", ...)`. The inline
comment asserts "a clean return means the charge succeeded" — wrong for
`confirm:true` intents. Stripe only THROWS for hard declines /
authentication-required. It returns normally (no throw) when `paymentIntent.status`
is `processing`, `requires_action`, or `requires_payment_method`. In all those
cases the pro is told "<N> credits topped up" even though no money has settled.
The code never inspects `pi.status`.

**Separately and more seriously (caveat, not the primary fix):** the success
comment also claims the webhook will grant credits asynchronously via
`checkout.session.completed`, but this path creates a raw PaymentIntent, not a
Checkout Session — `checkout.session.completed` never fires for it, and the
registered `payment_intent.succeeded` handler returns early unless
`intent.metadata.kind === "marketplace_payment"`, which the auto-recharge intent
(`metadata.type === "advisor_credit_topup"`, no `kind`) does not set. So even a
genuinely succeeded charge results in no credit grant and the
`advisor_credit_topups` row staying `pending`.

**Repro.** A pro has auto-recharge enabled with a saved card whose issuer
requires 3DS or settles asynchronously. They accept a brief; balance drops below
threshold; `maybeAutoRecharge` runs. `paymentIntents.create({off_session:true,
confirm:true})` returns status `requires_action` or `processing` without
throwing. The catch block is not hit, so a `topup_succeeded` inbox notification
"<N> credits topped up (A$X)" is enqueued. The pro sees success while their
balance is unchanged and the charge has not completed. (Secondary repro: even a
fully successful charge fires only `payment_intent.succeeded`, which no handler
maps to a credit grant — card charged, balance never increased, topup row stuck
`pending`.)

**Impact.** False "top-up succeeded" message for charges that did not settle,
eroding trust and masking a billing failure the pro needs to act on (complete
3DS, update card). Combined with the credit-grant gap, the worst case is money
taken from the saved card with neither credits granted nor an accurate status
surfaced — a money-movement correctness problem with refund/dispute implications.
The failure inbox path (catch block) is never reached for these non-throwing
non-success statuses, so the pro gets no "action needed" prompt either.

**Recommended fix.** Capture the return of `paymentIntents.create(...)` and gate
the notification on `pi.status`. Only enqueue `topup_succeeded` when
`pi.status === "succeeded"`. For `requires_action`/`requires_payment_method`
enqueue an action-required notification. For `processing`, suppress the success
notification and let the webhook/cron reconcile. Independently — the load-bearing
fix that must accompany the above — either (a) route auto-recharge through a
Checkout Session in payment mode (matching the comment's stated design and the
existing `checkout.session.completed` advisor_credit_topup handler), or (b) add an
`advisor_credit_topup` branch to a `payment_intent.succeeded` handler that calls
`recordLedgerEntry({kind:"topup", referenceType:"advisor_credit_topup",
referenceId: topup_id})` and flips the topup row to `completed`. Until the
credit-grant path exists, do not present any success message.

**Why held / caveats.** HARD LINE: money-movement / client-balance-affecting code
(off-session Stripe charge against a saved card that grants paid credits). Must
stay tier HELD and `autoFixSafe=false`. Verified on current main. The
notification-timing defect is genuine; the more severe latent defect (no webhook
grants credits for the raw PaymentIntent) is reported as part of this finding
because the optimistic notification is its visible symptom and any fix must
address both. No existing test covers the notification timing or credit-grant
path. A reviewer should confirm exact off-session Stripe status behavior for the
configured account before implementing.

#### 11. Advisor free-lead allowance mismatch: server grants 2 (and ignores a configured 0), portal UI advertises 3 — P2, Tier C

**File:** `app/api/advisor-enquiry/route.ts`

**Defect.** Two related billing defects around the advisor free-lead trial.

**(1) UI/server "2 vs 3" mismatch.** The authoritative billing decision is in
`app/api/advisor-enquiry/route.ts:263-283`: `freeTrialCount = 2` (line 263),
`categoryFreeLeads = 2` default (line 269, overridden from
`lead_pricing.free_trial_leads` at line 279), and
`isFree = freeUsed < (categoryFreeLeads || freeTrialCount)` (line 283). So for any
advisor whose category has `free_trial_leads=2`, or who has a custom
`lead_price_cents` set (the `if (!advisor?.lead_price_cents)` guard at line 270
skips the category lookup, leaving categoryFreeLeads=2), or whose advisor_type has
no `lead_pricing` row, exactly 2 leads are free. But the advisor portal UI
hardcodes 3 in multiple places: `DashboardTab.tsx:141,145,148,175`,
`BillingTab.tsx:49`, `app/api/advisor-auth/billing-summary/route.ts:81`. Meanwhile
`LeadsTab.tsx:219-220` and `app/api/advisor-auth/topup/route.ts:158` use the
correct value. Net effect: an advisor in a 2-free category is told "3 free trial
leads remaining / your first 3 leads are on us," then lead #3 is billed against
their credit balance.

**(2) Falsy-zero override (line 283).** `lead_pricing.free_trial_leads` is
`NOT NULL DEFAULT 0` and the admin pricing editor coerces blank input to 0
(`parseInt(...) || 0`). If an admin sets a category's `free_trial_leads` to 0 to
disable the free trial, line 283 evaluates `0 || freeTrialCount` = `0 || 2` = 2,
silently re-enabling 2 free (unbilled) leads. The intended-zero configuration is
unreachable; the `|| freeTrialCount` fallback should only apply when
categoryFreeLeads is null/undefined (no row), not a legitimate 0.

**Repro.**
- (2 vs 3) As an advisor in a category with `free_trial_leads=2` (e.g.
  commercial_lawyer, mining_lawyer) or with a custom `lead_price_cents`, view
  /advisor-portal Dashboard: shows "Your first 3 leads are on us." Submit 3
  distinct enquiries (distinct emails to avoid the 24h dedupe). Leads 1-2 are
  free; lead 3 returns `isFree=false` and is deducted from `credit_balance_cents`
  despite the portal advertising it as free.
- (Falsy-zero) In /admin/pricing set any advisor_type's Free Leads to 0. Submit
  the first enquiry to a brand-new advisor of that type: line 283 computes
  `0 < (0 || 2)` = true, so the lead is free instead of billed.

**Impact.** Advisor-facing billing trust/accuracy. (1) Surprise charge: advisors
told 3 leads are free get debited on the 3rd, generating disputes (the dispute UI
even blocks disputing "free" leads). (2) Lost revenue / mis-configuration: a
category intentionally set to 0 free leads still gives away 2 free leads per
advisor — real foregone lead revenue, and the admin control is silently
ineffective. Not a security or client-money issue; bounded to advisor lead-credit
accounting.

**Recommended fix.** Pick one canonical free-trial count and source it from one
place. (a) Fix the falsy-zero at line 283 — use a null-aware fallback:
`const effectiveFree = (categoryFreeLeads ?? freeTrialCount); const isFree =
freeUsed < effectiveFree;` and ensure categoryFreeLeads is initialised to
undefined/null (not 2) so `??` distinguishes "no row" from "configured 0".
(b) Decide the launch default (route says 2; portal copy says 3 — align). (c)
Replace the hardcoded `3` in `DashboardTab.tsx:141,145,148,175`,
`BillingTab.tsx:49`, and `billing-summary/route.ts:81` with the category-driven
value already used by `LeadsTab.tsx:219` and `topup/route.ts:158`. Add a unit
test asserting the route's `isFree` boundary for `free_trial_leads ∈ {0,2,3}` and
a portal test that advertised remaining equals server `effectiveFree`.

**Why held / caveats.** Confirmed present on current main. Held (not autoFixSafe,
tier C) because the change directly determines whether an advisor's prepaid
`credit_balance_cents` is debited (balance-affecting / billing-sensitive), and
because choosing the canonical count (2 vs 3) is a product/pricing decision
needing founder confirmation. The prior "off-by-one (2 vs 3)" framing is accurate
as the symptom but undersold it: the server is internally consistent at 2 — the
real defects are (i) the portal copy/server disagreement and (ii) the separate
falsy-zero override of an intentional 0.

### Group B — Auth, concurrency, and webhook reliability (held, not money-movement)

#### 7. Per-email login lockout has a non-atomic SELECT→compute→upsert (lost-update race), letting attackers exceed the failure budget — P2, Tier C

**File:** `lib/login-lockout.ts`

**Defect.** `recordLoginFailure` (lines 103-163) increments the per-email failure
counter with a read-then-write that is not atomic: SELECT failure_count (line
113), compute `newCount = current.failureCount + 1` (line 116),
`upsert({ failure_count: newCount, ... }, { onConflict: "email" })` (lines
126-135) — writing the ABSOLUTE computed value, not a DB-side `count + 1`. Two
concurrent failed-login requests both read N, both compute N+1, both upsert N+1 —
one increment is lost (lost-update / TOCTOU). With sustained parallelism the
counter rises far slower than the true number of attempts, so the 5/10/20 lockout
thresholds are crossed much later — or, at high concurrency, effectively never.
This is the SAME bug class already fixed for the SIBLING per-IP table (K-11,
`20260427_admin_rate_limit_atomic.sql` replaced `admin_login_attempts`
SELECT→upsert with an atomic `admin_rate_limit_increment` RPC). The per-email
`login_attempts` path never received the equivalent fix. Caller is live:
`app/api/admin/login/route.ts` calls `recordLoginFailure` at lines 189, 200, 243.

**Repro.** Send N concurrent POSTs to `/api/admin/login` with the same
wrong-password email in a tight burst. Because each request does SELECT(count) →
upsert(count+1) without DB-level atomicity, overlapping requests read the same
pre-state and write the same post-value. After ~20 concurrent failed attempts,
`failure_count` will be well below 20 and `locked_until` will not be set even
though the thresholds should have triggered. Sequential attempts increment
correctly, masking the bug in single-threaded tests.

**Impact.** Weakens the per-email brute-force lockout — the second defence tier
intended to catch IP-rotating attackers targeting one account (admin login /
advisor-auth). Under concurrency the failure counter undercounts, delaying or
preventing lockout. Per-IP token-bucket limiting still applies as a backstop, but
the email tier — explicitly designed for the IP-rotation case the IP tier cannot
cover — is the layer being defeated. Security-control weakening on an auth path;
no data corruption or money movement. P2.

**Recommended fix.** Mirror the K-11 fix. Add a forward-only, idempotent
migration creating an atomic SECURITY DEFINER RPC (e.g.
`public.login_lockout_increment(p_email, p_ip_hash, thresholds)`) that does a
single `INSERT ... ON CONFLICT (email) DO UPDATE SET failure_count =
login_attempts.failure_count + 1, last_failure_at = now(), ... RETURNING` the new
count — and compute `locked_until` from the returned count (race-free). GRANT
EXECUTE to service_role only. Then change `recordLoginFailure` to call
`supabase.rpc("login_lockout_increment", ...)` instead of
checkEmailLockout()+compute+upsert, keeping the "already locked → don't increment"
short-circuit and the fail-open catch. Match the rollback/idempotency/header
conventions of `20260427_admin_rate_limit_atomic.sql`.

**Why held / caveats.** HELD: the correct fix requires a new
`supabase/migrations/*` file (forward-only, prod) and modifies an authentication /
brute-force security control — both out of bounds for autonomous change, and Tier
C (auth, lib/supabase/admin usage, new schema migration). Caveats: (1) only
manifests under genuine concurrent requests for the same email; sequential
attempts and existing single-threaded unit tests increment correctly. (2) The
per-IP token bucket remains an independent backstop (why this is P2 not P1), but
it does not cover the IP-rotation scenario. (3) `clearLoginFailures` and the
locked-window short-circuit are unaffected; only the increment write needs to
become atomic.

#### 12. Consumer webhook retry clears only the latest delivery row's needs_retry flag, orphaning sibling failed rows in the same (webhook, event, payload) group — P2, Tier C

**File:** `lib/consumer-webhook-dispatch.ts`

**Defect.** In `retryFailedConsumerWebhooks()` (lines 225-378) the retry worker
groups all `needs_retry=true` rows from the last 24h by
`webhook_id|event_type|JSON.stringify(payload)` (line 278). For each group it
tracks a single `latestDeliveryId` and accumulates `attempts` across every row in
the group. On every code path (max-attempts skip, hook-gone/inactive, no-secret,
normal retry) it only ever runs
`.update({ needs_retry: false }).eq("id", g.latestDeliveryId)` — it NEVER clears
`needs_retry` on the other rows in the group. This is safe only when each group
has exactly one `needs_retry=true` row. But `fireConsumerWebhook` is
fire-and-forget with no dedup, and `broker-snapshot/route.ts` (lines 59-69) fires
`broker.updated` with a payload of only static broker fee/deal fields and NO
timestamp. Broker fees rarely change, so consecutive cron runs produce identical
payloads. If a subscriber endpoint is down across two runs, two separate rows
(A then B) are inserted, both `needs_retry=true`, both in the same group. The
worker sums `attempts = A + B`, marks only B (`latestDeliveryId`) done, leaving A
`needs_retry=true` permanently — re-counted into `g.attempts` on every subsequent
30-min run. (`health_score.updated` includes `captured_at: now` so it varies per
run and is unaffected.)

**Repro.**
1. Register an active consumer webhook subscribed to `broker.updated` with a
   signing_secret, pointing at an endpoint that returns 503.
2. Run the broker-snapshot cron twice so two identical payloads fail — rows A and
   B, both needs_retry=true, same group.
3. Run the retry-consumer-webhooks cron with the endpoint still failing: it groups
   A+B (attempts=2), inserts a new attempt row C, marks only B done. Row A stays
   needs_retry=true indefinitely; subsequent runs keep adding A's count, so the
   group reaches MAX_CONSUMER_DELIVERY_ATTEMPTS (5) after fewer than 5 genuine
   attempts, and orphaned rows are re-scanned every 30 min for 24h.

**Impact.** Reliability/correctness of the consumer webhook retry subsystem, not
money or auth. (a) Premature retry exhaustion — orphaned siblings inflate the
attempt count, so a down subscriber gets fewer than 5 real retries before the
group is force-marked done. (b) Unbounded-within-window accumulation of stale
needs_retry=true rows re-fetched every 30 min for 24h. No incorrect or duplicate
payload is delivered. Low blast radius today because the consumer webhook product
appears pre-launch with few/no live subscribers.

**Recommended fix.** When resolving a group, clear `needs_retry` on ALL rows, not
just `latestDeliveryId`. Preferred: collect every delivery id per group (add
`ids: string[]`, push `d.id` during grouping) and issue
`.update({ needs_retry: false }).in("id", g.ids)` on each disposition path. Add a
regression test seeding two needs_retry=true rows with identical
webhook/event/payload and asserting BOTH originals are marked done after a
successful retry.

**Why held / caveats.** Held: this module is touched by a Tier-C surface
(cron-invoked webhook delivery using lib/supabase/admin service-role). It is not
money-movement, auth-bypass, webhook signature/idempotency, or a migration, so not
a hard-line never-autonomous item — but cron + webhook + service-role places it in
Tier C (announce-intent). The fix is data-state-only and well-covered by an easy
regression test, so straightforward for a human / Tier-C-authorized change.
Confirmed present on current main (unmodified since PR #1244, commit 5d4c306b5).
The prior title "dispatches latest only" is imprecise — distinct payloads ARE
retried as distinct groups; the real defect is the orphaned-sibling needs_retry
flag within a single group when identical payloads recur.

#### 17. Calculator-state DB writes are non-atomic read-modify-write — concurrent saves clobber each other (lost update) — P3, Tier B

**File:** `lib/calculator-state.ts`

**Defect.** The `user_calculator_state.state` JSONB column is updated via a
non-atomic JS-side read-modify-write at multiple sites, contradicting the
documented design. The migration
`20260720_cmp_w1a_user_calculator_state.sql` (lines 20-22) explicitly specifies
"JSONB merge on conflict (state || EXCLUDED.state) — partial updates from one
calculator never clobber another. Race-safe when claim runs in parallel with a
fresh write." But NO code, RPC, trigger, or `ON CONFLICT ... SET state = ... ||
EXCLUDED.state` implements that concat (grep confirms `state || EXCLUDED.state`
appears only in the comment). Instead, all writers do: SELECT the whole `state`
blob → spread-merge a single key in JavaScript → `.upsert({ state: merged },
{ onConflict: "user_id" })`, overwriting the entire column. Sites:
`writeDbState` (read 108, merge 109-116, upsert 117-126),
`claimAnonymousCalculatorState` (read 175, merge 178-190, upsert 192-201),
`app/api/calculator-state/route.ts` POST (113-140),
`app/api/expat-plan/route.ts` POST (153-181, writes a DIFFERENT key into the SAME
row/column). Because read and write are separate statements with no row lock,
two overlapping requests both read version N, each adds its own key, and the later
upsert writes N+1 missing the other's key — a classic lost-update.

**Repro.** A signed-in user has two calculators open (the hook debounces a POST
per calculator at 5s; the expat-plan toggle posts to the shared row). Edit
calculator A and an expat-plan checklist within the same debounce window:
```
T0: request A reads state = {} ; request B reads state = {}
T1: A upserts state = { savings: {...} }
T2: B upserts state = { expat_plan_AU: {...} }  ← overwrites; savings key lost
```
Only the last writer's key survives. Also reproduces during signup:
`claimAnonymousCalculatorState` running concurrently with a fresh `writeDbState`
(the exact scenario the migration comment claims is "race-safe").

**Impact.** Silent loss of cross-calculator / cross-device continuity data
(calculator inputs, expat-plan checklist progress). No money, balance, auth, or
compliance data involved — convenience prefill state, so user-visible impact is
"my saved inputs disappeared." Low frequency (requires overlapping writes inside
the 5s debounce, single user, multiple surfaces), hence P3. Notable secondary
issue: the migration's documented "race-safe" contract diverges from the actual
non-atomic implementation, which can mislead future maintainers.

**Recommended fix.** Make the merge atomic on the DB side. Preferred: add a
SECURITY DEFINER Postgres function (new migration) doing the concat in one
statement: `INSERT INTO user_calculator_state (user_id, state) VALUES ($1, $2)
ON CONFLICT (user_id) DO UPDATE SET state = user_calculator_state.state ||
EXCLUDED.state, updated_at = now();` (jsonb `||` is shallow-merge, exactly the
per-calculator-key semantics needed), and call it via `supabase.rpc(...)` from all
writers — dropping the separate SELECT. This matches what the migration already
documents. If a migration is undesirable, a weaker app-layer fix is optimistic
concurrency (SELECT `state, updated_at`, then `.upsert(...).eq("updated_at",
priorUpdatedAt)` and retry on zero-rows-affected). Add an integration test
asserting two concurrent POSTs preserve both keys.

**Why held / caveats.** Not a hard-line category (no money/auth/advice/credit/
custody; calculator prefill data only), so reportable as Tier B. But marked
`autoFixSafe=false` because the correct fix requires a new
`supabase/migrations/*` file (a Postgres RPC for the atomic concat), an explicit
hard line for autonomous edits, and changes the write semantics of three
route/lib paths including the signup-claim flow. An app-only optimistic-locking
fix is plausible but weaker than the documented intent; either way it warrants
human review. Confirmed present on current main: `state || EXCLUDED.state` exists
only as a comment; grep found no RPC, trigger, or ON CONFLICT concat, and no test
covers the race.

#### 19. Resend webhook uses email_id (a message UUID) as an email-address fallback, so bounce/complaint suppression silently no-ops when to[] is absent — P3, Tier C

**File:** `app/api/webhooks/resend/route.ts`

**Defect.** Line 69: `const email = d.to?.[0] || d.email_id;`. In Resend's
webhook payload, `data.email_id` is the sent-message UUID, NOT an email address;
`data.to` is the recipient-address array. When `data.to` is empty/absent, the
handler falls back to `email_id`, lowercases it, and runs `.eq("email", <uuid>)`
against `email_captures`, `fee_alert_subscriptions`, and `quiz_leads`. A UUID can
never equal a real email value, so all three UPDATEs match zero rows. The event is
still logged as a genuine bounce/complaint with `email` set to the UUID, producing
misleading log entries. Net effect: a recipient whose bounce/complaint event
lacks a populated `to[]` is never suppressed, so the platform may keep emailing an
address that hard-bounced or filed a spam complaint. The existing test (lines
138-147) masks the bug: it passes `email_id: "norecipient@test.com"` (an
email-shaped string) instead of a realistic UUID.

**Repro.** Send a validly-signed Resend `email.bounced` webhook whose data has no
`to` array but has `email_id: "56761188-7520-42d8-8898-ff6fc54ce618"` (the real
shape Resend emits when the recipient list is omitted). The handler computes
`email = "56761188-..."`, logs it as a bounce, and issues
`.update(...).eq("email", "56761188-...")` on three tables — all matching 0 rows.
The bounced address is never suppressed and continues to receive mail. No error
surfaced (returns 200 received:true).

**Impact.** Email-deliverability / sender-reputation correctness defect, not data
corruption: because a UUID cannot collide with any stored email, no wrong rows are
mutated, but the intended suppression silently fails for any bounce/complaint
event lacking a populated `to[]`. Repeated sends to hard-bounced/complaint
addresses degrade Resend sender reputation. Logs are polluted with UUIDs in the
`email` field. Low frequency because Resend normally populates `to[]`, hence P3.

**Recommended fix.** Remove `email_id` from the fallback chain — it is never an
email address. Change line 69 to `const email = d.to?.[0];` and let the existing
`if (email)` guard skip DB writes when no recipient is present (optionally
`log.warn` so it is visible). Also fix the misleading test to use a realistic UUID
`email_id` and assert no spurious suppression keyed on a UUID. Verify against
Resend's documented schema that bounce/complaint events always include `to`;
normalise both array and string forms rather than reintroducing `email_id`.

**Why held / caveats.** This is a Tier C surface (webhooks) per merge policy and
the hard-lines list webhook handlers as sensitive; although this change touches
body field-mapping rather than signature verification or idempotency,
`autoFixSafe=false` and tier C are kept to respect the webhook hard line. The fix
is small and low-risk but should go through the announce-intent Tier C path with a
human glance, and requires also correcting the test that currently encodes the
buggy behaviour. (The prior hint "resend/route.ts" was a partial path; the real
file is `app/api/webhooks/resend/route.ts`.)

#### 20. Marketplace Stripe webhook falls back to the main STRIPE_WEBHOOK_SECRET when the marketplace-specific secret is unset — P3, HELD

**File:** `app/api/marketplace/webhook/route.ts`

**Defect.** Line 26:
`getStripe().webhooks.constructEvent(body, signature,
process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET ||
process.env.STRIPE_WEBHOOK_SECRET!)`. The marketplace webhook verifies Stripe
signatures against the marketplace-specific signing secret, but silently falls
back to the platform's main `STRIPE_WEBHOOK_SECRET` whenever
`STRIPE_MARKETPLACE_WEBHOOK_SECRET` is unset or empty. The two secrets are
documented as DISTINCT secrets for DISTINCT Stripe webhook endpoints
(`.env.local.example` lines 8-9), so the fallback conflates two endpoints' signing
material. Contrast with the sibling subscription handler
(`app/api/stripe/webhook/route.ts:29-33`), which has NO fallback. This handler is
balance-affecting: on `checkout.session.completed` (wallet_topup) and
`payment_intent.succeeded` (auto_topup) it calls `creditWallet(...)` and marks
`marketplace_invoices` rows paid via the service-role admin client. Two failure
modes: (1) Misconfiguration silently weakens the trust boundary — a forgotten
marketplace secret still "passes" against the main secret instead of failing
closed, masking a deployment error on a money-movement path. (2) If both endpoints
share the same backing secret, or the main secret is leaked/rotated
independently, the endpoint separation is defeated. The fallback also interacts
with the secret-rotation cron (`check-secret-rotation/route.ts:35-43`) which
tracks `STRIPE_WEBHOOK_SECRET` but NOT `STRIPE_MARKETPLACE_WEBHOOK_SECRET` — so
the marketplace secret has no rotation monitoring, and the fallback hides that
gap. Confirmed on current main (blame: commit 5772174ac3).

**Repro.** Deploy with `STRIPE_MARKETPLACE_WEBHOOK_SECRET` unset while
`STRIPE_WEBHOOK_SECRET` is set. POST a Stripe `checkout.session.completed` event
with `metadata.type=wallet_topup` signed with the MAIN secret to
`/api/marketplace/webhook`. The `||` falls through to `STRIPE_WEBHOOK_SECRET`,
`constructEvent` succeeds, and `creditWallet` runs — i.e. the marketplace endpoint
accepts events signed by the platform secret, which is not the intended trust
boundary. There is no log warning, so the misconfiguration is invisible in
production.

**Impact.** Weakened signature-verification trust boundary on a money-movement
path (broker wallet credits + invoice settlement). P3 rather than higher because
it is a fail-open-on-misconfiguration / defense-in-depth weakness, not a directly
exploitable forgery — an attacker still needs a valid signature against whichever
secret is in effect, and Stripe signing secrets are not public. But because it
touches webhook signing on a balance-affecting endpoint (a named HARD LINE), it
warrants careful, sign-off-gated handling. Secondary: the marketplace secret is
excluded from rotation monitoring.

**Recommended fix.** Remove the fallback and fail closed, mirroring
`app/api/stripe/webhook/route.ts`. Read
`const secret = process.env.STRIPE_MARKETPLACE_WEBHOOK_SECRET;` and if falsy,
`log.error(...)` and return 500 before calling `constructEvent`. Do NOT silently
borrow `STRIPE_WEBHOOK_SECRET`. Additionally: (a) add
`STRIPE_MARKETPLACE_WEBHOOK_SECRET` to the SECRETS array in
`check-secret-rotation/route.ts` so it is rotation-tracked; (b) add it to
`lib/stripe-env-check.ts` baselineRequired (or a marketplace-conditional list);
(c) extend `__tests__/api/marketplace-webhook.test.ts` to assert a 500 when the
secret is unset. Before changing, confirm with the founder which Stripe
endpoint(s)/secret(s) are configured in production — removing the fallback will
break any environment relying on it.

**Why held / caveats.** HARD LINE: webhook signing on a balance-affecting (broker
wallet credit / invoice settlement) endpoint. Must stay `autoFixSafe=false` / tier
HELD. The fix is small and well-understood, but removing the fallback is a
behavioral change to a money-movement webhook's trust boundary and could break a
production environment depending on the fallback (if the marketplace secret is not
actually set in prod). Requires founder + verification of the live Stripe
webhook-endpoint/secret configuration before merging.

### Group C — Privacy / data exposure (held)

#### 4 (forum). Forum thread-detail page serializes author_id (Supabase auth.uid) to the client, breaking confessions anonymity — P2, Tier B

**File:** `app/community/[category]/[threadId]/page.tsx`

**Defect.** (The prior report's "LIKELY FILE: community/page.tsx" is wrong;
`app/community/page.tsx` only queries `forum_categories`.) The real leak is in
`app/community/[category]/[threadId]/page.tsx`. The server component runs
`forum_threads.select("*")` (line 159) and `forum_posts.select("*")` (line 169),
then spreads the full DB rows into objects via `{ ...threadData, ... }` (line 208)
and `(postsData ?? []).map(post => ({ ...post, ... }))` (line 213). Those objects
retain `author_id`, which RLS migration `20260429_o_iter6_rls_forum.sql`
documents as the auth.users UUID / `auth.uid()`. The objects are passed as props
to the `"use client"` component `ThreadClient`, and React serializes
client-component props into the RSC/HTML payload — so every author's auth UUID
(thread author and all post authors) is shipped to the browser of every visitor,
including anonymous ones, on a publicly indexed page. `ThreadClient` consumes
`author_id` for ownership/mod UI (`isAuthor = userId === post.author_id` line 223;
isModerator lines 402-408), but the full UUID does not need to ship — a per-request
boolean suffices. **Severity elevator:** confessions are stored in `forum_threads`
(thread_type="confessions") and rendered as "Anonymous Investor" with the promise
"Author identity is never revealed publicly" — yet each confession links to this
same thread-detail route, exposing the anonymous confessor's real auth UUID in the
page payload. The confessions list query deliberately omits `author_id`, confirming
the codebase norm.

**Repro.**
1. Open any forum thread, e.g. `/community/shares-etfs/<threadId>` (or a confession
   via `/community/confessions` then click a card).
2. View source / inspect the RSC flight payload or the serialized props for the
   `ThreadClient` component.
3. Observe `author_id` present on the thread and every post object — a UUID
   matching the poster's Supabase auth.users id.
4. For confessions: the card says "Anonymous Investor" but the linked thread page
   still carries the real `author_id`, deanonymising the poster. No login required.

**Impact.** Leaks the stable Supabase auth.users UUID of every thread/post author
to all visitors (incl. anonymous) on indexed pages. Most damaging: it breaks the
explicit anonymity promise of Investment Confessions, deanonymising users who
posted sensitive financial admissions — a privacy/trust harm and arguably a
misleading-representation exposure given the on-page guarantee. Broader: the UUID
is the cross-table join key for user data. **Mitigating factors capping this at
P2:** (a) `forum_threads`/`forum_posts` already grant anon SELECT under RLS, so
`author_id` is independently readable via PostgREST with the public anon key — the
page is not the only exposure path; (b) `auth.uid()` is not a credential — RLS
authorizes by the JWT's uid, not a client-supplied id, so knowing another user's
UUID does not enable impersonation or unauthorized writes. No money-movement,
auth-bypass, or balance impact.

**Recommended fix.** Stop serializing `author_id` to the client. (1) Replace
`select("*")` on both `forum_threads` (line 159) and `forum_posts` (line 169) with
explicit column lists excluding `author_id` (mirror the `[category]/page.tsx`
pattern); keep `author_id` server-side only to build profileMap and compute
ownership. (2) Compute the viewer's identity server-side once
(`await supabase.auth.getUser()`) and attach per-row booleans `is_own` and reuse
`author_profile.is_moderator`, then strip `author_id` before constructing the
objects passed to `ThreadClient`. (3) Update `ThreadClient.tsx` + its
ForumThread/ForumPost interfaces to drop `author_id` and drive isAuthor/isModerator
off the server-provided booleans. Consider tightening the underlying RLS
public-read policies to exclude `author_id` via a view/column grant in a follow-up
(separate migration — out of scope here, held). For confessions, additionally
suppress author_name/author_profile when `thread_type === "confessions"`.

**Why held / caveats.** Held from autonomous auto-fix despite being Tier B /
safely testable in principle. Reasons: (1) The complete fix spans a server
component and a client component with interlocking ownership/moderator logic —
getting it wrong could silently disable Edit/Delete/moderation controls for
legitimate owners/mods, a functional regression not caught by type-check. (2) A
thorough fix touches RLS column-exposure on forum_threads/forum_posts, and
`supabase/migrations/*` is a hard line. (3) The confessions anonymity dimension is
a privacy/compliance-adjacent guarantee warranting founder review. Confirmed
present on current main (commit f1df51aa9); the only correction to the prior report
is the file path — it is NOT `app/community/page.tsx`.

### Group D — Confirmed false positive (no action)

#### 13. Lead-webhooks config non-const mutation — P3, HELD, **stillReal=false**

**File:** `app/api/internal/lead-webhooks/route.ts`

**Defect.** No "config non-const mutation" defect exists in the located file or
its dependencies. `app/api/internal/lead-webhooks/route.ts` (114 lines) is a clean
POST handler: every declaration is `const`. There is no module-level config
object, and nothing is reassigned or mutated. The only `let` usages in the entire
call chain are function-local accumulators (`let query` in
`lib/outbound-webhooks/index.ts:125`; `let responseStatus/responseBody` at
157-158; the `stats` object in `retryFailedOutboundWebhooks` at 237) — all
idiomatic, function-scoped, not shared config. `lib/slack-lead-notify.ts` and
`app/api/submit-lead/route.ts` likewise have only local `let` accumulators. There
is no `Object.assign`, no `.push`/`.splice`/`.sort` on a const config, no property
reassignment on a frozen/shared object anywhere in this surface.

**Repro.** Not reproducible. POSTing with a valid `x-internal-secret` header and a
valid body dispatches HMAC-signed outbound webhooks plus an optional Slack
notification with no observable state-corruption or mutation bug. Concurrent
requests cannot interfere via shared config because none exists.

**Impact.** None. The original finding appears to be a truncated/heuristic false
positive — likely a linter or earlier scan misclassifying a function-local `let`
(e.g. `let query`) as a mutation of non-const configuration.

**Recommended fix.** No fix required. Close as not-a-defect / false positive.

**Why held / caveats.** Set `stillReal=false`: confirmed false positive. Verified
the full call chain. All declarations are const except idiomatic function-local
`let` accumulators; no module-level/shared config is mutated. Marked tier HELD +
`autoFixSafe=false` because there is nothing to fix and the surface (outbound
webhooks, HMAC signing, lead handling, service-role admin client) is
security-sensitive — any change here would need human review, not autonomous
action.

---

## Closing note — the 5 autoFixSafe items were auto-fixed in wave-3 PRs

The five contained, non-hard-line findings were applied autonomously in wave-3
PRs (input-validation tightening, an RLS-respecting client swap, an open-redirect
guard, and a single-source-of-truth constant reference). They touch no
money-movement, webhook-signing, auth-control, or migration surface, and are each
covered by tests:

| # | Title | File | Tier |
|---|-------|------|------|
| 6 | Open redirect via login `next` param (password-login path) | `app/auth/login/LoginClient.tsx` | B |
| 14 | Advisor-review POST has a minimum but no maximum length on text fields | `app/api/advisor-review/route.ts` | B |
| 15 | getMatched top-match selector uses service-role client for public anon tables | `lib/getmatched/top-match.ts` | B |
| 16 | advisor-auth topup GET hardcodes free-lead allowance 2 instead of `FREE_LEAD_LIMIT` | `app/api/advisor-auth/topup/route.ts` | A |
| 18 | Marketplace postback `conversion_value_cents` has no bounds | `app/api/marketplace/postback/route.ts` | B |

All remaining 16 findings above are held for founder decision. The P1/P2
money-movement, webhook-idempotency, and race items in Group A are the priority —
each writes to advisor credit balances, broker wallets, or a payment/refund flow,
or governs webhook idempotency/signing, and none may be merged without explicit
sign-off per `docs/audits/MERGE_AUTHORIZATION.md`.
