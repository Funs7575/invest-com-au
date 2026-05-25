import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks — must appear before any import of the route ────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// withValidatedBody: run real Zod validation so 400 tests fire correctly.
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

// vi.hoisted — capture the mock fn before vi.mock factory runs.
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

// ── Supabase admin builder ─────────────────────────────────────────────────────

function makeBuilder(
  result: unknown = { data: null, error: null },
) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "upsert",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "not",
    "or",
    "order",
    "limit",
    "like",
    "ilike",
    "filter",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── Route import (after all vi.mock calls) ────────────────────────────────────

import { GET, POST, PATCH } from "@/app/api/advisor-auth/events/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Request factories ─────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/events", {
    method: "GET",
  });
}

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/events", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADVISOR_ID = 42;

const mockEvent = {
  id: 1,
  professional_id: ADVISOR_ID,
  title: "Intro to ETFs Webinar",
  description: "A great webinar",
  event_type: "webinar",
  starts_at: "2026-08-01T10:00:00Z",
  ends_at: "2026-08-01T11:00:00Z",
  timezone: "Australia/Sydney",
  location: null,
  meeting_url: "https://zoom.us/j/123",
  max_attendees: 100,
  price_cents: 0,
  cover_image_url: null,
  status: "draft",
  rsvp_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const validPostBody = {
  title: "ETF Investing Workshop",
  starts_at: "2026-08-01T10:00:00Z",
};

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many requests/i);
  });

  it("returns events array on success", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: [mockEvent], error: null });
      // limit() is the terminal call — override to resolve
      (b.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [mockEvent],
        error: null,
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // events key exists; could be from .then fallback or limit override
    expect(Array.isArray(json.events)).toBe(true);
  });

  it("returns empty array when advisor has no events", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.events).toEqual([]);
  });

  it("returns 500 when DB fetch fails", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: { message: "db error" } });
      // limit() is the final chain call — make it resolve with an error
      (b.limit as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: "db error" },
      });
      return b;
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch events/i);
  });
});

// ── Tests: POST ───────────────────────────────────────────────────────────────

