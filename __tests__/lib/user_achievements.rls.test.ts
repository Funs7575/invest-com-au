// rls-isolation: user_achievements

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for user_achievements.
 *
 * Policies under test (from 20260612201000_user_achievements.sql):
 *   "user_achievements_own_read"   FOR SELECT USING (auth.uid() = user_id)
 *   "user_achievements_service_all" FOR ALL TO service_role
 *
 * There is deliberately NO authenticated INSERT/UPDATE/DELETE policy —
 * awards are written exclusively server-side via awardIfEligible()
 * (service role). The mock therefore denies every authenticated mutation,
 * own rows included, and verifies user A can never read user B's awards.
 */

interface Row {
  id: number;
  user_id: string;
  quest_id: string;
  awarded_at: string;
  meta: Record<string, unknown>;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);
  const deny = { data: null, error: { code: "42501", message: "RLS violation" } };

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    // No authenticated INSERT policy → every insert denied, even own-uid rows.
    insert: vi.fn().mockImplementation((_newRow: Partial<Row>) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(deny),
      }),
    })),

    // No authenticated UPDATE policy → denied.
    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: vi.fn().mockResolvedValue(deny),
    })),

    // No authenticated DELETE policy → denied.
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(deny),
    }),
  };
}

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  {
    id: 1,
    user_id: USER_A,
    quest_id: "first-goal",
    awarded_at: "2026-06-01T00:00:00Z",
    meta: {},
  },
  {
    id: 2,
    user_id: USER_B,
    quest_id: "first-holding",
    awarded_at: "2026-06-02T00:00:00Z",
    meta: { source: "holdings" },
  },
];

describe("user_achievements — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A SELECT sees only their own awards", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_A);
  });

  it("user A SELECT never returns user B's awards", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B SELECT sees only their own awards", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_B);
  });

  it("user A cannot INSERT an award for user B (no authenticated INSERT policy)", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_B, quest_id: "stolen" })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A cannot INSERT an award even for themselves (service-role-only writes)", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_A, quest_id: "self-award" })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A cannot UPDATE user B's award", async () => {
    const { error } = await clientA.update({ quest_id: "tampered" }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user A cannot DELETE user B's award", async () => {
    const { error } = await clientA.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user B cannot DELETE user A's award", async () => {
    const { error } = await clientB.delete().eq("id", 1);
    expect(error?.code).toBe("42501");
  });
});
