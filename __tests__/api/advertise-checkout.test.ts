import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockIsValidEmail = vi.fn<(e: string) => boolean>(() => true);
vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => mockIsValidEmail(e),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: mockSessionsCreate } } }),
}));

import { POST } from "@/app/api/advertise/checkout/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advertise/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.insert = vi.fn(() => c);
  c.update = vi.fn(() => c);
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeUpdateChain(result: { error: unknown } = { error: null }) {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.then = (cb: (v: unknown) => void) => {
    cb(result);
    return Promise.resolve(result);
  };
  return c;
}

const VALID_BODY = {
  tier: "featured_partner",
  duration_months: 1,
  company_name: "Acme Corp",
  contact_email: "acme@example.com",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advertise/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminFrom.mockReset();
    mockIsValidEmail.mockReturnValue(true);
    mockAdminFrom
      .mockImplementationOnce(() =>
        makeInsertChain({ data: { id: 99 }, error: null }),
      )
      .mockImplementationOnce(() => makeUpdateChain());
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test" });
  });

  it("returns 400 for invalid tier", async () => {
    const res = await POST(makePost({ ...VALID_BODY, tier: "unknown_tier" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid sponsorship tier/i);
  });

  it("returns 400 for invalid duration", async () => {
    const res = await POST(makePost({ ...VALID_BODY, duration_months: 2 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid duration/i);
  });

  it("returns 400 when company_name is missing", async () => {
    const res = await POST(makePost({ ...VALID_BODY, company_name: undefined }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/company name/i);
  });

  it("returns 400 when company_name is too short (1 char)", async () => {
    const res = await POST(makePost({ ...VALID_BODY, company_name: "A" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/company name/i);
  });

  it("returns 400 when contact_email is invalid", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makePost({ ...VALID_BODY, contact_email: "bad-email" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("returns 400 for category_sponsor without category_slug", async () => {
    const res = await POST(
      makePost({ ...VALID_BODY, tier: "category_sponsor", category_slug: undefined }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/category/i);
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation(() =>
      makeInsertChain({ data: null, error: { message: "constraint violation" } }),
    );
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create order/i);
  });

  it("returns 500 when Stripe throws", async () => {
    mockSessionsCreate.mockRejectedValue(new Error("Stripe error"));
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to create checkout session/i);
  });

  it("returns 200 with checkout URL on success", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/pay/test");
  });

  it("success_url and cancel_url use getSiteUrl", async () => {
    await POST(makePost(VALID_BODY));
    const call = mockSessionsCreate.mock.calls[0][0] as {
      success_url: string;
      cancel_url: string;
    };
    expect(call.success_url).toContain("https://invest.com.au");
    expect(call.cancel_url).toContain("https://invest.com.au");
  });

  it("session metadata includes order_id, tier, duration, company_name", async () => {
    await POST(makePost(VALID_BODY));
    const call = mockSessionsCreate.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.sponsorship_order_id).toBe("99");
    expect(call.metadata.tier).toBe("featured_partner");
    expect(call.metadata.duration_months).toBe("1");
    expect(call.metadata.company_name).toBe("Acme Corp");
  });

  it("applies discount for 12-month duration (30% off)", async () => {
    // featured_partner = $2000/mo = 200000 cents; 12mo at 30% off = 1400/mo × 12 = 168000
    await POST(makePost({ ...VALID_BODY, duration_months: 12 }));
    const call = mockSessionsCreate.mock.calls[0][0] as {
      line_items: Array<{ price_data: { unit_amount: number } }>;
    };
    const totalCents = call.line_items[0].price_data.unit_amount;
    // 200000 * 0.7 * 12 = 1680000
    expect(totalCents).toBe(1_680_000);
  });

  it("includes category_slug in metadata when category_sponsor tier is used", async () => {
    await POST(
      makePost({
        ...VALID_BODY,
        tier: "category_sponsor",
        category_slug: "brokers",
      }),
    );
    const call = mockSessionsCreate.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(call.metadata.category_slug).toBe("brokers");
  });
});
