# Glossary

Domain terms used across the codebase, runbooks, and audit docs. If a
term isn't here, add it — every undefined acronym slows the next reader
by 5 minutes.

## Australian financial services

| Term | Meaning |
|---|---|
| **AFSL** | Australian Financial Services Licence. Required to provide financial product advice, deal in products, or operate a financial services business. ASIC issues. The platform's launch trigger is AFSL coverage being in place (via the dad's existing licence or a corporate authorised representative arrangement). |
| **ACL** | Australian Credit Licence. Required to provide consumer credit advice or arrange credit. Distinct from AFSL — separate authorisations. ACL approval is the actual go-live trigger for some product lines. |
| **AFCA** | Australian Financial Complaints Authority. The external dispute resolution body — required disclosure on every consumer-facing surface. Membership shows in compliance footers. |
| **ASIC** | Australian Securities and Investments Commission. The regulator that issues AFSL/ACL and supervises licensees. |
| **APRA** | Australian Prudential Regulation Authority. Supervises banks, super funds, insurers — different remit from ASIC. |
| **ATO** | Australian Taxation Office. Source of authoritative tax-calculator references; W-NEW-01 mandates regulator-published reference tests on tax calculators. |
| **MoneySmart** | ASIC's consumer education site (moneysmart.gov.au). Source of authoritative super-calculator references and case studies. |
| **General advice / Personal advice** | Two regulatory categories of advice. **General** = not based on the recipient's circumstances (most of what the platform publishes). **Personal** = takes objectives, situation, and needs into account; requires AFSL coverage with personal-advice authorisation. The compliance copy in `lib/compliance.ts` enforces the boundary. |
| **RM** | Responsible Manager. The named, qualified individual on an AFSL who's accountable to ASIC for the licensee's conduct. |
| **PDS** | Product Disclosure Statement. Mandatory disclosure document for financial products. |
| **SoA / RoA** | Statement of Advice / Record of Advice. Mandatory documents when personal advice is given. |
| **TMD** | Target Market Determination. Required for retail financial products under DDO (Design and Distribution Obligations). |
| **DDO** | Design and Distribution Obligations. Issuer/distributor obligations for retail financial products. |

## Privacy / compliance

| Term | Meaning |
|---|---|
| **AU Privacy Act** | Australia's federal privacy legislation. Applies to entities with turnover >$3M (and some others). Governs collection, storage, disclosure of personal information. |
| **APP** | Australian Privacy Principles. The 13 principles in the Privacy Act that govern how personal info is handled. APP 11 = security, APP 12 = access rights, APP 13 = correction. |
| **GDPR** | EU General Data Protection Regulation. Applies if any user data comes from EU residents. The platform builds GDPR endpoints (`/api/account/export-data`, `/api/account/delete`, `/api/privacy/correct`, `/api/privacy/request`) defensively even though most users are AU. |
| **KYC** | Know-Your-Customer. Identity verification for advisors during onboarding. AML/CTF Act requirement for some flows. |
| **AML/CTF** | Anti-Money-Laundering and Counter-Terrorism Financing. AUSTRAC supervises. |
| **PII** | Personally Identifiable Information. Anything that identifies a person — name, email, phone, IP+timestamp combos. The audit's CL-09 anonymity stress test checks no founder PII leaks into rendered pages. |

## Codebase-specific

| Term | Meaning |
|---|---|
| **Audit-loop** | The cloud-scheduled job that picks a queue item every 30 minutes and ships it. See `docs/audits/REMEDIATION_DEFAULTS.md`. |
| **Stream** | A workstream — a letter (A, B, C…) grouping related queue items. E.g. B = RLS migrations, K = security hardening, D = route tests. |
| **Queue** | `docs/audits/REMEDIATION_QUEUE.md`. The to-do list the audit-loop reads. |
| **CI rescue** | An audit-loop iteration whose only job is to fix a previous iteration's broken CI — usually rebases, regenerates types, runs `lint:fix`. Commits prefixed `chore(audit): ... CI-rescue`. |
| **proxy.ts** | The Next.js middleware. Named `proxy.ts` not `middleware.ts` to avoid duplicate. Edge runtime. Stamps request IDs, validates `CRON_SECRET`, gates `/admin/**`. |
| **wrapCronHandler** | Wrapper used by every cron handler. Logs to `cron_run_log`, handles errors, adds Sentry context. |
| **requireCronAuth** | Bearer-token validator for cron routes. Compares against `CRON_SECRET` env. Timing-safe. |
| **RLS** | Row-Level Security. Postgres feature where SELECT/INSERT/UPDATE/DELETE on a table is filtered by policy. The platform enforces RLS on every user-data table; service-role-only is a last resort with explicit exemption. |
| **PITR** | Point-In-Time Recovery. Supabase Pro tier feature; lets you restore the database to any second within the last 7 days. The disaster-recovery drill uses this. |
| **DatedStatBadge** | A `<DatedStatBadge dataAsOf= stalesAt=>` wrapper around any factual claim with a date. Build fails (V-NEW-01 CI gate) if any badge's `stalesAt` is past today. |
| **CL-09** | The anonymity stress test that fails the build if the founder's real name, personal email, or address leaks into rendered output, JSON-LD, or meta tags. |
| **V-NEW-XX** | A tracked CI gate. V-NEW-01 = stale-dated-stats; V-NEW-02 = AI factual filter (deferred); V-NEW-03 = Stripe webhook idempotency replay; V-NEW-04 = RLS isolation gate; V-NEW-06 = AI cost caps; V-NEW-07 = admin MFA. |
| **M01..M12** | The 12 quality metrics tracked by `/admin/code-quality`. Defined in `.quality-targets.yml`. |
| **Hub** | A vertical landing page (e.g. `/property`, `/etfs`, `/super`). Each hub has pillar pages, advisor matching, and content articles. See `docs/audits/HUB_BLUEPRINT.md`. |
| **Stream X** | The `createAdminClient` backlog — public RSC pages still importing service-role client. Decision matrix at `docs/audits/x-admin-backlog-decision-matrix.md`. |

## Tooling / infra

| Term | Meaning |
|---|---|
| **Supabase** | The Postgres + auth + storage backend. Project ID `guggzyqceattncjwvgyc`. Pro tier. Region eu-west-1. |
| **Vercel** | Hosting. Project at `finns-projects-2deaa68c/invest-com-au`. Cron schedules in `vercel.json`. |
| **Stripe** | Payments. 12 products live (test mode pre-launch, prod after launch). Webhook events handled in `app/api/stripe/webhook/route.ts`. |
| **Resend** | Transactional email. Webhook signature verified via Svix HMAC. |
| **Sentry** | Error monitoring. Server config has request-id correlation + PII scrubbing + vertical tagging in `beforeSend`. |
| **PostHog** | Product analytics. Mirrored to `posthog_events_mirror` table via edge function. |
| **n8n** | Self-hosted workflow automation. 6 workflows currently dormant — see `docs/launch/manual-ops-during-ai-pause.md`. |
| **MCP** | Model Context Protocol. The audit-loop and various dev workflows use MCP servers (GitHub, Supabase, Vercel, n8n, Stripe). |
