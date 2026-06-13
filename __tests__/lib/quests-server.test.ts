import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Award-path tests for Consumer Quests (idea #19).
 *
 * Covers: flag-off no-op, unknown-quest no-op, threshold gating,
 * idempotency (already-earned ⇒ false, no throw), fail-soft on insert error,
 * and awardByEmail's anonymous (unregistered email) no-op.
 *
 * All collaborators are mocked. Per CLAUDE.md, the module-scope vars
 * referenced inside vi.mock factories are declared via vi.hoisted() so they
 * exist before the hoisted mock factories run.
 */

const {
  mockIsFlagEnabled,
  mockUpsert,
  mockSelect,
  mockBuildEmailToUserIdMap,
  upsertCalls,
} = vi.hoisted(() => {
  const upsertCalls: Array<{ row: unknown; opts: unknown }> = [];
  return {
    upsertCalls,
    // default: flag ON. Individual tests flip this. Variadic so the mock
    // factory can forward the real (flagKey, context) call signature.
    mockIsFlagEnabled: vi.fn(async (..._args: unknown[]) => true),
    // default: a fresh insert (count 1). Tests override per-case.
    mockUpsert: vi.fn(
      async (row: unknown, opts: unknown): Promise<{ error: { message: string } | null; count: number | null }> => {
        upsertCalls.push({ row, opts });
        return { error: null, count: 1 };
      },
    ),
    mockSelect: vi.fn(),
    mockBuildEmailToUserIdMap: vi.fn(
      async (..._args: unknown[]) => new Map<string, string>(),
    ),
  };
});

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: (...args: unknown[]) => mockBuildEmailToUserIdMap(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      upsert: (row: unknown, opts: unknown) => mockUpsert(row, opts),
      select: (...args: unknown[]) => mockSelect(...args),
    }),
  }),
}));

// Silence the structured logger so fail-soft paths don't spam test output.
vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  awardIfEligible,
  awardByEmail,
  getUserAwards,
  CONSUMER_QUESTS_FLAG,
} from "@/lib/quests-server";

const USER = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
  upsertCalls.length = 0;
  mockIsFlagEnabled.mockImplementation(async () => true);
  mockUpsert.mockImplementation(async (row, opts) => {
    upsertCalls.push({ row, opts });
    return { error: null, count: 1 };
  });
  mockBuildEmailToUserIdMap.mockImplementation(async () => new Map<string, string>());
});

describe("CONSUMER_QUESTS_FLAG", () => {
  it("is the consumer_quests flag key", () => {
    expect(CONSUMER_QUESTS_FLAG).toBe("consumer_quests");
  });
});

