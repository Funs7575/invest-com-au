/**
 * Bot findings diff — compares two runs to surface regressions and fixes.
 *
 * Finding IDs are deterministic hashes of (category + normalizedUrl + title),
 * so the same broken thing produces the same ID across runs. The diff uses IDs
 * as stable keys to classify each finding as: new (regression), resolved
 * (fixed), or stable (ongoing).
 *
 * Usage:
 *   # Auto-pick the two most recent runs (newest = current, second-newest = baseline):
 *   npm run bots:diff
 *
 *   # Compare explicit files:
 *   npm run bots:diff -- bots/.runs/run-A/findings.json bots/.runs/run-B/findings.json
 *
 *   # Fail on any critical/high regression (for CI):
 *   BOTS_DIFF_STRICT=1 npm run bots:diff
 *
 * Exit codes:
 *   0 — no regressions (or BOTS_DIFF_STRICT=0 and no critical/high regressions)
 *   1 — regressions found
 *   2 — usage/IO error
 */

import { promises as fs } from "node:fs";
import path from "node:path";

interface FindingMeta {
  runId: string;
  baseUrl: string;
  targetClass: string;
  startedAt: string;
  sessions?: number;
  personas?: string[];
}

interface Finding {
  id: string;
  severity: string;
  category: string;
  title: string;
  url: string;
  occurrences: number;
  sampleUrls?: string[];
  personas?: string[];
}

interface FindingsFile {
  meta: FindingMeta;
  findings: Finding[];
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const STRICT = process.env.BOTS_DIFF_STRICT === "1";

export function sortBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      b.occurrences - a.occurrences,
  );
}

export interface DiffResult {
  newFindings: Finding[];
  resolvedFindings: Finding[];
  stableFindings: Finding[];
  occurrenceChanges: Array<{ finding: Finding; before: number; after: number }>;
  critHighNew: Finding[];
}

export function computeDiff(baseline: FindingsFile, current: FindingsFile): DiffResult {
  const baselineIds = new Set(baseline.findings.map((f) => f.id));
  const currentIds = new Set(current.findings.map((f) => f.id));
  const baselineMap = new Map(baseline.findings.map((f) => [f.id, f]));

  const newFindings = sortBySeverity(current.findings.filter((f) => !baselineIds.has(f.id)));
  const resolvedFindings = sortBySeverity(baseline.findings.filter((f) => !currentIds.has(f.id)));
  const stableFindings = current.findings.filter((f) => baselineIds.has(f.id));

  const occurrenceChanges = stableFindings
    .filter((f) => {
      const b = baselineMap.get(f.id);
      return b && b.occurrences !== f.occurrences;
    })
    .map((f) => ({
      finding: f,
      before: baselineMap.get(f.id)!.occurrences,
      after: f.occurrences,
    }));

  const critHighNew = newFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );

  return { newFindings, resolvedFindings, stableFindings, occurrenceChanges, critHighNew };
}

function sev(s: string): string {
  const icons: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🔵",
    info: "⚪",
  };
  return `${icons[s] ?? "•"} ${s.toUpperCase()}`;
}

function countBySeverity(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  }
  return counts;
}

function formatCounts(counts: Record<string, number>): string {
  return ["critical", "high", "medium", "low", "info"]
    .filter((s) => (counts[s] ?? 0) > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(", ");
}

async function findLatestRuns(runsDir: string): Promise<[string, string]> {
  let entries: string[];
  try {
    entries = await fs.readdir(runsDir);
  } catch {
    throw new Error(`No bots/.runs directory found at ${runsDir}. Run the bot fleet first.`);
  }

  const dirs = entries.map((e) => path.join(runsDir, e));
  const stats = await Promise.all(
    dirs.map(async (d) => {
      try {
        const s = await fs.stat(d);
        if (!s.isDirectory()) return null;
        // Verify it has a findings.json
        await fs.access(path.join(d, "findings.json"));
        return { d, mtime: s.mtimeMs };
      } catch {
        return null;
      }
    }),
  );

  const valid = stats
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.mtime - a.mtime);

  if (valid.length < 2) {
    throw new Error(
      `Need at least 2 complete runs in ${runsDir} to diff. Found ${valid.length}. Run the fleet again.`,
    );
  }

  const currentDir = valid[0]!.d;
  const baselineDir = valid[1]!.d;
  return [path.join(baselineDir, "findings.json"), path.join(currentDir, "findings.json")];
}

