# Severity matrix

How we classify incidents on invest.com.au and what each level commits us to. Used in bug-report triage, on-call response, PR labels, and post-incident reports.

Pairs with `docs/runbooks/README.md` (per-service playbooks) and `docs/ops/launch-ops-plan.md` (launch-week rhythm).

---

## When to use this

- Triaging a row in the `bug_reports` table or a Sentry issue.
- Picking the label on a `launch-hotfix` PR (`P0` / `P1` / `P2` / `P3`).
- Deciding whether to wake the founder, send a public comm, or wait until morning.
- Writing the severity field on `slo_incidents.notes` during an incident.

If you can't classify the incident in 30 seconds, default to one level higher than your gut. Downgrade once the blast radius is known. Upgrades are easier to apologise for than downgrades.

---

## The four levels

### P0 — Critical

**Definition.** The site is unusable for most visitors, OR data is being lost, OR money is moving incorrectly, OR there is a confirmed security / PII incident.

**Response (calendar time from detection):**

| Step | Target |
|---|---|
| Acknowledge in #launch / reply to alert | ≤ 15 min |
| Status page → "Major outage" or "Investigating" | ≤ 15 min |
| Mitigation deployed (kill switch flipped, rollback executed, traffic rerouted) | ≤ 60 min |
| Public comm if user-facing | ≤ 60 min from mitigation |
| Post-incident write-up scheduled | ≤ 24 hr |

**What changes vs. lower levels:**

- Wake the founder. Phone, not email.
- Mitigate before you diagnose. Use the kill switch (`/admin/automation/kill-switch` or feature flag in `feature_flags`) and accept the user-visible degradation.
- Open an `slo_incidents` row immediately. Annotate as you go.
- Hotfix PR uses the `launch-hotfix` template, labels `launch-hotfix` + `P0`. Tier C merge — announce intent, merge unless STOP.
- Rollback by Vercel deployment ID is on the table from minute 1. See `docs/runbooks/launch-rollback.md`.

**Examples on this codebase:**

- Homepage / `/best/[slug]` / `/quiz` returning 5xx for any meaningful share of traffic.
- `/api/health` failing for > 3 consecutive polls (per `launch-day.md` smoke threshold).
- Stripe webhook erroring on every event — `stripe_webhook_events` rows stuck in `processing` and the queue is climbing. Runbook: `stripe-webhook-stuck.md`.
- Advisor or listing enquiry POST returning 5xx — leads being dropped.
- `lib/supabase/admin.ts` service-role key leaking in a response body, or any RLS bypass that exposes another user's data.
- DNS / certificate expiry. Domain unreachable.
- A migration that took the DB offline. Runbook: `database-rollback.md`.
- Payment processed but no fulfilment recorded (or vice versa).
- Drip / mass-send emailed the wrong list, or sent unsuppressed to bounced contacts. Runbook: `resend-rate-limited.md` for triage, `breach-notification.md` if PII was misrouted.

### P1 — High

**Definition.** A major feature is broken or degraded for many users, but the site is usable, no data is lost, and a workaround exists.

**Response:**

| Step | Target |
|---|---|
| Acknowledge | ≤ 1 hr |
| Mitigation or workaround communicated | same business day |
| Fix deployed | ≤ 24 hr |
| Public comm | only if visible to users for > 2 hr |

**What changes vs. lower levels:**

- Founder is notified, but during waking hours.
- Hotfix PR is single-purpose, `launch-hotfix` + `P1`. Tier B (refactors / additive tests / RLS migrations passing isolation gate) where applicable.
- Status page updated to "Partial outage" only if the affected surface is on the homepage path. Otherwise no public comm.
- A kill switch may still be the right move (e.g. flip `sponsored_boosting` if the boosting algorithm regresses; quiz still works, comparison pages still rank).

**Examples:**

- One vertical pillar page (`/share-trading`, `/crypto`, etc.) returning 500 — others fine.
- One `/best/[slug]` subcategory returning empty results due to a query regression.
- Quiz step 3 broken for one device class (mobile Safari).
- Star ratings rendering as 0 across most cards (data join issue).
- Email transactional delivery failing for one provider (Outlook bouncing, Gmail fine). Runbook: `email-deliverability.md`.
- A scheduled cron silent for > 2 expected windows — `health_pings` row stale. Runbook: `cron-stuck.md` / `cron-silence-alert.md`.
- Sponsored placement sort order obviously wrong (sponsored partner not ranked first).
- Admin page timing out (admin-only impact, but admin needs to triage). Runbook: `supabase-slow.md`.
- A single advisor's KYC stuck in pending. Runbook: `advisor-kyc-stuck.md`.

### P2 — Medium

**Definition.** A minor feature is broken or visibly off, but it does not block any user goal and affects a small slice of traffic.

**Response:**

| Step | Target |
|---|---|
| Acknowledge | next business day |
| Fix deployed | ≤ 1 week |
| Public comm | none |

**What changes:**

- No founder notification needed unless it cascades.
- Goes through normal PR flow (Tier A or B), no `launch-hotfix` label unless we're inside the launch freeze window from `launch-day.md` (T-24h to T+24h).
- Bundle multiple P2s into one cleanup PR if they touch the same area.

