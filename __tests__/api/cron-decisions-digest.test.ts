/**
 * Tests for the decisions-digest cron route.
 *
 * Covered paths:
 *   - requireCronAuth gate (401 / 500 when secret missing)
 *   - prefError on notification_preferences → 500
 *   - no opted-in users → 200 "No opted-in users"
 *   - all users already received digest → 200
 *   - happy path: per-user loop with decision items → email sent + insert recorded
 *   - sendEmail failure → errors counter incremented
 *   - empty inbox (no items) → user skipped, no email
 */

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

/**
 * Chainable Supabase builder — every chained method returns `this`;
 * terminal resolution via the `.then` thenable.
 */
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
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

// ─── Import route after mocks ─────────────────────────────────────────────────

import { GET, runtime, maxDuration } from "@/app/api/cron/decisions-digest/route";
import { sendEmail } from "@/lib/resend";

const SECRET = "test-cron-secret-1234567890";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/decisions-digest", {
    headers,
  }) as unknown as NextRequest;
}

function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

/** A minimal GoalDbRow that will produce a decision item. */
function makeGoalRow() {
  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5)
    .toISOString()
    .slice(0, 10);
  return {
    id: 1,
    auth_user_id: "user-1",
    label: "Buy a house",
    goal_type: "savings",
    target_cents: 5000000,
    target_date: farFuture,
    current_balance_cents: 100000,
    monthly_contribution_cents: 5000,
    expected_return_pct: 4,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/cron/decisions-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
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

  it("returns 401 on wrong bearer token", async () => {
    const res = await GET(req({ authorization: "Bearer wrongsecret" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when notification_preferences query errors", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // cron_run_log insert from withCronRunLog (first DB call)
        return makeBuilder({ data: { id: "run-1" }, error: null });
      }
      // notification_preferences fails
      return makeBuilder({ data: null, error: { message: "db error" } });
    });
    const res = await GET(authedReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("returns 200 with sent:0 when no users have weekly_digest enabled", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no opted-in/i);
  });

  it("returns 200 with sent:0 when all users already received digest today", async () => {
    const userId = "user-already-sent";
    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        // Already sent today
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/already received/i);
  });

  it("skips user when no email found in auth map", async () => {
    const userId = "user-no-email";
    // Auth returns no users → emailMap empty
    mockListUsers.mockResolvedValue({ data: { users: [] }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // No email → early return → no send
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips email when decision inbox is empty for a user", async () => {
    const userId = "user-empty-inbox";
    const userEmail = "empty@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        return makeBuilder({ data: [], error: null });
      }
      // All data tables return empty → buildDecisionInbox returns []
      if (
        table === "investor_goals" ||
        table === "get_matched_action_plans" ||
        table === "saved_searches" ||
        table === "user_rate_memory"
      ) {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    // Empty inbox → no email sent
    expect(sendEmail).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.errors).toBe(0);
  });

  it("happy path: sends email and records send when inbox has items", async () => {
    const userId = "user-with-items";
    const userEmail = "items@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true });

    let insertCalled = false;

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        const builder = makeBuilder({ data: [], error: null });
        // Track the insert call
        (builder as Record<string, unknown>).insert = vi.fn(() => {
          insertCalled = true;
          return Promise.resolve({ error: null });
        });
        return builder;
      }
      if (table === "investor_goals") {
        return makeBuilder({ data: [makeGoalRow()], error: null });
      }
      if (table === "get_matched_action_plans") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "saved_searches") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "user_rate_memory") {
        // A rate alert with notified_rate_bps set → produces a DecisionItem
        return makeBuilder({
          data: [
            {
              id: "rm-1",
              broker_id: 1,
              product_kind: "savings",
              last_seen_rate_bps: 450,
              notified_rate_bps: 400,
              notified_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              brokers: { name: "ING", slug: "ing" },
            },
          ],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: userEmail,
        from: expect.stringContaining("weekly@invest.com.au"),
      }),
    );
    expect(insertCalled).toBe(true);
  });

  it("increments errors when sendEmail fails", async () => {
    const userId = "user-send-fail";
    const userEmail = "fail@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: "rate limited" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "investor_goals") {
        return makeBuilder({ data: [makeGoalRow()], error: null });
      }
      if (table === "get_matched_action_plans") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "saved_searches") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "user_rate_memory") {
        return makeBuilder({
          data: [
            {
              id: "rm-2",
              broker_id: 2,
              product_kind: "td",
              last_seen_rate_bps: 420,
              notified_rate_bps: 400,
              notified_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
              brokers: { name: "ANZ", slug: "anz" },
            },
          ],
          error: null,
        });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    // sendEmail returned ok:false → throws → Promise.allSettled rejected → errors++
    expect(body.errors).toBeGreaterThan(0);
    expect(sendEmail).toHaveBeenCalled();
  });

  it("includes high-urgency count in email subject", async () => {
    const userId = "user-high-urgency";
    const userEmail = "urgent@example.com";

    mockListUsers.mockResolvedValue({
      data: { users: [{ id: userId, email: userEmail }] },
      error: null,
    });

    vi.mocked(sendEmail).mockResolvedValue({ ok: true });

    mockFrom.mockImplementation((table: string) => {
      if (table === "notification_preferences") {
        return makeBuilder({ data: [{ user_id: userId }], error: null });
      }
      if (table === "decisions_digest_sends") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "investor_goals") {
        // Overdue goal → high urgency
        const overdueGoal = {
          ...makeGoalRow(),
          target_date: "2020-01-01", // far in the past → overdue
        };
        return makeBuilder({ data: [overdueGoal], error: null });
      }
      if (table === "get_matched_action_plans") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "saved_searches") {
        return makeBuilder({ data: [], error: null });
      }
      if (table === "user_rate_memory") {
        return makeBuilder({ data: [], error: null });
      }
      return makeBuilder({ data: null, error: null });
    });

    const res = await GET(authedReq());
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalled();
    const callArgs = vi.mocked(sendEmail).mock.calls[0]?.[0];
    // High urgency items → subject mentions "urgent"
    expect(callArgs?.subject).toMatch(/urgent/i);
  });
});
