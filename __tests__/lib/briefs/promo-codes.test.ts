import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Money-adjacent promo-code helpers (free_brief / percent_off_accept /
 * fixed_credits). validate/redeem are mocked away in the admin-route
 * test, so unit coverage lives here.
 *
 * The Supabase admin client is mocked with a programmable chainable
 * builder: each `.from(table)` call pulls the next queued result for
 * that table, and the terminal awaited methods (maybeSingle / insert /
 * update / order) resolve to it.
 */

const { mockState, createAdminClient, mockRpc } = vi.hoisted(() => {
  type Result = { data: unknown; error: { message: string } | null };

  const state = {
    // Queues of results keyed by table name; terminal ops shift the head.
    maybeSingleQueue: [] as Result[],
    insertQueue: [] as Result[],
    updateQueue: [] as Result[],
    orderQueue: [] as Result[],
    rpcQueue: [] as Result[],
    // Spies for assertions.
    eqArgs: [] as Array<[string, unknown]>,
    insertArgs: [] as unknown[],
    updateArgs: [] as unknown[],
  };

  const rpc = vi.fn(async () => state.rpcQueue.shift() ?? { data: null, error: null });

  function makeBuilder() {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = vi.fn(chain);
    builder.eq = vi.fn((col: string, val: unknown) => {
      state.eqArgs.push([col, val]);
      return builder;
    });
    builder.maybeSingle = vi.fn(
      async () => state.maybeSingleQueue.shift() ?? { data: null, error: null },
    );
    builder.insert = vi.fn((arg: unknown) => {
      state.insertArgs.push(arg);
      return Promise.resolve(state.insertQueue.shift() ?? { data: null, error: null });
    });
    builder.update = vi.fn((arg: unknown) => {
      state.updateArgs.push(arg);
      // update is followed by .eq() then awaited -> return a thenable chain.
      const updChain: Record<string, unknown> = {};
      updChain.eq = vi.fn(
        async () => state.updateQueue.shift() ?? { data: null, error: null },
      );
      return updChain;
    });
    builder.order = vi.fn(
      async () => state.orderQueue.shift() ?? { data: null, error: null },
    );
    return builder;
  }

  const client = {
    from: vi.fn(() => makeBuilder()),
    rpc,
  };

  return {
    mockState: state,
    createAdminClient: vi.fn(() => client),
    mockRpc: rpc,
  };
});

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/logger", () => ({
  logger: () => ({ warn: mockWarn, info: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import {
  validatePromoCode,
  redeemPromoCode,
  listAllPromoCodes,
} from "@/lib/briefs/promo-codes";

function resetState() {
  mockState.maybeSingleQueue.length = 0;
  mockState.insertQueue.length = 0;
  mockState.updateQueue.length = 0;
  mockState.orderQueue.length = 0;
  mockState.rpcQueue.length = 0;
  mockState.eqArgs.length = 0;
  mockState.insertArgs.length = 0;
  mockState.updateArgs.length = 0;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetState();
});

describe("validatePromoCode", () => {
  it("returns not_found and logs a warning on a lookup error", async () => {
    mockState.maybeSingleQueue.push({ data: null, error: { message: "db down" } });
    const result = await validatePromoCode("SAVE10");
    expect(result).toEqual({ ok: false, failure: "not_found" });
    expect(mockWarn).toHaveBeenCalledWith(
      "validatePromoCode lookup failed",
      expect.objectContaining({ error: "db down" }),
    );
  });

  it("returns not_found when no row matches (data null)", async () => {
    mockState.maybeSingleQueue.push({ data: null, error: null });
    const result = await validatePromoCode("NOPE");
    expect(result).toEqual({ ok: false, failure: "not_found" });
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("returns expired when expires_at is in the past", async () => {
    mockState.maybeSingleQueue.push({
      data: {
        id: 1,
        code: "OLD",
        code_kind: "free_brief",
        value: null,
        max_uses: 10,
        used_count: 0,
        expires_at: "2020-01-01T00:00:00Z",
      },
      error: null,
    });
    const result = await validatePromoCode("OLD");
    expect(result).toEqual({ ok: false, failure: "expired" });
  });

  it("returns exhausted when used_count >= max_uses", async () => {
    mockState.maybeSingleQueue.push({
      data: {
        id: 2,
        code: "GONE",
        code_kind: "percent_off_accept",
        value: 20,
        max_uses: 5,
        used_count: 5,
        expires_at: null,
      },
      error: null,
    });
    const result = await validatePromoCode("GONE");
    expect(result).toEqual({ ok: false, failure: "exhausted" });
  });

  it("returns ok with mapped fields, remainingUses and kind on the happy path", async () => {
    mockState.maybeSingleQueue.push({
      data: {
        id: 7,
        code: "WELCOME",
        code_kind: "fixed_credits",
        value: 50,
        max_uses: 100,
        used_count: 30,
        expires_at: "2999-01-01T00:00:00Z",
      },
      error: null,
    });
    const result = await validatePromoCode("WELCOME");
    expect(result.ok).toBe(true);
    expect(result.failure).toBeUndefined();
    expect(result.code).toEqual({
      id: 7,
      code: "WELCOME",
      kind: "fixed_credits",
      value: 50,
      maxUses: 100,
      usedCount: 30,
      remainingUses: 70,
      expiresAt: "2999-01-01T00:00:00Z",
    });
  });

  it("trims whitespace before filtering by code", async () => {
    mockState.maybeSingleQueue.push({ data: null, error: null });
    await validatePromoCode("  PADDED  ");
    expect(mockState.eqArgs).toContainEqual(["code", "PADDED"]);
  });
});

describe("redeemPromoCode", () => {
  it("returns true on the atomic-bump success path (RPC ok)", async () => {
    mockState.insertQueue.push({ data: null, error: null });
    mockState.rpcQueue.push({ data: null, error: null });
    const ok = await redeemPromoCode(7, 42, "buyer@example.com");
    expect(ok).toBe(true);
    expect(mockState.insertArgs[0]).toEqual({
      promo_code_id: 7,
      brief_id: 42,
      contact_email: "buyer@example.com",
    });
    expect(mockRpc).toHaveBeenCalledWith("increment_promo_used_count", {
      p_code_id: 7,
    });
    // RPC succeeded -> no fallback update.
    expect(mockState.updateArgs).toHaveLength(0);
  });

  it("returns false when the redemption row already exists (insert error)", async () => {
    mockState.insertQueue.push({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    });
    const ok = await redeemPromoCode(7, 42, null);
    expect(ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockWarn).toHaveBeenCalledWith(
      "redeemPromoCode insert failed",
      expect.objectContaining({ codeId: 7, briefId: 42 }),
    );
  });

  it("falls back to a non-atomic update when the RPC errors, still returns true", async () => {
    mockState.insertQueue.push({ data: null, error: null });
    mockState.rpcQueue.push({ data: null, error: { message: "no such function" } });
    // Fallback path: select used_count then update.
    mockState.maybeSingleQueue.push({ data: { used_count: 3 }, error: null });
    mockState.updateQueue.push({ data: null, error: null });

    const ok = await redeemPromoCode(7, 42, "x@y.com");
    expect(ok).toBe(true);
    expect(mockState.updateArgs[0]).toEqual({ used_count: 4 });
  });
});

describe("listAllPromoCodes", () => {
  it("maps rows to AdminPromoCodeRow[] newest-first", async () => {
    mockState.orderQueue.push({
      data: [
        {
          id: 1,
          code: "A",
          code_kind: "free_brief",
          value: null,
          max_uses: 10,
          used_count: 2,
          expires_at: null,
          notes: "launch",
          created_by_admin: "finn@invest.com.au",
          created_at: "2026-06-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const rows = await listAllPromoCodes();
    expect(rows).toEqual([
      {
        id: 1,
        code: "A",
        kind: "free_brief",
        value: null,
        maxUses: 10,
        usedCount: 2,
        expiresAt: null,
        notes: "launch",
        createdByAdmin: "finn@invest.com.au",
        createdAt: "2026-06-01T00:00:00Z",
      },
    ]);
  });

  it("returns [] and logs a warning on error", async () => {
    mockState.orderQueue.push({ data: null, error: { message: "boom" } });
    const rows = await listAllPromoCodes();
    expect(rows).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith(
      "listAllPromoCodes failed",
      expect.objectContaining({ error: "boom" }),
    );
  });

  it("returns [] when data is null without erroring", async () => {
    mockState.orderQueue.push({ data: null, error: null });
    const rows = await listAllPromoCodes();
    expect(rows).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
