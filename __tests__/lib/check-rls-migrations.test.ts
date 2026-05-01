import { describe, it, expect } from "vitest";
import {
  extractCreatedTables,
  hasRlsEnabled,
  extractExemptedTables,
  isSystemTable,
} from "../../scripts/check-rls-migrations.mjs";

// ---------------------------------------------------------------------------
// extractCreatedTables
// ---------------------------------------------------------------------------

describe("extractCreatedTables", () => {
  it("returns table name from a basic CREATE TABLE", () => {
    const sql = "CREATE TABLE foo (id uuid PRIMARY KEY);";
    expect(extractCreatedTables(sql)).toEqual(["foo"]);
  });

  it("handles CREATE TABLE IF NOT EXISTS", () => {
    const sql = "CREATE TABLE IF NOT EXISTS bar (id bigint);";
    expect(extractCreatedTables(sql)).toEqual(["bar"]);
  });

  it("strips public. schema prefix", () => {
    const sql = "CREATE TABLE public.baz (id uuid);";
    expect(extractCreatedTables(sql)).toEqual(["baz"]);
  });

  it("returns multiple tables from a single migration", () => {
    const sql = `
      CREATE TABLE alpha (id uuid);
      CREATE TABLE IF NOT EXISTS beta (id uuid);
      CREATE TABLE public.gamma (id uuid);
    `;
    expect(extractCreatedTables(sql)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("deduplicates repeated table names", () => {
    const sql = `
      CREATE TABLE dup (id uuid);
      CREATE TABLE dup (id uuid); -- idempotent re-run
    `;
    expect(extractCreatedTables(sql)).toEqual(["dup"]);
  });

  it("returns empty array when no CREATE TABLE present", () => {
    const sql = "ALTER TABLE foo ADD COLUMN bar text;";
    expect(extractCreatedTables(sql)).toEqual([]);
  });

  it("is case-insensitive for the keyword", () => {
    const sql = "create table lower_case (id uuid);";
    expect(extractCreatedTables(sql)).toEqual(["lower_case"]);
  });

  it("ignores CREATE TABLE mentions inside SQL line comments", () => {
    // Regression: comment lines like "-- CREATE TABLE IF NOT EXISTS + DROP POLICY"
    // previously caused "if" to be extracted as a table name when the optional
    // IF NOT EXISTS group failed and the regex fell back to capturing "if".
    const sql = `
      -- Idempotency: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before each CREATE POLICY.
      CREATE TABLE actual_table (id uuid);
      ALTER TABLE actual_table ENABLE ROW LEVEL SECURITY;
    `;
    expect(extractCreatedTables(sql)).toEqual(["actual_table"]);
  });
});

// ---------------------------------------------------------------------------
// hasRlsEnabled
// ---------------------------------------------------------------------------

describe("hasRlsEnabled", () => {
  it("returns true when ALTER TABLE ... ENABLE ROW LEVEL SECURITY present", () => {
    const sql = "ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(true);
  });

  it("returns true with public. prefix on the table", () => {
    const sql = "ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(true);
  });

  it("returns true with IF EXISTS qualifier", () => {
    const sql = "ALTER TABLE IF EXISTS my_table ENABLE ROW LEVEL SECURITY;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(true);
  });

  it("returns false when ENABLE ROW LEVEL SECURITY is absent", () => {
    const sql = "CREATE TABLE my_table (id uuid); ALTER TABLE my_table ADD COLUMN foo text;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(false);
  });

  it("does not match a different table's RLS enablement", () => {
    const sql = "ALTER TABLE other_table ENABLE ROW LEVEL SECURITY;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(false);
  });

  it("is case-insensitive for keywords", () => {
    const sql = "alter table my_table enable row level security;";
    expect(hasRlsEnabled(sql, "my_table")).toBe(true);
  });

  it("returns true when RLS is enabled among other statements", () => {
    const sql = `
      CREATE TABLE my_table (id uuid PRIMARY KEY);
      ALTER TABLE my_table ADD COLUMN name text;
      ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
      ALTER TABLE my_table FORCE ROW LEVEL SECURITY;
    `;
    expect(hasRlsEnabled(sql, "my_table")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractExemptedTables
// ---------------------------------------------------------------------------

describe("extractExemptedTables", () => {
  it("returns empty set when no exemption comments present", () => {
    const sql = "CREATE TABLE foo (id uuid);";
    expect(extractExemptedTables(sql).size).toBe(0);
  });

  it("extracts a single exempted table", () => {
    const sql = "-- rls-exempt: topology_table  PostGIS topology — managed by extension";
    const result = extractExemptedTables(sql);
    expect(result.has("topology_table")).toBe(true);
  });

  it("extracts multiple exempted tables", () => {
    const sql = `
      -- rls-exempt: pg_ext_table  extension-managed
      -- rls-exempt: another_exempt  internal use only
    `;
    const result = extractExemptedTables(sql);
    expect(result.has("pg_ext_table")).toBe(true);
    expect(result.has("another_exempt")).toBe(true);
  });

  it("is case-insensitive for the comment keyword", () => {
    const sql = "-- RLS-EXEMPT: my_table  justification";
    const result = extractExemptedTables(sql);
    expect(result.has("my_table")).toBe(true);
  });

  it("ignores non-exempt comments", () => {
    const sql = "-- TODO: add RLS to this table later";
    expect(extractExemptedTables(sql).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isSystemTable
// ---------------------------------------------------------------------------

describe("isSystemTable", () => {
  it("identifies pg_ prefixed tables", () => {
    expect(isSystemTable("pg_catalog")).toBe(true);
  });

  it("identifies auth. prefixed tables", () => {
    expect(isSystemTable("auth.users")).toBe(true);
  });

  it("identifies storage. prefixed tables", () => {
    expect(isSystemTable("storage.objects")).toBe(true);
  });

  it("identifies realtime. prefixed tables", () => {
    expect(isSystemTable("realtime.messages")).toBe(true);
  });

  it("identifies supabase_ prefixed tables", () => {
    expect(isSystemTable("supabase_migrations")).toBe(true);
  });

  it("returns false for normal application tables", () => {
    expect(isSystemTable("advisors")).toBe(false);
    expect(isSystemTable("leads")).toBe(false);
    expect(isSystemTable("user_profiles")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: full migration SQL scenarios
// ---------------------------------------------------------------------------

describe("integration: full migration SQL", () => {
  it("passes when table has RLS enabled", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS new_table (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid()
      );
      ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
      ALTER TABLE new_table FORCE ROW LEVEL SECURITY;
    `;
    const tables = extractCreatedTables(sql);
    const exempted = extractExemptedTables(sql);
    const failures = tables.filter(
      (t) => !isSystemTable(t) && !exempted.has(t) && !hasRlsEnabled(sql, t)
    );
    expect(failures).toHaveLength(0);
  });

  it("fails when table lacks RLS", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS unprotected_table (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid()
      );
    `;
    const tables = extractCreatedTables(sql);
    const exempted = extractExemptedTables(sql);
    const failures = tables.filter(
      (t) => !isSystemTable(t) && !exempted.has(t) && !hasRlsEnabled(sql, t)
    );
    expect(failures).toEqual(["unprotected_table"]);
  });

  it("passes a system table through without error", () => {
    const sql = `
      CREATE TABLE pg_ext_internal (id bigint);
    `;
    const tables = extractCreatedTables(sql);
    const exempted = extractExemptedTables(sql);
    const failures = tables.filter(
      (t) => !isSystemTable(t) && !exempted.has(t) && !hasRlsEnabled(sql, t)
    );
    expect(failures).toHaveLength(0);
  });

  it("passes an explicitly exempted table", () => {
    const sql = `
      -- rls-exempt: special_ext_table  PostGIS extension managed
      CREATE TABLE special_ext_table (id bigint);
    `;
    const tables = extractCreatedTables(sql);
    const exempted = extractExemptedTables(sql);
    const failures = tables.filter(
      (t) => !isSystemTable(t) && !exempted.has(t) && !hasRlsEnabled(sql, t)
    );
    expect(failures).toHaveLength(0);
  });

  it("catches one bad table in a multi-table migration", () => {
    const sql = `
      CREATE TABLE good_table (id uuid PRIMARY KEY);
      ALTER TABLE good_table ENABLE ROW LEVEL SECURITY;

      CREATE TABLE bad_table (id uuid PRIMARY KEY);
    `;
    const tables = extractCreatedTables(sql);
    const exempted = extractExemptedTables(sql);
    const failures = tables.filter(
      (t) => !isSystemTable(t) && !exempted.has(t) && !hasRlsEnabled(sql, t)
    );
    expect(failures).toEqual(["bad_table"]);
  });
});
