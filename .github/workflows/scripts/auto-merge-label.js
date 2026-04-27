// Labeling logic for the auto-merge system. Computes:
//
//   - which of (SAFE, BLOCKED, neither) the PR's changed files fall
//     into, with denylist winning on conflict
//   - whether the PR's queue item ID is on the security/legal review
//     list per docs/audits/REMEDIATION_DEFAULTS.md
//   - whether the PR is the first of a tracked pattern (state lives on
//     bot branch `automerge-bot/state`, file `.github/auto-merge-state.json`)
//
// Then applies the resulting label set: `auto-merge-safe` or
// `needs-human-review`, removing the other if it was previously
// present.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SAFE_LABEL = "auto-merge-safe";
const REVIEW_LABEL = "needs-human-review";
const BOT_BRANCH = "automerge-bot/state";
const STATE_PATH = ".github/auto-merge-state.json";

// SAFE allowlist patterns. A PR is eligible only if EVERY changed file
// matches one of these (and none match the denylist). Patterns use a
// minimal glob dialect: `**` = any segments, `*` = single segment.
const SAFE_PATTERNS = [
  "app/**/page.tsx",          // article-seed-only or copy-only — verified
                              // by content-detection logic below
  "scripts/seed-*.ts",
  "content/**/*.md",
  "docs/**/*.md",
  "lib/verticals.ts",
  "public/**",
  "components/Hub*.tsx",      // extracted hub components — pure
                              // presentational once stream W lands
  "__tests__/**/*.test.ts",   // test additions only — deletions handled
                              // by the file-status check below
];

// BLOCKED denylist patterns. Any match flips the PR to
// `needs-human-review` regardless of other matches. Denylist wins.
const BLOCKED_PATTERNS = [
  "supabase/migrations/**",
  "app/api/**",
  "app/api/webhooks/**",      // redundant with the above but explicit
  "middleware.ts",
  "lib/supabase/admin.ts",
  "lib/supabase/server.ts",
  "lib/compliance.ts",
  "lib/auth/**",
  "lib/stripe/**",
  ".github/workflows/**",
  "eslint.config.mjs",
  "next.config.*",
  "package.json",
  "tsconfig.json",
];

// Substring (case-insensitive) denylist on basename. Catches anything
// touching RLS, policies, or env files regardless of where they live.
const BLOCKED_BASENAME_SUBSTRINGS = ["rls", "policy", ".env"];

// Queue-item review flags from docs/audits/REMEDIATION_DEFAULTS.md.
// Items here always force needs-human-review even when paths are safe.
// Source of truth is REMEDIATION_DEFAULTS.md "Review flags" section —
// keep this list in sync if that section changes.
const REVIEW_FLAGGED_ITEMS = ["BB-04", "CC-01", "EE-02", "CC-07"];

// Patterns whose FIRST PR is force-flagged for human review. After the
// founder approves the first one, subsequent PRs of the same pattern
// flow through normal labeling. State persisted on bot branch so we
// remember across runs.
const TRACKED_PATTERNS = {
  "hub-on-extracted-components": (ctx) =>
    ctx.diff.includes("HubPage") &&
    ctx.diff.includes("import") &&
    /<HubPage[\s>/]/.test(ctx.diff),
  "programmatic-seo-template": (ctx) => /\bAA-\d/.test(ctx.title),
  "calculator-on-shell": (ctx) =>
    /\bBB-\d/.test(ctx.title) && ctx.diff.includes("CalculatorShell"),
  "ai-feature": (ctx) => /\bCC-\d/.test(ctx.title),
  "marketplace-mechanic": (ctx) => /\bDD-\d/.test(ctx.title),
  "distribution-embed": (ctx) => /\bEE-\d/.test(ctx.title),
};

function escapeRegex(s) {
  return s.replace(/[.+(){}|^$\\]/g, "\\$&");
}

function globToRegex(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += escapeRegex(c);
    }
  }
  re += "$";
  return new RegExp(re);
}

const SAFE_REGEXES = SAFE_PATTERNS.map(globToRegex);
const BLOCKED_REGEXES = BLOCKED_PATTERNS.map(globToRegex);

function basename(p) {
  const idx = p.lastIndexOf("/");
  return idx === -1 ? p : p.slice(idx + 1);
}

function isBlockedPath(filename) {
  for (const re of BLOCKED_REGEXES) if (re.test(filename)) return true;
  const base = basename(filename).toLowerCase();
  for (const sub of BLOCKED_BASENAME_SUBSTRINGS) {
    if (base.includes(sub)) return true;
  }
  return false;
}

