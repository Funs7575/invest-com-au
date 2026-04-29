import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

const mockAdminFrom = vi.fn();
const mockListUsers = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: { admin: { listUsers: (...a: unknown[]) => mockListUsers(...a) } },
  })),
}));

import { GET } from "@/app/api/cron/personalized-digest/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/personalized-digest") as unknown as NextRequest;
}

interface ChainResult {
  data: unknown;
  error?: { message: string } | null;
}

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "in", "gte", "order", "limit", "insert", "not",
  ]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

// Configures all the from() calls the personalized-digest route makes in order:
// notification_preferences → digest_sends → user_profiles →
// broker_data_changes → brokers (changeSlugs) → brokers (all active) → articles → brokers (deals)
// Then per-user: digest_sends.insert
function setupFromMocks(overrides: {
  prefError?: { message: string };
  prefUsers?: { user_id: string }[];
  alreadySent?: { user_id: string }[];
  profiles?: unknown[];
  feeChanges?: unknown[];
  changeBrokers?: unknown[];
  allBrokers?: unknown[];
  articles?: unknown[];
  activeDeals?: unknown[];
  insertErr?: { message: string } | null;
} = {}) {
  const {
    prefError,
    prefUsers = [{ user_id: "u-1" }],
    alreadySent = [],
    profiles = [{ id: "u-1", email: "user@example.com", display_name: "Alice", interested_in: [], preferred_broker: null, investing_experience: null }],
    feeChanges = [],
    changeBrokers = [],
    allBrokers = [{ slug: "commsec", name: "CommSec", rating: 4.5, tagline: "Australia's #1", is_crypto: false, platform_type: "broker", asx_fee: "$10", deal: false, deal_text: null }],
    articles = [],
    activeDeals = [],
    insertErr = null,
  } = overrides;

  let tableCallCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    tableCallCount++;
    if (table === "notification_preferences") {
      return makeChain({ data: prefUsers, error: prefError ?? null });
    }
    if (table === "digest_sends" && tableCallCount <= 3) {
      // First call: check already sent; later calls: insert
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => makeChain({ data: alreadySent, error: null })) })),
        insert: vi.fn().mockResolvedValue({ error: insertErr }),
      };
    }
    if (table === "user_profiles") {
      return makeChain({ data: profiles, error: null });
    }
    if (table === "broker_data_changes") {
      return makeChain({ data: feeChanges, error: null });
    }
    if (table === "brokers") {
      // Multiple brokers calls: changeSlugs lookup, all active, deals
      if (changeBrokers.length > 0 && tableCallCount === 5) {
        return makeChain({ data: changeBrokers, error: null });
      }
      if (tableCallCount <= 7) {
        return makeChain({ data: allBrokers, error: null });
      }
      return makeChain({ data: activeDeals, error: null });
    }
    if (table === "articles") {
      return makeChain({ data: articles, error: null });
    }
    return makeChain({ data: null, error: null });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/personalized-digest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockSendEmail.mockResolvedValue({ ok: true });
    mockListUsers.mockResolvedValue({ data: { users: [] } });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when notification_preferences query fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "DB error" } }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("DB error");
  });

  it("returns sent:0 when no users have weekly_digest enabled", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
  });

  it("returns sent:0 when all users already received today's digest", async () => {
    setupFromMocks({
      prefUsers: [{ user_id: "u-1" }],
      alreadySent: [{ user_id: "u-1" }],
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; message: string };
    expect(body.sent).toBe(0);
    expect(body.message).toContain("already received");
  });

  it("sends digest and returns sent:1 on success", async () => {
    setupFromMocks();
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "u-1", email: "user@example.com" }] },
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; errors: number; digest_date: string };
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.digest_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("increments errors when sendEmail throws", async () => {
    setupFromMocks();
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "u-1", email: "user@example.com" }] },
    });
    mockSendEmail.mockRejectedValue(new Error("Resend down"));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; errors: number };
    expect(body.sent).toBe(0);
    expect(body.errors).toBe(1);
  });

  it("falls back to auth email when user_profiles has no email", async () => {
    setupFromMocks({
      profiles: [{ id: "u-1", email: null, display_name: null, interested_in: [], preferred_broker: null, investing_experience: null }],
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "u-1", email: "auth@example.com" }] },
    });
    await GET(makeReq());
    const callArg = mockSendEmail.mock.calls[0]?.[0] as { to: string } | undefined;
    expect(callArg?.to).toBe("auth@example.com");
  });

  it("skips user with no email even in auth map", async () => {
    setupFromMocks({
      profiles: [{ id: "u-1", email: null, display_name: null, interested_in: [], preferred_broker: null, investing_experience: null }],
    });
    // listUsers returns nothing for u-1
    mockListUsers.mockResolvedValue({ data: { users: [] } });
    await GET(makeReq());
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("includes total_eligible and skipped_already_sent in response", async () => {
    setupFromMocks({
      prefUsers: [{ user_id: "u-1" }, { user_id: "u-2" }],
      alreadySent: [{ user_id: "u-2" }],
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "u-1", email: "user@example.com" }, { id: "u-2", email: "user2@example.com" }] },
    });
    const res = await GET(makeReq());
    const body = await res.json() as { total_eligible: number; skipped_already_sent: number };
    expect(body.total_eligible).toBe(1);
    expect(body.skipped_already_sent).toBe(1);
  });
});
