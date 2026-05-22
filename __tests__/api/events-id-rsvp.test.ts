import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

const mockGetUser = vi.fn<
  () => Promise<{ data: { user: { id: string; email?: string } | null } }>
>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Per-table controlled responses for the admin client
const tableResponses: Record<
  string,
  { data?: unknown; error?: unknown }
> = {};

const makeChain = (
  overrideData?: unknown,
  overrideError?: unknown,
) => {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "neq",
    "lt",
    "lte",
    "gte",
    "is",
    "in",
    "not",
    "or",
    "order",
    "limit",
    "maybeSingle",
    "like",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain["single"] = vi.fn(() =>
    Promise.resolve({
      data: overrideData !== undefined ? overrideData : null,
      error: overrideError !== undefined ? overrideError : null,
    }),
  );
  chain["then"] = (resolve: (v: { data: unknown; error: unknown; count?: unknown }) => unknown) =>
    Promise.resolve(
      resolve({
        data: overrideData !== undefined ? overrideData : null,
        error: overrideError !== undefined ? overrideError : null,
      }),
    );
  chain["catch"] = () => chain;
  return chain;
};

// We need fine-grained control per-table AND per-call-sequence within a test.
// Use a factory that consumes a queue of responses per table.
type TableQueue = { data?: unknown; error?: unknown }[];
const tableQueues: Record<string, TableQueue> = {};

const dequeueOrDefault = (
  table: string,
): { data?: unknown; error?: unknown } => {
  const q = tableQueues[table];
  if (q && q.length > 0) return q.shift()!;
  return tableResponses[table] ?? { data: null, error: null };
};

const mockAdminFrom = vi.fn((table: string) => {
  const entry = dequeueOrDefault(table);
  return makeChain(entry.data, entry.error);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// ─── Route under test ─────────────────────────────────────────────────────────

import { POST, DELETE } from "@/app/api/events/[eventId]/rsvp/route";
import { isRateLimited } from "@/lib/rate-limit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(
  method: "POST" | "DELETE",
  body?: Record<string, unknown>,
  ip = "1.2.3.4",
): NextRequest {
  return new NextRequest("http://localhost/api/events/42/rsvp", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

const PARAMS = { params: Promise.resolve({ eventId: "42" }) };
const INVALID_PARAMS = { params: Promise.resolve({ eventId: "not-a-number" }) };

const OPEN_EVENT = {
  id: 42,
  status: "published",
  max_attendees: 100,
  rsvp_count: 10,
};

const NEW_RSVP = {
  id: 99,
  event_id: 42,
  user_id: "user-1",
  user_email: "user@example.com",
  user_name: "Test User",
  status: "registered",
};

// ─── POST tests ───────────────────────────────────────────────────────────────

describe("POST /api/events/[eventId]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    // Default: not rate-limited
    vi.mocked(isRateLimited).mockResolvedValue(false);
    // Default call sequence for POST:
    //   1. advisor_events → open event (fetch + capacity check)
    //   2. advisor_event_rsvps → null (no existing RSVP)
    //   3. advisor_event_rsvps → new RSVP (insert .select().single())
    //   4. advisor_events → void (increment rsvp_count)
    tableQueues["advisor_events"] = [
      { data: OPEN_EVENT, error: null },
      { data: null, error: null },
    ];
    tableQueues["advisor_event_rsvps"] = [
      { data: null, error: null }, // no existing
      { data: NEW_RSVP, error: null }, // insert result
    ];
    // Reset per-table defaults
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/auth/i);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric eventId", async () => {
    const res = await POST(makeRequest("POST"), INVALID_PARAMS);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid event id/i);
  });

  it("returns 400 for a body that fails schema validation (user_name too long)", async () => {
    const res = await POST(
      makeRequest("POST", { user_name: "x".repeat(101) }),
      PARAMS,
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when event does not exist or is not published", async () => {
    tableQueues["advisor_events"] = [{ data: null, error: null }];

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/event not found/i);
  });

  it("returns 409 when event is at capacity", async () => {
    tableQueues["advisor_events"] = [
      {
        data: { ...OPEN_EVENT, max_attendees: 10, rsvp_count: 10 },
        error: null,
      },
    ];

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/full/i);
  });

  it("returns 409 when user has already RSVP'd", async () => {
    tableQueues["advisor_events"] = [{ data: OPEN_EVENT, error: null }];
    tableQueues["advisor_event_rsvps"] = [
      { data: { id: 55 }, error: null }, // existing RSVP found
    ];

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already registered/i);
  });

  it("returns 500 when the RSVP insert fails", async () => {
    tableQueues["advisor_event_rsvps"] = [
      { data: null, error: null }, // no existing
      { data: null, error: { message: "insert error" } }, // insert fails
    ];

    const res = await POST(makeRequest("POST"), PARAMS);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to register/i);
  });

  it("returns 201 with rsvp object on happy path", async () => {
    const res = await POST(
      makeRequest("POST", { user_name: "Test User" }),
      PARAMS,
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rsvp).toBeDefined();
    expect(body.rsvp.id).toBe(99);
  });
});

// ─── DELETE tests ─────────────────────────────────────────────────────────────

describe("DELETE /api/events/[eventId]/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    vi.mocked(isRateLimited).mockResolvedValue(false);
    // Default call sequence for DELETE:
    //   1. advisor_event_rsvps → existing RSVP (select .single())
    //   2. advisor_event_rsvps → void (delete .eq())
    //   3. advisor_events → event with rsvp_count (for decrement select)
    //   4. advisor_events → void (update rsvp_count)
    tableQueues["advisor_event_rsvps"] = [
      { data: { id: 99 }, error: null }, // found
      { data: null, error: null }, // delete ok
    ];
    tableQueues["advisor_events"] = [
      { data: { rsvp_count: 5 }, error: null }, // decrement fetch
      { data: null, error: null }, // update
    ];
    Object.keys(tableResponses).forEach((k) => delete tableResponses[k]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await DELETE(makeRequest("DELETE"), PARAMS);

    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(isRateLimited).mockResolvedValue(true);

    const res = await DELETE(makeRequest("DELETE"), PARAMS);

    expect(res.status).toBe(429);
  });

  it("returns 400 for a non-numeric eventId", async () => {
    const res = await DELETE(makeRequest("DELETE"), INVALID_PARAMS);

    expect(res.status).toBe(400);
  });

  it("returns 404 when RSVP does not exist", async () => {
    tableQueues["advisor_event_rsvps"] = [{ data: null, error: null }];

    const res = await DELETE(makeRequest("DELETE"), PARAMS);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/rsvp not found/i);
  });

  it("returns 500 when delete query fails", async () => {
    tableQueues["advisor_event_rsvps"] = [
      { data: { id: 99 }, error: null }, // found
      { data: null, error: { message: "delete failed" } }, // delete error
    ];

    const res = await DELETE(makeRequest("DELETE"), PARAMS);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to cancel/i);
  });

  it("returns 200 with success: true on happy path", async () => {
    const res = await DELETE(makeRequest("DELETE"), PARAMS);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
