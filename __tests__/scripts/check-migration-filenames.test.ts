/**
 * Tests for scripts/check-migration-filenames.mjs — the version-hygiene gate.
 *
 * Exercises the exported pure helpers directly (no git, no fs). The main()
 * runner is a thin wrapper around these; the pass/fail logic lives here.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-migration-filenames.mjs");

let parseMigrationVersion: (filename: string) => {
  base: string;
  version: string;
  is14: boolean;
  hasDigits: boolean;
};
let computeFilenameViolations: (
  addedBasenames: string[],
  existingVersions: Set<string>,
) => { file: string; version: string; kind: "format" | "collision-existing" | "collision-added" }[];

beforeAll(async () => {
  const mod = await import(gatePath);
  parseMigrationVersion = mod.parseMigrationVersion;
  computeFilenameViolations = mod.computeFilenameViolations;
});

describe("parseMigrationVersion", () => {
  it("extracts a 14-digit timestamp version and flags it valid", () => {
    const r = parseMigrationVersion("supabase/migrations/20260603120000_a02_backfill.sql");
    expect(r).toMatchObject({ version: "20260603120000", is14: true, hasDigits: true });
  });

  it("flags 8-digit date-only versions as not-14", () => {
    expect(parseMigrationVersion("20260702_x.sql")).toMatchObject({ version: "20260702", is14: false });
  });

  it("flags 3-digit numbered versions as not-14", () => {
    expect(parseMigrationVersion("001_initial.sql")).toMatchObject({ version: "001", is14: false });
  });

  it("handles a filename with no leading digits", () => {
    expect(parseMigrationVersion("baseline_schema.sql")).toMatchObject({ version: "", hasDigits: false, is14: false });
  });
});

describe("computeFilenameViolations", () => {
  it("passes a unique 14-digit timestamp", () => {
    const v = computeFilenameViolations(["20260607093000_versus_votes.sql"], new Set(["20260101000000"]));
    expect(v).toEqual([]);
  });

  it("flags a non-14-digit (date-only) version as a format violation", () => {
    const v = computeFilenameViolations(["20260702_loan_rates.sql"], new Set());
    expect(v).toEqual([{ file: "20260702_loan_rates.sql", version: "20260702", kind: "format" }]);
  });

  it("flags a 3-digit numbered file as a format violation", () => {
    const v = computeFilenameViolations(["011_thing.sql"], new Set());
    expect(v[0]).toMatchObject({ kind: "format", version: "011" });
  });

  it("flags a collision with an existing tree version", () => {
    const v = computeFilenameViolations(
      ["20260603120000_dupe.sql"],
      new Set(["20260603120000"]),
    );
    expect(v).toEqual([{ file: "20260603120000_dupe.sql", version: "20260603120000", kind: "collision-existing" }]);
  });

  it("flags two added files sharing the same version", () => {
    const v = computeFilenameViolations(
      ["20260607120000_a.sql", "20260607120000_b.sql"],
      new Set(),
    );
    expect(v).toEqual([{ file: "20260607120000_b.sql", version: "20260607120000", kind: "collision-added" }]);
  });

  it("reports a missing version as format with a readable placeholder", () => {
    const v = computeFilenameViolations(["baseline.sql"], new Set());
    expect(v[0]).toMatchObject({ kind: "format", version: "(none)" });
  });

  it("flags a 15-digit (over-length) version as a format violation", () => {
    const v = computeFilenameViolations(["202606031200000_x.sql"], new Set());
    expect(v[0]).toMatchObject({ kind: "format", version: "202606031200000" });
  });

  it("flags a zero-padded 16-digit version as a format violation", () => {
    const v = computeFilenameViolations(["0020260603120000_x.sql"], new Set());
    expect(v[0]).toMatchObject({ kind: "format", version: "0020260603120000" });
  });

  it("among three added files, flags only the later of two colliding (A/C share, B distinct)", () => {
    const v = computeFilenameViolations(
      ["20260607120000_a.sql", "20260607130000_b.sql", "20260607120000_c.sql"],
      new Set(),
    );
    expect(v).toEqual([
      { file: "20260607120000_c.sql", version: "20260607120000", kind: "collision-added" },
    ]);
  });

  it("when an added file collides with BOTH an existing and another added, existing wins (precedence)", () => {
    const v = computeFilenameViolations(
      ["20260607120000_a.sql", "20260607120000_b.sql"],
      new Set(["20260607120000"]),
    );
    // Both added files collide with the existing version → both collision-existing;
    // neither is downgraded to collision-added.
    expect(v).toEqual([
      { file: "20260607120000_a.sql", version: "20260607120000", kind: "collision-existing" },
      { file: "20260607120000_b.sql", version: "20260607120000", kind: "collision-existing" },
    ]);
  });
});

describe("parseMigrationVersion — suffix & length edge cases", () => {
  it("strips a split .up.sql / .down.sql suffix when extracting version + base", () => {
    expect(parseMigrationVersion("supabase/migrations/20260101000000_x.up.sql")).toMatchObject({
      version: "20260101000000",
      base: "20260101000000_x",
      is14: true,
    });
    expect(parseMigrationVersion("20260101000000_x.down.sql")).toMatchObject({
      version: "20260101000000",
      base: "20260101000000_x",
    });
  });

  it("tolerates an uppercase .SQL extension", () => {
    expect(parseMigrationVersion("20260101000000_x.SQL")).toMatchObject({ version: "20260101000000", is14: true });
  });

  it("treats a 15-digit leading run as not-14 (over-length)", () => {
    expect(parseMigrationVersion("202606031200000_x.sql")).toMatchObject({ is14: false, hasDigits: true });
  });
});