describe("POST /api/advisor-auth/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: mockEvent, error: null });
      b.single = vi.fn(() =>
        Promise.resolve({ data: mockEvent, error: null }),
      );
      return b;
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(429);
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makePost({ starts_at: "2026-08-01T10:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when title is too short (under 3 chars)", async () => {
    const res = await POST(
      makePost({ title: "Hi", starts_at: "2026-08-01T10:00:00Z" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when starts_at is missing", async () => {
    const res = await POST(makePost({ title: "Valid Event Title" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when starts_at is not a valid datetime", async () => {
    const res = await POST(
      makePost({ title: "Valid Event Title", starts_at: "not-a-date" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when event_type is invalid", async () => {
    const res = await POST(
      makePost({
        title: "Valid Event Title",
        starts_at: "2026-08-01T10:00:00Z",
        event_type: "party",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("creates event and returns 201 with event data", async () => {
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.event).toBeDefined();
    expect(json.event.status).toBe("draft");
  });

  it("creates event with all optional fields", async () => {
    const fullBody = {
      title: "Full Event With All Fields",
      starts_at: "2026-08-01T10:00:00Z",
      ends_at: "2026-08-01T12:00:00Z",
      event_type: "workshop",
      description: "A detailed description of the event",
      timezone: "Australia/Melbourne",
      location: "123 Collins St, Melbourne",
      meeting_url: "https://zoom.us/j/999",
      max_attendees: 50,
      price_cents: 2500,
    };
    const res = await POST(makePost(fullBody));
    expect(res.status).toBe(201);
  });

  it("returns 500 when DB insert fails", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: { message: "insert error" } });
      b.single = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: "insert error" } }),
      );
      return b;
    });
    const res = await POST(makePost(validPostBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to create event/i);
  });
});

// ── Tests: PATCH ──────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/events", () => {
  const validPatchBody = {
    eventId: 1,
    title: "Updated Event Title",
  };

  const draftEvent = {
    id: 1,
    status: "draft",
    professional_id: ADVISOR_ID,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: draftEvent, error: null });
      b.single = vi.fn()
        // First call: ownership check
        .mockResolvedValueOnce({ data: draftEvent, error: null })
        // Second call: update result
        .mockResolvedValueOnce({
          data: { ...mockEvent, title: "Updated Event Title" },
          error: null,
        });
      return b;
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when eventId is missing", async () => {
    const res = await PATCH(makePatch({ title: "Valid Updated Title" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when status is invalid", async () => {
    const res = await PATCH(
      makePatch({ eventId: 1, status: "not-a-real-status" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when event is not found or not owned", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: null });
      b.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("returns 400 when trying to update a cancelled event", async () => {
    const cancelledEvent = { id: 1, status: "cancelled", professional_id: ADVISOR_ID };
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: cancelledEvent, error: null });
      b.single = vi.fn(() =>
        Promise.resolve({ data: cancelledEvent, error: null }),
      );
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot update a cancelled event/i);
  });

  it("updates event fields and returns 200", async () => {
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event).toBeDefined();
  });

  it("allows valid draft → published status transition", async () => {
    const res = await PATCH(makePatch({ eventId: 1, status: "published" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status transition (draft → cancelled)", async () => {
    const res = await PATCH(makePatch({ eventId: 1, status: "cancelled" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition from draft to cancelled/i);
  });

  it("returns 400 for invalid status transition (draft → completed)", async () => {
    const res = await PATCH(makePatch({ eventId: 1, status: "completed" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition from draft to completed/i);
  });

  it("allows published → cancelled transition", async () => {
    const publishedEvent = {
      id: 1,
      status: "published",
      professional_id: ADVISOR_ID,
    };
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: publishedEvent, error: null });
      b.single = vi.fn()
        .mockResolvedValueOnce({ data: publishedEvent, error: null })
        .mockResolvedValueOnce({
          data: { ...mockEvent, status: "cancelled" },
          error: null,
        });
      return b;
    });
    const res = await PATCH(makePatch({ eventId: 1, status: "cancelled" }));
    expect(res.status).toBe(200);
  });

  it("allows published → completed transition", async () => {
    const publishedEvent = {
      id: 1,
      status: "published",
      professional_id: ADVISOR_ID,
    };
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: publishedEvent, error: null });
      b.single = vi.fn()
        .mockResolvedValueOnce({ data: publishedEvent, error: null })
        .mockResolvedValueOnce({
          data: { ...mockEvent, status: "completed" },
          error: null,
        });
      return b;
    });
    const res = await PATCH(makePatch({ eventId: 1, status: "completed" }));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid status transition (completed → any)", async () => {
    const completedEvent = {
      id: 1,
      status: "completed",
      professional_id: ADVISOR_ID,
    };
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: completedEvent, error: null });
      b.single = vi.fn(() =>
        Promise.resolve({ data: completedEvent, error: null }),
      );
      return b;
    });
    const res = await PATCH(makePatch({ eventId: 1, status: "published" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Cannot transition from completed/i);
  });

  it("returns 500 when DB update fails", async () => {
    // The route calls admin.from("advisor_events") twice:
    // 1st call → ownership check (returns draftEvent)
    // 2nd call → update (returns DB error)
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const b = makeBuilder({ data: draftEvent, error: null });
        b.single = vi.fn(() => Promise.resolve({ data: draftEvent, error: null }));
        return b;
      }
      const b = makeBuilder({ data: null, error: { message: "update failed" } });
      b.single = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: "update failed" } }),
      );
      return b;
    });
    const res = await PATCH(makePatch(validPatchBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to update event/i);
  });

  it("updates multiple fields in one request", async () => {
    const fullPatch = {
      eventId: 1,
      title: "Renamed Event",
      description: "New description text",
      event_type: "seminar",
      starts_at: "2026-09-01T09:00:00Z",
      ends_at: "2026-09-01T10:30:00Z",
      timezone: "Australia/Brisbane",
      max_attendees: 200,
      price_cents: 5000,
    };
    const res = await PATCH(makePatch(fullPatch));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.event).toBeDefined();
  });
});
