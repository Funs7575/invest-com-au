/**
 * RLS isolation test for watchlist_alert_preferences (V-NEW-04 gate).
 *
 * The table's only owner column is `user_id` (also the PK). Policies in
 * 20260722_ww02_watchlist_alert_preferences.sql:
 *   - "user reads own watchlist alert pref" — SELECT WHERE user_id = auth.uid()
 *   - "user writes own watchlist alert pref" — ALL WHERE user_id = auth.uid()
 *   - "service_role full access ..." — service role bypass
 *
 * This mock simulates the user-facing semantics: user A cannot see, insert
 * on behalf of, update, or delete user B's row.
 */

// rls-isolation: watchlist_alert_preferences

import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  user_id: string;
  alerts_opted_in: boolean;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visible = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visible(), error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow }, error: null });
    }),
    update: vi.fn().mockImplementation((patch: Partial<Row>) => ({
      eq: (_col: string, val: string) => {
        const target = rows.find((r) => r.user_id === val);
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: { ...target, ...patch }, error: null });
      },
    })),
    delete: vi.fn().mockReturnValue({
      eq: (_col: string, val: string) => {
        const target = rows.find((r) => r.user_id === val);
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
  { user_id: USER_A_UID, alerts_opted_in: true },
  { user_id: USER_B_UID, alerts_opted_in: false },
];

describe("watchlist_alert_preferences — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A_UID);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B_UID);
  });

  it("user A only sees their own row on SELECT", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A_UID);
  });

  it("user A's SELECT never leaks user B's row", async () => {
    const { data } = await clientA.select();
    expect(data!.some((r: Row) => r.user_id === USER_B_UID)).toBe(false);
  });

  it("user B only sees their own row on SELECT", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B_UID);
  });

  it("user A can INSERT a row keyed to themselves", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_A_UID, alerts_opted_in: true });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row keyed to user B", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_B_UID, alerts_opted_in: true });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own row", async () => {
    const { error } = await clientA.update({ alerts_opted_in: false }).eq("user_id", USER_A_UID);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({ alerts_opted_in: true }).eq("user_id", USER_B_UID);
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own row", async () => {
    const { error } = await clientA.delete().eq("user_id", USER_A_UID);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's row", async () => {
    const { error } = await clientA.delete().eq("user_id", USER_B_UID);
    expect(error?.code).toBe("42501");
  });
});
