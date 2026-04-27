// Helper module for the auto-merge workflow. Exports two entry points:
//
//   signal({ github, context, core, number })
//     Evaluate the gates for a single PR and, if eligible, post a one-
//     time-per-head-SHA countdown comment.
//
//   sweep({ github, context, core })
//     List all open PRs carrying `auto-merge-safe`, re-evaluate gates +
//     quiet window, squash-merge ones that pass.
//
// Gate logic lives here (not split across YAML if: expressions) so it's
// readable, testable from one place, and consistent between signal +
// sweep paths.

const SAFE_LABEL = "auto-merge-safe";
const REVIEW_LABEL = "needs-human-review";
const QUIET_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
const HEAD_BRANCH_PATTERNS = [
  /^claude\/audit-remediation\//,
  /^claude\/audit-queue-/,
];

const COUNTDOWN_MARKER_PREFIX = "<!-- auto-merge-bot:countdown sha=";

function headBranchAllowed(branchName) {
  return HEAD_BRANCH_PATTERNS.some((re) => re.test(branchName));
}

async function getPr({ github, context, number }) {
  const { data: pr } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: number,
  });
  return pr;
}

async function listCheckRuns({ github, context, sha }) {
  const all = [];
  let page = 1;
  // GitHub paginates; check_runs.list_for_ref tops out at 100 per page.
  while (true) {
    const { data } = await github.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: sha,
      per_page: 100,
      page,
    });
    all.push(...data.check_runs);
    if (data.check_runs.length < 100) break;
    page += 1;
    if (page > 10) break; // safety
  }
  return all;
}

async function listIssueComments({ github, context, number }) {
  const all = [];
  let page = 1;
  while (true) {
    const { data } = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: number,
      per_page: 100,
      page,
    });
    all.push(...data);
    if (data.length < 100) break;
    page += 1;
    if (page > 10) break;
  }
  return all;
}

async function userHasWriteAccess({ github, context, username }) {
  try {
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      username,
    });
    return data.permission === "admin" || data.permission === "write";
  } catch (err) {
    // 404 = not a collaborator → no write access.
    return false;
  }
}

async function findStopComment({ github, context, number, sinceIso }) {
  const comments = await listIssueComments({ github, context, number });
  const sinceMs = new Date(sinceIso).getTime();
  for (const c of comments) {
    if (new Date(c.created_at).getTime() < sinceMs) continue;
    if (!/\bSTOP\b/.test(c.body || "")) continue;
    const allowed = await userHasWriteAccess({
      github,
      context,
      username: c.user.login,
    });
    if (allowed) return c;
  }
  return null;
}

function checksPassed(runs) {
  // All check runs must either have succeeded or been deliberately
  // skipped/neutral. None may be in_progress, queued, failure,
  // cancelled, timed_out, or action_required.
  if (runs.length === 0) return { ok: false, reason: "no checks reported yet" };
  for (const r of runs) {
    if (r.status !== "completed") {
      return { ok: false, reason: `check "${r.name}" still ${r.status}` };
    }
    const c = r.conclusion;
    if (c === "success" || c === "neutral" || c === "skipped") continue;
    return { ok: false, reason: `check "${r.name}" concluded ${c}` };
  }
  return { ok: true };
}

