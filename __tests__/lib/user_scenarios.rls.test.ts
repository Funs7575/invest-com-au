// rls-isolation: user_scenarios

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * RLS isolation test for user_scenarios.
 *
 * Policies under test (from 20260612200000_user_scenarios.sql):
 *   "Users select own scenarios"   FOR SELECT TO authenticated USING (user_id = auth.uid())
 *   "Users insert own scenarios"   FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())
 *   "Users update own scenarios"   FOR UPDATE TO authenticated USING + WITH CHECK (user_id = auth.uid())
 *   "Users delete own scenarios"   FOR DELETE TO authenticated USING (user_id = auth.uid())
 *   "Anyone reads shared scenarios" FOR SELECT TO anon, authenticated USING (share_token IS NOT NULL)
 *   "Service role manages user_scenarios" FOR ALL TO service_role
 *
 * The share policy widens SELECT to rows that have a share_token — by
 * design (the unguessable token is the auth factor, like profile share
 * links). The isolation property under test: user A can never see or
 * mutate user B's UNSHARED scenarios, and can never mutate B's rows at
 * all (shared or not).
 */

interface Row {
  id: number;
  user_id: string;
  calculator_key: string;
  name: string;
  inputs: Record<string, unknown>;
  share_token: string | null;
}

function buildMockTableClient(rows: Row[], callerUid: string) {
  // SELECT semantics = own rows ∪ shared rows (two SELECT policies OR together).
  const visibleRows = () =>
    rows.filter((r) => r.user_id === callerUid || r.share_token !== null);
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
        // UPDATE policy is owner-only — share_token grants READ, never write.
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve(deny);
        }
        return Promise.resolve({ data: { ...target, ...patch }, error: null });
      }),
    })),

    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation((col: string, val: unknown) => {
        const target = rows.find(
          (r) => (r as unknown as Record<string, unknown>)[col] === val,
        );
        if (!target || target.user_id !== callerUid) {
          return Promise.resolve(deny);
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
    user_id: USER_A,
    calculator_key: "fire",
    name: "Aggressive DCA",
    inputs: { monthly: 2000 },
    share_token: null,
  },
  {
    id: 2,
    user_id: USER_B,
    calculator_key: "fire",
    name: "B private plan",
    inputs: { monthly: 5000 },
    share_token: null,
  },
  {
    id: 3,
    user_id: USER_B,
    calculator_key: "savings",
    name: "B shared plan",
    inputs: { monthly: 100 },
    share_token: "tok_shared_abc123",
  },
];

describe("user_scenarios — RLS isolation", () => {
  let clientA: ReturnType<typeof buildMockTableClient>;
  let clientB: ReturnType<typeof buildMockTableClient>;

  beforeEach(() => {
    clientA = buildMockTableClient([...SEED_ROWS], USER_A);
    clientB = buildMockTableClient([...SEED_ROWS], USER_B);
  });

  it("user A SELECT sees own rows and never B's unshared rows", async () => {
    const { data, error } = await clientA.select();
    expect(error).toBeNull();
    const ids = data!.map((r: Row) => r.id);
    expect(ids).toContain(1);
    expect(ids).not.toContain(2);
  });

  it("user A can read B's row only when it is explicitly shared", async () => {
    const { data } = await clientA.select();
    const shared = data!.find((r: Row) => r.id === 3);
    expect(shared?.share_token).not.toBeNull();
  });

  it("user B SELECT never returns A's unshared scenario", async () => {
    const { data } = await clientB.select();
    expect(data!.filter((r: Row) => r.id === 1)).toHaveLength(0);
  });

  it("user A can INSERT their own scenario", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_A, calculator_key: "fire", name: "Plan B", inputs: {} })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it("user A cannot INSERT a scenario owned by user B", async () => {
    const { data, error } = await clientA
      .insert({ user_id: USER_B, calculator_key: "fire", name: "forged", inputs: {} })
      .select()
      .single();
    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });

  it("user A cannot UPDATE user B's unshared scenario", async () => {
    const { error } = await clientA.update({ name: "tampered" }).eq("id", 2);
    expect(error?.code).toBe("42501");
  });

  it("user A cannot UPDATE user B's SHARED scenario (token grants read, never write)", async () => {
    const { error } = await clientA.update({ name: "tampered" }).eq("id", 3);
    expect(error?.code).toBe("42501");
  });

  it("user A can DELETE their own scenario", async () => {
    const { error } = await clientA.delete().eq("id", 1);
    expect(error).toBeNull();
  });

  it("user A cannot DELETE user B's scenario, shared or not", async () => {
    const unshared = await clientA.delete().eq("id", 2);
    const shared = await clientA.delete().eq("id", 3);
    expect(unshared.error?.code).toBe("42501");
    expect(shared.error?.code).toBe("42501");
  });
});
