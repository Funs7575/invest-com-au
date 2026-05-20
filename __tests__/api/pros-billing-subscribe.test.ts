/**
 * Tests for POST /api/pros/billing/subscribe
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockRequireAdvisorSession, mockCreateCheckoutSession, mockCheckStripeEnv } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockCreateCheckoutSession: vi.fn(async () => ({ url: "https://checkout.stripe.com/pay/sess_123" })),
  mockCheckStripeEnv: vi.fn(() => ({ ok: true, missing: [] })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
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

import { POST } from "@/app/api/pros/billing/subscribe/route";

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/billing/subscribe", {
    method: "POST",
    body: JSON.stringify(body ?? { tier: "starter" }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/pros/billing/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCheckStripeEnv.mockReturnValue({ ok: true, missing: [] });
    mockCreateCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/pay/sess_123" });
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/pros/billing/subscribe", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid tier", async () => {
    const res = await POST(makeReq({ tier: "enterprise" }));
    expect(res.status).toBe(400);
  });

  it("returns 503 when Stripe env not configured", async () => {
    mockCheckStripeEnv.mockReturnValue({ ok: false, missing: ["STRIPE_PRICE_ID_STARTER"] });
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("returns 200 with checkout url on success", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("checkout.stripe.com");
  });

  it("returns 200 for growth tier", async () => {
    const res = await POST(makeReq({ tier: "growth" }));
    expect(res.status).toBe(200);
  });

  it("returns 200 for scale tier", async () => {
    const res = await POST(makeReq({ tier: "scale" }));
    expect(res.status).toBe(200);
  });
});