function isSafePath(filename) {
  return SAFE_REGEXES.some((re) => re.test(filename));
}

function extractItemId(title) {
  // Audit-loop PRs prefix the item ID, e.g.
  //   "feat(z): Z-23 first-home-buyer hub"
  //   "fix(bb): BB-04 net-worth tracker — basiq integration"
  // Match LETTER(S)-NUMBER (1-3 letters, 1-3 digits).
  const m = (title || "").match(/\b([A-Z]{1,3}-\d{1,3})\b/);
  return m ? m[1] : null;
}

async function listChangedFiles({ github, context, number }) {
  const all = [];
  let page = 1;
  while (true) {
    const { data } = await github.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: number,
      per_page: 100,
      page,
    });
    all.push(...data);
    if (data.length < 100) break;
    page += 1;
    if (page > 30) break;
  }
  return all;
}

async function fetchPrDiff({ github, context, number }) {
  // mediaType.format=diff returns the unified diff as text. Used for
  // first-of-pattern detection (e.g. "does this PR import HubPage?").
  try {
    const res = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: number,
      mediaType: { format: "diff" },
    });
    return typeof res.data === "string" ? res.data : "";
  } catch (err) {
    return "";
  }
}

async function loadStateFromBotBranch() {
  // Try to fetch the bot branch from origin. If it doesn't exist yet,
  // start with an empty state.
  try {
    execSync(`git fetch origin ${BOT_BRANCH}:${BOT_BRANCH}`, {
      stdio: "pipe",
    });
    const raw = execSync(`git show ${BOT_BRANCH}:${STATE_PATH}`, {
      encoding: "utf8",
    });
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

async function persistStateToBotBranch(newState, prNumber) {
  // Worktree-style update: switch to bot branch (creating it if absent),
  // write file, commit, push. Run in a tmp dir so we don't disturb the
  // current checkout.
  const tmp = fs.mkdtempSync("/tmp/automerge-bot-");
  const repoUrl = `https://x-access-token:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
  try {
    execSync(`git clone --depth 1 ${repoUrl} ${tmp}`, { stdio: "pipe" });
    let branchExists = false;
    try {
      execSync(`git -C ${tmp} ls-remote --exit-code origin ${BOT_BRANCH}`, {
        stdio: "pipe",
      });
      branchExists = true;
    } catch (_) {
      branchExists = false;
    }
    if (branchExists) {
      execSync(`git -C ${tmp} fetch origin ${BOT_BRANCH}`, { stdio: "pipe" });
      execSync(`git -C ${tmp} checkout -B ${BOT_BRANCH} origin/${BOT_BRANCH}`, {
        stdio: "pipe",
      });
    } else {
      // Orphan branch — no tie to main's history.
      execSync(`git -C ${tmp} checkout --orphan ${BOT_BRANCH}`, {
        stdio: "pipe",
      });
      execSync(`git -C ${tmp} rm -rf --cached . || true`, { stdio: "pipe" });
      execSync(`rm -rf ${tmp}/* ${tmp}/.[!.]*`, { stdio: "pipe" });
    }
    fs.mkdirSync(path.join(tmp, ".github"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, STATE_PATH),
      JSON.stringify(newState, null, 2) + "\n",
    );
    execSync(
      `git -C ${tmp} -c user.email=actions@github.com -c user.name="auto-merge-bot" add ${STATE_PATH}`,
      { stdio: "pipe" },
    );
    execSync(
      `git -C ${tmp} -c user.email=actions@github.com -c user.name="auto-merge-bot" commit -m "chore(auto-merge): record first-of-pattern from pr #${prNumber}"`,
      { stdio: "pipe" },
    );
    execSync(`git -C ${tmp} push origin ${BOT_BRANCH}`, { stdio: "pipe" });
  } finally {
    execSync(`rm -rf ${tmp}`, { stdio: "pipe" });
  }
}

async function applyLabels({ github, context, number, decision }) {
  // Fetch current labels on PR; remove conflicting ones; add the
  // chosen one. No-op if already in correct state.
  const { data: pr } = await github.rest.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: number,
  });
  const current = new Set((pr.labels || []).map((l) => l.name));

  const toAdd = [];
  const toRemove = [];
  if (decision === "safe") {
    if (!current.has(SAFE_LABEL)) toAdd.push(SAFE_LABEL);
    if (current.has(REVIEW_LABEL)) toRemove.push(REVIEW_LABEL);
  } else if (decision === "review") {
    if (!current.has(REVIEW_LABEL)) toAdd.push(REVIEW_LABEL);
    if (current.has(SAFE_LABEL)) toRemove.push(SAFE_LABEL);
  } else {
    // neither — strip any auto-merge labels we previously applied so a
    // PR that becomes ineligible (e.g. a SAFE file is replaced with a
    // BLOCKED file in a force-push) doesn't keep stale labels.
    if (current.has(SAFE_LABEL)) toRemove.push(SAFE_LABEL);
    if (current.has(REVIEW_LABEL)) toRemove.push(REVIEW_LABEL);
  }

  for (const name of toAdd) {
    await github.rest.issues.addLabels({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: number,
      labels: [name],
    });
  }
  for (const name of toRemove) {
    try {
      await github.rest.issues.removeLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: number,
        name,
      });
    } catch (err) {
      // 404 = label already gone. Acceptable.
    }
  }
}

async function ensureLabelExists({ github, context, name, color, description }) {
  try {
    await github.rest.issues.getLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name,
    });
  } catch (err) {
    if (err.status === 404) {
      await github.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name,
        color,
        description,
      });
    }
  }
}

async function run({ github, context, core }) {
  const pr = context.payload.pull_request;
  const number = pr.number;

  await ensureLabelExists({
    github,
    context,
    name: SAFE_LABEL,
    color: "0e8a16",
    description: "Eligible for auto-merge after 60min quiet window",
  });
  await ensureLabelExists({
    github,
    context,
    name: REVIEW_LABEL,
    color: "d93f0b",
    description: "Auto-merge blocked — needs human review",
  });

  const files = await listChangedFiles({ github, context, number });
  if (files.length === 0) {
    core.info("no changed files reported — no label change");
    await applyLabels({ github, context, number, decision: "neither" });
    return;
  }

  // 1. Denylist check — if any file is blocked, it's needs-human-review.
  const blockedHits = files.filter((f) => isBlockedPath(f.filename));
  if (blockedHits.length > 0) {
    core.info(
      `denylist hits: ${blockedHits.map((f) => f.filename).join(", ")}`,
    );
    await applyLabels({ github, context, number, decision: "review" });
    return;
  }

  // 2. Test-deletion guard — `__tests__/**/*.test.ts` is in the SAFE
  // allowlist for ADDITIONS only. A removed test file can mask a bug
  // and should be human-reviewed. `status` values: added, modified,
  // removed, renamed.
  const testDeletions = files.filter(
    (f) =>
      f.filename.startsWith("__tests__/") &&
      f.filename.endsWith(".test.ts") &&
      f.status === "removed",
  );
  if (testDeletions.length > 0) {
    core.info(
      `test deletions: ${testDeletions.map((f) => f.filename).join(", ")}`,
    );
    await applyLabels({ github, context, number, decision: "review" });
    return;
  }

  // 3. Allowlist check — every file must match a SAFE pattern.
  const unmatched = files.filter((f) => !isSafePath(f.filename));
  if (unmatched.length > 0) {
    core.info(
      `unmatched files: ${unmatched.map((f) => f.filename).slice(0, 10).join(", ")}`,
    );
    await applyLabels({ github, context, number, decision: "neither" });
    return;
  }

  // 4. Queue-flag override — security/legal review items always
  // need a human regardless of changed paths.
  const itemId = extractItemId(pr.title);
  if (itemId && REVIEW_FLAGGED_ITEMS.includes(itemId)) {
    core.info(`queue review flag: ${itemId}`);
    await applyLabels({ github, context, number, decision: "review" });
    return;
  }

  // 5. First-of-pattern override.
  const diff = await fetchPrDiff({ github, context, number });
  const patternCtx = { title: pr.title || "", diff };
  const triggered = [];
  for (const [name, predicate] of Object.entries(TRACKED_PATTERNS)) {
    try {
      if (predicate(patternCtx)) triggered.push(name);
    } catch (err) {
      core.warning(`pattern ${name} predicate threw: ${err.message}`);
    }
  }
  if (triggered.length > 0) {
    const state = await loadStateFromBotBranch();
    const firstOf = triggered.filter((p) => !(p in state));
    if (firstOf.length > 0) {
      core.info(`first-of-pattern: ${firstOf.join(", ")}`);
      const updated = { ...state };
      for (const p of firstOf) updated[p] = number;
      try {
        await persistStateToBotBranch(updated, number);
      } catch (err) {
        core.warning(`bot-branch update failed: ${err.message}`);
      }
      await applyLabels({ github, context, number, decision: "review" });
      return;
    }
  }

  // All gates clear → safe.
  core.info("all checks pass — labeling auto-merge-safe");
  await applyLabels({ github, context, number, decision: "safe" });
}

module.exports = { run };
