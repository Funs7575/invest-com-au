/**
 * Cron audit script.
 *
 * Wave 18. Reads vercel.json, lists every cron entry with its
 * schedule, detects:
 *
 *   - Duplicate paths
 *   - Schedule overlaps (two crons running in the same minute
 *     — legal but often unintentional)
 *   - Crons with no matching route.ts file
 *   - Routes under app/api/cron/** that are NOT registered in
 *     vercel.json
 *
 * Run:
 *
 *     npx tsx scripts/audit-crons.ts
 *
 * Output is a markdown report printed to stdout. Pipe to a file
 * to commit as a snapshot.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface CronEntry {
  path: string;
  schedule: string;
}

interface VercelConfig {
  crons?: CronEntry[];
}

function readVercelConfig(): VercelConfig {
  const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
  return JSON.parse(raw) as VercelConfig;
}

function walkCronRoutes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walkCronRoutes(path, out);
    else if (name === "route.ts") out.push(path);
  }
  return out;
}

function fileToRoutePath(file: string): string {
  const root = join(process.cwd(), "app");
  const rel = file.slice(root.length).replace(/\/route\.ts$/, "");
  return rel.replace(/\/\[/g, "/:").replace(/\]/g, "");
}

function nextMinuteOf(schedule: string): number | null {
  // Quick + loose parse of "minute hour dom month dow". Returns
  // the "minute" field numeric value if it's a single value, or
  // null for wildcards / ranges.
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const minute = parts[0];
  if (/^\d+$/.test(minute)) return parseInt(minute, 10);
  return null;
}

function main() {
  const config = readVercelConfig();
  const crons = config.crons || [];

  const cronDir = join(process.cwd(), "app", "api", "cron");
  const routeFiles = walkCronRoutes(cronDir);
  const routePaths = new Set(routeFiles.map((f) => fileToRoutePath(f)));

  const lines: string[] = [];
  lines.push("# Cron audit");
  lines.push("");
  lines.push(`Total entries in vercel.json: **${crons.length}**`);
  lines.push(
    `Total route.ts files under app/api/cron: **${routeFiles.length}**`,
  );
  lines.push("");

  // Duplicates
  const pathCounts = new Map<string, number>();
  for (const c of crons) {
    pathCounts.set(c.path, (pathCounts.get(c.path) || 0) + 1);
  }
  const duplicates = Array.from(pathCounts.entries()).filter(
    ([, n]) => n > 1,
  );
  lines.push("## Duplicate paths");
  if (duplicates.length === 0) {
    lines.push("✓ None");
  } else {
    for (const [path, n] of duplicates) {
      lines.push(`- ⚠ \`${path}\` appears ${n} times`);
    }
  }
  lines.push("");

  // Minute-of-hour overlap (informational)
  const byMinute = new Map<number, string[]>();
  for (const c of crons) {
    const m = nextMinuteOf(c.schedule);
    if (m == null) continue;
    const list = byMinute.get(m) || [];
    list.push(`${c.path} (${c.schedule})`);
    byMinute.set(m, list);
  }
  const overlaps = Array.from(byMinute.entries())
    .filter(([, list]) => list.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  lines.push("## Minute-of-hour clustering");
  lines.push("_3+ crons sharing the same minute field. Legal but often unintentional._");
  if (overlaps.length === 0) {
    lines.push("✓ None");
  } else {
    for (const [minute, list] of overlaps) {
      lines.push(`### Minute ${minute}`);
      for (const l of list) lines.push(`- ${l}`);
    }
  }
  lines.push("");

  // Registered in vercel.json but no route file
  const registeredPaths = new Set(crons.map((c) => c.path));
  const registeredWithoutRoute: string[] = [];
  for (const p of registeredPaths) {
    if (!routePaths.has(p)) registeredWithoutRoute.push(p);
  }
  lines.push("## Registered crons with no route.ts");
  if (registeredWithoutRoute.length === 0) {
    lines.push("✓ None");
  } else {
    for (const p of registeredWithoutRoute) {
      lines.push(`- ⚠ \`${p}\` — referenced in vercel.json but no route.ts found`);
    }
  }
  lines.push("");

  // Route file with no vercel.json entry
  const orphanRoutes: string[] = [];
  for (const p of routePaths) {
    if (!registeredPaths.has(p)) orphanRoutes.push(p);
  }
  lines.push("## Route files with no vercel.json entry");
  lines.push(
    "_A route.ts under /api/cron/** that has no schedule — typically fine if invoked manually or by another cron, but worth flagging._",
  );
  if (orphanRoutes.length === 0) {
    lines.push("✓ None");
  } else {
    for (const p of orphanRoutes.sort()) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push("");

  // Alphabetised list
  lines.push("## All registered crons");
  const sorted = [...crons].sort((a, b) => a.path.localeCompare(b.path));
  for (const c of sorted) {
    lines.push(`- \`${c.schedule.padEnd(14)}\` → \`${c.path}\``);
  }

  console.log(lines.join("\n"));
}

main();
