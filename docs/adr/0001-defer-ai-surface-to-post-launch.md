# ADR 0001 — Defer AI surface to post-launch

## Status

**Accepted** — 2026-04-28.

## Context

The 2026-04-26 enterprise audit identified the AI surface as the
weakest-covered surface in the entire rubric. Of the 6 surface kinds
defined in `docs/audits/ENTERPRISE_STANDARD.md`, the AI surface had:

- Zero prompt-injection test coverage
- No factual filter (`lib/compliance.ts` has compliance copy strings but
  no `filterFactualOutput()` function)
- No AI audit log (`ai_audit_log` table doesn't exist)
- No retention policy enforcement
- No cite-back guardrail

V-NEW-02 (the AI factual-filter CI gate) was queued but blocked, waiting
on founder compliance copy review. The 19 background n8n agents (6 in
the codebase, more conceptually scoped) are all `active: false`
pre-launch.

Sprint 4 of the 16-week plan ("n8n + agent activation", weeks 7-8) was
the highest-uncertainty sprint in the schedule and the most likely to
slip — activating live AI agents in production is a different risk class
from the database / Stripe / observability work the other sprints cover.

The launch trigger is ACL approval (Oct–Dec 2026), not AI feature
parity. Marketing copy and pricing pages do not depend on AI being live.

## Decision

The AI surface is deferred to post-launch. Specifically:

- **Sprint 4 retheme** from "n8n + agent activation" to "Validation +
  JSON-LD" — Sprint 4 freed capacity is reinvested in pulling Lighthouse
  baseline forward from Sprint 5 and grinding D-stream test backfill on
  main.
- **AI rubric items** in `ENTERPRISE_STANDARD.md` are marked deferred at
  the section header; the V-NEW-02 CI gate is not wired during the
  launch window.
- **V-NEW-02 status** in the queue: `blocked` → `deferred-post-launch`.
  CC-* dependents of V-NEW-02 are also implicitly deferred.
- **AI-facing routes** (`/api/concierge`, `/api/admin/ai-chat`) ship
  behind off-by-default feature flags. UI entry points (chatbot widgets,
  "Ask the concierge" CTAs) are hidden when the flag is off.
- **n8n workflows** stay `active: false` through the launch window.
  Manual-ops checklists (`docs/launch/manual-ops-during-ai-pause.md`)
  cover the work the agents would otherwise do.
- **V-NEW-06 (AI cost caps)** is merged as cheap insurance — the caps
  are dormant when AI is disabled and become live the moment AI
  reactivates post-launch.

This is a scope decision, not a code-quality decision. The work that
*has* shipped on AI (cost caps, idempotency, cookie helper) is preserved.

## Consequences

**Positive:**
- Removes the highest-uncertainty surface from the launch path
- Eliminates ~20 hours of Sprint 4 work; reinvested in Lighthouse and tests
- Reduces compliance posture risk — no live AI = no AFSL-adjacent factual-claim risk during the launch month
- Saves Anthropic API spend during launch month (unbudgeted variable)
- Adds 2 weeks to the buffer between sprint end (mid-Aug) and launch window (Oct–Dec)

**Negative / accepted trade-offs:**
- The platform launches without AI features competitors may already have. Marketing positioning has to lead with non-AI value-props.
- Manual ops work replaces 6 dormant workflows. The Friday ritual + the manual-ops checklist need actual discipline to execute.
- Reactivation is non-trivial — `docs/launch/manual-ops-during-ai-pause.md` §7 documents the unwind, but it's a multi-week shadow-mode rollout.
- Sunk cost: ~3 weeks of agent-prep work (PRs #203-209) sits on shelf until reactivation.

## Alternatives considered

- **Ship AI on schedule (Sprint 4 in June).** Rejected because the
  surface rubric isn't met and meeting it requires founder compliance
  copy review that hasn't happened. Shipping unfilled means launching
  with regulatory risk and no way to detect prompt-injection.
- **Defer AI but also rip out the dormant n8n agent code.** Rejected
  because the work is real and reactivation post-launch is on the
  roadmap. Removing it means rebuilding it in 3-6 months.
- **Defer AI partially — keep `concierge` chatbot, remove agents.**
  Rejected because the chatbot has the same factual-filter problem as
  the agents. Splitting the AI surface into "kept" and "deferred" sub-surfaces creates a maintenance burden in the rubric.

## When to revisit

After ACL approval and the Oct–Dec launch window stabilises. The
reactivation walkthrough is in `docs/launch/manual-ops-during-ai-pause.md`
§7. Re-open this ADR (or write its successor) when reactivation begins.

## References

- PR #271 — `docs(launch): defer AI surface to post-launch`
- `docs/launch/manual-ops-during-ai-pause.md` — manual checklists per workflow
- `docs/audits/ENTERPRISE_STANDARD.md` — AI surface header (deferred notice)
- `docs/audits/REMEDIATION_QUEUE.md` — V-NEW-02 status `deferred-post-launch`
- `docs/audits/2026-04-26-comprehensive-audit.md` — Sprint 4 retheme
- PR #258 — V-NEW-06 AI cost caps (merged as cheap insurance)
