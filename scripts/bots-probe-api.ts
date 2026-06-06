/**
 * API surface prober — enumerates all app/api/** route.ts files that export a
 * GET handler, derives their URL, and probes each against the target server.
 *
 * Goal: find routes that return 5xx consistently (bugs), not routes that
 * correctly return 401/403 (auth-required) or 404 (not found for missing resource).
 *
 * Usage:
 *   npm run bots:probe-api
 *   BOTS_BASE_URL=https://my-preview.vercel.app npm run bots:probe-api
 *   BOTS_PROBE_INCLUDE_DYNAMIC=1 npm run bots:probe-api   # also probe dynamic routes with fake :id
 *   BOTS_PROBE_ADMIN=1 npm run bots:probe-api             # include /api/admin/* routes
 *   BOTS_PROBE_CONCURRENCY=10 npm run bots:probe-api
 *   BOTS_PROBE_DRY_RUN=1 npm run bots:probe-api           # list routes, don't probe
 *
 * Outputs:
 *   - Console: live progress + final summary table
 *   - bots/.runs/latest-api-probe.json: machine-readable full report
 *
 * Exit codes:
 *   0 — no 5xx errors found (or dry run)
 *   1 — one or more 5xx errors found
 *   2 — fatal error
 */

import { execSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL =
  process.env.BOTS_BASE_URL ?? "https://lambent-sawine-17c3dd.netlify.app";
const CONCURRENCY = parseInt(process.env.BOTS_PROBE_CONCURRENCY ?? "8", 10);
const INCLUDE_DYNAMIC = process.env.BOTS_PROBE_INCLUDE_DYNAMIC === "1";
const INCLUDE_ADMIN = process.env.BOTS_PROBE_ADMIN === "1";
const DRY_RUN = process.env.BOTS_PROBE_DRY_RUN === "1";
const REQUEST_TIMEOUT_MS = 15_000;

// Placeholder ID used when probing dynamic routes.
const FAKE_ID = "probe-test-000";

// Routes with these path prefixes are always skipped unless the relevant env is set.
const ALWAYS_SKIP_PREFIXES = [
  "/api/cron/",  // need cron Bearer token
  "/api/webhook/", // need webhook signature
  "/api/webhooks/",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProbeResult {
  routeFile: string;
  url: string;
  apiPath: string;
  isDynamic: boolean;
  isAdmin: boolean;
  status: number | "timeout" | "error";
  errorMessage?: string;
  durationMs: number;
  classification: "ok" | "auth-required" | "not-found" | "server-error" | "network-error" | "skipped";
}

// ── Route discovery ────────────────────────────────────────────────────────────

function findRouteFiles(): string[] {
  const apiDir = path.join(process.cwd(), "app", "api");
  try {
    const raw = execSync(`find "${apiDir}" -name "route.ts" -type f`, {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
    return raw.trim().split("\n").filter(Boolean);
  } catch (err) {
    throw new Error(`Failed to enumerate route files: ${err}`);
  }
}

function hasGetHandler(filePath: string): boolean {
  try {
    const raw = execSync(`grep -c "export.*function GET\\|export const GET" "${filePath}"`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return parseInt(raw.trim(), 10) > 0;
  } catch {
    return false; // grep exits 1 when no match
  }
}

function filePathToApiPath(filePath: string): { apiPath: string; isDynamic: boolean } {
  const apiDir = path.join(process.cwd(), "app", "api");
  const relative = filePath.slice(apiDir.length); // e.g. /admin/fee-queue/route.ts
  const withoutFile = relative.replace(/\/route\.ts$/, ""); // /admin/fee-queue
  const apiPath = `/api${withoutFile}`; // /api/admin/fee-queue
  const isDynamic = apiPath.includes("[");
  return { apiPath, isDynamic };
}

function applyFakeIds(apiPath: string): string {
  // Replace [param] segments with the fake placeholder.
  return apiPath.replace(/\[[^\]]+\]/g, FAKE_ID);
}

// ── Probing ───────────────────────────────────────────────────────────────────

async function probeRoute(
  apiPath: string,
  url: string,
): Promise<{ status: number | "timeout" | "error"; durationMs: number; errorMessage?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain",
        "User-Agent": "invest-com-au/api-prober",
        // Include a header that the server can use to identify probes.
        "X-Bot-Probe": "1",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return { status: res.status, durationMs: Date.now() - start };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = (err as Error).name === "AbortError";
    return {
      status: isTimeout ? "timeout" : "error",
      durationMs: Date.now() - start,
      errorMessage: (err as Error).message,
    };
  }
}

function classify(
  status: number | "timeout" | "error",
  _apiPath: string,
): ProbeResult["classification"] {
  if (status === "timeout" || status === "error") return "network-error";
  if (status >= 500) return "server-error";
  if (status === 401 || status === 403) return "auth-required";
  if (status === 404) return "not-found";
  return "ok";
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

async function runPool<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency: number,
): Promise<void> {
  let index = 0;
  async function next(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[bots-probe-api] Discovering GET routes …");
  const allFiles = findRouteFiles();
  console.log(`[bots-probe-api] Found ${allFiles.length} route.ts files.`);

  // Filter to those with GET handlers.
  const getFiles = allFiles.filter(hasGetHandler);
  console.log(`[bots-probe-api] ${getFiles.length} have GET handlers.`);

  // Build probe list.
  const probes: Array<{
    routeFile: string;
    apiPath: string;
    probeApiPath: string;
    isDynamic: boolean;
    isAdmin: boolean;
    skip: boolean;
    skipReason?: string;
  }> = getFiles.map((f) => {
    const { apiPath, isDynamic } = filePathToApiPath(f);
    const isAdmin = apiPath.startsWith("/api/admin");
    const probeApiPath = isDynamic ? applyFakeIds(apiPath) : apiPath;

    let skip = false;
    let skipReason: string | undefined;

    if (ALWAYS_SKIP_PREFIXES.some((p) => apiPath.startsWith(p))) {
      skip = true;
      skipReason = "signature-protected";
    } else if (isAdmin && !INCLUDE_ADMIN) {
      skip = true;
      skipReason = "admin (use BOTS_PROBE_ADMIN=1)";
    } else if (isDynamic && !INCLUDE_DYNAMIC) {
      skip = true;
      skipReason = "dynamic route (use BOTS_PROBE_INCLUDE_DYNAMIC=1)";
    }

    return { routeFile: f, apiPath, probeApiPath, isDynamic, isAdmin, skip, skipReason };
  });

  const toProbe = probes.filter((p) => !p.skip);
  const skipped = probes.filter((p) => p.skip);

  console.log(
    `[bots-probe-api] Probing ${toProbe.length} routes ` +
    `(skipped ${skipped.length}: admin=${skipped.filter((s) => s.skipReason?.startsWith("admin")).length}, ` +
    `dynamic=${skipped.filter((s) => s.skipReason?.startsWith("dynamic")).length}, ` +
    `signature-protected=${skipped.filter((s) => s.skipReason === "signature-protected").length})`,
  );
  console.log(`[bots-probe-api] Target: ${BASE_URL}`);
  console.log(`[bots-probe-api] Concurrency: ${CONCURRENCY}`);

  if (DRY_RUN) {
    console.log("\n[bots-probe-api] DRY RUN — routes that would be probed:\n");
    for (const p of toProbe) {
      const tag = p.isDynamic ? " [dynamic→fake-id]" : "";
      console.log(`  GET ${p.probeApiPath}${tag}`);
    }
    console.log(`\n  Total: ${toProbe.length} routes. Set BOTS_PROBE_DRY_RUN=0 to probe.`);
    return;
  }

  const results: ProbeResult[] = [];
  let done = 0;

  await runPool(toProbe, async (probe, _i) => {
    const url = `${BASE_URL}${probe.probeApiPath}`;
    const { status, durationMs, errorMessage } = await probeRoute(probe.probeApiPath, url);
    const classification = classify(status, probe.probeApiPath);

    const result: ProbeResult = {
      routeFile: probe.routeFile.replace(process.cwd() + "/", ""),
      url,
      apiPath: probe.apiPath,
      isDynamic: probe.isDynamic,
      isAdmin: probe.isAdmin,
      status,
      errorMessage,
      durationMs,
      classification,
    };
    results.push(result);
    done++;

    const statusStr = typeof status === "number" ? String(status) : status;
    const icon =
      classification === "server-error" ? "❌" :
      classification === "network-error" ? "⚠️" :
      classification === "ok" ? "✅" : "•";
    if (classification === "server-error" || classification === "network-error") {
      process.stdout.write(
        `\r  ${icon} [${done}/${toProbe.length}] ${statusStr} ${probe.probeApiPath.slice(0, 60)}\n`,
      );
    } else {
      process.stdout.write(`\r  [${done}/${toProbe.length}] probing…`);
    }
  }, CONCURRENCY);

  process.stdout.write("\n");

  // ── Summary ──────────────────────────────────────────────────────────────────

  const byClass = {
    ok: results.filter((r) => r.classification === "ok"),
    authRequired: results.filter((r) => r.classification === "auth-required"),
    notFound: results.filter((r) => r.classification === "not-found"),
    serverError: results.filter((r) => r.classification === "server-error"),
    networkError: results.filter((r) => r.classification === "network-error"),
  };

  console.log(`\n${"═".repeat(70)}`);
  console.log("  🤖 API surface probe — results");
  console.log(`${"═".repeat(70)}`);
  console.log(`  Target  : ${BASE_URL}`);
  console.log(`  Routes  : ${toProbe.length} probed, ${skipped.length} skipped`);
  console.log(`${"─".repeat(70)}`);
  console.log(`  ✅ OK (2xx)           : ${byClass.ok.length}`);
  console.log(`  🔒 Auth-required (401/403): ${byClass.authRequired.length}`);
  console.log(`  🔍 Not found (404)    : ${byClass.notFound.length}`);
  console.log(`  ❌ Server error (5xx) : ${byClass.serverError.length}`);
  console.log(`  ⚠️  Network error      : ${byClass.networkError.length}`);
  console.log(`${"═".repeat(70)}`);

  if (byClass.serverError.length > 0) {
    console.log("\n🚨  SERVER ERRORS — these need investigation:\n");
    for (const r of byClass.serverError.sort((a, b) => String(a.apiPath).localeCompare(b.apiPath))) {
      console.log(`  ❌ ${r.status}  GET ${r.apiPath}`);
      console.log(`       file: ${r.routeFile}`);
      if (r.isDynamic) console.log(`       (dynamic route probed with fake id "${FAKE_ID}")`);
    }
    console.log();
  }

  if (byClass.networkError.length > 0) {
    console.log("⚠️  NETWORK ERRORS (timeout or connection refused):\n");
    for (const r of byClass.networkError) {
      console.log(`  ⚠️  ${r.status}  GET ${r.apiPath}  — ${r.errorMessage ?? ""}`);
    }
    console.log();
  }

  // Notably absent: routes that should exist but return 404 on static paths.
  const unexpected404 = byClass.notFound.filter((r) => !r.isDynamic);
  if (unexpected404.length > 0) {
    console.log(
      `ℹ️   STATIC ROUTES RETURNING 404 (${unexpected404.length}) — may be expected, verify:\n`,
    );
    for (const r of unexpected404.slice(0, 20)) {
      console.log(`  🔍 404  GET ${r.apiPath}`);
    }
    if (unexpected404.length > 20) {
      console.log(`  … and ${unexpected404.length - 20} more (see the JSON report).`);
    }
    console.log();
  }

  // ── Write JSON report ─────────────────────────────────────────────────────

  const reportPath = path.join(process.cwd(), "bots", ".runs", "latest-api-probe.json");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  const report = {
    probedAt: new Date().toISOString(),
    target: BASE_URL,
    counts: {
      probed: toProbe.length,
      skipped: skipped.length,
      ok: byClass.ok.length,
      authRequired: byClass.authRequired.length,
      notFound: byClass.notFound.length,
      serverError: byClass.serverError.length,
      networkError: byClass.networkError.length,
    },
    serverErrors: byClass.serverError.map((r) => ({
      apiPath: r.apiPath,
      status: r.status,
      isDynamic: r.isDynamic,
      routeFile: r.routeFile,
    })),
    networkErrors: byClass.networkError.map((r) => ({
      apiPath: r.apiPath,
      status: r.status,
      errorMessage: r.errorMessage,
    })),
    unexpected404s: unexpected404.map((r) => ({ apiPath: r.apiPath, routeFile: r.routeFile })),
    allResults: results.map((r) => ({
      apiPath: r.apiPath,
      status: r.status,
      classification: r.classification,
      isDynamic: r.isDynamic,
      isAdmin: r.isAdmin,
      durationMs: r.durationMs,
    })),
    skipped: skipped.map((s) => ({ apiPath: s.apiPath, reason: s.skipReason })),
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`[bots-probe-api] Full report written to: ${reportPath}`);

  if (byClass.serverError.length > 0) {
    console.error(`[bots-probe-api] ❌  ${byClass.serverError.length} server error(s) found.`);
    process.exit(1);
  }

  console.log("[bots-probe-api] ✅  No server errors found.");
}

main().catch((err) => {
  console.error("[bots-probe-api] Fatal error:", err instanceof Error ? err.message : err);
  process.exit(2);
});
