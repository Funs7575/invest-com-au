import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.hoisted(() => vi.fn<() => Promise<boolean>>().mockResolvedValue(true));
const mockIpKey = vi.hoisted(() => vi.fn().mockReturnValue("127.0.0.1"));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/review-token/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeToken(value: string) {
  return Buffer.from(value).toString("base64");
}

function makeRequest(token?: string) {
  const url = token
    ? `http://localhost/api/review-token?token=${encodeURIComponent(token)}`
    : "http://localhost/api/review-token";
  return new NextRequest(url);
}

function makeSelectChain(result: { data: unknown; error?: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

const ADVISOR = {
  id: "pro-1",
  name: "Jane Smith CFP",
  slug: "jane-smith-cfp",
  photo_url: "https://cdn.invest.com.au/jane.jpg",
  type: "financial_planner",
  firm_name: "Smith Financial",
  location_display: "Sydney NSW",
  rating: 4.8,
  review_count: 23,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/review-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeRequest(makeToken("jane-smith-cfp")));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many/i);
  });

  it("returns 400 when token query param is missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Token required/i);
  });

  it("returns 400 when base64 decodes to empty slug", async () => {
    const emptySlugToken = makeToken(":lead-123"); // empty before colon
    const res = await GET(makeRequest(emptySlugToken));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid token/i);
  });

  it("returns 404 when advisor is not found", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: null }));
    const res = await GET(makeRequest(makeToken("unknown-advisor")));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Advisor not found/i);
  });

  it("returns 200 with advisor data for valid slug token", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: ADVISOR }));
    const res = await GET(makeRequest(makeToken("jane-smith-cfp")));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisor).toMatchObject({ slug: "jane-smith-cfp", name: "Jane Smith CFP" });
  });

  it("resolves slug from token with leadId suffix (base64 slug:leadId format)", async () => {
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: ADVISOR }));
    const tokenWithLead = makeToken("jane-smith-cfp:lead-456");
    const res = await GET(makeRequest(tokenWithLead));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.advisor.slug).toBe("jane-smith-cfp");
  });

  it("queries professionals by slug and active status", async () => {
    const chain = makeSelectChain({ data: ADVISOR });
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeRequest(makeToken("jane-smith-cfp")));
    expect(chain.eq).toHaveBeenCalledWith("slug", "jane-smith-cfp");
    expect(chain.eq).toHaveBeenCalledWith("status", "active");
  });

  it("returns 404 when token decodes to an unknown slug", async () => {
    // Buffer.from is lenient with base64 — invalid chars are silently
    // skipped, so the route always gets SOME slug and queries the DB.
    mockAdminFrom.mockReturnValue(makeSelectChain({ data: null }));
    const res = await GET(makeRequest("notavalidbase64===token"));
    expect(res.status).toBe(404);
  });
});
