/**
 * O-iter7 RLS migration — static SQL contract tests.
 *
 * The in-memory harness in __tests__/integration/harness.ts does not
 * enforce Postgres RLS — it's a query-builder fake, not a database.
 * Live RLS enforcement is verified by `npm run audit:rls-isolation`
 * against a real Supabase branch.
 *
 * What this file DOES verify is the contract of the migration text:
 * for each of the 9 tables in scope, the migration must
 *
 *   (a) ENABLE ROW LEVEL SECURITY,
 *   (b) declare a service_role full-access policy,
 *   (c) match the documented policy shape (deny anon vs allow anon
 *       SELECT vs allow anon INSERT-only).
 *
 * If a future edit silently weakens any of these contracts the file
 * will start failing locally (and in CI), surfacing the regression
 * before it reaches the live DB.
 *
 * The high-risk three (email_otps, sponsor_invoices, listing_claims)
 * have exhaustive negative assertions — anon SELECT must NOT be
 * granted under any circumstances, and authenticated must be denied
 * where the policy says service-role-only.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../supabase/migrations/20260429_o_iter7_rls_editorial_obs_secrets.sql",
);
const SQL = readFileSync(MIGRATION_PATH, "utf8");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true iff the migration enables RLS on the named table. */
function rlsEnabled(table: string): boolean {
  // ALTER TABLE [public.]<table> ENABLE ROW LEVEL SECURITY;
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
  // CREATE POLICY "<name>" ON [public.]<table> ... up to the next ; (terminating).
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
// Each table has at least RLS + service_role full access
// ---------------------------------------------------------------------------

const ALL_TABLES = [
  "email_otps",
  "listing_claims",
  "sponsor_invoices",
  "newsletter_sponsors",
  "sector_reports",
  "quarterly_reports",
  "csp_violations",
  "content_freshness_log",
  "_slug_fix_log",
];

describe("O-iter7 — every in-scope table has RLS + service_role policy", () => {
  for (const table of ALL_TABLES) {
    it(`enables ROW LEVEL SECURITY on ${table}`, () => {
      expect(rlsEnabled(table)).toBe(true);
    });

    it(`declares a "service_role full access" policy on ${table}`, () => {
      const block = findPolicyBlock(table, "service_role full access");
      expect(block).not.toBeNull();
      // Must target service_role, with USING(true) and WITH CHECK(true).
      expect(block).toMatch(/TO\s+service_role/i);
      expect(block).toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(block).toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
      expect(block).toMatch(/FOR\s+ALL/i);
    });
  }
});

// ---------------------------------------------------------------------------
// HIGH-RISK 1: email_otps — service_role only (deny anon AND authenticated)
// ---------------------------------------------------------------------------

describe("O-iter7 — email_otps (high-risk: verification codes)", () => {
  it("forces RLS (paranoid mode)", () => {
    expect(rlsForced("email_otps")).toBe(true);
  });

  it("declares exactly one policy and it is service_role-only", () => {
    const blocks = findAllPolicyBlocks("email_otps");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/TO\s+service_role/i);
  });

  it("does NOT grant anon any access (no anon-targeted policy)", () => {
    const blocks = findAllPolicyBlocks("email_otps");
    for (const block of blocks) {
      expect(block).not.toMatch(/TO\s+anon\b/i);
      expect(block).not.toMatch(/TO\s+anon\s*,/i);
    }
  });

  it("does NOT grant authenticated any access", () => {
    const blocks = findAllPolicyBlocks("email_otps");
    for (const block of blocks) {
      expect(block).not.toMatch(/TO\s+authenticated\b/i);
      expect(block).not.toMatch(/,\s*authenticated\b/i);
    }
  });

  it("does NOT have any SELECT-only or INSERT-only policy granted to anon/authenticated", () => {
    // Specifically, no policy should match `FOR (SELECT|INSERT|UPDATE|DELETE) TO (anon|authenticated)`.
    const blocks = findAllPolicyBlocks("email_otps");
    for (const block of blocks) {
      expect(block).not.toMatch(/FOR\s+SELECT\s+TO\s+(anon|authenticated)/i);
      expect(block).not.toMatch(/FOR\s+INSERT\s+TO\s+(anon|authenticated)/i);
      expect(block).not.toMatch(/FOR\s+UPDATE\s+TO\s+(anon|authenticated)/i);
      expect(block).not.toMatch(/FOR\s+DELETE\s+TO\s+(anon|authenticated)/i);
    }
  });
});

