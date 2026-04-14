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
