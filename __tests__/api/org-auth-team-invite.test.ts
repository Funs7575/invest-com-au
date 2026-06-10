import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireOrgSession, mockIsRateLimited, mockAdminFrom } = vi.hoisted(() => ({
  mockRequireOrgSession: vi.fn<() => Promise<{ organisationId: number; role: string; userId: string }>>(
    async () => ({ organisationId: 5, role: "admin", userId: "user-org-5" }),
  ),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
  mockAdminFrom: vi.fn(() => makeChain()),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/require-org-session", () => ({
  requireOrgSession: () => mockRequireOrgSession(),
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: (
    schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ message: string }> } } },
    handler: (req: NextRequest, body: unknown) => unknown,
  ) =>
    async (req: NextRequest) => {
      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        const { NextResponse } = await import("next/server");
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const parsed = schema.safeParse(rawBody);
      if (!parsed.success) {
        const { NextResponse } = await import("next/server");
        const firstMsg = parsed.error?.issues[0]?.message ?? "Validation error";
        return NextResponse.json(
          { error: firstMsg, code: "validation_error", issues: parsed.error?.issues ?? [] },
          { status: 400 },
        );
      }
      return handler(req, parsed.data);
    },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "range", "maybeSingle", "single", "like", "head",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

function makeReq(method: string, body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new Request("http://localhost/api/org-auth/team/invite", {
    method,
    headers: {
      "x-forwarded-for": ip,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const SESSION_ADMIN = { organisationId: 5, role: "admin", userId: "user-org-5" };
const SESSION_VIEWER = { organisationId: 5, role: "viewer", userId: "user-org-5" };

const VALID_BODY = { email: "newmember@example.com", role: "editor" };

const SAMPLE_MEMBER = {
  id: 42,
  organisation_id: 5,
  invited_email: "newmember@example.com",
  role: "editor",
  status: "pending",
  invited_at: "2026-05-01T00:00:00Z",
};

// ── Route under test ──────────────────────────────────────────────────────────
import { POST } from "@/app/api/org-auth/team/invite/route";

// ═══════════════════════════════════════════════════════════════════════════════
// POST
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/org-auth/team/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/team/invite", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeReq("POST", { role: "editor" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when email is invalid", async () => {
    const res = await POST(makeReq("POST", { email: "not-an-email", role: "editor" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when role is an invalid enum value", async () => {
    const res = await POST(makeReq("POST", { email: "valid@example.com", role: "superuser" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when role is missing", async () => {
    const res = await POST(makeReq("POST", { email: "valid@example.com" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockRequireOrgSession.mockResolvedValue(SESSION_VIEWER);
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Only org admins/i);
  });

  it("returns 404 when organisation not found", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/Organisation not found/i);
  });

  it("returns 500 when member count query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { max_seats: 5 }, error: null });
      return makeChain({ data: null, error: { message: "count boom" }, count: null });
    });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to check seat limit/i);
  });

  it("returns 403 when seat limit is reached", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { max_seats: 3 }, error: null });
      return makeChain({ data: null, error: null, count: 3 });
    });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/Seat limit reached/i);
  });

  it("returns 409 when email already has an active or pending invite", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { max_seats: 10 }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 2 });
      return makeChain({ data: { id: 99 }, error: null });
    });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already has an active or pending invitation/i);
  });

  it("returns 500 when the insert fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { max_seats: 10 }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 2 });
      if (call === 3) return makeChain({ data: null, error: null }); // no existing invite
      return makeChain({ data: null, error: { message: "insert boom" } });
    });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to send invitation/i);
  });

  it("returns 201 with the new member on success", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeChain({ data: { max_seats: 10 }, error: null });
      if (call === 2) return makeChain({ data: null, error: null, count: 2 });
      if (call === 3) return makeChain({ data: null, error: null }); // no existing invite
      return makeChain({ data: SAMPLE_MEMBER, error: null });
    });
    const res = await POST(makeReq("POST", VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.member.invited_email).toBe("newmember@example.com");
    expect(body.member.status).toBe("pending");
    expect(body.member.role).toBe("editor");
  });

  it("all three valid roles are accepted (admin, editor, viewer)", async () => {
    for (const role of ["admin", "editor", "viewer"] as const) {
      vi.clearAllMocks();
      mockIsRateLimited.mockResolvedValue(false);
      mockRequireOrgSession.mockResolvedValue(SESSION_ADMIN);
      let call = 0;
      mockAdminFrom.mockImplementation(() => {
        call += 1;
        if (call === 1) return makeChain({ data: { max_seats: 10 }, error: null });
        if (call === 2) return makeChain({ data: null, error: null, count: 0 });
        if (call === 3) return makeChain({ data: null, error: null });
        return makeChain({ data: { ...SAMPLE_MEMBER, role }, error: null });
      });
      const res = await POST(makeReq("POST", { email: "test@example.com", role }));
      expect(res.status).toBe(201);
    }
  });
});