describe("awardIfEligible", () => {
  it("awards a fresh quest and returns true", async () => {
    const ok = await awardIfEligible(USER, "first-holding");
    expect(ok).toBe(true);
    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0]!.row).toMatchObject({
      user_id: USER,
      quest_id: "first-holding",
    });
    // idempotent upsert config
    expect(upsertCalls[0]!.opts).toMatchObject({
      onConflict: "user_id,quest_id",
      ignoreDuplicates: true,
    });
  });

  it("is a no-op (false) when the flag is OFF and never touches the DB", async () => {
    mockIsFlagEnabled.mockImplementation(async () => false);
    const ok = await awardIfEligible(USER, "first-holding");
    expect(ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("checks the flag keyed by userId + user segment", async () => {
    await awardIfEligible(USER, "first-holding");
    expect(mockIsFlagEnabled).toHaveBeenCalledWith(CONSUMER_QUESTS_FLAG, {
      userKey: USER,
      segment: "user",
    });
  });

  it("returns false for an empty userId without hitting the flag or DB", async () => {
    const ok = await awardIfEligible("", "first-holding");
    expect(ok).toBe(false);
    expect(mockIsFlagEnabled).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns false for an unknown quest id and never writes", async () => {
    const ok = await awardIfEligible(USER, "totally-made-up");
    expect(ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-earned quest (count 0) returns false, no throw", async () => {
    mockUpsert.mockImplementation(async (row, opts) => {
      upsertCalls.push({ row, opts });
      return { error: null, count: 0 }; // ON CONFLICT DO NOTHING — nothing inserted
    });
    const ok = await awardIfEligible(USER, "first-holding");
    expect(ok).toBe(false);
    expect(upsertCalls).toHaveLength(1); // it tried once, didn't throw
  });

  it("fails soft on a DB error: returns false, swallows, does not throw", async () => {
    mockUpsert.mockImplementation(async () => ({
      error: { message: "relation \"user_achievements\" does not exist" },
      count: null,
    }));
    await expect(awardIfEligible(USER, "first-holding")).resolves.toBe(false);
  });

  it("fails soft when the client throws unexpectedly", async () => {
    mockUpsert.mockImplementation(async () => {
      throw new Error("connection reset");
    });
    await expect(awardIfEligible(USER, "first-holding")).resolves.toBe(false);
  });

  describe("threshold gating", () => {
    it("skips a threshold>1 quest when no count is supplied", async () => {
      const ok = await awardIfEligible(USER, "three-holdings");
      expect(ok).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("skips a threshold>1 quest when count is below the bar", async () => {
      const ok = await awardIfEligible(USER, "three-holdings", { count: 2 });
      expect(ok).toBe(false);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("awards a threshold>1 quest once count meets the bar", async () => {
      const ok = await awardIfEligible(USER, "three-holdings", { count: 3 });
      expect(ok).toBe(true);
      expect(upsertCalls).toHaveLength(1);
    });

    it("awards a threshold>1 quest when count exceeds the bar", async () => {
      const ok = await awardIfEligible(USER, "three-holdings", { count: 7 });
      expect(ok).toBe(true);
    });
  });

  it("persists supplied meta on the inserted row", async () => {
    await awardIfEligible(USER, "three-holdings", {
      count: 3,
      meta: { holdings_count: 3 },
    });
    expect(upsertCalls[0]!.row).toMatchObject({ meta: { holdings_count: 3 } });
  });
});

describe("awardByEmail", () => {
  it("no-ops (false) for an unregistered email — anonymous poster", async () => {
    mockBuildEmailToUserIdMap.mockImplementation(async () => new Map());
    const ok = await awardByEmail("[email protected]", "first-brief-posted");
    expect(ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("resolves a registered email and awards (true)", async () => {
    mockBuildEmailToUserIdMap.mockImplementation(
      async () => new Map([["[email protected]", USER]]),
    );
    const ok = await awardByEmail("[email protected]", "first-brief-posted");
    expect(ok).toBe(true);
    expect(upsertCalls[0]!.row).toMatchObject({
      user_id: USER,
      quest_id: "first-brief-posted",
    });
  });

  it("normalises the email (trim + lowercase) before lookup", async () => {
    mockBuildEmailToUserIdMap.mockImplementation(
      async () => new Map([["[email protected]", USER]]),
    );
    const ok = await awardByEmail("  [email protected]  ", "first-brief-posted");
    expect(ok).toBe(true);
  });

  it("no-ops (false) for an empty email without listing users", async () => {
    const ok = await awardByEmail("", "first-brief-posted");
    expect(ok).toBe(false);
    expect(mockBuildEmailToUserIdMap).not.toHaveBeenCalled();
  });

  it("no-ops (false) when the flag is OFF and never lists users", async () => {
    mockIsFlagEnabled.mockImplementation(async () => false);
    const ok = await awardByEmail("[email protected]", "first-brief-posted");
    expect(ok).toBe(false);
    expect(mockBuildEmailToUserIdMap).not.toHaveBeenCalled();
  });

  it("fails soft when the user-map lookup throws", async () => {
    mockBuildEmailToUserIdMap.mockImplementation(async () => {
      throw new Error("auth admin listUsers failed");
    });
    await expect(
      awardByEmail("[email protected]", "first-brief-posted"),
    ).resolves.toBe(false);
  });
});

describe("getUserAwards", () => {
  function selectChain(result: { data: unknown; error: unknown }) {
    // mimics admin.from(...).select(...).eq(...).order(...) resolving to result
    return {
      eq: () => ({
        order: async () => result,
      }),
    };
  }

  it("returns [] when the flag is OFF without reading", async () => {
    mockIsFlagEnabled.mockImplementation(async () => false);
    const rows = await getUserAwards(USER);
    expect(rows).toEqual([]);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns [] for an empty userId", async () => {
    const rows = await getUserAwards("");
    expect(rows).toEqual([]);
  });

  it("returns the user's award rows when present", async () => {
    const award = {
      quest_id: "first-holding",
      awarded_at: "2026-06-12T00:00:00Z",
      meta: {},
    };
    mockSelect.mockImplementation(() =>
      selectChain({ data: [award], error: null }),
    );
    const rows = await getUserAwards(USER);
    expect(rows).toEqual([award]);
  });

  it("fails soft to [] on a DB error", async () => {
    mockSelect.mockImplementation(() =>
      selectChain({ data: null, error: { message: "boom" } }),
    );
    const rows = await getUserAwards(USER);
    expect(rows).toEqual([]);
  });

  it("fails soft to [] when the query throws", async () => {
    mockSelect.mockImplementation(() => {
      throw new Error("network");
    });
    const rows = await getUserAwards(USER);
    expect(rows).toEqual([]);
  });
});
