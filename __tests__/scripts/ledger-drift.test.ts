/**
 * Tests for scripts/audit/ledger-drift.mjs — the migration-ledger drift audit.
 *
 * Exercises the exported pure helpers. The main() runner reads files and is
 * always exit-0 (audit, not gate); the diff logic is what's asserted here.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const modPath = join(process.cwd(), "scripts/audit/ledger-drift.mjs");

let versionOf: (filename: string) => string;
let parseLedger: (doc: unknown) => Set<string>;
let computeLedgerDrift: (
  localVersions: string[],
  ledgerVersions: Set<string>,
) => {
  localDistinct: number;
  ledgerDistinct: number;
  both: string[];
  localOnly: string[];
  ledgerOnly: string[];
};
let versionToFiles: (basenames: string[]) => Map<string, string[]>;

beforeAll(async () => {
  const mod = await import(modPath);
  versionOf = mod.versionOf;
  parseLedger = mod.parseLedger;
  computeLedgerDrift = mod.computeLedgerDrift;
  versionToFiles = mod.versionToFiles;
});

describe("versionOf", () => {
  it("reads leading digits from a filename or path", () => {
    expect(versionOf("supabase/migrations/20260603120000_x.sql")).toBe("20260603120000");
    expect(versionOf("001_initial.sql")).toBe("001");
    expect(versionOf("no_digits.sql")).toBe("");
  });
});

describe("parseLedger", () => {
  it("parses a raw json_agg array of {version,name}", () => {
    const s = parseLedger([
      { version: "20260101000000", name: "a" },
      { version: "20260102000000", name: "b" },
    ]);
    expect(s.has("20260101000000")).toBe(true);
    expect(s.size).toBe(2);
  });

  it("parses a wrapped { ledger: [...] } object", () => {
    const s = parseLedger({ ledger: [{ version: "20260101000000", name: "a" }] });
    expect([...s]).toEqual(["20260101000000"]);
  });

  it("parses a plain array of version strings", () => {
    expect([...parseLedger(["20260101000000", "20260102000000"])]).toHaveLength(2);
  });

  it("returns empty for junk", () => {
    expect(parseLedger(null).size).toBe(0);
    expect(parseLedger({ nope: 1 }).size).toBe(0);
  });
});

describe("computeLedgerDrift", () => {
  it("splits versions into both / localOnly / ledgerOnly", () => {
    const d = computeLedgerDrift(["a", "b", "c"], new Set(["b", "c", "d"]));
    expect(d.both).toEqual(["b", "c"]);
    expect(d.localOnly).toEqual(["a"]);
    expect(d.ledgerOnly).toEqual(["d"]);
    expect(d.localDistinct).toBe(3);
    expect(d.ledgerDistinct).toBe(3);
  });

  it("reports full reconciliation when sets are equal", () => {
    const d = computeLedgerDrift(["a", "b"], new Set(["a", "b"]));
    expect(d.localOnly).toEqual([]);
    expect(d.ledgerOnly).toEqual([]);
  });
});

describe("versionToFiles", () => {
  it("groups files by version so collisions are visible", () => {
    const m = versionToFiles(["20260413_a.sql", "20260413_b.sql", "20260414120000_c.sql"]);
    expect(m.get("20260413")).toEqual(["20260413_a.sql", "20260413_b.sql"]);
    expect(m.get("20260414120000")).toEqual(["20260414120000_c.sql"]);
  });

  it("buckets non-versioned files under '' so callers can exclude them from collisions", () => {
    const m = versionToFiles(["baseline_schema.sql", "seed.sql", "20260101000000_a.sql"]);
    expect(m.get("")).toEqual(["baseline_schema.sql", "seed.sql"]);
    // Mirrors the predicate in main(): version "" is never a real collision.
    const collisions = [...m.entries()].filter(([v, files]) => v && files.length > 1);
    expect(collisions).toEqual([]);
  });
});

describe("parseLedger — robustness", () => {
  it("coerces a numeric version to string instead of silently dropping it", () => {
    const s = parseLedger([{ version: 20260101000000, name: "a" }]);
    expect(s.has("20260101000000")).toBe(true);
    expect(s.size).toBe(1);
  });

  it("dedups repeated versions (Set semantics)", () => {
    expect(parseLedger(["v1", "v1", "v2"]).size).toBe(2);
  });
});

describe("computeLedgerDrift — edge cases", () => {
  it("empty local + non-empty ledger → everything is ledgerOnly, not reconciled", () => {
    const d = computeLedgerDrift([], new Set(["v1", "v2"]));
    expect(d.localOnly).toEqual([]);
    expect(d.both).toEqual([]);
    expect(d.ledgerOnly).toEqual(["v1", "v2"]);
  });

  it("emits versions in lexicographic (string) order, not numeric", () => {
    const versions = ["20260102000000", "001", "20260102"];
    const d = computeLedgerDrift(versions, new Set(versions));
    expect(d.both).toEqual(["001", "20260102", "20260102000000"]);
  });
});

describe("versionOf — directory prefix", () => {
  it("ignores any directory prefix, including archive/", () => {
    expect(versionOf("archive/20260101000000_x.sql")).toBe("20260101000000");
    expect(versionOf("supabase/migrations/archive/20260101000000_x.sql")).toBe("20260101000000");
  });
});
