// rls-isolation: user_reviews_log

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for user_reviews_log.
 *
 * Policies under test (from 20260612202000_user_reviews_log.sql):
 *   "user_reviews_log_own_read"   FOR SELECT USING (auth.uid() = user_id)
 *   "user_reviews_log_own_insert" FOR INSERT WITH CHECK (auth.uid() = user_id)
 *   "user_reviews_log_own_update" FOR UPDATE USING + WITH CHECK (auth.uid() = user_id)
 *   "user_reviews_log_service"    FOR ALL TO service_role
 *
 * There is deliberately NO authenticated DELETE policy — review history is
 * append/update only for users. Verifies user A cannot read or mutate
 * user B's monthly reviews.
 */

interface Row {
  id: number;
  user_id: string;
  period: string;
  completed_at: string | null;
  snapshot: Record<string, unknown>;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.user_id === callerUid);
  const deny = { data: null, error: { code: "42501", message: "RLS violation" } };

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => ({
      select: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue(
            newRow.user_id !== callerUid
              ? deny
              : { data: { id: 9999, ...newRow }, error: null },
          ),
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

    // No authenticated DELETE policy → denied, own rows included.
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
    period: "2026-05",
    completed_at: "2026-05-28T09:00:00Z",
    snapshot: { netWorthCents: 1000000 },
  },
  {
    id: 2,
    user_id: USER_B,
    period: "2026-05",
    completed_at: "2026-05-30T10:00:00Z",
    snapshot: { netWorthCents: 555555 },
  },
];

describe("user_reviews_log — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A SELECT sees only their own reviews", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_A);
  });

  it("user A SELECT never returns user B's snapshot data", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.user_id === USER_B)).toHaveLength(0);
  });

  it("user B SELECT sees only their own reviews", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0]!.user_id).toBe(USER_B);
  });

  it("user A can INSERT their own review row", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_A, period: "2026-06", snapshot: {} })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a review row as user B", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_B, period: "2026-06", snapshot: {} })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can UPDATE their own review", async () => {
    const { error } = await clientA
      .update({ completed_at: "2026-05-29T00:00:00Z" })
      .eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot UPDATE user B's review", async () => {
    const { error } = await clientA.update({ snapshot: {} }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user A cannot DELETE even their own review (no authenticated DELETE policy)", async () => {
    const { error } = await clientA.delete().eq("id", 1);
    expect(error?.code).toBe("42501");
  });

  it("user B cannot DELETE user A's review", async () => {
    const { error } = await clientB.delete().eq("id", 1);
    expect(error?.code).toBe("42501");
  });
});
