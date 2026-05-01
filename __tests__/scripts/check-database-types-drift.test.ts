/**
 * Tests for scripts/check-database-types-drift.mjs (I-02 / A-07).
 *
 * Exercises the exported helper functions directly so we can assert gate
 * behaviour without spawning a child process.  The main() runner is not
 * tested here — it's a thin wrapper around these helpers and its end-to-end
 * behaviour is covered by the CI job itself on every PR.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-database-types-drift.mjs");

let extractTypesTables: (source: string) => string[];
let extractMigrationTables: (sql: string) => string[];
let parseAllowlist: (body: string) => Set<string>;
let computeDrift: (
  typesTables: string[],
  migrationTables: string[],
  allowed: Set<string>
) => string[];
let findStaleAllowlistEntries: (
  allowed: Set<string>,
  typesTables: string[],
  migrationTables: string[]
) => string[];

beforeAll(async () => {
  const mod = await import(gatePath);
  extractTypesTables = mod.extractTypesTables;
  extractMigrationTables = mod.extractMigrationTables;
  parseAllowlist = mod.parseAllowlist;
  computeDrift = mod.computeDrift;
  findStaleAllowlistEntries = mod.findStaleAllowlistEntries;
});

// ---------------------------------------------------------------------------
// extractTypesTables — parses the Supabase-generated database.types.ts shape
// ---------------------------------------------------------------------------

/**
 * Builds a minimal database.types.ts source skeleton with the requested
 * table names declared inside `Database['public']['Tables']`.  Mirrors the
 * exact indent + brace shape that `npx supabase gen types typescript` emits.
 */
function buildTypesSource(tableNames: string[], extra: { views?: string[] } = {}): string {
  const tables = tableNames
    .map(
      (name) =>
        `      ${name}: {\n` +
        `        Row: {\n` +
        `          id: number\n` +
        `        }\n` +
        `        Insert: {\n` +
        `          id?: number\n` +
        `        }\n` +
        `        Update: {\n` +
        `          id?: number\n` +
        `        }\n` +
        `        Relationships: []\n` +
        `      }`
    )
    .join("\n");

  const views = (extra.views ?? [])
    .map(
      (name) =>
        `      ${name}: {\n` +
        `        Row: {\n` +
        `          id: number | null\n` +
        `        }\n` +
        `        Relationships: []\n` +
        `      }`
    )
    .join("\n");

  return [
    "export type Database = {",
    "  __InternalSupabase: {",
    '    PostgrestVersion: "14.1"',
    "  }",
    "  public: {",
    "    Tables: {",
    tables,
    "    }",
    "    Views: {",
    views,
    "    }",
    "    Functions: {}",
    "    Enums: {}",
    "    CompositeTypes: {}",
    "  }",
    "}",
    "",
  ].join("\n");
}

