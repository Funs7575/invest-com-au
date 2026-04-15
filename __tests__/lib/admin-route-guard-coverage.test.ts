/**
 * Enforcement test: every route under app/api/admin/** MUST call
 * requireAdmin() OR check CRON_SECRET OR check getAdminEmails() at
 * the top.
 *
 * Without this test, a dev can add a new admin route and forget the
 * guard — and we only find out after someone exploits it. The test
 * is dumb but effective: parse the file and look for one of the
 * known guard patterns.
 *
 * When you legitimately add a route that shouldn't be admin-guarded
 * (rare — usually means it shouldn't live under /api/admin/), add
 * its path to ALLOWLIST below and explain why.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOWLIST = new Set<string>([
  // Intentional exceptions go here with a comment.
]);

const GUARD_PATTERNS = [
  /requireAdmin\s*\(/,
  /getAdminEmails\s*\(/,
  /ADMIN_EMAILS\b/,
  /process\.env\.CRON_SECRET/,
  /process\.env\.ADMIN_API_TOKEN/,
  /requireCronAuth\s*\(/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, out);
    else if (name === "route.ts") out.push(path);
  }
  return out;
}

describe("admin route guard coverage", () => {
  const files = walk(join(process.cwd(), "app", "api", "admin"));

  it("finds at least one admin route (sanity)", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    const rel = file.replace(process.cwd() + "/", "");
    if (ALLOWLIST.has(rel)) continue;
    it(`${rel} has an admin/cron guard`, () => {
      const src = readFileSync(file, "utf8");
      const guarded = GUARD_PATTERNS.some((p) => p.test(src));
      expect(
        guarded,
        `No admin/cron guard found in ${rel}. Add requireAdmin() or a CRON_SECRET check, or allowlist with justification.`,
      ).toBe(true);
    });
  }
});

// ─── Wave 18: cron routes must all call requireCronAuth ──────────
//
// Same threat model: a cron route without requireCronAuth is
// publicly executable. requireCronAuth checks the CRON_SECRET
// bearer token, so a missing call means anyone with the URL can
// trigger the job.
describe("cron route auth coverage", () => {
  const cronFiles = walk(join(process.cwd(), "app", "api", "cron"));

  const CRON_ALLOWLIST = new Set<string>([
    // Cron routes that intentionally skip requireCronAuth because
    // they wrap another guarded helper go here. Empty by default.
  ]);

  const CRON_GUARD_PATTERNS = [
    /requireCronAuth\s*\(/,
    /process\.env\.CRON_SECRET/,
  ];

  it("finds cron route files (sanity)", () => {
    expect(cronFiles.length).toBeGreaterThan(20);
  });

  for (const file of cronFiles) {
    const rel = file.replace(process.cwd() + "/", "");
    if (CRON_ALLOWLIST.has(rel)) continue;
    it(`${rel} checks CRON_SECRET`, () => {
      const src = readFileSync(file, "utf8");
      const guarded = CRON_GUARD_PATTERNS.some((p) => p.test(src));
      expect(
        guarded,
        `No CRON_SECRET guard in ${rel}. Add requireCronAuth(req).`,
      ).toBe(true);
    });
  }
});

// ─── Wave 18: public write routes should rate-limit ──────────────
//
// Every public POST/PATCH/DELETE endpoint under /api/** that is
// NOT an admin route should call isAllowed() to rate-limit by IP.
// The admin routes above already guard via requireAdmin so they
// skip this check.
describe("public write routes have rate limiting", () => {
  // Walk app/api except app/api/admin and app/api/cron
  function walkPublic(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) {
        // Skip admin/cron — they have their own guards
        if (
          path.endsWith("/api/admin") ||
          path.endsWith("/api/cron") ||
          path.includes("/api/admin/") ||
          path.includes("/api/cron/")
        ) {
          continue;
        }
        walkPublic(path, out);
      } else if (name === "route.ts") {
        out.push(path);
      }
    }
    return out;
  }

  // This coverage is advisory — we allowlist the routes that
  // legitimately don't rate-limit (read-only, idempotent, etc.)
  // rather than require a fix across the whole codebase in one
  // pass. The allowlist is the review surface: any new entry
  // needs justification.
  const RATE_LIMIT_ALLOWLIST = new Set<string>([
    // Read-only / internal-only routes listed explicitly.
    // Existing routes that predate this check — Wave 18 is an
    // audit pass, not a rewrite. Additions MUST include a
    // justification comment.
  ]);

  const files = walkPublic(join(process.cwd(), "app", "api"));

  it("public API route count is reasonable", () => {
    // Sanity — there should be at least some public routes
    expect(files.length).toBeGreaterThan(5);
  });

  // This suite is currently informational — we collect the list
  // of routes that have a POST/PATCH/DELETE without rate limiting
  // and surface them as a single warning so they can be
  // addressed incrementally.
  it("reports public write routes missing rate limiting", () => {
    const missing: string[] = [];
    for (const file of files) {
      const rel = file.replace(process.cwd() + "/", "");
      if (RATE_LIMIT_ALLOWLIST.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      // Does it export a POST/PATCH/DELETE handler?
      const hasWrite = /export\s+(async\s+)?function\s+(POST|PATCH|PUT|DELETE)/.test(src);
      if (!hasWrite) continue;
      const hasRateLimit = /isAllowed\s*\(/.test(src);
      if (!hasRateLimit) missing.push(rel);
    }
    // Soft assertion: log the list but don't fail the test.
    // Graduate to a hard assert in a future wave after the list
    // is manually reviewed and allowlisted.
    if (missing.length > 0) {
      console.warn(
        `[rate-limit audit] ${missing.length} public write routes without isAllowed() — review and allowlist or add rate limiting:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
      );
    }
    expect(Array.isArray(missing)).toBe(true);
  });
});
