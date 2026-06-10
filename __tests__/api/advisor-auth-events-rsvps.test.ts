import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

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

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ── Supabase admin builder ────────────────────────────────────────────────────

function makeBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
      Promise.resolve(r({ data, error, count })),
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

import { GET, DELETE } from "@/app/api/advisor-auth/events/[eventId]/rsvps/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADVISOR_ID = 33;
const EVENT_ID = 5;

function makeGet(eventId: string = String(EVENT_ID)): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/events/${eventId}/rsvps`,
    { method: "GET" },
  );
}

function makeDelete(eventId: string = String(EVENT_ID), body: unknown = { rsvpId: 1 }): NextRequest {
  return new NextRequest(
    `http://localhost/api/advisor-auth/events/${eventId}/rsvps`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

const mockRsvp = {
  id: 1,
  event_id: EVENT_ID,
  user_id: "user-abc",
  status: "confirmed",
  created_at: "2026-01-01T00:00:00Z",
};

const mockEventRow = { id: EVENT_ID };

// ── Tests: GET ────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/events/[eventId]/rsvps", () => {
  const eventParams = { params: Promise.resolve({ eventId: String(EVENT_ID) }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // ownership check → advisor_events
        const b = makeBuilder(mockEventRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockEventRow, error: null });
        return b;
      }
      // rsvps query — terminal via .then
      return makeBuilder([mockRsvp], null, 1);
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/Too many requests/i);
  });

  it("returns 400 when eventId is not a number", async () => {
    const params = { params: Promise.resolve({ eventId: "not-a-number" }) };
    const res = await GET(makeGet("not-a-number"), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid event ID/i);
  });

  it("returns 404 when event not found or not owned by advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Event not found/i);
  });

  it("returns 200 with rsvps array and count on success", async () => {
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rsvps)).toBe(true);
    expect(typeof json.count).toBe("number");
  });

  it("returns empty rsvps when event has no attendees", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(mockEventRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockEventRow, error: null });
        return b;
      }
      return makeBuilder([], null, 0);
    });
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rsvps).toEqual([]);
    expect(json.count).toBe(0);
  });

  it("returns 500 when rsvps DB query fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(mockEventRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockEventRow, error: null });
        return b;
      }
      return makeBuilder(null, { message: "db error" }, null);
    });
    const res = await GET(makeGet(), eventParams);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to fetch RSVPs/i);
  });
});

// ── Tests: DELETE ─────────────────────────────────────────────────────────────

describe("DELETE /api/advisor-auth/events/[eventId]/rsvps", () => {
  const eventParams = { params: Promise.resolve({ eventId: String(EVENT_ID) }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdvisorSession.mockResolvedValue(ADVISOR_ID);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        // ownership check
        const b = makeBuilder(mockEventRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockEventRow, error: null });
        return b;
      }
      if (call === 2) {
        // rsvp delete — resolves via .then
        return makeBuilder(null, null);
      }
      if (call === 3) {
        // rsvp_count select
        const b = makeBuilder({ rsvp_count: 3 }, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { rsvp_count: 3 }, error: null });
        return b;
      }
      // update rsvp_count
      return makeBuilder(null, null);
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await DELETE(makeDelete(), eventParams);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/Not authenticated/i);
  });

  it("returns 400 when eventId is not a number", async () => {
    const params = { params: Promise.resolve({ eventId: "bad" }) };
    const res = await DELETE(makeDelete("bad"), params);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid event ID/i);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest(
      `http://localhost/api/advisor-auth/events/${EVENT_ID}/rsvps`,
      { method: "DELETE", body: "{{bad}}", headers: { "Content-Type": "application/json" } },
    );
    const res = await DELETE(req, eventParams);
    expect(res.status).toBe(400);
  });

  it("returns 400 when rsvpId is missing from body", async () => {
    const res = await DELETE(makeDelete(String(EVENT_ID), {}), eventParams);
    expect(res.status).toBe(400);
  });

  it("returns 404 when event not found or not owned by advisor", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => {
      const b = makeBuilder(null, null);
      (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null });
      return b;
    });
    const res = await DELETE(makeDelete(), eventParams);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/Event not found/i);
  });

  it("deletes RSVP and returns success", async () => {
    const res = await DELETE(makeDelete(), eventParams);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 500 when RSVP delete fails", async () => {
    let call = 0;
    mockFrom.mockImplementation((..._a: unknown[]) => {
      call++;
      if (call === 1) {
        const b = makeBuilder(mockEventRow, null);
        (b.single as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockEventRow, error: null });
        return b;
      }
      // rsvp delete fails
      return makeBuilder(null, { message: "delete error" });
    });
    const res = await DELETE(makeDelete(), eventParams);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/Failed to delete RSVP/i);
  });
});
