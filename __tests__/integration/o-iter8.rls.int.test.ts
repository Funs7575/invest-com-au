/**
 * O-iter8 RLS migration — static SQL contract tests.
 *
 * The in-memory harness in __tests__/integration/harness.ts does not
 * enforce Postgres RLS — it's a query-builder fake, not a database.
 * Live RLS enforcement is verified by `npm run audit:rls-isolation`
 * against a real Supabase branch.
 *
 * What this file DOES verify is the contract of the migration text:
 * for each of the 8 tables in scope, the migration must
 *
 *   (a) ENABLE ROW LEVEL SECURITY,
 *   (b) FORCE ROW LEVEL SECURITY (paranoid mode for service-role-
 *       only telemetry),
 *   (c) declare exactly one policy and it is service_role-only,
 *   (d) NOT grant anon or authenticated any access.
 *
 * If a future edit silently weakens any of these contracts the file
 * will start failing locally (and in CI), surfacing the regression
 * before it reaches the live DB.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/20260501_o_iter8_rls_observability.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

// ---------------------------------------------------------------------------
// Helpers (mirrors o-iter7.rls.int.test.ts)
// ---------------------------------------------------------------------------

/** Returns true iff the migration enables RLS on the named table. */
function rlsEnabled(table: string): boolean {
  const re = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  return re.test(SQL);
}

/** Returns true iff FORCE RLS is also set (paranoid mode). */
function rlsForced(table: string): boolean {
  const re = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  return re.test(SQL);
}

/**
 * Returns the body (a single block of text) of a CREATE POLICY ... ON <table>
 * statement, or null if no such policy exists.
 */
function findPolicyBlock(table: string, policyName: string): string | null {
  const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"${escapedName}"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "i",
  );
  const m = re.exec(SQL);
  return m ? m[0] : null;
}

/** All CREATE POLICY blocks scoped to the named table. */
function findAllPolicyBlocks(table: string): string[] {
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "gi",
  );
  return [...SQL.matchAll(re)].map((m) => m[0]);
}

// ---------------------------------------------------------------------------
// All 8 tables — service-role only, paranoid mode
// ---------------------------------------------------------------------------

const ALL_TABLES = [
  "web_vitals_daily_rollup",
  "health_pings",
  "automation_verdict_daily",
  "form_events",
  "search_queries",
  "search_embeddings",
  "auth_attempts",
  "rate_limit_buckets",
];

