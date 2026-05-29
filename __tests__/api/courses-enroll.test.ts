import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── withValidatedBody: pass Zod schema through so validation fires ─────────────

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody:
    (
      schema: {
        safeParse: (v: unknown) => {
          success: boolean;
          data?: unknown;
          error?: { issues: unknown[] };
        };
      },
      handler: (req: NextRequest, body: unknown) => unknown,
    ) =>
    async (req: NextRequest) => {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          { status: 400 },
        );
      }
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error!.issues as Array<{
          path?: string[];
          message?: string;
        }>;
        const first = issues[0];
        const path = first?.path?.join(".") ?? "";
        const message = first?.message ?? "Invalid request body";
        return new Response(
          JSON.stringify({
            error: path ? `${path}: ${message}` : message,
            code: "validation_error",
            issues,
          }),
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockGetUser, mockCustomersCreate, mockSessionsCreate } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string; email: string } | null } }>>(),
  mockCustomersCreate: vi.fn<() => Promise<{ id: string }>>(),
  mockSessionsCreate: vi.fn<() => Promise<{ url: string }>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: { create: (..._a: unknown[]) => mockCustomersCreate() },
    checkout: { sessions: { create: (..._a: unknown[]) => mockSessionsCreate() } },
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST } from "@/app/api/courses/enroll/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_ID = "user-uuid-111";
const USER_EMAIL = "learner@example.com";
const COURSE_ID = "course-abc";

const FREE_COURSE = {
  id: COURSE_ID,
  slug: "intro-to-investing",
  title: "Intro to Investing",
  price_cents: 0,
  status: "published",
  stripe_price_id: null,
};

const PAID_COURSE = {
  id: COURSE_ID,
  slug: "advanced-options",
  title: "Advanced Options",
  price_cents: 4900,
  status: "published",
  stripe_price_id: "price_xyz123",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/courses/enroll", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/courses/enroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: USER_EMAIL } } });
    // Default: not rate-limited
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    // Default: course exists (free), no existing enrollment
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // courses lookup
        const b = makeBuilder(FREE_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: FREE_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        // course_enrollments existing check
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      // course_enrollments insert
      return makeBuilder(null, null);
    });
    // Stripe defaults
    mockCustomersCreate.mockResolvedValue({ id: "cus_newcustomer" });
    mockSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test" });
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 400 validation ────────────────────────────────────────────────────────

  it("returns 400 when courseId is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/courses/enroll", {
      method: "POST",
      body: "not-json{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts courseId as a number (coerces to string)", async () => {
    const res = await POST(makePost({ courseId: 42 }));
    // Should proceed past validation — either 201 (free enroll) or other logic branch
    expect(res.status).not.toBe(400);
  });

  // ── 404 course not found ──────────────────────────────────────────────────

  it("returns 404 when course does not exist or is not published", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/course not found/i);
  });

  // ── 400 already enrolled ──────────────────────────────────────────────────

  it("returns 400 when user is already enrolled", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(FREE_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: FREE_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        // existing enrollment found
        const b = makeBuilder({ id: "enroll-existing" }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { id: "enroll-existing" },
          error: null,
        });
        return b;
      }
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already enrolled/i);
  });

  // ── 201 free enrollment ───────────────────────────────────────────────────

  it("returns 201 enrolled:true for a free course", async () => {
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.enrolled).toBe(true);
  });

  // ── 500 free enrollment DB failure ────────────────────────────────────────

  it("returns 500 when free enrollment insert fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(FREE_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: FREE_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      // insert fails
      return makeBuilder(null, { message: "insert error" });
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to enroll/i);
  });

  // ── 400 paid course with no stripe_price_id ───────────────────────────────

  it("returns 400 when paid course has no stripe_price_id", async () => {
    const noPrice = { ...PAID_COURSE, stripe_price_id: null };
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(noPrice, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: noPrice, error: null });
        return b;
      }
      if (call === 2) {
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/pricing not configured/i);
  });

  // ── 400 paid course, no user email ───────────────────────────────────────

  it("returns 400 when user has no email and no existing customer", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: USER_ID, email: "" } } });
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(PAID_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: PAID_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        // no existing enrollment
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      if (call === 3) {
        // profiles: no stripe_customer_id
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email address is required/i);
  });

  // ── 200 paid course, existing stripe customer → checkout session ──────────

  it("returns 200 with checkout url when paid course and existing stripe customer", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(PAID_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: PAID_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        // no existing enrollment
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      if (call === 3) {
        // profiles: existing customer
        const b = makeBuilder({ stripe_customer_id: "cus_existing" }, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
          data: { stripe_customer_id: "cus_existing" },
          error: null,
        });
        return b;
      }
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/test");
  });

  // ── 200 paid course, no existing customer → creates customer then session ─

  it("creates a stripe customer when none exists, returns checkout url", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(PAID_COURSE, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: PAID_COURSE, error: null });
        return b;
      }
      if (call === 2) {
        // no existing enrollment
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      if (call === 3) {
        // profiles: no customer
        const b = makeBuilder(null, null);
        (b.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
        return b;
      }
      // profiles update + checkout
      return makeBuilder(null, null);
    });
    const res = await POST(makePost({ courseId: COURSE_ID }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/test");
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
  });
});
