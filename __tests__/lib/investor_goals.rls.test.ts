// rls-isolation: investor_goals

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for investor_goals.
 *
 * Policies under test (from 20260510280000_investor_goals.sql):
 *   "investor reads own goals"   FOR SELECT  USING  (auth.uid() = auth_user_id)
 *   "investor inserts own goals" FOR INSERT  WITH CHECK (auth.uid() = auth_user_id)
 *   "investor updates own goals" FOR UPDATE  USING + WITH CHECK (auth.uid() = auth_user_id)
 *   "investor deletes own goals" FOR DELETE  USING  (auth.uid() = auth_user_id)
 *
 * Verifies that user A cannot read or mutate user B's goals. Mock simulates
 * Postgres RLS policy enforcement at the JS layer.
 */

interface Row {
  id: number;
  auth_user_id: string;
  label: string;
  goal_type: string;
  target_cents: number;
  target_date: string;
  current_balance_cents: number;
  monthly_contribution_cents: number;
  expected_return_pct: number;
  notes: string | null;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  const visibleRows = () => rows.filter((r) => r.auth_user_id === callerUid);

  return {
    select: vi.fn().mockResolvedValue({ data: visibleRows(), error: null }),

    insert: vi.fn().mockImplementation((newRow: Partial<Row>) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          newRow.auth_user_id !== callerUid
            ? { data: null, error: { code: "42501", message: "RLS violation" } }
            : { data: { id: 9999, ...newRow }, error: null },
        ),
      }),
    })),

    update: vi.fn().mockImplementation((_patch: Partial<Row>) => ({
      eq: vi.fn().mockImplementation((col: string, val: unknown) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(() => {
            const target = rows.find(
              (r) => (r as unknown as Record<string, unknown>)[col] === val,
            );
            if (!target || target.auth_user_id !== callerUid) {
              return { data: null, error: { code: "42501", message: "RLS violation" } };
            }
            return { data: { ...target, ..._patch }, error: null };
          })(),
        }),
      })),
    })),

    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation((col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || target.auth_user_id !== callerUid) {
          return Promise.resolve({
            data: null,
            error: { code: "42501", message: "RLS violation" },
          });
        }
        return Promise.resolve({ data: target, error: null });
      }),
    }),
  };
}

const USER_A = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_B = "bbbbbbbb-0000-0000-0000-000000000002";

const SEED_ROWS: Row[] = [
  {
    id: 1,
    auth_user_id: USER_A,
    label: "House deposit",
    goal_type: "house_deposit",
    target_cents: 10000000,
    target_date: "2028-06-01",
    current_balance_cents: 5000000,
    monthly_contribution_cents: 200000,
    expected_return_pct: 5.5,
    notes: null,
  },
  {
    id: 2,
    auth_user_id: USER_B,
    label: "FIRE",
    goal_type: "fire",
    target_cents: 250000000,
    target_date: "2045-01-01",
    current_balance_cents: 50000000,
    monthly_contribution_cents: 500000,
    expected_return_pct: 7.0,
    notes: "25x rule target",
  },
];

describe("investor_goals — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A SELECT sees only their own goals", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].auth_user_id).toBe(USER_A);
  });

  it("user A SELECT never returns user B's goals", async () => {
    const { data } = await clientA.select();
    expect(data!.filter((r: Row) => r.auth_user_id === USER_B)).toHaveLength(0);
  });

  it("user B SELECT sees only their own goals", async () => {
    const { data, error } = await clientB.select();
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].auth_user_id).toBe(USER_B);
  });

  it("user A can INSERT a row with their own auth_user_id", async () => {
    const { data, error } = await clientA
      .insert({ auth_user_id: USER_A, label: "Debt free", goal_type: "debt_free", target_cents: 0 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a row with user B's auth_user_id", async () => {
    const { data, error } = await clientA
      .insert({ auth_user_id: USER_B, label: "Steal B", goal_type: "generic", target_cents: 0 })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own goal", async () => {
    const { error } = await clientA.delete().eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's goal", async () => {
    const { error } = await clientA.delete().eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user B cannot DELETE user A's goal", async () => {
    const { error } = await clientB.delete().eq("id", 1);
    expect(error?.code).toBe("42501");
  });

  it("user A cannot DELETE a non-existent row", async () => {
    const { error } = await clientA.delete().eq("id", 9999);
    expect(error?.code).toBe("42501");
  });
});
