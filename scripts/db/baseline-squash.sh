#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Migration-ledger baseline-squash helper (Path A).
#
# Automates the error-prone, NON-destructive local file shuffling of the
# reconciliation and prints the exact prod-touching commands to run next. It
# deliberately STOPS before `supabase migration repair` — that is the point of
# no return and must be run by hand, after a verified snapshot.
#
# Full procedure + rationale: docs/runbooks/MIGRATION_LEDGER_RECONCILIATION.md
# State of record:            docs/audits/DB-STATE-2026-06-07.md
#
# Requirements (founder-run): supabase CLI installed and `supabase link`ed to
# the project; a FRESH prod snapshot taken; a clean git working tree.
#
# Usage:
#   scripts/db/baseline-squash.sh                 # dry-run (default): shows the plan
#   SNAPSHOT_CONFIRMED=1 scripts/db/baseline-squash.sh --execute
#
# --execute performs ONLY the safe, reversible local steps:
#   1. dump the live public schema to the baseline migration file
#   2. archive the legacy migration files (git mv → supabase/migrations/archive/)
# It then prints the prod ledger-repair + types-regen + verify commands.
# ---------------------------------------------------------------------------
set -euo pipefail

MIGRATIONS_DIR="supabase/migrations"
ARCHIVE_DIR="${MIGRATIONS_DIR}/archive"
EXECUTE=0
[[ "${1:-}" == "--execute" ]] && EXECUTE=1

# CSF / s708 files that must NEVER enter the active set or a bulk apply
# (REGULATORY-AVOID-LIST.md — founder + legal only).
CSF_GLOBS=("*sp02_startup_portal*" "*sp03_startup*" "*startup_portal*" "*wholesale*" "*esic*")

say() { printf '%s\n' "$*"; }
die() { printf '::error:: %s\n' "$*" >&2; exit 1; }

[[ -d "$MIGRATIONS_DIR" ]] || die "run from the repo root ($MIGRATIONS_DIR not found)"

TS="$(date -u +%Y%m%d%H%M%S)"
BASELINE="${MIGRATIONS_DIR}/${TS}_baseline_schema.sql"
legacy_count="$(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')"

say "=== Baseline-squash plan ==="
say "  Baseline file : $BASELINE"
say "  Legacy files  : $legacy_count → $ARCHIVE_DIR/"
say "  CSF hold      : files matching ${CSF_GLOBS[*]} are reported, NOT bulk-applied"
say ""

# Surface the CSF-sensitive files so the operator can fence them explicitly.
say "--- CSF / s708 files in the tree (handle separately, legal sign-off) ---"
csf_files="$(for g in "${CSF_GLOBS[@]}"; do find "$MIGRATIONS_DIR" -maxdepth 1 -name "$g" 2>/dev/null; done | sort -u)"
if [[ -n "$csf_files" ]]; then
  while IFS= read -r f; do say "  ⚖️  $f"; done <<< "$csf_files"
else
  say "  (none found by glob — still verify manually)"
fi
say ""

if [[ "$EXECUTE" != 1 ]]; then
  say "DRY RUN — no changes made. Re-run with: SNAPSHOT_CONFIRMED=1 $0 --execute"
  exit 0
fi

# --- guards before any change ---
[[ "${SNAPSHOT_CONFIRMED:-}" == "1" ]] || die "set SNAPSHOT_CONFIRMED=1 to confirm a fresh prod snapshot exists (step 0)"
command -v supabase >/dev/null 2>&1 || die "supabase CLI not found — install + 'supabase link' first"
git diff --quiet && git diff --cached --quiet || die "git working tree is dirty — commit/stash first"

say "1/2 Dumping live public schema → $BASELINE"
supabase db dump --linked --schema public -f "$BASELINE" \
  || die "supabase db dump failed — is the project linked?"
say "    Review $BASELINE: ensure RLS + policies present, CREATEs idempotent, strip owner/grant noise."

say "2/2 Archiving $legacy_count legacy migration(s) → $ARCHIVE_DIR/"
mkdir -p "$ARCHIVE_DIR"
# Move every legacy .sql EXCEPT the new baseline we just wrote.
find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' ! -name "$(basename "$BASELINE")" -print0 \
  | xargs -0 -I{} git mv {} "$ARCHIVE_DIR/"

say ""
say "✅ Local steps done. NEXT (prod — run by hand, irreversible):"
cat <<EOF
  # 3. Reconcile the ledger so the baseline is the applied floor and nothing is pending:
  supabase migration list --linked
  supabase migration repair --status applied "${TS}"
  #    (mark superseded legacy versions reverted as needed; goal: db push --dry-run shows NOTHING pending)

  # 4. Regenerate types from prod and commit:
  npm run db:types && git add lib/database.types.ts

  # 5. Verify reproducibility on a throwaway branch:
  supabase branches create reconcile-verify   # build a staging DB from the tree, smoke-test
  supabase branches delete reconcile-verify

  # 6. Only AFTER the above: enable auto-apply (add SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD
  #    secrets) with the CSF files fenced in archive/.
EOF
say ""
say "Confirm done: SUPABASE_MIGRATIONS_JSON=<ledger-dump.json> npm run audit:ledger-drift  → local-only/ledger-only == 0"
