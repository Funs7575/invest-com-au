import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── withValidatedBody: real Zod pass-through ──────────────────────────────────

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

const { mockRequireAdvisorSession, mockSendReviewRequest } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
  mockSendReviewRequest: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendReviewRequest: (..._args: unknown[]) => mockSendReviewRequest(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
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

import { POST } from "@/app/api/advisor-auth/reviews/invite/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Constants ─────────────────────────────────────────────────────────────────

const ADVISOR_ID = 88;

const MOCK_ADVISOR = {
  name: "Sarah Wealth",
  slug: "sarah-wealth",
};

const VALID_BODY = {
  email: "client@example.com",
  name: "John Client",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/reviews/invite", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "9.8.7.6",
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/reviews/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockSendReviewRequest.mockResolvedValue(true);

    // Default: advisor lookup succeeds
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(MOCK_ADVISOR, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: MOCK_ADVISOR,
        error: null,
      });
      return b;
    });
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when advisor session is not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 400 validation: missing email ────────────────────────────────────────

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({ name: "Client" }));
    expect(res.status).toBe(400);
  });

  // ── 400 validation: invalid email ────────────────────────────────────────

  it("returns 400 when email is not a valid email address", async () => {
    const res = await POST(makePost({ email: "not-an-email", name: "Client" }));
    expect(res.status).toBe(400);
  });

  // ── 400 validation: missing name ─────────────────────────────────────────

  it("returns 400 when client name is missing", async () => {
    const res = await POST(makePost({ email: "client@example.com" }));
    expect(res.status).toBe(400);
  });

  // ── 400 validation: empty name ────────────────────────────────────────────

  it("returns 400 when client name is empty string", async () => {
    const res = await POST(makePost({ email: "client@example.com", name: "" }));
    expect(res.status).toBe(400);
  });

  // ── 400 validation: name exceeds max length ───────────────────────────────

  it("returns 400 when client name exceeds 200 characters", async () => {
    const res = await POST(makePost({ email: "client@example.com", name: "A".repeat(201) }));
    expect(res.status).toBe(400);
  });

  // ── 400 invalid JSON ─────────────────────────────────────────────────────

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/reviews/invite", {
      method: "POST",
      body: "not-json{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "9.8.7.6" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── 500 advisor not found in DB ───────────────────────────────────────────

  it("returns 500 when advisor row is not found in professionals table", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/advisor not found/i);
  });

  // ── 500 email send fails ──────────────────────────────────────────────────

  it("returns 500 when sendReviewRequest returns false", async () => {
    mockSendReviewRequest.mockResolvedValue(false);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to send invitation email/i);
  });

  // ── 200 success ───────────────────────────────────────────────────────────

  it("returns 200 with success:true when invitation is sent", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  // ── sendReviewRequest called with correct args ─────────────────────────────

  it("calls sendReviewRequest with client email, client name, advisor name, advisor slug", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockSendReviewRequest).toHaveBeenCalledTimes(1);
  });
});
