#!/bin/bash
# Vercel "Ignored Build Step" — exit 0 = SKIP build, exit 1 = BUILD.
#
# Wired in via vercel.json's `ignoreCommand`. Three skip rules:
#
#   1. Loop-authored branches (claude/audit-remediation/*) — these are
#      code-only iterations verified by CI; nobody browses preview URLs
#      for them. Skipping saves ~30-50% of build CPU on a busy loop day.
#
#   2. Docs-only commits — only files under docs/, *.md at root, or the
#      remediation queue/log files. No runtime impact, no need to build.
#
#   3. Loop pause sentinel commits (LOOP_PAUSE) — pause/resume commits
#      touch a single file and don't change behaviour.
#
# Anything else falls through and builds normally.

set -e

ref="${VERCEL_GIT_COMMIT_REF:-}"
sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

# Rule 1 — loop branches
case "$ref" in
  claude/audit-remediation/*)
    echo "skip: loop-authored branch ($ref)"
    exit 0
    ;;
esac

# Rule 2/3 — files-changed inspection
# `git diff --quiet` exits 0 if no diff (i.e. excluded paths cover
# everything), so we invert: if --quiet returns 0 after excluding
# docs/markdown/queue files, the commit is docs-only and we skip.
if git diff --quiet "$sha^" "$sha" -- \
     ':(exclude)docs/' \
     ':(exclude)*.md' \
     ':(exclude)LOOP_PAUSE' \
     2>/dev/null; then
  echo "skip: docs-only / pause-sentinel commit"
  exit 0
fi

# Otherwise: build
echo "build: changes outside skip patterns"
exit 1
