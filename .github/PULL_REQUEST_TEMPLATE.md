<!--
  Pull request template. The audit-loop bypasses this when it auto-generates
  long descriptions; for human-authored PRs, fill all sections. Delete
  sections that don't apply with a comment explaining why.

  Skip the AI code review on this PR by adding [skip-ai-review] to the title.
-->

## What changed

<!-- 1-3 bullet points. Be concrete. -->



## Why

<!-- The "why" goes in the PR, not the code. Include:
     - The queue item ID (e.g. D-11 batch 14, V-NEW-07b)
     - The user-visible problem this solves
     - What would happen if we didn't ship this
-->



## Risk level

<!-- Pick one. -->

- [ ] **Trivial** — docs only, test only, CI gate only. Auto-merge-safe.
- [ ] **Low** — additive code (new file, new test, new gate). Doesn't touch existing runtime paths.
- [ ] **Medium** — modifies existing runtime paths. Should be eyeballed on the Vercel preview before merge.
- [ ] **High** — touches RLS, Stripe webhooks, security headers, cron auth, or anything in `proxy.ts`. Needs careful read-through.
- [ ] **Critical** — schema migration on a user-data table, or any change to the cron dispatcher.

## Test plan

<!-- Bulleted checklist. What did you do to verify this works?
     For UI: include the preview URL you clicked through.
     For migrations: include the rollback test result.
-->

- [ ]
- [ ]

## Rollback plan

<!-- One line. How do we undo this if it breaks production?
     "Revert this commit" is fine if true. If not, say what extra steps are needed
     (e.g. "revert + re-run migration X with --rollback").
-->



## Surface rubric

<!-- Which surface(s) does this touch? Confirm the rubric is met for each.
     Surfaces are defined in docs/audits/ENTERPRISE_STANDARD.md.
     Delete this section if the change touches no surface (e.g. pure docs).
-->

- [ ] Database surface — RLS policy + isolation test + migration rollback header
- [ ] Webhook surface — idempotency replay test + retry policy + structured logging
- [ ] AI surface — **deferred** (see ADR-0001); flag-gated only
- [ ] Lead form surface — typed `submitLead({ source })`, SLA monitoring (KK stream)
- [ ] Page surface — `revalidate` set, breadcrumb JSON-LD, axe scan, dated stats wrapped, CL-09 anonymity passes
- [ ] Calculator surface — `<CalculatorShell>`, edge-case unit tests, regulator reference test, E2E lead form test

## Out of scope / follow-ups

<!-- What did you deliberately not do in this PR? Link follow-up queue items. -->



---

🤖 _Auto-generated PRs from the audit-loop will replace this template with a stream-specific format. Manual PRs should follow this one._
