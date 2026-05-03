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

// The stripe_checkout feature flag was added in the launch-ops pass.
// In test environments isFlagEnabled() returns false (placeholder Supabase URL),
// causing all POST tests to receive 503. Mock to return true by default.
const mockIsFlagEnabled = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

import { POST } from "@/app/api/listings/checkout/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/listings/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "eq"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(result));
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const ACTIVE_PLAN = { id: 7, plan_name: "Starter", price_cents_monthly: 4900, features: [], active: true };
const ACTIVE_LISTING = { id: 3, title: "SMSF Fund A", status: "active" };

const VALID_BODY = {
  listing_id: 3,
  plan_id: 7,
  contact_email: "owner@example.com",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/listings/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFlagEnabled.mockResolvedValue(true);
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: ACTIVE_PLAN, error: null }))
      .mockImplementationOnce(() => makeChain({ data: ACTIVE_LISTING, error: null }));
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new_123" });
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/listing" });
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makePost("not json {"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when listing_id is missing", async () => {
    const res = await POST(makePost({ plan_id: 7, contact_email: "x@x.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/i);
  });

  it("returns 400 when listing_id is not a number", async () => {
    const res = await POST(makePost({ ...VALID_BODY, listing_id: "three" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/listing_id/i);
  });

  it("returns 400 when plan_id is missing", async () => {
    const res = await POST(makePost({ listing_id: 3, contact_email: "x@x.com" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/plan_id/i);
  });

  it("returns 400 when contact_email is invalid", async () => {
    const res = await POST(makePost({ ...VALID_BODY, contact_email: "not-an-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/contact_email/i);
  });

  it("returns 404 when plan is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: null, error: { message: "not found" } }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/plan not found/i);
  });

  it("returns 410 when plan is inactive", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementationOnce(() =>
      makeChain({ data: { ...ACTIVE_PLAN, active: false }, error: null }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/no longer available/i);
  });

  it("returns 404 when listing is not found", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom
      .mockImplementationOnce(() => makeChain({ data: ACTIVE_PLAN, error: null }))
      .mockImplementationOnce(() => makeChain({ data: null, error: { message: "missing" } }));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/listing not found/i);
  });

  it("reuses existing Stripe customer when found", async () => {
    mockCustomersList.mockResolvedValue({ data: [{ id: "cus_existing_abc" }] });
    await POST(makePost(VALID_BODY));
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing_abc" }),
    );
  });

  it("creates new Stripe customer when none found", async () => {
    mockCustomersList.mockResolvedValue({ data: [] });
    mockCustomersCreate.mockResolvedValue({ id: "cus_fresh_xyz" });
    await POST(makePost(VALID_BODY));
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "owner@example.com" }),
    );
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_fresh_xyz" }),
    );
  });

  it("returns 200 with checkout URL on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/pay/listing");
  });

  it("session metadata includes type, listing_id, plan_id, contact_email", async () => {
    await POST(makePost(VALID_BODY));
    const call = mockSessionsCreate.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.type).toBe("listing_payment");
    expect(call.metadata.listing_id).toBe("3");
    expect(call.metadata.plan_id).toBe("7");
    expect(call.metadata.contact_email).toBe("owner@example.com");
  });

  it("returns 500 when Stripe checkout.sessions.create throws", async () => {
    mockSessionsCreate.mockRejectedValue(new Error("Stripe down"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create checkout session/i);
  });

  it("normalises contact_email to lowercase before passing to Stripe", async () => {
    mockCustomersList.mockResolvedValue({ data: [] });
    await POST(makePost({ ...VALID_BODY, contact_email: "Owner@Example.COM" }));
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "owner@example.com" }),
    );
  });
});
