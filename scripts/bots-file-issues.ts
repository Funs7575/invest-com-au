/**
 * Bots → GitHub Issues filer.
 *
 * Reads the latest bot run's findings.json and creates one GitHub issue per
 * Critical/High finding that doesn't already have a matching open issue.
 * Deduplication is done by matching the issue title: if an open issue with
 * the exact same title already exists it is skipped (not duplicated).
 *
 * Usage:
 *   # After a bot run (bots/.runs/<runId>/findings.json must exist):
 *   npm run bots:file-issues
 *
 *   # Or against a specific findings file:
 *   BOTS_FINDINGS_FILE=bots/.runs/my-run/findings.json npm run bots:file-issues
 *
 * Requires:
 *   - GITHUB_TOKEN (or gh CLI logged in) for issue creation
 *   - gh CLI installed (comes pre-installed on GitHub Actions runners)
 *
 * Safe to run repeatedly — existing open issues are skipped. Closed issues
 * do NOT block re-filing (they may have been closed as won't-fix or re-opened).
 *
 * Filed issues are labelled: bot-finding, <severity>, bot-auto
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

interface FindingsFile {
  meta: {
    runId: string;
    baseUrl: string;
    targetClass: string;
    startedAt: string;
  };
  findings: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    detail: string;
    url: string;
    occurrences: number;
    sampleUrls: string[];
    personas: string[];
  }>;
}

const AUTO_LABEL = "bot-finding";
const DRY_RUN = process.env.BOTS_DRY_RUN === "1";
const FILE_SEVERITY = new Set(["critical", "high"]);

/** Resolve the findings.json path to use. */
async function resolveFindingsPath(): Promise<string> {
  const explicit = process.env.BOTS_FINDINGS_FILE;
  if (explicit) {
    await fs.access(explicit);
    return explicit;
  }

  const runsDir = path.join(process.cwd(), "bots", ".runs");
  let dirs: string[];
  try {
    dirs = (await fs.readdir(runsDir)).map((d) => path.join(runsDir, d));
  } catch {
    throw new Error(`No bots/.runs directory found at ${runsDir}. Run the bot fleet first.`);
  }

  // Pick the most recently modified run directory.
  const stats = await Promise.all(
    dirs.map(async (d) => ({ d, mtime: (await fs.stat(d)).mtimeMs })),
  );
  const newest = stats.sort((a, b) => b.mtime - a.mtime)[0];
  if (!newest) throw new Error("No run directories found in bots/.runs");

  const fp = path.join(newest.d, "findings.json");
  await fs.access(fp);
  return fp;
}

/** Check if an open issue with this title already exists via gh CLI. */
function openIssueExists(title: string): boolean {
  try {
    const escaped = title.replace(/"/g, '\\"').replace(/`/g, "\\`");
    const out = execSync(
      `gh issue list --state open --search "${escaped}" --json title --limit 20`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    const issues = JSON.parse(out) as Array<{ title: string }>;
    return issues.some((i) => i.title === title);
  } catch {
    // If gh isn't available or the search fails, skip dedup (safer to file than miss).
    return false;
  }
}

/** Create a GitHub issue via the gh CLI. */
function createIssue(
  title: string,
  body: string,
  severity: string,
): void {
  const safeTitle = title.replace(/"/g, "'");
  const labels = [AUTO_LABEL, severity, "bot-auto"].join(",");

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create issue: "${safeTitle}" (${severity})`);
    return;
  }

  try {
    execSync(
      `gh issue create --title "${safeTitle}" --body "${body.replace(/"/g, "'").replace(/\n/g, "\\n")}" --label "${labels}"`,
      { stdio: "inherit" },
    );
  } catch (err) {
    console.error(`Failed to create issue for "${safeTitle}":`, err);
  }
}

async function main(): Promise<void> {
  const findingsPath = await resolveFindingsPath();
  console.log(`[bots-file-issues] Reading findings from: ${findingsPath}`);

  const raw = await fs.readFile(findingsPath, "utf8");
  const data = JSON.parse(raw) as FindingsFile;
  const { meta, findings } = data;

  const targets = findings.filter((f) => FILE_SEVERITY.has(f.severity));
  console.log(
    `[bots-file-issues] ${targets.length} Critical/High finding(s) from run ${meta.runId} ` +
    `(${meta.baseUrl}, ${meta.targetClass}).`,
  );

  if (targets.length === 0) {
    console.log("[bots-file-issues] Nothing to file. ✅");
    return;
  }

  let filed = 0;
  let skipped = 0;

  for (const finding of targets) {
    const issueTitle = `[bot] ${finding.severity.toUpperCase()}: ${finding.title}`;

    if (openIssueExists(issueTitle)) {
      console.log(`  ⊘ Skipped (already open): ${issueTitle}`);
      skipped++;
      continue;
    }

    const sampleUrls = finding.sampleUrls.slice(0, 5).map((u) => `- ${u}`).join("\n");
    const personas = finding.personas.slice(0, 5).join(", ");

    const body = [
      `## Bot finding — ${finding.severity.toUpperCase()}`,
      "",
      `**Category:** \`${finding.category}\`  `,
      `**Occurrences:** ${finding.occurrences}  `,
      `**Detected by personas:** ${personas || "unknown"}`,
      "",
      "### Detail",
      finding.detail,
      "",
      "### Sample URLs",
      sampleUrls || "- (no sample URLs)",
      "",
      "---",
      `*Filed automatically from bot run \`${meta.runId}\` against \`${meta.baseUrl}\` (${meta.targetClass}) at ${meta.startedAt}.*`,
      `*Remove the \`bot-auto\` label if you take ownership of this issue.*`,
    ].join("\n");

    createIssue(issueTitle, body, finding.severity);
    console.log(`  ✓ Filed: ${issueTitle}`);
    filed++;
  }

  console.log(`\n[bots-file-issues] Done. Filed: ${filed}, Skipped (duplicate): ${skipped}.`);
}

main().catch((err) => {
  console.error("[bots-file-issues] Fatal error:", err);
  process.exit(1);
});
