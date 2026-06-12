/**
 * Tests for the monthly-review-invites cron route.
 *
 * Key paths covered:
 *  - requireCronAuth gate (401)
 *  - Feature-flag OFF → no-op, nothing fetched, nothing sent (dormancy)
 *  - notification_preferences fetch error (500)
 *  - No opted-in users (200, sent=0)
 *  - All eligible users already invited this period → skip (dedup via row)
 *  - Happy path: pending row upserted, email sent, push dispatched
 *  - Suppressed email → skipped, no send
 *  - Pending-upsert failure → invite not sent (avoids un-dedup'd repeats)
 *
 * The route uses withCronRunLog (returns { response, stats }) rather than
 * wrapCronHandler — we mock it to unwrap so the body runs and the response
 * is returned directly, mirroring cron-review-social-loop.test.ts.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockAdminFrom,
  mockListUsers,
  mockRequireCronAuth,
  mockWithCronRunLog,
  mockIsFlagEnabled,
  mockSendEmail,
  mockGetSuppressedSet,
  mockDispatchPushToUser,
} = vi.hoisted(() => ({
  mockAdminFrom: vi.fn(),
  mockListUsers: vi.fn(async () => ({
    data: { users: [] as { id: string; email: string }[] },
    error: null,
  })),
  mockRequireCronAuth: vi.fn((): NextResponse | null => null),
  mockWithCronRunLog: vi.fn(
    async (
      _name: string,
      handler: () => Promise<{ response: unknown; stats?: unknown }>,
    ) => {
      const result = await handler();
      return result.response;
    },
  ),
  mockIsFlagEnabled: vi.fn(async () => true),
  mockSendEmail: vi.fn(async () => ({
    ok: true as boolean,
    error: undefined as string | undefined,
  })),
  mockGetSuppressedSet: vi.fn(async () => new Set<string>()),
  mockDispatchPushToUser: vi.fn(async () => ({
    sent: 0,
    failed: 0,
    skipped_no_sub: false,
    stale_removed: 0,
  })),
})) as unknown as {
  mockAdminFrom: MockInstance;
  mockListUsers: MockInstance;
  mockRequireCronAuth: MockInstance<() => NextResponse | null>;
  mockWithCronRunLog: MockInstance;
  mockIsFlagEnabled: MockInstance;
  mockSendEmail: MockInstance;
  mockGetSuppressedSet: MockInstance;
  mockDispatchPushToUser: MockInstance;
};

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: mockWithCronRunLog,
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/email-suppression", () => ({
  getSuppressedSet: mockGetSuppressedSet,
}));

vi.mock("@/lib/push-dispatch", () => ({
  dispatchPushToUser: mockDispatchPushToUser,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: { admin: { listUsers: mockListUsers } },
  }),
}));

// ─── Import route AFTER mocks ─────────────────────────────────────────────────

import { GET } from "@/app/api/cron/monthly-review-invites/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/monthly-review-invites", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

/**
 * Chainable Supabase builder. The terminal `.eq()` (and other filters) are
 * awaitable and resolve with { data, error }. `.upsert()` resolves with
 * { error }.
 */
function makeChain(data: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.not = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.single = vi.fn(() => Promise.resolve({ data, error }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  (builder as unknown as Promise<unknown>).then = ((
    onFulfilled?: ((v: unknown) => unknown) | null,
    onRejected?: ((r: unknown) => unknown) | null,
  ) =>
    Promise.resolve({ data, error }).then(
      onFulfilled ?? undefined,
      onRejected ?? undefined,
    )) as unknown as Promise<unknown>["then"];
  return builder;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/monthly-review-invites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockIsFlagEnabled.mockResolvedValue(true);
    mockSendEmail.mockResolvedValue({ ok: true, error: undefined });
    mockGetSuppressedSet.mockResolvedValue(new Set<string>());
    mockDispatchPushToUser.mockResolvedValue({
      sent: 0,
      failed: 0,
      skipped_no_sub: false,
      stale_removed: 0,
    });
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockIsFlagEnabled).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("no-ops when the monthly_review flag is off (dormancy)", async () => {
    mockIsFlagEnabled.mockResolvedValueOnce(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe("flag_off");
    // No DB work, no emails, no push when dormant.
    expect(mockAdminFrom).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(mockDispatchPushToUser).not.toHaveBeenCalled();
  });

  it("returns 500 when fetching weekly_digest prefs fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeChain(null, { message: "db error" });
      }
      return makeChain([]);
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("db error");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 sent=0 when no users opted into weekly_digest", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") return makeChain([]);
      return makeChain([]);
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips everyone already handled this period (dedup via row)", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeChain([{ user_id: "u1" }]);
      }
      if (table === "user_reviews_log") {
        // u1 already has a row for this period
        return makeChain([{ user_id: "u1" }]);
      }
      return makeChain([]);
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("happy path — upserts pending row, sends email, dispatches push", async () => {
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeChain([{ user_id: "u1" }]);
      }
      if (table === "user_reviews_log") {
        const chain = makeChain([]); // nobody handled yet
        chain.upsert = upsertSpy;
        return chain;
      }
      return makeChain([]);
    });
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: "u1", email: "User@Example.com" }] },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" }),
    );
    expect(mockDispatchPushToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ url: "/account/review" }),
    );
  });

  it("skips a suppressed email without sending", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeChain([{ user_id: "u1" }]);
      }
      if (table === "user_reviews_log") return makeChain([]);
      return makeChain([]);
    });
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: "u1", email: "blocked@example.com" }] },
      error: null,
    });
    mockGetSuppressedSet.mockResolvedValueOnce(
      new Set(["blocked@example.com"]),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBeGreaterThanOrEqual(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not send when the pending-row upsert fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeChain([{ user_id: "u1" }]);
      }
      if (table === "user_reviews_log") {
        const chain = makeChain([]);
        chain.upsert = vi.fn(() =>
          Promise.resolve({ error: { message: "upsert boom" } }),
        );
        return chain;
      }
      return makeChain([]);
    });
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: "u1", email: "u1@example.com" }] },
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.errors).toBeGreaterThanOrEqual(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
