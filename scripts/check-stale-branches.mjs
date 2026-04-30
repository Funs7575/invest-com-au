#!/usr/bin/env node
// @ts-check
import { fileURLToPath } from "node:url";
/**
 * Stale-branch detector.
 *
 * Lists remote branches with no commits in the last STALE_DAYS days that
 * are not yet merged into main. Surfaces the branch sprawl that accumulates
 * when many parallel remediation streams are in flight (~25 streams +
 * `*-supp` branches at the time of writing).
 *
 * Doesn't delete anything — only reports. The founder decides whether each
 * stale branch should be merged, rebased, or abandoned.
 *
 * Usage:
 *   npm run audit:stale-branches           # local (requires git fetch first)
 *   node scripts/check-stale-branches.mjs
 *
 * Exit codes:
 *   0  no stale branches above threshold
 *   1  one or more stale branches found
 *
 * Tuning:
 *   STALE_DAYS env var (default 7) — minimum days since last commit
 *   PROTECTED env var — comma-separated branches never reported (default
 *                       "main,master,develop,staging,production")
 */

import { execSync } from "node:child_process";

const STALE_DAYS = Number.parseInt(process.env.STALE_DAYS ?? "7", 10);
const PROTECTED = new Set(
  (process.env.PROTECTED ?? "main,master,develop,staging,production")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/**
 * @param {string} cmd
 * @returns {string}
 */
function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

/** @returns {Set<string>} branch names already merged into origin/main */
function getMergedBranches() {
  try {
    const raw = sh("git branch -r --merged origin/main");
    return new Set(
      raw
        .split("\n")
        .map((l) => l.trim().replace(/^origin\//, ""))
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

/** @returns {Array<{name: string, lastCommit: string, ageDays: number, author: string, subject: string}>} */
function listRemoteBranches() {
  let raw;
  try {
    raw = sh(
      `git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(refname:short)|%(committerdate:iso8601)|%(authorname)|%(subject)'`
    );
  } catch {
    return [];
  }
  const now = Date.now();
  /** @type {Array<{name: string, lastCommit: string, ageDays: number, author: string, subject: string}>} */
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const [refname, committerDate, author, subject] = line.split("|");
    if (!refname || !committerDate) continue;
    const name = refname.replace(/^origin\//, "");
    if (PROTECTED.has(name)) continue;
    if (name === "HEAD") continue;
    const ts = Date.parse(committerDate);
    if (Number.isNaN(ts)) continue;
    const ageDays = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
    out.push({
      name,
      lastCommit: committerDate.split(" ")[0] ?? committerDate,
      ageDays,
      author: author ?? "?",
      subject: (subject ?? "").slice(0, 80),
    });
  }
  return out;
}

async function main() {
  const merged = getMergedBranches();
  const branches = listRemoteBranches();
  const stale = branches.filter(
    (b) => b.ageDays >= STALE_DAYS && !merged.has(b.name)
  );

  if (stale.length === 0) {
    console.log(
      `Stale-branch sweep passed — no unmerged remote branches older than ${STALE_DAYS} days.`
    );
    process.exit(0);
  }

  console.error(
    `\n::warning::Stale-branch sweep found ${stale.length} unmerged branch(es) ≥${STALE_DAYS} days old.\n`
  );
  for (const b of stale) {
    console.error(
      `  ✗  ${b.name}  (${b.ageDays}d · last ${b.lastCommit} · ${b.author})`
    );
    if (b.subject) console.error(`       ${b.subject}`);
  }
  console.error(
    "\nFix: rebase + merge, close the PR, or delete the branch with `git push origin --delete <name>`."
  );
  console.error(
    "Tune via STALE_DAYS env var (default 7) or PROTECTED for never-reported branches."
  );
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("check-stale-branches: unexpected error:", err);
    process.exit(1);
  });
}
