# Cutover guardian — domain-migration verification suite

Automated checks for the Oct–Dec 2026 apex migration to `invest.com.au`.
Complements `docs/runbooks/cutover.md` (procedure) and
`e2e/pre-launch-qa.spec.ts` (smoke tests): it proves the *whole sitemap
inventory* survives the move — statuses, canonicals, JSON-LD, indexability.

## Commands

```bash
# 1. Fingerprint a host's sitemap URLs (full crawl, or --sample=N deterministic subset)
npm run cutover:fingerprint -- --target=https://lambent-sawine-17c3dd.netlify.app --sample=300
#    → docs/cutover/fingerprints/<host>-<yyyymmdd-hhmm>.json + 10-line summary

# 2. Diff two fingerprints. Exit 1 on orphans, status regressions (200→404/500),
#    or canonical host drift; warns on JSON-LD loss and noindex appearance.
npm run cutover:diff -- docs/cutover/fingerprints/<old>.json docs/cutover/fingerprints/<new>.json

# 3. Verify the legacy redirect map (301/308 + destination path match)
npm run cutover:redirects -- --target=https://invest.com.au
```

## Workflow

`.github/workflows/cutover-guardian.yml` runs weekly (Mon 18:00 UTC) against
the mirror and on `workflow_dispatch` with `target`/`sample` inputs. Each run
fingerprints, checks the redirect map, diffs against the previous run's
`cutover-fingerprint-baseline` artifact (skipped with a note if none exists),
then uploads its own fingerprint as the next baseline (90-day retention).

## Mapping to the cutover runbook

- **T−7d:** fingerprint baseline on the old host + redirect-map dry run
  (`--target=<old host>`); keep the JSON as the pre-cutover reference.
- **T=0+ (through T+48h):** fingerprint `--target=https://invest.com.au`, then
  `cutover:diff` old-vs-new (paths are host-independent) + `cutover:redirects`.

`legacy-redirect-map.csv` is the **CO-01 drop-in point**: it ships with three
example rows (existing internal redirects); paste the founder-supplied
prior-host URL list there — no code changes needed.
