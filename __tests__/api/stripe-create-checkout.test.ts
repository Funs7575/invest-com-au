import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockCustomersCreate = vi.fn();
const mockCheckoutCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutCreate } },
  })),
  PLANS: {
    monthly: { priceId: "price_monthly" },
    yearly: { priceId: "price_yearly" },
    international_standard: { priceId: "price_intl_std" },
    international_premium: { priceId: "price_intl_prem" },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ error: vi.fn(), info: vi.fn() }),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

import { POST } from "@/app/api/stripe/create-checkout/route";

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/stripe/create-checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeProfileBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data })),
  };
}

function makeSubBuilder(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data })),
  };
}

beforeEach(() => vi.resetAllMocks());

describe("POST /api/stripe/create-checkout", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(401);
  });

  it("creates new Stripe customer when none on profile", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    // Profile with no customer id
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: null }));
    // Update null-write (idempotent)
    mockAdminFrom.mockReturnValueOnce({ update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn(() => Promise.resolve({})) });
    // Re-read after race
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_new" }));
    // Subscription check
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(null));

    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session_abc" });

    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("stripe.com");
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com" }),
      expect.any(Object)
    );
  });

  it("returns 400 when creating customer but user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: null } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: null }));

    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("blocks checkout for active subscription without cancel_at_period_end", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_1" }));
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder({ id: "sub_1", cancel_at_period_end: false }));

    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/active subscription/i);
  });

  it("allows checkout when sub has cancel_at_period_end=true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_1" }));
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder({ id: "sub_1", cancel_at_period_end: true }));
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/xyz" });

    const res = await POST(makeReq({ plan: "yearly" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeTruthy();
  });

  it("uses existing customer and creates checkout session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_existing" }));
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(null));
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/existing" });

    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
      expect.any(Object)
    );
  });

  it("returns 500 on Stripe error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_1" }));
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(null));
    mockCheckoutCreate.mockRejectedValue(new Error("Stripe error"));

    const res = await POST(makeReq({ plan: "monthly" }));
    expect(res.status).toBe(500);
  });

  it("invalid plan defaults to monthly", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.com" } } });
    mockAdminFrom.mockReturnValueOnce(makeProfileBuilder({ stripe_customer_id: "cus_1" }));
    mockAdminFrom.mockReturnValueOnce(makeSubBuilder(null));
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/monthly" });

    const res = await POST(makeReq({ plan: "not_a_real_plan" }));
    expect(res.status).toBe(200);
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_monthly", quantity: 1 }],
      }),
      expect.any(Object)
    );
  });
});
