// rls-isolation: referral_codes

import { describe, it, expect, vi, beforeEach } from "vitest";

interface Row {
  id: number;
  user_id: string;
  code: string;
  reward_type: string;
  max_uses: number;
  uses: number;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),
    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => {
      if (newRow.user_id !== callerUid) {
        return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
      }
      return Promise.resolve({ data: { ...newRow, id: 99 }, error: null });
    }),
    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: (col: string, val: unknown) => {
        const target = rows.find((r) => (r as unknown as Record<string, unknown>)[col] === val);
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve({ data: null, error: { code: "42501", message: "RLS violation" } });
        }
        return Promise.resolve({ data: target, error: null });
      },
    })),
    delete: vi.fn().mockReturnValue({
      eq: (col: string, val: unknown) => {
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

const SEED: Row[] = [
  { id: 1, user_id: USER_A, code: "REF-A", reward_type: "pro_1month", max_uses: 100, uses: 0 },
  { id: 2, user_id: USER_B, code: "REF-B", reward_type: "pro_1month", max_uses: 100, uses: 0 },
];

describe("referral_codes — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED], USER_A);
    clientB = buildMockTableClient([...SEED], USER_B);
  });

  it("user A can SELECT their own referral code", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_A);
  });

  it("user A cannot SELECT user B's referral code", async () => {
    const { data } = await clientA.select();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(data!.filter((r: any) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B can SELECT their own referral code", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].user_id).toBe(USER_B);
  });

  it("user A can INSERT a code owned by themselves", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_A, code: "NEW-A" });
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a code with user B's user_id", async () => {
    const { data, error } = await clientA.insert({ user_id: USER_B, code: "HACK" });
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own code", async () => {
    const { error } = await clientA.update({ uses: 1 }).eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's code", async () => {
    const { error } = await clientA.update({ uses: 1 }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own code", async () => {
    const { error } = await clientA.delete().eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's code", async () => {
    const { error } = await clientA.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });
});