describe("O-iter8 — every in-scope table has RLS + FORCE + service_role policy", () => {
  for (const table of ALL_TABLES) {
    it(`enables ROW LEVEL SECURITY on ${table}`, () => {
      expect(rlsEnabled(table)).toBe(true);
    });

    it(`forces ROW LEVEL SECURITY (paranoid mode) on ${table}`, () => {
      expect(rlsForced(table)).toBe(true);
    });

    it(`declares a "service_role full access" policy on ${table}`, () => {
      const block = findPolicyBlock(table, "service_role full access");
      expect(block).not.toBeNull();
      expect(block).toMatch(/TO\s+service_role/i);
      expect(block).toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(block).toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
      expect(block).toMatch(/FOR\s+ALL/i);
    });

    it(`declares exactly one policy on ${table}`, () => {
      const blocks = findAllPolicyBlocks(table);
      expect(blocks).toHaveLength(1);
    });

    it(`does NOT grant anon any access on ${table}`, () => {
      const blocks = findAllPolicyBlocks(table);
      for (const block of blocks) {
        expect(block).not.toMatch(/TO\s+anon\b/i);
        expect(block).not.toMatch(/,\s*anon\b/i);
      }
    });

    it(`does NOT grant authenticated any access on ${table}`, () => {
      const blocks = findAllPolicyBlocks(table);
      for (const block of blocks) {
        expect(block).not.toMatch(/TO\s+authenticated\b/i);
        expect(block).not.toMatch(/,\s*authenticated\b/i);
      }
    });

    it(`does NOT have any SELECT/INSERT/UPDATE/DELETE policy granted to anon or authenticated on ${table}`, () => {
      const blocks = findAllPolicyBlocks(table);
      for (const block of blocks) {
        expect(block).not.toMatch(/FOR\s+SELECT\s+TO\s+(anon|authenticated)/i);
        expect(block).not.toMatch(/FOR\s+INSERT\s+TO\s+(anon|authenticated)/i);
        expect(block).not.toMatch(/FOR\s+UPDATE\s+TO\s+(anon|authenticated)/i);
        expect(block).not.toMatch(/FOR\s+DELETE\s+TO\s+(anon|authenticated)/i);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// High-risk three: rate_limit_buckets, auth_attempts, search_embeddings
// must NEVER carry an anon-targeted policy regardless of how the migration
// evolves. These are exhaustive "deny anon" guards on top of the loop above.
// ---------------------------------------------------------------------------

describe("O-iter8 — rate_limit_buckets MUST stay service-role-only", () => {
  // Granting anon/authenticated UPDATE would let a malicious client refill
  // their own bucket and defeat the limiter.
  it("has zero anon-targeted policies", () => {
    const blocks = findAllPolicyBlocks("rate_limit_buckets");
    for (const block of blocks) {
      expect(block).not.toMatch(/anon/i);
      expect(block).not.toMatch(/authenticated/i);
    }
  });

  it("does not carry a USING (false) shape (which silently denies even service-role via PostgREST)", () => {
    const blocks = findAllPolicyBlocks("rate_limit_buckets");
    for (const block of blocks) {
      expect(block).not.toMatch(/USING\s*\(\s*false\s*\)/i);
    }
  });
});

describe("O-iter8 — auth_attempts MUST stay service-role-only", () => {
  // ip_hash + email + user_agent are PII-adjacent; never grant anon or
  // authenticated SELECT/INSERT/UPDATE/DELETE.
  it("has zero anon-targeted policies", () => {
    const blocks = findAllPolicyBlocks("auth_attempts");
    for (const block of blocks) {
      expect(block).not.toMatch(/anon/i);
      expect(block).not.toMatch(/authenticated/i);
    }
  });
});

describe("O-iter8 — search_embeddings MUST stay service-role-only", () => {
  // Embeddings + body_excerpt leak document semantics. The public path is
  // /api/search-semantic which queries via admin and returns sanitised hits.
  it("has zero anon-targeted policies", () => {
    const blocks = findAllPolicyBlocks("search_embeddings");
    for (const block of blocks) {
      expect(block).not.toMatch(/anon/i);
      expect(block).not.toMatch(/authenticated/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Migration discipline: idempotent shape
// ---------------------------------------------------------------------------

describe("O-iter8 — migration discipline", () => {
  it("wraps work in BEGIN/COMMIT", () => {
    expect(SQL).toMatch(/^\s*BEGIN;/m);
    expect(SQL).toMatch(/COMMIT;\s*$/m);
  });

  it("declares a Rollback section in the header", () => {
    expect(SQL).toMatch(/Rollback/);
    expect(SQL).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS/);
    expect(SQL).toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/);
  });

  it("each CREATE POLICY is preceded by a matching DROP POLICY IF EXISTS (idempotent)", () => {
    const createRe =
      /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(public\.[a-z_][a-z0-9_]*)/gi;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(SQL)) !== null) {
      const name = m[1];
      const table = m[2];
      const dropRe = new RegExp(
        `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${name!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+ON\\s+${table!.replace(".", "\\.")}`,
        "i",
      );
      expect(SQL).toMatch(dropRe);
      const dropMatch = dropRe.exec(SQL);
      expect(dropMatch).not.toBeNull();
      expect(dropMatch!.index).toBeLessThan(m.index);
    }
  });

  it("includes rollback steps for every in-scope table", () => {
    for (const table of ALL_TABLES) {
      const dropRe = new RegExp(
        `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"service_role full access"\\s+ON\\s+public\\.${table}`,
        "i",
      );
      const disableRe = new RegExp(
        `ALTER\\s+TABLE\\s+public\\.${table}\\s+DISABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        "i",
      );
      expect(SQL).toMatch(dropRe);
      expect(SQL).toMatch(disableRe);
    }
  });
});
