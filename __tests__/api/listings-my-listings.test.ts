import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockServerFrom })
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
}));

import { GET } from "@/app/api/listings/my-listings/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(email?: string): NextRequest {
  const url = email
    ? `http://localhost/api/listings/my-listings?email=${encodeURIComponent(email)}`
    : "http://localhost/api/listings/my-listings";
  return new NextRequest(url, { method: "GET" });
}

const SAMPLE_LISTINGS = [
  { id: 1, title: "Cafe for Sale", slug: "cafe-for-sale", vertical: "food", status: "active", asking_price_cents: 500000, price_display: "$500k", listing_type: "business", views: 10, enquiries: 2, created_at: "2026-01-01", expires_at: "2026-12-31" },
];

const SAMPLE_ENQUIRIES = [
  { id: 10, listing_id: 1, user_name: "Bob", user_email: "bob@example.com", message: "Interested", created_at: "2026-01-02" },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/listings/my-listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when email param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 when email is invalid", async () => {
    const res = await GET(makeGet("not-an-email"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  it("returns 500 when listings fetch fails", async () => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
    };
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(500);
  });

  it("returns empty listings and enquiries when no listings found", async () => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockServerFrom.mockReturnValue(chain);
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toEqual([]);
    expect(json.enquiries).toEqual({});
  });

  it("returns listings with enquiries grouped by listing_id", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // listings query
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: SAMPLE_LISTINGS, error: null }),
        };
      }
      // enquiries query
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: SAMPLE_ENQUIRIES, error: null }),
      };
    });
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(1);
    expect(json.enquiries["1"]).toHaveLength(1);
    expect(json.enquiries["1"][0].user_name).toBe("Bob");
  });

  it("returns listings without enquiries when enquiries fetch fails", async () => {
    let callCount = 0;
    mockServerFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: SAMPLE_LISTINGS, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "enquiry error" } }),
      };
    });
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.listings).toHaveLength(1);
    expect(json.enquiries).toEqual({});
  });

  it("normalises email to lowercase before querying", async () => {
    let capturedEmail: string | undefined;
    mockServerFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn((_, val: string) => { capturedEmail = val; return { order: vi.fn().mockResolvedValue({ data: [], error: null }) }; }),
    });
    await GET(makeGet("Owner@Example.COM"));
    expect(capturedEmail).toBe("owner@example.com");
  });

  it("returns 500 on unexpected thrown error", async () => {
    mockServerFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET(makeGet("owner@example.com"));
    expect(res.status).toBe(500);
  });
});
