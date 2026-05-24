# Audit-remediation loop spend tracker

Auto-generated daily by `.github/workflows/loop-spend-tracker.yml`.
Each row: 24-hour snapshot at 06:00 UTC.

- **Loop commits** = `chore(audit|loop|ci|db)` + `fix(<stream>)` commits in last 24h
- **All commits** = total commits to main in last 24h
- **PRs opened** = PRs whose head branch starts with `claude/audit-remediation/`
- **Est tokens** = `5M baseline + (loop commits × 80k)` — order-of-magnitude estimate, NOT billable
- **Alert** = `ok` / `warn` (loop commits > 40) / `critical` (> 80)

Thresholds tunable in the workflow's `env:` block.

---

| Date | Loop commits | All commits | PRs opened | Est tokens (M) | Alert |
| --- | --- | --- | --- | --- | --- |
| 2026-05-09 | 19 | 80 | 9 | 6.5 | ok |
| 2026-05-10 | 19 | 63 | 6 | 6.5 | ok |
| 2026-05-11 | 14 | 45 | 9 | 6.1 | ok |
| 2026-05-12 | 22 | 48 | 3 | 6.8 | ok |
| 2026-05-15 | 22 | 63 | 3 | 6.8 | ok |
| 2026-05-18 | 12 | 57 | 10 | 6.0 | ok |
| 2026-05-19 | 12 | 45 | 11 | 6.0 | ok |
| 2026-05-20 | 10 | 107 | 16 | 5.8 | ok |
| 2026-05-21 | 10 | 44 | 0 | 5.8 | ok |
| 2026-05-22 | 24 | 59 | 2 | 6.9 | warn |
| 2026-05-23 | 16 | 30 | 5 | 6.3 | ok |
