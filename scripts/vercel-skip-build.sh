#!/bin/bash
# Vercel "Ignored Build Step" — exit 0 = SKIP build, exit 1 = BUILD.
#
# Default policy: SKIP everything except an explicit force-redeploy marker.
# This matches the project's manual-deploy posture (the site deploys on
# demand, not on every push) and stops stray branches — Dependabot, the
# auto-merge stats bot, ad-hoc bot branches — from each spinning up a build
# machine.
#
# Cost-control hardening (2026-05-29): the previous version fell through to
# BUILD for any branch that wasn't main / claude/* / docs-only. The
# `automerge-bot/stats` branch matched none of those rules, so every
# "refresh stats badge" push ran a full build (on the Turbo machine, with
# real $ per build). Flipping the default to SKIP closes that leak and any
# future stray-branch leak by construction.
#
# To deploy to production: push a commit whose subject starts with
# "ci: force redeploy" (or "ci: force deploy" / "ci: force build").

set -e

sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
branch="${VERCEL_GIT_COMMIT_REF:-}"

# The ONLY path that builds: an explicit force-redeploy marker in the
# triggering commit's subject.
if git log -1 --format=%s "$sha" 2>/dev/null | grep -qE '^ci: force[ -](redeploy|deploy|build)\b'; then
  echo "build: force-redeploy marker in commit subject"
  exit 1
fi

# Everything else skips. Branch-specific messages are kept purely so the
# Vercel build log says *why* it skipped.
if [ "$branch" = "main" ]; then
  echo "skip: main branch — push a 'ci: force redeploy' commit to deploy"
elif [[ "$branch" == claude/* ]]; then
  echo "skip: agent/loop branch"
else
  echo "skip: default-skip policy (no force-redeploy marker) — branch '$branch'"
fi
exit 0
