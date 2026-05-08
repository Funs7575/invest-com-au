#!/bin/bash
# Vercel "Ignored Build Step" — exit 0 = SKIP build, exit 1 = BUILD.
#
# Wired in via vercel.json's `ignoreCommand`. Two skip rules:
#
#   1. Docs-only commits — only files under docs/, *.md at root, or the
#      remediation queue/log files. No runtime impact, no need to build.
#
#   2. Loop pause sentinel commits (LOOP_PAUSE) — pause/resume commits
#      touch a single file and don't change behaviour.
#
# Anything else builds normally — including loop-authored branches
# (claude/audit-remediation/*). Loop PRs MUST build because the
# `Preview smoke test (critical URLs)` CI gate looks up the Vercel
# deployment registered to the head SHA; if no build runs, no
# deployment exists, and the gate times out — forcing admin-merge
# bypasses on every loop PR. The CPU savings from skipping loop
# branches were not worth that ergonomic cost.

set -e

sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

# Files-changed inspection
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
