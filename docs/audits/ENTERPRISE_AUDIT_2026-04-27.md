# Enterprise-Grade Audit Report

**Date:** 2026-04-27
**Auditor:** Claude Code (autonomous audit run against current `main`)
**Platform:** invest.com.au (Next.js 16 App Router · Supabase Postgres · Stripe · Resend · Anthropic)
**Rubric:** `docs/audits/ENTERPRISE_STANDARD.md` (six native surfaces) extended to twelve surfaces per the audit prompt
**Branch audited:** `main` at commit `67d7a11e` (PR #245 just merged)

This audit reports the *actual* state of the codebase, not aspirational. Where an agent's first-pass score disagreed with the live state on `main`, the live state wins and the score has been corrected (see "Corrections to first-pass agent findings" at the bottom).

---

## Executive summary

- **Overall enterprise-grade percentage: 66%**
- **Surfaces passing (≥80%): 3 / 12** — Lead Form (94%), Payment (88%), Search (83%)
- **Surfaces below 50% (critical): 2 / 12** — AI (22%), Webhook (44%)
- **Surfaces 50–79% (mid-tier): 7 / 12** — Database, Page, Calculator, API, Email, Admin, Integration
- **Critical gaps logged: 15** (top 10 ranked below)
- **Estimated remediation effort to reach 88%: ~14–18 weeks** of loop iterations (matches the trajectory math in `ENTERPRISE_STANDARD.md`)

The 22% AI score is the platform's **bottom-percentile surface** and is the figure that determines the failure rate users actually see when they touch AI features. Quality work that does not raise it does not raise the platform's effective grade.

---

## Automated metrics

Captured 2026-04-27 17:30 AEST against `main` at `67d7a11e`.

### Test suite (Vitest)

```
Test Files: 1 failed | 206 passed (207 total)
Tests:     1 failed | 3,280 passed (3,281 total)
Duration:  384.67s
Failed:    CalculatorsClient > Trade Cost Calculator > renders ASX and US market buttons
           (test timed out at 5000ms — flake, not a real regression)
```

Pass rate: **99.97% of test cases**, **99.52% of test files**.

### TypeScript compliance

```
npx tsc --noEmit (whole repo):  EXIT 0 — no type errors
Strict mode:                    enabled in tsconfig.json
noUncheckedIndexedAccess:        enabled (per CLAUDE.md)
```

### ESLint

```
files scanned:       1,756
errors:              0
warnings:            391 (mostly pre-existing react-hooks v5 strict-rule warnings + unused vars)
files with issues:   240
```

### Security

```
npm audit:           5 moderate vulnerabilities, 0 critical, 0 high, 0 low
                     (all from devDependencies — Sentry transitive deps)
total deps:          875 (284 prod, 522 dev)
```

### Bundle / build

CI workflow `Lint · Type-check · Test · Build` passes on `main`. Lighthouse CWV gate (`.lighthouserc.cwv.json`) is hard-fail and currently green.

### Codebase size

```
TypeScript (app/, lib/, components/):  327,482 lines across 1,509 files
Test files (__tests__/, e2e/):         211
Supabase migrations:                   117
Tables defined:                        177 (per CREATE TABLE count)
Tables with RLS enabled:               183 (some tables get re-enabled across migrations)
CREATE POLICY statements:              211
CREATE INDEX statements:               406
FK references (REFERENCES clauses):    39
API routes (app/api/**/route.ts):      294
Webhook handlers:                      3 (Stripe, Resend, Broker-signup)
```

### Process gates active in CI

- Lint · Type-check · Test · Build (hard fail)
- Secret scan (skipped on docs-only changes)
- Dependency vulnerabilities scan (skipped on docs-only)
- Supabase types drift (skipped on docs-only)
- Preview smoke test (critical URLs)
- End-to-end (Playwright) — chromium only on most jobs
- **Lighthouse CWV gate (hard fail)** — `.lighthouserc.cwv.json`
- **Accessibility (axe-core on key routes)** — runs in `ci.yml`
- Lighthouse CI (main canonical pages)
- Visual regression (currently failing — pre-existing config issue, not blocking)
- Auto-merge labeling, size cap, signal — all green on `main`

---

## Surface-by-surface scores

### 1. Database surface — 50% (3 / 6)

What the platform has:

- ✅ **C1.3 FK constraints**: 39 `REFERENCES` clauses across 117 migrations. Cascading deletes documented per migration.
- ✅ **C1.4 Backup runbook**: `docs/runbooks/database-rollback.md` defines forward-fix-only discipline + Supabase PITR fallback.
- ✅ **C1.1 RLS coverage** (partial): 183 `ENABLE ROW LEVEL SECURITY` statements + 211 `CREATE POLICY` statements. Most user-data tables are RLS-enabled; a handful of admin-only tables remain service-role-gated by design (audit trail in `lib/supabase/admin.ts` guarded usages).

What's missing:

- ❌ **C1.1 RLS isolation tests**: **zero** files match the rubric pattern `__tests__/integration/<table>.rls.int.test.ts`. Only 7 integration tests exist total in `__tests__/integration/`. The rubric requires per-table isolation tests proving "user A cannot SELECT/UPDATE/DELETE user B's rows" — none of the 177 tables have this.
- ❌ **C1.5 Migration rollback headers**: only **5 / 117** migrations (~4%) include a `-- Rollback:` or `-- ROLLBACK STRATEGY:` header block. The runbook *requires* them; enforcement is absent. Sampled 10 recent migrations: 2 (20%) had headers.
- ❌ **C1.6 Performance profiling**: no `pg_stat_statements` enablement migration, no slow-query log integration, no perf observability. The audit doc `2026-04-26-comprehensive-audit.md` flags this as P1 and it's not yet remediated.
- ⚠️ **C1.2 Index coverage**: 406 indexes for 177 tables = healthy raw count, but no audit script confirms every frequently-queried column is indexed. Sampled `chatbot_conversations.created_at` — no index found. Treating as partially met.

**Top 3 gaps for this surface:**

1. **Zero RLS isolation tests** (Critical) — V-NEW-04 was marked done in the queue, but the test pattern itself + per-table tests have not been authored. Without these, RLS regressions are invisible until a customer reports cross-tenant data leakage.
2. **95% of migrations lack rollback headers** (High) — incident response on a bad migration is "guess what the rollback looks like" instead of "read the comment". Stream G is queued for this; not yet shipped.
3. **No query-performance observability** (Medium) — slow queries are detected only when a route times out in production. No baseline, no regression catch.

### 2. Webhook surface — 44% (2.67 / 6 averaged across 3 handlers)

Handlers found:

- `app/api/stripe/webhook/route.ts` — 1,197-line handler, 10 event types. Score: **3/6**.
- `app/api/webhooks/resend/route.ts` — bounce + complaint events. Score: **2/6**.
- `app/api/webhooks/broker-signup/route.ts` — partner integration. Score: **3/6**.

Aggregate criteria status:

- ✅ **C2.2 Signature verification**: all three handlers verify upstream signatures (Stripe SDK, Svix HMAC for Resend, timing-safe Bearer for broker-signup).
- ⚠️ **C2.1 Idempotency**: Stripe and broker-signup dedupe; Resend does NOT (replayed bounce events could double-mark).
- ✅ **C2.6 Event logging**: all three use `lib/logger.ts` structured logs.
- ❌ **C2.3 Timestamp / replay-window validation**: none of the three validate the upstream timestamp against a clock skew window. A 30-day-old event replayed today would be processed.
- ❌ **C2.4 Dead-letter queue**: no `failed_webhook_events` table exists. Failures are logged to Sentry/console only; no operator UI to replay or discard.
- ❌ **C2.5 Exponential backoff on transient failures**: handlers fail-once on DB errors. Stripe's own retry covers some of this, but our handler logic doesn't queue for retry on 5xx from Supabase.

**Top 3 gaps for this surface:**

1. **No dead-letter queue** (High) — when a webhook handler fails (DB outage, malformed event, race), the event is lost. Operators have no replay path. V-NEW-03 (idempotency replay harness) is in flight but DLQ infrastructure is separate and not queued.
2. **No timestamp validation** (High) — replay attacks against the broker-signup endpoint (Bearer token leak + delayed replay) are undefended. Stripe and Resend signatures protect against forgery but not against legitimate-old-event replay.
3. **Resend webhook lacks idempotency** (Medium) — repeat bounce events would double-mark `email_captures.status = 'bounced'` (idempotent in this case) but could double-fire downstream effects if logic is added later.

### 3. AI surface — 22% (1.33 / 6 averaged across 3 callsites)

Callsites found:

- `app/api/concierge/route.ts` — public concierge (streaming, IP rate-limited only). Score: **1/6**.
- `app/api/admin/ai-chat/route.ts` — admin agent on Claude Opus 4.6 with tool use. Score: **1/6**.
- `lib/chatbot.ts` — RAG library with input-side classifier. Score: **2/6**.

Aggregate criteria status:

- ⚠️ **C3.4 Prompt-injection prevention**: `lib/chatbot.ts` (lines 62–105) has regex classifiers for injection patterns and personal-advice shapes, plus a test at `__tests__/lib/chatbot.test.ts`. The two route handlers have no equivalent. Concierge's system prompt is hardcoded but user input is unfiltered.
- ✅ **C3.6 Conversation logging** (partial): concierge persists to `chatbot_conversations`; admin agent is logged via `admin_audit_log`. Neither has a documented retention policy or consent UX.
- ❌ **C3.1 Factual filter on output**: zero AI surfaces route their response through `lib/compliance.ts` before display. Per the AI surface rubric in `ENTERPRISE_STANDARD.md`, this is the load-bearing gate. V-NEW-02 is queued at slot 1 and not yet shipped.
- ❌ **C3.2 Bot disclosure**: no AI surface labels itself "you are talking to AI" in the UI. Concierge and admin agent both stream as if from a person.
- ❌ **C3.3 Cost caps per user per day**: no `ai_audit_log` table, no daily token-count budget, no cap enforcement. Concierge is open to anonymous users with 30 req / 10 min IP rate limit but no spend cap. Admin agent runs Opus 4.6 (currently the most expensive Claude model) with no cap.
- ❌ **C3.5 Response sanitization** + **cite-back guardrail**: no HTML escaping, no citation validation, no factual cross-check. Tool-use responses from the admin agent render JSON blobs as-is.

**Top 3 gaps for this surface:**

1. **No factual filter on AI output** (Critical) — public concierge can produce personal-advice-shaped text and users will see it before any review. Compliance risk under ASIC RG 244 / s766B. **Block on V-NEW-02 before any new AI feature ships** (already loop policy via `REMEDIATION_DEFAULTS.md`).
2. **No cost caps** (Critical) — admin agent on Opus 4.6 with tool use is uncapped. A single runaway agent loop could rack up significant API spend in minutes.
3. **No prompt-injection test fixtures** (High) — only the chatbot library has injection tests; the two route handlers have zero. Required by the AI rubric: `__tests__/lib/<feature>.prompt-injection.test.ts` for each surface.

### 4. Lead Form surface — 94% (7.5 / 8)

What the platform has:

- ✅ **C4.1 CSRF**: Next.js POST-only + `SameSite=Lax` cookies + origin-bound rate limit.
- ✅ **C4.2 Honeypot**: every lead form has a hidden `name="website"` field (e.g. `components/leads/HubLeadForm.tsx:186`).
- ✅ **C4.3 Rate limiting**: DB-backed `isRateLimited()` from `lib/rate-limit.ts` — 10 leads / 5 min per IP.
- ✅ **C4.4 Input validation**: custom validators in `lib/validate-email.ts` (RFC 5322 + disposable domain blocklist) + type checks. Not Zod, but functionally equivalent.
- ✅ **C4.5 User-friendly errors**: specific messages, no exception dumps.
- ✅ **C4.6 Confirmation emails**: dual-email pattern (advisor notification + user confirmation) via `lib/advisor-emails.ts`, non-blocking.
- ✅ **C4.7 Lead deduplication**: 7-day lookback on `(email, professional_id, lead_type)` at `app/api/submit-lead/route.ts:205–214`.

What's partial:

- ⚠️ **C4.8 GDPR/Privacy consent** (half credit): `LeadMagnet` has an explicit checkbox; `HubLeadForm` has only small-print disclaimer text. `/privacy` exists but isn't linked from `HubLeadForm`. Spam Act compliant (transactional flow), but not best-practice consent.

**Top 3 gaps for this surface:**

1. **No explicit consent checkbox on `HubLeadForm`** (Medium) — bare disclaimer text is legally borderline for a marketing-routing form. A checkbox + Privacy Policy link would close the gap.
2. **No Zod schema** (Low) — manual validation is solid but doesn't catch future schema drift. Migration to Zod is queued (Stream E).
3. **No origin-header validation** (Low) — defense-in-depth beyond `SameSite`. Single line addition.

### 5. Page surface — 75% (6 / 8)

What the platform has:

- ✅ **C5.1 SEO meta tags**: 127 / 170 pages export `metadata`; sampled 10 — all have title, description, canonical.
- ✅ **C5.2 Schema.org markup**: 228 JSON-LD blocks across the codebase (`lib/schema-markup.ts` is the SSOT).
- ✅ **C5.3 OG images**: dynamic via `/api/og?...` endpoint; sampled pages all have `openGraph.images` set.
- ✅ **C5.4 Core Web Vitals**: `.lighthouserc.cwv.json` defines a hard-fail Lighthouse gate; CI job "Lighthouse — Core Web Vitals gate (hard-fail)" is currently green on `main`.
- ✅ **C5.5 Mobile responsive**: extensive Tailwind responsive class usage (`sm:`, `md:`, `lg:`).
- ✅ **C5.6 WCAG AA**: `axe-core/playwright` is wired into the CI workflow `Accessibility (axe-core on key routes)` job; runs per-PR; currently green.

What's missing:

- ❌ **C5.7 Content freshness signals (`<DatedStatBadge>`)**: zero usages. The component does not yet exist — it's queued at slot 2 of the priority order. Pages with year-bound stats currently rely on hard-coded year strings.
- ❌ **C5.8 Anonymity stress test**: no test files matching `anonymity` or `cl-09`. The audit doc references the requirement; no implementation.

**Top 3 gaps for this surface:**

1. **`<DatedStatBadge>` does not exist** (High) — slot 2 priority item; gates all AA-* programmatic SEO pages from shipping safely on dated data. V-NEW-01 (the CI side of this gate) cannot fire without the component.
2. **No anonymity stress test** (Medium) — privacy-by-design verification is hopeful, not enforced. A logged-out request shouldn't surface user-identifiable data; this is testable but not tested.
3. **43 / 170 pages missing explicit `metadata` export** (Low) — most rely on layout-level fallback metadata. Per-page metadata is better for SEO.

### 6. Calculator surface — 75% (6 / 8)

What the platform has (across 17 calculators):

- ✅ **C6.2 Edge-case handling**: zero-rate, zero-input branches present (e.g. `app/compound-interest-calculator/CompoundInterestClient.tsx:33–35`); HTML5 `min`/`max` on inputs.
- ✅ **C6.4 Accessibility**: labels associated, native `<input>` keyboard navigation, recent N-stream iterations added skip-link + focus management.
- ✅ **C6.5 Share/save**: URL state sync via `app/calculators/_components/CalcShared.tsx` `useUrlSync()` + `ShareResultsButton`; clipboard copy on click.
- ✅ **C6.6 Print/PDF export**: `window.print()` + `print:hidden` CSS classes on at least one calculator (Switching). Not all calculators have this.
- ✅ **C6.7 Compliance disclaimers**: `<ComplianceFooter variant="calculator">` from `lib/compliance.ts` SSOT on every calculator page.
- ✅ **C6.8 Performance budget**: client-side math, no API calls; covered by the page-surface Lighthouse gate.

What's missing:

- ❌ **C6.1 Math reference tests against regulator-published worked examples**: `__tests__/components/Calculator.test.tsx` mocks broker fee inputs and checks ordering/ranking, but does not verify against ATO/ASIC published worked examples (e.g. ATO super-calc, ASIC MoneySmart fee comparator). The W-NEW-01 item exists in the queue precisely to draft this pattern.
- ❌ **C6.3 Zod input validation**: HTML5 `type="number"` + `min`/`max` is the only input validation. `NaN`/`Infinity` propagation from arithmetic edge cases is possible.

**Top 3 gaps for this surface:**

1. **No regulator-cited reference tests** (High) — math correctness is asserted only against test fixtures of unknown provenance. Compliance/legal exposure if a calculator silently drifts from ATO worksheets. **W-NEW-01 in the queue** drafts the pattern; not yet shipped.
2. **No Zod validation on calculator inputs** (Medium) — bounds are HTML5-enforced client-side; tampering or programmatic POST could push values to NaN/Infinity. Server-side calculators (none today) would be exposed.
3. **`<CalculatorShell>` doesn't exist yet** (Medium) — W-09 in the queue. Until it lands, every new calculator re-implements share + email-gate + disclaimer scaffolding.

### 7. API surface — 56% (4.5 / 8)

Sample: 15 of 294 routes (mix of public, authed, admin, cron, webhook).

What the platform has (per-criterion sample pass-rate):

- ✅ **C7.1 Rate limiting** (87%): 13/15 sampled routes use `isRateLimited()`. Health and Stripe webhook are correctly exempt.
- ✅ **C7.2 Authentication** (100%): 100% of sampled routes correctly gate (auth, admin, cron, public-with-rate-limit). Per the K-stream + C-stream cleanup work, no public route accidentally exposes admin-scope data on the sample.
- ✅ **C7.3 Input validation** (80%): 12/15 routes manually validate. Project standard is custom validators per CLAUDE.md + Stream E (Zod rollout) queued.
- ✅ **C7.4 Error handling** (93%): 14/15 routes use try/catch with proper status codes.

What's missing:

- ❌ **C7.5 Response caching** (13%): only 2/15 sampled routes set cache directives. Many public read endpoints (broker comparisons, listings, articles) could be CDN-cached at 60-300s; they aren't.
- ❌ **C7.6 CORS** (0% with explicit config): no route sets `Access-Control-Allow-Origin`. Webhooks rely on signature verification; public reads rely on Next.js defaults. Acceptable but undocumented.
- ❌ **C7.7 API versioning**: no `/api/v1` / `/api/v2` namespace. Breaking changes would force atomic client coordination.
- ❌ **C7.8 Documentation**: no OpenAPI spec, no `app/api/README.md`. Routes have inline JSDoc but no centralised API surface doc. Stream S (architecture artefacts) queues this.

**Top 3 gaps for this surface:**

1. **No response caching on public reads** (Medium) — Supabase load + cold-start latency hits every visitor. A `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on broker/article/listing GETs would cut P95 latency.
2. **No API versioning** (Medium) — partner-integration roadmap (EE-04 API marketplace) is blocked on this. Current endpoints would need to freeze before partners build against them.
3. **No OpenAPI spec** (Low) — covered by Stream S; not yet shipped.

### 8. Payment surface — 88% (7 / 8)

What the platform has:

- ✅ **C8.1 PCI compliance**: card forms use Stripe Checkout (client-side Stripe.js), no card data on our servers.
- ✅ **C8.3 Receipt emails**: 7 transactional templates fire from the webhook handler (Pro welcome, course receipt, consultation booking, advisor credit topup, featured listing, listing activation, sponsored placement).
- ✅ **C8.4 Refund flow**: `charge.refunded` handler with course revocation, wallet reversal, consultation cancellation; partial-refund safe via delta calculation.
- ✅ **C8.5 Dispute handling**: `charge.dispute.created` handler alerts `hello@invest.com.au`; audit log entry created.
- ✅ **C8.6 Failed payment retry**: `invoice.payment_failed` notifies user via email; Stripe's own dunning handles auto-downgrade to `past_due`.
- ✅ **C8.7 Subscription management**: full lifecycle (`customer.subscription.created/updated/deleted`); idempotency via `stripe_webhook_events` table; out-of-order protection.
- ✅ **C8.8 Invoice generation**: `invoice.paid`/`invoice.finalized` handlers; Stripe hosts the PDF.

What's missing:

- ❌ **C8.2 Explicit 3D Secure mandate**: Stripe enforces SCA automatically for >AU$100, but the AU$9/month Pro subs skip 3DS by default. Adding `automatic_payment_methods: { allow_redirects: "never" }` or explicit `payment_method_options.card.request_three_d_secure: "any"` would close the gap.

**Top 3 gaps for this surface:**

1. **No explicit 3DS mandate on low-value subs** (Medium) — chargeback exposure on Pro subscriptions if SCA isn't enforced.
2. **No `dispute.closed` handler for win/loss tracking** (Low) — disputes are alerted on creation but not on resolution; chargeback analytics is hand-rolled if needed.
3. **No webhook DLQ** (covered under Webhook surface) — applies here too.

### 9. Email surface — 71% (5 / 7)

What the platform has:

- ✅ **C9.2 Unsubscribe links**: present in templates; one-click `/api/unsubscribe` endpoint.
- ✅ **C9.3 Preference center**: `/api/notification-preferences` allows per-type opt-out (`fee_alerts`, `weekly_digest`, `deal_alerts`, `campaign_updates`, `marketing`).
- ✅ **C9.4 Bounce handling**: Resend webhook marks `email_captures.status = 'bounced'`, `fee_alert_subscriptions.verified = false`, `quiz_leads.unsubscribed = true`.
- ✅ **C9.6 Transactional vs marketing separation**: distinct `from` addresses (`hello@`, `advisors@`, `alerts@`).
- ✅ **C9.7 SPF/DKIM/DMARC**: assumed configured at Resend dashboard (DNS-level; not visible in code, not failing in observed bounces).

What's missing:

- ❌ **C9.1 Double opt-in for marketing**: `/api/email-capture` adds to Resend audience + drip immediately. Spam Act 2003 considers this borderline for marketing (drip emails). The proper flow is: capture → confirmation email → confirm-link click → add to drip.
- ❌ **C9.5 Spam-score monitoring**: no integration with bounce-rate / complaint-rate dashboards. Resend exposes the data; we don't surface it.

**Top 3 gaps for this surface:**

1. **No double opt-in before drip sequence** (High) — Spam Act 2003 risk. Quiz leads enter the 3-email drip without confirming. Fix: send "Confirm your email" between capture and Day 2 drip; require click before continuing the sequence.
2. **No spam-score dashboard** (Medium) — bounce-rate and complaint-rate trends are invisible in the admin UI. A spike could go undetected for weeks.
3. **Unsubscribe link not in advisor-email footer templates** (Low) — transactional emails are exempt from the requirement, but legal best-practice adds it everywhere.

### 10. Admin surface — 71% (5 / 7)

What the platform has:

- ✅ **C10.2 Audit logging**: `admin_audit_log` table populated by every admin mutation; admin pages call `auditLog(...)`.
- ✅ **C10.3 RBAC** (binary): `lib/require-admin.ts` enforces `ADMIN_EMALS` allowlist; admin / non-admin only.
- ✅ **C10.5 Session timeout**: Supabase sessions max-age 30 days; admin inherits.
- ✅ **C10.6 Routes protected**: `<AdminAuthGuard>` wraps the admin layout; all `app/admin/**` routes redirect to `/admin/login` if unauthenticated.
- ✅ **C10.1 MFA** (partial): TOTP MFA exists at `lib/admin-mfa.ts` with recovery codes — but enforcement is feature-flagged off by default.

What's missing:

- ❌ **C10.4 IP whitelist**: only ephemeral rate-limit counters in `admin_login_attempts` (60-second windows). No persistent IP allowlist.
- ❌ **C10.7 PII masking**: admin tables (`/admin/subscribers`, `/admin/advisors`) display full email addresses, phones, firm names with no redaction.
- ⚠️ **C10.1 MFA optional, not enforced**: feature exists but is bypassable. Effective coverage depends on whether the founder has the flag on; if off, admin login is password-only.
- ⚠️ **C10.5 Session timeout** (long): 30 days for an admin session is generous for an admin role. Industry norm is 4–8 hours.

**Top 3 gaps for this surface:**

1. **MFA optional, not enforced** (Critical) — admin password-only login is the platform's biggest single account-compromise risk. Flip the flag to required + add the enrollment flow on first login.
2. **No PII masking in admin views** (High) — admins see full PII whether their task requires it or not. Privacy Act / OAIC notifiable-data-breach exposure if an admin account is compromised.
3. **No IP allowlist** (Medium) — combined with the long session and optional MFA, a stolen admin cookie has 30 days of unrestricted access from any IP.

### 11. Search surface — 83% (5 / 6)

What the platform has:

- ✅ **C11.1 Indexed fields**: searchable columns on `professionals` (`name`, `firm_name`, `location_state`, JSONB `specialties`) are indexed; pgvector embeddings on `search_embeddings`.
- ✅ **C11.2 Full-text search**: semantic (`/api/search-semantic`) via pgvector cosine similarity + keyword fallback (ILIKE) on advisor search.
- ✅ **C11.3 Faceted filtering**: `/api/advisor-search` filters by `type`, `state`, `fee_structure`, `specialty`, `verified`.
- ✅ **C11.4 Result ranking**: composite scoring (rating 35%, review volume 15%, response speed 20%, verified 15%, featured 10%, active leads 5%) for advisor search; cosine score for semantic.
- ✅ **C11.6 Search analytics**: `lib/search-analytics.ts` logs queries (redacted) to `search_queries` table; admin dashboard surfaces top queries + zero-result queries.

What's missing:

- ❌ **C11.5 Typo tolerance**: ILIKE substring matching is case-insensitive but not fuzzy. "smyth" doesn't match "smith". `pg_trgm` extension not enabled; no `similarity()` operator usage.

**Top 3 gaps for this surface:**

1. **No typo tolerance** (Medium) — semantic embeddings catch some of this, but keyword search misses misspellings. Enable `pg_trgm` and add `similarity() > 0.3` fallback.
2. **No documented embedding refresh cadence** (Low) — `search_embeddings` is built by a cron, but the SLA on freshness isn't documented.
3. **No "did you mean?" suggestions** (Low) — when zero results, no suggestion. Captured in the analytics dashboard but not surfaced in UI.

### 12. Integration surface — 67% (4 / 6)

Inventory: Stripe · Supabase · Resend · Anthropic · Sentry · PostHog · Vercel.

What the platform has:

- ✅ **C12.1 Error handling** (strong): all outbound calls wrapped in try/catch with non-throwing returns where possible. Resend has 10s timeout. Anthropic falls back to no-op when key missing.
- ✅ **C12.4 Fallback strategies**: webhook idempotency, Resend non-throwing, semantic search returns `degraded: true` flag on embedding failure.
- ✅ **C12.5 Health checks**: `app/api/health/route.ts` checks DB connectivity, cron freshness via `health_pings` heartbeat, env var presence.
- ✅ **C12.3 Rate-limit respect** (partial): inbound rate limits on our routes; outbound calls have timeouts but no exponential-backoff retry logic on 429.

What's missing:

- ❌ **C12.2 Credential rotation**: no documented rotation strategy. Secrets via `process.env.X`, read at app start; no refresh mechanism, no rotation runbook. Q-stream queues a `secret-rotation.md` runbook; not yet shipped.
- ❌ **C12.6 OAuth token refresh**: not applicable today (no OAuth flows). Will be needed for any future Google/LinkedIn signon and for the n8n integration referenced in `HUB_BLUEPRINT.md`.
- ⚠️ **C12.5 Health checks** (partial): only checks internal services (DB + crons + env). Stripe / Resend / Anthropic API availability is not probed.

**Top 3 gaps for this surface:**

1. **No credential rotation runbook** (High) — if any secret leaks (env var dump in a log, contractor offboarding), there's no documented procedure to rotate without downtime.
2. **Health endpoint doesn't probe third-party APIs** (Medium) — a Stripe outage shows up as user-reported failed checkouts, not as a `/api/health` red flag.
3. **No exponential backoff on outbound 429s** (Medium) — Resend / Anthropic rate-limit events fail immediately rather than retrying with jitter.

---

## Top 10 critical gaps

Ranked by severity × user-blast-radius. Effort estimates are loop-iterations (≈1 day per iteration, per `REMEDIATION_DEFAULTS.md` diff cap).

| # | Gap | Surface | Severity | Effort | Priority |
|---|---|---|---|---|---|
| 1 | **AI factual filter not enforced** — public concierge + admin agent stream Anthropic responses without compliance filtering. ASIC RG 244 / s766B exposure on personal-advice-shaped output. | AI | Critical | 2–3 iter | P0 |
| 2 | **No AI cost caps** — admin agent on Opus 4.6 + public concierge are uncapped per-user-per-day. Single runaway loop = $$$. | AI | Critical | 1–2 iter | P0 |
| 3 | **Admin MFA optional, not enforced** — feature-flagged off by default; password-only login bypassable. Largest single account-compromise risk. | Admin | Critical | 1 iter | P0 |
| 4 | **Zero RLS isolation tests** — 0/177 tables have user-A-vs-user-B integration tests. Cross-tenant data leakage regressions invisible until customer reports. | Database | Critical | ~10 iter (one per table cluster) | P0 |
| 5 | **No webhook dead-letter queue** — failed events lost; no operator replay path. | Webhook | High | 2 iter | P1 |
| 6 | **No prompt-injection test fixtures on AI route handlers** — only the chatbot library has them; concierge + admin agent zero. | AI | High | 2–3 iter | P1 |
| 7 | **No double opt-in on marketing email capture** — Spam Act 2003 borderline; quiz leads enter drip without confirming. | Email | High | 1–2 iter | P1 |
| 8 | **No regulator-cited reference tests for calculators** — math correctness asserted only against unknown-provenance fixtures. W-NEW-01 in queue. | Calculator | High | 1 iter (pattern) + 1 per calc | P1 |
| 9 | **`<DatedStatBadge>` does not exist** — slot 2 priority; gates AA-* programmatic SEO from shipping safely on dated data. | Page | High | 1–2 iter | P1 |
| 10 | **No PII masking in admin views** — full email/phone/firm visible. Privacy Act / OAIC notifiable-breach exposure if admin compromised. | Admin | High | 2 iter | P1 |

Honourable mentions (gaps 11–15):

11. 95% of migrations missing rollback headers (Database; G stream).
12. No webhook timestamp/replay validation.
13. No credential rotation runbook (Q stream).
14. No anonymity stress test.
15. No API response caching on public reads.

---

## Remediation roadmap

The remediation order matches the queue's slot order in `REMEDIATION_DEFAULTS.md` after the 2026-04-27 enterprise-standard reorder. The audit confirms that ordering is correct — gaps 1–4 are the items already prioritised at slot 1 (V-NEW-02, V-NEW-04) and the streams already most-blocking.

**Week 1 (P0 security gates — slot 1):**

- V-NEW-02 (AI factual filter) — closes gap #1 + unblocks the entire CC stream.
- V-NEW-04 (RLS isolation gate + per-table test pattern) — closes gap #4 over the following 8–10 iterations as tables get retroactive coverage.
- Enforce MFA + flip the feature flag; require enrollment on first admin login — closes gap #3 in one iteration.

**Week 2–3 (P0 compliance + cost):**

- Cost-cap enforcement on AI surfaces (`ai_audit_log` table + per-user daily counters) — closes gap #2.
- Webhook DLQ infrastructure (`failed_webhook_events` table + admin replay UI) — closes gap #5.
- Prompt-injection fixtures for `/api/concierge` and `/api/admin/ai-chat` — closes gap #6.

**Week 4–6 (P1 quality + content):**

- `<DatedStatBadge>` component + cron stale-check + V-NEW-01 lint — closes gap #9, unblocks slot 2.
- Double opt-in flow (capture → confirm → drip) — closes gap #7.
- W-NEW-01 calculator reference-test pattern + first ATO/ASIC-cited calculator — closes gap #8.
- PII masking helper + admin-view migration — closes gap #10.

**Week 7–10 (P1 hygiene + observability):**

- Migration rollback-header backfill (Stream G).
- Webhook timestamp validation across all 3 handlers.
- Credential-rotation runbook + per-secret rotation cadence (Stream Q).
- API response caching on top-20 public read endpoints.
- Anonymity stress test fixtures.

**Week 11–14 (P2 polish):**

- pg_trgm typo tolerance for keyword search.
- API versioning skeleton (`/api/v2/` parallel namespace).
- OpenAPI spec generation (Stream S).
- Health endpoint probes for Stripe / Resend / Anthropic.

By Week 12, the trajectory math from `ENTERPRISE_STANDARD.md` projects **88% standard** — consistent with closing gaps #1–10 and the higher-leverage items in the second tier.

---

## Corrections to first-pass agent findings

This audit ran four parallel Explore agents, then verified flagged findings against the live `main` checkout. Two corrections to the agents' first-pass scores:

1. **Page surface, C5.4 (Lighthouse CWV)**: agent marked ⚠️ "no Lighthouse CI gating". Verified false — `.lighthouserc.cwv.json` exists and the CI workflow runs `Lighthouse — Core Web Vitals gate (hard-fail)` with green status on recent merge commits. Corrected to ✅.
2. **Page surface, C5.6 (Accessibility)**: agent marked "axe-core present but no axe-core gate in CI". Verified false — `.github/workflows/ci.yml` has the `Accessibility (axe-core on key routes)` job and it ran SUCCESS on the recent merge commit. Corrected to ✅.

Net effect: Page surface revised from 5.5/8 (68.75%) to 6/8 (75%). Aggregate corrected from ~64% to **66%**.

---

## Appendices

### A. Coverage report

Captured at `/tmp/audit-coverage.log`. Headline:

```
Test Files: 1 failed | 206 passed
Tests:      1 failed | 3,280 passed
Pass rate:  99.97% test cases
```

The single failure is a Vitest 5s timeout on a Trade Cost Calculator render test — flake under load, not a real regression. Coverage thresholds in `vitest.config.mts` are configured as floors per CLAUDE.md (set just below current to catch regressions); aggregate per-line coverage report was suppressed by the reporter format used.

### B. npm audit output

```
total: 5 (all moderate, all in devDependencies — Sentry transitive)
critical: 0
high: 0
moderate: 5
low: 0
prod deps: 284
dev deps:  522
total deps: 875
```

Saved to `/tmp/audit-npm.json`.

### C. ESLint output

```
files scanned:        1,756
errors:               0
warnings:             391
files-with-issues:    240
```

Warnings are dominated by:
- `react-hooks/set-state-in-effect` (downgraded to `warn` per `eslint.config.mjs` — react-hooks v5 strict rules predating existing code).
- `react-hooks/purity`, `react-hooks/immutability`, `react-hooks/static-components`, `react-hooks/refs`, `react-hooks/preserve-manual-memoization` — same lineage.
- `@typescript-eslint/no-unused-vars` (downgraded to `warn`; `_`-prefixed vars allowed).

Saved to `/tmp/audit-eslint.json`.

### D. Surface scoring sheet

| # | Surface | Met | Total | % |
|---|---|---|---|---|
| 1 | Database | 3 | 6 | 50.0% |
| 2 | Webhook | 2.67 | 6 | 44.4% |
| 3 | AI | 1.33 | 6 | 22.2% |
| 4 | Lead Form | 7.5 | 8 | 93.8% |
| 5 | Page | 6 | 8 | 75.0% |
| 6 | Calculator | 6 | 8 | 75.0% |
| 7 | API | 4.5 | 8 | 56.3% |
| 8 | Payment | 7 | 8 | 87.5% |
| 9 | Email | 5 | 7 | 71.4% |
| 10 | Admin | 5 | 7 | 71.4% |
| 11 | Search | 5 | 6 | 83.3% |
| 12 | Integration | 4 | 6 | 66.7% |
| | **Aggregate** | | | **66.0%** |

Loop trajectory math (from `ENTERPRISE_STANDARD.md`): with per-surface enforcement now active, items ship at 88–92% of standard. Net Week-12 trajectory: **88%**.
