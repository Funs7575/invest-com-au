/**
 * Tests for the seasonal-emails cron route.
 *
 * Key behaviours:
 *   - requireCronAuth gate
 *   - No campaign active → 200 with sent=0 and message
 *   - No opted-in users → 200 with sent=0 and message
 *   - All users already received campaign → 200 with sent=0 and message
 *   - DB error fetching prefs → 500
 *   - Happy path eofy_countdown → emails sent, seasonal_email_sends inserted
 *   - Happy path new_fy_kickstart → emails sent
 *   - Email send failure → counted in errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Hoisted mock handles ─────────────────────────────────────────────────────

const { mockRequireCronAuth, mockAdminFrom, mockSendEmail, mockListUsers } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn((): NextResponse | null => null),
  mockAdminFrom: vi.fn(),
  mockSendEmail: vi.fn(async () => ({ ok: true })),
  mockListUsers: vi.fn(async () => ({ data: { users: [] as Array<{ id: string; email: string }> }, error: null })),
}));

// ─── vi.mock calls (hoisted to top of file) ───────────────────────────────────

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: { admin: { listUsers: mockListUsers } },
  }),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/cron-run-log", () => ({
  // withCronRunLog must call the handler — unwrap the cron-run-log layer
  withCronRunLog: async (
    _name: string,
    handler: () => Promise<{ response: NextResponse; stats?: Record<string, unknown> }>,
  ) => {
    const result = await handler();
    return result.response;
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ─── Import route AFTER mocks ─────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/seasonal-emails/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/seasonal-emails", {
    headers: { Authorization: "Bearer test-secret" },
  });
}

/** Build a minimal chainable Supabase builder that resolves with data/error */
function makeChain(data: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.gte = vi.fn(self);
  builder.lte = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.insert = vi.fn(() => Promise.resolve({ error: null }));
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.update = vi.fn(self);
  builder.delete = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve({ data, error }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  // Directly awaitable (resolves the chain):
  builder.then = (resolve: (v: unknown) => void) =>
    Promise.resolve({ data, error }).then(resolve);
  return builder;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/seasonal-emails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // authorised by default
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.useRealTimers();
    const unauthorised = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    mockRequireCronAuth.mockReturnValueOnce(unauthorised);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 200 with no-campaign message on a non-seasonal date", async () => {
    // A date that is not EOFY window or Jul-1
    vi.setSystemTime(new Date("2026-03-15T21:00:00Z"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No seasonal campaign/i);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 500 when fetching notification_preferences fails", async () => {
    vi.setSystemTime(new Date("2026-06-25T21:00:00Z")); // EOFY window
    mockAdminFrom.mockReturnValue(makeChain(null, { message: "db down" }));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db down");
  });

  it("returns 200 when no opted-in users exist", async () => {
    vi.setSystemTime(new Date("2026-06-25T21:00:00Z")); // EOFY window
    mockAdminFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/No opted-in users/i);
  });

  it("returns 200 when all users already received this campaign", async () => {
    vi.setSystemTime(new Date("2026-06-25T21:00:00Z")); // EOFY window
    const userId = "user-1";
    let callCount = 0;
    mockAdminFrom.mockImplementation((_table: string) => {
      callCount++;
      if (callCount === 1) {
        // notification_preferences → one opted-in user
        return makeChain([{ user_id: userId }]);
      }
      // seasonal_email_sends → already sent to that user
      return makeChain([{ user_id: userId }]);
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received/i);
  });

  it("happy path eofy_countdown — sends email and inserts send record", async () => {
    // Jun 25 UTC → 5 days to EOFY.
    // Keep fake timers active (set in beforeEach) so Date is mocked.
    // With only 1 user the route never hits the 200ms setTimeout path,
    // so fake timers don't block promise resolution.
    vi.setSystemTime(new Date("2026-06-25T21:00:00Z"));

    const userId = "user-abc";
    const userEmail = "alice@example.com";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notification_preferences") return makeChain([{ user_id: userId }]);
      if (table === "seasonal_email_sends" && callCount === 2) return makeChain([]); // dedup: no prior sends
      if (table === "seasonal_email_sends") {
        return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      }
      return makeChain(null);
    });

    // mockListUsers is the shared fn injected into the admin client via vi.mock factory above
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("eofy_countdown");
    expect(typeof body.sent).toBe("number");
    expect(mockSendEmail).toHaveBeenCalled();
    const callArgs = (mockSendEmail.mock.calls as unknown as Array<[{ subject: string }]>)[0]![0];
    expect(callArgs.subject).toContain("EOFY");
  });

  it("happy path new_fy_kickstart — Jul 1 triggers new FY email", async () => {
    vi.setSystemTime(new Date("2026-07-01T21:00:00Z"));

    const userId = "user-xyz";
    const userEmail = "bob@example.com";
    let callCount = 0;

    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notification_preferences") return makeChain([{ user_id: userId }]);
      if (table === "seasonal_email_sends" && callCount === 2) return makeChain([]);
      if (table === "seasonal_email_sends") {
        return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      }
      return makeChain(null);
    });

    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe("new_fy_kickstart");
    expect(mockSendEmail).toHaveBeenCalled();
    const callArgs = (mockSendEmail.mock.calls as unknown as Array<[{ subject: string }]>)[0]![0];
    expect(callArgs.subject).toContain("Financial Year");
  });

  it("counts errors when sendEmail fails", async () => {
    vi.setSystemTime(new Date("2026-06-25T21:00:00Z"));

    const userId = "user-err";
    const userEmail = "err@example.com";
    let callCount = 0;

    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notification_preferences") return makeChain([{ user_id: userId }]);
      if (table === "seasonal_email_sends" && callCount === 2) return makeChain([]);
      if (table === "seasonal_email_sends") {
        return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      }
      return makeChain(null);
    });

    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "Resend API down" } as { ok: boolean; error?: string });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.errors).toBeGreaterThan(0);
    expect(body.sent).toBe(0);
  });
});
