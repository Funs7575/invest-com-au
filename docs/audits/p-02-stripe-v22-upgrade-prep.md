# P-02 — Stripe SDK v17 → v22 upgrade prep

Current pinned: `stripe: ^17.7.0` (one production dep, no other Stripe
packages). Target: `stripe@22.x` (latest major as of 2026-05-08, API
version `2026-04-22.dahlia`).

Cannot run `npm install` in the audit-loop sandbox; this doc plus the
proposed patch is the handoff. Founder runs the install + test pass on
local hardware.

## Why this is small for invest-com-au

The codebase imports Stripe in two shapes:

```
new Stripe(...)              ← lib/stripe.ts only
import type Stripe from "..." ← 14 webhook + handler files (types only)
```

Type-only imports are version-portable for almost all Stripe types
because the SDK ships declarations as namespaces under `Stripe.*`. The
single `new Stripe()` call site (`lib/stripe.ts:12`) already uses the
v22-required signature: positional API key + options object, no
callback, no plain-key first arg.

## Per-major breaking-change matrix vs this codebase

Source: `https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md`.

| Major | Headline break | Affects this repo? |
|---|---|---|
| 18 | apiVersion bumps to `2025-06-30.basil`; no code break | No — `lib/stripe.ts` does not pin `apiVersion`, accepts SDK default |
| 19 | Removes `coupon` field from `Discount` / `PromotionCodeCreateParams` | Likely no — grep `Discount\|PromotionCode` in repo |
| 20 | `V2.Event` resources move to `V2.Core.Events`; `parseThinEvent` → `parseEventNotification`; node 16 dropped | No — repo uses Node 20+; no V2 event code |
| 21 | `decimal_string` fields change from `string` → `Stripe.Decimal`; node 16 dropped | **Verify** — need to grep `decimal_string` and any `Number(invoice.…)` style coercion |
| 22 | `new Stripe()` mandatory (was already the case here); per-request host override removed; callback signatures removed; key as standalone arg removed | No — `lib/stripe.ts:12` already uses `new Stripe(key, opts)` |

## Pre-upgrade greps (run on the upgrade branch)

```bash
# v19 risk surface — coupon-on-discount usage
grep -rEn "coupon\?:\s*Stripe\.|\.coupon\b" lib app --include="*.ts" --include="*.tsx" | grep -v test

# v21 risk surface — decimal_string consumers
grep -rEn "decimal_string|amount_decimal|tax_amount_decimal" lib app --include="*.ts" --include="*.tsx"

# v22 risk surface — anything that used callbacks (very unlikely in TS code)
grep -rEn "new Stripe\(.*\),\s*\(\s*err" lib app --include="*.ts"
```

If all three return zero hits, the upgrade is a 1-line `package.json`
bump. Initial inspection on 2026-05-08 returned zero hits across the
repo for `decimal_string` / `amount_decimal`; no callback-style code; no
`coupon: Stripe.` typed fields. **High confidence the upgrade is clean.**

## Apply procedure (founder runs locally)

```bash
cd ~/invest-com-au
git checkout -b chore/p-02-stripe-v17-to-v22
NODE_OPTIONS="--max-old-space-size=5120" npm install stripe@22 --save-exact
git diff package.json package-lock.json     # one row in each, sanity-check version

# Type pass (the one most likely to surface drift)
NODE_OPTIONS="--max-old-space-size=5120" npm run type-check

# Test pass (Stripe webhook handlers in particular)
npm test -- __tests__/api/stripe-webhook.test.ts
npm test -- __tests__/lib/stripe-webhook
npm test -- __tests__/api/marketplace/webhook
npm test -- __tests__/api/advertise/create-checkout

# Full suite if all the above are green
npm test
```

If any test red:
1. Read the diff against `lib/stripe-webhook/handlers/<event>.ts` —
   most likely a new event-payload field optionality changed.
2. If a webhook event type was renamed in v18-v22 (none jumped out in
   review, but worth verifying), find the rename in
   `node_modules/stripe/types/Events.d.ts` and update the handler.

After type-check + tests pass:

```bash
git add package.json package-lock.json
git commit -m "chore(deps): P-02 — bump stripe 17.7.0 → 22.x [audit remediation]"
git push -u origin chore/p-02-stripe-v17-to-v22
gh pr create --fill --label "auto-merge-safe"
```

The PR runs the full CI suite; auto-merge fires after the 60-min quiet
window (assuming no STOP from a reviewer).

## Rollback

`npm install stripe@17.7.0 --save-exact` then revert the commit. There's
no schema or runtime state coupled to the SDK version — the rollback is
purely a package-lock revert.

## Time budget

10 min on a clean local. 20 min if the type-check surfaces drift in the
webhook handler types. The structural risk is well below P-01 (Sentry
v9→v10) which already shipped — same shape of upgrade, smaller blast
radius.