async function loadFindings(filePath: string): Promise<FindingsFile> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as FindingsFile;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let baselinePath: string;
  let currentPath: string;

  if (args.length >= 2) {
    baselinePath = path.resolve(args[0]!);
    currentPath = path.resolve(args[1]!);
  } else {
    const runsDir = path.join(process.cwd(), "bots", ".runs");
    [baselinePath, currentPath] = await findLatestRuns(runsDir);
  }

  const [baseline, current] = await Promise.all([
    loadFindings(baselinePath),
    loadFindings(currentPath),
  ]);

  const { newFindings, resolvedFindings, stableFindings, occurrenceChanges, critHighNew } =
    computeDiff(baseline, current);

  const baselineMap = new Map(baseline.findings.map((f) => [f.id, f]));
  const changed = occurrenceChanges.map((c) => c.finding);

  console.log(`\n${"═".repeat(70)}`);
  console.log("  🤖 Bot findings diff");
  console.log(`${"═".repeat(70)}`);
  console.log(`  Baseline : ${baseline.meta.runId} (${baseline.meta.baseUrl})`);
  console.log(`  Current  : ${current.meta.runId} (${current.meta.baseUrl})`);
  console.log(`${"─".repeat(70)}`);
  console.log(
    `  Baseline: ${baseline.findings.length} finding(s) | ` +
    `Current: ${current.findings.length} finding(s)`,
  );
  console.log(`${"═".repeat(70)}\n`);

  // ── New (regressions) ────────────────────────────────────────────────────────
  if (newFindings.length === 0) {
    console.log("✅  No new findings (no regressions).\n");
  } else {
    const newCounts = countBySeverity(newFindings);
    console.log(`🚨  NEW / REGRESSIONS (${newFindings.length}):  ${formatCounts(newCounts)}`);
    for (const f of newFindings) {
      console.log(`    ${sev(f.severity)}  [${f.category}]  ${f.title}`);
      if (f.url) console.log(`       url: ${f.url}`);
      if (f.sampleUrls?.length) {
        for (const u of f.sampleUrls.slice(0, 3)) console.log(`       sample: ${u}`);
      }
    }
    console.log();
  }

  // ── Resolved ─────────────────────────────────────────────────────────────────
  if (resolvedFindings.length === 0) {
    console.log("ℹ️   No resolved findings (nothing newly fixed).\n");
  } else {
    const resolvedCounts = countBySeverity(resolvedFindings);
    console.log(`✅  RESOLVED / FIXED (${resolvedFindings.length}):  ${formatCounts(resolvedCounts)}`);
    for (const f of resolvedFindings) {
      console.log(`    ${sev(f.severity)}  [${f.category}]  ${f.title}`);
    }
    console.log();
  }

  // ── Occurrence changes ───────────────────────────────────────────────────────
  if (changed.length > 0) {
    console.log(`📈  OCCURRENCE CHANGES (${changed.length}):`);
    for (const f of sortBySeverity(changed)) {
      const before = baselineMap.get(f.id)!.occurrences;
      const delta = f.occurrences - before;
      const arrow = delta > 0 ? `↑ +${delta}` : `↓ ${delta}`;
      console.log(`    ${sev(f.severity)}  ${arrow}  [${f.category}]  ${f.title}`);
    }
    console.log();
  }

  // ── Stable ongoing ───────────────────────────────────────────────────────────
  const ongoingCritHigh = stableFindings.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  if (ongoingCritHigh.length > 0) {
    console.log(
      `⚠️   ONGOING CRITICAL/HIGH (${ongoingCritHigh.length}) — present in both runs, not yet fixed:`,
    );
    for (const f of sortBySeverity(ongoingCritHigh)) {
      const b = baselineMap.get(f.id);
      const note = b && b.occurrences !== f.occurrences
        ? ` (×${f.occurrences}, was ×${b.occurrences})`
        : ` (×${f.occurrences})`;
      console.log(`    ${sev(f.severity)}  [${f.category}]  ${f.title}${note}`);
    }
    console.log();
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`${"─".repeat(70)}`);
  console.log(
    `  New: ${newFindings.length} (${critHighNew.length} critical/high)  |  ` +
    `Resolved: ${resolvedFindings.length}  |  ` +
    `Stable: ${stableFindings.length - changed.length}  |  ` +
    `Changed occurrences: ${changed.length}`,
  );
  console.log(`${"═".repeat(70)}\n`);

  // Exit code.
  const failOn = STRICT ? newFindings.length > 0 : critHighNew.length > 0;
  if (failOn) {
    const msg = STRICT
      ? `${newFindings.length} new finding(s) — failing (BOTS_DIFF_STRICT=1).`
      : `${critHighNew.length} new critical/high finding(s).`;
    console.error(`[bots-diff] ❌  ${msg}`);
    process.exit(1);
  }

  console.log("[bots-diff] ✅  No critical/high regressions.");
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error("[bots-diff] Fatal error:", err instanceof Error ? err.message : err);
    process.exit(2);
  });
}
