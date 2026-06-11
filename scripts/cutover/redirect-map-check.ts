/**
 * Cutover redirect-map check — asserts every entry in
 * docs/cutover/legacy-redirect-map.csv permanently redirects (301/308) to its
 * expected destination on the target host.
 *
 * Part of the cutover-guardian suite (see docs/cutover/README.md). The CSV is
 * the CO-01 drop-in point: it ships with three EXAMPLE rows (existing internal
 * redirects) so the harness is exercisable today; the founder-supplied
 * prior-host URL list replaces/extends them before cutover.
 *
 * Assertions per row:
 *   - first response (no redirect following) is 301 or 308
 *   - Location matches expected_destination_path by path (pathname + search,
 *     trailing slash insensitive); absolute Locations are tolerated when they
 *     point at the target host (or at the expected URL's host when the
 *     expected destination is itself absolute)
 *
 * Usage:
 *   npx tsx scripts/cutover/redirect-map-check.ts --target=https://lambent-sawine-17c3dd.netlify.app
 *   npx tsx scripts/cutover/redirect-map-check.ts --target=https://invest.com.au --map=path/to/map.csv
 *
 * Exit codes:
 *   0 — all rows pass (or the map has no data rows yet — CO-01 pending)
 *   1 — at least one mismatch (table of failures printed)
 *   2 — usage / IO / malformed-CSV error
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_MAP_PATH = path.join("docs", "cutover", "legacy-redirect-map.csv");
const CONCURRENCY = 8;
const TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3; // 1 initial + up to 2 retries on network error / 5xx
const RETRY_DELAY_MS = 750;
const PERMANENT_STATUSES = new Set([301, 308]);

const REQUEST_HEADERS = {
  Accept: "text/html,*/*;q=0.8",
  "User-Agent": "invest-com-au/cutover-redirect-check",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

interface MapRow {
  line: number;
  sourcePath: string;
  expectedDestination: string;
  note: string;
}

interface RowResult {
  row: MapRow;
  ok: boolean;
  gotStatus: number | "timeout" | "error";
  gotLocation: string | null;
  reason?: string;
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

/** Minimal CSV: no quoting; the first two commas delimit the columns, so the
 *  note column may itself contain commas. `#` lines and the header are skipped. */
export function parseRedirectMap(csv: string): { rows: MapRow[]; errors: string[] } {
  const rows: MapRow[] = [];
  const errors: string[] = [];
  const lines = csv.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^source_path\s*,/i.test(line)) continue; // header row

    const firstComma = line.indexOf(",");
    const secondComma = firstComma === -1 ? -1 : line.indexOf(",", firstComma + 1);
    if (firstComma === -1) {
      errors.push(`line ${i + 1}: expected "source_path,expected_destination_path,note" — got "${line}"`);
      continue;
    }
    const sourcePath = line.slice(0, firstComma).trim();
    const expectedDestination = (
      secondComma === -1 ? line.slice(firstComma + 1) : line.slice(firstComma + 1, secondComma)
    ).trim();
    const note = secondComma === -1 ? "" : line.slice(secondComma + 1).trim();

    if (!sourcePath.startsWith("/")) {
      errors.push(`line ${i + 1}: source_path must start with "/" — got "${sourcePath}"`);
      continue;
    }
    if (!expectedDestination.startsWith("/") && !/^https?:\/\//i.test(expectedDestination)) {
      errors.push(
        `line ${i + 1}: expected_destination_path must be a path or absolute URL — got "${expectedDestination}"`,
      );
      continue;
    }
    rows.push({ line: i + 1, sourcePath, expectedDestination, note });
  }
  return { rows, errors };
}

// ── Matching ──────────────────────────────────────────────────────────────────

/** pathname + search with the trailing slash stripped (except bare "/"). */
function normalisePath(pathname: string, search: string): string {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return `${p || "/"}${search}`;
}

export function locationMatches(
  location: string,
  requestUrl: string,
  expectedDestination: string,
  target: URL,
): { ok: boolean; reason?: string } {
  let resolved: URL;
  try {
    resolved = new URL(location, requestUrl);
  } catch {
    return { ok: false, reason: `unparseable Location "${location}"` };
  }

  const expectedIsAbsolute = /^https?:\/\//i.test(expectedDestination);
  let expected: URL;
  try {
    expected = expectedIsAbsolute
      ? new URL(expectedDestination)
      : new URL(expectedDestination, target.origin);
  } catch {
    return { ok: false, reason: `unparseable expected destination "${expectedDestination}"` };
  }

  // Absolute Locations must stay on the right host: the target host, or the
  // expected URL's host when the map entry is itself absolute.
  const isAbsoluteLocation = /^https?:\/\//i.test(location.trim());
  if (isAbsoluteLocation) {
    const allowedHosts = new Set([target.hostname]);
    if (expectedIsAbsolute) allowedHosts.add(expected.hostname);
    if (!allowedHosts.has(resolved.hostname)) {
      return { ok: false, reason: `Location points at foreign host "${resolved.hostname}"` };
    }
  }

  const gotPath = normalisePath(resolved.pathname, resolved.search);
  const wantPath = normalisePath(expected.pathname, expected.search);
  if (gotPath !== wantPath) {
    return { ok: false, reason: `path mismatch (got "${gotPath}", want "${wantPath}")` };
  }
  return { ok: true };
}

