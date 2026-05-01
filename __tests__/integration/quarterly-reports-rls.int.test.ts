/**
 * C-05b RLS migration — static SQL contract tests for `quarterly_reports`.
 *
 * The in-memory harness in __tests__/integration/harness.ts is a
 * query-builder fake, not a database — it cannot enforce Postgres RLS.
 * Real RLS enforcement is verified by `npm run audit:rls-isolation`
 * against a Supabase branch.
 *
 * This file mirrors the pattern in `o-iter7.rls.int.test.ts`: assert on
 * the migration text that
 *
 *   (a) RLS is enabled on quarterly_reports,
 *   (b) the anon SELECT policy is published-only (cannot SELECT drafts),
 *   (c) the service_role policy is FOR ALL (writes are service-role only),
 *   (d) anon/authenticated have NO INSERT/UPDATE/DELETE policy on the table
 *       — they can do nothing but SELECT published rows,
 *   (e) the migration is idempotent (DROP POLICY IF EXISTS first).
 *
 * If a future edit silently weakens any of these contracts the file will
 * start failing locally + in CI, surfacing the regression before it
 * reaches the live DB.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/20260501_c05b_quarterly_reports_rls.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

// ── Helpers (copied from o-iter7 pattern) ────────────────────────────────────

function rlsEnabled(table: string): boolean {
  const re = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  return re.test(SQL);
}

function findPolicyBlock(table: string, policyName: string): string | null {
  const escapedName = policyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"${escapedName}"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "i",
  );
  const m = re.exec(SQL);
  return m ? m[0] : null;
}

function findAllPolicyBlocks(table: string): string[] {
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+(?:public\\.)?${table}[\\s\\S]*?;`,
    "gi",
  );
  return [...SQL.matchAll(re)].map((m) => m[0]);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("C-05b — quarterly_reports RLS migration", () => {
  it("enables RLS on quarterly_reports (idempotent — also enabled by O-iter7)", () => {
    expect(rlsEnabled("quarterly_reports")).toBe(true);
  });

  it("declares an anon SELECT policy filtered to status='published'", () => {
    const block = findPolicyBlock(
      "quarterly_reports",
      "anon read published quarterly_reports",
    );
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+SELECT/i);
    expect(block).toMatch(/status\s*=\s*'published'/i);
    // No `USING (true)` shortcut — drafts must remain hidden from anon.
    expect(block).not.toMatch(/USING\s*\(\s*true\s*\)\s*;/i);
  });

  it("declares a service-role FOR ALL policy with USING (true) WITH CHECK (true)", () => {
    const block = findPolicyBlock(
      "quarterly_reports",
      "service role manages quarterly_reports",
    );
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+ALL/i);
    expect(block).toMatch(/TO\s+service_role/i);
    expect(block).toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(block).toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
  });

  it("creates exactly two policies on quarterly_reports", () => {
    // One published-SELECT for anon/authenticated, one service-role FOR ALL.
    // A third policy is a sign someone added a less-restrictive write path
    // by mistake; this test will fail before that lands.
    const blocks = findAllPolicyBlocks("quarterly_reports");
    expect(blocks).toHaveLength(2);
  });

  it("does not grant anon any INSERT/UPDATE/DELETE policy", () => {
    const blocks = findAllPolicyBlocks("quarterly_reports");
    for (const block of blocks) {
      // Either the policy targets service_role only OR it is a SELECT-only
      // policy. No anon-targeted INSERT/UPDATE/DELETE may slip in.
      const isWritePolicy = /FOR\s+(INSERT|UPDATE|DELETE|ALL)/i.test(block);
      const targetsServiceRole = /TO\s+service_role/i.test(block);
      if (isWritePolicy && /FOR\s+(INSERT|UPDATE|DELETE)/i.test(block)) {
        // No standalone write policies should exist; everything else must
        // route through the service_role FOR ALL policy.
        expect.fail(
          `Found a non-FOR-ALL write policy on quarterly_reports: ${block}`,
        );
      }
      if (
        /FOR\s+ALL/i.test(block) &&
        !targetsServiceRole &&
        !/TO\s+service_role/i.test(block)
      ) {
        expect.fail(
          `FOR ALL policy on quarterly_reports must target service_role: ${block}`,
        );
      }
    }
  });

  it("is idempotent — drops both C-05b and prior O-iter7 policy names before re-creating", () => {
    expect(SQL).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"anon read published quarterly_reports"/i,
    );
    expect(SQL).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"service role manages quarterly_reports"/i,
    );
    expect(SQL).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"service_role full access"/i,
    );
  });

  it("wraps the migration in BEGIN/COMMIT", () => {
    expect(SQL).toMatch(/^\s*(?:--[^\n]*\n)*\s*BEGIN\s*;/m);
    expect(SQL).toMatch(/COMMIT\s*;\s*$/);
  });

  it("documents a rollback strategy in the header comment", () => {
    expect(SQL).toMatch(/Rollback strategy:/i);
    expect(SQL).toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });
});
