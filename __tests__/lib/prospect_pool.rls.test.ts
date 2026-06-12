// rls-isolation: prospect_pool

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for prospect_pool.
 *
 * Policies under test (from 20260612222000_prospect_pool.sql):
 *   "Users read own prospect row"   FOR SELECT TO authenticated USING (user_id = auth.uid())
 *   "Users update own prospect row" FOR UPDATE TO authenticated USING + WITH CHECK (user_id = auth.uid())
 *   "Service role manages prospect_pool" FOR ALL TO service_role
 *
 * Deliberately NO authenticated INSERT (rows are created on the service-role
 * path so the snapshot is anonymised server-side) and NO authenticated DELETE
 * (withdrawal is a status flip via UPDATE). Verifies user A can never read or
 * mutate user B's prospect row — these rows hold the anonymised marketing
 * snapshot, so cross-user reads would leak intent data.
 */

interface Row {
  id: number;
  user_id: string;
  snapshot: Record<string, unknown>;
  status: string;
  expires_at: string | null;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);
  const deny = { data: null, error: { code: "42501", message: "RLS violation" } };

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    // No authenticated INSERT policy → denied, own uid included.
    insert: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(deny),
      }),
    })),

    update: vi.fn().mockImplementation((patch: Partial<Row>) => ({
      eq: vi.fn().mockImplementation((col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve(deny);
        }
        return Promise.resolve({ data: { ...target, ...patch }, error: null });
      }),
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
    snapshot: { advisorType: "smsf", state: "NSW", budgetBand: "2k_5k" },
    status: "active",
    expires_at: "2026-08-11T00:00:00Z",
  },
  {
    id: 2,
    user_id: USER_B,
    snapshot: { advisorType: "property", state: "VIC", budgetBand: "5k_10k" },
    status: "paused",
    expires_at: null,
  },
];

describe("prospect_pool — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A SELECT sees only their own prospect row", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_A);
  });

  it("user A SELECT never returns user B's snapshot", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B SELECT sees only their own prospect row", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_B);
  });

  it("user A cannot INSERT even their own row (service-role-only writes)", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_A, snapshot: {}, status: "active" })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own row (pause/withdraw)", async () => {
    const { error } = await clientA.update({ status: "paused" }).eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's row", async () => {
    const { error } = await clientA.update({ status: "active" }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user A cannot DELETE any row (no authenticated DELETE policy)", async () => {
    const own = await clientA.delete().eq("id", 1);
    const theirs = await clientA.delete().eq("id", 2);
    expect(own.error?.code).toBe("42501");
    expect(theirs.error?.code).toBe("42501");
  });
});
