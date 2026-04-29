import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockCustomersList = vi.fn();
const mockCustomersCreate = vi.fn();
const mockSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { list: mockCustomersList, create: mockCustomersCreate },
    checkout: { sessions: { create: mockSessionsCreate } },
  }),
}));

import { POST } from "@/app/api/listings/renew/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/listings/renew", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

const VALID_LISTING = {
  id: 1,
  title: "My Investment",
  contact_email: "owner@example.com",
  status: "active",
  expires_at: "2026-06-01T00:00:00Z",
};

const VALID_PLAN = {
  id: 2,
  plan_name: "Standard",
  price_cents_monthly: 4900,
  duration_days: 30,
  active: true,
};

const VALID_BODY = {
  listing_id: 1,
  plan_id: 2,
  contact_email: "owner@example.com",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/listings/renew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new123" });
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
    mockAdminFrom
      .mockReturnValueOnce(makeSingleChain({ data: VALID_LISTING, error: null }))
      .mockReturnValueOnce(makeSingleChain({ data: VALID_PLAN, error: null }));
  });

  it("returns 400 when listing_id is missing", async () => {
    const res = await POST(makePost({ plan_id: 2, contact_email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/listing_id/);
  });

  it("returns 400 when plan_id is missing", async () => {
    const res = await POST(makePost({ listing_id: 1, contact_email: "a@b.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/plan_id/);
  });

  it("returns 400 when contact_email is invalid", async () => {
    const res = await POST(makePost({ listing_id: 1, plan_id: 2, contact_email: "notanemail" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/email/i);
  });

  it("returns 404 when listing is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockReturnValueOnce(makeSingleChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact_email does not match listing", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockReturnValueOnce(
      makeSingleChain({ data: { ...VALID_LISTING, contact_email: "other@example.com" }, error: null }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 404 when plan is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockReturnValueOnce(makeSingleChain({ data: VALID_LISTING, error: null }))
      .mockReturnValueOnce(makeSingleChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 410 when plan is inactive", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockReturnValueOnce(makeSingleChain({ data: VALID_LISTING, error: null }))
      .mockReturnValueOnce(makeSingleChain({ data: { ...VALID_PLAN, active: false }, error: null }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(410);
  });

  it("returns 200 with checkout url when no existing customer", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe("https://checkout.stripe.com/test");
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "owner@example.com",
      metadata: { source: "listing_renewal" },
    });
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_new123",
        mode: "payment",
      }),
    );
  });

  it("reuses existing Stripe customer when found", async () => {
    mockCustomersList.mockResolvedValue({ data: [{ id: "cus_existing" }] });

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("returns 500 when Stripe throws", async () => {
    mockCustomersList.mockRejectedValue(new Error("stripe error"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
