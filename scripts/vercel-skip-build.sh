#!/bin/bash
# Vercel "Ignored Build Step" — exit 0 = SKIP build, exit 1 = BUILD.
#
# Default policy: skip everything except manually-triggered deploys.
# To deploy to production: push a commit whose subject starts with
# "ci: force redeploy" (or "ci: force deploy" / "ci: force build").
#
# Skip rules (in order):
#   1. Force-build escape hatch — always builds regardless of branch.
#   2. main branch — skip by default; only deploy when explicitly needed.
#   3. claude/* agent branches — loop PRs no longer need preview builds;
#      the Preview smoke test CI gate has been removed to match.
#   4. Docs-only commits — no runtime impact.
#   5. LOOP_PAUSE sentinel commits — touch one file, no behaviour change.

set -euo pipefail

sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
branch="${VERCEL_GIT_COMMIT_REF:-}"

# 1. Force-build escape hatch
if git log -1 --format=%s "$sha" 2>/dev/null | grep -qE '^ci: force[ -](redeploy|deploy|build)\b'; then
  echo "build: force-redeploy marker in commit subject"
  exit 1
fi

# 2. Skip main — deploy manually when you're ready to go live
if [ "$branch" = "main" ]; then
  echo "skip: main branch — use 'ci: force redeploy' to deploy"
  exit 0
fi

# 3. Skip all agent/loop branches
if [[ "$branch" == claude/* ]]; then
  echo "skip: agent branch"
  exit 0
fi

# 4+5. Skip docs-only / pause-sentinel commits
if git diff --quiet "$sha^" "$sha" -- \
     ':(exclude)docs/' \
     ':(exclude)*.md' \
     ':(exclude)LOOP_PAUSE' \
     2>/dev/null; then
  echo "skip: docs-only / pause-sentinel commit"
  exit 0
fi

# Otherwise: build (e.g. your own feature branches)
echo "build: changes outside skip patterns"
exit 1
