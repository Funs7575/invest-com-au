# AGENTS.md

This repository is `invest.com.au`, an Australian investment comparison, advisor directory, investment listings, quiz-routing, and broker/advisor lead marketplace.

Use this file when running Codex or any agentic code audit. The founder is non-technical, so final audit reports must be plain English first, then file-level evidence.

## Business-critical context

- Stack: Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres/RLS, Vercel, Stripe, Resend, Sentry, PostHog.
- Main revenue paths: broker/platform referrals, broker/advisor paid leads, professional profiles, investment listings, courses/content, future marketplace payments.
- Quiz logic is commercially critical. It must route users to the right conversion path: broker/platform, advisor, mortgage/property expert, investment listing, calculator, or post/request flow.
- Broker lead allocation must respect the intended model: single-broker allocation unless explicitly changed by the founder. Do not assume multi-broker distribution.
- Australian financial-content risk matters. Flag any copy, UI, quiz result, chatbot response, or email that looks like personal financial advice instead of factual/general information.
- Security matters more than speed. Admin, broker portal, advisor portal, Stripe, Supabase service-role, RLS, and cron routes are launch-critical.

## Start here before auditing

Read these files first:

1. `README.md`
2. `ARCHITECTURE.md`
3. `CLAUDE.md`
4. `CONTRIBUTING.md`
5. `COMPANY.md` if present
6. `.env.local.example`
7. `proxy.ts`
8. `next.config.ts`
9. `.github/workflows/ci.yml`
10. `docs/runbooks/launch-day.md` and `docs/runbooks/launch-rollback.md` if present

## Commands to run

Run these before making claims about build health:

```bash
npm ci
npm run type-check
npm run lint
npm run test:coverage
npm run build
```

Then run the project-specific audit scripts:

```bash
npm run audit:rate-limits
npm run audit:dated-strings
npm run audit:rls-isolation
npm run audit:stripe-idempotency
npm run audit:stale-dated-stats
npm run audit:rls-migrations
npm run audit:drift-types
npm run audit:console-calls
npm run audit:duplicate-functions
```

Run Playwright only after confirming the app can build:

```bash
npx playwright install --with-deps chromium webkit
npm run e2e
```

If a command cannot run because secrets are missing, say exactly which secrets/fixtures are missing and whether the result is still meaningful.

## Audit passes to perform

Do not do one vague review. Split the audit into these passes and produce a report for each.

### 1. Production readiness

Check build, CI, env vars, Vercel config, runtime compatibility, route health, error boundaries, monitoring, rollback, and launch runbooks.

### 2. Security and privacy

Check auth gates, admin allowlist, MFA, Supabase RLS, service-role usage, public API routes, webhooks, cron auth, rate limits, CSP, security headers, data export/deletion flows, email exposure, and logging of PII.

### 3. Payments and monetisation

Check Stripe checkout, webhook signature verification, idempotency, subscription/credit state, refunds, duplicate-event handling, broker credit usage, lead contact unlocks, and revenue attribution.

### 4. Quiz and routing logic

Check the investor quiz, vertical router, outcome resolver, broker/advisor/listing routes, calculator routes, broken links, and single-broker allocation expectations.

### 5. Database and migrations

Check schema drift, RLS coverage, migration idempotency, missing indexes, unsafe public reads/writes, stale types, and admin tables that incorrectly use browser clients.

### 6. Compliance and content risk

Check AFSL/general information disclaimers, adviser/broker language, personal advice triggers, outdated claims, hardcoded dates, broker fee claims, crypto claims, and content that needs source/date review.

### 7. UX and conversion

Check homepage hierarchy, top-right CTA, quiz prominence, four route cards, platform/advisor/listing confusion, mobile UX, form length, lead capture, and trust markers.

### 8. SEO and information architecture

Check scenario hubs, internal links, metadata, canonical URLs, redirects, sitemap, robots, duplicate/thin pages, orphan pages, old route redirects, and crawlable investor-guide paths.

### 9. Test quality

Do not trust the raw test count. Identify which critical flows are genuinely covered versus mocked/superficial. Highlight missing E2E coverage for launch-critical flows.

### 10. AI-generated code quality

Look for duplicated logic, hardcoded lookup tables that should be registries, stale comments, inconsistent route naming, overbroad helpers, dead code, brittle tests, and places where Claude likely patched symptoms instead of simplifying architecture.

## Severity levels

Use this priority system:

- P0: must fix before public launch. Security breach, payments broken, admin exposed, service-role leak, user data exposure, critical route 500s, lead/payment logic financially wrong.
- P1: fix before serious traffic. Broken conversion paths, incorrect broker/advisor routing, compliance-sensitive copy, missing webhook idempotency, serious CI false confidence.
- P2: fix soon after launch. UX friction, SEO gaps, low-value tests, monitoring polish, refactor needed.
- P3: backlog. Nice-to-have improvements.

## Required report format

For every issue, include:

- Severity
- Plain-English explanation
- Why it matters commercially or legally
- Exact file path(s)
- Evidence from code/tests/output
- Recommended fix
- Whether Codex can safely patch it or whether a human/founder decision is needed

End with:

1. Launch verdict: Red / Amber / Green
2. Top 10 fixes in order
3. Commands run and outputs
4. What could not be verified
5. Suggested next Codex tasks

## Do not do these things

- Do not make production-impacting changes without a separate PR.
- Do not weaken RLS, auth, CSP, webhook checks, or rate limits to make tests pass.
- Do not add fake tests that only check mocks.
- Do not remove compliance disclaimers.
- Do not invent broker fee data or regulatory facts.
- Do not claim an audit is complete if commands failed or secrets were missing.
- Do not assume that because CI is green, the product is launch-ready.
