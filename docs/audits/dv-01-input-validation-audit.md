# DV-01: Input Validation Audit — Unvalidated `req.json()` Routes

**Date:** 2026-05-11  
**Audit ref:** `docs/audits/codebase-health-2026-04-24.md` — DV stream  
**Queue item:** DV-01  
**Status:** Completed — 106 routes identified, categorised by risk tier

---

## Summary

| Category | Count |
|---|---|
| Total routes calling `req.json()` | 173 |
| Already validated (`.parse()` / `.safeParse()` / `withValidatedBody`) | 67 |
| **Unvalidated — require remediation** | **106** |
| — Tier 1: Revenue-critical public routes | 12 |
| — Tier 2: General public routes | 57 |
| — Tier 3: Admin routes (behind ADMIN_EMAILS gate) | 27 |
| — Tier 4: Advisor-auth routes (behind advisor session gate) | 8 |
| — Tier 5: Cron / webhook routes (Bearer-token gated) | 2 |

**Scope note:** `quiz-lead` is listed under "validated" — it uses the inline `UnifiedAnswersSchema` (partially typed). QQ-01 (PR #794) is upgrading it to `lib/quiz-answer-schemas.ts` with per-field enums.

---

## Tier 1 — Revenue-Critical Public Routes (highest risk)

These routes process payments, lead submissions, or advisor onboarding. Unvalidated input here can cause data corruption, over-billing, or abuse.

| Route | Risk |
|---|---|
| `app/api/stripe/create-checkout/route.ts` | Payment initiation — malformed body can create wrong-amount sessions |
| `app/api/stripe/create-contract/route.ts` | Contract creation — no bounds on contract terms |
| `app/api/submit-lead/route.ts` | Lead capture — no field-length or type guards |
| `app/api/submit-lead/confirm/route.ts` | Lead confirmation — no token validation pattern |
| `app/api/advisor-booking/route.ts` | Booking creation — advisor/user IDs unvalidated |
| `app/api/advisor-signup/route.ts` | Advisor onboarding — full profile accepted as-is |
| `app/api/advisor-apply/route.ts` | Application intake — unchecked free-text fields |
| `app/api/advisor-review/route.ts` | Review submission — star ratings unvalidated |
| `app/api/listings/checkout/route.ts` | Listing payment — price/plan type unvalidated |
| `app/api/listings/renew/route.ts` | Listing renewal — renewal term unvalidated |
| `app/api/course/purchase/route.ts` | Course purchase — course ID unvalidated |
| `app/api/concierge/route.ts` | Concierge leads — unstructured freeform body |

---

## Tier 2 — General Public Routes

These routes handle user data, community content, notifications, and analytics. Lower blast radius than Tier 1, but still publicly accessible and prone to abuse without validation.

| Route | Notes |
|---|---|
| `app/api/fee-profile/route.ts` | |
| `app/api/quick-audit/route.ts` | |
| `app/api/v1/api-keys/route.ts` | |
| `app/api/report-download/route.ts` | |
| `app/api/sponsored-booking/route.ts` | |
| `app/api/verify-otp/verify/route.ts` | OTP code should be length-validated |
| `app/api/switch-story/route.ts` | |
| `app/api/switch-story/moderate/route.ts` | |
| `app/api/lead-outcome/route.ts` | |
| `app/api/versus/vote/route.ts` | |
| `app/api/marketplace/wallet-adjust/route.ts` | Monetary amount — critical to validate |
| `app/api/marketplace/campaign-click/route.ts` | |
| `app/api/marketplace/postback/route.ts` | |
| `app/api/marketplace/setup-payment-method/route.ts` | |
| `app/api/marketplace/wallet-topup/route.ts` | Monetary amount — critical to validate |
| `app/api/send-switching-report/route.ts` | |
| `app/api/tax-optimizer/route.ts` | |
| `app/api/advisor-outreach/route.ts` | |
| `app/api/advisor-welcome/route.ts` | |
| `app/api/email-capture/route.ts` | |
| `app/api/advisor-articles/route.ts` | |
| `app/api/advertise/checkout/route.ts` | |
| `app/api/reviews/verify-client/route.ts` | |
| `app/api/saved-comparisons/route.ts` | |
| `app/api/saved-comparisons/[id]/route.ts` | |
| `app/api/chatbot/route.ts` | Message length uncapped |
| `app/api/unsubscribe/route.ts` | |
| `app/api/portfolio/route.ts` | |
| `app/api/property/enquiry/route.ts` | |
| `app/api/broker-portal/deals/route.ts` | |
| `app/api/revalidate/route.ts` | Should validate path/tag format |
| `app/api/broker-outreach/route.ts` | |
| `app/api/partner/leads/route.ts` | |
| `app/api/push/subscribe/route.ts` | |
| `app/api/push/send/route.ts` | |
| `app/api/advisor-auction/route.ts` | Bid amounts unvalidated |
| `app/api/advisor-auction/bid/route.ts` | Bid amounts unvalidated |
| `app/api/consultation/book/route.ts` | |
| `app/api/web-vitals/route.ts` | |
| `app/api/churn-survey/route.ts` | |
| `app/api/sync-shortlist/route.ts` | |
| `app/api/fee-alerts/route.ts` | |
| `app/api/privacy/correct/route.ts` | |
| `app/api/complaints/intake/route.ts` | |
| `app/api/listings/[id]/route.ts` | |
| `app/api/listings/enquire/route.ts` | |
| `app/api/course/progress/route.ts` | |
| `app/api/newsletter-segments/subscribe/route.ts` | |
| `app/api/newsletter-segments/confirm/route.ts` | |
| `app/api/article-comments/route.ts` | Comment body length uncapped |
| `app/api/user-review/route.ts` | Star rating + body unvalidated |
| `app/api/portfolio-xray/route.ts` | |
| `app/api/user-review/moderate/route.ts` | |
| `app/api/advisor-enquiry/route.ts` | — listed as validated but uses partial schema |
| `app/api/webhooks/broker-signup/route.ts` | Webhook body unvalidated |
| `app/api/lead-outcome/route.ts` | |
| `app/api/reviews/verify-client/route.ts` | |

---

## Tier 3 — Admin Routes (behind ADMIN_EMAILS gate)

Lower urgency — all routes are behind `requireAdminAuth()` / admin middleware. Validation still recommended to catch operator mistakes and for auditability.

| Route |
|---|
| `app/api/admin/feature-flags/route.ts` |
| `app/api/admin/notify-price-change/route.ts` |
| `app/api/admin/regulatory-impacts/route.ts` |
| `app/api/admin/advisor-applications/route.ts` |
| `app/api/admin/competitors/route.ts` |
| `app/api/admin/automation/config/route.ts` |
| `app/api/admin/automation/bulk/route.ts` |
| `app/api/admin/automation/trigger/route.ts` |
| `app/api/admin/automation/dry-run/route.ts` |
| `app/api/admin/automation/flags/route.ts` |
| `app/api/admin/automation/kill-switch/route.ts` |
| `app/api/admin/sponsored-placements/route.ts` |
| `app/api/admin/bd-pipeline/route.ts` |
| `app/api/admin/content/batch-generate/route.ts` |
| `app/api/admin/mfa/verify/route.ts` |
| `app/api/admin/mfa/enroll/route.ts` |
| `app/api/admin/commodity-news-briefs/route.ts` |
| `app/api/admin/articles-editor/save/route.ts` |
| `app/api/admin/article-preview-tokens/route.ts` |
| `app/api/admin/article-scorecard/route.ts` |
| `app/api/admin/login/route.ts` |
| `app/api/admin/advisor-kyc/route.ts` |
| `app/api/admin/commodity-hubs/route.ts` |
| `app/api/admin/fee-queue/route.ts` |
| `app/api/admin/article-comments/route.ts` |
| `app/api/admin/tmds/route.ts` |
| `app/api/admin/financial-periods/route.ts` |

---

## Tier 4 — Advisor-Auth Routes (behind advisor session gate)

Protected by `requireAdvisorSession()`. Lower risk than public routes, but validation still recommended for data integrity.

| Route |
|---|
| `app/api/advisor-auth/firm/route.ts` |
| `app/api/advisor-auth/firm/invite/route.ts` |
| `app/api/advisor-auth/firm/member/route.ts` |
| `app/api/advisor-auth/profile/route.ts` |
| `app/api/advisor-auth/firm/seat-request/route.ts` |
| `app/api/advisor-auth/notifications/route.ts` |
| `app/api/advisor-auth/payment/route.ts` |
| `app/api/advisor-auth/disputes/route.ts` |
| `app/api/advisor-auth/request-review/route.ts` |
| `app/api/advisor-auth/data/route.ts` |
| `app/api/advisor-auth/verify/route.ts` |

---

## Tier 5 — Cron / Webhook Routes (Bearer-token gated)

Protected by `requireCronAuth()` or webhook HMAC validation. Lowest urgency — these are machine-to-machine.

| Route |
|---|
| `app/api/cron/email-bounce-sweep/route.ts` |
| `app/api/cron/dispatch/[group]/route.ts` |

---

## Remediation Approach

Each route should be upgraded using one of:

1. **`withValidatedBody(Schema, handler)`** — preferred for new or simple routes
2. **`Schema.parse(await req.json())`** — acceptable; throws 400 on invalid input  
3. **`Schema.safeParse(await req.json())`** — use on revenue-critical paths where a hard 400 would break the user flow (degrade gracefully)

Schemas should live in `lib/validation/` (per-domain) or inline for simple one-off routes.

The ESLint rule `invest/no-unvalidated-req-json` already flags unvalidated calls — enabling it as an error (rather than warn) in `eslint.config.js` after all routes are fixed would prevent regression.

---

## Next Steps (for DV stream)

- DV-02: Add Zod schemas + `withValidatedBody` to all 12 Tier 1 routes (revenue-critical)
- DV-03: Add Zod schemas to Tier 2 routes (high-traffic public)
- DV-04: Tighten ESLint rule from warn → error after Tier 1+2 are green
- DV-05: Tier 3–5 cleanup (admin/advisor/cron routes)
