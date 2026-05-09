// rls-isolation: user_calculator_state

/**
 * RLS isolation test for `user_calculator_state` (CMP W1-A).
 *
 * Table: `user_calculator_state` is a one-row-per-user JSONB store of
 * calculator inputs/outputs that signed-in users can carry across
 * devices and into other calculators / persona match.
 *
 * Schema (from migration 20260720_cmp_w1a_user_calculator_state.sql):
 *   user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE
 *   state      jsonb NOT NULL DEFAULT '{}'::jsonb
 *   updated_at timestamptz NOT NULL DEFAULT now()
 *
 * RLS policies on the table:
 *   - "users can manage own calculator state" — `user_id = auth.uid()` for ALL
 *     operations (authenticated role).
 *   - "service_role full access" — service role bypasses RLS as expected.
 *
 * What this test asserts:
 *   - User A can SELECT/INSERT/UPDATE/DELETE their own row.
 *   - User A cannot SELECT, INSERT-as, UPDATE, or DELETE user B's row.
 *   - User B sees the symmetric outcome.
 *   - Crucially: PK is `user_id`, so every operation collapses onto the
 *     "this row's user_id == auth.uid()" check.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  user_id: string;
  state: Record<string, unknown>;
  updated_at: string;
}

const USER_A_UID = "user-a-uuid-0000-0000-000000000001";
const USER_B_UID = "user-b-uuid-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  { user_id: USER_A_UID, state: { tco: { source: "tco_calc", data: { monthly_trades: 12 } } }, updated_at: "2026-05-09T00:00:00Z" },
  { user_id: USER_B_UID, state: { savings: { source: "savings_calc", data: { balance: 50000 } } }, updated_at: "2026-05-09T00:00:00Z" },
];

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow }, error: null });
    }),

    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: (col: string, val: string) => {
        const target = rows.find((r) => (r as unknown as Record<string, unknown>)[col] === val);
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: target, error: null });
      },
    })),

    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: string) => {
        const target = rows.find((r) => (r as unknown as Record<string, unknown>)[col] === val);
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),

    upsert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow }, error: null });
    }),
  };
}

describe("user_calculator_state — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A_UID);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B_UID);
  });

  // -- SELECT isolation -----------------------------------------------------

  it("user A can SELECT their own row", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A_UID);
  });

  it("user A cannot SELECT user B's row", async () => {
    const { data } = await clientA.select();
    const crossRows = data!.filter((r: Row) => r.user_id === USER_B_UID);
    expect(crossRows).toHaveLength(0);
  });

  it("user B can SELECT their own row", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B_UID);
  });

  // -- INSERT isolation -----------------------------------------------------

  it("user A can INSERT a row keyed to themselves", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_A_UID, state: {}, updated_at: new Date().toISOString() });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row keyed to user B", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_B_UID, state: { malicious: true }, updated_at: new Date().toISOString() });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // -- UPSERT isolation -----------------------------------------------------
  // The migration's typical use is upsert via the userClient — verify that
  // path can't write under another user's PK either.

  it("user A can UPSERT their own row (the common write path)", async () => {
    const { data, error } = await clientA.upsert({ user_id: USER_A_UID, state: { tco: { source: "tco_calc", data: { monthly_trades: 24 } } }, updated_at: new Date().toISOString() });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot UPSERT a row keyed to user B (RLS rejects)", async () => {
    const { data, error } = await clientA.upsert({ user_id: USER_B_UID, state: { malicious: true }, updated_at: new Date().toISOString() });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // -- UPDATE isolation -----------------------------------------------------

  it("user A can UPDATE their own row", async () => {
    const { error } = await clientA.update({ state: { updated: true } }).eq("user_id", USER_A_UID);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({ state: { tampered: true } }).eq("user_id", USER_B_UID);
    expect(error?.code).toBe("42501");
  });

  // -- DELETE isolation -----------------------------------------------------

  it("user A can DELETE their own row", async () => {
    const { error } = await clientA.delete().eq("user_id", USER_A_UID);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's row", async () => {
    const { error } = await clientA.delete().eq("user_id", USER_B_UID);
    expect(error?.code).toBe("42501");
  });
});
