import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockAdminFrom = vi.fn();
const mockIsAllowed = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: { getUser: () => mockGetUser() } })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown"),
}));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

function makeReq(body: unknown) {
  return new NextRequest("http://localhost/api/reviews/verify-client", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reviews/verify-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({
      data: { user: { email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-admin user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "regular@example.com" } }, error: null });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/reviews/verify-client", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when review_id or review_type missing", async () => {
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1 }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/required/i);
  });

  it("returns 400 for invalid review_type", async () => {
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "company" }));
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/broker.*advisor/i);
  });

  // ── Broker review path ──

  it("returns 404 when broker review not found", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 99, review_type: "broker" }));
    expect(res.status).toBe(404);
  });

  it("returns already_verified when broker review is already verified", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, email: "user@example.com", broker_slug: "commsec", broker_id: 2, is_verified_client: true },
        error: null,
      }),
    });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.already_verified).toBe(true);
  });

  it("verifies broker review via signup_match", async () => {
    const reviewChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, email: "customer@example.com", broker_slug: "commsec", broker_id: 2, is_verified_client: false },
        error: null,
      }),
    };
    const signupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 10 }] }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(reviewChain)
      .mockReturnValueOnce(signupChain)
      .mockReturnValueOnce(updateChain);

    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.verified).toBe(true);
    expect(body.verified_via).toBe("signup_match");
  });

  it("returns verified=false when no broker signup match", async () => {
    const reviewChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, email: "customer@example.com", broker_slug: "commsec", broker_id: 2, is_verified_client: false },
        error: null,
      }),
    };
    const signupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    mockAdminFrom
      .mockReturnValueOnce(reviewChain)
      .mockReturnValueOnce(signupChain);

    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.verified).toBe(false);
  });

  it("returns 500 when broker review update fails", async () => {
    const reviewChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, email: "customer@example.com", broker_slug: "commsec", broker_id: 2, is_verified_client: false },
        error: null,
      }),
    };
    const signupChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 10 }] }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
    };
    mockAdminFrom
      .mockReturnValueOnce(reviewChain)
      .mockReturnValueOnce(signupChain)
      .mockReturnValueOnce(updateChain);

    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    expect(res.status).toBe(500);
  });

  // ── Advisor review path ──

  it("returns 404 when advisor review not found", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 99, review_type: "advisor" }));
    expect(res.status).toBe(404);
  });

  it("returns already_verified for advisor review already verified", async () => {
    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, reviewer_email: "user@example.com", professional_id: 5, is_verified_client: true },
        error: null,
      }),
    });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "advisor" }));
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.already_verified).toBe(true);
  });

  it("verifies advisor review via enquiry_match", async () => {
    const reviewChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, reviewer_email: "client@example.com", professional_id: 5, is_verified_client: false },
        error: null,
      }),
    };
    const leadChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 20 }] }),
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockAdminFrom
      .mockReturnValueOnce(reviewChain)
      .mockReturnValueOnce(leadChain)
      .mockReturnValueOnce(updateChain);

    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "advisor" }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.verified).toBe(true);
    expect(body.verified_via).toBe("enquiry_match");
  });

  it("returns verified=false when no advisor lead match", async () => {
    const reviewChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 1, reviewer_email: "client@example.com", professional_id: 5, is_verified_client: false },
        error: null,
      }),
    };
    const leadChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
    };
    mockAdminFrom
      .mockReturnValueOnce(reviewChain)
      .mockReturnValueOnce(leadChain);

    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "advisor" }));
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.verified).toBe(false);
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("crash"); });
    const { POST } = await import("@/app/api/reviews/verify-client/route");
    const res = await POST(makeReq({ review_id: 1, review_type: "broker" }));
    expect(res.status).toBe(500);
  });
});
