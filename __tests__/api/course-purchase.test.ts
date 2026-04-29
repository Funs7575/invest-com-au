import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/course/purchase/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-abc", email: "user@test.com" };
const COURSE = {
  id: "course-1",
  slug: "investing-101",
  status: "published",
  stripe_price_id: "price_standard",
  stripe_pro_price_id: "price_pro",
};

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/course/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function maybySingleChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  return c;
}

function singleChain(result: { data: unknown; error?: unknown }) {
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

function setupHappyPath(overrides: {
  course?: Partial<typeof COURSE>;
  existingPurchase?: unknown;
  activeSub?: unknown;
  stripeCustomerId?: string | null;
} = {}) {
  const course = { ...COURSE, ...overrides.course };
  let callCount = 0;
  mockAdminFrom.mockImplementation(() => {
    callCount++;
    switch (callCount) {
      case 1: return maybySingleChain({ data: course });              // courses lookup
      case 2: return maybySingleChain({ data: overrides.existingPurchase ?? null }); // existing purchase
      case 3: return maybySingleChain({ data: overrides.activeSub ?? null });         // subscriptions
      case 4: return singleChain({
        data: {
          stripe_customer_id: "stripeCustomerId" in overrides
            ? overrides.stripeCustomerId
            : "cus_existing",
        },
      }); // profiles
      default: return updateChain();
    }
  });
  mockStripeSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/s/test" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/course/purchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    process.env.NEXT_PUBLIC_SITE_URL = "https://invest.com.au";
    process.env.STRIPE_COURSE_PRICE_ID = undefined as unknown as string;
    process.env.STRIPE_COURSE_PRO_PRICE_ID = undefined as unknown as string;
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when course_slug is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/course_slug/i);
  });

  it("returns 400 when course_slug is not a string", async () => {
    const res = await POST(makePost({ course_slug: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/course/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when course not found", async () => {
    mockAdminFrom.mockReturnValue(maybySingleChain({ data: null }));
    const res = await POST(makePost({ course_slug: "unknown-course" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when course is not published", async () => {
    mockAdminFrom.mockReturnValue(maybySingleChain({ data: { ...COURSE, status: "draft" } }));
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when user already owns the course", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: COURSE });
      return maybySingleChain({ data: { id: "existing-purchase" } });
    });
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already own/i);
  });

  it("returns 400 when course has no price configured", async () => {
    const noPriceCourse = { ...COURSE, stripe_price_id: null, stripe_pro_price_id: null };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: noPriceCourse });
      return maybySingleChain({ data: null });
    });
    const res = await POST(makePost({ course_slug: "other-course" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/pricing not configured/i);
  });

  it("returns checkout URL on success (existing customer)", async () => {
    setupHappyPath();
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toContain("checkout.stripe.com");
  });

  it("creates new Stripe customer when none exists and stores it", async () => {
    setupHappyPath({ stripeCustomerId: null });
    mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new" });
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(200);
    expect(mockStripeCustomersCreate).toHaveBeenCalledOnce();
  });

  it("returns 400 when no customer exists and user has no email", async () => {
    const noEmailUser = { id: "user-abc", email: "" };
    mockGetUser.mockResolvedValue({ data: { user: noEmailUser } });
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return maybySingleChain({ data: COURSE });
      if (callCount === 2) return maybySingleChain({ data: null }); // no existing purchase
      if (callCount === 3) return maybySingleChain({ data: null }); // no sub
      return singleChain({ data: { stripe_customer_id: null } });
    });
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email/i);
  });

  it("uses pro price when user has active subscription", async () => {
    setupHappyPath({ activeSub: { id: "sub-1", status: "active" } });
    await POST(makePost({ course_slug: "investing-101" }));
    const call = mockStripeSessionsCreate.mock.calls[0]![0] as { line_items: Array<{ price: string }> };
    expect(call.line_items[0]!.price).toBe("price_pro");
  });

  it("uses standard price when user has no active subscription", async () => {
    setupHappyPath({ activeSub: null });
    await POST(makePost({ course_slug: "investing-101" }));
    const call = mockStripeSessionsCreate.mock.calls[0]![0] as { line_items: Array<{ price: string }> };
    expect(call.line_items[0]!.price).toBe("price_standard");
  });

  it("sets correct metadata on checkout session", async () => {
    setupHappyPath();
    await POST(makePost({ course_slug: "investing-101" }));
    const call = mockStripeSessionsCreate.mock.calls[0]![0] as { metadata: Record<string, string> };
    expect(call.metadata.type).toBe("course");
    expect(call.metadata.course_slug).toBe("investing-101");
    expect(call.metadata.supabase_user_id).toBe(USER.id);
  });

  it("returns 500 when Stripe session creation throws", async () => {
    setupHappyPath();
    mockStripeSessionsCreate.mockRejectedValue(new Error("Stripe error"));
    const res = await POST(makePost({ course_slug: "investing-101" }));
    expect(res.status).toBe(500);
  });
});
