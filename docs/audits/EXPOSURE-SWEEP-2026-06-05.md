# Exposure sweep — `select("*")` → browser leaks (2026-06-05)

Defensive audit of the recurring vulnerability class behind #1399, #1400, #1402,
#1403, #1407, #1408, #1410, #1411: code that fetches DB rows with `.select("*")`
(or an over-broad column set) and serialises them to the browser, leaking
**internal columns** to anonymous or unauthorised users.

Two distinct leak surfaces:
1. **Broker commercial fields** — `cpa_value, affiliate_priority,
   monthly_sponsorship_fee, commission_type, commission_value, estimated_epc,
   promoted_placement`. Sanitiser exists: `stripInternalBrokerFields()`
   (`lib/brokers/sanitize.ts`, re-exported from `lib/request-cache.ts`).
2. **Over-broad rows on other tables** — PII / financial / moderation columns
   returned to authed-but-unauthorised parties (own-data over-exposure is lower
   risk; cross-tenant is higher).

This doc is the **work queue** for the sweep. Burn down top-to-bottom; each row
links a fix. Update status as PRs land.

---

## A. Broker commercial-field leaks (`from("brokers").select("*")` in `app/`)

`brokers` is anon-readable by RLS (it's a public catalogue), but RLS can't strip
columns — so any `select("*")` that reaches the client ships the 7 commercial
fields. Fix = `stripInternalBrokerFields()` before the row crosses to the client,
or select an explicit public column list.

| # | Site | Reachable | Crosses to client? | Status |
|---|------|-----------|--------------------|--------|
| A0 | `app/api/quiz/data/route.ts` | anon | yes (JSON) | ✅ fixed in #1411 |
| A1 | `app/api/wealth-stack/route.ts` | anon (public POST) | yes (`stack.components[].broker`) | ✅ **fixed (this PR)** |
| A2 | `app/shortlist/ShortlistClient.tsx` | anon (client component) | yes — browser fetch | ⬜ triage |
| A3 | `app/shortlist/compare/CompareClient.tsx` | anon (client component) | yes — browser fetch | ⬜ triage |
| A4 | `app/versus/[slugs]/page.tsx` | anon (RSC) | if passed to client child | ⬜ triage |
| A5 | `app/term-deposits/page.tsx` | anon (RSC) | if passed to client child | ⬜ triage |
| A6 | `app/property-platforms/page.tsx` | anon (RSC) | if passed to client child | ⬜ triage |
| A7 | `app/costs/[slug]/page.tsx` | anon (RSC) | if passed to client child | ⬜ triage |
| A8 | `app/quick-audit/page.tsx` | anon (RSC) | if passed to client child | ⬜ triage |
| A9 | `app/export/fee-impact/page.tsx` | anon (RSC) | export render | ⬜ triage |
| A10 | `app/export/comparison/page.tsx` | anon (RSC) | export render | ⬜ triage |
| A11 | `app/export/quiz-results/page.tsx` | anon (RSC) | export render | ⬜ triage |
| A12 | `app/admin/deal-of-month/page.tsx` | admin (browser, is_admin) | yes — but admin-only | ⬜ low priority |
| A13 | `app/admin/affiliate-links/page.tsx` | admin (browser) | admin-only | ⬜ low priority |
| A14 | `app/admin/data-health/page.tsx` | admin (browser) | admin-only | ⬜ low priority |
| A15 | `app/admin/analytics/AdminAnalyticsClient.tsx` | admin (browser) | admin-only | ⬜ low priority |

**Triage rule:** a site leaks if the full row reaches a `"use client"` component
or an HTTP response. RSC pages that read `select("*")` but only render specific
fields server-side and never pass the row to a client child do **not** leak
(but selecting explicit columns is still cheaper and regression-proof). Admin
sites (A12–A15) are gated by `is_admin()` so exposure is admin-only — real
defence-in-depth value but lowest priority.

## B. Over-broad rows on other tables (from the route-level IDOR fan-out)

P0 anon-reachable: none outstanding (A0/A1 were the anon broker leaks).

P1 — auth-gated but over-broad. Mostly **own-data** (RLS scopes to `auth.uid()`),
so the risk is internal/deprecated columns rather than cross-user leakage. Fix by
selecting explicit columns. Triage by table sensitivity:

| Route | Table | Note |
|-------|-------|------|
| `app/api/advisor-auth/data` | `professional_leads`, `advisor_billing`, `professional_reviews` | advisor reads own leads/billing — verify no cross-advisor columns |
| `app/api/broker-portal/invoices/[id]/pdf` | `marketplace_invoices` | broker reads own invoices — line-item terms |
| `app/api/org-auth/profile`,`/session` | `organisations` | org reads own row — internal settings |
| `app/api/advisor-auth/firm` | `advisor_firms` | afsl/abn/acn compliance fields |
| `app/api/account/{goals,term-deposits,property-holdings,business}` | user financial tables | own-data; explicit columns for hygiene |
| `app/api/user-profile` | `profiles` | own-data; internal flags |
| `app/api/briefs/inbox`,`/[slug]/preview` | `advisor_auctions` | full brief incl. contact + risk-review notes |
| `app/api/admin/ai-chat` | `email_captures`, `subscriptions` | admin + LLM context — PII into model prompt |
| `app/api/v1/usage` | `api_keys` | key metadata to API caller |

(Full per-route detail in the IDOR fan-out; `consultation_bookings`, course/org
content tables, etc. are lower-risk own-data.)

---

## Prevention — CI gate (planned, increment 2)

Add `scripts/check-broker-field-exposure.mjs` (mirrors `scripts/check-console-calls.mjs`):
flags `from("brokers")` + broad `select("*")` in `app/` not accompanied by
`stripInternalBrokerFields` (or an explicit column list), with a
`// broker-exposure-ok: <reason>` allowlist for server-only reads.

Because ~13 pre-existing A-row sites violate today, the gate ships **baseline-mode**
first (allowlist the known sites; fail only on NEW violations), then the baseline
is burned down as A2–A15 are fixed, then the allowlist is emptied and the gate
hard-fails — same ratchet the repo uses for coverage floors and the
`no-unvalidated-req-json` warn→error promotion.

## Sequencing
1. ✅ A1 wealth-stack (this PR).
2. A2/A3 (shortlist/compare client components) — clearest unambiguous browser leaks → next.
3. A4–A11 public RSC/export — triage + fix.
4. CI gate in baseline-mode (after A2/A3 so the baseline is smaller).
5. B-table explicit-column hygiene.
6. A12–A15 admin defence-in-depth; empty the gate allowlist; promote to hard-fail.
