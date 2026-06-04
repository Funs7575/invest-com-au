import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockIsRateLimited, mockAdminFrom, mockCheckoutCreate, mockCustomersCreate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsRateLimited: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockCheckoutCreate: vi.fn(),
  mockCustomersCreate: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: { create: (...a: unknown[]) => mockCustomersCreate(...a) },
    checkout: { sessions: { create: (...a: unknown[]) => mockCheckoutCreate(...a) } },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

import { POST } from "@/app/api/courses/enroll/route";

const USER = { id: "user-1", email: "learner@example.com" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/courses/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * Build the admin `from` router.
 * - courses: select().eq().eq().maybeSingle()
 * - course_enrollments: select().eq().eq().limit().maybeSingle() for the dup-check;
 *   insert() for the free-enrol path
 * - profiles: select().eq().maybeSingle() + update().eq()
 */
function buildAdminFrom(opts: {
  course?: Record<string, unknown> | null;
  existingEnrollment?: { id: string } | null;
  enrollInsertError?: { message: string } | null;
  profile?: { stripe_customer_id?: string } | null;
} = {}) {
  return vi.fn((table: string) => {
    if (table === "courses") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: opts.course ?? null, error: null })),
      };
    }
    if (table === "course_enrollments") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: opts.existingEnrollment ?? null, error: null })),
        insert: vi.fn(async () => ({ error: opts.enrollInsertError ?? null })),
      };
    }
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => ({ data: opts.profile ?? null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
    }
    return {};
  });
}

const FREE_COURSE = { id: 1, slug: "intro", title: "Intro", price_cents: 0, status: "published", stripe_price_id: null };
const PAID_COURSE = { id: 2, slug: "pro", title: "Pro", price_cents: 9900, status: "published", stripe_price_id: "price_123" };

describe("POST /api/courses/enroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: FREE_COURSE }));
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/sess" });
  });

  it("returns 400 on an invalid body (missing courseId)", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makeReq({ courseId: "1" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ courseId: "1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when the course is not found or unpublished", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: null }));
    const res = await POST(makeReq({ courseId: "999" }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when the user is already enrolled", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: FREE_COURSE, existingEnrollment: { id: "e1" } }));
    const res = await POST(makeReq({ courseId: "1" }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/already enrolled/i);
  });

  it("enrolls directly (201) for a free course without touching Stripe", async () => {
    const res = await POST(makeReq({ courseId: "1" }));
    expect(res.status).toBe(201);
    expect((await res.json() as { enrolled: boolean }).enrolled).toBe(true);
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("returns 500 when the free enrollment insert fails", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: FREE_COURSE, enrollInsertError: { message: "boom" } }));
    const res = await POST(makeReq({ courseId: "1" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when a paid course has no stripe_price_id configured", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: { ...PAID_COURSE, stripe_price_id: null } }));
    const res = await POST(makeReq({ courseId: "2" }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/pricing not configured/i);
  });

  it("creates a Stripe customer when none exists and returns a checkout url", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: PAID_COURSE, profile: { stripe_customer_id: undefined } }));
    const res = await POST(makeReq({ courseId: "2" }));
    expect(res.status).toBe(200);
    expect((await res.json() as { url: string }).url).toContain("checkout.stripe.com");
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
  });

  it("reuses an existing Stripe customer id for the checkout session", async () => {
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: PAID_COURSE, profile: { stripe_customer_id: "cus_existing" } }));
    const res = await POST(makeReq({ courseId: "2" }));
    expect(res.status).toBe(200);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    const sessionArg = mockCheckoutCreate.mock.calls[0]?.[0] as { customer: string };
    expect(sessionArg.customer).toBe("cus_existing");
  });

  it("returns 400 when a customer must be created but the user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1", email: null } } });
    mockAdminFrom.mockImplementation(buildAdminFrom({ course: PAID_COURSE, profile: null }));
    const res = await POST(makeReq({ courseId: "2" }));
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toMatch(/email/i);
  });
});
