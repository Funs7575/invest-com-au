# Continuous-improvement loop — control doc + live log

**What this is:** the per-fire control document for the invest.com.au continuous-improvement loop
(bots/code-review discover → fix clean in-scope items → verify locally → merge to main; hold anything
regulated or risky for the founder). Each fire reads this first, then appends one dated entry.

> The **canonical dials + hard lines** live in the loop prompt the founder pastes each fire. This doc is the
> living log + a convenience summary. If they ever disagree, the pasted prompt wins.

## Dials (summary — prompt is canonical)

- **Auto-merge Tier A + B + C** to main (C after a 30-min quiet window). Mission = fix + build-heavy.
- **Merge gate** = "I'm the gate": local `tsc --noEmit` + relevant/full `vitest` + `eslint .` green **AND** the PR's
  `Lint · Type-check · Test · Build` check-run is `success`. **Ignore** three environmental reds — Vercel
  (billing-blocked), Preview smoke test, Supabase types drift. E2E + Lighthouse are non-blocking.
  `mergeable_state: "unstable"` is the normal mergeable state.
- **Hard lines (never autonomous):** avoid-list escalators (money-movement / %-of-advice-fee / personal advice /
  credit assistance / capital-raise / CDR / AML / custody / product-issuing) → held draft PR labelled
  `needs-founder-decision`; DB migrations (`supabase/migrations/*`) → held; Tier D / Tier E / founder-authored PRs
  → never. When in doubt: document for the founder, don't act.

## Open findings — next fire

_None open. (Fire 2 resolved the DatedStatBadge a11y keyboard trap — PR #1319 — and the postback webhook-delivery P1 — PR #1320.)_

## Founder briefs — held items (need a human decision)

### FB-2026-06-03-01 — Fabricated "social proof" counter (possible misleading-conduct concern)
- **What:** `components/SocialProofCounter.tsx` (≈lines 27-31) renders a synthetic "N investors comparing today"
  figure generated from a sine curve — it is not a real count.
- **Why it's held:** this is not a code bug, it's a product/compliance judgement. On an AFSL-licensed site,
  presenting a fabricated activity figure to consumers risks a misleading-representation / misleading-conduct
  concern (ASIC; ACL s18). Not for an autonomous loop to "fix" either way.
- **Suggested resolution:** founder decides — (a) wire it to a real count, (b) relabel it as illustrative, or
  (c) remove it. Loop will not touch it until decided.

### FB-2026-06-03-03 — Sequential partial refunds under-credit the advisor (financial correctness)
- **What:** `lib/stripe-webhook/handlers/charge-refunded.ts:231-269` (advisor billing flow). On a SECOND (or later)
  partial refund of the same Stripe charge, the positive `deltaCents` is correctly computed but then dropped:
  `recordLedgerEntry` (`lib/advisor-credit-ledger.ts:108-124`) is idempotent on the triple
  `(kind, reference_type, reference_id=charge.id)` — finding the first refund's row, it returns
  `idempotent: true` and **does not insert the delta or move the balance**. The handler's own comment (lines
  265-268) wrongly assumes the idempotency path applies the increment.
- **Scenario:** $300 charge → $100 partial refund (credits $100) → later another $100 partial refund
  (cumulative $200). Second delta ($100) is silently dropped → advisor under-credited by $100.
- **Why it's HELD (not auto-fixed):** money-correctness in the Stripe refund→advisor-credit path
  (client-money-adjacent). The fix is **two coordinated changes** that must stay perfectly consistent or they
  *over*-credit: (1) make the ledger `referenceId` per-cumulative-step, e.g. `` `${charge.id}:${refundedAmountCents}` ``;
  (2) change the prior-refunds SUM query (lines 231-235) from `.eq("reference_id", charge.id)` to a prefix match
  (`.like("reference_id", charge.id + ":%")`) so it still sums all steps. Plus an existing-row data consideration
  (old rows keyed on bare `charge.id`). Financial logic + data migration → wants founder eyes.
- **Suggested resolution:** founder confirms the approach; loop can then implement with full tests under Tier C.
  Verified real (read `recordLedgerEntry` — it returns the stale row without inserting). Found by the 2026-06-03
  marketplace code-review pass.

