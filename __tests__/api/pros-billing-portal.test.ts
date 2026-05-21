import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockCreateBillingPortalUrl } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn(),
    mockRequireAdvisorSession: vi.fn(),
    mockCreateBillingPortalUrl: vi.fn(),
  }));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/pro-subscription/billing", () => ({
  createBillingPortalUrl: mockCreateBillingPortalUrl,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/billing/portal/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/portal", { method: "POST" });
}

describe("POST /api/pros/billing/portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not an advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns the portal url on success", async () => {
    mockCreateBillingPortalUrl.mockResolvedValueOnce({ url: "https://stripe.test/portal" });
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/portal" });
    expect(mockCreateBillingPortalUrl).toHaveBeenCalledWith(42);
  });

  it("returns 404 when the pro has no billing account yet", async () => {
    mockCreateBillingPortalUrl.mockResolvedValueOnce({
      unavailable: true,
      reason: "No billing account for this pro",
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/subscribe first/i);
  });

  it("returns 503 when Stripe billing is unconfigured", async () => {
    mockCreateBillingPortalUrl.mockResolvedValueOnce({
      unavailable: true,
      reason: "Stripe not configured",
    });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Subscription billing is not configured." });
  });

  it("returns 500 when createBillingPortalUrl throws", async () => {
    mockCreateBillingPortalUrl.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not open billing portal." });
  });
});
