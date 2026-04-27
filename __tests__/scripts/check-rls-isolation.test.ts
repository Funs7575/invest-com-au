/**
 * Tests for scripts/check-rls-isolation.mjs (V-NEW-04).
 *
 * Exercises the exported helper functions directly so we can assert gate
 * behaviour without spawning a child process.  The main() runner is not
 * tested here — it's a thin wrapper around these helpers and its behaviour is
 * covered by the CI job itself on every PR.
 */

import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";

// Dynamic import needed for ES modules (.mjs)
const gatePath = path.join(process.cwd(), "scripts/check-rls-isolation.mjs");

// We import individual exported helpers via dynamic import
let extractTableNames: (sql: string) => string[];
let isUserDataTable: (sql: string, table: string) => boolean;
let hasIsolationTest: (table: string, testsRoot: string) => Promise<boolean>;

beforeAll(async () => {
  const mod = await import(gatePath);
  extractTableNames = mod.extractTableNames;
  isUserDataTable = mod.isUserDataTable;
  hasIsolationTest = mod.hasIsolationTest;
});

// ---------------------------------------------------------------------------
// extractTableNames
// ---------------------------------------------------------------------------

describe("extractTableNames", () => {
  it("extracts a plain CREATE TABLE", () => {
    const sql = `CREATE TABLE leads (id uuid PRIMARY KEY, user_id uuid NOT NULL);`;
    expect(extractTableNames(sql)).toEqual(["leads"]);
  });

  it("extracts CREATE TABLE IF NOT EXISTS", () => {
    const sql = `CREATE TABLE IF NOT EXISTS user_bookmarks (id uuid, user_id uuid);`;
    expect(extractTableNames(sql)).toEqual(["user_bookmarks"]);
  });

  it("extracts multiple tables from one migration", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS document_extractions (id uuid, user_id uuid);
      CREATE TABLE IF NOT EXISTS document_jobs (id uuid, status text);
    `;
    expect(extractTableNames(sql)).toEqual(["document_extractions", "document_jobs"]);
  });

  it("ignores non-CREATE-TABLE SQL", () => {
    const sql = `ALTER TABLE leads ADD COLUMN tier text; CREATE INDEX idx ON leads(user_id);`;
    expect(extractTableNames(sql)).toEqual([]);
  });

  it("handles schema-qualified names (strips schema prefix)", () => {
    // Our regex skips `public.` qualifier gracefully
    const sql = `CREATE TABLE public.quiz_history (id uuid, user_id uuid);`;
    expect(extractTableNames(sql)).toEqual(["quiz_history"]);
  });

  it("deduplicates when the same table appears twice", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS foo (id uuid);
      CREATE TABLE IF NOT EXISTS foo (id uuid);
    `;
    expect(extractTableNames(sql)).toEqual(["foo"]);
  });
});

// ---------------------------------------------------------------------------
// isUserDataTable
// ---------------------------------------------------------------------------

describe("isUserDataTable", () => {
  it("returns true when migration contains user_id", () => {
    const sql = `CREATE TABLE quiz_history (id uuid, user_id uuid NOT NULL);`;
    expect(isUserDataTable(sql, "quiz_history")).toBe(true);
  });

  it("returns true when migration contains owner_id", () => {
    const sql = `CREATE TABLE documents (id uuid, owner_id uuid NOT NULL, title text);`;
    expect(isUserDataTable(sql, "documents")).toBe(true);
  });

  it("returns false when migration has neither user_id nor owner_id", () => {
    const sql = `CREATE TABLE broker_types (id uuid, name text);`;
    expect(isUserDataTable(sql, "broker_types")).toBe(false);
  });

  it("returns false when user_id appears only in a comment, not a column", () => {
    // Checks the word-boundary regex; 'user_ids' should not match
    const sql = `CREATE TABLE events (id uuid, user_ids text[]); -- stores multiple user_ids`;
    expect(isUserDataTable(sql, "events")).toBe(false);
  });

  it("returns true for partial match on user_id word boundary", () => {
    const sql = `CREATE TABLE notifications (id uuid, user_id uuid);`;
    expect(isUserDataTable(sql, "notifications")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasIsolationTest — uses a real temporary directory as the test root
// ---------------------------------------------------------------------------

describe("hasIsolationTest", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "rls-test-"));
    await fs.mkdir(path.join(tmpDir, "lib"), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns true when conventional test file exists", async () => {
    await fs.writeFile(
      path.join(tmpDir, "lib", "user_bookmarks.rls.test.ts"),
      "// placeholder"
    );
    expect(await hasIsolationTest("user_bookmarks", tmpDir)).toBe(true);
  });

  it("returns false when no test file exists", async () => {
    expect(await hasIsolationTest("new_table", tmpDir)).toBe(false);
  });

  it("returns true when marker comment is found in any test file", async () => {
    await fs.writeFile(
      path.join(tmpDir, "lib", "some-suite.test.ts"),
      `// rls-isolation: document_extractions\ndescribe('...', () => {});`
    );
    expect(await hasIsolationTest("document_extractions", tmpDir)).toBe(true);
  });

  it("returns false when marker comment uses wrong table name", async () => {
    await fs.writeFile(
      path.join(tmpDir, "lib", "other.test.ts"),
      "// rls-isolation: other_table\n"
    );
    expect(await hasIsolationTest("document_extractions", tmpDir)).toBe(false);
  });

  it("scans subdirectories recursively for marker", async () => {
    await fs.mkdir(path.join(tmpDir, "integration"), { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "integration", "deep.test.ts"),
      "// rls-isolation: deep_table\n"
    );
    expect(await hasIsolationTest("deep_table", tmpDir)).toBe(true);
  });
});
