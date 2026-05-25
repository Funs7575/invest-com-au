import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsAllowed, mockServerFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn().mockResolvedValue(true),
  mockServerFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: vi.fn().mockReturnValue("1.2.3.4"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockServerFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { GET } from "@/app/api/listings/route";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LISTINGS = [
  { id: 1, listing_type: "standard", created_at: "2026-05-01T00:00:00Z", status: "active" },
  { id: 2, listing_type: "premium", created_at: "2026-05-02T00:00:00Z", status: "active" },
  { id: 3, listing_type: "featured", created_at: "2026-05-03T00:00:00Z", status: "active" },
];

// ── Mock setup helper ─────────────────────────────────────────────────────────

function setupQuery(
  data = LISTINGS as unknown[],
  error: { message: string } | null = null,
) {
  const b = createChainableBuilder("investment_listings");
  b.then = vi.fn((cb: (v: unknown) => void) => {
    cb({ data: error ? null : data, error, count: error ? null : data.length });
    return Promise.resolve();
  });
  mockServerFrom.mockReturnValue(b);
  return b;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/listings");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url, {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    setupQuery();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    expect((await GET(makeGet())).status).toBe(429);
  });

  it("returns 500 on DB error", async () => {
    setupQuery([], { message: "connection refused" });
    expect((await GET(makeGet())).status).toBe(500);
  });

  it("returns listings with total count", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(3);
    expect(json.total).toBe(3);
  });

  it("sorts premium before featured before standard", async () => {
    const res = await GET(makeGet());
    const json = await res.json();
    const types = (json.listings as { listing_type: string }[]).map((l) => l.listing_type);
    expect(types[0]).toBe("premium");
    expect(types[1]).toBe("featured");
    expect(types[2]).toBe("standard");
  });

  it("applies vertical filter when provided", async () => {
    const b = setupQuery([]);
    await GET(makeGet({ vertical: "property" }));
    expect(b.eq).toHaveBeenCalledWith("vertical", "property");
  });

  it("applies state filter when provided", async () => {
    const b = setupQuery([]);
    await GET(makeGet({ state: "NSW" }));
    expect(b.eq).toHaveBeenCalledWith("location_state", "NSW");
  });

  it("applies firb_eligible=true filter", async () => {
    const b = setupQuery([]);
    await GET(makeGet({ firb_eligible: "true" }));
    expect(b.eq).toHaveBeenCalledWith("firb_eligible", true);
  });

  it("applies siv_complying=true filter", async () => {
    const b = setupQuery([]);
    await GET(makeGet({ siv_complying: "true" }));
    expect(b.eq).toHaveBeenCalledWith("siv_complying", true);
  });

  it("returns empty listings array when no results", async () => {
    setupQuery([]);
    const res = await GET(makeGet());
    const json = await res.json();
    expect(json.listings).toEqual([]);
  });
});
