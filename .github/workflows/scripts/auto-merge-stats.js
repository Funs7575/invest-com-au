// Compute the auto-merge stats payload for the README badge.
// Returns a shields.io "endpoint" JSON object.
//
// Counted facts:
//   - merged_this_week: PRs whose merge commit lands within the past 7d
//     AND whose body or comments include the auto-merge bot's
//     "Auto-merged by" footer (so we don't count human-merged PRs).
//   - waiting_for_review: open PRs that carry the `needs-human-review`
//     label.
//   - avg_hours_to_merge: mean over `merged_this_week` of (merged_at -
//     head_commit_authored_at). Reported in hours, rounded to 1
//     decimal. If no PRs merged this week, omitted from the message.

const SAFE_LABEL = "auto-merge-safe";
const REVIEW_LABEL = "needs-human-review";
const AUTO_MERGE_FOOTER = "Auto-merged by `.github/workflows/auto-merge.yml`";

async function listAllPages(fn, params, key = "items") {
  const all = [];
  let page = 1;
  while (true) {
    const { data } = await fn({ ...params, per_page: 100, page });
    const arr = Array.isArray(data) ? data : data[key] || [];
    all.push(...arr);
    if (arr.length < 100) break;
    page += 1;
    if (page > 30) break;
  }
  return all;
}

async function compute({ github, context }) {
  const { owner, repo } = context.repo;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().slice(0, 10);

  // Closed PRs merged in the last 7 days.
  const mergedQuery = [
    `repo:${owner}/${repo}`,
    "is:pr",
    "is:merged",
    `merged:>=${sevenDaysAgoIso}`,
  ].join(" ");
  const mergedSearch = await github.rest.search.issuesAndPullRequests({
    q: mergedQuery,
    per_page: 100,
  });

  let mergedThisWeek = 0;
  const merge_durations_hours = [];

  for (const item of mergedSearch.data.items) {
    // Look at the bot's auto-merge footer comment to determine
    // whether the auto-merge workflow merged it (vs a human).
    const comments = await listAllPages(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: item.number,
    });
    const isAutoMerged = comments.some((c) =>
      (c.body || "").includes(AUTO_MERGE_FOOTER),
    );
    if (!isAutoMerged) continue;
    mergedThisWeek += 1;

    const { data: pr } = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: item.number,
    });
    if (!pr.merged_at || !pr.head?.sha) continue;
    try {
      const { data: headCommit } = await github.rest.repos.getCommit({
        owner,
        repo,
        ref: pr.head.sha,
      });
      const committedAt =
        headCommit.commit.committer?.date || headCommit.commit.author?.date;
      if (!committedAt) continue;
      const ageMs = new Date(pr.merged_at).getTime() - new Date(committedAt).getTime();
      if (ageMs > 0) merge_durations_hours.push(ageMs / 3600000);
    } catch (_) {
      // Source branch may have been deleted — head SHA can still be
      // resolved unless the merge commit was already pruned. Skip.
    }
  }

  // Open PRs awaiting human review.
  const waitingQuery = [
    `repo:${owner}/${repo}`,
    "is:pr",
    "is:open",
    `label:"${REVIEW_LABEL}"`,
  ].join(" ");
  const waitingSearch = await github.rest.search.issuesAndPullRequests({
    q: waitingQuery,
    per_page: 1,
  });
  const waiting = waitingSearch.data.total_count;

  let avgHours = null;
  if (merge_durations_hours.length > 0) {
    const sum = merge_durations_hours.reduce((a, b) => a + b, 0);
    avgHours = Math.round((sum / merge_durations_hours.length) * 10) / 10;
  }

  const parts = [`${mergedThisWeek} merged · ${waiting} pending`];
  if (avgHours !== null) parts.push(`${avgHours}h avg`);
  const message = parts.join(" · ");

  // Shields.io endpoint format. Color shifts from green→yellow→orange
  // as the pending queue grows so the badge tells the founder
  // visually that humans need to look at PRs.
  let color = "brightgreen";
  if (waiting >= 3) color = "yellow";
  if (waiting >= 6) color = "orange";
  if (waiting >= 10) color = "red";

  return {
    schemaVersion: 1,
    label: "auto-merge",
    message,
    color,
    cacheSeconds: 300,
  };
}

module.exports = { compute };
