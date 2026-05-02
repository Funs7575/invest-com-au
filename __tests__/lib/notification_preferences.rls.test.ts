// rls-isolation: notification_preferences

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for notification_preferences.
 *
 * Policy under test: "User can manage own preferences"
 *   FOR ALL TO authenticated
 *   USING  (user_id = auth.uid())
 *   WITH CHECK (user_id = auth.uid())
 *
 * Verifies that user A cannot read or mutate user B's notification preference
 * row. The mock simulates the Postgres RLS policy at the JS layer.
 */

interface Row {
  id: string;
  user_id: string;
  fee_alerts: boolean;
  weekly_digest: boolean;
  deal_alerts: boolean;
  campaign_updates: boolean;
  marketing: boolean;
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
  };
}

const USER_A = "user-a-uuid-0000-0000-000000000001";
const USER_B = "user-b-uuid-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  { id: "pref-1", user_id: USER_A, fee_alerts: true, weekly_digest: true, deal_alerts: true, campaign_updates: true, marketing: false },
  { id: "pref-2", user_id: USER_B, fee_alerts: false, weekly_digest: false, deal_alerts: false, campaign_updates: false, marketing: false },
];

describe("notification_preferences — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A can SELECT their own preferences", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A);
  });

  it("user A cannot SELECT user B's preferences", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B can SELECT their own preferences", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B);
  });

  it("user A can INSERT a row with their own user_id", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_A, weekly_digest: true, marketing: false });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row with user B's user_id", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_B, weekly_digest: true });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own preference row", async () => {
    const { error } = await clientA.update({ fee_alerts: false }).eq("id", "pref-1");
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's preference row", async () => {
    const { error } = await clientA.update({ fee_alerts: true }).eq("id", "pref-2");
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own preference row", async () => {
    const { error } = await clientA.delete().eq("id", "pref-1");
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's preference row", async () => {
    const { error } = await clientA.delete().eq("id", "pref-2");
    expect(error?.code).toBe("42501");
  });
});
