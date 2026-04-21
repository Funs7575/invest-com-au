# .claude/agents/

Specifications for the 19 autonomous agents that operate invest.com.au.

## What this directory is

Each file in this directory is the **source of truth** for one agent. When an
agent runs — whether triggered by cron, event, or manual invocation — its
runtime loads the matching spec file and uses it to derive:

- Identity and mission (Role, Prompt skeleton)
- When it's allowed to run (Schedule)
- What it can touch (Capabilities, MCP access, Data access)
- What it must never do (Forbidden actions)
- When to stop and escalate (Escalation triggers, Failure handling)
- What "done well" looks like (Success criteria)

If a spec and runtime behaviour disagree, the spec wins — the runtime is
expected to be updated to match. Drift in either direction is a bug.

## Precedence

When this directory conflicts with other docs, this directory wins — it is
the runtime source of truth agents actually read. If you notice a conflict,
update this directory first and COMPANY.md (or any other doc) second.

## Structure

One Markdown file per agent, numbered `00` – `18`:

| #  | File                                    |
|----|-----------------------------------------|
| 00 | `00-master-overseer.md`                 |
| 01 | `01-ceo.md`                             |
| 02 | `02-cto.md`                             |
| 03 | `03-cmo-content.md`                     |
| 04 | `04-editorial.md`                       |
| 05 | `05-smb-sales.md`                       |
| 06 | `06-bd-enterprise.md`                   |
| 07 | `07-revenue.md`                         |
| 08 | `08-security.md`                        |
| 09 | `09-ci-improvement.md`                  |
| 10 | `10-analytics.md`                       |
| 11 | `11-email-lifecycle.md`                 |
| 12 | `12-ops-admin.md`                       |
| 13 | `13-licensing.md`                       |
| 14 | `14-growth-partnership.md`              |
| 15 | `15-revenue-optimisation.md`            |
| 16 | `16-domain-migration.md`                |
| 17 | `17-ai-search-optimisation.md`          |
| 18 | `18-product-layer.md`                   |

Files are created in staged sessions. Agents that have not yet been drafted
are TBD — do not invoke them until their spec file exists.

## Convention

Every spec file uses the same headings in the same order:

```
# Agent ##: [Name]
## Role
## Schedule
## Capabilities
## MCP access
## Data access
## Inputs
## Outputs
## Escalation triggers
## Forbidden actions
## Success criteria
## Failure handling
## Prompt skeleton
```

Do not add, remove, or reorder sections without updating every file.

## Related context

- `COMPANY.md` — §The 19 agents, §The 24 agent infrastructure tables,
  §5-tier escalation system, §Founder-bandwidth awareness,
  §FORBIDDEN actions. Every spec file defers to COMPANY.md on shared rules,
  subject to the Precedence clause above.
- `CLAUDE.md` — developer-facing working notes; does not govern agents.
- `migrations/20260512_agent_infrastructure.sql` — schema for the 19
  agent-only tables. Agents must not alter this schema without going
  through Agent #02 (CTO) and a T3 approval.

## Editing this directory

- Major edits to a spec file (role, schedule, data access, forbidden
  actions) are T3 — require Fin's explicit approval via `ceo_approvals`.
- Minor edits (tightening the prompt skeleton, fixing a table name typo,
  cost-budget adjustments under 20%) are T2 — notify in `agent_logs` and
  auto-proceed after the 4hr window.
- Never edit a spec file during an active incident; write the hypothesis,
  ship the fix via runtime config if possible, then update the spec.