// ---------------------------------------------------------------------------
// HIGH-RISK 2: sponsor_invoices — service_role only (payments data)
// ---------------------------------------------------------------------------

describe("O-iter7 — sponsor_invoices (high-risk: broker billing)", () => {
  it("forces RLS (paranoid mode)", () => {
    expect(rlsForced("sponsor_invoices")).toBe(true);
  });

  it("declares exactly one policy and it is service_role-only", () => {
    const blocks = findAllPolicyBlocks("sponsor_invoices");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatch(/TO\s+service_role/i);
  });

  it("does NOT grant anon any access", () => {
    const blocks = findAllPolicyBlocks("sponsor_invoices");
    for (const block of blocks) {
      expect(block).not.toMatch(/TO\s+anon\b/i);
      expect(block).not.toMatch(/,\s*anon\b/i);
    }
  });

  it("does NOT grant authenticated any access", () => {
    const blocks = findAllPolicyBlocks("sponsor_invoices");
    for (const block of blocks) {
      expect(block).not.toMatch(/TO\s+authenticated\b/i);
      expect(block).not.toMatch(/,\s*authenticated\b/i);
    }
  });

  it("does NOT carry a `USING (false)` shape (which silently denies even the service-role PostgREST path)", () => {
    const blocks = findAllPolicyBlocks("sponsor_invoices");
    for (const block of blocks) {
      expect(block).not.toMatch(/USING\s*\(\s*false\s*\)/i);
    }
  });
});

// ---------------------------------------------------------------------------
// HIGH-RISK 3: listing_claims — anon CAN insert, but CANNOT read
// ---------------------------------------------------------------------------

