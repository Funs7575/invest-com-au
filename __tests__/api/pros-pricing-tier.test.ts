import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/pricing-tier/route";

const USER = { id: "user-uuid-1", email: "pro@example.com" };

const VALID_BODY = { professional_id: 7, tier: "success_only" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/pricing-tier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// from().select().eq().or().maybeSingle() — ownership lookup.
function makeOwnerChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.or = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// from().update().eq() — terminal eq().
function makeUpdateChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/pros/pricing-tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/pros/pricing-tier", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod validation fails", async () => {
    const res = await POST(makeReq({ professional_id: -1, tier: "gold" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Auth required." });
  });

  it("returns 404 when the user does not own the professional row", async () => {
    mockFrom.mockReturnValueOnce(makeOwnerChain({ data: null }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found." });
  });

  it("updates the tier and returns ok", async () => {
    mockFrom.mockReturnValueOnce(makeOwnerChain({ data: { id: 7 } }));
    const updateChain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValueOnce(updateChain);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, tier: "success_only" });
    expect(updateChain.eq).toHaveBeenCalledWith("id", 7);
    const updateArg = updateChain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg).toEqual({ pricing_tier: "success_only" });
  });

  it("returns 500 when the update errors", async () => {
    mockFrom.mockReturnValueOnce(makeOwnerChain({ data: { id: 7 } }));
    mockFrom.mockReturnValueOnce(makeUpdateChain({ error: { message: "boom" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Update failed." });
  });
});