### FB-2026-06-03-04 — Security headers dropped on authenticated `/admin` + `/broker-portal` (P1 security; HELD — proxy/CSP outage-adjacent)
- **What:** `proxy.ts` sets CSP (line ~174), the private-portal `noindex` (line ~197), X-Frame-Options, Permissions-Policy
  and COOP on the `response` object — but for **protected** paths it takes the `if (isProtected)` branch (~214),
  builds a separate `supabaseResponse` via `NextResponse.next(...)`, and returns *that* (~353), copying only the
  preview `X-Robots-Tag`. So **every authenticated `/admin/**` and `/broker-portal/**` response is served with no CSP,
  no X-Frame-Options, no Permissions-Policy, no COOP, and no `noindex`.** `next.config.ts` re-supplies HSTS / nosniff /
  Referrer-Policy as a fallback but **deliberately not** CSP/XFO/Permissions-Policy/COOP (those are "set by proxy.ts
  per request"). Net: the most sensitive surfaces (wallet adjust, content edit, impersonation) lack XSS/clickjacking
  containment, and a leaked authenticated URL could be indexed. Verified against `proxy.ts:214-356`. Found by the
  2026-06-03 edge/auth code-review pass.
- **Why it's HELD (not auto-fixed):** the fix lives in `proxy.ts` (Tier C, middleware) and **CSP on this exact file
  caused a site-wide JS-execution outage days ago** (the branch this work started on, `fix/csp-strict-dynamic-isr-outage`,
  commit `2de65a9`). Newly applying CSP to `/admin` (which currently has none) could break the admin panel's JS the
  same way. Security-sensitive + outage-adjacent = founder review before merge.
- **Recommended fix:** in the `isProtected` branch, copy the security headers already set on `response`
  (CSP, X-Frame-Options, Permissions-Policy, COOP, `X-Robots-Tag: noindex`) onto each returned `supabaseResponse`
  (and the redirect responses), then layer the Supabase cookies — e.g. factor an `applySecurityHeaders(res, pathname)`
  helper and call it on both branches. Add a proxy test asserting CSP + XFO are present on an authenticated `/admin`
  response. **Safe-split option:** apply XFO + Permissions-Policy + COOP + `noindex` now (clickjacking/indexing, no JS
  risk) and gate the CSP-on-admin part behind an admin-panel smoke test, since CSP is the only piece that can break
  admin JS.
- **Suggested resolution:** founder confirms approach + commits to an admin-panel smoke test post-merge; loop then
  implements under Tier C with tests.

## Live log (most recent first)

### fire 2026-06-03 (fire 3, continuation) — STATUS: PROGRESS · "continue" · string-class sweep + 2 P1s from retried review
- **String-vs-number sweep (the #1313/#1316 bug class):** **clean** — no new instances. The only `switch` over an
  id is the sitemap (already fixed, #1316) and the quiz (`switch(id)` over a typed string-union `QuestionId`, not
  numeric). The `z.number()` API schemas are all `app/api/admin/*` (admin-UI inputs send real numbers, not the
  external-string case). Good negative result: #1313/#1316 were isolated, not systemic.
- **#1320 merged:** Tier C window elapsed (64 min, no STOP) + core green → broker webhook delivery fix is live.
- **Retried the 2 code-review slices that died on the cert error** (edge/auth/cron + lib pure-logic); both completed
  this time and each found a real P1:
  - **F1 → fixed (#1323, Tier B):** `applySupplyThresholds` per-country override was dead — `PER_COUNTRY_THRESHOLDS`
    keyed `"NZ"` but callers pass the lowercase `IntentCountryCode` `"nz"`, so single-expert NZ strips were wrongly
    hidden. Re-keyed lowercase + case-insensitive lookup; test was masking it with uppercase. +case-insensitivity test.
  - **F2 → HELD (FB-2026-06-03-04 above):** proxy.ts drops CSP/XFO/noindex on authenticated admin/broker-portal
    responses. Held because proxy/CSP just caused a production outage.
- **Exit:** F1 PR (#1323) merging on green. F2 + #1317 + FB-01/03/04 await founder.

### fire 2026-06-03 (fire 2) — STATUS: PROGRESS · founder took control "do bots + ci + testing + anything good"
- **Landed this fire:** #1313 (postback z.number→z.unknown, merged), #1314 (this control doc), #1198
  (duplicate-function gate allowlist — reviewed prior-loop PR), #1316 (sitemap shard string-id fix — Google was
  served EMPTY sitemaps on Netlify; reviewed + merged), #1318 (bot-QA roadmap → FIN_NOTEBOOK). #1319 (DatedStatBadge
  a11y keyboard-trap fix +4 tests, Tier A) merging on green. #1320 (postback `next_retry_at` — broker webhooks were
  NEVER delivered, Tier C) announced, merges after window.
- **Bots:** 3 AI-Journey personas vs the live Netlify mirror — comparison-shopper (found `/api/versus/vote` 500),
  advice-seeker (clean), quiz-taker (clean, but the get-matched funnel can't complete in-sandbox — TLS-MITM proxy
  drops the form's async fetches; reinforces roadmap #1 = clean-network runner). All money paths firewall-mocked.
- **Code-review:** 2 of 3 background agents died on a sandbox cert error (infra, not findings). The surviving
  marketplace/webhook agent found 2 P1s: postback webhook-never-delivered (→ #1320, fixed) and the refund
  under-credit (→ FB-2026-06-03-03, HELD).
- **Held:** #1317 versus_votes migration (founder); FB-01 SocialProofCounter; FB-03 refund under-credit. #1180
  (`needs-human-review`, CI red) + #1265 (CI red) left for human.
- **versus/vote tests:** already comprehensive on main (17 cases) — no work needed; the defect was the missing
  table, not the logic.
- **Theme noticed:** two of this session's bugs (#1313 postback, #1316 sitemap) are the SAME class —
  `@netlify/plugin-nextjs` / S2S clients passing values as STRINGS where numeric was assumed. Worth a grep sweep
  for other `switch (numericId)` / `z.number()` on platform/partner-supplied inputs next fire.

### fire 2026-06-03 (fire 1) — STATUS: PROGRESS · 1 PR open (Tier C, awaiting window) · 2 findings logged
- **Pre-flight:** `origin/main` settled at `d044d4cd7` (#1311 `fix(tco)` merged on green, as expected). The chain of
  `cancelled` ci.yml runs on main is concurrency-supersession from rapid PR merges — not failures; last clean run
  was `330b2b1d8`. Bots **not run this fire** — `bots/journey/ai-journey.cjs` + `/opt/pw-browsers` absent on the
  start branch (`fix/csp-strict-dynamic-isr-outage`); discovery fell back to code-review. (Note: Netlify MCP token
  returns 401 + needs a session restart — flagged to founder separately; live-site bots would run degraded anyway.)
- **Discover:** 3 parallel read-only code-review agents (recent-merge regressions / server+security / client+lib).
  Server/security slice clean (heavily audited). 2 real untracked bugs + 1 founder-brief item found.
- **Fix + PR:** `app/api/marketplace/postback/route.ts` — `conversion_value_cents: z.number()` → `z.unknown()`.
  #1271's hardening made the schema reject string-serialised values (the S2S norm), collapsing the whole body to
  `{}` → spurious `400 click_id is required` → **partner conversions silently dropped** (revenue/attribution loss).
  `z.unknown()` lets the existing `typeof … === "number" ? … : 0` guard restore the documented pre-#1271 contract;
  chosen over `z.coerce.number()` to avoid a NaN-insert path. +2 regression tests. Local gate green
  (tsc ✅ / vitest 15/15 ✅ / eslint ✅ / pre-push ✅). **PR #1313** opened ready. **Tier C** (webhook route) →
  announced in chat, merges after 30-min quiet window unless STOP. Merge handed to the window / next fire.
- **Held:** DatedStatBadge a11y (see Open findings — Tier A, next fire). SocialProofCounter (see FB-2026-06-03-01).
- **Exit:** one mergeable chunk produced (#1313). Next fire continues: complete #1313 merge after window, then take
  the DatedStatBadge a11y fix.
