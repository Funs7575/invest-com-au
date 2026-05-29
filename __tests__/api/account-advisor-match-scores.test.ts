/**
 * Tests for GET /api/account/advisor-match-scores
 *
 * Auth: Supabase Auth session required (supabase.auth.getUser()).
 * Returns a map of professional_id → match_percent for O(1) lookup.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: { id: "u1", email: "u@e.com" } },
    error: null,
  }),
);

function makeBuilder(
  data: unknown = [],
  error: unknown = null,
): Record<string, unknown> {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt",
    "gte", "lt", "lte", "in", "is", "not", "or", "order", "limit", "range",
    "single", "maybeSingle", "filter", "contains", "overlaps",
  ]) {
    c[m] = vi.fn((..._a: unknown[]) => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/account/advisor-match-scores/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/account/advisor-match-scores", {
    method: "GET",
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/account/advisor-match-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 500 when query fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "db error" }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("fetch_failed");
  });

  it("returns empty scores map when no rows exist", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { scores: Record<string, number> };
    expect(json).toHaveProperty("scores");
    expect(typeof json.scores).toBe("object");
    expect(Object.keys(json.scores)).toHaveLength(0);
  });

  it("returns scores map indexed by professional_id", async () => {
    const rows = [
      { professional_id: 10, match_percent: 92 },
      { professional_id: 20, match_percent: 78 },
      { professional_id: 30, match_percent: 65 },
    ];
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(rows, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { scores: Record<number, number> };
    expect(json.scores[10]).toBe(92);
    expect(json.scores[20]).toBe(78);
    expect(json.scores[30]).toBe(65);
  });

  it("queries advisor_user_match_scores filtered by user.id", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder([], null));
    await GET(makeReq());
    // Verify from() was called with the correct table
    expect(mockFrom).toHaveBeenCalledWith("advisor_user_match_scores");
  });

  it("returns scores ordered descending by match_percent (order mock called)", async () => {
    const rows = [
      { professional_id: 5, match_percent: 99 },
      { professional_id: 3, match_percent: 50 },
    ];
    const builder = makeBuilder(rows, null);
    const orderSpy = builder.order as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => builder);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(orderSpy).toHaveBeenCalledWith("match_percent", { ascending: false });
  });

  it("limits results to 50 rows", async () => {
    const builder = makeBuilder([], null);
    const limitSpy = builder.limit as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((..._a: unknown[]) => builder);
    await GET(makeReq());
    expect(limitSpy).toHaveBeenCalledWith(50);
  });

  it("handles a single score entry correctly", async () => {
    const rows = [{ professional_id: 7, match_percent: 100 }];
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(rows, null));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { scores: Record<number, number> };
    expect(Object.keys(json.scores)).toHaveLength(1);
    expect(json.scores[7]).toBe(100);
  });
});
