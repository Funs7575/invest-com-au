import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom, mockGetPack } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockFrom: vi.fn(),
    mockGetPack: vi.fn(),
  }));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/advisor-credit-packs", () => ({
  getPack: mockGetPack,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/billing/auto-recharge/route";

const VALID_BODY = {
  enabled: true,
  threshold_credits: 10,
  pack_slug: "marketplace_50",
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/auto-recharge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// from().update().eq() — terminal eq() resolves.
function makeUpdateChain(result: { error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.update = vi.fn(() => chain);
  chain.eq = vi.fn(() => Promise.resolve(result));
  return chain;
}

const MARKETPLACE_PACK = { slug: "marketplace_50", isCredit: true };

describe("POST /api/pros/billing/auto-recharge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockGetPack.mockReturnValue(MARKETPLACE_PACK);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not an advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/pros/billing/auto-recharge", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when zod validation fails", async () => {
    const res = await POST(makeReq({ enabled: true, threshold_credits: 0, pack_slug: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the pack is not a marketplace credit pack", async () => {
    mockGetPack.mockReturnValueOnce({ slug: "starter", isCredit: true });
    const res = await POST(makeReq({ ...VALID_BODY, pack_slug: "starter" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Pack must be a marketplace credit pack." });
  });

  it("returns 400 when getPack returns null", async () => {
    mockGetPack.mockReturnValueOnce(null);
    const res = await POST(makeReq({ ...VALID_BODY, pack_slug: "marketplace_nope" }));
    expect(res.status).toBe(400);
  });

  it("saves settings and returns success", async () => {
    const chain = makeUpdateChain({ error: null });
    mockFrom.mockReturnValueOnce(chain);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("professionals");
    expect(chain.eq).toHaveBeenCalledWith("id", 42);
    const updateArg = chain.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg).toMatchObject({
      auto_recharge_enabled: true,
      auto_recharge_threshold_credits: 10,
      auto_recharge_pack_slug: "marketplace_50",
    });
  });

  it("returns 500 when the update errors", async () => {
    mockFrom.mockReturnValueOnce(makeUpdateChain({ error: { message: "boom" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not save." });
  });
});