// ── Probing ───────────────────────────────────────────────────────────────────

async function checkRow(row: MapRow, target: URL): Promise<RowResult> {
  const requestUrl = new URL(row.sourcePath, target.origin).toString();
  let lastError = "unknown error";
  let timedOut = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(requestUrl, {
        redirect: "manual",
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const location = res.headers.get("location");
      await res.arrayBuffer().catch(() => undefined); // drain

      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      if (!PERMANENT_STATUSES.has(res.status)) {
        return {
          row,
          ok: false,
          gotStatus: res.status,
          gotLocation: location,
          reason: `expected 301/308, got ${res.status}${location ? "" : " (no redirect)"}`,
        };
      }
      if (!location) {
        return { row, ok: false, gotStatus: res.status, gotLocation: null, reason: "no Location header" };
      }
      const match = locationMatches(location, requestUrl, row.expectedDestination, target);
      return {
        row,
        ok: match.ok,
        gotStatus: res.status,
        gotLocation: location,
        reason: match.reason,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      timedOut =
        err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  return {
    row,
    ok: false,
    gotStatus: timedOut ? "timeout" : "error",
    gotLocation: null,
    reason: lastError,
  };
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, next));
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { target: URL; mapPath: string } {
  let target: string | null = null;
  let mapPath = DEFAULT_MAP_PATH;
  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else if (arg.startsWith("--map=")) {
      mapPath = arg.slice("--map=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!target) {
    throw new Error(
      "Usage: npx tsx scripts/cutover/redirect-map-check.ts --target=https://host [--map=path.csv]",
    );
  }
  return { target: new URL(target), mapPath: path.resolve(mapPath) };
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

async function main(): Promise<void> {
  const { target, mapPath } = parseArgs(process.argv.slice(2));

  const csv = await fs.readFile(mapPath, "utf8");
  const { rows, errors } = parseRedirectMap(csv);
  if (errors.length > 0) {
    console.error(`[cutover-redirects] ❌  Malformed rows in ${mapPath}:`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(2);
  }
  if (rows.length === 0) {
    console.log(
      "[cutover-redirects] No data rows in the redirect map yet (CO-01 pending " +
        "founder-supplied prior-host URL list). Nothing to check — passing.",
    );
    return;
  }

  console.log(`[cutover-redirects] Target: ${target.origin}`);
  console.log(`[cutover-redirects] Checking ${rows.length} redirect(s) from ${path.relative(process.cwd(), mapPath)} …`);

  const results: RowResult[] = [];
  await runPool(
    rows,
    async (row) => {
      const result = await checkRow(row, target);
      results.push(result);
      const icon = result.ok ? "✅" : "❌";
      console.log(
        `  ${icon} ${String(result.gotStatus)}  ${row.sourcePath} → ${row.expectedDestination}` +
          (result.ok ? "" : `  (${result.reason ?? "mismatch"})`),
      );
    },
    CONCURRENCY,
  );

  const failures = results
    .filter((r) => !r.ok)
    .sort((a, b) => a.row.line - b.row.line);

  console.log(`\n${"═".repeat(70)}`);
  console.log("  Cutover redirect-map check — results");
  console.log(`${"─".repeat(70)}`);
  console.log(`  Target  : ${target.origin}`);
  console.log(`  Checked : ${results.length}  |  Passed: ${results.length - failures.length}  |  Failed: ${failures.length}`);
  console.log(`${"═".repeat(70)}`);

  if (failures.length > 0) {
    const w1 = Math.max(6, ...failures.map((f) => f.row.sourcePath.length));
    const w2 = Math.max(8, ...failures.map((f) => f.row.expectedDestination.length));
    const w3 = Math.max(6, ...failures.map((f) => String(f.gotStatus).length));
    console.log("\n🚨  FAILURES:\n");
    console.log(`  ${pad("SOURCE", w1)}  ${pad("EXPECTED", w2)}  ${pad("STATUS", w3)}  LOCATION / REASON`);
    for (const f of failures) {
      console.log(
        `  ${pad(f.row.sourcePath, w1)}  ${pad(f.row.expectedDestination, w2)}  ` +
          `${pad(String(f.gotStatus), w3)}  ${f.gotLocation ?? "—"}${f.reason ? `  (${f.reason})` : ""}`,
      );
    }
    console.log();
    console.error(`[cutover-redirects] ❌  ${failures.length} redirect(s) failed.`);
    process.exit(1);
  }

  console.log("[cutover-redirects] ✅  All redirect map entries verified (301/308, destination matched).");
}

// Only run when executed directly (not when imported by tests).
if (require.main === module) {
  main().catch((err) => {
    console.error("[cutover-redirects] Fatal error:", err instanceof Error ? err.message : err);
    process.exit(2);
  });
}
