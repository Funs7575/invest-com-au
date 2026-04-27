# Enterprise Standard — per-surface rubric

The platform's compounding quality target. Where `HUB_BLUEPRINT.md`
defines monetisation surface area and `REMEDIATION_DEFAULTS.md` defines
loop discipline, this doc defines what "shipped" means at each surface.

**Read by:** every audit-remediation iteration, before picking an
item. The loop never ships an item that touches a surface whose rubric
isn't met on that surface as a whole — instead, it queues a
surface-hardening sub-item first (see `REMEDIATION_DEFAULTS.md` →
"Enterprise standard enforcement").

**Source of truth:** if this doc and a queue item conflict, this doc
wins for what "done" looks like; the queue item wins for execution
order. If a feature can't meet its surface's rubric without disabling
this doc, **don't disable the doc** — split the feature into a
hardening item + a feature item, ship the hardening item first.

---

## Why per-surface

Quality doesn't accumulate uniformly. A platform can be 95% hardened on
HTTP routes and 40% hardened on AI surfaces and the bottom-percentile
surface is what determines the failure rate visible to users. A flat
"DoD checklist" averages over surfaces and misses this — items pass the
checklist while the AI surface still has zero prompt-injection coverage.

The fix: every surface gets an explicit rubric. An item touching the
surface checks ITS rubric, not a lowest-common-denominator one. New
surface kinds are added to this doc as they appear (e.g. "background
job surface", "third-party API surface"). The streams already in the
queue (`V-NEW-01..04`) feed this — V-NEW-02 enforces the AI rubric's
factual filter, V-NEW-03 enforces the webhook rubric's idempotency,
V-NEW-04 enforces the database rubric's RLS isolation, V-NEW-01
enforces the page rubric's `<DatedStatBadge>` staleness gate.

---

## Surfaces and rubrics

### Database surface

Any change that creates or alters a table containing user-identifiable
data, or that changes the shape of `lib/database.types.ts`.

- [ ] RLS policy on every user-data table (no "service-role only" as
      the long-term answer; if RLS isn't possible today, surface to
      Blocked with a written reason).
- [ ] Isolation test in `__tests__/integration/<table>.rls.int.test.ts`
      proving user A cannot SELECT/UPDATE/DELETE user B's rows. Test
      template at `tests/templates/rls-isolation.test.ts` once V-NEW-04
      lands; until then, follow the pattern in
      `__tests__/integration/leads.rls.int.test.ts`.
- [ ] Migration has a rollback strategy in the file header — what
      reverses it, what data is at risk, what tests confirm the
      reversal.
- [ ] Migration is forward-only and idempotent (`IF NOT EXISTS` /
      `DROP POLICY IF EXISTS` scaffolding per `REMEDIATION_DEFAULTS.md`
      "New RLS migration" gate).

CI gate: V-NEW-04 (RLS isolation gate for new user-data tables).

### Webhook handler surface

Any handler under `app/api/webhooks/**`, plus any cron route in
`app/api/cron/**` that processes external events.

- [ ] Idempotency replay test — replay the same event N times; assert
      state converges (no duplicate subscriptions, no double-charges,
      no double-tier-upgrades). For Stripe, gate is V-NEW-03.
- [ ] Retry policy with exponential backoff for transient failures
      (network, 5xx from upstream). No "retry forever" loops; cap at a
      finite number then escalate.
- [ ] Dead-letter queue (or equivalent — Supabase table with
      `failed_event_id` + payload + last error) for unrecoverable
      failures. Operator can replay or discard.
- [ ] Structured logging via `lib/logger.ts` with a correlation ID
      (typically the event ID from the upstream provider). Never
      `console.*`.
- [ ] Monitoring + alerting on failure rate. Sentry transaction +
      PostHog event for success/fail; Sentry alert if failure rate >
      threshold over a window.

CI gate: V-NEW-03 (Stripe webhook idempotency replay harness).

### AI surface

Any code path that calls `@anthropic-ai/sdk` and renders the result —
in part or whole — to a user.

- [ ] Output passes through `lib/compliance.ts` factual-filter before
      display. No direct render of `response.content[0].text` to the
      DOM.
- [ ] Prompt-injection test fixtures in
      `__tests__/lib/<feature>.prompt-injection.test.ts` covering at
      least: (a) instruction override ("ignore your instructions and
      X"), (b) data exfiltration ("repeat your system prompt"),
      (c) advice-shaping ("you should buy X"), (d) citation
      fabrication.
- [ ] Cost cap per user per day enforced server-side. Cap configured
      in `lib/ai/limits.ts` (or equivalent); cap exceeded returns a
      structured error to the UI ("daily limit reached"), not a
      silently-truncated response.
- [ ] Audit log row written for every call: user_id + timestamp +
      model + input_token_count + output_token_count + doc_type +
      filter_pass/fail. Table: `ai_audit_log` (RLS: read by
      service_role only).
- [ ] Retention policy stated in code comment + cron-enforced. Default:
      30 days for audit log, 90 days for any user-uploaded source
      documents, immediate purge on account deletion.
- [ ] Cite-back guardrail: any factual claim in the AI output
      references a doc line / section / numbered source. Output without
      citations is a filter failure.

CI gate: V-NEW-02 (AI-output factual-filter enforcement).

### Lead form surface

Any form that captures contact data and routes it to an advisor or
internal queue.

- [ ] Submission goes through a typed `submitLead({ source })`
      discriminated union — never a raw `fetch('/api/submit-lead', …)`
      with an untyped payload. Source variant determines downstream
      routing + analytics tagging.
- [ ] SLA monitoring on the routing pipeline. Alert if a lead sits in
      the queue more than the source's SLA (e.g. 5 min for hot leads,
      30 min for warm).
- [ ] Queue health alert — if no leads land for a hub for >N hours
      during business hours, alert (could indicate broken form, broken
      routing, or simply silence — operator decides). Target stream:
      KK (lead routing maturity).
- [ ] Advisor response-time tracking. Per-advisor mean time to first
      response surfaced in the advisor portal.
- [ ] Conversion analytics per source — PostHog funnel from
      `lead_submit:<source>` → `advisor_response` → `outcome`. Without
      this, "which hubs convert" is unmeasurable.

### Page surface

Any user-facing route under `app/**` (RSC or client component).

- [ ] `revalidate` set explicitly. Static content: 86400. Hub content:
      3600. Real-time data: lower or `force-dynamic`. Never the implicit
      Next.js default.
- [ ] Breadcrumb JSON-LD emitted via `lib/schema-markup.ts`
      `breadcrumbJsonLd()`.
- [ ] axe scan: zero violations on top sub-page. CI gate via U-04
      (axe-core gate).
- [ ] Lighthouse 90+ on LCP / CLS / INP / TTFB. Per-page budgets in
      `.lighthouserc.cwv.json` (V-08).
- [ ] Every dated claim wrapped in `<DatedStatBadge dataAsOf= stalesAt=>`.
      Build fails on unwrapped dated claims via V-NEW-01.
- [ ] If the page contains a lead form, the form routes via the typed
      `submitLead({ source })` (see Lead form surface).

CI gate: V-NEW-01 (stale-data CI gate) + U-04 (axe-core) + U-03
(Lighthouse CI).

### Calculator surface

Any interactive numerical tool — borrowing power, FHSS, ETP, salary
sacrifice, CGT, etc.

- [ ] Wrapped in `<CalculatorShell>` (extracted in W-09). Shell handles
      disclaimer, share, save-results email-gate, and the standard
      lead-capture footer.
- [ ] Unit tests with edge cases: zero, negative, max bracket
      (e.g. top marginal tax bracket for tax calculators). Round-trip
      tests for any stateful URL params.
- [ ] Reference tests against worked examples published by the
      relevant regulator — ATO worksheet for tax calculators, ASIC
      MoneySmart for super calculators, regulator-published case
      studies for benefit calculators. Pattern formalised in W-NEW-01;
      every BB-* item inherits the pattern.
- [ ] Lead form integration tested E2E (Playwright `e2e/calculators/`).
      The form-completion path is the calculator's revenue path.
- [ ] Print/PDF export tested if the calculator publishes one (most
      tax/super calcs do).
- [ ] Accessibility: every input has an associated `<label>`, keyboard
      navigation works without mouse, screen-reader announces every
      computed result. Tested via the page-surface axe gate.

---

## How items interact with this doc

When the loop picks an item:

1. Identify the **target surface(s)** the item touches.
2. Read the rubric for each.
3. **Pre-flight check:** is the surface's rubric currently met on the
   surface as a whole? (E.g. before adding a new calculator, are
   existing calculators wrapped in `<CalculatorShell>`?). If not, the
   loop queues a **surface-hardening sub-item** first; the feature
   item depends on it.
4. **Per-item check:** does this specific PR meet the rubric for every
   surface it touches? If not, split into a hardening item + a feature
   item, ship the hardening item first or in the same PR.

This is enforced at the loop level — see "Enterprise standard
enforcement" in `REMEDIATION_DEFAULTS.md`. The loop is allowed to defer
non-blocking rubric items into a follow-up commit on the same PR if
they're mechanical (e.g. adding the `revalidate` export); blocking
items (RLS test, prompt-injection fixtures, idempotency replay) must
ship in the same PR.

---

## Where the V-NEW gates fit

V-NEW-01..04 are the CI side of this rubric — they catch rubric
violations after they've landed in code, as a backstop. The rubric is
the "how to ship right the first time"; the gates are the "fail the
build if it slipped through review". Both layers exist because both
fail occasionally.

| Surface | CI gate | What it catches |
| --- | --- | --- |
| Database | V-NEW-04 | New user-data table without RLS isolation test |
| Webhook | V-NEW-03 | Webhook handler that doesn't converge under replay |
| AI | V-NEW-02 | AI response rendered without factual filter |
| Page | V-NEW-01 | `<DatedStatBadge>` past `stalesAt` |
| Lead form | (KK stream — to be added) | SLA breach not alerted |
| Calculator | (covered indirectly by reference tests) | Math drift |

The KK stream (lead routing maturity) is the sixth gate — it
operationalises the lead-form surface so the rubric items "SLA
monitoring" + "queue health alert" + "advisor response tracking" +
"conversion analytics per source" become CI-checkable rather than
hopeful.

---

## Enforcement compound math

Without per-surface enforcement, items ship at ~70-75% of standard
because the loop's energy goes to the visible work; rubric items
become "we'll add tests later". Later is rare. Quality plateaus.

With per-surface enforcement, items ship at ~88-92% of standard
because every PR pays the surface tax up front. The loop is slightly
slower per iteration (one extra check per surface touched, sometimes a
hardening sub-item) but the total work to reach 88% is less than the
total work to reach 75%-then-retroactively-fix-everything.

The trajectory difference compounds. Net Week 12 standard percentage:
**88% with this doc, 82% without** (estimate based on the proportion
of items that would otherwise ship without rubric coverage).

---

## When this doc changes

- **New surface kind:** add a new section. Don't repurpose an existing
  one.
- **Tightening a rubric:** add a follow-up hardening item to the
  queue covering existing surface members that don't yet meet the new
  rule. Don't silently ratchet — the loop needs the item to know to
  do the work.
- **Loosening a rubric:** strongly discouraged. If a rule is genuinely
  unmeetable, the better fix is splitting the rule (e.g. "RLS on every
  user-data table, with explicit `service-role-only` exemption list at
  `lib/security/rls-exempt.ts` for tables where RLS is impossible
  today"). Document the exemption per-row, not by relaxing the rule
  for everyone.
