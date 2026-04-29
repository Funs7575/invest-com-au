import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockIsRateLimited = vi.hoisted(() => vi.fn());
vi.mock("@/lib/rate-limiter", () => ({
  createRateLimiter: vi.fn(() => mockIsRateLimited),
}));

import { GET } from "@/app/api/drip-click/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/drip-click");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url, { headers: { "x-forwarded-for": "1.2.3.4" } });
}

function makeDbChain(insertError: unknown = null) {
  return {
    insert: vi.fn(() => Promise.resolve({ error: insertError })),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn(() => Promise.resolve({ error: null })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/drip-click", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockReturnValue(false);
    mockAdminFrom.mockReturnValue(makeDbChain());
  });

  it("redirects to /compare when broker is missing", async () => {
    const res = await GET(makeGet({ drip: "3" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/compare");
  });

  it("redirects to /compare when drip is missing", async () => {
    const res = await GET(makeGet({ broker: "commsec" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/compare");
  });

  it("redirects to /compare when drip is not a number", async () => {
    const res = await GET(makeGet({ broker: "commsec", drip: "notanumber" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/compare");
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockReturnValue(true);
    const res = await GET(makeGet({ broker: "commsec", drip: "4" }));
    expect(res.status).toBe(429);
  });

  it("redirects to /go/{broker} with UTM params on success", async () => {
    const res = await GET(makeGet({ broker: "commsec", drip: "4", email: "user@example.com" }));
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/go/commsec");
    expect(location).toContain("utm_source=drip");
    expect(location).toContain("utm_campaign=broker_drip_4");
  });

  it("inserts into drip_affiliate_clicks on success", async () => {
    const chain = makeDbChain();
    mockAdminFrom.mockReturnValue(chain);
    await GET(makeGet({ broker: "stake", drip: "2", email: "user@example.com" }));
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ broker_slug: "stake", drip_number: 2 }),
    );
  });

  it("sets Cache-Control no-store on redirect response", async () => {
    const res = await GET(makeGet({ broker: "commsec", drip: "1" }));
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("still redirects even when DB insert throws (non-blocking)", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("DB down"); });
    const res = await GET(makeGet({ broker: "stake", drip: "3" }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/go/stake");
  });
});