**Examples:**

- A specific JSON-LD schema validation warning on one page type (no SEO impact yet, but should be fixed).
- ISR not invalidating on one content page — page is stale by hours, not days.
- Broken external affiliate link for one inactive partner.
- Calculator reference test drift on a low-traffic calculator. Runbook: `calculator-reference-tests.md`.
- Article cover image missing on a small set of older articles. Runbook: `article-cover-image-backfill.md`.
- TMD coverage gap on a non-flagship product. Runbook: `tmd-coverage-gap.md`.
- Notification inbox showing zero items when there should be some — only affects users with a specific filter set. Runbook: `notification-inbox-empty.md`.

### P3 — Low

**Definition.** Cosmetic, edge-case, content correction, or known-tolerable minor bug.

**Response:**

- Filed in the backlog.
- Fixed when convenient or when bundled with related work.
- Not a blocker for any release.

**Examples:**

- Typo in body copy on one page.
- Off-by-a-pixel spacing on a card on one viewport width.
- Low-traffic 404 from a stale external inbound link.
- A console warning in dev mode that doesn't reach production.
- A console.log left in (note: `lib/logger.ts` is the source of truth — see CLAUDE.md).

---

## Calibration rules

These are the rules we use when two reasonable people would disagree on the level.

1. **PII or money → at least P1, often P0.** No matter how small the affected slice. Even one user's data leaking to another is a P0.
2. **Lead-flow regressions are P0 during launch.** Outside launch they may be P1, but during launch week, dropped advisor or listing enquiries are P0 because we are spending money to acquire that traffic and re-acquiring is not free.
3. **Compliance copy errors are at least P1.** AFSL / GDPR / disclosure copy lives in `lib/compliance.ts`. If the wrong disclaimer renders, that is a regulatory exposure, not a UI bug. Runbook for severe cases: `breach-notification.md`.
4. **Single-user reports are not automatically low.** If one user reports it but the cause looks systemic (e.g. their browser is common, their flow is the golden path), classify by the *potential* blast radius, not the *observed* one.
5. **A kill switch is a mitigation, not a downgrade.** Flipping a flag to off does not turn a P0 into a P2 — the underlying defect is still P0 until the fix ships. The flag bought you time; it didn't change the severity. (Borrowed verbatim from `docs/runbooks/README.md`.)
6. **If you're 15 minutes into a P0 with no progress, escalate.** Same rule the runbook README states for on-call. Don't sit on it alone.
7. **During launch freeze (T-24h to T+24h per `launch-day.md`), bump P2 → P1.** The freeze means we don't merge unless we have to, so a "fix it next week" item becomes a real decision: fix now, or accept and document.

---

## What each label carries

| Concern | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| Wake the founder? | Yes, phone | Business hours only | No | No |
| Status page update? | Yes | Only if visible > 2 hr | No | No |
| `launch-hotfix` PR template? | Yes | Yes | Only inside launch freeze | No |
| Merge tier (per `MERGE_AUTHORIZATION.md`) | Tier C (announce + merge) | Tier B (15-min observation) | Tier A | Tier A |
| `slo_incidents` row required? | Yes | Yes | No | No |
| Post-incident write-up? | Yes, ≤ 24 hr | Yes, ≤ 1 week | No | No |
| Kill switch on the table? | Yes | Often | Rare | No |
| Public comm? | Yes, if user-facing | Sometimes | No | No |

---

## Worked example: classifying a real-shaped report

> **Bug report row:** "Sponsored 'Featured' badge is showing on a broker that I don't think is a sponsor — page `/best/cfd-brokers`, viewport 1440×900, Chrome 130."

Walk-through:

1. **PII / money?** No. Skip rule 1.
2. **Lead-flow?** Indirectly — sponsored ranking affects which broker gets clicks, but enquiries still flow.
3. **Compliance copy?** Yes — sponsored-content disclosure is a regulatory matter (rule 3). Bumps minimum to P1.
4. **Blast radius?** If the disclosure is wrong on one page, it's likely wrong everywhere `boostFeaturedPartner()` is called. Treat as systemic until shown otherwise (rule 4).
5. **Kill-switch available?** Yes — `sponsored_boosting` flag (see `docs/ops/launch-ops-plan.md` §4). Flipping it disables boosting and renders an unsponsored sort, but does not turn this into a P2 (rule 5).

Verdict: **P1 with a P0 watch.** Acknowledge inside an hour, flip the flag if the page is high-traffic, dig into `lib/sponsorship.ts` consumers. Promote to P0 if any rendered disclosure copy is materially wrong (e.g. labelled "independent" when sponsored).

---

## Cross-references

- Runbook index and template: `docs/runbooks/README.md`
- Launch timeline: `docs/runbooks/launch-day.md`
- Rollback: `docs/runbooks/launch-rollback.md`
- Merge tiers: `docs/audits/MERGE_AUTHORIZATION.md`
- Launch-ops plan (intake / kill switches / dashboard): `docs/ops/launch-ops-plan.md`
- Compliance copy source of truth: `lib/compliance.ts` (per `CLAUDE.md`)
- Feature flag helper: `lib/feature-flags.ts`