describe("extractTypesTables", () => {
  it("extracts a single table from a minimal types source", () => {
    const src = buildTypesSource(["foo"]);
    expect(extractTypesTables(src)).toEqual(["foo"]);
  });

  it("extracts multiple tables in declaration order", () => {
    const src = buildTypesSource(["alpha", "beta", "gamma"]);
    expect(extractTypesTables(src)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("does not pick up nested keys (Row, Insert, Update, Relationships)", () => {
    const src = buildTypesSource(["only_top_level"]);
    const out = extractTypesTables(src);
    expect(out).toEqual(["only_top_level"]);
    expect(out).not.toContain("Row");
    expect(out).not.toContain("Insert");
    expect(out).not.toContain("Update");
    expect(out).not.toContain("Relationships");
  });

  it("does not pick up Views entries (sibling of Tables)", () => {
    const src = buildTypesSource(["a_table"], { views: ["a_view"] });
    expect(extractTypesTables(src)).toEqual(["a_table"]);
  });

  it("returns empty array when Tables block is empty", () => {
    const src = buildTypesSource([]);
    expect(extractTypesTables(src)).toEqual([]);
  });

  it("returns empty array on a malformed file with no public schema", () => {
    const src = "export type Database = { foo: 1 }";
    expect(extractTypesTables(src)).toEqual([]);
  });

  it("returns empty array on a malformed file missing Tables block", () => {
    const src = [
      "export type Database = {",
      "  public: {",
      "    Functions: {}",
      "  }",
      "}",
      "",
    ].join("\n");
    expect(extractTypesTables(src)).toEqual([]);
  });

  it("deduplicates if the parser sees the same table twice", () => {
    const src = buildTypesSource(["dup", "dup"]);
    expect(extractTypesTables(src)).toEqual(["dup"]);
  });

  it("handles snake_case names with underscores and digits", () => {
    const src = buildTypesSource(["table_1", "user_2fa_codes", "_slug_fix_log"]);
    expect(extractTypesTables(src)).toEqual([
      "table_1",
      "user_2fa_codes",
      "_slug_fix_log",
    ]);
  });
});

// ---------------------------------------------------------------------------
// extractMigrationTables
// ---------------------------------------------------------------------------

describe("extractMigrationTables", () => {
  it("returns table from a basic CREATE TABLE", () => {
    expect(extractMigrationTables("CREATE TABLE foo (id uuid);")).toEqual(["foo"]);
  });

  it("handles CREATE TABLE IF NOT EXISTS", () => {
    expect(extractMigrationTables("CREATE TABLE IF NOT EXISTS bar (id uuid);")).toEqual(["bar"]);
  });

  it("strips public. schema prefix", () => {
    expect(extractMigrationTables("CREATE TABLE public.baz (id uuid);")).toEqual(["baz"]);
  });

  it("handles double-quoted table names", () => {
    expect(extractMigrationTables('CREATE TABLE "quoted_table" (id uuid);')).toEqual([
      "quoted_table",
    ]);
  });

  it("returns multiple tables and dedupes", () => {
    const sql = `
      CREATE TABLE alpha (id uuid);
      CREATE TABLE IF NOT EXISTS beta (id uuid);
      CREATE TABLE public.alpha (id uuid); -- idempotent re-run
    `;
    expect(extractMigrationTables(sql).sort()).toEqual(["alpha", "beta"]);
  });

  it("is case-insensitive on the keyword", () => {
    expect(extractMigrationTables("create table lower (id uuid);")).toEqual(["lower"]);
  });

  it("ignores ALTER TABLE / CREATE INDEX statements", () => {
    const sql = `
      ALTER TABLE foo ADD COLUMN bar text;
      CREATE INDEX idx_foo ON foo (bar);
    `;
    expect(extractMigrationTables(sql)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseAllowlist
// ---------------------------------------------------------------------------

describe("parseAllowlist", () => {
  it("returns empty set for an empty body", () => {
    expect(parseAllowlist("").size).toBe(0);
  });

  it("returns table names one per line", () => {
    const body = "foo\nbar\nbaz\n";
    const out = parseAllowlist(body);
    expect(out.has("foo")).toBe(true);
    expect(out.has("bar")).toBe(true);
    expect(out.has("baz")).toBe(true);
    expect(out.size).toBe(3);
  });

  it("ignores blank lines", () => {
    const body = "foo\n\n\nbar\n";
    expect(parseAllowlist(body).size).toBe(2);
  });

  it("ignores whole-line comments", () => {
    const body = "# header comment\nfoo\n# another comment\nbar\n";
    const out = parseAllowlist(body);
    expect(out.size).toBe(2);
    expect(out.has("foo")).toBe(true);
    expect(out.has("bar")).toBe(true);
  });

  it("strips inline comments after the table name", () => {
    const body = "foo  # A-04 backfill pending\nbar\n";
    const out = parseAllowlist(body);
    expect(out.has("foo")).toBe(true);
    expect(out.has("bar")).toBe(true);
  });

  it("rejects entries that aren't valid table-name identifiers", () => {
    const body = "valid_name\n123starts_with_digit\nhas spaces\n!bang\n";
    const out = parseAllowlist(body);
    expect(out.has("valid_name")).toBe(true);
    expect(out.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeDrift
// ---------------------------------------------------------------------------

describe("computeDrift", () => {
  it("returns empty when every types-table is in migrations (clean state)", () => {
    expect(computeDrift(["a", "b", "c"], ["a", "b", "c"], new Set())).toEqual([]);
  });

  it("flags one drifted table", () => {
    expect(computeDrift(["a", "b"], ["a"], new Set())).toEqual(["b"]);
  });

  it("flags multiple drifted tables", () => {
    expect(computeDrift(["a", "b", "c", "d"], ["a"], new Set())).toEqual(["b", "c", "d"]);
  });

  it("respects the allowlist (allowed tables don't count as drift)", () => {
    expect(computeDrift(["a", "b"], ["a"], new Set(["b"]))).toEqual([]);
  });

  it("preserves declaration order in the drift output", () => {
    expect(computeDrift(["zeta", "alpha", "mu"], [], new Set())).toEqual([
      "zeta",
      "alpha",
      "mu",
    ]);
  });

  it("returns empty when types is empty", () => {
    expect(computeDrift([], ["a"], new Set())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findStaleAllowlistEntries
// ---------------------------------------------------------------------------

describe("findStaleAllowlistEntries", () => {
  it("returns nothing when every allowlist entry is genuinely drifted", () => {
    const allowed = new Set(["a", "b"]);
    const types = ["a", "b", "c"];
    const migrations = ["c"];
    expect(findStaleAllowlistEntries(allowed, types, migrations)).toEqual([]);
  });

  it("flags an allowlist entry whose table now has a migration", () => {
    const allowed = new Set(["a", "b"]);
    const types = ["a", "b"];
    const migrations = ["b"]; // b is no longer drifted
    expect(findStaleAllowlistEntries(allowed, types, migrations)).toEqual(["b"]);
  });

  it("flags an allowlist entry whose table is no longer in types", () => {
    const allowed = new Set(["retired_table", "a"]);
    const types = ["a"];
    const migrations: string[] = [];
    expect(findStaleAllowlistEntries(allowed, types, migrations)).toEqual([
      "retired_table",
    ]);
  });

  it("returns sorted output for deterministic CI logs", () => {
    const allowed = new Set(["zeta", "alpha", "mu"]);
    const types: string[] = []; // all stale
    const migrations: string[] = [];
    expect(findStaleAllowlistEntries(allowed, types, [...migrations])).toEqual([
      "alpha",
      "mu",
      "zeta",
    ]);
  });
});

// ---------------------------------------------------------------------------
// End-to-end scenarios
// ---------------------------------------------------------------------------

describe("integration: drift detection scenarios", () => {
  it("clean state — every table has a migration", () => {
    const types = extractTypesTables(buildTypesSource(["foo", "bar"]));
    const mig = extractMigrationTables(
      "CREATE TABLE foo (id uuid); CREATE TABLE bar (id uuid);"
    );
    expect(computeDrift(types, mig, new Set())).toEqual([]);
  });

  it("single drift — one table missing a migration", () => {
    const types = extractTypesTables(buildTypesSource(["foo", "bar"]));
    const mig = extractMigrationTables("CREATE TABLE foo (id uuid);");
    expect(computeDrift(types, mig, new Set())).toEqual(["bar"]);
  });

  it("multiple drifts", () => {
    const types = extractTypesTables(buildTypesSource(["foo", "bar", "baz", "qux"]));
    const mig = extractMigrationTables("CREATE TABLE foo (id uuid);");
    expect(computeDrift(types, mig, new Set())).toEqual(["bar", "baz", "qux"]);
  });

  it("allowlist exemption — drifted tables on allowlist pass", () => {
    const types = extractTypesTables(buildTypesSource(["foo", "bar"]));
    const mig = extractMigrationTables("CREATE TABLE foo (id uuid);");
    const allowed = parseAllowlist("# transitional\nbar  # awaiting backfill\n");
    expect(computeDrift(types, mig, allowed)).toEqual([]);
  });

  it("malformed types file — empty list, no false positives", () => {
    const types = extractTypesTables("// not a Supabase types file");
    const mig = extractMigrationTables("CREATE TABLE foo (id uuid);");
    expect(computeDrift(types, mig, new Set())).toEqual([]);
  });

  it("partial allowlist — exempts only the listed table, others still drift", () => {
    const types = extractTypesTables(buildTypesSource(["a", "b", "c"]));
    const mig = extractMigrationTables("CREATE TABLE a (id uuid);");
    const allowed = parseAllowlist("b\n");
    expect(computeDrift(types, mig, allowed)).toEqual(["c"]);
  });
});
