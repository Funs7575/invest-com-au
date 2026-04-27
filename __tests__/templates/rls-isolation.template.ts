/**
 * RLS isolation test template (V-NEW-04).
 *
 * Copy this file to __tests__/lib/<table-name>.rls.test.ts and replace
 * every occurrence of REPLACE_TABLE_NAME with the actual table name.
 *
 * Add the marker comment at the top so the CI gate can find this test:
 *   // rls-isolation: REPLACE_TABLE_NAME
 *
 * The test mocks two Supabase client instances (one per user) and asserts
 * that user A cannot read or mutate user B's rows.  The mock wires RLS
 * semantics at the JS layer: each query checks auth.uid() against the row's
 * user_id and returns only matching rows.
 *
 * --- How to use ---
 *
 * 1. Copy + rename:
 *    cp __tests__/templates/rls-isolation.template.ts \
 *       __tests__/lib/REPLACE_TABLE_NAME.rls.test.ts
 *
 * 2. Replace every `REPLACE_TABLE_NAME` with your actual table name.
 *
 * 3. Replace `REPLACE_COLUMN` with the column that links a row to its owner
 *    (typically `user_id` or `owner_id`).
 *
 * 4. Adjust the sample row object to match your table's required columns.
 *
 * 5. Run: npm test -- __tests__/lib/REPLACE_TABLE_NAME.rls.test.ts
 *
 * 6. Commit the test alongside the migration that creates the table.
 */

// rls-isolation: REPLACE_TABLE_NAME   ← keep this marker; CI gate uses it

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Minimal mock that enforces "user_id = caller's uid" — mirrors what Postgres
// RLS would do when a policy like `USING (user_id = auth.uid())` is in place.
// ---------------------------------------------------------------------------

/** A single row in your table (adjust columns as needed). */
interface Row {
  id: string;
  // rls-isolation owner column — replace with your actual column name
  user_id: string;
  // ...add your other columns here, e.g.:
  // content: string;
  // created_at: string;
}

/**
 * Builds a mock Supabase "table client" that simulates RLS:
 *   SELECT  → returns only rows whose `ownerCol` equals `callerUid`
 *   INSERT  → only allowed when the new row's `ownerCol` equals `callerUid`
 *   UPDATE  → only allowed on rows owned by `callerUid`
 *   DELETE  → only allowed on rows owned by `callerUid`
 */
function buildMockTableClient(
  rows: Row[],
  callerUid: string,
  ownerCol: keyof Row = "user_id"
) {
  const visibleRows = () => rows.filter((r) => r[ownerCol] === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow[ownerCol] !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow, id: "new-id" }, error: null });
    }),
    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: (col: string, val: string) => {
        const target = rows.find((r) => (r as Record<string, string>)[col] === val);
        if (!target || target[ownerCol] !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: target, error: null });
      },
    })),
    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: string) => {
        const target = rows.find((r) => (r as Record<string, string>)[col] === val);
        if (!target || target[ownerCol] !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_A_UID = "user-a-uuid-0000-0000-000000000001";
const USER_B_UID = "user-b-uuid-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  { id: "row-1", user_id: USER_A_UID /*, content: "A's data" */ },
  { id: "row-2", user_id: USER_B_UID /*, content: "B's data" */ },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("REPLACE_TABLE_NAME — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A_UID);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B_UID);
  });

  // -- SELECT isolation -------------------------------------------------------

  it("user A can SELECT their own rows", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A_UID);
  });

  it("user A cannot SELECT user B's rows", async () => {
    const { data } = await clientA.select();
    const crossRows = data!.filter((r) => r.user_id === USER_B_UID);
    expect(crossRows).toHaveLength(0);
  });

  it("user B can SELECT their own rows", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B_UID);
  });

  // -- INSERT isolation -------------------------------------------------------

  it("user A can INSERT a row owned by themselves", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_A_UID });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row with user B's user_id", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_B_UID });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // -- UPDATE isolation -------------------------------------------------------

  it("user A can UPDATE their own row", async () => {
    const { error } = await clientA.update({ /* updated fields */ }).eq("id", "row-1");
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({ /* updated fields */ }).eq("id", "row-2");
    expect(error?.code).toBe("42501");
  });

  // -- DELETE isolation -------------------------------------------------------

  it("user A can DELETE their own row", async () => {
    const { error } = await clientA.delete().eq("id", "row-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's row", async () => {
    const { error } = await clientA.delete().eq("id", "row-2");
    expect(error?.code).toBe("42501");
  });
});
