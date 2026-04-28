import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

const mockStripeCustomersCreate = vi.fn();
const mockStripeSessionsCreate = vi.fn();
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: (...args: unknown[]) => mockStripeCustomersCreate(...args) },
    checkout: { sessions: { create: (...args: unknown[]) => mockStripeSessionsCreate(...args) } },
  })),
}));

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

import { POST } from "@/app/api/consultation/book/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const USER = { id: "user-123", email: "user@test.com" };
const CONSULTATION = {
  id: "cons-1",
  slug: "smsf-setup-session",
  status: "published",
  stripe_price_id: "price_standard",
  stripe_pro_price_id: "price_pro",
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/consultation/book", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function maybySingleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function singleChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.single = vi.fn().mockResolvedValue(result);
  return c;
}

function updateChain() {
  const c: Record<string, unknown> = {};
  c.update = vi.fn(() => c);
  c.eq = vi.fn(() => Promise.resolve({ error: null }));
  return c;
}

// Default happy-path setup: authenticated, no existing booking, not Pro, has stripe_customer_id
function setupHappyPath(overrides: {
  consultation?: Partial<typeof CONSULTATION>;
  existingBooking?: unknown;
  activeSub?: unknown;
  stripeCustomerId?: string | null;
} = {}) {
  const consultation = { ...CONSULTATION, ...overrides.consultation };
  let callCount = 0;
  mockAdminFrom.mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1: return maybySingleChain({ data: consultation, error: null });           // consultation lookup
      case 2: return maybySingleChain({ data: overrides.existingBooking ?? null, error: null }); // existing booking
      case 3: return maybySingleChain({ data: overrides.activeSub ?? null, error: null });       // active subscription
      // `??` would treat an explicit `null` override as "use default",
      // masking the no-customer branch the relevant test wants to hit.
      // Check membership instead so `stripeCustomerId: null` is honoured.
      case 4: return singleChain({
        data: {
          stripe_customer_id: "stripeCustomerId" in overrides
            ? overrides.stripeCustomerId
            : "cus_existing",
        },
        error: null,
      }); // profile
      default: return updateChain();
    }
  });
  mockStripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/session/test" });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/consultation/book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when consultation_slug is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/consultation_slug/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/consultation/book", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
      body: "{ bad json }",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when consultation not found", async () => {
    mockAdminFrom.mockReturnValueOnce(maybySingleChain({ data: null, error: null }));
    const res = await POST(makePost({ consultation_slug: "unknown-slug" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when user already has a booking", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: CONSULTATION, error: null });
      return maybySingleChain({ data: { id: "existing-booking-1", status: "confirmed" }, error: null });
    });
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already have a booking/i);
  });

  it("uses standard price_id for non-Pro users", async () => {
    setupHappyPath();
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(mockStripeSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_standard", quantity: 1 }],
      })
    );
  });

  it("uses pro price_id for Pro subscribers", async () => {
    setupHappyPath({ activeSub: { id: "sub-1", status: "active" } });
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(mockStripeSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_pro", quantity: 1 }],
      })
    );
  });

  it("returns 400 when no price_id is configured on the consultation", async () => {
    setupHappyPath({ consultation: { stripe_price_id: undefined as unknown as string, stripe_pro_price_id: undefined as unknown as string } });
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/pricing not configured/i);
  });

  it("creates a new Stripe customer when stripe_customer_id is null", async () => {
    mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new" });
    setupHappyPath({ stripeCustomerId: null });
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: USER.email })
    );
  });

  it("uses existing stripe_customer_id without creating a new customer", async () => {
    setupHappyPath({ stripeCustomerId: "cus_existing" });
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(mockStripeCustomersCreate).not.toHaveBeenCalled();
    expect(mockStripeSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    );
  });

  it("returns 200 with checkout URL on success", async () => {
    setupHappyPath();
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/session/test");
  });

  it("sets success_url and cancel_url using NEXT_PUBLIC_SITE_URL", async () => {
    setupHappyPath();
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    const call = mockStripeSessionsCreate.mock.calls[0][0] as Record<string, string>;
    expect(call.success_url).toContain("https://invest.com.au/consultations/smsf-setup-session");
    expect(call.cancel_url).toContain("https://invest.com.au/consultations/smsf-setup-session");
  });

  it("embeds consultation_slug and user_id in session metadata", async () => {
    setupHappyPath();
    await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    const call = mockStripeSessionsCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(call.metadata).toMatchObject({
      type: "consultation",
      consultation_slug: "smsf-setup-session",
      supabase_user_id: USER.id,
    });
  });

  it("returns 500 when Stripe throws", async () => {
    setupHappyPath();
    mockStripeSessionsCreate.mockRejectedValue(new Error("Stripe error"));
    const res = await POST(makePost({ consultation_slug: "smsf-setup-session" }));
    expect(res.status).toBe(500);
  });
});