async function evaluateGates({ github, context, pr, requireQuietWindow }) {
  const reasons = [];

  if (pr.state !== "open") return { ok: false, reasons: ["pr not open"] };
  if (pr.draft) reasons.push("pr is draft");
  if (pr.base.ref !== "main") reasons.push(`base is ${pr.base.ref}, not main`);
  if (!headBranchAllowed(pr.head.ref)) {
    reasons.push(`head branch ${pr.head.ref} not in allowed namespace`);
  }

  const labels = (pr.labels || []).map((l) => l.name);
  if (!labels.includes(SAFE_LABEL)) reasons.push(`missing label ${SAFE_LABEL}`);
  if (labels.includes(REVIEW_LABEL)) {
    reasons.push(`has blocking label ${REVIEW_LABEL}`);
  }

  // GitHub computes mergeable lazily; fetch may need a retry.
  let mergeable = pr.mergeable;
  if (mergeable === null) {
    await new Promise((r) => setTimeout(r, 2000));
    const refreshed = await getPr({
      github,
      context,
      number: pr.number,
    });
    mergeable = refreshed.mergeable;
  }
  if (mergeable === false) reasons.push("merge conflicts");

  const runs = await listCheckRuns({ github, context, sha: pr.head.sha });
  const checkResult = checksPassed(runs);
  if (!checkResult.ok) reasons.push(checkResult.reason);

  // Pull head commit's authored time for the quiet-window check + STOP
  // comparison.
  const { data: headCommit } = await github.rest.repos.getCommit({
    owner: context.repo.owner,
    repo: context.repo.repo,
    ref: pr.head.sha,
  });
  const committedAtIso =
    headCommit.commit.committer?.date || headCommit.commit.author?.date;
  const committedAtMs = new Date(committedAtIso).getTime();
  const ageMs = Date.now() - committedAtMs;

  const stop = await findStopComment({
    github,
    context,
    number: pr.number,
    sinceIso: committedAtIso,
  });
  if (stop) reasons.push(`STOP comment from @${stop.user.login}`);

  if (requireQuietWindow && ageMs < QUIET_WINDOW_MS) {
    const remainingMin = Math.ceil((QUIET_WINDOW_MS - ageMs) / 60000);
    reasons.push(`quiet window: ${remainingMin}min left`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
    headSha: pr.head.sha,
    committedAtIso,
    committedAtMs,
    ageMs,
  };
}

async function findCountdownComment({ github, context, number, sha }) {
  const comments = await listIssueComments({ github, context, number });
  const marker = `${COUNTDOWN_MARKER_PREFIX}${sha} -->`;
  return comments.find((c) => (c.body || "").includes(marker));
}

async function postCountdown({ github, context, number, sha }) {
  const existing = await findCountdownComment({ github, context, number, sha });
  if (existing) return; // already posted for this SHA
  const body = [
    `${COUNTDOWN_MARKER_PREFIX}${sha} -->`,
    "Auto-merging in 60min unless a human comments **STOP**.",
    "",
    `Head SHA: \`${sha}\``,
    "",
    "Gates passed: label, branch, no conflicts, CI green, no STOP comment.",
    "",
    `Reply with the literal word \`STOP\` (uppercase) to cancel — works at any point before the squash-merge fires. STOP only counts from accounts with write access to this repo. To re-arm after a STOP, push a new commit (resets the quiet window).`,
  ].join("\n");
  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: number,
    body,
  });
}

async function signal({ github, context, core, number }) {
  const pr = await getPr({ github, context, number });
  // Signal does NOT enforce the 60-min window — we want the comment to
  // appear AS SOON AS gates are otherwise green so the founder gets the
  // full 60 min of warning.
  const result = await evaluateGates({
    github,
    context,
    pr,
    requireQuietWindow: false,
  });
  if (!result.ok) {
    core.info(`pr#${number}: not signaling — ${result.reasons.join("; ")}`);
    return;
  }
  await postCountdown({
    github,
    context,
    number,
    sha: result.headSha,
  });
  core.info(`pr#${number}: countdown posted for sha ${result.headSha}`);
}

async function sweep({ github, context, core }) {
  // Search for open PRs with the safe label. The search API beats
  // listing all PRs because most PRs won't carry it.
  const q = [
    `repo:${context.repo.owner}/${context.repo.repo}`,
    "is:pr",
    "is:open",
    `label:"${SAFE_LABEL}"`,
    `-label:"${REVIEW_LABEL}"`,
    "draft:false",
  ].join(" ");
  const { data } = await github.rest.search.issuesAndPullRequests({
    q,
    per_page: 50,
  });
  core.info(`sweep: ${data.items.length} candidate PR(s)`);

  for (const item of data.items) {
    const number = item.number;
    const pr = await getPr({ github, context, number });
    const result = await evaluateGates({
      github,
      context,
      pr,
      requireQuietWindow: true,
    });
    if (!result.ok) {
      core.info(`pr#${number}: skip — ${result.reasons.join("; ")}`);
      continue;
    }

    core.info(`pr#${number}: gates green and quiet — squash-merging`);
    try {
      await github.rest.pulls.merge({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: number,
        merge_method: "squash",
        sha: pr.head.sha, // refuse if HEAD moved between gate-eval and merge
      });
      // Best-effort branch delete. The "delete on merge" repo setting
      // may already handle this — that's fine, the API is idempotent.
      try {
        await github.rest.git.deleteRef({
          owner: context.repo.owner,
          repo: context.repo.repo,
          ref: `heads/${pr.head.ref}`,
        });
      } catch (err) {
        core.info(`pr#${number}: branch delete skipped (${err.message})`);
      }
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        body: "Auto-merged by `.github/workflows/auto-merge.yml`. Branch deleted.",
      });
    } catch (err) {
      core.warning(`pr#${number}: merge failed — ${err.message}`);
    }
  }
}

module.exports = { signal, sweep };
