import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockCreatePaymentForBrief,
  mockMaybeSingle,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
  mockGetUser: vi.fn(),
  mockCreatePaymentForBrief: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = mockMaybeSingle;
    return chain;
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed, ipKey: mockIpKey }));

vi.mock("@/lib/stripe-connect", () => ({
  createPaymentForBrief: mockCreatePaymentForBrief,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/payment/route";

const BRIEF = {
  id: 42,
  contact_email: "owner@example.com",
  accepted_by_professional_id: 7,
  accepted_at: "2026-01-01",
  status: "accepted",
};

const VALID = { amount_cents: 50000, description: "Initial advice fee" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "owner@example.com" } },
    });
    mockCreatePaymentForBrief.mockResolvedValue({
      clientSecret: "cs_123",
      paymentId: "pay_1",
      paymentIntentId: "pi_1",
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ amount_cents: 1, description: "x" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when caller is not the brief owner", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "other@example.com" } },
    });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 409 when brief not yet accepted", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...BRIEF, accepted_by_professional_id: null, accepted_at: null },
    });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(409);
  });

  it("returns 503 when Stripe not configured", async () => {
    mockCreatePaymentForBrief.mockResolvedValueOnce({ unavailable: "no_secret" });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(503);
  });

  it("returns 409 when the pro has not connected", async () => {
    mockCreatePaymentForBrief.mockResolvedValueOnce({ unavailable: "pro_not_connected" });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(409);
  });

  it("returns 502 when payment creation fails without a client secret", async () => {
    mockCreatePaymentForBrief.mockResolvedValueOnce({ clientSecret: null, detail: "card error" });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "card error" });
  });

  it("returns the client secret on the happy path", async () => {
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      client_secret: "cs_123",
      payment_id: "pay_1",
      payment_intent_id: "pi_1",
    });
    expect(mockCreatePaymentForBrief).toHaveBeenCalledWith(
      expect.objectContaining({ briefId: 42, professionalId: 7, consumerUserId: "u1" }),
    );
  });
});
