import { describe, it, expect, vi, beforeEach } from "vitest";

// getPlanById uses the admin client (RLS bypass). Ownership is enforced by the
// caller, so the privileged owner read MUST scope the query by auth_user_id.
// These tests assert the query carries (or omits) that filter correctly.

const { mockFrom, mockCreateAdminClient } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return {
    mockFrom,
    mockCreateAdminClient: vi.fn(() => ({ from: mockFrom })),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { getPlanById } from "@/lib/getmatched/action-plans";

interface EqCall {
  col: string;
  val: unknown;
}

function makeBuilder(row: unknown) {
  const eqCalls: EqCall[] = [];
  const builder = {
    eqCalls,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push({ col, val });
      return builder;
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: row })),
  };
  return builder;
}

beforeEach(() => vi.clearAllMocks());

describe("getPlanById", () => {
  it("scopes the query by auth_user_id when authUserId is provided", async () => {
    const builder = makeBuilder({ id: 5, auth_user_id: "owner-1" });
    mockFrom.mockReturnValue(builder);

    const plan = await getPlanById(5, "owner-1");

    expect(plan).toEqual({ id: 5, auth_user_id: "owner-1" });
    expect(builder.eqCalls).toContainEqual({ col: "id", val: 5 });
    expect(builder.eqCalls).toContainEqual({
      col: "auth_user_id",
      val: "owner-1",
    });
  });

  it("does not add an auth_user_id filter for anonymous / draft reads", async () => {
    const builder = makeBuilder({ id: 9, auth_user_id: null });
    mockFrom.mockReturnValue(builder);

    await getPlanById(9);

    expect(builder.eqCalls).toContainEqual({ col: "id", val: 9 });
    expect(builder.eqCalls.some((c) => c.col === "auth_user_id")).toBe(false);
  });

  it("returns null when the scoped read matches no row (other user's plan)", async () => {
    const builder = makeBuilder(null);
    mockFrom.mockReturnValue(builder);

    const plan = await getPlanById(5, "not-the-owner");

    expect(plan).toBeNull();
    expect(builder.eqCalls).toContainEqual({
      col: "auth_user_id",
      val: "not-the-owner",
    });
  });
});
