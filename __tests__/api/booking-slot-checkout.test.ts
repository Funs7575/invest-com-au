import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockServerFrom, mockGetUser } = vi.hoisted(() => ({
  mockServerFrom: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
    auth: { getUser: mockGetUser },
  })),
}));

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const { mockIsRateLimited } = vi.hoisted(() => ({ mockIsRateLimited: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

const { mockCreateBookingCheckout } = vi.hoisted(() => ({ mockCreateBookingCheckout: vi.fn() }));
vi.mock("@/lib/stripe-connect", () => ({
  createBookingCheckout: (...args: unknown[]) => mockCreateBookingCheckout(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: (_host: unknown) => "https://invest.com.au",
}));

import { POST } from "@/app/api/booking/[token]/checkout/route";

// ─── Builder helper ───────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "maybeSingle", "single",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

// The route awaits params as a Promise (Next.js dynamic route convention)
type RouteParams = { params: Promise<{ token: string }> };

function makeParams(slotId: string): RouteParams {
  // The route segment is named `token`; for checkout its value is the slot id.
  return { params: Promise.resolve({ token: slotId }) };
}

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const OPEN_SLOT = {
  id: 42,
  professional_id: 7,
  starts_at: FUTURE_DATE,
  ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600_000).toISOString(),
  status: "open",
};

const ADVISOR_ROW = {
  id: 7,
  name: "Jane Smith CFP",
  slug: "jane-smith-cfp",
  session_price_cents: 15000,
  stripe_connect_account_id: "acct_test123",
  stripe_connect_charges_enabled: true,
};

function makePost(body: unknown, slotId = "42"): [NextRequest, RouteParams] {
  const req = new NextRequest(`http://localhost/api/booking/${slotId}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
  return [req, makeParams(slotId)];
}

const VALID_BODY = {
  consumerName: "Alice Investor",
  consumerEmail: "alice@example.com",
  topic: "Retirement planning",
};

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — rate limiting", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });
});

// ─── slotId validation ────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — slotId validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 400 for a non-numeric slotId", async () => {
    const [req, params] = makePost(VALID_BODY, "not-a-number");
    const res = await POST(req, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid slot/i);
  });

  it("returns 400 for slotId=0", async () => {
    const [req, params] = makePost(VALID_BODY, "0");
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative slotId", async () => {
    const [req, params] = makePost(VALID_BODY, "-5");
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });
});

// ─── Body validation ──────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — body validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/booking/42/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{bad json",
    });
    const res = await POST(req, makeParams("42"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when consumerName is missing", async () => {
    const [req, params] = makePost({ consumerEmail: "a@b.com" });
    const res = await POST(req, params);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("returns 400 when consumerEmail is not a valid email", async () => {
    const [req, params] = makePost({ consumerName: "Alice", consumerEmail: "not-email" });
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });

  it("returns 400 when topic exceeds 500 chars", async () => {
    const [req, params] = makePost({
      consumerName: "Alice",
      consumerEmail: "alice@example.com",
      topic: "x".repeat(501),
    });
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });
});

// ─── Slot lookups ─────────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — slot state checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 404 when slot not found", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 409 when slot status is not open", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ ...OPEN_SLOT, status: "booked" }));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/no longer available/i);
  });

  it("returns 409 when slot has already passed", async () => {
    const pastDate = new Date(Date.now() - 3600_000).toISOString();
    mockAdminFrom.mockReturnValue(makeBuilder({ ...OPEN_SLOT, starts_at: pastDate }));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/passed/i);
  });
});

// ─── Advisor lookups ──────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — advisor checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 404 when advisor not found", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder(null));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/advisor not found/i);
  });

  it("returns 422 when session_price_cents is null or zero", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder({ ...ADVISOR_ROW, session_price_cents: null }));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/payment/i);
  });

  it("returns 422 when session_price_cents is 0", async () => {
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder({ ...ADVISOR_ROW, session_price_cents: 0 }));
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(422);
  });
});

// ─── Checkout creation ────────────────────────────────────────────────────────

describe("POST /api/booking/[token]/checkout — Stripe checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder(ADVISOR_ROW));
  });

  it("returns { checkoutUrl } on successful checkout creation", async () => {
    mockCreateBookingCheckout.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123" });
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_test_123");
  });

  it("passes correct fields to createBookingCheckout", async () => {
    mockCreateBookingCheckout.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_456" });
    const [req, params] = makePost(VALID_BODY);
    await POST(req, params);
    expect(mockCreateBookingCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        slotId: 42,
        professionalId: 7,
        advisorSlug: "jane-smith-cfp",
        advisorName: "Jane Smith CFP",
        consumerEmail: "alice@example.com",
        amountCents: 15000,
      }),
    );
  });

  it("includes consumerUserId when user is authenticated", async () => {
    mockCreateBookingCheckout.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_789" });
    const [req, params] = makePost(VALID_BODY);
    await POST(req, params);
    expect(mockCreateBookingCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ consumerUserId: "user-1" }),
    );
  });

  it("sets consumerUserId=null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    // Re-setup admin mocks after clearAllMocks above
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder(ADVISOR_ROW));
    mockCreateBookingCheckout.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_abc" });
    const [req, params] = makePost(VALID_BODY);
    await POST(req, params);
    expect(mockCreateBookingCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ consumerUserId: null }),
    );
  });

  it("returns 422 when advisor is not connected to Stripe (pro_not_connected)", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      checkoutUrl: null,
      unavailable: "pro_not_connected",
    });
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/payment is not set up/i);
  });

  it("returns 503 for any other checkout failure", async () => {
    mockCreateBookingCheckout.mockResolvedValue({
      checkoutUrl: null,
      unavailable: "stripe_error",
    });
    const [req, params] = makePost(VALID_BODY);
    const res = await POST(req, params);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/unavailable/i);
  });
});

describe("POST /api/booking/[token]/checkout — optional topic field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockAdminFrom
      .mockReturnValueOnce(makeBuilder(OPEN_SLOT))
      .mockReturnValueOnce(makeBuilder(ADVISOR_ROW));
    mockCreateBookingCheckout.mockResolvedValue({ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_no_topic" });
  });

  it("accepts a body without topic field", async () => {
    const [req, params] = makePost({ consumerName: "Alice", consumerEmail: "alice@example.com" });
    const res = await POST(req, params);
    expect(res.status).toBe(200);
  });
});
