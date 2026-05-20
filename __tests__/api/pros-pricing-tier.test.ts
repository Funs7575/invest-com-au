/**
 * Tests for POST /api/pros/pricing-tier
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pros/pricing-tier/route";

const VALID_BODY = { professional_id: 42, tier: "standard" };

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/pricing-tier", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/pros/pricing-tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null });

    // Default: ownership verified, update succeeds
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","or","in","filter"]) chain[m] = vi.fn(() => chain);

      if (callCount === 1) {
        chain.maybeSingle = vi.fn(async () => ({ data: { id: 42 }, error: null }));
      } else {
        chain.eq = vi.fn(async () => ({ error: null }));
      }
      return chain;
    });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/pros/pricing-tier", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid tier", async () => {
    const res = await POST(makeReq({ professional_id: 42, tier: "invalid_tier" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing professional_id", async () => {
    const res = await POST(makeReq({ tier: "standard" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when pro not found or not owned", async () => {
    let _callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      _callCount++;
      const chain: Record<string, unknown> = {};
      for (const m of ["select","update","eq","or","in","filter"]) chain[m] = vi.fn(() => chain);
      chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
      return chain;
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 200 with tier on success for standard", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tier).toBe("standard");
  });

  it("returns 200 for success_only tier", async () => {
    const res = await POST(makeReq({ professional_id: 42, tier: "success_only" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tier).toBe("success_only");
  });
});
