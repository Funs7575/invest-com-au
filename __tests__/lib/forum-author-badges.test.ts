import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for lib/forum-author-badges.ts — resolveAdvisorBadges().
 *
 * The helper does a cross-user SELECT on the `professionals` table via the
 * admin client (service-role; documented exception in CLAUDE.md). These tests
 * mock that client to cover:
 *   - empty input → short-circuit, no DB call
 *   - active + verified professionals → returned in the map
 *   - professionals with NULL auth_user_id → omitted
 *   - non-active or non-verified professionals → omitted by the query filter
 *   - DB error → empty map returned (fail-safe, non-critical path)
 *   - thrown exception → empty map returned
 */

/* ── hoisted mocks (must be before imports) ─────────────────────────── */

const {
  mockFrom,
  mockSelect,
  mockIn,
  mockEq,
  mockQueryResult,
  mockThrow,
} = vi.hoisted(() => {
  const mockQueryResult = { data: null as unknown, error: null as unknown };
  const mockThrow = { active: false };

  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();

  // Wire the fluent chain: from() → select() → in() → eq() → eq()
  // The second .eq() call returns the terminal promise.
  mockEq.mockImplementation(() => {
    // Track call count; second eq() resolves the query.
    const callCount = mockEq.mock.calls.length;
    if (callCount >= 2) {
      if (mockThrow.active) {
        mockThrow.active = false;
        throw new Error("simulated DB throw inside eq()");
      }
      return Promise.resolve(mockQueryResult);
    }
    return { eq: mockEq };
  });

  mockIn.mockReturnValue({ eq: mockEq });
  mockSelect.mockReturnValue({ in: mockIn });
  mockFrom.mockReturnValue({ select: mockSelect });

  return { mockFrom, mockSelect, mockIn, mockEq, mockQueryResult, mockThrow };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import { resolveAdvisorBadges } from "@/lib/forum-author-badges";

/* ── helpers ─────────────────────────────────────────────────────────── */

function resetChain() {
  mockEq.mockReset();
  mockIn.mockReset();
  mockSelect.mockReset();
  mockFrom.mockReset();

  mockEq.mockImplementation(() => {
    const callCount = mockEq.mock.calls.length;
    if (callCount >= 2) {
      if (mockThrow.active) {
        mockThrow.active = false;
        throw new Error("simulated DB throw");
      }
      return Promise.resolve(mockQueryResult);
    }
    return { eq: mockEq };
  });
  mockIn.mockReturnValue({ eq: mockEq });
  mockSelect.mockReturnValue({ in: mockIn });
  mockFrom.mockReturnValue({ select: mockSelect });
}

/* ── tests ───────────────────────────────────────────────────────────── */

describe("resolveAdvisorBadges", () => {
  beforeEach(() => {
    resetChain();
    mockQueryResult.data = null;
    mockQueryResult.error = null;
    mockThrow.active = false;
  });

  it("returns an empty map immediately for an empty input, without hitting the DB", async () => {
    const result = await resolveAdvisorBadges([]);
    expect(result.size).toBe(0);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns verified active professionals in the map", async () => {
    mockQueryResult.data = [
      {
        auth_user_id: "uid-advisor-1",
        slug: "jane-financial-planner",
        type: "financial_planner",
      },
      {
        auth_user_id: "uid-advisor-2",
        slug: "bob-tax-agent",
        type: "tax_agent",
      },
    ];
    mockQueryResult.error = null;

    const result = await resolveAdvisorBadges(["uid-advisor-1", "uid-advisor-2", "uid-regular-user"]);

    expect(result.size).toBe(2);
    expect(result.get("uid-advisor-1")).toEqual({
      slug: "jane-financial-planner",
      type: "financial_planner",
    });
    expect(result.get("uid-advisor-2")).toEqual({
      slug: "bob-tax-agent",
      type: "tax_agent",
    });
    // Regular forum user is not in the map
    expect(result.has("uid-regular-user")).toBe(false);
  });

  it("omits rows with a NULL auth_user_id", async () => {
    mockQueryResult.data = [
      { auth_user_id: null, slug: "orphan-advisor", type: "financial_planner" },
      { auth_user_id: "uid-good", slug: "good-advisor", type: "mortgage_broker" },
    ];
    mockQueryResult.error = null;

    const result = await resolveAdvisorBadges(["uid-good"]);
    expect(result.size).toBe(1);
    expect(result.has("uid-good")).toBe(true);
  });

  it("returns an empty map when the DB returns an error", async () => {
    mockQueryResult.data = null;
    mockQueryResult.error = { message: "DB error", code: "PGRST999" };

    const result = await resolveAdvisorBadges(["uid-someone"]);
    expect(result.size).toBe(0);
  });

  it("returns an empty map when the DB returns null data", async () => {
    mockQueryResult.data = null;
    mockQueryResult.error = null;

    const result = await resolveAdvisorBadges(["uid-someone"]);
    expect(result.size).toBe(0);
  });

  it("returns an empty map when an exception is thrown (fail-safe)", async () => {
    // Force eq() to throw on the second call (the DB resolution point).
    mockThrow.active = true;

    const result = await resolveAdvisorBadges(["uid-boom"]);
    expect(result.size).toBe(0);
  });

  it("queries professionals using the correct columns and filters", async () => {
    mockQueryResult.data = [];
    mockQueryResult.error = null;

    await resolveAdvisorBadges(["uid-a", "uid-b"]);

    expect(mockFrom).toHaveBeenCalledWith("professionals");
    expect(mockSelect).toHaveBeenCalledWith("auth_user_id, slug, type");
    expect(mockIn).toHaveBeenCalledWith("auth_user_id", ["uid-a", "uid-b"]);
    // eq() called twice: status='active' and verified=true
    expect(mockEq).toHaveBeenCalledWith("status", "active");
    expect(mockEq).toHaveBeenCalledWith("verified", true);
  });
});
