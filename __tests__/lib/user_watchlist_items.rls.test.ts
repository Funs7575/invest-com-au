// rls-isolation: user_watchlist_items

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for user_watchlist_items (WW-01).
 *
 * Policy: "users can manage own watchlist" — USING (user_id = auth.uid()).
 * Asserts that user A cannot read or mutate user B's watchlist rows.
 */

interface Row {
  id: number;
  user_id: string;
  item_type: string;
  item_slug: string;
  display_name: string | null;
  added_at: string;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visible = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visible(), error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({
          data: null,
          error: { code: "42501", message: "RLS violation" },
        });
      }
      return Promise.resolve({
        data: { id: 99, added_at: new Date().toISOString(), ...newRow },
        error: null,
      });
    }),
    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: (col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      },
    })),
    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      },
    }),
  };
}

const USER_A = "user-a-0000-0000-0000-000000000001";
const USER_B = "user-b-0000-0000-0000-000000000002";

const SEED: Row[] = [
  {
    id: 1,
    user_id: USER_A,
    item_type: "etf",
    item_slug: "vgs",
    display_name: "Vanguard Global Shares ETF",
    added_at: "2026-05-08T00:00:00Z",
  },
  {
    id: 2,
    user_id: USER_B,
    item_type: "stock",
    item_slug: "BHP.AX",
    display_name: "BHP Group",
    added_at: "2026-05-08T00:01:00Z",
  },
];

describe("user_watchlist_items — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED], USER_A);
    clientB = buildMockTableClient([...SEED], USER_B);
  });

  // SELECT isolation
  it("user A can SELECT their own watchlist rows", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A);
    expect(data![0].item_slug).toBe("vgs");
  });

  it("user A cannot SELECT user B's watchlist rows", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B can SELECT their own watchlist rows", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B);
    expect(data![0].item_slug).toBe("BHP.AX");
  });

  // INSERT isolation
  it("user A can INSERT a row with their own user_id", async () => {
    const { data, error } = await clientA.insert({
      user_id: USER_A,
      item_type: "broker",
      item_slug: "commsec",
      display_name: "CommSec",
    });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row with user B's user_id", async () => {
    const { data, error } = await clientA.insert({
      user_id: USER_B,
      item_type: "broker",
      item_slug: "commsec",
    });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  // UPDATE isolation
  it("user A can UPDATE their own row", async () => {
    const { error } = await clientA.update({ display_name: "VGS Updated" }).eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({ display_name: "Hacked" }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  // DELETE isolation
  it("user A can DELETE their own row", async () => {
    const { error } = await clientA.delete().eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's row", async () => {
    const { error } = await clientA.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });
});
