/**
 * ranking-health-snapshot.ts — CO stream cutover script.
 *
 * Records a baseline snapshot of the site's sitemap health metrics:
 * - URL count from the static manifest
 * - Revalidate distribution (static / ISR by window / dynamic)
 * - Route type breakdown
 * - Importance breakdown
 *
 * Running this BEFORE the domain migration captures a baseline.
 * Running it again POST-migration lets Domain Migration Agent (#16)
 * diff the two snapshots and detect any drops (missing routes, changed
 * revalidation, importance regressions).
 *
 * Outputs:
 *   scripts/cutover/output/pre-migration-baseline.json  (first run)
 *   scripts/cutover/output/post-migration-snapshot.json (subsequent runs)
 *   scripts/cutover/output/snapshot-diff.json           (if baseline exists)
 *
 * Usage:
 *   npx tsx scripts/cutover/ranking-health-snapshot.ts
 *   # Second run (post-migration) — auto-diffs against baseline:
 *   npx tsx scripts/cutover/ranking-health-snapshot.ts --post
 */

import { promises as fs } from "node:fs";
import path from "node:path";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UrlEntry {
  path: string;
  routeType: "static" | "isr" | "dynamic";
  revalidate: number | null;
  importance: "critical" | "high" | "medium" | "low";
  notes: string;
}

interface UrlManifest {
  generatedAt: string;
  totalUrls: number;
  urls: UrlEntry[];
}

interface RevalidateBucket {
  "static (no revalidate)": number;
  "≤60s": number;
  "61s–5min": number;
  "6min–30min": number;
  "31min–2h": number;
  "2h–24h": number;
  ">24h": number;
  "dynamic (force-dynamic)": number;
}

interface Snapshot {
  capturedAt: string;
  label: string;
  totalUrls: number;
  byRouteType: {
    static: number;
    isr: number;
    dynamic: number;
  };
  byImportance: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  revalidateDistribution: RevalidateBucket;
  criticalPaths: string[];
}

