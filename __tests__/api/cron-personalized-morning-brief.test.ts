import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
}));

// Chainable builder used for every supabase query.
// Every method returns `this` so any chain length works.
// `.then` makes the builder a thenable so `await builder` resolves with result.
function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
    "contains", "overlaps", "throwOnError",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn<(table: string) => Record<string, unknown>>(() => makeBuilder());
const mockListUsers = vi.fn(async () => ({ data: { users: [] as Array<{ id: string; email: string }> }, error: null }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: { listUsers: mockListUsers },
    },
  })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/personalized-morning-brief/route";
import { sendEmail } from "@/lib/resend";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/personalized-morning-brief", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/personalized-morning-brief", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: everything returns empty data (no users opted in).
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.unstubAllEnvs();
  });

  it("exports nodejs runtime and maxDuration = 60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with sent:0 when no users have morning_brief enabled", async () => {
    // notification_preferences query returns empty → no opted-in users
    mockFrom.mockImplementation(() =>
      makeBuilder({ data: [], error: null }),
    );
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no opted-in/i);
  });

  it("returns 500 when notification_preferences query errors", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // cron_run_log insert (withCronRunLog uses a separate createAdminClient internally)
        // but createAdminClient is mocked to always return same client, so we key on
        // the first `.from()` call being for cron_run_log, then notification_preferences.
        // Use a counter: first call is cron_run_log insert, second is notification_preferences.
        return makeBuilder({ data: null, error: null, id: "run-1" });
      }
      // notification_preferences error
      return makeBuilder({ data: null, error: { message: "db failure" } });
    });
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 200 with sent:0 when all users already briefed today", async () => {
    const userId = "user-abc-123";
    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "morning_brief_sends") {
        // Already sent today
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      // cron_run_log and any other table
      return makeBuilder({ data: null, error: null });
    });
    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already briefed/i);
  });

  it("sends email and records send on happy path with rate section", async () => {
    const userId = "user-happy-1";
    const userEmail = "user@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "morning_brief_sends") {
        // No sends yet for dedup query; insert resolves later
        return makeBuilder({ data: [], error: null });
      }
      if (table === "rate_change_log") {
        return makeBuilder({
          data: [
            {
              product_kind: "savings",
              broker_slug: "ing",
              old_rate_bps: 500,
              new_rate_bps: 520,
              changed_at: new Date().toISOString(),
            },
          ],
          error: null,
        });
      }
      if (table === "investor_profiles") {
        return makeBuilder({ data: { primary_vertical: "shares", experience_level: "intermediate" }, error: null });
      }
      if (table === "user_rate_memory") {
        return makeBuilder({
          data: [
            {
              product_kind: "savings",
              last_seen_rate_bps: 520,
              notified_rate_bps: 500,
              brokers: { name: "ING", slug: "ing" },
            },
          ],
          error: null,
        });
      }
      if (table === "advisor_follows") {
        // No follows → advisor section returns null
        return makeBuilder({ data: [], error: null });
      }
      if (table === "articles") {
        return makeBuilder({
          data: [
            { title: "Best ASX ETFs 2026", slug: "best-asx-etfs-2026", category: "shares", read_time: 4 },
          ],
          error: null,
        });
      }
      // cron_run_log and any other table
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: userEmail,
        from: expect.stringContaining("brief@invest.com.au"),
      }),
    );
  });

  it("increments errors when sendEmail returns not-ok", async () => {
    const userId = "user-fail-1";
    const userEmail = "fail@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "morning_brief_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "rate_change_log") {
        return makeBuilder({
          data: [{ product_kind: "td", broker_slug: "anz", old_rate_bps: 400, new_rate_bps: 420, changed_at: "2026-05-29T00:00:00Z" }],
          error: null,
        });
      }
      if (table === "investor_profiles") {
        return makeBuilder({ data: null, error: null });
      }
      if (table === "user_rate_memory") {
        return makeBuilder({
          data: [{ product_kind: "td", last_seen_rate_bps: 420, notified_rate_bps: 400, brokers: { name: "ANZ", slug: "anz" } }],
          error: null,
        });
      }
      if (table === "advisor_follows") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "articles") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "rate limit" });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // The promise settles as rejected (throws), so errors increments
    expect(body.errors).toBeGreaterThan(0);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("skips user with no matching email in auth map", async () => {
    const userId = "user-no-email";

    // No email in the auth admin users list
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "morning_brief_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "rate_change_log") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // No email → early return (undefined) → Promise.allSettled marks as fulfilled
    // The route counts fulfilled promises as sent (early-return is not an error).
    const body = await res.json();
    // Crucially, no email was actually sent even though the promise fulfilled
    expect(sendEmail).not.toHaveBeenCalled();
    // sent may be 1 (fulfilled with undefined) or 0 depending on route logic;
    // the important assertion is that sendEmail was never called.
    expect(body.errors).toBe(0);
  });

  it("sends with advisor section when user follows advisors with recent posts", async () => {
    const userId = "user-with-follows";
    const userEmail = "follows@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "morning_brief_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "rate_change_log") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "investor_profiles") {
        return makeBuilder({ data: null, error: null });
      }
      if (table === "user_rate_memory") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "advisor_follows") {
        return makeBuilder({ data: [{ professional_id: 42 }], error: null });
      }
      if (table === "advisor_posts") {
        return makeBuilder({
          data: [
            {
              id: 1,
              title: "Market Update",
              body: "Here is my take",
              published_at: new Date().toISOString(),
              professional_id: 42,
              professionals: { slug: "jane-smith", display_name: "Jane Smith" },
            },
          ],
          error: null,
        });
      }
      if (table === "articles") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: userEmail }),
    );
  });
});