describe("O-iter7 — listing_claims (high-risk: PII, anon-INSERT-only)", () => {
  it("forces RLS (paranoid mode)", () => {
    expect(rlsForced("listing_claims")).toBe(true);
  });

  it("explicitly drops the legacy 20260510 permissive policies", () => {
    expect(SQL).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"Anon can submit claims"\s+ON\s+public\.listing_claims/i,
    );
    expect(SQL).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"Service role full access listing_claims"\s+ON\s+public\.listing_claims/i,
    );
  });

  it("grants service_role full access (SELECT/UPDATE/DELETE all gated to service-role)", () => {
    const block = findPolicyBlock("listing_claims", "service_role full access");
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+ALL/i);
    expect(block).toMatch(/TO\s+service_role/i);
  });

  it("grants anon (and authenticated) ONLY an INSERT — never SELECT/UPDATE/DELETE", () => {
    const block = findPolicyBlock("listing_claims", "anon insert claim");
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+INSERT/i);
    // It must be INSERT and NOT FOR ALL/SELECT/UPDATE/DELETE.
    expect(block).not.toMatch(/FOR\s+ALL/i);
    expect(block).not.toMatch(/FOR\s+SELECT/i);
    expect(block).not.toMatch(/FOR\s+UPDATE/i);
    expect(block).not.toMatch(/FOR\s+DELETE/i);
    // Targets anon + authenticated.
    expect(block).toMatch(/TO\s+anon\s*,\s*authenticated/i);
    // WITH CHECK guards required PII fields are present.
    expect(block).toMatch(/email\s+IS\s+NOT\s+NULL/i);
    expect(block).toMatch(/full_name\s+IS\s+NOT\s+NULL/i);
  });

  it("anon CANNOT read (no SELECT policy targets anon or authenticated)", () => {
    const blocks = findAllPolicyBlocks("listing_claims");
    for (const block of blocks) {
      // Either FOR ALL TO service_role, or FOR INSERT TO anon — neither
      // grants SELECT to anon. There must be no FOR SELECT TO anon
      // anywhere.
      expect(block).not.toMatch(/FOR\s+SELECT\s+TO\s+anon/i);
      expect(block).not.toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i);
      expect(block).not.toMatch(/FOR\s+SELECT\s+TO\s+anon\s*,/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Editorial group: public read, admin write
// ---------------------------------------------------------------------------

describe("O-iter7 — newsletter_sponsors (editorial: public read)", () => {
  it("grants anon SELECT", () => {
    const block = findPolicyBlock(
      "newsletter_sponsors",
      "anon read newsletter_sponsors",
    );
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+SELECT/i);
    expect(block).toMatch(/TO\s+anon\s*,\s*authenticated/i);
    expect(block).toMatch(/USING\s*\(\s*true\s*\)/i);
  });

  it("does not grant anon INSERT/UPDATE/DELETE", () => {
    const blocks = findAllPolicyBlocks("newsletter_sponsors");
    for (const block of blocks) {
      if (/TO\s+anon/i.test(block)) {
        expect(block).toMatch(/FOR\s+SELECT/i);
        expect(block).not.toMatch(/FOR\s+INSERT/i);
        expect(block).not.toMatch(/FOR\s+UPDATE/i);
        expect(block).not.toMatch(/FOR\s+DELETE/i);
        expect(block).not.toMatch(/FOR\s+ALL/i);
      }
    }
  });
});

describe("O-iter7 — sector_reports (editorial: published-only public read)", () => {
  it("grants anon SELECT only on published rows", () => {
    const block = findPolicyBlock(
      "sector_reports",
      "anon read published sector_reports",
    );
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+SELECT/i);
    expect(block).toMatch(/TO\s+anon\s*,\s*authenticated/i);
    expect(block).toMatch(/status\s*=\s*'published'/i);
  });
});

describe("O-iter7 — quarterly_reports (editorial: published-only public read; CRITICAL FIX)", () => {
  it("now enables RLS (was previously NOT enabled at all)", () => {
    expect(rlsEnabled("quarterly_reports")).toBe(true);
  });

  it("grants anon SELECT only on published rows", () => {
    const block = findPolicyBlock(
      "quarterly_reports",
      "anon read published quarterly_reports",
    );
    expect(block).not.toBeNull();
    expect(block).toMatch(/FOR\s+SELECT/i);
    expect(block).toMatch(/TO\s+anon\s*,\s*authenticated/i);
    expect(block).toMatch(/status\s*=\s*'published'/i);
  });

  it("does not allow anon to read draft rows (USING clause excludes status != 'published')", () => {
    const block = findPolicyBlock(
      "quarterly_reports",
      "anon read published quarterly_reports",
    );
    expect(block).not.toBeNull();
    // The USING clause must not be `USING (true)` — we want a status filter.
    expect(block).not.toMatch(/USING\s*\(\s*true\s*\)\s*;/i);
  });
});

// ---------------------------------------------------------------------------
// Observability group: service_role only
// ---------------------------------------------------------------------------

describe("O-iter7 — observability tables are service_role only", () => {
  const obsTables = ["csp_violations", "content_freshness_log", "_slug_fix_log"];

  for (const table of obsTables) {
    it(`${table} forces RLS`, () => {
      expect(rlsForced(table)).toBe(true);
    });

    it(`${table} has only the service_role policy`, () => {
      const blocks = findAllPolicyBlocks(table);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatch(/TO\s+service_role/i);
    });

    it(`${table} does not grant anon or authenticated any access`, () => {
      const blocks = findAllPolicyBlocks(table);
      for (const block of blocks) {
        expect(block).not.toMatch(/TO\s+anon\b/i);
        expect(block).not.toMatch(/,\s*anon\b/i);
        expect(block).not.toMatch(/TO\s+authenticated\b/i);
        expect(block).not.toMatch(/,\s*authenticated\b/i);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Migration discipline: idempotent shape
// ---------------------------------------------------------------------------

describe("O-iter7 — migration discipline", () => {
  it("wraps work in BEGIN/COMMIT", () => {
    expect(SQL).toMatch(/^\s*BEGIN;/m);
    expect(SQL).toMatch(/COMMIT;\s*$/m);
  });

  it("declares a Rollback section in the header", () => {
    expect(SQL).toMatch(/Rollback:/);
    expect(SQL).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS/);
    expect(SQL).toMatch(/DISABLE\s+ROW\s+LEVEL\s+SECURITY/);
  });

  it("each CREATE POLICY is preceded by a matching DROP POLICY IF EXISTS (idempotent)", () => {
    // For every CREATE POLICY "<name>" ON <table>, ensure a matching
    // DROP POLICY IF EXISTS "<name>" ON <table> appears earlier.
    const createRe = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(public\.[a-z_][a-z0-9_]*)/gi;
    let m: RegExpExecArray | null;
    while ((m = createRe.exec(SQL)) !== null) {
      const name = m[1];
      const table = m[2];
      const dropRe = new RegExp(
        `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+"${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s+ON\\s+${table.replace(".", "\\.")}`,
        "i",
      );
      expect(SQL).toMatch(dropRe);
      // And the DROP must appear before the CREATE in the file.
      const dropMatch = dropRe.exec(SQL);
      expect(dropMatch).not.toBeNull();
      expect(dropMatch!.index).toBeLessThan(m.index);
    }
  });
});
