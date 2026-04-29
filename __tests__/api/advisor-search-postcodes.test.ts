import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET } from "@/app/api/advisor-search/postcodes/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(q?: string): NextRequest {
  const url = `http://localhost/api/advisor-search/postcodes${q !== undefined ? `?q=${encodeURIComponent(q)}` : ""}`;
  return new NextRequest(url);
}

function makePostcodeBuilder(rows: unknown[] = [], error: unknown = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(() => Promise.resolve({ data: rows, error })),
  };
  return builder;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-search/postcodes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when q is absent", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes).toEqual([]);
  });

  it("returns empty array when q is too short (1 char)", async () => {
    const res = await GET(makeGet("A"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes).toEqual([]);
  });

  it("returns empty array when q is whitespace only", async () => {
    const res = await GET(makeGet(" "));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes).toEqual([]);
  });

  it("searches by postcode pattern when q is numeric", async () => {
    const builder = makePostcodeBuilder([
      { postcode: "2000", locality: "SYDNEY", state: "NSW", latitude: -33.87, longitude: 151.21 },
    ]);
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGet("20"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes).toHaveLength(1);
    expect(data.postcodes[0].postcode).toBe("2000");
    expect(builder.like).toHaveBeenCalledWith("postcode", "20%");
  });

  it("searches by suburb name (ilike) when q is non-numeric", async () => {
    const builder = makePostcodeBuilder([
      { postcode: "3000", locality: "MELBOURNE", state: "VIC", latitude: -37.81, longitude: 144.96 },
    ]);
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGet("mel"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes[0].locality).toBe("MELBOURNE");
    expect(builder.ilike).toHaveBeenCalledWith("locality", "%mel%");
  });

  it("limits results to 10", async () => {
    const builder = makePostcodeBuilder([]);
    mockFrom.mockReturnValue(builder);

    await GET(makeGet("sy"));
    expect(builder.limit).toHaveBeenCalledWith(10);
  });

  it("returns empty array when DB returns null", async () => {
    const builder = makePostcodeBuilder(null as unknown as unknown[], null);
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGet("sy"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.postcodes).toEqual([]);
  });

  it("returns 500 when DB returns error", async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB error" } })),
    };
    mockFrom.mockReturnValue(builder);

    const res = await GET(makeGet("sy"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/failed/i);
  });

  it("returns 500 on unexpected thrown error", async () => {
    mockFrom.mockImplementation(() => { throw new Error("boom"); });

    const res = await GET(makeGet("sy"));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
