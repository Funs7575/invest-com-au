/**
 * Tests for the review-social-loop cron route.
 *
 * Key paths covered:
 *  - requireCronAuth gate (401)
 *  - DB error fetching recent reviews (500)
 *  - No recent reviews (200, sent=0, badged=0)
 *  - Happy path: email sent, badge awarded when total >= threshold
 *  - Happy path: contributor badge (>=3 reviews)
 *  - Happy path: expert badge (>=10 reviews)
 *  - No badge upgrade when rank already equal/higher
 *  - Email send failure logged but counted
 *  - User without a userId skips badge upsert but still emails
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockAdminFrom, mockListUsers, mockRequireCronAuth, mockWrapCronHandler } = vi.hoisted(
  () => ({
    mockAdminFrom: vi.fn(),
    mockListUsers: vi.fn(async () => ({
      data: { users: [] as { id: string; email: string }[] },
      error: null,
    })),
    mockRequireCronAuth: vi.fn((): NextResponse | null => null),
    mockWrapCronHandler: vi.fn(
      (
        _name: string,
        handler: (req: NextRequest) => Promise<Response>,
      ) => handler,
    ),
  }),
) as {
  mockAdminFrom: MockInstance;
  mockListUsers: MockInstance;
  mockRequireCronAuth: MockInstance<() => NextResponse | null>;
  mockWrapCronHandler: MockInstance;
};

// review-social-loop uses withCronRunLog (not wrapCronHandler), so
// we expose both from the mock. withCronRunLog must unwrap so the
// route body executes and response is returned directly.
const { mockWithCronRunLog } = vi.hoisted(() => ({
  mockWithCronRunLog: vi.fn(
    async (
      _name: string,
      handler: () => Promise<{ response: unknown; stats?: unknown }>,
    ) => {
      const result = await handler();
      return result.response;
    },
  ),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: mockRequireCronAuth,
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: mockWrapCronHandler,
  withCronRunLog: mockWithCronRunLog,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(async () => ({ ok: true as boolean, error: undefined as string | undefined })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

const { mockBuildEmailToUserIdMap } = vi.hoisted(() => ({
  mockBuildEmailToUserIdMap: vi.fn(async () => new Map<string, string>()),
}));

vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: mockBuildEmailToUserIdMap,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: { admin: { listUsers: mockListUsers } },
  }),
}));

// SITE_URL used by the route
vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

// ─── Import route AFTER mocks ─────────────────────────────────────────────────

import { GET } from "@/app/api/cron/review-social-loop/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/review-social-loop", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

/**
 * Build a chainable Supabase builder.
 * Supports .select().eq().gte().order().limit() chain that resolves
 * with { data, error }, plus single-call resolving methods.
 */
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
  builder.not = vi.fn(self);
  builder.or = vi.fn(self);
  builder.insert = vi.fn(() => Promise.resolve({ error: null }));
  builder.upsert = vi.fn(() => Promise.resolve({ error: null }));
  builder.update = vi.fn(self);
  builder.delete = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve({ data, error }));
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data, error }));
  // Directly awaitable — final await on the chain resolves here
  (builder as unknown as Promise<unknown>).then = ((
    onFulfilled?: ((v: unknown) => unknown) | null,
    onRejected?: ((r: unknown) => unknown) | null,
  ) => Promise.resolve({ data, error }).then(onFulfilled ?? undefined, onRejected ?? undefined)) as unknown as Promise<unknown>["then"];
  return builder;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/review-social-loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // authorised by default
    mockSendEmail.mockResolvedValue({ ok: true, error: undefined });
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map<string, string>());
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns 500 when fetching recent reviews fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("fetch_failed");
  });

  it("returns 200 with zeroes when no recent reviews exist", async () => {
    mockAdminFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.badged).toBe(0);
    expect(body.checked).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("happy path — sends email for a user with 1 review (no badge)", async () => {
    const email = "reviewer@example.com";
    const brokerSlug = "commsec";

    // First call: user_reviews SELECT (recent rows)
    // Second call: user_reviews SELECT count (total approved for this email)
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        return makeChain([{ email, broker_slug: brokerSlug, rating: 5 }]);
      }
      if (table === "user_reviews" && callCount === 2) {
        // count query: head=true so route reads .count, not .data
        const countChain = makeChain(null);
        // Override to simulate count=1
        (countChain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (r: unknown) => unknown,
        ) => Promise.resolve({ count: 1, error: null }).then(onFulfilled, onRejected);
        return countChain;
      }
      return makeChain(null);
    });

    // No userId mapping → no badge upsert
    mockBuildEmailToUserIdMap.mockResolvedValueOnce(new Map<string, string>());

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.badged).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: expect.stringContaining("review"),
      }),
    );
  });

  it("happy path — grants contributor badge when total approved >= 3", async () => {
    const email = "contrib@example.com";
    const userId = "user-contrib";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        return makeChain([{ email, broker_slug: "stake", rating: 4 }]);
      }
      if (table === "user_reviews") {
        // count = 3 → contributor threshold
        const chain = makeChain(null);
        (chain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (v: unknown) => unknown,
        ) => Promise.resolve({ count: 3, error: null }).then(onFulfilled, onRejected);
        return chain;
      }
      if (table === "forum_user_profiles") {
        // upsert call then select badge call
        const chain = makeChain({ badge: "newcomer" });
        chain.upsert = vi.fn(() => Promise.resolve({ error: null }));
        chain.update = vi.fn(() => ({
          ...chain,
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return chain;
      }
      return makeChain(null);
    });

    mockBuildEmailToUserIdMap.mockResolvedValueOnce(
      new Map([[email.toLowerCase(), userId]]),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.badged).toBe(1);
  });

  it("happy path — grants expert badge when total approved >= 10", async () => {
    const email = "expert@example.com";
    const userId = "user-expert";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        return makeChain([{ email, broker_slug: "pearler", rating: 5 }]);
      }
      if (table === "user_reviews") {
        const chain = makeChain(null);
        (chain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (v: unknown) => unknown,
        ) => Promise.resolve({ count: 10, error: null }).then(onFulfilled, onRejected);
        return chain;
      }
      if (table === "forum_user_profiles") {
        const chain = makeChain({ badge: "newcomer" });
        chain.upsert = vi.fn(() => Promise.resolve({ error: null }));
        chain.update = vi.fn(() => ({
          ...chain,
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return chain;
      }
      return makeChain(null);
    });

    mockBuildEmailToUserIdMap.mockResolvedValueOnce(
      new Map([[email.toLowerCase(), userId]]),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.badged).toBe(1);
  });

  it("does not downgrade badge when current rank is already higher", async () => {
    const email = "mod@example.com";
    const userId = "user-mod";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        return makeChain([{ email, broker_slug: "selfwealth", rating: 3 }]);
      }
      if (table === "user_reviews") {
        const chain = makeChain(null);
        (chain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (v: unknown) => unknown,
        ) => Promise.resolve({ count: 5, error: null }).then(onFulfilled, onRejected);
        return chain;
      }
      if (table === "forum_user_profiles") {
        // Current badge is 'moderator' (rank 3) — desired is 'contributor' (rank 1)
        // No downgrade should happen
        const chain = makeChain({ badge: "moderator" });
        chain.upsert = vi.fn(() => Promise.resolve({ error: null }));
        chain.update = vi.fn(() => ({
          ...chain,
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }));
        return chain;
      }
      return makeChain(null);
    });

    mockBuildEmailToUserIdMap.mockResolvedValueOnce(
      new Map([[email.toLowerCase(), userId]]),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.badged).toBe(0); // no badge upgrade applied
    expect(body.sent).toBe(1);  // email still sent
  });

  it("logs warning and does not increment sent when email send fails", async () => {
    const email = "fail@example.com";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        return makeChain([{ email, broker_slug: "raiz", rating: 2 }]);
      }
      if (table === "user_reviews") {
        const chain = makeChain(null);
        (chain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (v: unknown) => unknown,
        ) => Promise.resolve({ count: 1, error: null }).then(onFulfilled, onRejected);
        return chain;
      }
      return makeChain(null);
    });

    mockBuildEmailToUserIdMap.mockResolvedValueOnce(new Map<string, string>());
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "SMTP 500" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.badged).toBe(0);
  });

  it("deduplicates multiple reviews for the same email to one email", async () => {
    const email = "dup@example.com";

    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "user_reviews" && callCount === 1) {
        // Two rows with same email — should be deduped to 1 email
        return makeChain([
          { email, broker_slug: "commsec", rating: 5 },
          { email, broker_slug: "stake", rating: 4 },
        ]);
      }
      if (table === "user_reviews") {
        const chain = makeChain(null);
        (chain as Record<string, unknown>).then = (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (v: unknown) => unknown,
        ) => Promise.resolve({ count: 2, error: null }).then(onFulfilled, onRejected);
        return chain;
      }
      return makeChain(null);
    });

    mockBuildEmailToUserIdMap.mockResolvedValueOnce(new Map<string, string>());

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.checked).toBe(1); // only one unique email
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });
});
