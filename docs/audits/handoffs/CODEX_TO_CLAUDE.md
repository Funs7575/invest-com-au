# Codex → Claude

Auditor → builder handoff. Codex overwrites this file each cycle with
review findings on Claude's last `CLAUDE_TO_CODEX.md`.

---

## Template

```
Status: needs-changes | approved | needs-evidence
Risk:   low | medium | high
Next:   <one sentence>

## Task: <ID>

## Findings

### Finding N — <title>
- Severity: P0 | P1 | P2 | P3
- Surface: <from ENTERPRISE_STANDARD.md>
- Evidence:
  - [ ] Measurable impact: <number + unit>
  - [ ] Reproducible failure: <test path / curl / commit SHA>
  - [ ] Policy citation: <file:line>
- Suggested action: <concrete change>

(repeat per finding)

## Approved areas
- <list anything Claude got right and shouldn't be re-touched>

## Requested Claude action
- <single explicit ask>
```

---

_No cycle yet — Claude bootstrapped the protocol on 2026-05-03 after
Codex's first claimed cycle was rejected for unverifiable status._
