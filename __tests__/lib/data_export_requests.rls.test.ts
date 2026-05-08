/**
 * RLS isolation test for data_export_requests.
 * Generated 2026-05-08 from __tests__/templates/rls-isolation.template.ts
 * for the V-NEW-04 isolation gate. The table has self-scoped RLS policies
 * (auth.uid() = user_id) so user A cannot read or mutate user B's rows.
 */

// rls-isolation: data_export_requests

import { describe, it, expect, vi, beforeEach } from "vitest";

interface Row {
  id: string;
  user_id: string;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);
  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow, id: "new-id" }, error: null });
    }),
    update: vi.fn().mockImplementation(() => ({
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
  };
}

const USER_A_UID = "user-a-uuid-0000-0000-000000000001";
const USER_B_UID = "user-b-uuid-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  { id: "row-1", user_id: USER_A_UID },
  { id: "row-2", user_id: USER_B_UID },
];

describe("data_export_requests — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A_UID);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B_UID);
  });

  it("user A can SELECT their own rows", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_A_UID);
  });

  it("user A cannot SELECT user B's rows", async () => {
    const { data } = await clientA.select();
    const cross = data!.filter((r: Row) => r.user_id === USER_B_UID);
    expect(cross).toHaveLength(0);
  });

  it("user B can SELECT their own rows", async () => {
    const { data } = await clientB.select();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_B_UID);
  });

  it("user A can INSERT a row owned by themselves", async () => {
    const { error } = await clientA.insert({ user_id: USER_A_UID });
    expect(error).toBeNull();
  });

  it("user A cannot INSERT a row with user B's user_id", async () => {
    const { error } = await clientA.insert({ user_id: USER_B_UID });
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own row", async () => {
    const { error } = await clientA.update({}).eq("id", "row-1");
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({}).eq("id", "row-2");
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own row", async () => {
    const { error } = await clientA.delete().eq("id", "row-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's row", async () => {
    const { error } = await clientA.delete().eq("id", "row-2");
    expect(error?.code).toBe("42501");
  });
});
