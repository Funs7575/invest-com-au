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

const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<() => Promise<number | null>>(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) =>
    mockRequireAdvisorSession(...(args as [])),
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

import { PATCH, GET } from "@/app/api/advisor-auth/availability/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 33;

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/availability", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "10.0.0.1",
    },
  });
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/availability", {
    method: "GET",
    headers: { "x-forwarded-for": "10.0.0.1" },
  });
}

// ── Tests: PATCH ──────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    // Default: update succeeds
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when advisor session not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 429 rate limiting ─────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many requests/i);
  });

  // ── 400 validation ────────────────────────────────────────────────────────

  it("returns 400 when status is missing", async () => {
    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is an invalid enum value", async () => {
    const res = await PATCH(makePatch({ status: "busy" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/advisor-auth/availability", {
      method: "PATCH",
      body: "not-json{{",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  // ── 200 open ─────────────────────────────────────────────────────────────

  it("returns 200 with success:true and status:open", async () => {
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("open");
  });

  // ── 200 waitlist ──────────────────────────────────────────────────────────

  it("returns 200 with success:true and status:waitlist", async () => {
    const res = await PATCH(makePatch({ status: "waitlist" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("waitlist");
  });

  // ── 200 closed ───────────────────────────────────────────────────────────

  it("returns 200 with success:true and status:closed", async () => {
    const res = await PATCH(makePatch({ status: "closed" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("closed");
  });

  // ── 500 DB failure ────────────────────────────────────────────────────────

  it("returns 500 when DB update fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder(null, { message: "update failed" }),
    );
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to update availability/i);
  });
});

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    // Default: advisor has status "open"
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder({ availability_status: "open" }, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { availability_status: "open" },
        error: null,
      });
      return b;
    });
  });

  // ── 401 unauthenticated ───────────────────────────────────────────────────

  it("returns 401 when advisor session not found", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/not authenticated/i);
  });

  // ── 200 returns status ────────────────────────────────────────────────────

  it("returns 200 with availability status", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("open");
  });

  // ── 200 defaults to open when null ───────────────────────────────────────

  it("returns 200 with status:open when availability_status is null", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder({ availability_status: null }, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { availability_status: null },
        error: null,
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("open");
  });

  // ── 500 DB failure ────────────────────────────────────────────────────────

  it("returns 500 when DB query fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, { message: "query failed" });
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "query failed" },
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to fetch availability/i);
  });
});
