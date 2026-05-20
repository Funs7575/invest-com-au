# CO-07 — Final Anonymity Audit

**Run date:** 2026-05-20T03:50:41Z  
**Branch:** `claude/audit-remediation/co-cutover-prep`  
**HEAD commit:** `cf8e833`  
**Auditor:** audit-remediation cloud loop (iter 483)  
**Gate:** CL-09 (CI pattern from `.github/workflows/ci.yml`)

This audit is the pre-launch complement to the quarterly cron at
`app/api/cron/quarterly-anonymity-audit/route.ts`. CO-07 is run
once manually before the apex domain cutover to confirm the full
shipped surface has no founder PII leakage.

---

## Scope

Directories scanned: `lib/`, `app/`, `components/`, `proxy.ts`  
File types: `*.ts`, `*.tsx`, `*.js`  
Excluded: `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`,
`quarterly-anonymity-audit/` (that file _defines_ the patterns, not
a leak), `docs/`, `CLAUDE.md` (audit trail — expected to reference).

Total files in scope: **2,329** `.ts`/`.tsx` files.

---

## Gate results (CL-09 patterns)

| Pattern | Files matched | Result |
|---------|--------------|--------|
| `finn@invest\.com\.au` | 0 | ✅ PASS |
| `finnduns@gmail\.com` | 0 | ✅ PASS |
| `Finn Webster` | 0 | ✅ PASS |

**CL-09 gate: PASSED**

---

## Extended scan

### Personal name variants

Patterns: `Fin Duns`, `finnduns`, `@finn\b`

Result: **0 matches** in shipped source. ✅

### Personal email domains

Patterns: `@gmail.com`, `@hotmail`, `@outlook`, `@yahoo`, `@icloud`

Result: **0 matches** in shipped source. ✅

### Role addresses (expected — entity-level only)

Files referencing `hello@invest`, `press@invest`, `support@invest`,
`compliance@invest`: **55 files**.

These are all legitimate entity-level role addresses. No personal
accounts appear in shipped code. ✅

### `quarterly-anonymity-audit` cron (expected reference)

`app/api/cron/quarterly-anonymity-audit/route.ts` contains
`/finn@invest\.com\.au/i` as the pattern to scan for — this is the
_definition_ file, not a PII leak. Excluded per gate rules. ✅

---

## Observations

1. **All three core CL-09 patterns absent** from the entire 2,329-file
   shipped surface.
2. **No personal email domains** (`gmail`, `hotmail`, `outlook`,
   `yahoo`, `icloud`) appear in code that ships to users.
3. **55 files** use entity-level role addresses — consistent with the
   contact surface, newsletter, lead-form, and compliance footers.
   All expected; no personal accounts mixed in.
4. **CLAUDE.md** references both identities under "Founder identity"
   (2 occurrences) — this is the audit-trail entry in a developer-only
   file not shipped to users. Expected per CL-09 exclusion rules.

---

## Verdict

**CO-07: PASSED.** The shipped source has no founder PII leakage
across any of the 2,329 shipped `.ts`/`.tsx` files. The codebase is
ready for the apex domain cutover from an anonymity standpoint.

---

## Next steps

- This file should be re-run within 24 hours of the actual apex domain
  cutover (T−1h per `docs/runbooks/cutover.md`) to catch any
  last-minute commits that introduce PII.
- The quarterly cron at `/api/cron/quarterly-anonymity-audit` will
  run automatically post-launch on a 90-day cadence.
- If this file is more than 30 days old at cutover time, re-run the
  commands in this file's "Gate results" section before proceeding.
