import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockQuery, mockServerFrom } = vi.hoisted(() => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const mockServerFrom = vi.fn().mockReturnValue(mockQuery);
  return { mockQuery, mockServerFrom };
});

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockServerFrom })),
}));
vi.mock("@/lib/logger", () => ({ logger: () => ({ error: vi.fn(), info: vi.fn() }) }));

import { GET } from "@/app/api/advisor-search/postcodes/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(q?: string): NextRequest {
  const url = `http://localhost/api/advisor-search/postcodes${q !== undefined ? `?q=${encodeURIComponent(q)}` : ""}`;
  return new NextRequest(url);
}

const MOCK_POSTCODES = [
  { postcode: "2000", locality: "Sydney", state: "NSW", latitude: -33.87, longitude: 151.21 },
  { postcode: "2001", locality: "Sydney CBD", state: "NSW", latitude: -33.87, longitude: 151.21 },
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mockQuery, {
    select: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: MOCK_POSTCODES, error: null }),
  });
  mockServerFrom.mockReturnValue(mockQuery);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-search/postcodes", () => {
  it("returns empty array when q param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect((await res.json()).postcodes).toEqual([]);
  });

  it("returns empty array when q is too short (< 2 chars)", async () => {
    const res = await GET(makeRequest("2"));
    expect(res.status).toBe(200);
    expect((await res.json()).postcodes).toEqual([]);
  });

  it("uses LIKE for numeric postcode prefix search", async () => {
    const res = await GET(makeRequest("200"));
    expect(res.status).toBe(200);
    expect(mockQuery.like).toHaveBeenCalledWith("postcode", "200%");
    expect(mockQuery.ilike).not.toHaveBeenCalled();
  });

  it("uses ILIKE for suburb name search", async () => {
    const res = await GET(makeRequest("Syd"));
    expect(res.status).toBe(200);
    expect(mockQuery.ilike).toHaveBeenCalledWith("locality", "%Syd%");
    expect(mockQuery.like).not.toHaveBeenCalled();
  });

  it("returns up to 10 results", async () => {
    await GET(makeRequest("2000"));
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
  });

  it("returns 200 with postcodes on success", async () => {
    const res = await GET(makeRequest("2000"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.postcodes).toEqual(MOCK_POSTCODES);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.limit.mockResolvedValue({ data: null, error: { message: "DB down" } });
    const res = await GET(makeRequest("2000"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Search failed");
  });

  it("returns empty postcodes array when data is null but no error", async () => {
    mockQuery.limit.mockResolvedValue({ data: null, error: null });
    const res = await GET(makeRequest("2000"));
    expect(res.status).toBe(200);
    expect((await res.json()).postcodes).toEqual([]);
  });
});
