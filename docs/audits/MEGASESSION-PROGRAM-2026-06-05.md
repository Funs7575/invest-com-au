# Mega-session program — 2026-06-05

The 10 highest-value deep/bot sessions, prioritised by real-bug yield, executed
"fix as you go." Each is **shipped** (a tested PR), **verified clean** (traced +
no real bug — recorded, not churned into a no-op PR), or **queued** (needs
product/infra input, with the concrete next action stated).

This run deliberately moved from *shallow* coverage (link-crawl / page-sweep,
which only navigate) to *functional* coverage (stateful, multi-actor, money
flows) after those shallow sweeps over-claimed "healthy."

## Shipped (tested PRs)

| # | Session | Bug found & fixed | PR |
|---|---------|-------------------|----|
| 1a | Credit lifecycle | `recordLedgerEntry` optimistic-lock CAS was a no-op (`currentBalance` on both ternary branches; relied on `cacheErr` that a 0-row PostgREST update never sets) → concurrent lead-spends drift the cached balance **above** truth (overspend past zero). Fixed to detect contention by returned-row count, refetch, recompute, retry. Contention regression test (fails on old code). | #1421 |
| 1b | Firm/team seats | Seat cap enforced only at invite-**send**; the join path (`advisor-apply` + invite_token) attached members with no re-check → firms exceed `max_seats` (entitlement leak). Added join-time cap re-check + tests. | #1421 |

## Verified clean (traced; no real bug)

| # | Session | What was checked | Verdict |
|---|---------|------------------|---------|
| 2 | Lead charge (`advisor-enquiry`) | insufficient-funds gating, first-2-free, ledger idempotency | Correct — charges only on `balance >= price`; insufficient → pending-billing record, lead still delivered, no silent negative. |
| 2 | Brief acceptance (`lib/briefs/credits.ts`) | single-winner race, charge-only-winner, rollback | Correct — atomic `UPDATE … WHERE accepted_by IS NULL … .select()` then checks returned row (the exact CAS pattern the ledger was missing); rolls back claim on ledger failure. |
| 3 | Expert-team invite accept (`lib/expert-teams.ts`) | token replay, expiry, single-use | Identity-bound (id or email match), expiry handled, membership upsert idempotent. Minor non-atomic status transition (double-accept) but effectively idempotent. |
| 7 | Cron auth | all 40 cron routes + `dispatch/[group]` | All call `requireCronAuth` — no unauthenticated cron. |

## Queued — concrete next action (needs product/infra input or its own PR)

| # | Session | Next action | Blocker |
|---|---------|-------------|---------|
| 3b | Stripe webhook handlers | Verify idempotency on `stripe_webhook_events`; the `booking_payments` table is a **phantom** (migration `20260520_dd03` never applied) → `checkout-session-completed` booking path errors. | Apply dd03 (founder-gated prod migration) |
| 4 | Referral payouts | Trace `cron/referral-payouts` → `recordLedgerEntry` for credit-once; the `referrals` table is **phantom** (no migration). | Confirm `referrals` is intended vs `referral_*` tables (product) |
| 5 | Schema-drift remediation | Create/repoint the high-impact phantom tables: **`weights`** (wealth-stack "Revenue #1" POST 500s today) and **`broker_campaigns`** (revenue dash). | Data-model decision: create+seed `weights` vs repoint to `quiz_weights`; `broker_campaigns` vs `campaigns` (founder) — see SCHEMA-DRIFT doc |
| 6 | Exposure sweep inc. 2 | Fix `shortlist`/`compare` client-component broker-field leaks (A2/A3) + public RSC; ship the baseline-ratchet `check-broker-field-exposure.mjs` CI gate. | None — own PR; queued behind #1413 |
| 8 | Zod input-validation sweep | Backfill Zod on the `// eslint-disable invest/no-unvalidated-req-json` bodies (`advisor-apply`, `versus/vote`, others). | None — own PR |
| 9 | RLS-isolation integration audit | Integration tests asserting cross-user denial on user-data tables + the new admin/quiz routes added this arc. | None — own PR |
| 10 | a11y + SEO/JSON-LD | Run `bots/checks/a11y.ts` across key routes once a fresh build is deployed (live mirror is stale — see SITE-AUDIT doc). | Vercel/deploy (next month) |

## Cross-cutting blocker (operational)
The blocked **Vercel account** is the dominant risk: it freezes CI deploys, the
**cron fleet** (dark ~13 days — `CRON-HEALTH` doc) and **production deploys**
(live build behind `main` — `SITE-AUDIT` doc). Several queued sessions (#10,
re-running live bot sweeps) only become meaningful after it's restored. Per
founder, unblock is next month.

## Method note
No writable non-prod environment exists here (the bot harness points at the prod
Supabase; writing test data to prod is unacceptable), so functional flows are
verified via **integration tests against the real code with a mocked DB** +
code-path tracing, not live e2e. Re-run the live functional bots
(`lead-flows`, `marketplace-flows`, `ai-form`) against a sandbox or the restored
Vercel deploy to close the e2e gap.
