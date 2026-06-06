/**
 * Tests for scripts/check-cross-tenant-rls.mjs.
 *
 * Exercises the pure leak detector + the table registry. main() is the
 * creds-gated auth/REST wrapper, covered by the CI job where two test-user
 * credentials are present.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { join } from "node:path";

const gatePath = join(process.cwd(), "scripts/check-cross-tenant-rls.mjs");

let foreignRows: (
  rows: Record<string, unknown>[],
  ownerCol: string,
  selfId: string,
) => Record<string, unknown>[];
let USER_OWNED_TABLES: { table: string; ownerCol: string }[];

beforeAll(async () => {
  const m = await import(gatePath);
  foreignRows = m.foreignRows;
  USER_OWNED_TABLES = m.USER_OWNED_TABLES;
});

describe("foreignRows", () => {
  it("returns nothing when every row belongs to the caller", () => {
    const rows = [{ user_id: "u1" }, { user_id: "u1" }];
    expect(foreignRows(rows, "user_id", "u1")).toEqual([]);
  });

  it("flags rows owned by another user (the leak)", () => {
    const rows = [{ user_id: "u1" }, { user_id: "u2" }, { user_id: "u1" }];
    expect(foreignRows(rows, "user_id", "u1")).toEqual([{ user_id: "u2" }]);
  });

  it("compares as strings so numeric/uuid id types don't false-pass", () => {
    expect(foreignRows([{ user_id: 2 }], "user_id", "1")).toEqual([{ user_id: 2 }]);
    expect(foreignRows([{ user_id: 1 }], "user_id", "1")).toEqual([]);
  });

  it("honours the configured owner column (auth_user_id)", () => {
    const rows = [{ auth_user_id: "me" }, { auth_user_id: "other" }];
    expect(foreignRows(rows, "auth_user_id", "me")).toEqual([{ auth_user_id: "other" }]);
  });

  it("treats an empty result set as isolated (deny-all / no rows)", () => {
    expect(foreignRows([], "user_id", "u1")).toEqual([]);
  });
});

describe("USER_OWNED_TABLES registry", () => {
  it("is non-empty and every entry has a table + ownerCol", () => {
    expect(USER_OWNED_TABLES.length).toBeGreaterThan(0);
    for (const e of USER_OWNED_TABLES) {
      expect(typeof e.table).toBe("string");
      expect(e.table.length).toBeGreaterThan(0);
      expect(["user_id", "auth_user_id"]).toContain(e.ownerCol);
    }
  });

  it("has no duplicate table entries", () => {
    const names = USER_OWNED_TABLES.map((e) => e.table);
    expect(new Set(names).size).toBe(names.length);
  });
});
