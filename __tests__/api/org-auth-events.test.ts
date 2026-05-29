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
  return new Request("http://localhost/api/org-auth/events", {
    method,
    headers: {
      "x-forwarded-for": ip,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as unknown as NextRequest;
}

const SESSION = { organisationId: 5, role: "admin", userId: "user-org-5" };

const VALID_EVENT_BODY = {
  title: "Webinar on ETFs",
  starts_at: "2026-06-01T10:00:00Z",
};

const SAMPLE_EVENT = {
  id: 1,
  title: "Webinar on ETFs",
  description: null,
  event_type: "webinar",
  starts_at: "2026-06-01T10:00:00Z",
  ends_at: null,
  timezone: "Australia/Sydney",
  location: null,
  meeting_url: null,
  max_attendees: null,
  price_cents: 0,
  status: "draft",
  rsvp_count: 0,
  created_at: "2026-05-01T00:00:00Z",
};

// ── Route under test ──────────────────────────────────────────────────────────
import { GET, POST } from "@/app/api/org-auth/events/route";

// ═══════════════════════════════════════════════════════════════════════════════
// GET
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/org-auth/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected"));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });

  it("returns 500 when the events DB query fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "db error" } }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to load events/i);
  });

  it("returns 200 with empty array when org has no events", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toEqual([]);
  });

  it("returns 200 with events array on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [SAMPLE_EVENT], error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].title).toBe("Webinar on ETFs");
    expect(body.events[0].status).toBe("draft");
  });

  it("returns 200 with multiple events", async () => {
    const events = [
      { ...SAMPLE_EVENT, id: 1, title: "Event A" },
      { ...SAMPLE_EVENT, id: 2, title: "Event B" },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: events, error: null }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).events).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST
// ═══════════════════════════════════════════════════════════════════════════════

describe("POST /api/org-auth/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockRequireOrgSession.mockResolvedValue(SESSION);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq("POST", VALID_EVENT_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/too many requests/i);
  });

  it("returns 401 when requireOrgSession throws a 401 Response", async () => {
    mockRequireOrgSession.mockRejectedValue(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }),
    );
    const res = await POST(makeReq("POST", VALID_EVENT_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/org-auth/events", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json{{",
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid json/i);
  });

  it("returns 400 when title is too short (Zod min 3)", async () => {
    const res = await POST(makeReq("POST", { title: "Hi", starts_at: "2026-06-01T10:00:00Z" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("validation_error");
  });

  it("returns 400 when starts_at is missing (required field)", async () => {
    const res = await POST(makeReq("POST", { title: "Valid Event Title" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when starts_at is not a valid datetime", async () => {
    const res = await POST(makeReq("POST", { title: "Valid Event Title", starts_at: "not-a-date" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when event_type is an invalid enum value", async () => {
    const res = await POST(makeReq("POST", { ...VALID_EVENT_BODY, event_type: "party" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when meeting_url is not a valid URL", async () => {
    const res = await POST(makeReq("POST", { ...VALID_EVENT_BODY, meeting_url: "not-a-url" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 400 when max_attendees is zero (min 1)", async () => {
    const res = await POST(makeReq("POST", { ...VALID_EVENT_BODY, max_attendees: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("validation_error");
  });

  it("returns 500 when the insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "insert boom" } }));
    const res = await POST(makeReq("POST", VALID_EVENT_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/Failed to create event/i);
  });

  it("returns 201 with the new event on success", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: SAMPLE_EVENT, error: null }));
    const res = await POST(makeReq("POST", VALID_EVENT_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.event.title).toBe("Webinar on ETFs");
    expect(body.event.status).toBe("draft");
  });

  it("returns 201 with all optional fields on a full-body request", async () => {
    const fullBody = {
      title: "Full Event",
      starts_at: "2026-06-01T10:00:00Z",
      ends_at: "2026-06-01T12:00:00Z",
      event_type: "workshop",
      description: "A workshop about investing",
      timezone: "Australia/Melbourne",
      location: "123 Collins St, Melbourne",
      meeting_url: "https://zoom.us/j/12345",
      max_attendees: 100,
      price_cents: 5000,
    };
    const fullEvent = { ...SAMPLE_EVENT, ...fullBody };
    mockAdminFrom.mockReturnValue(makeChain({ data: fullEvent, error: null }));
    const res = await POST(makeReq("POST", fullBody));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.event.event_type).toBe("workshop");
    expect(body.event.price_cents).toBe(5000);
  });

  it("returns 500 when requireOrgSession throws an unexpected Error after rate-limit check", async () => {
    mockRequireOrgSession.mockRejectedValue(new Error("unexpected crash"));
    const res = await POST(makeReq("POST", VALID_EVENT_BODY));
    expect(res.status).toBe(500);
  });
});
