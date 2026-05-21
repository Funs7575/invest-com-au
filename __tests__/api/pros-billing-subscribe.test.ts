import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockRequireAdvisorSession,
  mockCreateCheckoutSession,
  mockCheckStripeEnv,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockRequireAdvisorSession: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockCheckStripeEnv: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/pro-subscription/billing", () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}));

vi.mock("@/lib/stripe-env-check", () => ({
  checkStripeEnv: mockCheckStripeEnv,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/billing/subscribe/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pros/billing/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCheckStripeEnv.mockReturnValue({ ok: true, missing: [] });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ tier: "starter" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not an advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ tier: "starter" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/pros/billing/subscribe", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tier is not a valid enum", async () => {
    const res = await POST(makeReq({ tier: "platinum" }));
    expect(res.status).toBe(400);
  });

  it("returns 503 with missing env vars when Stripe price ids are unset", async () => {
    mockCheckStripeEnv.mockReturnValueOnce({
      ok: false,
      missing: ["STRIPE_PRICE_ID_STARTER"],
    });
    const res = await POST(makeReq({ tier: "starter" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: "Subscription billing is not configured.",
      missing: ["STRIPE_PRICE_ID_STARTER"],
    });
    expect(mockCheckStripeEnv).toHaveBeenCalledWith({ required: ["STRIPE_PRICE_ID_STARTER"] });
  });

  it("returns the checkout url on success", async () => {
    mockCreateCheckoutSession.mockResolvedValueOnce({ url: "https://stripe.test/checkout" });
    const res = await POST(makeReq({ tier: "growth" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe.test/checkout" });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      professionalId: 42,
      tier: "growth",
    });
  });

  it("returns 503 when checkout session is unavailable", async () => {
    mockCreateCheckoutSession.mockResolvedValueOnce({ unavailable: true });
    const res = await POST(makeReq({ tier: "scale" }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "Subscription billing is not configured." });
  });

  it("returns 500 when createCheckoutSession throws", async () => {
    mockCreateCheckoutSession.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ tier: "starter" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Could not start checkout." });
  });
});
