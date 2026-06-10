#!/usr/bin/env bash
# Branch cleanup for the 2026-06-10 audit (docs/audits/BRANCH_CLEANUP_2026-06-10.md).
#
# Deletes exactly the 291 verified-dead branches from the audit manifest.
# Claude Code cloud sessions cannot run this (the git proxy 403s ref
# deletions by design) — run it from a normally-credentialed checkout:
#
#   bash scripts/branch-cleanup-2026-06-10.sh           # dry run (prints)
#   bash scripts/branch-cleanup-2026-06-10.sh --execute # actually deletes
#
# Every deleted tip SHA is pinned in the audit doc; restore any branch
# with `git branch <name> <sha>`.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
MANIFEST="docs/audits/BRANCH_CLEANUP_2026-06-10.md"
MODE="${1:-dry-run}"

# Parse manifest table rows: | `branch` | `sha` | evidence |
mapfile -t BRANCHES < <(sed -n 's/^| `\([^`]*\)` | `[0-9a-f]\{12\}` | .*/\1/p' "$MANIFEST")
echo "Manifest branches: ${#BRANCHES[@]}"

# Safety: never delete these even if the manifest is edited badly.
PROTECTED='^(main|claude/wonderful-dirac-x7u054|claude/rescue/.*|claude/relaxed-knuth-9tktxj)$'

deleted=0; missing=0; failed=0
for b in "${BRANCHES[@]}"; do
  [[ "$b" =~ $PROTECTED ]] && { echo "SKIP protected: $b"; continue; }
  if ! git ls-remote --exit-code origin "refs/heads/$b" >/dev/null 2>&1; then
    missing=$((missing+1)); continue
  fi
  if [ "$MODE" = "--execute" ]; then
    if git push origin --delete "$b" >/dev/null 2>&1; then
      deleted=$((deleted+1)); echo "deleted: $b"
    else
      failed=$((failed+1)); echo "FAILED:  $b"
    fi
  else
    echo "would delete: $b"
  fi
done
echo "---"
echo "mode=$MODE deleted=$deleted already-gone=$missing failed=$failed"
[ "$MODE" = "--execute" ] || echo "Dry run only. Re-run with --execute to delete."