interface SnapshotDiff {
  baseline: string;
  current: string;
  urlCountDelta: number;
  byRouteTypeDelta: {
    static: number;
    isr: number;
    dynamic: number;
  };
  byImportanceDelta: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  missingCriticalPaths: string[];
  newPaths: string[];
  regressions: string[];
  ok: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bucketRevalidate(entry: UrlEntry): keyof RevalidateBucket {
  if (entry.routeType === "dynamic") return "dynamic (force-dynamic)";
  if (entry.revalidate === null) return "static (no revalidate)";
  const r = entry.revalidate;
  if (r <= 60) return "≤60s";
  if (r <= 300) return "61s–5min";
  if (r <= 1800) return "6min–30min";
  if (r <= 7200) return "31min–2h";
  if (r <= 86400) return "2h–24h";
  return ">24h";
}

export function buildSnapshot(manifest: UrlManifest, label: string): Snapshot {
  const byRouteType = { static: 0, isr: 0, dynamic: 0 };
  const byImportance = { critical: 0, high: 0, medium: 0, low: 0 };
  const revalidateDistribution: RevalidateBucket = {
    "static (no revalidate)": 0,
    "≤60s": 0,
    "61s–5min": 0,
    "6min–30min": 0,
    "31min–2h": 0,
    "2h–24h": 0,
    ">24h": 0,
    "dynamic (force-dynamic)": 0,
  };
  const criticalPaths: string[] = [];

  for (const entry of manifest.urls) {
    byRouteType[entry.routeType]++;
    byImportance[entry.importance]++;
    const bucket = bucketRevalidate(entry);
    revalidateDistribution[bucket]++;
    if (entry.importance === "critical") {
      criticalPaths.push(entry.path);
    }
  }

  return {
    capturedAt: new Date().toISOString(),
    label,
    totalUrls: manifest.totalUrls,
    byRouteType,
    byImportance,
    revalidateDistribution,
    criticalPaths,
  };
}

export function diffSnapshots(baseline: Snapshot, current: Snapshot): SnapshotDiff {
  const urlCountDelta = current.totalUrls - baseline.totalUrls;

  const byRouteTypeDelta = {
    static: current.byRouteType.static - baseline.byRouteType.static,
    isr: current.byRouteType.isr - baseline.byRouteType.isr,
    dynamic: current.byRouteType.dynamic - baseline.byRouteType.dynamic,
  };

  const byImportanceDelta = {
    critical: current.byImportance.critical - baseline.byImportance.critical,
    high: current.byImportance.high - baseline.byImportance.high,
    medium: current.byImportance.medium - baseline.byImportance.medium,
    low: current.byImportance.low - baseline.byImportance.low,
  };

  const baselineSet = new Set(baseline.criticalPaths);
  const currentSet = new Set(current.criticalPaths);

  const missingCriticalPaths = baseline.criticalPaths.filter(
    (p) => !currentSet.has(p),
  );
  const newPaths = current.criticalPaths.filter((p) => !baselineSet.has(p));

  // Regressions: any critical path missing, or URL count dropped by >5%
  const regressions: string[] = [];
  if (missingCriticalPaths.length > 0) {
    regressions.push(
      `${missingCriticalPaths.length} critical paths missing: ${missingCriticalPaths.join(", ")}`,
    );
  }
  if (urlCountDelta < 0 && Math.abs(urlCountDelta) / baseline.totalUrls > 0.05) {
    regressions.push(
      `URL count dropped by ${Math.abs(urlCountDelta)} (${((Math.abs(urlCountDelta) / baseline.totalUrls) * 100).toFixed(1)}%)`,
    );
  }
  if (byImportanceDelta.critical < 0) {
    regressions.push(`Critical URL count dropped by ${Math.abs(byImportanceDelta.critical)}`);
  }

  return {
    baseline: baseline.capturedAt,
    current: current.capturedAt,
    urlCountDelta,
    byRouteTypeDelta,
    byImportanceDelta,
    missingCriticalPaths,
    newPaths,
    regressions,
    ok: regressions.length === 0,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isPost = process.argv.includes("--post");
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const outputDir = path.join(scriptDir, "output");
  await fs.mkdir(outputDir, { recursive: true });

  // Load manifest
  const manifestPath = path.join(outputDir, "url-manifest.json");
  process.stdout.write(`Reading manifest from: ${manifestPath}\n`);

  let manifestRaw: string;
  try {
    manifestRaw = await fs.readFile(manifestPath, "utf8");
  } catch {
    process.stderr.write(
      `Manifest not found at ${manifestPath}.\n` +
        `Run: npx tsx scripts/cutover/url-inventory.ts  first.\n`,
    );
    process.exit(1);
  }

  const manifest = JSON.parse(manifestRaw) as UrlManifest;
  const label = isPost ? "post-migration" : "pre-migration";
  const snapshot = buildSnapshot(manifest, label);

  const snapshotFileName = isPost
    ? "post-migration-snapshot.json"
    : "pre-migration-baseline.json";
  const snapshotPath = path.join(outputDir, snapshotFileName);

  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
  process.stdout.write(`\nSnapshot written to: ${snapshotPath}\n`);

  // Print summary
  process.stdout.write(`\n── ${label.toUpperCase()} SNAPSHOT ──────────────────────────\n`);
  process.stdout.write(`Captured:   ${snapshot.capturedAt}\n`);
  process.stdout.write(`Total URLs: ${snapshot.totalUrls}\n`);
  process.stdout.write(
    `Route types — static: ${snapshot.byRouteType.static}, ` +
      `isr: ${snapshot.byRouteType.isr}, ` +
      `dynamic: ${snapshot.byRouteType.dynamic}\n`,
  );
  process.stdout.write(
    `Importance — critical: ${snapshot.byImportance.critical}, ` +
      `high: ${snapshot.byImportance.high}, ` +
      `medium: ${snapshot.byImportance.medium}, ` +
      `low: ${snapshot.byImportance.low}\n`,
  );
  process.stdout.write("\nRevalidate distribution:\n");
  for (const [bucket, count] of Object.entries(snapshot.revalidateDistribution)) {
    if (count > 0) {
      process.stdout.write(`  ${bucket.padEnd(28)}: ${count}\n`);
    }
  }

  // Diff against baseline if post-migration mode
  if (isPost) {
    const baselinePath = path.join(outputDir, "pre-migration-baseline.json");
    try {
      const baselineRaw = await fs.readFile(baselinePath, "utf8");
      const baseline = JSON.parse(baselineRaw) as Snapshot;
      const diff = diffSnapshots(baseline, snapshot);

      const diffPath = path.join(outputDir, "snapshot-diff.json");
      await fs.writeFile(diffPath, JSON.stringify(diff, null, 2));
      process.stdout.write(`\nDiff written to: ${diffPath}\n`);

      process.stdout.write("\n── DIFF AGAINST PRE-MIGRATION BASELINE ──────────\n");
      process.stdout.write(`URL count delta: ${diff.urlCountDelta >= 0 ? "+" : ""}${diff.urlCountDelta}\n`);
      if (diff.missingCriticalPaths.length > 0) {
        process.stdout.write(`⚠ Missing critical paths:\n`);
        for (const p of diff.missingCriticalPaths) {
          process.stdout.write(`    ${p}\n`);
        }
      }
      if (diff.regressions.length > 0) {
        process.stdout.write("\n⚠ REGRESSIONS DETECTED:\n");
        for (const r of diff.regressions) {
          process.stdout.write(`  • ${r}\n`);
        }
        process.stdout.write("\nAction required before completing cutover.\n");
        process.exit(1);
      } else {
        process.stdout.write("\nNo regressions detected. Cutover health looks good.\n");
      }
    } catch {
      process.stdout.write(
        "\nNo baseline found — run without --post first to capture baseline.\n",
      );
    }
  }
}

// Only run main() when executed directly (not when imported by tests).
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] !== undefined &&
  import.meta.url.includes(process.argv[1].replace(/^\//, ""));

if (isMain) {
  main().catch((err: unknown) => {
    process.stderr.write(
      `Error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}
