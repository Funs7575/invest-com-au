import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockIsAllowed, mockIpKey, mockCreateClient, mockRange } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<() => Promise<boolean>>(),
  mockIpKey: vi.fn(() => "127.0.0.1"),
  mockCreateClient: vi.fn(),
  mockRange: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

// Logger mocked to keep the DB-error branch quiet in test output.
vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { GET } from "@/app/api/advisor-reviews-public/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

// A chainable query whose terminal .range() resolves to the supplied result.
// Records the args passed to .eq() and .range() so tests can assert filters.
function makeQuery(result: { data: unknown; error: unknown }) {
  const eqCalls: [string, unknown][] = [];
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val]);
      return query;
    }),
    order: vi.fn().mockReturnThis(),
    range: mockRange.mockResolvedValue(result),
  };
  return { query, eqCalls };
}

function req(params: Record<string, string | undefined> = {}) {
  const url = new URL("http://localhost/api/advisor-reviews-public");
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const REVIEW = {
  id: 7,
  reviewer_name: "Reviewer 7",
  rating: 5,
  body: "Helpful.",
  status: "approved",
  created_at: "2026-01-01T00:00:00Z",
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-reviews-public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited (without touching the DB)", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(req({ professional_id: "1" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many/i);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns 400 when professional_id is missing", async () => {
    const res = await GET(req());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/professional_id/i);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns 400 when professional_id is non-numeric", async () => {
    const res = await GET(req({ professional_id: "not-a-number" }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns 400 when professional_id is zero or negative", async () => {
    const res = await GET(req({ professional_id: "0" }));
    expect(res.status).toBe(400);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it("returns approved reviews scoped to the professional with default paging", async () => {
    const { query, eqCalls } = makeQuery({ data: [REVIEW], error: null });
    mockCreateClient.mockResolvedValue({ from: vi.fn(() => query) });

    const res = await GET(req({ professional_id: "42" }));
    expect(res.status).toBe(200);
    expect((await res.json()).reviews).toEqual([REVIEW]);

    // Filters: scoped to the professional and to approved rows only.
    expect(eqCalls).toContainEqual(["professional_id", 42]);
    expect(eqCalls).toContainEqual(["status", "approved"]);
    // Default page: offset 0, limit 20 → range(0, 19).
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });

  it("honours offset and limit query params", async () => {
    const { query } = makeQuery({ data: [], error: null });
    mockCreateClient.mockResolvedValue({ from: vi.fn(() => query) });

    await GET(req({ professional_id: "42", offset: "20", limit: "10" }));
    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it("clamps a negative offset to 0 and an oversized limit to the ceiling", async () => {
    const { query } = makeQuery({ data: [], error: null });
    mockCreateClient.mockResolvedValue({ from: vi.fn(() => query) });

    await GET(req({ professional_id: "42", offset: "-5", limit: "500" }));
    // offset -5 → 0, limit 500 → 20 → range(0, 19).
    expect(mockRange).toHaveBeenCalledWith(0, 19);
  });

  it("returns 500 when the reviews query errors", async () => {
    const { query } = makeQuery({ data: null, error: { message: "boom" } });
    mockCreateClient.mockResolvedValue({ from: vi.fn(() => query) });

    const res = await GET(req({ professional_id: "42" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/failed to load/i);
  });
});
