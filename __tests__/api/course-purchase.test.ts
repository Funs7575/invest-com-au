import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGetUser, mockIsRateLimited, mockAdminFrom, mockGetStripe, mockLog } =
  vi.hoisted(() => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-uuid", email: "buyer@example.com" } },
      error: null,
    });
    const mockIsRateLimited = vi.fn().mockResolvedValue(false);
    const mockAdminFrom = vi.fn();
    const mockStripeCheckoutCreate = vi.fn().mockResolvedValue({
      url: "https://checkout.stripe.com/pay/abc123",
    });
    const mockStripeCustomersCreate = vi.fn().mockResolvedValue({ id: "cus_new123" });
    const mockGetStripe = vi.fn().mockReturnValue({
      checkout: { sessions: { create: mockStripeCheckoutCreate } },
      customers: { create: mockStripeCustomersCreate },
    });
    const mockLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    return { mockGetUser, mockIsRateLimited, mockAdminFrom, mockGetStripe, mockLog };
  });

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/stripe", () => ({ getStripe: mockGetStripe }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));

import { POST } from "@/app/api/course/purchase/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/course/purchase", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

const MOCK_USER = { id: "user-uuid", email: "buyer@example.com" };
const MOCK_COURSE = {
  slug: "investing-101",
  status: "published",
  stripe_price_id: "price_regular123",
  stripe_pro_price_id: "price_pro123",
};

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  } as Builder;
  // make update().eq() resolvable
  (b.update as ReturnType<typeof vi.fn>).mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  return b;
}

function setupAdminBuilders(opts: {
  course?: { data: unknown; error: unknown };
  purchase?: { data: unknown; error: unknown };
  sub?: { data: unknown; error: unknown };
  profile?: { data: unknown; error: unknown };
}) {
  const courseBld = makeBuilder(opts.course ?? { data: MOCK_COURSE, error: null });
  const purchaseBld = makeBuilder(opts.purchase ?? { data: null, error: null });
  const subBld = makeBuilder(opts.sub ?? { data: null, error: null });
  const profileBld = makeBuilder(
    opts.profile ?? { data: { stripe_customer_id: "cus_existing" }, error: null },
  );
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "courses") return courseBld;
    if (table === "course_purchases") return purchaseBld;
    if (table === "subscriptions") return subBld;
    if (table === "profiles") return profileBld;
    return makeBuilder({ data: null, error: null });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsRateLimited.mockResolvedValue(false);
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  // Reset stripe mocks (cleared by vi.clearAllMocks, re-wire)
  mockGetStripe.mockReturnValue({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/pay/abc123" }),
      },
    },
    customers: { create: vi.fn().mockResolvedValue({ id: "cus_new123" }) },
  });
  process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
  setupAdminBuilders({});
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/course/purchase", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe("Too many requests.");
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Not authenticated");
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/course/purchase", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Invalid request body");
  });

  it("returns 400 when course_slug is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("course_slug");
  });

  it("returns 404 when course not found", async () => {
    setupAdminBuilders({ course: { data: null, error: null } });
    const res = await POST(makeRequest({ course_slug: "nonexistent" }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Course not found");
  });

  it("returns 404 when course is not published (draft)", async () => {
    setupAdminBuilders({
      course: { data: { ...MOCK_COURSE, status: "draft" }, error: null },
    });
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when user already owns the course", async () => {
    setupAdminBuilders({ purchase: { data: { id: 99 }, error: null } });
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("You already own this course");
  });

  it("returns 400 when no price configured for non-investing-101 course", async () => {
    setupAdminBuilders({
      course: {
        data: { ...MOCK_COURSE, slug: "advanced-tax", stripe_price_id: null, stripe_pro_price_id: null },
        error: null,
      },
    });
    const res = await POST(makeRequest({ course_slug: "advanced-tax" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("pricing not configured");
  });

  it("returns 200 with Stripe checkout URL using existing customer", async () => {
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain("checkout.stripe.com");
  });

  it("creates Stripe customer when profile has no stripe_customer_id", async () => {
    setupAdminBuilders({
      profile: { data: { stripe_customer_id: null }, error: null },
    });
    const stripeInstance = mockGetStripe();
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    expect(stripeInstance.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: "buyer@example.com" }),
    );
  });

  it("uses pro price when user has active subscription", async () => {
    setupAdminBuilders({
      sub: { data: { id: 5, status: "active" }, error: null },
    });
    const stripeInstance = mockGetStripe();
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_pro123", quantity: 1 }],
      }),
    );
  });

  it("uses regular price for non-Pro users", async () => {
    const stripeInstance = mockGetStripe();
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_regular123", quantity: 1 }],
      }),
    );
  });

  it("uses env-var price fallback for investing-101 when DB price_id is null", async () => {
    process.env.STRIPE_COURSE_PRICE_ID = "price_env_fallback";
    setupAdminBuilders({
      course: {
        data: { ...MOCK_COURSE, stripe_price_id: null, stripe_pro_price_id: null },
        error: null,
      },
    });
    const stripeInstance = mockGetStripe();
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    expect(stripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_env_fallback", quantity: 1 }],
      }),
    );
  });

  it("returns 500 when Stripe checkout.sessions.create throws", async () => {
    setupAdminBuilders({});
    const stripeInstance = {
      checkout: {
        sessions: { create: vi.fn().mockRejectedValue(new Error("stripe network error")) },
      },
      customers: { create: vi.fn().mockResolvedValue({ id: "cus_x" }) },
    };
    mockGetStripe.mockReturnValue(stripeInstance);
    const res = await POST(makeRequest({ course_slug: "investing-101" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Failed to create checkout");
  });
});
